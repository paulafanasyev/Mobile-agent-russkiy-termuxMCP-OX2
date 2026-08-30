const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withPackageVisibility(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const queries = manifest.queries ?? (manifest.queries = []);
    const hasLauncherQuery = queries.some((query) =>
      query.intent?.some((intent) =>
        intent.action?.some((action) => action.$?.['android:name'] === 'android.intent.action.MAIN') &&
        intent.category?.some((category) => category.$?.['android:name'] === 'android.intent.category.LAUNCHER'),
      ),
    );

    if (!hasLauncherQuery) {
      queries.push({
        intent: [
          {
            action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
            category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
          },
        ],
      });
    }

    return config;
  });
};
