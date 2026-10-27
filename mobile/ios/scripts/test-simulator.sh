#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

for dependency in xcodegen xcodebuild xcrun python3; do
  if ! command -v "$dependency" >/dev/null 2>&1; then
    echo "Required command is missing: $dependency. See mobile/ios/README.md." >&2
    exit 1
  fi
done
xcodebuild -version
xcrun --find simctl >/dev/null
xcodegen generate --spec project.yml

device_id="${SIMULATOR_UDID:-}"
if [[ -z "$device_id" ]]; then
  device_id="$(xcrun simctl list devices available -j | python3 scripts/select_simulator.py)"
fi
mkdir -p TestResults
result_path="TestResults/$(date '+%Y%m%d-%H%M%S')-$$.xcresult"
xcodebuild -project SegokChurch.xcodeproj -scheme SegokChurch \
  -destination "platform=iOS Simulator,id=$device_id" \
  -derivedDataPath DerivedData -resultBundlePath "$result_path" \
  CODE_SIGNING_ALLOWED=NO test
