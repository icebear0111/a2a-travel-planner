'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Clock } from 'lucide-react';

export interface MapStop {
  id: string;
  title: string;
  time: string;
  type: string;
  /** 타임라인 카드와 동일한 순서 번호 (1부터) */
  order: number;
  coordinate: { lat: number; lng: number };
}

interface DayRouteMapProps {
  apiKey: string;
  stops: MapStop[];
  focusedStopId: string | null;
  onStopClick: (stopId: string) => void;
}

// 활동 타입별 마커 색상 (타임라인 카드 팔레트와 동일 계열)
const PIN_COLORS: Record<string, string> = {
  hotel: '#d97706',
  sightseeing: '#10b981',
  food: '#f97316',
  shopping: '#ec4899',
  coffee: '#b45309',
  cafe: '#b45309',
  theme: '#6366f1',
  nightlife: '#4f46e5',
  etc: '#64748b',
};

const getPinColor = (type: string) => PIN_COLORS[type] || PIN_COLORS.etc;

// AdvancedMarker에는 Map ID가 필요하다. 콘솔에서 발급한 ID를 env로 주입하고,
// 없으면 개발용 DEMO_MAP_ID로 동작한다.
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

// 하루 동선 폴리라인 — vis.gl에 폴리라인 컴포넌트가 없어 직접 관리한다.
function RoutePolyline({ path }: { path: { lat: number; lng: number }[] }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        map,
        strokeColor: '#0f172a',
        strokeOpacity: 0.65,
        strokeWeight: 3,
      });
    }
    polylineRef.current.setPath(path);
  }, [map, path]);

  // 언마운트 시 지도에서 제거
  useEffect(() => {
    return () => {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
    };
  }, []);

  return null;
}

// 카메라 제어 — 하루 동선 전체 맞춤 / 포커스 장소 확대
function MapCamera({ stops, focusedStop }: { stops: MapStop[]; focusedStop?: MapStop }) {
  const map = useMap();

  useEffect(() => {
    if (!map || stops.length === 0) return;

    if (focusedStop) {
      map.panTo(focusedStop.coordinate);
      if ((map.getZoom() ?? 0) < 15) {
        map.setZoom(16);
      }
      return;
    }

    if (stops.length === 1) {
      map.setCenter(stops[0].coordinate);
      map.setZoom(15);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    stops.forEach((stop) => bounds.extend(stop.coordinate));
    map.fitBounds(bounds, 56);
  }, [map, stops, focusedStop]);

  return null;
}

export default function DayRouteMap({ apiKey, stops, focusedStopId, onStopClick }: DayRouteMapProps) {
  const focusedStop = useMemo(
    () => stops.find((stop) => stop.id === focusedStopId),
    [stops, focusedStopId]
  );
  const path = useMemo(() => stops.map((stop) => stop.coordinate), [stops]);

  return (
    <APIProvider apiKey={apiKey} language="ko">
      <Map
        mapId={GOOGLE_MAP_ID}
        defaultCenter={stops[0]?.coordinate || { lat: 35.6762, lng: 139.6503 }}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        style={{ width: '100%', height: '100%' }}
      >
        <RoutePolyline path={path} />
        <MapCamera stops={stops} focusedStop={focusedStop} />

        {stops.map((stop) => {
          const isFocused = stop.id === focusedStopId;
          return (
            <AdvancedMarker
              key={stop.id}
              position={stop.coordinate}
              onClick={() => onStopClick(stop.id)}
              zIndex={isFocused ? stops.length + 1 : stop.order}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg transition-transform duration-200 ${
                  isFocused ? 'scale-125' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: isFocused ? '#0f172a' : getPinColor(stop.type) }}
              >
                {stop.order}
              </div>
            </AdvancedMarker>
          );
        })}

        {focusedStop && (
          <InfoWindow
            position={focusedStop.coordinate}
            pixelOffset={[0, -20]}
            headerDisabled
            onCloseClick={() => onStopClick(focusedStop.id)}
          >
            <div className="px-1 py-0.5">
              <p className="text-sm font-bold text-slate-900">{focusedStop.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                {focusedStop.time}
              </p>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
