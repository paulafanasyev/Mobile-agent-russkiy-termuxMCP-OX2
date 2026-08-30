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

/** Android voice bridge for Svetlana: Android recognition + Azure Speech viseme synthesis + Android TTS fallback. */
class VoiceModule : Module() {
  private var recognizer: SpeechRecognizer? = null
  private var synthesizer: SpeechSynthesizer? = null
  private var offlineTts: TextToSpeech? = null
  private val permissionRequestCode = 47231

  private fun emitSpeechError(message: String, code: String) {
    sendEvent("onSpeechError", mapOf("message" to message, "code" to code))
  }

  override fun definition() = ModuleDefinition {
    Name("SvetlanaVoice")
    Events("onVisemeReceived", "onSpeechCompleted", "onSpeechError")

    AsyncFunction("capabilities") {
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("supported" to false)
      mapOf(
        "supported" to SpeechRecognizer.isRecognitionAvailable(context),
        "offlinePreferred" to true,
        "ttsAvailable" to true,
        "azureVisemeAvailable" to true,
        "language" to "ru-RU",
        "sdk" to "azure-speech-1.51.0",
      )
    }

    AsyncFunction("listen") Coroutine { ->
      val context = appContext.reactContext
        ?: return@Coroutine ""
      if (androidx.core.content.ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
        val activity = appContext.currentActivity
        if (activity != null) {
          activity.runOnUiThread {
            activity.requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), permissionRequestCode)
          }
        }
        emitSpeechError("Для голосового ввода нужен доступ к микрофону. Разрешите доступ и нажмите «Говорить» ещё раз.", "RECORD_AUDIO_PERMISSION")
        return@Coroutine ""
      }
      if (!SpeechRecognizer.isRecognitionAvailable(context)) {
        emitSpeechError("На этом устройстве недоступна служба распознавания речи. Используйте текстовый ввод.", "SPEECH_SERVICE_UNAVAILABLE")
        return@Coroutine ""
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
            recognizer?.startListening(intent)
          } catch (error: IllegalStateException) {
            finish {
              emitSpeechError("Не удалось запустить распознавание речи. Попробуйте ещё раз.", "SPEECH_START_FAILED")
              continuation.resume("")
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
                emitSpeechError("Речь не распознана. Попробуйте ещё раз.", "EMPTY_RESULT")
                continuation.resume("")
              } else {
                continuation.resume(text)
              }
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
                emitSpeechError("Нет разрешения на микрофон. Разрешите доступ к микрофону в настройках приложения.", "RECORD_AUDIO_PERMISSION")
                continuation.resume("")
              }
              else -> finish {
                emitSpeechError("Распознавание речи недоступно (код $error). Можно продолжить с текстовым вводом.", "SPEECH_ERROR_$error")
                continuation.resume("")
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
        emitSpeechError("Облачная озвучка недоступна. Продолжаю без голоса.", "AZURE_TTS_ERROR")
        false
      } finally {
        this@VoiceModule.synthesizer?.close()
        this@VoiceModule.synthesizer = null
      }
    }

    AsyncFunction("speakOffline") Coroutine { text: String ->
      if (text.isBlank()) {
        emitSpeechError("Нет текста для озвучивания.", "EMPTY_TEXT")
        return@Coroutine false
      }
      val context = appContext.reactContext
      if (context == null) {
        emitSpeechError("Озвучка временно недоступна. Текст ответа остаётся доступен на экране.", "CONTEXT_UNAVAILABLE")
        return@Coroutine false
      }

      suspendCancellableCoroutine { continuation ->
        val handler = Handler(Looper.getMainLooper())
        val utteranceId = "svetlana-offline-${System.nanoTime()}"
        var tts: TextToSpeech? = null
        var completed = false

        fun finish(value: Boolean) {
          if (completed) return
          completed = true
          continuation.resume(value)
        }

        fun fail(message: String, code: String) {
          emitSpeechError(message, code)
          finish(false)
        }

        handler.post {
          if (!continuation.isActive) return@post
          try {
            tts = TextToSpeech(context) { status ->
              handler.post {
                if (!continuation.isActive || completed) return@post
                if (status != TextToSpeech.SUCCESS) {
                  fail("Озвучка недоступна. Установите и включите движок Text-to-Speech. Текст ответа остаётся на экране.", "TTS_INIT_FAILED")
                  return@post
                }
                val engine = tts ?: run {
                  fail("Озвучка недоступна. Текст ответа остаётся на экране.", "TTS_ENGINE_MISSING")
                  return@post
                }
                val localeResult = engine.setLanguage(Locale("ru", "RU"))
                if (localeResult == TextToSpeech.LANG_MISSING_DATA || localeResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                  fail("Русский голосовой пакет Android TTS недоступен. Текст ответа остаётся на экране.", "TTS_RU_VOICE_MISSING")
                  return@post
                }
                engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                  override fun onStart(id: String?) = Unit
                  override fun onDone(id: String?) {
                    if (id == utteranceId) handler.post { finish(true) }
                  }
                  override fun onError(id: String?) {
                    if (id == utteranceId) handler.post {
                      fail("Не удалось озвучить ответ. Текст ответа остаётся на экране.", "TTS_SPEAK_FAILED")
                    }
                  }
                })
                val result = engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
                if (result != TextToSpeech.SUCCESS) {
                  fail("Движок озвучки отклонил запрос. Текст ответа остаётся на экране.", "TTS_SPEAK_REJECTED")
                }
              }
            }
            offlineTts?.shutdown()
            offlineTts = tts
          } catch (error: Exception) {
            fail("Озвучка недоступна. Текст ответа остаётся на экране.", "TTS_EXCEPTION")
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
      true
    }

    AsyncFunction("stopSpeaking") Coroutine { ->
      try {
        synthesizer?.StopSpeakingAsync()?.get()
      } catch (_: Exception) {
        // Stop is best-effort; never surface shutdown errors as a user-facing crash.
      }
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
