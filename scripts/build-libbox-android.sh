#!/usr/bin/env bash
set -euo pipefail

# Воспроизводимая локальная сборка libbox.aar для Android ARM64.
# Требования: git, go 1.24.7+, Java 17, Android SDK/NDK,
# ANDROID_HOME или ANDROID_SDK_ROOT.

SING_BOX_REPO="https://github.com/SagerNet/sing-box.git"
SING_BOX_COMMIT="670d7a7693918b765a17c44aee5afb5d47ead390"
# Совпадает с gomobile, закреплённой в go.mod этого revision sing-box.
GOMOBILE_VERSION="v0.1.12"
BUILD_ROOT="${BUILD_ROOT:-$PWD/.native-build}"
SING_BOX_DIR="$BUILD_ROOT/sing-box"
OUTPUT_DIR="$PWD/build/native"
OUTPUT_AAR="$OUTPUT_DIR/libbox.aar"
REVISION_FILE="$OUTPUT_DIR/sing-box-revision.txt"
SHA_FILE="$OUTPUT_DIR/libbox.aar.sha256"

command -v git >/dev/null || { echo "Ошибка: git не найден" >&2; exit 1; }
command -v go >/dev/null || { echo "Ошибка: Go не найден" >&2; exit 1; }
command -v java >/dev/null || { echo "Ошибка: Java не найдена" >&2; exit 1; }

JAVA_MAJOR="$(java -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p' | head -1)"
if [ "${JAVA_MAJOR:-}" != "17" ]; then
  echo "Ошибка: требуется OpenJDK 17, обнаружено: ${JAVA_MAJOR:-неизвестно}" >&2
  exit 1
fi

ANDROID_SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$ANDROID_SDK" ]; then
  echo "Ошибка: установите ANDROID_HOME или ANDROID_SDK_ROOT" >&2
  exit 1
fi

export ANDROID_HOME="$ANDROID_SDK"
export ANDROID_SDK_ROOT="$ANDROID_SDK"

# sing-box build_libbox создаёт варианты с Android API 23 и 21.
# Поэтому platform-35 сам по себе недостаточен.
test -d "$ANDROID_SDK/platforms/android-23" || {
  echo "Ошибка: Android SDK platform android-23 не установлен" >&2
  exit 1
}
test -d "$ANDROID_SDK/platforms/android-21" || {
  echo "Ошибка: Android SDK platform android-21 не установлен" >&2
  exit 1
}

mkdir -p "$BUILD_ROOT" "$OUTPUT_DIR"
rm -rf "$SING_BOX_DIR"

echo "==> Получение sing-box: $SING_BOX_COMMIT"
git clone --filter=blob:none "$SING_BOX_REPO" "$SING_BOX_DIR"
cd "$SING_BOX_DIR"
git checkout --detach "$SING_BOX_COMMIT"
ACTUAL_COMMIT="$(git rev-parse HEAD)"
[ "$ACTUAL_COMMIT" = "$SING_BOX_COMMIT" ] || { echo "Ошибка фиксации revision" >&2; exit 1; }

export PATH="$(go env GOPATH)/bin:$PATH"

# Go module downloads can fail transiently at proxy.golang.org with HTTP/2
# INTERNAL_ERROR. Keep the normal proxy first, retry, then fall back to the
# module's VCS source before compilation. This does not change pinned versions.
export GOPROXY="${GOPROXY:-https://proxy.golang.org,direct}"
echo "==> Go module proxy: $GOPROXY"

go_mod_download() {
  local attempt
  for attempt in 1 2 3; do
    echo "==> Downloading Go modules (attempt $attempt/3)"
    if go mod download; then
      return 0
    fi
    sleep $((attempt * 3))
  done

  echo "==> proxy.golang.org failed after retries; retrying Go modules via direct VCS"
  GOPROXY=direct go mod download
}

go_mod_download

echo "==> Установка gomobile/gobind $GOMOBILE_VERSION"
go install "github.com/sagernet/gomobile/cmd/gomobile@$GOMOBILE_VERSION"
go install "github.com/sagernet/gomobile/cmd/gobind@$GOMOBILE_VERSION"
gomobile init

echo "==> Сборка libbox.aar (Android ARM64)"
go run ./cmd/internal/build_libbox -target android -platform android/arm64

[ -s "$SING_BOX_DIR/libbox.aar" ] || { echo "Ошибка: libbox.aar не создан" >&2; exit 1; }
cp "$SING_BOX_DIR/libbox.aar" "$OUTPUT_AAR"
printf '%s\n' "$ACTUAL_COMMIT" > "$REVISION_FILE"
sha256sum "$OUTPUT_AAR" > "$SHA_FILE"

echo
echo "Готово: $OUTPUT_AAR"
echo "Revision: $ACTUAL_COMMIT"
echo "SHA256: $(cut -d' ' -f1 "$SHA_FILE")"
