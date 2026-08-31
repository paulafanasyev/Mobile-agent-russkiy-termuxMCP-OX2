package expo.modules.localai

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.core.content.ContextCompat
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.microsoft.cognitiveservices.speech.ResultReason
import com.microsoft.cognitiveservices.speech.SpeechConfig
import com.microsoft.cognitiveservices.speech.SpeechSynthesisCancellationDetails
import com.microsoft.cognitiveservices.speech.SpeechSynthesisOutputFormat
import com.microsoft.cognitiveservices.speech.SpeechSynthesizer
import com.microsoft.cognitiveservices.speech.audio.AudioConfig
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Android voice bridge for Svetlana: Android recognition + Azure Speech viseme synthesis + Android TTS fallback. */
class VoiceModule : Module() {
  private var recognizer: SpeechRecognizer? = null
  private var synthesizer: SpeechSynthesizer? = null
  private var offlineTts: TextToSpeech? = null

  private fun ttsEngineAvailable(context: android.content.Context): Boolean {
    val intent = Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE)
    return context.packageManager.queryIntentServices(intent, PackageManager.MATCH_ALL).isNotEmpty()
  }

  private suspend fun ensureMicrophonePermission(): Boolean = suspendCancellableCoroutine { continuation ->
    val context = appContext.reactContext
    val activity = appContext.currentActivity
    if (context == null || activity == null) {
      continuation.resume(false)
      return@suspendCancellableCoroutine
    }

    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
      continuation.resume(true)
      return@suspendCancellableCoroutine
    }

    val permissionActivity = activity as? PermissionAwareActivity
    if (permissionActivity == null) {
      sendEvent("onSpeechError", mapOf("message" to "Не удалось запросить доступ к микрофону. Откройте разрешения приложения и разрешите микрофон."))
      continuation.resume(false)
      return@suspendCancellableCoroutine
    }

    val requestCode = 4107
    val listener = object : PermissionListener {
      override fun onRequestPermissionsResult(
        requestCodeResult: Int,
        permissions: Array<out String>?,
        grantResults: IntArray?,
      ): Boolean {
        if (requestCodeResult != requestCode) return false
        val granted = grantResults?.firstOrNull() == PackageManager.PERMISSION_GRANTED
        if (continuation.isActive) continuation.resume(granted)
        return true
      }
    }

    try {
      android.util.Log.i("SvetlanaVoice", "RECORD_AUDIO requestPermissions: awaiting onRequestPermissionsResult")
      permissionActivity.requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), requestCode, listener)
    } catch (error: Exception) {
      android.util.Log.e("SvetlanaVoice", "RECORD_AUDIO request failed", error)
      if (continuation.isActive) continuation.resume(false)
    }

    continuation.invokeOnCancellation { /* React Native owns the permission callback lifecycle. */ }
  }

  override fun definition() = ModuleDefinition {
    Name("SvetlanaVoice")
    Events("onVisemeReceived", "onSpeechCompleted", "onSpeechError")

    AsyncFunction("capabilities") {
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("supported" to false)
      mapOf(
        "supported" to SpeechRecognizer.isRecognitionAvailable(context),
        "offlinePreferred" to true,
        "ttsAvailable" to ttsEngineAvailable(context),
        "azureVisemeAvailable" to true,
        "language" to "ru-RU",
        "sdk" to "azure-speech-1.51.0",
      )
    }

    AsyncFunction("listen") Coroutine { ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("Android context unavailable")

      if (!ensureMicrophonePermission()) {
        sendEvent("onSpeechError", mapOf("message" to "Нет разрешения на микрофон. Разрешите доступ к микрофону в настройках приложения."))
        throw SecurityException("Microphone permission was not granted.")
      }

      if (!SpeechRecognizer.isRecognitionAvailable(context)) {
        sendEvent("onSpeechError", mapOf("message" to "На этом устройстве недоступна служба распознавания речи. Используйте ручной ввод."))
        throw IllegalStateException("Speech recognition is not available on this device")
      }

      suspendCancellableCoroutine { continuation ->
        val handler = Handler(Looper.getMainLooper())
        var retriedBusy = false
        var completed = false
        lateinit var listener: RecognitionListener

        fun finish(block: () -> Unit) {
          if (completed) return
          completed = true
          block()
        }

        fun startRecognition() {
          if (completed || !continuation.isActive) return
          recognizer?.cancel()
          recognizer?.destroy()
          recognizer = SpeechRecognizer.createSpeechRecognizer(context)
          recognizer?.setRecognitionListener(listener)
          val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ru-RU")
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "ru-RU")
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
          }
          try {
            android.util.Log.i("SvetlanaVoice", "RECORD_AUDIO granted; SpeechRecognizer.startListening()")
            recognizer?.startListening(intent)
          } catch (error: IllegalStateException) {
            finish {
              sendEvent("onSpeechError", mapOf("message" to "Не удалось запустить распознавание речи. Попробуйте ещё раз."))
              continuation.resumeWithException(IllegalStateException("Speech recognition could not start: ${error.message ?: "recognizer busy"}"))
            }
          }
        }

        listener = object : RecognitionListener {
          override fun onReadyForSpeech(params: android.os.Bundle?) = Unit
          override fun onBeginningOfSpeech() = Unit
          override fun onRmsChanged(rmsdB: Float) = Unit
          override fun onBufferReceived(buffer: ByteArray?) = Unit
          override fun onEndOfSpeech() = Unit
          override fun onPartialResults(partialResults: android.os.Bundle?) = Unit
          override fun onEvent(eventType: Int, params: android.os.Bundle?) = Unit

          override fun onResults(results: android.os.Bundle?) {
            val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim().orEmpty()
            finish {
              if (text.isBlank()) {
                sendEvent("onSpeechError", mapOf("message" to "Речь не распознана. Попробуйте ещё раз или используйте ручной ввод."))
                continuation.resumeWithException(IllegalStateException("Speech recognition returned no text"))
              } else continuation.resume(text)
            }
          }

          override fun onError(error: Int) {
            when {
              error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY && !retriedBusy && !completed -> {
                retriedBusy = true
                recognizer?.cancel()
                recognizer?.destroy()
                recognizer = null
                handler.postDelayed({ startRecognition() }, 500)
              }
              error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> finish {
                sendEvent("onSpeechError", mapOf("message" to "Нет разрешения на микрофон. Разрешите доступ к микрофону в настройках приложения."))
                continuation.resumeWithException(SecurityException("Android speech recognizer reports missing RECORD_AUDIO permission (code 9)."))
              }
              else -> finish {
                sendEvent("onSpeechError", mapOf("message" to "Распознавание речи недоступно (код $error). Используйте ручной ввод или проверьте службу распознавания речи."))
                continuation.resumeWithException(IllegalStateException("Speech recognition failed (code $error)"))
              }
            }
          }
        }

        continuation.invokeOnCancellation {
          handler.post {
            recognizer?.cancel()
            recognizer?.destroy()
            recognizer = null
          }
        }

        handler.post { startRecognition() }
      }
    }

    AsyncFunction("stopListening") {
      recognizer?.cancel()
      recognizer?.destroy()
      recognizer = null
      true
    }

    AsyncFunction("speak") { text: String, subscriptionKey: String, region: String ->
      if (subscriptionKey.isBlank() || region.isBlank()) throw IllegalStateException("Azure credentials not configured. Use setAzureSpeechCredentials.")
      try {
        val speechConfig = SpeechConfig.fromSubscription(subscriptionKey, region)
        speechConfig.speechSynthesisVoiceName = "ru-RU-SvetlanaNeural"
        speechConfig.setSpeechSynthesisOutputFormat(SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3)
        val audioConfig = AudioConfig.fromDefaultSpeakerOutput()
        val current = SpeechSynthesizer(speechConfig, audioConfig)
        this@VoiceModule.synthesizer = current
        current.VisemeReceived.addEventListener { _, event ->
          sendEvent("onVisemeReceived", mapOf(
            "visemeId" to event.getVisemeId(),
            "audioOffset" to event.getAudioOffset(),
            "audioOffsetMs" to event.getAudioOffset() / 10_000.0,
            "animation" to event.getAnimation(),
          ))
        }
        val result = current.SpeakTextAsync(text).get()
        if (result.reason == ResultReason.SynthesizingAudioCompleted) true
        else {
          val cancellation = SpeechSynthesisCancellationDetails.fromResult(result)
          throw IllegalStateException("Azure synthesis failed: ${cancellation.reason} — ${cancellation.errorDetails}")
        }
      } catch (e: Exception) {
        sendEvent("onSpeechError", mapOf("message" to "Онлайн-озвучка недоступна: ${e.message ?: "неизвестная ошибка"}"))
        throw IllegalStateException("Azure synthesis error: ${e.message}")
      } finally {
        this@VoiceModule.synthesizer?.close()
        this@VoiceModule.synthesizer = null
      }
    }

    AsyncFunction("speakOffline") Coroutine { text: String ->
      require(text.isNotBlank()) { "Speech text must not be blank" }
      val context = appContext.reactContext ?: throw IllegalStateException("Android context unavailable")
      if (!ttsEngineAvailable(context)) {
        sendEvent("onSpeechError", mapOf("message" to "На устройстве не установлен или не включён движок Text-to-Speech. Ответ оставлен текстом. Установите/включите Google Speech Services или другой TTS-движок."))
        return@Coroutine false
      }

      suspendCancellableCoroutine { continuation ->
        val handler = Handler(Looper.getMainLooper())
        val utteranceId = "svetlana-offline-${System.nanoTime()}"
        var tts: TextToSpeech? = null
        var completed = false

        fun finish(block: () -> Unit) {
          if (completed) return
          completed = true
          block()
        }

        handler.post {
          if (!continuation.isActive) return@post
          try {
            tts = TextToSpeech(context) { status ->
              handler.post {
                if (!continuation.isActive || completed) return@post
                if (status != TextToSpeech.SUCCESS) {
                  sendEvent("onSpeechError", mapOf("message" to "Android TTS не инициализировался. Ответ оставлен текстом. Проверьте установленный TTS-движок."))
                  finish { continuation.resume(false) }
                  return@post
                }
                val engine = tts ?: return@post
                val localeResult = engine.setLanguage(Locale("ru", "RU"))
                if (localeResult == TextToSpeech.LANG_MISSING_DATA || localeResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                  sendEvent("onSpeechError", mapOf("message" to "Русский голосовой пакет Android TTS недоступен. Ответ оставлен текстом. Установите русский голосовой пакет в настройках Text-to-Speech."))
                  finish { continuation.resume(false) }
                  return@post
                }
                engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                  override fun onStart(id: String?) = Unit
                  override fun onDone(id: String?) { if (id == utteranceId) handler.post { finish { continuation.resume(true) } } }
                  override fun onError(id: String?) {
                    if (id == utteranceId) handler.post {
                      sendEvent("onSpeechError", mapOf("message" to "Android TTS не смог озвучить ответ. Ответ оставлен текстом."))
                      finish { continuation.resume(false) }
                    }
                  }
                })
                val result = engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
                if (result != TextToSpeech.SUCCESS) {
                  sendEvent("onSpeechError", mapOf("message" to "Android TTS отклонил озвучивание. Ответ оставлен текстом."))
                  finish { continuation.resume(false) }
                }
              }
            }
            offlineTts?.shutdown()
            offlineTts = tts
          } catch (error: Exception) {
            sendEvent("onSpeechError", mapOf("message" to "Не удалось запустить Android TTS. Ответ оставлен текстом."))
            finish { continuation.resume(false) }
          }
        }

        continuation.invokeOnCancellation {
          handler.post {
            tts?.stop()
            tts?.shutdown()
            if (offlineTts === tts) offlineTts = null
          }
        }
      }
    }

    AsyncFunction("stopSpeaking") Coroutine { ->
      synthesizer?.StopSpeakingAsync()?.get()
      synthesizer?.close()
      synthesizer = null
      offlineTts?.stop()
      offlineTts?.shutdown()
      offlineTts = null
      true
    }

    OnDestroy {
      recognizer?.cancel()
      recognizer?.destroy()
      recognizer = null
      synthesizer?.close()
      synthesizer = null
      offlineTts?.shutdown()
      offlineTts = null
    }
  }
}
