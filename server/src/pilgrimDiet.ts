export const pilgrimLanguages = ["ko", "en", "es", "it", "fr", "pt"] as const;
export type PilgrimLanguage = typeof pilgrimLanguages[number];

type DietGuide = { label: string; canEat: string; avoid: string; koreanFood: string };

const guides: Record<PilgrimLanguage, Record<string, DietGuide>> = {
  ko: {
    "일반식": { label: "일반식", canEat: "일반적인 육류, 생선, 달걀, 유제품과 식물성 식품", avoid: "별도 제한 없음. 알레르기 정보는 반드시 별도 확인", koreanFood: "대부분의 한식을 먹을 수 있으며 알레르기 재료와 매운 정도를 확인합니다." },
    "페스코": { label: "페스코", canEat: "생선, 해산물, 달걀, 유제품, 식물성 식품", avoid: "소고기, 돼지고기, 닭고기 등 육류", koreanFood: "생선구이, 해산물·채소 요리, 고기 없는 비빔밥이 적합합니다. 육수의 육류 사용을 확인합니다." },
    "락토오보": { label: "락토오보 채식", canEat: "달걀, 유제품, 콩·두부, 곡류와 채소", avoid: "육류, 생선, 해산물", koreanFood: "고기 없는 비빔밥, 두부·달걀·채소 요리가 적합합니다. 멸치·고기 육수와 젓갈을 제외합니다." },
    "락토": { label: "락토 채식", canEat: "유제품, 콩·두부, 곡류와 채소", avoid: "육류, 생선, 해산물, 달걀", koreanFood: "두부·채소 반찬과 고기 없는 비빔밥이 적합합니다. 달걀, 육수, 젓갈 사용을 확인합니다." },
    "오보": { label: "오보 채식", canEat: "달걀, 콩·두부, 곡류와 채소", avoid: "육류, 생선, 해산물, 유제품", koreanFood: "달걀·두부·채소 요리가 적합합니다. 버터·우유·치즈와 육수·젓갈을 제외합니다." },
    "비건": { label: "비건", canEat: "곡류, 채소, 과일, 콩·두부 등 식물성 식품", avoid: "육류, 생선, 해산물, 달걀, 유제품, 꿀 등 모든 동물성 재료", koreanFood: "채식 비빔밥, 두부와 나물 요리가 적합합니다. 김치의 젓갈, 멸치·고기 육수, 달걀을 반드시 확인합니다." },
    "육류 제외": { label: "육류 제외", canEat: "식물성 식품과 본인이 허용한 달걀·유제품·해산물", avoid: "소고기, 돼지고기, 닭고기 등 육류", koreanFood: "고기 없는 비빔밥과 채소·두부 요리가 적합합니다. 생선·해산물 허용 여부와 육수를 별도 확인합니다." },
    "기타": { label: "기타 식단", canEat: "순례자가 기재한 식단 상세 기준", avoid: "식단 상세와 알레르기에 표시된 재료", koreanFood: "제공 전 식단 상세를 순례자와 직접 확인합니다." }
  },
  en: {}, es: {}, it: {}, fr: {}, pt: {}
};

const localized: Record<Exclude<PilgrimLanguage, "ko">, Record<string, [string, string, string, string]>> = {
  en: {
    "일반식": ["Regular diet", "Common meat, fish, eggs, dairy and plant foods", "No separate restriction; always check allergies", "Most Korean dishes are suitable. Check allergens and spice level."],
    "페스코": ["Pescatarian", "Fish, seafood, eggs, dairy and plant foods", "Beef, pork, chicken and other meat", "Grilled fish, seafood or vegetable dishes and meat-free bibimbap. Check meat-based broth."],
    "락토오보": ["Lacto-ovo vegetarian", "Eggs, dairy, tofu, grains and vegetables", "Meat, fish and seafood", "Meat-free bibimbap, tofu, egg and vegetable dishes. Avoid anchovy or meat broth and fish sauce."],
    "락토": ["Lacto vegetarian", "Dairy, tofu, grains and vegetables", "Meat, fish, seafood and eggs", "Tofu and vegetable dishes are suitable. Check eggs, broth and fish sauce."],
    "오보": ["Ovo vegetarian", "Eggs, tofu, grains and vegetables", "Meat, fish, seafood and dairy", "Egg, tofu and vegetable dishes are suitable. Avoid dairy, broth and fish sauce."],
    "비건": ["Vegan", "Grains, vegetables, fruit, beans and tofu", "All animal products including meat, fish, eggs, dairy and honey", "Vegan bibimbap, tofu and vegetable dishes. Check kimchi fish sauce, anchovy or meat broth and eggs."],
    "육류 제외": ["No meat", "Plant foods and any eggs, dairy or seafood personally accepted", "Beef, pork, chicken and other meat", "Meat-free bibimbap, tofu and vegetable dishes. Confirm seafood and broth separately."],
    "기타": ["Other diet", "Foods allowed in the pilgrim's diet notes", "Items listed in diet notes and allergies", "Confirm the detailed requirements directly before serving food."]
  },
  es: {
    "일반식": ["Dieta regular", "Carne, pescado, huevos, lácteos y alimentos vegetales", "Sin restricción adicional; comprobar alergias", "Puede comer la mayoría de platos coreanos; compruebe alérgenos y picante."],
    "페스코": ["Pescetariana", "Pescado, marisco, huevos, lácteos y vegetales", "Carne de vacuno, cerdo, pollo y otras carnes", "Pescado, marisco, verduras y bibimbap sin carne; comprobar el caldo."],
    "락토오보": ["Lacto-ovo vegetariana", "Huevos, lácteos, tofu, cereales y verduras", "Carne, pescado y marisco", "Bibimbap sin carne, tofu, huevos y verduras; evitar caldos animales y salsa de pescado."],
    "락토": ["Lacto vegetariana", "Lácteos, tofu, cereales y verduras", "Carne, pescado, marisco y huevos", "Tofu y verduras; comprobar huevos, caldo y salsa de pescado."],
    "오보": ["Ovo vegetariana", "Huevos, tofu, cereales y verduras", "Carne, pescado, marisco y lácteos", "Huevos, tofu y verduras; evitar lácteos, caldo y salsa de pescado."],
    "비건": ["Vegana", "Cereales, verduras, fruta, legumbres y tofu", "Todos los productos animales, incluidos huevos, lácteos y miel", "Bibimbap vegano, tofu y verduras; comprobar kimchi, caldos y huevos."],
    "육류 제외": ["Sin carne", "Vegetales y huevos, lácteos o marisco aceptados personalmente", "Vacuno, cerdo, pollo y otras carnes", "Bibimbap sin carne, tofu y verduras; confirmar marisco y caldo."],
    "기타": ["Otra dieta", "Alimentos permitidos en las notas", "Ingredientes indicados en notas y alergias", "Confirmar los requisitos antes de servir."]
  },
  it: {
    "일반식": ["Dieta regolare", "Carne, pesce, uova, latticini e alimenti vegetali", "Nessuna restrizione aggiuntiva; verificare le allergie", "La maggior parte dei piatti coreani va bene; verificare allergeni e piccantezza."],
    "페스코": ["Pescetariana", "Pesce, frutti di mare, uova, latticini e vegetali", "Manzo, maiale, pollo e altre carni", "Pesce, frutti di mare, verdure e bibimbap senza carne; controllare il brodo."],
    "락토오보": ["Latto-ovo vegetariana", "Uova, latticini, tofu, cereali e verdure", "Carne, pesce e frutti di mare", "Bibimbap senza carne, tofu, uova e verdure; evitare brodo animale e salsa di pesce."],
    "락토": ["Latto-vegetariana", "Latticini, tofu, cereali e verdure", "Carne, pesce, frutti di mare e uova", "Tofu e verdure; controllare uova, brodo e salsa di pesce."],
    "오보": ["Ovo-vegetariana", "Uova, tofu, cereali e verdure", "Carne, pesce, frutti di mare e latticini", "Uova, tofu e verdure; evitare latticini, brodo e salsa di pesce."],
    "비건": ["Vegana", "Cereali, verdure, frutta, legumi e tofu", "Tutti i prodotti animali, comprese uova, latticini e miele", "Bibimbap vegano, tofu e verdure; controllare kimchi, brodo e uova."],
    "육류 제외": ["Senza carne", "Vegetali e uova, latticini o pesce accettati personalmente", "Manzo, maiale, pollo e altre carni", "Bibimbap senza carne, tofu e verdure; confermare pesce e brodo."],
    "기타": ["Altra dieta", "Alimenti consentiti nelle note", "Ingredienti indicati nelle note e allergie", "Confermare i requisiti prima di servire."]
  },
  fr: {
    "일반식": ["Alimentation normale", "Viande, poisson, œufs, produits laitiers et végétaux", "Aucune restriction supplémentaire; vérifier les allergies", "La plupart des plats coréens conviennent; vérifier allergènes et niveau épicé."],
    "페스코": ["Pescétarienne", "Poisson, fruits de mer, œufs, laitages et végétaux", "Bœuf, porc, poulet et autres viandes", "Poisson, fruits de mer, légumes et bibimbap sans viande; vérifier le bouillon."],
    "락토오보": ["Lacto-ovo végétarienne", "Œufs, laitages, tofu, céréales et légumes", "Viande, poisson et fruits de mer", "Bibimbap sans viande, tofu, œufs et légumes; éviter bouillons animaux et sauce de poisson."],
    "락토": ["Lacto-végétarienne", "Laitages, tofu, céréales et légumes", "Viande, poisson, fruits de mer et œufs", "Tofu et légumes; vérifier œufs, bouillon et sauce de poisson."],
    "오보": ["Ovo-végétarienne", "Œufs, tofu, céréales et légumes", "Viande, poisson, fruits de mer et laitages", "Œufs, tofu et légumes; éviter laitages, bouillon et sauce de poisson."],
    "비건": ["Végane", "Céréales, légumes, fruits, légumineuses et tofu", "Tout produit animal, y compris œufs, laitages et miel", "Bibimbap végan, tofu et légumes; vérifier kimchi, bouillons et œufs."],
    "육류 제외": ["Sans viande", "Végétaux et œufs, laitages ou fruits de mer acceptés personnellement", "Bœuf, porc, poulet et autres viandes", "Bibimbap sans viande, tofu et légumes; confirmer fruits de mer et bouillon."],
    "기타": ["Autre régime", "Aliments autorisés dans les notes", "Éléments indiqués dans les notes et allergies", "Confirmer les besoins avant de servir."]
  },
  pt: {
    "일반식": ["Dieta regular", "Carne, peixe, ovos, laticínios e alimentos vegetais", "Sem restrição adicional; verificar alergias", "A maioria dos pratos coreanos serve; verificar alergénios e picante."],
    "페스코": ["Pescetariana", "Peixe, marisco, ovos, laticínios e vegetais", "Carne bovina, suína, frango e outras carnes", "Peixe, marisco, vegetais e bibimbap sem carne; verificar o caldo."],
    "락토오보": ["Lacto-ovo vegetariana", "Ovos, laticínios, tofu, cereais e vegetais", "Carne, peixe e marisco", "Bibimbap sem carne, tofu, ovos e vegetais; evitar caldos animais e molho de peixe."],
    "락토": ["Lacto-vegetariana", "Laticínios, tofu, cereais e vegetais", "Carne, peixe, marisco e ovos", "Tofu e vegetais; verificar ovos, caldo e molho de peixe."],
    "오보": ["Ovo-vegetariana", "Ovos, tofu, cereais e vegetais", "Carne, peixe, marisco e laticínios", "Ovos, tofu e vegetais; evitar laticínios, caldo e molho de peixe."],
    "비건": ["Vegana", "Cereais, vegetais, fruta, leguminosas e tofu", "Todos os produtos animais, incluindo ovos, laticínios e mel", "Bibimbap vegano, tofu e vegetais; verificar kimchi, caldos e ovos."],
    "육류 제외": ["Sem carne", "Vegetais e ovos, laticínios ou marisco aceites pessoalmente", "Carne bovina, suína, frango e outras carnes", "Bibimbap sem carne, tofu e vegetais; confirmar marisco e caldo."],
    "기타": ["Outra dieta", "Alimentos permitidos nas notas", "Itens indicados nas notas e alergias", "Confirmar os requisitos antes de servir."]
  }
};

for (const [language, entries] of Object.entries(localized) as Array<[Exclude<PilgrimLanguage, "ko">, Record<string, [string, string, string, string]>]>) {
  guides[language] = Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, { label: value[0], canEat: value[1], avoid: value[2], koreanFood: value[3] }]));
}

export function normalizePilgrimLanguage(value: unknown): PilgrimLanguage {
  return pilgrimLanguages.includes(value as PilgrimLanguage) ? value as PilgrimLanguage : "en";
}

const dietTypeAliases: Record<string, string> = {
  regular: "일반식",
  "regular diet": "일반식",
  pescatarian: "페스코",
  pescetarian: "페스코",
  "lacto ovo": "락토오보",
  "lacto ovo vegetarian": "락토오보",
  "lacto vegetarian": "락토",
  "ovo vegetarian": "오보",
  vegan: "비건",
  "no meat": "육류 제외",
  other: "기타",
};

function normalizeDietType(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  return dietTypeAliases[normalized] ?? value;
}

export function pilgrimDietGuide(dietType: string, language: PilgrimLanguage): DietGuide {
  return guides[language][normalizeDietType(dietType)] ?? guides[language]["기타"];
}
