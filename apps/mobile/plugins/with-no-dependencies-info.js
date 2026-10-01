const { withAppBuildGradle } = require('expo/config-plugins');

// AGP embeds a Google-encrypted dependency list in the APK signing block. Only
// Google can read it, so F-Droid asks for it to be turned off.
const BLOCK = `
android {
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
}
`;

/** @param {import('expo/config').ExpoConfig} config */
module.exports = function withNoDependenciesInfo(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('dependenciesInfo')) {
      cfg.modResults.contents += BLOCK;
    }
    return cfg;
  });
};
