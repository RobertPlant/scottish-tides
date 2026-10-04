const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

// React Native and Expo merge these into every APK, but the app never uses
// them: it makes no network calls and needs no storage or overlay access, and
// F-Droid reviewers ask about each one. Strip them from release builds only,
// via the release source set's manifest. Debug builds keep INTERNET, which
// they need to load JS from Metro.
const REMOVED = [
  'android.permission.INTERNET',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

const MANIFEST = `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
${REMOVED.map((p) => `    <uses-permission android:name="${p}" tools:node="remove" />`).join('\n')}
</manifest>
`;

/** @param {import('expo/config').ExpoConfig} config */
module.exports = function withReleasePermissions(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/release');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'AndroidManifest.xml'), MANIFEST);
      return cfg;
    },
  ]);
};
