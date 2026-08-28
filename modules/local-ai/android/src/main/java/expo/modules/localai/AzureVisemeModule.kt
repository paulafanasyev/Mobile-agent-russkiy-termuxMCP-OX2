package expo.modules.localai

import android.util.Log
import com.microsoft.cognitiveservices.speech.AudioConfig
import com.microsoft.cognitiveservices.speech.SpeechConfig
import com.microsoft.cognitiveservices.speech.SpeechSynthesizer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Azure Speech viseme PoC for Svetlana.
 *
 * Authentication uses a short-lived authorization token supplied by the caller;
 * a subscription key must never be embedded in the APK.
 */
class AzureVisemeModule : Module() {
  private var synthesizer: SpeechSynthesizer? = null

  override fun definition() = ModuleDefinition {
    Name("AzureViseme")
    Events("onViseme")

    AsyncFunction("speakWithVisemes") { text: String, authorizationToken: String, region: String, locale: String ->
      require(text.isNotBlank()) { "Speech text must not be blank" }
      require(authorizationToken.isNotBlank()) { "Azure authorization token is required" }
      require(region.isNotBlank()) { "Azure Speech region is required" }

      synthesizer?.let {
        try {
          it.StopSpeakingAsync().get()
        } catch (_: Exception) {
          // A previous synthesis may already have completed.
        }
        try {
          it.close()
        } catch (_: Exception) {
          // Best effort cleanup before creating the next synthesizer.
        }
      }
      synthesizer = null

      val speechConfig = SpeechConfig.fromAuthorizationToken(authorizationToken, region)
      speechConfig.setSpeechSynthesisLanguage(locale)
      val audioConfig = AudioConfig.fromDefaultSpeakerOutput()
      val current = SpeechSynthesizer(speechConfig, audioConfig)
      synthesizer = current

      current.visemeReceived.addEventListener { _, event ->
        val offsetMs = event.audioOffset / 10_000L
        val visemeId = event.visemeId
        Log.i(TAG, "VisemeReceived: id=$visemeId, offset=${offsetMs}ms")
        sendEvent(
          "onViseme",
          mapOf(
            "visemeId" to visemeId,
            "audioOffsetMs" to offsetMs,
            "resultId" to event.resultId,
          ),
        )
      }

      try {
        val result = current.SpeakTextAsync(text).get()
        result.close()
        true
      } finally {
        if (synthesizer === current) {
          synthesizer = null
        }
        try {
          current.close()
        } catch (_: Exception) {
          // Best effort cleanup.
        }
        audioConfig.close()
        speechConfig.close()
      }
    }

    AsyncFunction("stopSpeaking") {
      val current = synthesizer ?: return@AsyncFunction false
      try {
        current.StopSpeakingAsync().get()
        true
      } catch (error: Exception) {
        Log.w(TAG, "Failed to stop Azure speech", error)
        false
      }
    }

    OnDestroy {
      synthesizer?.let {
        try {
          it.StopSpeakingAsync().get()
        } catch (_: Exception) {
          // Best effort shutdown.
        }
        try {
          it.close()
        } catch (_: Exception) {
          // Best effort shutdown.
        }
      }
      synthesizer = null
    }
  }

  companion object {
    private const val TAG = "AzureViseme"
  }
}
