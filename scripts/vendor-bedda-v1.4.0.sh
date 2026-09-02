#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="$ROOT/vendor/react-native-accessibility-controller"
ARCHIVE="$ROOT/vendor/bedda-v1.4.0.tar.gz"
URL="https://github.com/bedda-tech/react-native-accessibility-controller/archive/refs/tags/v1.4.0.tar.gz"

mkdir -p "$ROOT/vendor"
rm -rf "$VENDOR" "$ROOT/vendor/react-native-accessibility-controller-1.4.0"
curl -fsSL "$URL" -o "$ARCHIVE"
tar -xzf "$ARCHIVE" -C "$ROOT/vendor"
mv "$ROOT/vendor/react-native-accessibility-controller-1.4.0" "$VENDOR"
rm -f "$ARCHIVE"

# The v1.4.0 Git tag contains source/android but not the generated lib/ tree.
# Point the vendored package at the checked-in TypeScript source so pnpm/Metro
# can consume the exact tagged source without running npm install in the vendor.
node - "$VENDOR/package.json" <<'NODE'
const fs = require('fs');
const p = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
if (pkg.name !== 'react-native-accessibility-controller' || pkg.version !== '1.4.0') {
  throw new Error(`Unexpected Bedda package identity: ${pkg.name}@${pkg.version}`);
}
pkg.main = 'src/index.ts';
pkg.module = 'src/index.ts';
pkg.types = 'src/types.ts';
fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
NODE

test -f "$VENDOR/android/src/main/AndroidManifest.xml"
test -f "$VENDOR/android/src/main/java/com/beddatech/accessibilitycontroller/AccessibilityControllerService.kt"
test -f "$VENDOR/android/src/main/java/com/beddatech/accessibilitycontroller/AccessibilityControllerModule.kt"
test -f "$VENDOR/android/src/main/java/com/beddatech/accessibilitycontroller/ScreenReader.kt"
test -f "$VENDOR/android/src/main/java/com/beddatech/accessibilitycontroller/ActionDispatcher.kt"
test -f "$VENDOR/android/src/main/java/com/beddatech/accessibilitycontroller/GestureDispatcher.kt"
test -f "$VENDOR/android/src/main/java/com/beddatech/accessibilitycontroller/OverlayManager.kt"
test -f "$VENDOR/android/src/main/res/xml/accessibility_service_config.xml"
test -f "$VENDOR/src/index.ts"
test -f "$VENDOR/src/NativeAccessibilityController.ts"
test -f "$VENDOR/src/types.ts"

echo "Bedda vendor prepared: $VENDOR"
cat "$VENDOR/package.json" | grep -E '"name"|"version"|"main"|"module"|"types"'
