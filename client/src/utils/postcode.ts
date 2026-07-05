declare global {
  interface Window {
    kakao?: {
      Postcode: new (options: any) => any;
    };
    daum?: {
      Postcode: new (options: any) => any;
    };
  }
}

function getPostcodeConstructor() {
  return window.kakao?.Postcode ?? window.daum?.Postcode;
}

function loadPostcodeScript() {
  if (getPostcodeConstructor()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-kakao-postcode]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("주소 검색 스크립트를 불러오지 못했습니다.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.dataset.kakaoPostcode = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("주소 검색 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

function selectedPostcodeAddress(data: any) {
  const baseAddress = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
  let extraAddress = "";
  if (data.userSelectedType === "R") {
    if (data.bname && /[동로가]$/.test(data.bname)) extraAddress += data.bname;
    if (data.buildingName && data.apartment === "Y") {
      extraAddress += extraAddress ? `, ${data.buildingName}` : data.buildingName;
    }
  }
  return extraAddress ? `${baseAddress} (${extraAddress})` : baseAddress || data.address;
}

export async function openKakaoPostcode({
  onComplete,
  fallbackAddress,
  detailInputId
}: {
  onComplete: (postcode: string, address: string) => void;
  fallbackAddress: string;
  detailInputId: string;
}) {
  try {
    await loadPostcodeScript();
    const Postcode = getPostcodeConstructor();
    if (!Postcode) throw new Error("주소 검색 서비스를 사용할 수 없습니다.");

    document.querySelector(".postcode-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.className = "postcode-overlay";
    overlay.innerHTML = `
      <div class="postcode-dialog" role="dialog" aria-modal="true" aria-label="주소 검색">
        <div class="postcode-dialog-head">
          <strong>주소 검색</strong>
          <button type="button" class="modal-close-button" aria-label="주소 검색 닫기">닫기</button>
        </div>
        <div class="postcode-dialog-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    overlay.querySelector("button")?.addEventListener("click", close);
    const body = overlay.querySelector<HTMLElement>(".postcode-dialog-body");
    if (!body) throw new Error("주소 검색 화면을 만들지 못했습니다.");

    const postcode = new Postcode({
      width: "100%",
      height: "100%",
      oncomplete: (data: any) => {
        onComplete(data.zonecode, selectedPostcodeAddress(data));
        close();
        window.setTimeout(() => document.getElementById(detailInputId)?.focus(), 0);
      },
      onclose: close
    });
    if (postcode.embed) {
      postcode.embed(body, { q: fallbackAddress || undefined });
    } else {
      close();
      postcode.open({ q: fallbackAddress || undefined, popupName: "wydPostcodePopup" });
    }
  } catch {
    const manual = window.prompt("주소를 입력해 주세요.", fallbackAddress);
    if (manual) onComplete("", manual);
  }
}
