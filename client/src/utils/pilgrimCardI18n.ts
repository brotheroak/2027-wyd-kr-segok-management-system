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

type Labels = Record<"card" | "identity" | "name" | "baptismalName" | "diocese" | "region" | "grade" | "age" | "years" | "diet" | "canEat" | "avoid" | "koreanFood" | "dietNotes" | "allergies" | "none" | "scanHelp" | "hostTitle" | "lookup" | "camera" | "manual" | "loading" | "cardUnavailable", string>;

export const pilgrimCardLabels: Record<PilgrimCardLanguage, Labels> = {
  ko: { card: "순례자 카드", identity: "등록 정보", name: "성명", baptismalName: "세례명", diocese: "교구", region: "지역", grade: "학년", age: "나이", years: "세", diet: "식단 안내", canEat: "먹을 수 있어요", avoid: "먹을 수 없어요", koreanFood: "한국 식단 적용", dietNotes: "식단 상세", allergies: "알레르기", none: "없음", scanHelp: "바코드를 호스트에게 제시해 주세요.", hostTitle: "배정 순례자 카드 확인", lookup: "카드 조회", camera: "카메라 스캔", manual: "카드 링크 또는 토큰 입력", loading: "순례자 카드를 불러오는 중입니다.", cardUnavailable: "유효하지 않거나 만료된 순례자 카드입니다." },
  en: { card: "Pilgrim card", identity: "Registration details", name: "Name", baptismalName: "Baptismal name", diocese: "Diocese", region: "Region", grade: "Grade", age: "Age", years: "years", diet: "Diet guide", canEat: "Can eat", avoid: "Must avoid", koreanFood: "Korean food guide", dietNotes: "Diet notes", allergies: "Allergies", none: "None", scanHelp: "Show this barcode to your host.", hostTitle: "Assigned pilgrim card", lookup: "View card", camera: "Scan camera", manual: "Enter card link or token", loading: "Loading pilgrim card.", cardUnavailable: "This pilgrim card is invalid or has expired." },
  es: { card: "Tarjeta de peregrino", identity: "Datos registrados", name: "Nombre", baptismalName: "Nombre bautismal", diocese: "Diócesis", region: "Región", grade: "Curso", age: "Edad", years: "años", diet: "Guía alimentaria", canEat: "Puede comer", avoid: "Debe evitar", koreanFood: "Comida coreana", dietNotes: "Notas de dieta", allergies: "Alergias", none: "Ninguna", scanHelp: "Muestre este código a su familia anfitriona.", hostTitle: "Tarjeta del peregrino asignado", lookup: "Ver tarjeta", camera: "Escanear", manual: "Introduzca enlace o token", loading: "Cargando la tarjeta del peregrino.", cardUnavailable: "La tarjeta no es válida o ha caducado." },
  it: { card: "Carta del pellegrino", identity: "Dati registrati", name: "Nome", baptismalName: "Nome di battesimo", diocese: "Diocesi", region: "Regione", grade: "Classe", age: "Età", years: "anni", diet: "Guida alimentare", canEat: "Può mangiare", avoid: "Da evitare", koreanFood: "Cibo coreano", dietNotes: "Note alimentari", allergies: "Allergie", none: "Nessuna", scanHelp: "Mostra questo codice alla famiglia ospitante.", hostTitle: "Carta del pellegrino assegnato", lookup: "Vedi carta", camera: "Scansiona", manual: "Inserisci link o token", loading: "Caricamento della carta del pellegrino.", cardUnavailable: "La carta non è valida o è scaduta." },
  fr: { card: "Carte du pèlerin", identity: "Informations enregistrées", name: "Nom", baptismalName: "Nom de baptême", diocese: "Diocèse", region: "Région", grade: "Niveau", age: "Âge", years: "ans", diet: "Guide alimentaire", canEat: "Peut manger", avoid: "À éviter", koreanFood: "Cuisine coréenne", dietNotes: "Notes alimentaires", allergies: "Allergies", none: "Aucune", scanHelp: "Présentez ce code à votre famille d'accueil.", hostTitle: "Carte du pèlerin assigné", lookup: "Voir la carte", camera: "Scanner", manual: "Saisir le lien ou le jeton", loading: "Chargement de la carte du pèlerin.", cardUnavailable: "Cette carte est invalide ou a expiré." },
  pt: { card: "Cartão do peregrino", identity: "Dados registados", name: "Nome", baptismalName: "Nome de batismo", diocese: "Diocese", region: "Região", grade: "Ano", age: "Idade", years: "anos", diet: "Guia alimentar", canEat: "Pode comer", avoid: "Deve evitar", koreanFood: "Comida coreana", dietNotes: "Notas alimentares", allergies: "Alergias", none: "Nenhuma", scanHelp: "Mostre este código à família anfitriã.", hostTitle: "Cartão do peregrino atribuído", lookup: "Ver cartão", camera: "Digitalizar", manual: "Introduzir ligação ou token", loading: "A carregar o cartão do peregrino.", cardUnavailable: "O cartão não é válido ou expirou." }
};

export function isPilgrimCardLanguage(value: string): value is PilgrimCardLanguage {
  return pilgrimLanguageOptions.some((option) => option.value === value);
}

type PilgrimPortalLabels = Record<
  | "language" | "eyebrow" | "title" | "intro" | "pilgrimTab" | "hostTab"
  | "pilgrimAudience" | "pilgrimTitle" | "pilgrimIntro" | "cardInfo" | "cardInfoText"
  | "secureAccess" | "secureAccessText" | "cardInput" | "cardPlaceholder" | "invalidCard"
  | "cardError" | "cardBusy" | "openCard" | "hostAudience" | "hostTitle" | "hostIntro"
  | "receiptAuth" | "receiptAuthText" | "assignedCheck" | "assignedCheckText" | "hostName"
  | "hostNamePlaceholder" | "phone" | "phonePlaceholder" | "pin" | "pinPlaceholder"
  | "hostLoginError" | "authBusy" | "hostLogin" | "hostSuffix" | "hostConfirmed" | "hostPending"
  | "logout" | "approvalTitle" | "approvalText" | "displayLanguage" | "cameraRequest"
  | "cameraAim" | "cameraDenied" | "cameraMissing" | "cameraBusy" | "cameraUnavailable"
  | "scanError" | "close",
  string
>;

export const pilgrimPortalLabels: Record<PilgrimCardLanguage, PilgrimPortalLabels> = {
  ko: {
    language: "언어", eyebrow: "Pilgrim & Host Access", title: "순례자 카드 확인", intro: "순례자는 본인의 개인 카드를 열고, 홈스테이 호스트는 배정된 순례자의 식단 정보를 확인합니다.",
    pilgrimTab: "순례자 로그인", hostTab: "호스트 로그인", pilgrimAudience: "FOR PILGRIMS", pilgrimTitle: "내 순례자 카드 열기", pilgrimIntro: "관리자가 이메일이나 SMS로 보낸 개인 카드 링크를 누르면 바로 열립니다. 아래에는 링크 전체 또는 바코드의 접속 코드를 입력할 수 있습니다.",
    cardInfo: "카드 표시 정보", cardInfoText: "순례자 번호, 성명, 세례명, 바코드와 식단 안내", secureAccess: "안전한 접속", secureAccessText: "개인별 비밀 코드와 만료 기한을 적용하며 이름만으로는 조회할 수 없습니다.",
    cardInput: "개인 카드 링크 또는 접속 코드", cardPlaceholder: "https://.../pilgrim/card#접속코드", invalidCard: "관리자에게 받은 카드 링크 또는 바코드 접속 코드를 확인해 주세요.", cardError: "순례자 카드를 열 수 없습니다. 링크 또는 접속 코드를 확인해 주세요.", cardBusy: "카드 확인 중", openCard: "내 순례자 카드 열기",
    hostAudience: "FOR HOST FAMILIES", hostTitle: "홈스테이 호스트 로그인", hostIntro: "홈스테이 접수 시 입력한 대표자 정보로 인증합니다. 승인 완료 후 우리 가정에 배정된 순례자만 확인할 수 있습니다.", receiptAuth: "접수 인증", receiptAuthText: "대표자 성명, 연락처, 접수 확인용 비밀번호 4자리", assignedCheck: "배정 확인", assignedCheckText: "순례자 바코드를 촬영해 식단과 알레르기 주의사항 확인",
    hostName: "호스트 대표자 성명", hostNamePlaceholder: "홍길동", phone: "연락처", phonePlaceholder: "010-0000-0000", pin: "접수 확인 비밀번호 4자리", pinPlaceholder: "숫자 4자리", hostLoginError: "호스트 인증에 실패했습니다. 입력 정보를 확인해 주세요.", authBusy: "인증 중", hostLogin: "호스트 로그인",
    hostSuffix: "호스트님", hostConfirmed: "승인된 호스트 접수로 로그인했습니다.", hostPending: "현재 호스트 접수가 승인 대기 중입니다.", logout: "로그아웃", approvalTitle: "승인 완료 후 이용할 수 있습니다.", approvalText: "홈스테이 접수 승인 상태는 운영자 검토 후 변경됩니다.", displayLanguage: "표시 언어",
    cameraRequest: "카메라 권한을 요청하는 중입니다.", cameraAim: "순례자 바코드를 화면 중앙에 맞춰 주세요.", cameraDenied: "카메라 권한이 차단되었습니다. 주소창의 사이트 설정에서 카메라를 허용해 주세요.", cameraMissing: "사용 가능한 카메라를 찾을 수 없습니다.", cameraBusy: "다른 앱이 카메라를 사용 중입니다.", cameraUnavailable: "카메라를 시작하지 못했습니다. HTTPS 접속과 브라우저 권한을 확인해 주세요.", scanError: "순례자 카드를 확인할 수 없습니다.", close: "닫기"
  },
  en: {
    language: "Language", eyebrow: "Pilgrim & Host Access", title: "Pilgrim card access", intro: "Pilgrims can open their personal card, while host families can view dietary information for their assigned pilgrims.",
    pilgrimTab: "Pilgrim sign-in", hostTab: "Host sign-in", pilgrimAudience: "FOR PILGRIMS", pilgrimTitle: "Open my pilgrim card", pilgrimIntro: "Open the personal card link sent by the administrator via email or SMS, or enter the full link or barcode access code below.",
    cardInfo: "Card information", cardInfoText: "Pilgrim number, name, baptismal name, barcode and diet guide", secureAccess: "Secure access", secureAccessText: "Each card uses a private code and expiration date. It cannot be found by name alone.",
    cardInput: "Personal card link or access code", cardPlaceholder: "https://.../pilgrim/card#access-code", invalidCard: "Check the card link or barcode access code sent by the administrator.", cardError: "We could not open the pilgrim card. Check the link or access code.", cardBusy: "Checking card", openCard: "Open my pilgrim card",
    hostAudience: "FOR HOST FAMILIES", hostTitle: "Host family sign-in", hostIntro: "Verify with the representative details entered on the homestay application. Once approved, you can view only the pilgrims assigned to your family.", receiptAuth: "Application verification", receiptAuthText: "Representative name, phone number and 4-digit application PIN", assignedCheck: "Assignment check", assignedCheckText: "Scan a pilgrim barcode to review diet and allergy precautions",
    hostName: "Host representative name", hostNamePlaceholder: "Full name", phone: "Phone number", phonePlaceholder: "+82 10-0000-0000", pin: "4-digit application PIN", pinPlaceholder: "4 digits", hostLoginError: "Host verification failed. Check the information entered.", authBusy: "Signing in", hostLogin: "Host sign-in",
    hostSuffix: "Host", hostConfirmed: "Signed in with an approved host application.", hostPending: "Your host application is awaiting approval.", logout: "Sign out", approvalTitle: "Available after approval", approvalText: "An administrator will update your homestay application after review.", displayLanguage: "Display language",
    cameraRequest: "Requesting camera permission.", cameraAim: "Place the pilgrim barcode in the center of the screen.", cameraDenied: "Camera access is blocked. Allow camera access in your browser site settings.", cameraMissing: "No available camera was found.", cameraBusy: "Another app is using the camera.", cameraUnavailable: "Could not start the camera. Check HTTPS access and browser permissions.", scanError: "Unable to verify the pilgrim card.", close: "Close"
  },
  es: {
    language: "Idioma", eyebrow: "Acceso de peregrinos y familias", title: "Acceso a la tarjeta del peregrino", intro: "Los peregrinos pueden abrir su tarjeta personal y las familias anfitrionas consultar la información alimentaria de sus peregrinos asignados.",
    pilgrimTab: "Acceso del peregrino", hostTab: "Acceso de la familia", pilgrimAudience: "PARA PEREGRINOS", pilgrimTitle: "Abrir mi tarjeta", pilgrimIntro: "Abra el enlace enviado por correo electrónico o SMS, o introduzca abajo el enlace completo o el código del barcode.",
    cardInfo: "Información de la tarjeta", cardInfoText: "Número, nombre, nombre bautismal, código y guía alimentaria", secureAccess: "Acceso seguro", secureAccessText: "Cada tarjeta utiliza un código privado y una fecha de caducidad. No se puede buscar solo por nombre.",
    cardInput: "Enlace o código de acceso", cardPlaceholder: "https://.../pilgrim/card#código", invalidCard: "Compruebe el enlace o código enviado por el administrador.", cardError: "No se pudo abrir la tarjeta. Compruebe el enlace o código.", cardBusy: "Comprobando", openCard: "Abrir mi tarjeta",
    hostAudience: "PARA FAMILIAS ANFITRIONAS", hostTitle: "Acceso de la familia anfitriona", hostIntro: "Verifíquese con los datos de la solicitud. Tras la aprobación, solo podrá consultar a los peregrinos asignados a su familia.", receiptAuth: "Verificación de solicitud", receiptAuthText: "Nombre, teléfono y PIN de 4 dígitos", assignedCheck: "Comprobar asignación", assignedCheckText: "Escanee el código para revisar dieta y alergias",
    hostName: "Nombre del representante", hostNamePlaceholder: "Nombre completo", phone: "Teléfono", phonePlaceholder: "+82 10-0000-0000", pin: "PIN de 4 dígitos", pinPlaceholder: "4 dígitos", hostLoginError: "La verificación falló. Compruebe los datos.", authBusy: "Accediendo", hostLogin: "Acceder",
    hostSuffix: "Familia anfitriona", hostConfirmed: "Sesión iniciada con una solicitud aprobada.", hostPending: "Su solicitud está pendiente de aprobación.", logout: "Salir", approvalTitle: "Disponible tras la aprobación", approvalText: "Un administrador actualizará la solicitud después de revisarla.", displayLanguage: "Idioma",
    cameraRequest: "Solicitando permiso para la cámara.", cameraAim: "Centre el código del peregrino en la pantalla.", cameraDenied: "El acceso a la cámara está bloqueado. Permítalo en la configuración del navegador.", cameraMissing: "No se encontró una cámara disponible.", cameraBusy: "Otra aplicación está usando la cámara.", cameraUnavailable: "No se pudo iniciar la cámara. Compruebe HTTPS y los permisos.", scanError: "No se pudo verificar la tarjeta.", close: "Cerrar"
  },
  it: {
    language: "Lingua", eyebrow: "Accesso pellegrini e famiglie", title: "Accesso alla carta del pellegrino", intro: "I pellegrini possono aprire la propria carta; le famiglie ospitanti possono vedere le informazioni alimentari dei pellegrini assegnati.",
    pilgrimTab: "Accesso pellegrino", hostTab: "Accesso famiglia", pilgrimAudience: "PER I PELLEGRINI", pilgrimTitle: "Apri la mia carta", pilgrimIntro: "Apri il link ricevuto via e-mail o SMS, oppure inserisci qui sotto il link completo o il codice del barcode.",
    cardInfo: "Informazioni sulla carta", cardInfoText: "Numero, nome, nome di battesimo, codice e guida alimentare", secureAccess: "Accesso sicuro", secureAccessText: "Ogni carta usa un codice privato e una scadenza. Non è possibile cercarla solo per nome.",
    cardInput: "Link o codice di accesso", cardPlaceholder: "https://.../pilgrim/card#codice", invalidCard: "Controlla il link o il codice inviato dall'amministratore.", cardError: "Impossibile aprire la carta. Controlla il link o il codice.", cardBusy: "Verifica in corso", openCard: "Apri la mia carta",
    hostAudience: "PER LE FAMIGLIE OSPITANTI", hostTitle: "Accesso famiglia ospitante", hostIntro: "Verifica i dati inseriti nella domanda. Dopo l'approvazione potrai vedere solo i pellegrini assegnati alla tua famiglia.", receiptAuth: "Verifica domanda", receiptAuthText: "Nome, telefono e PIN di 4 cifre", assignedCheck: "Verifica assegnazione", assignedCheckText: "Scansiona il codice per controllare dieta e allergie",
    hostName: "Nome del rappresentante", hostNamePlaceholder: "Nome completo", phone: "Telefono", phonePlaceholder: "+82 10-0000-0000", pin: "PIN domanda di 4 cifre", pinPlaceholder: "4 cifre", hostLoginError: "Verifica non riuscita. Controlla i dati.", authBusy: "Accesso in corso", hostLogin: "Accedi",
    hostSuffix: "Famiglia ospitante", hostConfirmed: "Accesso effettuato con una domanda approvata.", hostPending: "La domanda è in attesa di approvazione.", logout: "Esci", approvalTitle: "Disponibile dopo l'approvazione", approvalText: "Un amministratore aggiornerà la domanda dopo la verifica.", displayLanguage: "Lingua di visualizzazione",
    cameraRequest: "Richiesta del permesso per la fotocamera.", cameraAim: "Posiziona il codice del pellegrino al centro.", cameraDenied: "Accesso alla fotocamera bloccato. Abilitalo nelle impostazioni del browser.", cameraMissing: "Nessuna fotocamera disponibile.", cameraBusy: "Un'altra app sta usando la fotocamera.", cameraUnavailable: "Impossibile avviare la fotocamera. Controlla HTTPS e permessi.", scanError: "Impossibile verificare la carta.", close: "Chiudi"
  },
  fr: {
    language: "Langue", eyebrow: "Accès pèlerins et familles", title: "Accès à la carte du pèlerin", intro: "Les pèlerins peuvent ouvrir leur carte personnelle et les familles d'accueil consulter les informations alimentaires de leurs pèlerins assignés.",
    pilgrimTab: "Accès pèlerin", hostTab: "Accès famille", pilgrimAudience: "POUR LES PÈLERINS", pilgrimTitle: "Ouvrir ma carte", pilgrimIntro: "Ouvrez le lien reçu par e-mail ou SMS, ou saisissez ci-dessous le lien complet ou le code du barcode.",
    cardInfo: "Informations de la carte", cardInfoText: "Numéro, nom, nom de baptême, code et guide alimentaire", secureAccess: "Accès sécurisé", secureAccessText: "Chaque carte utilise un code privé et une date d'expiration. Une recherche par nom seul est impossible.",
    cardInput: "Lien ou code d'accès", cardPlaceholder: "https://.../pilgrim/card#code", invalidCard: "Vérifiez le lien ou le code envoyé par l'administrateur.", cardError: "Impossible d'ouvrir la carte. Vérifiez le lien ou le code.", cardBusy: "Vérification", openCard: "Ouvrir ma carte",
    hostAudience: "POUR LES FAMILLES D'ACCUEIL", hostTitle: "Accès famille d'accueil", hostIntro: "Vérifiez les informations de la demande. Après approbation, seuls les pèlerins assignés à votre famille seront visibles.", receiptAuth: "Vérification de la demande", receiptAuthText: "Nom, téléphone et code PIN à 4 chiffres", assignedCheck: "Vérifier l'affectation", assignedCheckText: "Scannez le code pour consulter le régime et les allergies",
    hostName: "Nom du représentant", hostNamePlaceholder: "Nom complet", phone: "Téléphone", phonePlaceholder: "+82 10-0000-0000", pin: "Code PIN à 4 chiffres", pinPlaceholder: "4 chiffres", hostLoginError: "Échec de la vérification. Vérifiez les informations.", authBusy: "Connexion", hostLogin: "Se connecter",
    hostSuffix: "Famille d'accueil", hostConfirmed: "Connexion avec une demande approuvée.", hostPending: "Votre demande est en attente d'approbation.", logout: "Se déconnecter", approvalTitle: "Disponible après approbation", approvalText: "Un administrateur mettra à jour la demande après vérification.", displayLanguage: "Langue d'affichage",
    cameraRequest: "Demande d'autorisation de la caméra.", cameraAim: "Placez le code du pèlerin au centre de l'écran.", cameraDenied: "L'accès à la caméra est bloqué. Autorisez-le dans les paramètres du navigateur.", cameraMissing: "Aucune caméra disponible.", cameraBusy: "Une autre application utilise la caméra.", cameraUnavailable: "Impossible de démarrer la caméra. Vérifiez HTTPS et les autorisations.", scanError: "Impossible de vérifier la carte.", close: "Fermer"
  },
  pt: {
    language: "Idioma", eyebrow: "Acesso de peregrinos e famílias", title: "Acesso ao cartão do peregrino", intro: "Os peregrinos podem abrir o seu cartão e as famílias anfitriãs consultar as informações alimentares dos peregrinos atribuídos.",
    pilgrimTab: "Acesso do peregrino", hostTab: "Acesso da família", pilgrimAudience: "PARA PEREGRINOS", pilgrimTitle: "Abrir o meu cartão", pilgrimIntro: "Abra o link recebido por e-mail ou SMS, ou introduza abaixo o link completo ou o código do barcode.",
    cardInfo: "Informações do cartão", cardInfoText: "Número, nome, nome de batismo, código e guia alimentar", secureAccess: "Acesso seguro", secureAccessText: "Cada cartão utiliza um código privado e uma data de validade. Não é possível pesquisar apenas pelo nome.",
    cardInput: "Link ou código de acesso", cardPlaceholder: "https://.../pilgrim/card#código", invalidCard: "Verifique o link ou código enviado pelo administrador.", cardError: "Não foi possível abrir o cartão. Verifique o link ou código.", cardBusy: "A verificar", openCard: "Abrir o meu cartão",
    hostAudience: "PARA FAMÍLIAS ANFITRIÃS", hostTitle: "Acesso da família anfitriã", hostIntro: "Verifique os dados da candidatura. Após a aprovação, apenas os peregrinos atribuídos à sua família ficarão visíveis.", receiptAuth: "Verificação da candidatura", receiptAuthText: "Nome, telefone e PIN de 4 dígitos", assignedCheck: "Verificar atribuição", assignedCheckText: "Digitalize o código para consultar dieta e alergias",
    hostName: "Nome do representante", hostNamePlaceholder: "Nome completo", phone: "Telefone", phonePlaceholder: "+82 10-0000-0000", pin: "PIN de 4 dígitos", pinPlaceholder: "4 dígitos", hostLoginError: "A verificação falhou. Confirme os dados.", authBusy: "A entrar", hostLogin: "Entrar",
    hostSuffix: "Família anfitriã", hostConfirmed: "Sessão iniciada com uma candidatura aprovada.", hostPending: "A sua candidatura aguarda aprovação.", logout: "Sair", approvalTitle: "Disponível após aprovação", approvalText: "Um administrador atualizará a candidatura após a revisão.", displayLanguage: "Idioma de apresentação",
    cameraRequest: "A pedir autorização para a câmara.", cameraAim: "Coloque o código do peregrino no centro do ecrã.", cameraDenied: "O acesso à câmara está bloqueado. Autorize-o nas definições do navegador.", cameraMissing: "Não foi encontrada uma câmara disponível.", cameraBusy: "Outra aplicação está a utilizar a câmara.", cameraUnavailable: "Não foi possível iniciar a câmara. Verifique HTTPS e permissões.", scanError: "Não foi possível verificar o cartão.", close: "Fechar"
  }
};
