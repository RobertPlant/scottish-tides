const { withAppBuildGradle } = require('expo/config-plugins');

// F-Droid wants one APK per ABI. `-PreactNativeArchitectures=<abi>` only limits
// what React Native compiles; prebuilt .so files from AARs would still ship for
// every ABI. So when exactly one ABI is asked for, also filter packaging to it
// and give the APK its own versionCode, 10 * base + n (the recipe's
// VercodeOperation). arm64-v8a outranks armeabi-v7a so 64-bit phones take it.
// Builds without the property (gradle.properties lists all four) stay universal.
const BLOCK = `
android {
    defaultConfig {
        def abis = (findProperty('reactNativeArchitectures') ?: '').split(',')*.trim()
        if (abis.size() == 1) {
            def n = ['armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'].indexOf(abis[0]) + 1
            if (n == 0) throw new GradleException("unknown ABI \${abis[0]}")
            ndk { abiFilters abis[0] }
            versionCode versionCode * 10 + n
        }
    }
}
`;

/** @param {import('expo/config').ExpoConfig} config */
module.exports = function withAbiSplit(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('indexOf(abis[0])')) {
      cfg.modResults.contents += BLOCK;
    }
    return cfg;
  });
};
