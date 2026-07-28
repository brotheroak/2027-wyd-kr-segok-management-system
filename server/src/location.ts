export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type AttendanceLocationInput = Coordinates & {
  accuracyM: number;
};

const EARTH_RADIUS_M = 6_371_000;
export const MAX_DEVICE_ACCURACY_M = 200;

function radians(value: number) {
  return value * Math.PI / 180;
}

export function validCoordinates({ latitude, longitude }: Coordinates) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

export function haversineMeters(from: Coordinates, to: Coordinates) {
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function validateAttendanceLocation(
  checkpoint: Coordinates & { radiusM: number },
  device: AttendanceLocationInput
) {
  if (!validCoordinates(checkpoint) || !validCoordinates(device)) {
    return { accepted: false, distanceM: Number.NaN, reason: "위치 좌표가 올바르지 않습니다." };
  }
  if (!Number.isFinite(device.accuracyM) || device.accuracyM <= 0 || device.accuracyM > MAX_DEVICE_ACCURACY_M) {
    return {
      accepted: false,
      distanceM: Number.NaN,
      reason: `기기 위치 정확도가 낮습니다. 오차 ${MAX_DEVICE_ACCURACY_M}m 이내에서 다시 시도해 주세요.`
    };
  }
  if (!Number.isInteger(checkpoint.radiusM) || checkpoint.radiusM < 20 || checkpoint.radiusM > 1000) {
    return { accepted: false, distanceM: Number.NaN, reason: "체크 지점 허용 반경이 올바르지 않습니다." };
  }
  const distanceM = haversineMeters(checkpoint, device);
  return distanceM <= checkpoint.radiusM
    ? { accepted: true, distanceM, reason: "" }
    : {
      accepted: false,
      distanceM,
      reason: `지정된 체크 지점에서 약 ${Math.round(distanceM)}m 떨어져 있어 출석 처리할 수 없습니다.`
    };
}
