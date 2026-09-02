const { withAndroidManifest } = require('@expo/config-plugins');

const SERVICE_NAME = 'com.beddatech.accessibilitycontroller.AccessibilityControllerService';
const SERVICE_PERMISSION = 'android.permission.BIND_ACCESSIBILITY_SERVICE';

module.exports = function withAccessibilityController(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const manifest = configWithManifest.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) {
      throw new Error('with-accessibility-controller: Android application node is missing');
    }

    application.service = application.service ?? [];
    const alreadyDeclared = application.service.some(
      (service) => service.$?.['android:name'] === SERVICE_NAME,
    );

    if (!alreadyDeclared) {
      application.service.push({
        $: {
          'android:name': SERVICE_NAME,
          'android:exported': 'false',
          'android:permission': SERVICE_PERMISSION,
          'android:label': '@string/accessibility_service_label',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.accessibilityservice',
              'android:resource': '@xml/accessibility_service_config',
            },
          },
        ],
      });
    }

    return configWithManifest;
  });
};
