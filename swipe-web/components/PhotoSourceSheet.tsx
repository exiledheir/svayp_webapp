import React from 'react';
import { Camera, ImageIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Props {
  /** Pick from the photo library / gallery. */
  onGallery: () => void;
  /** Take a new photo with the camera. */
  onCamera: () => void;
  /** Dismiss the sheet (tap on the scrim). */
  onClose: () => void;
  /**
   * `absolute` when the sheet lives inside a phone-sized container (market
   * wizard); `fixed` when it overlays the whole page (closet FAB).
   */
  position?: 'fixed' | 'absolute';
}

/**
 * Bottom-sheet for choosing a photo source (gallery or camera). Shared by the
 * market create wizard and the closet add flow so the "Add photo" popup looks
 * and behaves identically everywhere.
 */
export default function PhotoSourceSheet({ onGallery, onCamera, onClose, position = 'absolute' }: Props) {
  const { t } = useI18n();

  return (
    <div
      className={`${position} inset-0 z-[70] flex flex-col justify-end`}
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="px-5 pt-4 pb-6 bg-white dark:bg-[#1c1c1e]"
        style={{ borderRadius: '24px 24px 0 0', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(128,128,128,0.4)' }} />
        <button
          onClick={onGallery}
          className="w-full flex items-center gap-3 py-3.5 text-[15px] font-semibold text-black dark:text-white"
        >
          <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#F370A7' }}>
            <ImageIcon size={18} color="white" />
          </span>
          {t.mk_photos_from_gallery}
        </button>
        <button
          onClick={onCamera}
          className="w-full flex items-center gap-3 py-3.5 text-[15px] font-semibold text-black dark:text-white"
        >
          <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#111' }}>
            <Camera size={18} color="white" />
          </span>
          {t.mk_photos_from_camera}
        </button>
      </div>
    </div>
  );
}
