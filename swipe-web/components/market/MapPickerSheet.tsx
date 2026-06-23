import React, { useEffect, useRef, useState } from 'react';
import { X, LocateFixed, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

// ─── Interactive "choose location" map ───────────────────────────────────────
// A real tile-based slippy map (Leaflet) so panning and pinch / scroll / button
// zoom are smooth and native — the previous static-image approach re-downloaded
// the whole map on every move, which lagged and couldn't zoom. The chosen point
// is always the map centre, marked by a fixed pin (ride-hailing style). On
// confirm we reverse-geocode the centre to a readable address. Leaflet + open
// map tiles load from a CDN on first open (no npm dependency, no API key — the
// interactive Yandex JS API would need a paid key).

interface Props {
  open: boolean;
  initial?: { lat?: number; lon?: number };
  onPick: (lat: number, lon: number, address?: string) => void;
  onClose: () => void;
}

const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const TASHKENT: [number, number] = [41.311081, 69.240562];

type LeafletGlobal = { L?: unknown };
const getL = (): unknown => (window as unknown as LeafletGlobal).L;

function ensureLeaflet(): Promise<unknown> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (getL()) return Promise.resolve(getL());
  return new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      link.setAttribute('data-leaflet', '');
      document.head.appendChild(link);
    }
    let script = document.querySelector('script[data-leaflet]') as HTMLScriptElement | null;
    if (script) {
      if (getL()) { resolve(getL()); return; }
      script.addEventListener('load', () => resolve(getL()));
      script.addEventListener('error', () => reject(new Error('leaflet failed')));
      return;
    }
    script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.setAttribute('data-leaflet', '');
    script.addEventListener('load', () => resolve(getL()));
    script.addEventListener('error', () => reject(new Error('leaflet failed')));
    document.body.appendChild(script);
  });
}

async function reverseGeocode(lat: number, lon: number): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=ru&zoom=16`,
    );
    const data = await res.json();
    const a = (data.address ?? {}) as Record<string, string>;
    const parts = [a.road, a.suburb || a.neighbourhood || a.city_district, a.city || a.town || a.village].filter(Boolean);
    return parts.length ? parts.join(', ') : (data.display_name as string | undefined);
  } catch {
    return undefined;
  }
}

export default function MapPickerSheet({ open, initial, onPick, onClose }: Props) {
  const { t } = useI18n();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const start = initial?.lat != null && initial?.lon != null ? [initial.lat, initial.lon] as [number, number] : TASHKENT;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus('loading');
    ensureLeaflet()
      .then((L: any) => {
        if (cancelled || !mapEl.current || !L) return;
        const map = L.map(mapEl.current, {
          center: start,
          zoom: 15,
          zoomControl: true,
          attributionControl: false,
          // Smooth, native gestures.
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true,
          zoomSnap: 0,
          inertia: true,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        mapRef.current = map;
        setStatus('ready');
        // Recalculate size once the sheet has painted at full height.
        setTimeout(() => map.invalidateSize(), 60);
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function useMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        if (mapRef.current) mapRef.current.setView([p.coords.latitude, p.coords.longitude], 16, { animate: true });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function confirm() {
    if (!mapRef.current) return;
    setSaving(true);
    const c = mapRef.current.getCenter();
    const address = await reverseGeocode(c.lat, c.lng);
    setSaving(false);
    onPick(c.lat, c.lng, address);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[80] flex flex-col bg-white dark:bg-[#1c1c1e]">
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))', borderBottom: '0.5px solid rgba(128,128,128,0.18)' }}
      >
        <button onClick={onClose} aria-label="Close" className="w-10 h-10 flex items-center justify-center">
          <X size={22} className="text-black dark:text-white" />
        </button>
        <h1 className="text-[16px] font-bold text-black dark:text-white">{t.mk_loc_pick_title}</h1>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <div ref={mapEl} className="absolute inset-0" style={{ background: '#E9EDF0' }} />

        {/* Fixed centre pin — its tip marks the chosen point. */}
        {status === 'ready' && (
          <div className="absolute z-[400] pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -100%)' }}>
            <svg width="40" height="50" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))' }}>
              <path d="M17 0C7.6 0 0 7.5 0 16.8 0 29 17 42 17 42s17-13 17-25.2C34 7.5 26.4 0 17 0z" fill="#F370A7" />
              <circle cx="17" cy="16.5" r="6" fill="#fff" />
            </svg>
          </div>
        )}

        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 rounded-full border-2 border-[#F370A7] border-t-transparent animate-spin" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
            <p className="text-[14px] text-black/55 dark:text-white/55">{t.mk_loc_map_error}</p>
          </div>
        )}

        {/* Current-location button */}
        <button
          onClick={useMyLocation}
          className="absolute right-4 bottom-4 z-[450] w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label={t.mk_loc_use_current}
        >
          {locating ? (
            <div className="w-5 h-5 rounded-full border-2 border-[#F370A7] border-t-transparent animate-spin" />
          ) : (
            <LocateFixed size={20} className="text-[#F370A7]" />
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 pt-2 pb-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}>
        <p className="text-[12px] text-center text-black/45 dark:text-white/45 mb-2">{t.mk_loc_pick_hint}</p>
        <button
          onClick={confirm}
          disabled={saving || status === 'error'}
          className="w-full py-4 rounded-2xl text-white font-semibold text-base active:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#F370A7' }}
        >
          {saving ? (
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <>
              <Check size={18} strokeWidth={2.5} />
              {t.mk_loc_map_confirm}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
