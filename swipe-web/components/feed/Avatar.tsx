import { needsUnoptimized } from '@/lib/img';
import React from 'react';
import Image from 'next/image';
import { getInitials } from '@/lib/feed-format';

interface Props {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

/** Round avatar with an initials fallback (mockup uses pink initials, e.g. "MA"). */
export default function Avatar({ url, name, size = 36, className = '' }: Props) {
  const dim = { width: size, height: size };
  if (url) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-full ${className}`}
        style={{ ...dim, background: '#F7F7F8' }}
      >
        <Image src={url} alt={name ?? ''} fill sizes={`${size}px`} className="object-cover" unoptimized={needsUnoptimized(url)} />
      </div>
    );
  }
  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-bold ${className}`}
      style={{ ...dim, background: '#FBE3EF', color: '#F370A7', fontSize: Math.round(size * 0.38) }}
    >
      {getInitials(name)}
    </div>
  );
}
