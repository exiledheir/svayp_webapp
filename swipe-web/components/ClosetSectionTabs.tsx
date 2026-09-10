import React from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { isShellTab } from '@/lib/flutter-bridge';

export type ClosetSectionTab = 'boards' | 'outfits' | 'calendar' | 'feed';

// Segmented control shared by the Closet outfit section and the Feed page so the
// sub-tabs (Boards · Outfits · Calendar · Feed) stay visible on both. On the
// Closet page pass `onLocalSelect` — boards/outfits/calendar then switch the tab
// in place while Feed routes to /feed. On the Feed page omit `onLocalSelect`: the
// three closet tabs route back to /closet?tab=… and Feed is the active no-op.
// (`dressme` is accepted for the retired tab so nothing highlights when it's set.)
//
// Inside the new native shell the Feed has its own bottom-bar tab, so the Feed
// pill is dropped there: it would steer the CLOSET WebView to /feed instead of
// switching tabs. Browsers and old app builds keep it (see isShellTab).
export default function ClosetSectionTabs({
  active,
  onLocalSelect,
  className = 'px-4 mb-3.5',
}: {
  active: 'boards' | 'outfits' | 'calendar' | 'feed' | 'dressme';
  onLocalSelect?: (tab: 'boards' | 'outfits' | 'calendar') => void;
  className?: string;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useI18n();
  // Resolved after mount so the server-rendered markup (4 pills) hydrates cleanly.
  const [shellTab, setShellTab] = React.useState(false);
  React.useEffect(() => { setShellTab(isShellTab()); }, []);

  const tabs: ReadonlyArray<readonly [ClosetSectionTab, string]> = [
    ['boards', t.tabBoards],
    ['outfits', t.tabOutfits],
    ['calendar', t.tabCalendar],
    ...(shellTab ? [] : [['feed', t.tabFeed] as const]),
  ];

  return (
    <div className={`${className} flex justify-center`}>
      <div className="inline-flex p-1 rounded-full gap-1" style={{ background: theme === 'dark' ? '#1f1f1f' : '#F1F1F3' }}>
        {tabs.map(([key, label]) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => {
                if (key === active) return;
                if (key === 'feed') { router.push('/feed'); return; }
                if (onLocalSelect) { onLocalSelect(key); return; }
                router.push(`/closet?tab=${key}`);
              }}
              className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95 whitespace-nowrap"
              style={{
                background: isActive ? (theme === 'dark' ? '#2e2e2e' : '#FFFFFF') : 'transparent',
                color: isActive ? '#F370A7' : (theme === 'dark' ? '#9ca3af' : '#6b7280'),
                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
