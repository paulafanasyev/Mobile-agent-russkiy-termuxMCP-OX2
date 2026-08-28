package expo.modules.systemhands

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.MediaStore
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.providers.AppContextProvider
import java.io.Serializable

/**
 * Expo Modules Core-compatible camera contract. Expo SDK 57 owns activity-result
 * registration and restoration, so this module must use AppContextActivityResultContract.
 */
internal class CameraCaptureContract(
  @Suppress("UNUSED_PARAMETER") private val appContextProvider: AppContextProvider
) : AppContextActivityResultContract<CameraCaptureContractOptions, Boolean> {
  override fun createIntent(context: Context, input: CameraCaptureContractOptions): Intent =
    Intent(MediaStore.ACTION_IMAGE_CAPTURE)
      .putExtra(MediaStore.EXTRA_OUTPUT, Uri.parse(input.uri))
      .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)

  override fun parseResult(
    input: CameraCaptureContractOptions,
    resultCode: Int,
    intent: Intent?
  ): Boolean = resultCode == Activity.RESULT_OK
}

internal data class CameraCaptureContractOptions(
  val uri: String
) : Serializable
