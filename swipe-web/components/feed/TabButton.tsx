import React from 'react';

/** Underlined tab (pink indicator) used by the activity page and the profile's
 *  Posts | Saved strip. */
export default function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[14px] font-semibold border-b-2 transition-colors ${
        active ? 'text-black dark:text-white' : 'text-black/40 dark:text-white/40 border-transparent'
      }`}
      style={active ? { borderColor: '#F370A7' } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}
