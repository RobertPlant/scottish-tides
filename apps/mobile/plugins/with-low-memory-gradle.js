// Config plugin: keep Gradle's memory footprint small so `expo prebuild` +
// `./gradlew assembleRelease` don't get OOM-killed on low-RAM build machines
// (this app is developed on a ~4 GB box). These settings change only *how* the
// build runs — heap size, worker count, no parallel project execution — not the
// resulting APK, so they're safe to keep on permanently.
//
// Without this, every `expo prebuild` regenerates android/gradle.properties from
// Expo's template (Xmx2048m, org.gradle.parallel=true) and the build dies part
// way through the native (NDK) compile step.

const { withGradleProperties } = require('expo/config-plugins');

const MEMORY_PROPS = {
  'org.gradle.jvmargs': '-Xmx1536m -XX:MaxMetaspaceSize=512m',
  'org.gradle.workers.max': '1',
  'org.gradle.parallel': 'false',
};

/** @param {import('expo/config').ExpoConfig} config */
module.exports = function withLowMemoryGradle(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(MEMORY_PROPS)) {
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
