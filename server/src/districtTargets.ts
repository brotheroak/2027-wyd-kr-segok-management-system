export const managedDistrictNumbers = Array.from({ length: 12 }, (_, index) => String(index + 1));

export function parseDistrictTargets(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("구역별 목표값 형식이 올바르지 않습니다.");
  }
  return Object.fromEntries(managedDistrictNumbers.map((no) => {
    const value = Number((input as Record<string, unknown>)[no] ?? 0);
    if (!Number.isInteger(value) || value < 0 || value > 10_000) {
      throw new Error(`${no}구역 목표 가정 수는 0~10,000 사이의 정수여야 합니다.`);
    }
    return [no, value];
  }));
}
