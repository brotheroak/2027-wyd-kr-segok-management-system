export const pilgrimLanguageOptions = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "it", label: "Italiano" },
  { value: "fr", label: "Français" },
  { value: "pt", label: "Português" }
] as const;

export type PilgrimCardLanguage = typeof pilgrimLanguageOptions[number]["value"];

export type PublicPilgrimCard = {
  pilgrimNo: string;
  name: string;
  baptismalName: string;
  gender: string;
  diocese: string;
  region: string;
  grade: string;
  age: number;
  dietType: string;
  dietNotes: string;
  allergies: string;
  preferredLanguage: PilgrimCardLanguage;
  language: PilgrimCardLanguage;
  dietGuide: { label: string; canEat: string; avoid: string; koreanFood: string };
};

type Labels = Record<"card" | "identity" | "name" | "baptismalName" | "diocese" | "region" | "grade" | "age" | "years" | "diet" | "canEat" | "avoid" | "koreanFood" | "dietNotes" | "allergies" | "none" | "scanHelp" | "hostTitle" | "lookup" | "camera" | "manual", string>;

export const pilgrimCardLabels: Record<PilgrimCardLanguage, Labels> = {
  ko: { card: "순례자 카드", identity: "등록 정보", name: "성명", baptismalName: "세례명", diocese: "교구", region: "지역", grade: "학년", age: "나이", years: "세", diet: "식단 안내", canEat: "먹을 수 있어요", avoid: "먹을 수 없어요", koreanFood: "한국 식단 적용", dietNotes: "식단 상세", allergies: "알레르기", none: "없음", scanHelp: "바코드를 호스트에게 제시해 주세요.", hostTitle: "배정 순례자 카드 확인", lookup: "카드 조회", camera: "카메라 스캔", manual: "카드 링크 또는 토큰 입력" },
  en: { card: "Pilgrim card", identity: "Registration details", name: "Name", baptismalName: "Baptismal name", diocese: "Diocese", region: "Region", grade: "Grade", age: "Age", years: "years", diet: "Diet guide", canEat: "Can eat", avoid: "Must avoid", koreanFood: "Korean food guide", dietNotes: "Diet notes", allergies: "Allergies", none: "None", scanHelp: "Show this barcode to your host.", hostTitle: "Assigned pilgrim card", lookup: "View card", camera: "Scan camera", manual: "Enter card link or token" },
  es: { card: "Tarjeta de peregrino", identity: "Datos registrados", name: "Nombre", baptismalName: "Nombre bautismal", diocese: "Diócesis", region: "Región", grade: "Curso", age: "Edad", years: "años", diet: "Guía alimentaria", canEat: "Puede comer", avoid: "Debe evitar", koreanFood: "Comida coreana", dietNotes: "Notas de dieta", allergies: "Alergias", none: "Ninguna", scanHelp: "Muestre este código a su familia anfitriona.", hostTitle: "Tarjeta del peregrino asignado", lookup: "Ver tarjeta", camera: "Escanear", manual: "Introduzca enlace o token" },
  it: { card: "Carta del pellegrino", identity: "Dati registrati", name: "Nome", baptismalName: "Nome di battesimo", diocese: "Diocesi", region: "Regione", grade: "Classe", age: "Età", years: "anni", diet: "Guida alimentare", canEat: "Può mangiare", avoid: "Da evitare", koreanFood: "Cibo coreano", dietNotes: "Note alimentari", allergies: "Allergie", none: "Nessuna", scanHelp: "Mostra questo codice alla famiglia ospitante.", hostTitle: "Carta del pellegrino assegnato", lookup: "Vedi carta", camera: "Scansiona", manual: "Inserisci link o token" },
  fr: { card: "Carte du pèlerin", identity: "Informations enregistrées", name: "Nom", baptismalName: "Nom de baptême", diocese: "Diocèse", region: "Région", grade: "Niveau", age: "Âge", years: "ans", diet: "Guide alimentaire", canEat: "Peut manger", avoid: "À éviter", koreanFood: "Cuisine coréenne", dietNotes: "Notes alimentaires", allergies: "Allergies", none: "Aucune", scanHelp: "Présentez ce code à votre famille d'accueil.", hostTitle: "Carte du pèlerin assigné", lookup: "Voir la carte", camera: "Scanner", manual: "Saisir le lien ou le jeton" },
  pt: { card: "Cartão do peregrino", identity: "Dados registados", name: "Nome", baptismalName: "Nome de batismo", diocese: "Diocese", region: "Região", grade: "Ano", age: "Idade", years: "anos", diet: "Guia alimentar", canEat: "Pode comer", avoid: "Deve evitar", koreanFood: "Comida coreana", dietNotes: "Notas alimentares", allergies: "Alergias", none: "Nenhuma", scanHelp: "Mostre este código à família anfitriã.", hostTitle: "Cartão do peregrino atribuído", lookup: "Ver cartão", camera: "Digitalizar", manual: "Introduzir ligação ou token" }
};

export function isPilgrimCardLanguage(value: string): value is PilgrimCardLanguage {
  return pilgrimLanguageOptions.some((option) => option.value === value);
}
