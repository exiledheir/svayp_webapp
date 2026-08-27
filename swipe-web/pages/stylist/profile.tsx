import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Loader2, Pencil, Check, X } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { getStylistStrings } from '@/lib/stylist-strings';
import {
  fetchStyleProfile,
  editStyleProfileField,
  type StyleProfile,
  type ProfileField,
} from '@/lib/stylist';

/**
 * «Мой стилевой профиль».
 *
 * Смысл экрана — показать НЕ только что Nur о тебе знает, но и откуда. Vision ошибается
 * в цветотипе и типе фигуры; человек должен видеть метку «определено по фото» и понимать,
 * что это можно поправить. Без такой правки он исправлял бы одно и то же в каждом ответе.
 */
export default function StyleProfilePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { locale } = useI18n();
  const S = getStylistStrings(locale);
  const dark = theme === 'dark';

  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStyleProfile()
      .then(setProfile)
      .catch(() => setError(S.errorGeneric))
      .finally(() => setLoading(false));
  }, []);

  const submit = useCallback(async (field: string, value: string) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await editStyleProfileField(field, value);
      setProfile(updated);
      setEditing(null);
    } catch {
      setError(S.errorSaveOutfit);
    } finally {
      setSaving(false);
    }
  }, [S]);

  const bg = dark ? '#0F0F0F' : '#FAFAF8';
  const ink = dark ? '#FAFAF8' : '#0A0A0A';
  const muted = dark ? '#9B9B9B' : '#6B6B6B';
  const card = dark ? '#1A1A1A' : '#F5F5F3';
  const line = dark ? '#2D2D2D' : '#E5E5E5';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: bg }}>
        <Loader2 size={22} className="animate-spin" style={{ color: muted }} />
      </div>
    );
  }

  const renderField = (f: ProfileField) => {
    const isEditing = editing === f.key;
    return (
      <div key={f.key} className="px-4 py-3" style={{ borderTop: `1px solid ${line}` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase" style={{ color: muted, letterSpacing: '0.5px' }}>
              {f.label}
            </p>

            {isEditing ? (
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit(f.key, draft);
                    if (e.key === 'Escape') setEditing(null);
                  }}
                  placeholder={S.profileDeleteHint}
                  className="flex-1 px-3 py-2 rounded-lg text-[14px] outline-none"
                  style={{ background: bg, color: ink, border: `1px solid ${line}` }}
                />
                <button
                  onClick={() => submit(f.key, draft)}
                  disabled={saving}
                  aria-label={S.saveOutfit}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50"
                  style={{ background: ink, color: bg }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  aria-label={S.goBack}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: card, color: muted, border: `1px solid ${line}` }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <p className="text-[15px] mt-0.5" style={{ color: f.value ? ink : muted }}>
                  {f.value ?? S.profileUnknown}
                </p>
                {/* Метка источника — ради неё экран и существует. */}
                {f.value && f.source && (
                  <p className="text-[11px] mt-0.5" style={{ color: muted }}>
                    {S.sourceLabels[f.source] ?? f.source}
                    {f.source === 'PHOTO_INFERRED' && f.confidence != null
                      ? S.confidence(Math.round(f.confidence * 100))
                      : ''}
                  </p>
                )}
              </>
            )}
          </div>

          {!isEditing && f.editable && (
            <button
              onClick={() => {
                setEditing(f.key);
                setDraft(f.value ?? '');
              }}
              aria-label={S.editField(f.label)}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
              style={{ background: card, color: muted, border: `1px solid ${line}` }}
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: bg }}>
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14"
        style={{ background: bg, borderBottom: `1px solid ${line}` }}
      >
        <button onClick={() => router.back()} aria-label={S.goBack} className="active:scale-95 transition-transform">
          <ArrowLeft size={20} style={{ color: ink }} />
        </button>
        <span className="text-[16px] font-bold" style={{ color: ink }}>
          {S.profileTitle}
        </span>
      </header>

      <main className="flex-1 px-4 py-4">
        {profile && (
          <>
            {/* Заполненность: показывает, что профиль — не анкета, а то, что растёт по ходу. */}
            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[13px]" style={{ color: muted }}>
                  {S.profileFilled}
                </span>
                <span className="text-[15px] font-bold" style={{ color: '#C8A882' }}>
                  {profile.completeness}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: card }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${profile.completeness}%`, background: '#C8A882' }}
                />
              </div>
              <p className="text-[12px] mt-2 leading-snug" style={{ color: muted }}>
                {profile.nextHint}
              </p>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: card, border: `1px solid ${line}` }}>
              <div style={{ background: bg }}>{profile.fields.map(renderField)}</div>
            </div>

            <p className="text-[11px] mt-3 leading-snug px-1" style={{ color: muted }}>
              {S.profileEditHint}
            </p>
          </>
        )}

        {error && (
          <p className="text-[13px] mt-3" style={{ color: '#8B1A1A' }}>
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
