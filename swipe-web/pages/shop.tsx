import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { LayoutGrid, Store, ChevronRight } from 'lucide-react';
import BottomNav, { TopBar } from '@/components/BottomNav';
import ProductCard from '@/components/ProductCard';
import { getAllProducts, getTrendingProducts } from '@/lib/api';
import type { Product } from '@/types';

const CATEGORIES = [
  { label: 'Trending',    value: 'TRENDING' },
  { label: 'All',         value: 'ALL' },
  { label: 'Tops',        value: 'TOPWEAR' },
  { label: 'Bottoms',     value: 'BOTTOMWEAR' },
  { label: 'Modest Wear', value: 'ISLAMIC_MODEST_WEAR' },
  { label: 'Dresses',     value: 'DRESSES' },
  { label: 'One-Piece',   value: 'ONE_PIECE' },
  { label: 'Two-Piece',   value: 'TWO_PIECE_SET' },
  { label: 'Three-Piece', value: 'THREE_PIECE_SET' },
  { label: 'Footwear',    value: 'FOOTWEAR' },
  { label: 'Outerwear',   value: 'OUTERWEAR' },
  { label: 'Activewear',  value: 'ACTIVEWEAR' },
  { label: 'Homewear',    value: 'HOMEWEAR' },
  { label: 'Underwear',   value: 'UNDERWEAR' },
  { label: 'Accessories', value: 'ACCESSORIES' },
];

export default function ShopPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [catIdx, setCatIdx] = useState(0);          // 0=Trending, 1=All, 2-14=category
  const [showCatSheet, setShowCatSheet] = useState(false);
  const pageRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const catIdxRef = useRef(0);


  const fetchProducts = useCallback(async (pageNum: number, idx: number, append = false) => {
    try {
      let res: Product[];
      if (idx === 0) {
        res = await getTrendingProducts(pageNum * 20, 20);
      } else {
        const cat = idx >= 2 ? CATEGORIES[idx].value : undefined;
        const { products: r } = await getAllProducts(pageNum, 20, undefined, cat);
        res = r;
      }
      if (res.length === 0) {
        setHasMore(false);
        if (!append) setProducts([]);
      } else {
        setProducts((prev) => append ? [...prev, ...res] : res);
        setHasMore(res.length === 20);
      }
    } catch {
      setError('Failed to load products');
    }
  }, []);

  useEffect(() => {
    catIdxRef.current = catIdx;
    pageRef.current = 0;
    loadingMoreRef.current = false;
    setLoading(true);
    setHasMore(true);
    setError('');
    fetchProducts(0, catIdx).finally(() => setLoading(false));
  }, [catIdx, fetchProducts]);

  function handleScroll(e: React.UIEvent<HTMLElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300 && !loadingMoreRef.current && hasMore) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      const next = pageRef.current + 1;
      pageRef.current = next;
      fetchProducts(next, catIdxRef.current, true)
        .finally(() => { loadingMoreRef.current = false; setLoadingMore(false); });
    }
  }

  const isCatActive = catIdx >= 2;
  const catLabel = CATEGORIES[catIdx]?.label ?? 'Categories';

  return (
    <div className="phone-container flex flex-col bg-white" style={{ height: '100dvh' }}>

      {/* ── Glass top bar ── */}
      <TopBar title="Shop" />

      {/* ── Filter row — matches Flutter _buildFilterRow ── */}
      <div className="shrink-0 px-4" style={{ paddingTop: 80, paddingBottom: 12 }}>
        <div className="flex gap-2.5">
          {/* Categories pill */}
          <button
            className="flex-1 h-11 flex items-center gap-1.5 px-3.5"
            style={{
              background: isCatActive ? '#000' : 'white',
              borderRadius: 22,
              border: isCatActive ? '1px solid transparent' : '1px solid rgba(0,0,0,0.13)',
            }}
            onClick={() => setShowCatSheet(true)}
          >
            <LayoutGrid size={15} strokeWidth={1.8} color={isCatActive ? 'white' : '#000'} />
            <span className="flex-1 text-left text-[13px] font-semibold truncate" style={{ color: isCatActive ? 'white' : '#000' }}>
              {catLabel}
            </span>
            <ChevronRight size={16} strokeWidth={1.8} color={isCatActive ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.35)'} />
          </button>

          {/* Shops pill */}
          <button
            className="flex-1 h-11 flex items-center gap-1.5 px-3.5"
            style={{ background: 'white', borderRadius: 22, border: '1px solid rgba(0,0,0,0.13)' }}
            onClick={() => router.push('/sellers')}
          >
            <Store size={15} strokeWidth={1.8} color="#000" />
            <span className="flex-1 text-left text-[13px] font-semibold" style={{ color: '#000' }}>Shops</span>
            <ChevronRight size={16} strokeWidth={1.8} color="rgba(0,0,0,0.35)" />
          </button>
        </div>

        {/* Inline search — toggled by top bar icon */}

      </div>

      {/* ── Product grid ── */}
      <main className="flex-1 overflow-y-auto pb-nav" onScroll={handleScroll}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 rounded-full border-[2.5px] border-black border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: 'rgba(0,0,0,0.45)' }}>
            <p className="text-sm">{error}</p>
            <button className="text-xs underline" onClick={() => setError('')}>Reset</button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-[13px]" style={{ color: 'rgba(0,0,0,0.4)' }}>
            No products found
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 rounded-full border-2 border-black border-t-transparent animate-spin" />
          </div>
        )}
      </main>

      {/* ── Category picker bottom sheet ── */}
      {showCatSheet && (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowCatSheet(false)}
        >
          <div
            className="px-5 pt-4 pb-8 overflow-y-auto"
            style={{ background: 'white', borderRadius: '24px 24px 0 0', maxHeight: '70vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(0,0,0,0.13)' }} />
            <h2 className="text-[16px] font-bold mb-3">Categories</h2>
            <div className="flex flex-col">
              {CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.value}
                  className="flex items-center justify-between py-3 px-2 rounded-xl"
                  style={{ background: catIdx === idx ? 'rgba(0,0,0,0.05)' : 'transparent' }}
                  onClick={() => { setCatIdx(idx); setShowCatSheet(false); }}
                >
                  <span className="text-[14px]" style={{ fontWeight: catIdx === idx ? 700 : 500, color: catIdx === idx ? '#000' : 'rgba(0,0,0,0.7)' }}>
                    {cat.label}
                  </span>
                  {catIdx === idx && <div className="w-2 h-2 rounded-full" style={{ background: '#000' }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
