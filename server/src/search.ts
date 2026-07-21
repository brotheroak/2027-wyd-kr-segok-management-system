function normalizeSearchTerm(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/남자/g, "남성")
    .replace(/여자/g, "여성")
    .replace(/애완동물/g, "반려동물")
    .replace(/홈 스테이/g, "홈스테이")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesIntegratedSearch(values: unknown[], query: string) {
  const terms = normalizeSearchTerm(query).split(" ").filter(Boolean);
  if (terms.length === 0) return true;
  const normalizedValues = values.map(normalizeSearchTerm);
  return terms.every((term) => {
    const districtMatch = term.match(/^(\d{1,2})구역$/);
    if (districtMatch) {
      const districtToken = `${Number(districtMatch[1])}구역`;
      return normalizedValues.some((value) => value.split(/[^0-9가-힣]+/).includes(districtToken));
    }
    return normalizedValues.some((value) => value.includes(term));
  });
}
