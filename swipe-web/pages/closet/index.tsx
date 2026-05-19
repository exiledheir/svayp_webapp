import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Plus, Trash2 } from 'lucide-react';
import { TopBar } from '@/components/BottomNav';
import BottomNav from '@/components/BottomNav';
import { getClosetItems, deleteClosetItem, CLOSET_CATEGORIES } from '@/lib/closet-storage';
import type { ClosetItem, ClosetCategory } from '@/lib/closet-storage';

export default function ClosetPage() {
  const router = useRouter();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [filter, setFilter] = useState<ClosetCategory | 'all'>('all');

  useEffect(() => {
    setItems(getClosetItems());
  }, []);

  function handleDelete(id: string) {
    deleteClosetItem(id);
    setItems(getClosetItems());
  }

  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter);

  return (
    <div className="phone-container flex flex-col bg-white h-screen">
      <TopBar title="My Closet" showCartLiked={false} />

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 py-3 border-b border-gray-100">
        {[{ value: 'all', label: 'All' }, ...CLOSET_CATEGORIES].map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value as ClosetCategory | 'all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${filter === cat.value ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto pb-nav">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400">
            <p className="text-sm">
              {filter === 'all' ? 'Your closet is empty' : `No ${filter} items yet`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            {filtered.map((item) => (
              <div key={item.id} className="relative">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={item.imageData}
                    alt={item.category}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <button
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm"
                  onClick={() => handleDelete(item.id)}
                  aria-label="Delete"
                >
                  <Trash2 size={13} color="#666" />
                </button>
                <div className="mt-1.5 px-0.5">
                  <p className="text-[11px] text-gray-500 capitalize">{item.category}</p>
                  {item.brand && <p className="text-[12px] font-medium truncate">{item.brand}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB — Add item */}
      <button
        onClick={() => router.push('/closet/add')}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-black flex items-center justify-center shadow-lg z-50"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 12px)' }}
        aria-label="Add item"
      >
        <Plus size={24} color="white" />
      </button>

      <BottomNav />
    </div>
  );
}
