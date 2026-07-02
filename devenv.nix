{ pkgs, ... }:

let
  # Re-import nixpkgs with the Android SDK licence accepted (and unfree allowed)
  # so we don't have to touch devenv's global nixpkgs config just for the SDK.
  androidPkgs = import pkgs.path {
    inherit (pkgs) system;
    config = {
      allowUnfree = true;
      android_sdk.accept_license = true;
    };
  };

  # Toolchain versions match Expo SDK 54 / React Native 0.81 (compileSdk/target
  # 36, NDK 27, cmake 3.22.1). android-35/34 kept for older transitive modules.
  androidComposition = androidPkgs.androidenv.composeAndroidPackages {
    platformToolsVersion = "35.0.2";
    platformVersions = [ "36" "35" "34" ];
    buildToolsVersions = [ "36.0.0" "35.0.0" ];
    includeNDK = true;
    ndkVersions = [ "27.1.12297006" ];
    cmakeVersions = [ "3.22.1" ];
    includeEmulator = false;
    includeSystemImages = false;
  };

  androidSdk = androidComposition.androidsdk;
  androidSdkRoot = "${androidSdk}/libexec/android-sdk";
in
{
  cachix.enable = false;

  packages = [
    pkgs.nodejs_22
    pkgs.biome
    pkgs.playwright-driver.browsers
    # Android build toolchain (local APK builds, F-Droid path).
    pkgs.jdk17
    androidSdk
  ];

  env = {
    # Point Playwright at the nixpkgs-built browsers and skip the host-OS
    # validation step (it expects glibc-Linux distros, not NixOS).
    PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
    PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";

    # Android SDK / JDK for `expo prebuild` + Gradle.
    JAVA_HOME = "${pkgs.jdk17}";
    ANDROID_HOME = androidSdkRoot;
    ANDROID_SDK_ROOT = androidSdkRoot;
    ANDROID_NDK_ROOT = "${androidSdkRoot}/ndk/27.1.12297006";
  };

  enterShell = ''
    echo "Scottish Tides monorepo devshell"
    echo "  node:       $(node --version)"
    echo "  biome:      $(biome --version 2>/dev/null || echo 'n/a')"
    echo "  java:       $(java -version 2>&1 | head -1)"
    echo "  android:    ANDROID_HOME=$ANDROID_HOME"
    echo "  playwright: browsers at $PLAYWRIGHT_BROWSERS_PATH"
  '';
}
