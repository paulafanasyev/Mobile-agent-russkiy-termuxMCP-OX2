const { withProjectBuildGradle } = require('@expo/config-plugins');

const GRPC_VERSION = '1.83.1';
const NETTY_VERSION = '4.2.17.Final';

const marker = '// OX2 dependency convergence: gRPC 1.83.1 + Netty 4.2.17.Final';

module.exports = function withAndroidDependencyConvergence(config) {
  return withProjectBuildGradle(config, (projectConfig) => {
    if (projectConfig.modResults.language !== 'groovy') {
      throw new Error('OX2 Android dependency convergence requires a Groovy android/build.gradle');
    }

    const contents = projectConfig.modResults.contents;
    if (contents.includes(marker)) {
      return projectConfig;
    }

    projectConfig.modResults.contents = `${contents}\n\n${marker}\nallprojects {\n  configurations.configureEach {\n    resolutionStrategy.eachDependency { details ->\n      if (details.requested.group == 'io.grpc') {\n        details.useVersion('${GRPC_VERSION}')\n        details.because('Keep all gRPC modules on one supported release line and remove stale 1.39/1.45/1.69 branches')\n      }\n      if (details.requested.group == 'io.netty') {\n        details.useVersion('${NETTY_VERSION}')\n        details.because('Keep all Netty modules on one security-maintained 4.2 release line')\n      }\n    }\n  }\n}\n`;

    return projectConfig;
  });
};
