export type DistrictConfidence = "high" | "medium" | "low" | "manual";

export type DistrictAssignment = {
  no: string;
  name: string;
  ban: string;
  label: string;
  confidence: DistrictConfidence;
  reason: string;
};

type DistrictRule = {
  no: string;
  ban: string;
  keywords: string[];
  building?: Array<[number, number, string]>;
  addressNumber?: Array<[string, number, number, string]>;
  reason: string;
};

const OUTSIDE_DISTRICT: DistrictAssignment = {
  no: "99",
  name: "구역외",
  ban: "99-1",
  label: "구역외 (99구역)",
  confidence: "low",
  reason: "구역반 편성표에 매칭되는 주소 키워드가 없습니다."
};

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
  "99": ["99-1", "99-2"]
};

export function districtName(no: string) {
  return no === "99" ? "구역외" : `${no}구역`;
}

export function districtLabel(no: string, ban: string) {
  return no === "99" ? "구역외 (99구역)" : `${districtName(no)} ${ban}반`;
}

type DistrictOverrideInput = Partial<Omit<DistrictAssignment, "confidence">> & { confidence?: string };

export function normalizeDistrictOverride(input: DistrictOverrideInput | undefined, fallback: DistrictAssignment): DistrictAssignment {
  if (!input?.no) return fallback;
  const bans = districtBansByNo[input.no];
  if (!bans) return fallback;

  const ban = input.ban && bans.includes(input.ban) ? input.ban : bans[0];
  return {
    no: input.no,
    name: districtName(input.no),
    ban,
    label: districtLabel(input.no, ban),
    confidence: "manual",
    reason: input.reason?.trim() || "신청서에서 구역/반을 수동 선택했습니다."
  };
}

function normalizeAddress(value = "") {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()]/g, "")
    .replace(/－|–|—/g, "-");
}

function buildingNo(text: string) {
  const match = text.match(/(?:^|[^\d])(\d{3,4})\s*동/);
  return match ? Number(match[1]) : null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roadAddressNumber(text: string, road: string) {
  const match = normalizeAddress(text).match(new RegExp(`${escapeRegExp(normalizeKeyword(road))}(\\d+)`));
  return match ? Number(match[1]) : null;
}

function normalizeKeyword(value: string) {
  return normalizeAddress(value);
}

function makeAssignment(rule: DistrictRule, rawText: string, matchedKeyword: string): DistrictAssignment {
  const building = buildingNo(rawText);
  const addressBan = rule.addressNumber?.find(([road, from, to]) => {
    const number = roadAddressNumber(rawText, road);
    return number !== null && number >= from && number <= to;
  })?.[3];
  const ban = building && rule.building
    ? rule.building.find(([from, to]) => building >= from && building <= to)?.[2] ?? rule.ban
    : addressBan
      ? addressBan
    : rule.ban;
  const no = ban.split("-")[0] || rule.no;
  const name = `${no}구역`;
  const confidence: DistrictConfidence = building || matchedKeyword.match(/\d/) ? "high" : "medium";
  return {
    no,
    name,
    ban,
    label: districtLabel(no, ban),
    confidence,
    reason: building
      ? `${rule.reason}, ${building}동 기준`
      : rule.reason
  };
}

const rules: DistrictRule[] = [
  {
    no: "1",
    ban: "1-1",
    keywords: ["헌릉로590길100", "강남신동아파밀리에1", "신동아파밀리에1", "리엔파크1단지"],
    building: [[101, 199, "1-1"]],
    reason: "1구역 리엔파크 1단지"
  },
  {
    no: "1",
    ban: "1-2",
    keywords: ["헌릉로590길10", "강남신동아파밀리에2", "신동아파밀리에2", "리엔파크2단지"],
    building: [[201, 299, "1-2"]],
    reason: "1구역 리엔파크 2단지"
  },
  {
    no: "1",
    ban: "1-3",
    keywords: ["헌릉로590길11", "세곡리엔파크3", "리엔파크3단지"],
    building: [[301, 399, "1-3"]],
    reason: "1구역 세곡리엔파크 3단지"
  },
  {
    no: "1",
    ban: "1-4",
    keywords: ["헌릉로645길", "윗반고개", "아랫반고개", "세곡주택"],
    reason: "1구역 세곡 주택"
  },
  {
    no: "2",
    ban: "2-1",
    keywords: ["헌릉로590길88", "세곡리엔파크4", "리엔파크4단지"],
    building: [[401, 403, "2-1"], [404, 407, "2-2"], [408, 408, "2-1"]],
    reason: "2구역 세곡리엔파크 4단지"
  },
  {
    no: "2",
    ban: "2-3",
    keywords: ["헌릉로590길63", "데시앙파크5", "강남데시앙파크", "리엔파크5단지"],
    building: [[501, 510, "2-3"], [511, 515, "2-4"]],
    reason: "2구역 리엔파크 5단지"
  },
  {
    no: "3",
    ban: "3-1",
    keywords: ["헌릉로571길20", "이편한세상", "e편한세상", "강남lh1단지"],
    building: [[101, 104, "3-1"], [105, 108, "3-2"], [109, 112, "3-3"]],
    reason: "3구역 이편한세상"
  },
  {
    no: "3",
    ban: "3-4",
    keywords: ["헌릉로569길", "헌릉로571길", "은곡마을"],
    reason: "3구역 은곡마을"
  },
  {
    no: "4",
    ban: "4-1",
    keywords: ["자곡로21", "푸르지오"],
    building: [[201, 204, "4-1"], [205, 208, "4-2"], [209, 212, "4-3"], [213, 216, "4-4"]],
    reason: "4구역 푸르지오"
  },
  {
    no: "4",
    ban: "4-5",
    keywords: ["자곡로36", "효성해링턴", "효성핼링턴"],
    reason: "4구역 효성해링턴"
  },
  {
    no: "5",
    ban: "5-1",
    keywords: ["자곡로3길22", "강남lh3단지", "lh3단지"],
    building: [[301, 307, "5-1"], [308, 315, "5-2"]],
    reason: "5구역 강남LH 3단지"
  },
  {
    no: "5",
    ban: "5-3",
    keywords: ["자곡로3길45", "브리즈힐"],
    reason: "5구역 브리즈힐"
  },
  {
    no: "6",
    ban: "6-1",
    keywords: ["자곡로3길21", "강남힐스테이트", "lh강남힐스테이트"],
    building: [[501, 501, "6-1"], [502, 503, "6-2"], [504, 505, "6-3"]],
    reason: "6구역 LH 강남힐스테이트"
  },
  {
    no: "7",
    ban: "7-1",
    keywords: ["자곡로101", "래미안강남힐즈", "강남힐즈"],
    building: [[601, 605, "7-1"], [606, 610, "7-2"], [611, 615, "7-3"], [616, 620, "7-4"]],
    reason: "7구역 래미안 강남힐즈"
  },
  {
    no: "7",
    ban: "7-4",
    keywords: ["자곡로100-2", "서울시니어스강남타워", "시니어스강남타워"],
    reason: "7구역 서울시니어스강남타워"
  },
  {
    no: "8",
    ban: "8-1",
    keywords: [
      "밤고개로12길",
      "밤고개로13길",
      "밤고개로14길",
      "교수마을",
      "쟁골마을",
      "못골마을",
      "자곡로7길8",
      "자곡로7길10",
      "자곡로7길12",
      "자곡로7길14",
      "자곡로7길16",
      "자곡로7길36",
      "강남푸르지오시티2차",
      "푸르지오시티2차",
      "시그넘하우스",
      "자곡로204-25"
    ],
    reason: "8구역 자곡동 교수·쟁골·못골마을 및 더시그넘하우스"
  },
  {
    no: "8",
    ban: "8-2",
    keywords: ["자곡로175", "자곡아이파크", "강남아이파크", "아이파크7단지", "자곡로154", "강남lh8단지", "lh8단지", "유탑유블래스", "더샵라르고", "오피스텔"],
    building: [[701, 710, "8-2"]],
    reason: "8구역 강남아이파크 7단지 및 자곡로154 일대"
  },
  {
    no: "8",
    ban: "8-3",
    keywords: ["lh행복주택1단지", "행복주택1단지", "lh행복주택1", "행복주택1", "디아크리온", "자곡로11길11"],
    reason: "8구역 LH 행복주택 1단지 및 디아크리온"
  },
  {
    no: "8",
    ban: "8-4",
    keywords: ["lh행복주택2단지", "행복주택2단지", "lh행복주택2", "행복주택2"],
    reason: "8구역 LH 행복주택 2단지"
  },
  {
    no: "9",
    ban: "9-1",
    keywords: ["밤고개로26길50", "한신휴플러스6단지", "휴플러스6단지"],
    reason: "9구역 한신휴플러스 6단지"
  },
  {
    no: "9",
    ban: "9-2",
    keywords: ["밤고개로24길", "방죽1마을"],
    addressNumber: [["밤고개로24길", 20, 66, "9-2"], ["밤고개로24길", 75, 87, "9-3"]],
    reason: "9구역 율현동 방죽1마을"
  },
  {
    no: "9",
    ban: "9-4",
    keywords: ["밤고개로26길"],
    reason: "9구역 밤고개로26길 주택"
  },
  {
    no: "10",
    ban: "10-1",
    keywords: ["밤고개로23길", "밤고개로31길"],
    addressNumber: [["밤고개로23길", 7, 20, "10-1"]],
    reason: "10구역 율현동 방죽마을"
  },
  {
    no: "10",
    ban: "10-2",
    keywords: ["밤고개로27길20", "한신휴플러스8단지", "휴플러스8단지", "헌릉로637길", "밤고개로29길"],
    reason: "10구역 한신휴플러스 8단지 및 인근"
  },
  {
    no: "11",
    ban: "11-1",
    keywords: ["밤고개로21길25", "래미안포레"],
    building: [[301, 304, "11-1"], [305, 308, "11-2"], [309, 315, "11-3"]],
    reason: "11구역 래미안포레"
  },
  {
    no: "12",
    ban: "12-4",
    keywords: ["율현리엔파크"],
    reason: "12구역 율현리엔파크"
  },
  {
    no: "12",
    ban: "12-1",
    keywords: ["자곡로260", "한양수자인"],
    building: [[401, 407, "12-1"], [408, 413, "12-2"], [414, 419, "12-3"], [420, 426, "12-4"]],
    reason: "12구역 한양수자인"
  }
];

export function assignDistrict(address = "", addressDetail = ""): DistrictAssignment {
  const rawText = `${address} ${addressDetail}`;
  const text = normalizeAddress(rawText);
  if (!text) return OUTSIDE_DISTRICT;

  for (const rule of rules) {
    const matchedKeyword = rule.keywords.find((keyword) => text.includes(normalizeKeyword(keyword)));
    if (matchedKeyword) return makeAssignment(rule, rawText, matchedKeyword);
  }

  return OUTSIDE_DISTRICT;
}
