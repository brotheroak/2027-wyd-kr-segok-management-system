import type { DistrictInfo } from "../types.js";

export const districtBansByNo: Record<string, string[]> = {
  "1": ["1-1", "1-2", "1-3", "1-4"],
  "2": ["2-1", "2-2", "2-3", "2-4"],
  "3": ["3-1", "3-2", "3-3", "3-4"],
  "4": ["4-1", "4-2", "4-3", "4-4", "4-5"],
  "5": ["5-1", "5-2", "5-3"],
  "6": ["6-1", "6-2", "6-3"],
  "7": ["7-1", "7-2", "7-3", "7-4"],
  "8": ["8-1", "8-2", "8-3"],
  "9": ["9-1", "9-2", "9-3"],
  "10": ["10-1", "10-2", "10-3"],
  "11": ["11-1", "11-2"],
  "12": ["12-1", "12-2", "12-3"],
  "13": ["13-1", "13-2", "13-3", "13-4"],
  "99": ["99-1", "99-2"]
};

export const districtOptions = Object.keys(districtBansByNo);

export type DistrictGuideSection = {
  no: string;
  name: string;
  areas: string[];
  bans: Array<{
    ban: string;
    description: string;
  }>;
};

export const districtGuideSections: DistrictGuideSection[] = [
  {
    no: "1",
    name: "1구역",
    areas: ["세곡 주택", "리엔파크 1, 2, 3단지"],
    bans: [
      { ban: "1-1", description: "강남신동아파밀리에 1단지 / 리엔파크 1단지" },
      { ban: "1-2", description: "강남신동아파밀리에 2단지 / 리엔파크 2단지" },
      { ban: "1-3", description: "세곡리엔파크 3단지" },
      { ban: "1-4", description: "세곡 주택, 윗반고개, 아랫반고개" }
    ]
  },
  {
    no: "2",
    name: "2구역",
    areas: ["리엔파크 4, 5단지"],
    bans: [
      { ban: "2-1", description: "세곡리엔파크 4단지 일부 동" },
      { ban: "2-2", description: "세곡리엔파크 4단지 일부 동" },
      { ban: "2-3", description: "데시앙파크 5단지 / 리엔파크 5단지 일부 동" },
      { ban: "2-4", description: "데시앙파크 5단지 / 리엔파크 5단지 일부 동" }
    ]
  },
  {
    no: "3",
    name: "3구역",
    areas: ["은곡마을", "이편한세상"],
    bans: [
      { ban: "3-1", description: "강남 LH 1단지 / 이편한세상 일부 동" },
      { ban: "3-2", description: "강남 LH 1단지 / 이편한세상 일부 동" },
      { ban: "3-3", description: "강남 LH 1단지 / 이편한세상 일부 동" },
      { ban: "3-4", description: "은곡마을 일대" }
    ]
  },
  {
    no: "4",
    name: "4구역",
    areas: ["세곡푸르지오", "효성해링턴코트"],
    bans: [
      { ban: "4-1", description: "푸르지오 201-204동" },
      { ban: "4-2", description: "푸르지오 205-208동" },
      { ban: "4-3", description: "푸르지오 209-212동" },
      { ban: "4-4", description: "푸르지오 213-216동" },
      { ban: "4-5", description: "효성 해링턴" }
    ]
  },
  {
    no: "5",
    name: "5구역",
    areas: ["강남 LH 3단지", "강남브리즈힐"],
    bans: [
      { ban: "5-1", description: "강남 LH 3단지 301-307동" },
      { ban: "5-2", description: "강남 LH 3단지 308-315동" },
      { ban: "5-3", description: "강남브리즈힐 4단지" }
    ]
  },
  {
    no: "6",
    name: "6구역",
    areas: ["강남 LH 강남힐스테이트"],
    bans: [
      { ban: "6-1", description: "LH 강남힐스테이트 501동" },
      { ban: "6-2", description: "LH 강남힐스테이트 502-503동" },
      { ban: "6-3", description: "LH 강남힐스테이트 504-505동" }
    ]
  },
  {
    no: "7",
    name: "7구역",
    areas: ["래미안 강남힐즈", "서울시니어스 강남타워"],
    bans: [
      { ban: "7-1", description: "래미안 강남힐즈 601-605동" },
      { ban: "7-2", description: "래미안 강남힐즈 606-610동" },
      { ban: "7-3", description: "래미안 강남힐즈 611-615동" },
      { ban: "7-4", description: "래미안 강남힐즈 616-620동, 서울시니어스강남타워" }
    ]
  },
  {
    no: "8",
    name: "8구역",
    areas: ["교수마을", "쟁골마을", "못골마을"],
    bans: [
      { ban: "8-1", description: "교수마을 밤고개로12길-14길" },
      { ban: "8-2", description: "자곡로7길 8~16-2, 16-4, 16-8, 16-10, 16-12, 16-14" },
      { ban: "8-3", description: "자곡로7길 16-1, 16-3, 16-5, 16-9, 16-11, 16-13~36-9" }
    ]
  },
  {
    no: "9",
    name: "9구역",
    areas: ["강남아이파크 7단지", "강남 LH 8단지", "오피스텔"],
    bans: [
      { ban: "9-1", description: "강남아이파크 7단지 701-705동" },
      { ban: "9-2", description: "강남아이파크 7단지 706-710동" },
      { ban: "9-3", description: "강남 LH 8단지, 유탑유블래스, 더샵라르고 등 오피스텔" }
    ]
  },
  {
    no: "10",
    name: "10구역",
    areas: ["율현동 방죽1마을", "한신휴플러스 6단지"],
    bans: [
      { ban: "10-1", description: "한신휴플러스 6단지" },
      { ban: "10-2", description: "방죽1마을 밤고개로24길 20~66-18" },
      { ban: "10-3", description: "방죽1마을 밤고개로24길 75~87" }
    ]
  },
  {
    no: "11",
    name: "11구역",
    areas: ["율현동 방죽마을", "한신휴플러스 8단지"],
    bans: [
      { ban: "11-1", description: "방죽마을 밤고개로23길 7~20" },
      { ban: "11-2", description: "한신휴플러스 8단지" }
    ]
  },
  {
    no: "12",
    name: "12구역",
    areas: ["자곡동 래미안포레"],
    bans: [
      { ban: "12-1", description: "래미안포레 301-304동" },
      { ban: "12-2", description: "래미안포레 305-308동" },
      { ban: "12-3", description: "래미안포레 309-315동" }
    ]
  },
  {
    no: "13",
    name: "13구역",
    areas: ["자곡동 한양수자인"],
    bans: [
      { ban: "13-1", description: "한양수자인 401-407동" },
      { ban: "13-2", description: "한양수자인 408-413동" },
      { ban: "13-3", description: "한양수자인 414-419동" },
      { ban: "13-4", description: "한양수자인 420-426동" }
    ]
  },
  {
    no: "99",
    name: "99구역",
    areas: ["구역 외"],
    bans: [
      { ban: "99-1", description: "세곡동성당 구역반 편성표에 매칭되지 않는 주소" },
      { ban: "99-2", description: "구역 외 보조 분류" }
    ]
  }
];

export function districtName(no: string) {
  return no === "99" ? "구역외" : `${no}구역`;
}

export function districtLabel(no: string, ban: string) {
  return no === "99" ? "구역외 (99구역)" : `${districtName(no)} ${ban}반`;
}

export function makeManualDistrict(no: string, ban?: string): DistrictInfo {
  const allowedBans = districtBansByNo[no] ?? districtBansByNo["99"];
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
