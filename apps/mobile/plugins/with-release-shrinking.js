const { withGradleProperties } = require('expo/config-plugins');

// R8 for release builds: drop unused code and resources, as F-Droid reviewers
// ask. The generated app/build.gradle already reads these two properties; Expo
// just defaults them to false. Debug builds are unaffected.
const SHRINK_PROPS = {
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
};

/** @param {import('expo/config').ExpoConfig} config */
module.exports = function withReleaseShrinking(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(SHRINK_PROPS)) {
      const existing = cfg.modResults.find((item) => item.type === 'property' && item.key === key);
      if (existing) {
        existing.value = value;
      } else {
        cfg.modResults.push({ type: 'property', key, value });
      }
    }
    return cfg;
  });
};
