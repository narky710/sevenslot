#!/usr/bin/env bash
# Run AFTER Xcode is installed. End-to-end: regen project, build, boot sim, screenshot.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! xcode-select -p 2>/dev/null | grep -q "Xcode.app"; then
  echo "→ Pointing xcode-select at Xcode.app (sudo required once)"
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  sudo xcodebuild -license accept
fi

echo "→ Regenerating Xcode project"
xcodegen generate

DEVICE="${DEVICE:-iPhone 15 Pro}"
OS="${OS:-latest}"
DEST="platform=iOS Simulator,name=${DEVICE},OS=${OS}"

echo "→ Building for ${DEST}"
xcodebuild \
  -project PotOGold.xcodeproj \
  -scheme PotOGold \
  -configuration Debug \
  -destination "$DEST" \
  -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO \
  build | tail -20

SIM_UDID=$(xcrun simctl list devices "$OS" available -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
target = '$DEVICE'
for runtime, devices in data['devices'].items():
    for d in devices:
        if d['name'] == target and d.get('isAvailable', True):
            print(d['udid']); sys.exit(0)
sys.exit(1)
")

echo "→ Booting simulator $SIM_UDID"
xcrun simctl boot "$SIM_UDID" || true
open -a Simulator

APP_PATH=$(find build/Build/Products/Debug-iphonesimulator -name "PotOGold.app" -maxdepth 2 | head -1)
echo "→ Installing $APP_PATH"
xcrun simctl install "$SIM_UDID" "$APP_PATH"
xcrun simctl launch "$SIM_UDID" com.jdewey.potogold

sleep 3
SHOT="$ROOT/screenshots/game-select-$(date +%Y%m%d-%H%M%S).png"
mkdir -p "$(dirname "$SHOT")"
xcrun simctl io "$SIM_UDID" screenshot "$SHOT"
echo "→ Screenshot saved: $SHOT"
open "$SHOT"
