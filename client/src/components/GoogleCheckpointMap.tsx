import React, { useEffect, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import { loadGoogleMaps } from "../utils/googleMaps.js";

const SEGOK_CENTER = { latitude: 37.4664, longitude: 127.1076 };

export function GoogleCheckpointMap({
  latitude,
  longitude,
  onChange
}: {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const [error, setError] = useState("");
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;
    let active = true;
    let marker: any;
    let map: any;
    const center = Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { lat: latitude, lng: longitude }
      : { lat: SEGOK_CENTER.latitude, lng: SEGOK_CENTER.longitude };

    void loadGoogleMaps()
      .then((maps) => {
        if (!active || !containerRef.current) return;
        map = new maps.Map(containerRef.current, {
          center,
          zoom: Number.isFinite(latitude) ? 17 : 14,
          mapId: "DEMO_MAP_ID",
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false
        });
        marker = new maps.marker.AdvancedMarkerElement({
          map,
          position: center,
          gmpDraggable: true,
          title: "출석 체크 지점"
        });
        marker.addListener("dragend", () => {
          const position = marker.position;
          const lat = typeof position?.lat === "function" ? position.lat() : Number(position?.lat);
          const lng = typeof position?.lng === "function" ? position.lng() : Number(position?.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) onChangeRef.current(lat, lng);
        });
        map.addListener("click", (event: any) => {
          const lat = event.latLng?.lat();
          const lng = event.latLng?.lng();
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          marker.position = { lat, lng };
          onChangeRef.current(lat, lng);
        });
      })
      .catch((reason) => {
        if (active) setError((reason as Error).message);
      });
    return () => {
      active = false;
      if (marker) marker.map = null;
      map = null;
    };
  }, [latitude, longitude]);

  if (error) {
    return (
      <div className="google-map-fallback">
        <MapPinned />
        <strong>Google 지도 미리보기를 사용할 수 없습니다.</strong>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="google-checkpoint-map-wrap">
      <div ref={containerRef} className="google-checkpoint-map" aria-label="체크 지점 Google 지도" />
      <p>지도를 클릭하거나 핀을 움직여 체크 지점 좌표를 보정할 수 있습니다.</p>
    </div>
  );
}
