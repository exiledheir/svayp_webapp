import React, { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, MapPin, Phone, Store } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import ProductCard from '@/components/ProductCard';
import { getSellerInfo, getSellerProducts } from '@/lib/api';
import type { SellerInfo, SellerLocation } from '@/types';
import type { Product } from '@/types';

export default function SellerProfilePage() {
  const router = useRouter();
  const { id } = router.query as { id: string };

  const [info, setInfo] = useState<SellerInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadingMoreRef = useRef(false);
  const [mapSheetLoc, setMapSheetLoc] = useState<SellerLocation | null>(null);
  const PAGE = 20;

  const loadProducts = useCallback(async (s: number, append = false) => {
    const { products: res, total: t } = await getSellerProducts(id, s, PAGE);
    if (t > 0) setTotal(t);
    setProducts((prev) => append ? [...prev, ...res] : res);
    // When total is unknown (t===0), fall back to: got a full page → maybe more
    setHasMore(t > 0 ? (s + res.length < t) : res.length === PAGE);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getSellerInfo(id).then(setInfo).catch(() => {}),
      loadProducts(0),
    ]).finally(() => setLoading(false));
  }, [id, loadProducts]);

  function handleScroll(e: React.UIEvent<HTMLElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 400 && !loadingMoreRef.current && hasMore) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      // Derive skip from current products length to avoid stale closure issues
      setProducts((prev) => {
        const currentSkip = prev.length;
        getSellerProducts(id, currentSkip, PAGE)
          .then(({ products: res, total: t }) => {
            if (t > 0) setTotal(t);
            setProducts((p) => [...p, ...res]);
            setHasMore(t > 0 ? (currentSkip + res.length < t) : res.length === PAGE);
          })
          .finally(() => { loadingMoreRef.current = false; setLoadingMore(false); });
        return prev;
      });
    }
  }

  const initial = info?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="phone-container flex flex-col bg-white" style={{ height: '100dvh' }}>

      {/* ── Map picker sheet — rendered at phone-container level for correct overlay ── */}
      {mapSheetLoc && (
        <MapSheet loc={mapSheetLoc} onClose={() => setMapSheetLoc(null)} />
      )}

      {/* ── Glass top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-50 px-4 pt-2 pb-1 pointer-events-none">
        <div
          className="flex items-center gap-1 px-2 py-2.5 pointer-events-auto"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 22,
            border: '0.5px solid rgba(0,0,0,0.16)',
          }}
        >
          <button
            className="w-10 h-10 flex items-center justify-center shrink-0"
            onClick={() => router.back()}
            aria-label="Back"
          >
            <ArrowLeft size={20} strokeWidth={1.8} />
          </button>
          <span className="flex-1 text-[17px] font-bold tracking-[-0.4px] truncate">
            {info?.name ?? ''}
          </span>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pb-nav" style={{ paddingTop: 76 }} onScroll={handleScroll}>

        {/* ── Profile header ── */}
        <div className="flex flex-col items-center px-5 py-6" style={{ background: 'white' }}>
          {/* Avatar */}
          {info?.logoImg ? (
            <div
              className="w-[90px] h-[90px] rounded-full overflow-hidden relative"
              style={{ border: '2px solid rgba(0,0,0,0.10)', boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}
            >
              <Image src={info.logoImg} alt={info.name} fill sizes="90px" className="object-cover" unoptimized />
            </div>
          ) : (
            <div
              className="w-[90px] h-[90px] rounded-full flex items-center justify-center text-[34px] font-bold"
              style={{ background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.45)', border: '2px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            >
              {initial}
            </div>
          )}

          {/* Name */}
          <p className="mt-3.5 text-[19px] font-bold text-center tracking-[-0.4px]" style={{ color: '#000' }}>
            {info?.name ?? ''}
          </p>

          {/* Product count chip */}
          {(info?.productCount ?? total) > 0 && (
            <div
              className="flex items-center gap-1.5 mt-4 px-5 py-2.5"
              style={{ background: '#F4F4F6', borderRadius: 24 }}
            >
              <span className="text-[15px] font-bold" style={{ color: '#000' }}>
                {info?.productCount ?? total}
              </span>
              <span className="text-[14px]" style={{ color: 'rgba(0,0,0,0.55)' }}>products</span>
            </div>
          )}
        </div>

        {/* ── About / contact section ── */}
        {(info?.description || info?.phoneNumber) && (
          <div
            className="mx-3 mt-3 p-4"
            style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.09)' }}
          >
            {info.description && (
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(0,0,0,0.65)' }}>
                {info.description}
              </p>
            )}
            {info.description && info.phoneNumber && (
              <div className="my-3" style={{ height: 1, background: 'rgba(0,0,0,0.08)' }} />
            )}
            {info.phoneNumber && (
              <a href={`tel:${info.phoneNumber}`} className="flex items-center gap-2.5">
                <Phone size={16} strokeWidth={1.8} color="rgba(0,0,0,0.5)" />
                <span className="text-[13px] underline" style={{ color: '#000' }}>{info.phoneNumber}</span>
              </a>
            )}
            {info.primaryAddress && (
              <div className="flex items-start gap-2.5 mt-2.5">
                <MapPin size={16} strokeWidth={1.8} color="rgba(0,0,0,0.5)" className="shrink-0 mt-0.5" />
                <span className="text-[13px]" style={{ color: 'rgba(0,0,0,0.65)' }}>{info.primaryAddress}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Where to buy — locations ── */}
        {(info?.locations?.length ?? 0) > 0 && (
          <div className="mt-3">
            <p className="px-4 pb-2 text-[15px] font-bold" style={{ color: '#000' }}>Where to buy</p>
            {info!.locations!.map((loc, i) => (
              <LocationCard key={i} loc={loc} onOpenMap={() => setMapSheetLoc(loc)} />
            ))}
          </div>
        )}

        {/* ── Products ── */}
        <div className="px-4 pt-5 pb-2">
          <p className="text-[15px] font-bold" style={{ color: '#000' }}>All Products</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-10 h-10 rounded-full border-[2.5px] border-black border-t-transparent animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-[13px]" style={{ color: 'rgba(0,0,0,0.4)' }}>
            No products yet
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 rounded-full border-2 border-black border-t-transparent animate-spin" />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function MapSheet({ loc, onClose }: { loc: SellerLocation; onClose: () => void }) {
  const hasCoords = loc.latitude != null && loc.longitude != null;

  function googleUrl() {
    if (hasCoords) return `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address ?? '')}`;
  }
  function appleUrl() {
    if (hasCoords) return `https://maps.apple.com/?ll=${loc.latitude},${loc.longitude}&q=${loc.latitude},${loc.longitude}`;
    return `https://maps.apple.com/?q=${encodeURIComponent(loc.address ?? '')}`;
  }
  function yandexUrl() {
    if (hasCoords) return `https://yandex.com/maps/?pt=${loc.longitude},${loc.latitude}&z=15&l=map`;
    return `https://yandex.com/maps/?text=${encodeURIComponent(loc.address ?? '')}`;
  }

  return (
    <div
      className="absolute inset-0 z-[100] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="px-5 pt-4 pb-8"
        style={{ background: 'white', borderRadius: '22px 22px 0 0' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(0,0,0,0.13)' }} />
        <p className="text-[15px] font-semibold mb-1">Open in Maps</p>
        {loc.address && <p className="text-[12px] mb-4 truncate" style={{ color: 'rgba(0,0,0,0.45)' }}>{loc.address}</p>}

        <a href={googleUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3.5" onClick={onClose}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
              <path fill="#4285F4" d="M45.5 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h12.1c-.5 2.7-2.1 5-4.4 6.5v5.4h7.1c4.2-3.8 6.7-9.5 6.7-15.6z"/>
              <path fill="#34A853" d="M24 46c6.1 0 11.2-2 14.9-5.4l-7.1-5.4c-2 1.3-4.5 2.1-7.8 2.1-6 0-11.1-4-12.9-9.5H3.7v5.6C7.4 41.5 15.1 46 24 46z"/>
              <path fill="#FBBC05" d="M11.1 27.8A13.9 13.9 0 0 1 11.1 20.2v-5.6H3.7A22 22 0 0 0 2 24c0 3.5.8 6.9 2.3 9.8l7.4-5.6-.6-.4z"/>
              <path fill="#EA4335" d="M24 10.1c3.4 0 6.4 1.2 8.8 3.4l6.5-6.5C35.2 3.2 30 1 24 1 15.1 1 7.4 5.5 3.7 12.4l7.4 5.6C13 12.1 18 8.1 24 8.1z"/>
            </svg>
          </div>
          <span className="text-[15px] font-medium">Google Maps</span>
        </a>
        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />

        <a href={appleUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3.5" onClick={onClose}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#1C1C1E' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
          </div>
          <span className="text-[15px] font-medium">Apple Maps</span>
        </a>
        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />

        <a href={yandexUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3.5" onClick={onClose}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FC3F1D' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M14.341 21h-2.48V13.08H10.5L6.66 21H4l4.08-8.2C6.11 12.1 4.87 10.5 4.87 8.1 4.87 5.02 6.95 3 10.44 3H14.34V21zm-2.48-9.88V5.02h-1.17c-1.97 0-3.14 1.05-3.14 3.06 0 1.94 1.05 3.04 3.06 3.04h1.25z"/>
            </svg>
          </div>
          <span className="text-[15px] font-medium">Yandex Maps</span>
        </a>
      </div>
    </div>
  );
}

function LocationCard({ loc, onOpenMap }: { loc: SellerLocation; onOpenMap: () => void }) {
  const hasPhone = loc.phoneNumber && loc.phoneNumber.length > 0;
  const hasAddress = loc.address && loc.address.length > 0;
  const canOpenMap = hasAddress || (loc.latitude != null && loc.longitude != null);
  const hasMap = loc.latitude != null && loc.longitude != null;

  return (
    <div
      className="mx-3 mb-2.5 overflow-hidden"
      style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.09)' }}
    >
      {/* Yandex Static Map preview — mirrors Flutter MapPreviewCard */}
      {hasMap && (
        <div
          className="w-full relative overflow-hidden cursor-pointer"
          style={{ height: 130, background: '#E9EAF0' }}
          onClick={() => canOpenMap && onOpenMap()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://static-maps.yandex.ru/1.x/?ll=${loc.longitude},${loc.latitude}&z=15&size=600,300&l=map&pt=${loc.longitude},${loc.latitude},pm2rdm`}
            alt="Map preview"
            className="w-full h-full object-cover pointer-events-none"
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.22))' }} />
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.65)' }}>
            <MapPin size={11} strokeWidth={2} color="white" />
            <span className="text-[11px] font-semibold" style={{ color: 'white' }}>Open map</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: 14 }}>
            <MapPin size={30} strokeWidth={2} color="#FC3F1D" fill="#FC3F1D" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }} />
          </div>
        </div>
      )}

      <div className="p-4">
        {loc.name && (
          <div className="flex items-center gap-2 mb-2">
            <Store size={14} strokeWidth={1.8} color="rgba(0,0,0,0.5)" />
            <p className="text-[13px] font-semibold" style={{ color: '#000' }}>{loc.name}</p>
            {loc.isPrimary && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#000', color: '#fff' }}>Main</span>
            )}
          </div>
        )}
        {hasAddress && (
          <button
            className="flex items-start gap-2 w-full text-left"
            onClick={() => canOpenMap && onOpenMap()}
          >
            <MapPin size={14} strokeWidth={1.8} color={canOpenMap ? '#000' : 'rgba(0,0,0,0.4)'} className="shrink-0 mt-0.5" />
            <p className="text-[13px] underline" style={{ color: '#000' }}>{loc.address}</p>
          </button>
        )}
        {hasPhone && (
          <a href={`tel:${loc.phoneNumber}`} className="flex items-center gap-2 mt-2">
            <Phone size={14} strokeWidth={1.8} color="rgba(0,0,0,0.4)" />
            <span className="text-[13px] underline" style={{ color: '#000' }}>{loc.phoneNumber}</span>
          </a>
        )}
      </div>
    </div>
  );
}
