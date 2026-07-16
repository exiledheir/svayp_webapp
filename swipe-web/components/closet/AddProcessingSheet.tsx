import React from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/**
 * One photo being processed in the Acloset-style batch add flow. The parent
 * (closet page) owns the array; rows stay as skeletons for the whole imitated
 * processing screen, then the parent unmounts this sheet and opens the review.
 */
export interface BatchJob {
  localId: string;
  previewImage: string;
  status: 'processing' | 'failed';
}

/**
 * Closet v2 — batch processing screen (Acloset screens 2–4). Presentational: the
 * parent passes the current job list + a single localized header describing the
 * dominant step, and gets a cancel callback. Rows are skeletons while a photo is
 * processing and reveal the detected name/category once it's ready.
 */
export default function AddProcessingSheet({
  jobs,
  headerLabel,
  dark,
  onCancel,
}: {
  jobs: BatchJob[];
  headerLabel: string;
  dark: boolean;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
  const surface = dark ? '#111111' : '#ffffff';
  const skeleton = dark ? '#2a2a2c' : '#eef0f4';
  const line = dark ? '#232325' : '#f0eef1';

  return (
    <div className="fixed inset-0 z-[62] flex flex-col" style={{ background: surface }}>
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-3">
        <button onClick={onCancel} aria-label={t.close} className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center active:scale-[0.9] transition-transform" style={{ color: ink }}>
          <X size={22} strokeWidth={2} />
        </button>
      </div>
      <div className="px-5 pb-3" style={{ borderBottom: `1px solid ${line}` }}>
        <p className="text-[16px] font-semibold" style={{ color: sub }}>{headerLabel}</p>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {jobs.map((job) => {
          const failed = job.status === 'failed';
          return (
            <div key={job.localId} className="flex items-center gap-3.5 py-3">
              {/* decorative selection square (matches Acloset) */}
              <span className="w-5 h-5 rounded-[6px] flex-none" style={{ border: `1.5px solid ${dark ? '#3a3a3c' : '#dcdce1'}` }} />
              {/* thumbnail */}
              <span className="w-[74px] h-[74px] rounded-2xl flex-none overflow-hidden flex items-center justify-center" style={{ background: skeleton, border: `1px solid ${line}` }}>
                {job.previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={job.previewImage} alt="" className="w-full h-full object-cover" style={{ opacity: 0.55 }} />
                ) : null}
              </span>
              {/* skeleton / error */}
              <div className="flex-1 min-w-0">
                {failed ? (
                  <p className="text-[13px] font-semibold" style={{ color: '#e0559a' }}>{t.cv_rv_rejected}</p>
                ) : (
                  <>
                    <div className="h-4 rounded-lg animate-pulse" style={{ background: skeleton, width: '78%' }} />
                    <div className="h-4 rounded-lg animate-pulse mt-2.5" style={{ background: skeleton, width: '52%' }} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
