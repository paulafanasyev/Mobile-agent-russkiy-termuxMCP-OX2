package expo.modules.localai

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.microsoft.cognitiveservices.speech.CancellationReason
import com.microsoft.cognitiveservices.speech.ResultReason
import com.microsoft.cognitiveservices.speech.SpeechConfig
import com.microsoft.cognitiveservices.speech.SpeechSynthesisCancellationDetails
import com.microsoft.cognitiveservices.speech.SpeechSynthesisResult
import com.microsoft.cognitiveservices.speech.SpeechSynthesizer
import com.microsoft.cognitiveservices.speech.audio.AudioConfig
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Android voice bridge for Svetlana: Android recognition + Azure Speech viseme synthesis + offline TTS fallback. */
class VoiceModule : Module() {
  private var recognizer: SpeechRecognizer? = null
  private var synthesizer: SpeechSynthesizer? = null
  private var offlineTts: TextToSpeech? = null

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

    AsyncFunction("listen") Coroutine {
      val context = appContext.reactContext
        ?: throw IllegalStateException("Android context unavailable")
      if (androidx.core.content.ContextCompat.checkSelfPermission(
          context,
          android.Manifest.permission.RECORD_AUDIO,
        ) != PackageManager.PERMISSION_GRANTED
      ) {
        throw SecurityException("Microphone permission is required")
      }
      if (!SpeechRecognizer.isRecognitionAvailable(context)) {
        throw IllegalStateException("Speech recognition is not available on this device")
      }

      suspendCancellableCoroutine { continuation ->
        val handler = Handler(Looper.getMainLooper())
        val listener = object : RecognitionListener {
          private var completed = false

          private fun complete(block: () -> Unit) {
            if (completed) return
            completed = true
            block()
          }

          override fun onReadyForSpeech(params: android.os.Bundle?) = Unit
          override fun onBeginningOfSpeech() = Unit
          override fun onRmsChanged(rmsdB: Float) = Unit
          override fun onBufferReceived(buffer: ByteArray?) = Unit
          override fun onEndOfSpeech() = Unit
          override fun onPartialResults(partialResults: android.os.Bundle?) = Unit
          override fun onEvent(eventType: Int, params: android.os.Bundle?) = Unit

          override fun onResults(results: android.os.Bundle?) {
            val text = results
              ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
              ?.firstOrNull()
              ?.trim()
              .orEmpty()
            complete {
              if (text.isBlank()) {
                continuation.resumeWithException(
                  IllegalStateException("Speech recognition returned no text"),
                )
              } else {
                continuation.resume(text)
              }
            }
          }

          override fun onError(error: Int) {
            complete {
              continuation.resumeWithException(
                IllegalStateException("Speech recognition failed (code $error)"),
              )
            }
          }
        }

        continuation.invokeOnCancellation {
          handler.post {
            recognizer?.cancel()
            recognizer?.setRecognitionListener(null)
          }
        }

        handler.post {
          recognizer?.destroy()
          recognizer = SpeechRecognizer.createSpeechRecognizer(context)
          recognizer?.setRecognitionListener(listener)
          val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ru-RU")
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "ru-RU")
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
          }
          recognizer?.startListening(intent)
        }
      }
    }

    AsyncFunction("stopListening") {
      recognizer?.stopListening()
      true
    }

    AsyncFunction("speak") Coroutine { text: String, subscriptionKey: String, region: String ->
      require(text.isNotBlank()) { "Speech text must not be blank" }
      require(subscriptionKey.isNotBlank()) { "Azure Speech subscription key is required" }
      require(region.isNotBlank()) { "Azure Speech region is required" }

      synthesizer?.close()
      synthesizer = null

      val speechConfig = SpeechConfig.fromSubscription(subscriptionKey, region)
      speechConfig.speechSynthesisLanguage = "ru-RU"
      speechConfig.speechSynthesisVoiceName = "ru-RU-SvetlanaNeural"
      val audioConfig = AudioConfig.fromDefaultSpeakerOutput()
      val currentSynthesizer = SpeechSynthesizer(speechConfig, audioConfig)
      synthesizer = currentSynthesizer

      currentSynthesizer.visemeReceived.addEventListener { _, event ->
        sendEvent(
          "onVisemeReceived",
          mapOf(
            "audioOffset" to event.audioOffset,
            "audioOffsetMs" to event.audioOffset / 10_000.0,
            "visemeId" to event.visemeId,
            "animation" to event.animation,
          ),
        )
      }

      try {
        val result: SpeechSynthesisResult = currentSynthesizer.SpeakTextAsync(text).get()
        if (result.reason == ResultReason.SynthesizingAudioCompleted) {
          sendEvent("onSpeechCompleted", mapOf("resultId" to result.resultId))
          true
        } else if (result.reason == ResultReason.Canceled) {
          val cancellation = SpeechSynthesisCancellationDetails.fromResult(result)
          val details = buildString {
            append("Azure Speech synthesis canceled: reason=")
            append(cancellation.reason)
            if (cancellation.reason == CancellationReason.Error) {
              append(", errorCode=")
              append(cancellation.errorCode)
              append(", errorDetails=")
              append(cancellation.errorDetails)
            }
          }
          sendEvent("onSpeechError", mapOf("message" to details))
          throw IllegalStateException(details)
        } else {
          val details = "Azure Speech synthesis returned unexpected result reason: ${result.reason}"
          sendEvent("onSpeechError", mapOf("message" to details))
          throw IllegalStateException(details)
        }
      } finally {
        currentSynthesizer.close()
        speechConfig.close()
        audioConfig.close()
        if (synthesizer === currentSynthesizer) synthesizer = null
      }
    }

    AsyncFunction("speakOffline") Coroutine { text: String ->
      require(text.isNotBlank()) { "Speech text must not be blank" }
      val context = appContext.reactContext
        ?: throw IllegalStateException("Android context unavailable")

      suspendCancellableCoroutine { continuation ->
        val utteranceId = "svetlana-offline-${System.nanoTime()}"
        val tts = TextToSpeech(context) { status ->
          if (!continuation.isActive) return@TextToSpeech
          if (status != TextToSpeech.SUCCESS) {
            continuation.resumeWithException(IllegalStateException("Android offline TTS initialization failed"))
            return@TextToSpeech
          }

          val localeResult = offlineTts?.setLanguage(Locale("ru", "RU"))
          if (localeResult == TextToSpeech.LANG_MISSING_DATA || localeResult == TextToSpeech.LANG_NOT_SUPPORTED) {
            continuation.resumeWithException(IllegalStateException("Русский голосовой пакет Android TTS недоступен"))
            return@TextToSpeech
          }

          offlineTts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) = Unit

            override fun onDone(doneUtteranceId: String?) {
              if (doneUtteranceId == utteranceId && continuation.isActive) continuation.resume(true)
            }

            override fun onError(errorUtteranceId: String?) {
              if (errorUtteranceId == utteranceId && continuation.isActive) {
                continuation.resumeWithException(IllegalStateException("Android offline TTS failed"))
              }
            }
          })

          val result = offlineTts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
          if (result != TextToSpeech.SUCCESS && continuation.isActive) {
            continuation.resumeWithException(IllegalStateException("Android offline TTS rejected speech"))
          }
        }
        offlineTts?.shutdown()
        offlineTts = tts

        continuation.invokeOnCancellation {
          tts.stop()
          tts.shutdown()
          if (offlineTts === tts) offlineTts = null
        }
      }
      true
    }

    AsyncFunction("stopSpeaking") Coroutine {
      synthesizer?.StopSpeakingAsync()?.get()
      synthesizer?.close()
      synthesizer = null
      offlineTts?.stop()
      offlineTts?.shutdown()
      offlineTts = null
      true
    }

    OnDestroy {
      recognizer?.destroy()
      recognizer = null
      synthesizer?.close()
      synthesizer = null
      offlineTts?.shutdown()
      offlineTts = null
    }
  }
}
