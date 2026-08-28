const { withAppBuildGradle } = require('@expo/config-plugins');

const AZURE_SPEECH_DEP = "implementation 'com.microsoft.cognitiveservices.speech:client-sdk:1.51.0'";

module.exports = function withAzureSpeech(config) {
  return withAppBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents;
    if (contents.includes('com.microsoft.cognitiveservices.speech:client-sdk')) {
      return mod;
    }

    const marker = /dependencies\s*\{/;
    if (!marker.test(contents)) {
      throw new Error('Azure Speech plugin: app build.gradle has no dependencies block');
    }

    mod.modResults.contents = contents.replace(marker, (match) => `${match}\n    ${AZURE_SPEECH_DEP}`);
    return mod;
  });
};
