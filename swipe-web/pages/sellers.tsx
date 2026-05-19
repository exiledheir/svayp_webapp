import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, Search as SearchIcon, X, MapPin } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { getSellers } from '@/lib/api';
import type { SellerInfo } from '@/types';

export default function SellersPage() {
  const router = useRouter();
  const [sellers, setSellers] = useState<SellerInfo[]>([]);
  const [filtered, setFiltered] = useState<SellerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const PAGE = 50;

  const load = useCallback(async (s: number, append = false) => {
    try {
      const res = await getSellers(s, PAGE);
      setSellers((prev) => {
        const next = append ? [...prev, ...res] : res;
        setFiltered(next);
        return next;
      });
      setHasMore(res.length === PAGE);
    } catch {
      setError('Failed to load shops');
    }
  }, []);

  useEffect(() => {
    load(0).finally(() => setLoading(false));
  }, [load]);

  // Local filter
  useEffect(() => {
    const q = query.toLowerCase().trim();
    setFiltered(q ? sellers.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.description?.toLowerCase().includes(q) ?? false) ||
      (s.primaryAddress?.toLowerCase().includes(q) ?? false)
    ) : sellers);
  }, [query, sellers]);

  function handleScroll(e: React.UIEvent<HTMLElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300 && !loadingMore && hasMore && !query) {
      setLoadingMore(true);
      const next = skip + PAGE;
      load(next, true).finally(() => { setSkip(next); setLoadingMore(false); });
    }
  }

  return (
    <div className="phone-container flex flex-col" style={{ height: '100dvh', background: '#F7F7F8' }}>

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
          <span className="flex-1 text-[19px] font-bold tracking-[-0.5px]">Shops</span>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="shrink-0 px-4" style={{ paddingTop: 80, paddingBottom: 12 }}>
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ background: 'white', borderRadius: 22, border: '1px solid rgba(0,0,0,0.10)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <SearchIcon size={16} color="rgba(0,0,0,0.4)" />
          <input
            type="search"
            placeholder="Search shops…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear">
              <X size={14} color="rgba(0,0,0,0.4)" />
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <main className="flex-1 overflow-y-auto pb-nav" onScroll={handleScroll}>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 px-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl" style={{ height: 170, background: 'rgba(0,0,0,0.06)' }} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: 'rgba(0,0,0,0.45)' }}>
            <p className="text-sm">{error}</p>
            <button className="text-xs underline" onClick={() => { setError(''); load(0).finally(() => setLoading(false)); }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-[13px]" style={{ color: 'rgba(0,0,0,0.4)' }}>
            {query ? `No shops matching "${query}"` : 'No shops found'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            {filtered.map((s) => <SellerCard key={s.id} seller={s} />)}
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

function SellerCard({ seller }: { seller: SellerInfo }) {
  const router = useRouter();
  const initial = seller.name?.[0]?.toUpperCase() ?? '?';

  return (
    <div
      className="flex flex-col items-center p-4 cursor-pointer"
      style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      onClick={() => router.push(`/seller/${seller.id}`)}
    >
      {/* Avatar */}
      {seller.logoImg ? (
        <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 relative">
          <Image src={seller.logoImg} alt={seller.name} fill sizes="64px" className="object-cover" unoptimized />
        </div>
      ) : (
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-[24px] font-bold"
          style={{ background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.5)' }}
        >
          {initial}
        </div>
      )}

      <div className="mt-3 w-full text-center">
        <p className="text-[13px] font-bold leading-snug" style={{ color: '#000', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {seller.name}
        </p>

        {(seller.productCount ?? 0) > 0 && (
          <p className="text-[11px] mt-1" style={{ color: 'rgba(0,0,0,0.45)' }}>
            {seller.productCount} products
          </p>
        )}

        {seller.primaryAddress && (
          <div className="flex items-center justify-center gap-0.5 mt-1.5">
            <MapPin size={10} color="rgba(0,0,0,0.4)" />
            <p className="text-[10px] truncate" style={{ color: 'rgba(0,0,0,0.4)', maxWidth: '90%' }}>
              {seller.primaryAddress}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
