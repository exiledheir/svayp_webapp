import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  showBottomNav?: boolean;
}

export default function Layout({
  children,
  title,
  showBack = false,
  showBottomNav = false,
}: LayoutProps) {
  const router = useRouter();

  return (
    <div className="phone-container flex flex-col bg-white">
      {/* Header */}
      {(title || showBack) && (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-14 flex items-center gap-3 px-4">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center -ml-1"
              aria-label="Back"
            >
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
          )}
          {title && (
            <h1 className="text-base font-semibold tracking-tight truncate">{title}</h1>
          )}
        </header>
      )}

      {/* Scrollable content */}
      <main className={`flex-1 overflow-y-auto ${showBottomNav ? 'pb-nav' : 'pb-4'}`}>
        {children}
      </main>

      {showBottomNav && <BottomNav />}
    </div>
  );
}
