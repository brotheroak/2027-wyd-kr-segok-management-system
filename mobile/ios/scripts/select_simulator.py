"""Select an available iPhone Simulator running iOS >= 16 from simctl JSON."""
import json
import re
import sys


def select_device(data):
    candidates = []
    for runtime, devices in data.get("devices", {}).items():
        match = re.search(r"\.iOS-(\d+)(?:-(\d+))?", runtime)
        if not match or int(match.group(1)) < 16:
            continue
        version = (int(match.group(1)), int(match.group(2) or 0))
        for device in devices:
            if device.get("isAvailable", True) and device.get("name", "").startswith("iPhone") and device.get("udid"):
                candidates.append((version, device["udid"]))
    if not candidates:
        raise ValueError("iOS 16 이상 iPhone Simulator가 없습니다. Xcode에서 iOS Simulator와 기기를 추가해 주세요.")
    return max(candidates, key=lambda item: item[0])[1]


if __name__ == "__main__":
    try:
        print(select_device(json.load(sys.stdin)))
    except (ValueError, TypeError, KeyError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
