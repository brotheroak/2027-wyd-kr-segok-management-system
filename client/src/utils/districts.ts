import type { DistrictInfo } from "../types.js";

export const districtBansByNo: Record<string, string[]> = {
  "1": ["1-1", "1-2", "1-3", "1-4"],
  "2": ["2-1", "2-2", "2-3", "2-4"],
  "3": ["3-1", "3-2", "3-3", "3-4"],
  "4": ["4-1", "4-2", "4-3", "4-4", "4-5"],
  "5": ["5-1", "5-2", "5-3"],
  "6": ["6-1", "6-2", "6-3"],
  "7": ["7-1", "7-2", "7-3", "7-4"],
  "8": ["8-1", "8-2", "8-3", "8-4"],
  "9": ["9-1", "9-2", "9-3", "9-4"],
  "10": ["10-1", "10-2"],
  "11": ["11-1", "11-2", "11-3"],
  "12": ["12-1", "12-2", "12-3", "12-4"],
  "13": ["13-1"]
};

export const districtOptions = Object.keys(districtBansByNo);

export function districtName(no: string) {
  return no === "13" ? "구역외" : `${no}구역`;
}

export function districtLabel(no: string, ban: string) {
  return no === "13" ? "구역외 (13구역)" : `${districtName(no)} ${ban}반`;
}

export function makeManualDistrict(no: string, ban?: string): DistrictInfo {
  const allowedBans = districtBansByNo[no] ?? districtBansByNo["13"];
  const selectedBan = ban && allowedBans.includes(ban) ? ban : allowedBans[0];
  return {
    no,
    name: districtName(no),
    ban: selectedBan,
    label: districtLabel(no, selectedBan),
    confidence: "manual",
    reason: "신청서에서 구역/반을 수동 선택했습니다."
  };
}
