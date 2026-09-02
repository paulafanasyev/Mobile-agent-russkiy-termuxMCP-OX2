package expo.modules.localai

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Android voice bridge for Svetlana. Recognition prefers offline engines when available. */
class VoiceModule : Module() {
  private var recognizer: SpeechRecognizer? = null
  private var tts: TextToSpeech? = null

  override fun definition() = ModuleDefinition {
    Name("SvetlanaVoice")

    AsyncFunction("capabilities") {
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("supported" to false)
      mapOf(
        "supported" to SpeechRecognizer.isRecognitionAvailable(context),
        "offlinePreferred" to true,
        "ttsAvailable" to (TextToSpeech(context) { }.let { it.shutdown(); true }),
        "language" to "ru-RU",
      )
    }

    AsyncFunction("listen") {
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
            putExtra(
              RecognizerIntent.EXTRA_LANGUAGE_MODEL,
              RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
            )
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

    AsyncFunction("speak") { text: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      if (tts == null) {
        tts = TextToSpeech(context) { status ->
          if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale("ru", "RU")
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "svetlana")
          }
        }
      } else {
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "svetlana")
      }
      true
    }

    AsyncFunction("stopSpeaking") {
      tts?.stop()
      true
    }

    OnDestroy {
      recognizer?.destroy()
      recognizer = null
      tts?.shutdown()
      tts = null
    }
  }
}
