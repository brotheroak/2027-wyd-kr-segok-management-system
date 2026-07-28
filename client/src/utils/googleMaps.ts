let configPromise: Promise<{ googleMapsApiKey: string }> | null = null;
let mapsPromise: Promise<any> | null = null;

declare global {
  interface Window {
    google?: any;
    __wydGoogleMapsReady?: () => void;
  }
}

async function mapConfig() {
  configPromise ??= fetch("/api/public/map-config")
    .then(async (response) => {
      if (!response.ok) throw new Error("지도 설정을 불러오지 못했습니다.");
      return response.json() as Promise<{ googleMapsApiKey: string }>;
    });
  return configPromise;
}

export async function loadGoogleMaps() {
  if (window.google?.maps) return window.google.maps;
  if (mapsPromise) return mapsPromise;
  mapsPromise = (async () => {
    const { googleMapsApiKey } = await mapConfig();
    if (!googleMapsApiKey) {
      throw new Error("Google 지도 API 키가 설정되지 않았습니다. 현재 위치 지정은 계속 사용할 수 있습니다.");
    }
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Google 지도를 불러오지 못했습니다.")), { once: true });
        return;
      }
      window.__wydGoogleMapsReady = () => resolve();
      const script = document.createElement("script");
      script.async = true;
      script.dataset.googleMaps = "true";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&loading=async&libraries=marker&language=ko&region=KR&callback=__wydGoogleMapsReady`;
      script.onerror = () => reject(new Error("Google 지도를 불러오지 못했습니다."));
      document.head.appendChild(script);
    });
    if (!window.google?.maps) throw new Error("Google 지도 초기화에 실패했습니다.");
    return window.google.maps;
  })().catch((error) => {
    mapsPromise = null;
    throw error;
  });
  return mapsPromise;
}

export async function geocodeGoogleAddress(address: string) {
  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();
  const response = await geocoder.geocode({ address, region: "KR" });
  const result = response.results?.[0];
  if (!result) throw new Error("Google 지도에서 주소 좌표를 찾지 못했습니다.");
  return {
    latitude: result.geometry.location.lat(),
    longitude: result.geometry.location.lng(),
    formattedAddress: result.formatted_address as string
  };
}

export async function reverseGeocodeGoogleLocation(latitude: number, longitude: number) {
  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();
  const response = await geocoder.geocode({ location: { lat: latitude, lng: longitude }, region: "KR" });
  const result = response.results?.[0];
  if (!result) throw new Error("Google 지도에서 현재 위치의 주소를 찾지 못했습니다.");
  const postcodeComponent = result.address_components?.find((component: any) =>
    Array.isArray(component.types) && component.types.includes("postal_code")
  );
  return {
    address: String(result.formatted_address ?? "").replace(/^대한민국\s*/, "").trim(),
    postcode: postcodeComponent?.long_name ? String(postcodeComponent.long_name) : ""
  };
}
