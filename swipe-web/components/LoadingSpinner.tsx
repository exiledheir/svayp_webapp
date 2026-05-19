import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'w-5 h-5 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-[3px]' };

export default function LoadingSpinner({ size = 'md' }: Props) {
  return (
    <div
      className={`${sizeMap[size]} rounded-full border-black border-t-transparent animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function FullPageLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
      <LoadingSpinner size="lg" />
    </div>
  );
}
