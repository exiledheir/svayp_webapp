import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Check, Phone } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getUser } from '@/lib/auth';
import { getUserProfile } from '@/lib/wardrobe-api';
import StepScaffold from './StepScaffold';
import type { MarketContactMethod, MarketDraft } from '@/types/market';

interface ContactsStepProps {
  form: MarketDraft;
  patch: (p: Partial<MarketDraft>) => void;
  authed: boolean;
  /** Unauthenticated users: parent saves the draft and bounces through auth. */
  onNeedAuth: (phone: string) => void;
  /** Authenticated users: publish the listing. */
  onPublish: () => void;
}

const DIGITS = /\D/g;

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className="w-[52px] h-[30px] rounded-full shrink-0 transition-colors relative disabled:opacity-60"
      style={{ background: on ? '#F370A7' : 'rgba(128,128,128,0.35)' }}
      aria-pressed={on}
    >
      <span className="absolute top-[3px] w-6 h-6 rounded-full bg-white transition-all" style={{ left: on ? 25 : 3 }} />
    </button>
  );
}

/**
 * Combined final step: phone number + profile name + preferred contact methods,
 * then publish. The phone replaces the standalone PhoneStep — it doubles as the
 * auth gate (unauthenticated users get bounced through OTP, keeping the draft).
 */
/** Normalise any stored phone to the 9-digit national part (drops +998 / 998). */
function toNational(raw?: string): string {
  let d = (raw ?? '').replace(DIGITS, '');
  if (d.startsWith('998')) d = d.slice(3);
  return d.slice(-9);
}

export default function ContactsStep({ form, patch, authed, onNeedAuth, onPublish }: ContactsStepProps) {
  const { t } = useI18n();
  const methods = form.contactMethods ?? ['chat'];
  const name = form.seller?.name ?? '';
  const telegramUsername = form.seller?.telegramUsername ?? '';
  const [national, setNational] = useState(toNational(form.seller?.phone));
  // Prefill name/phone from the signed-in user's profile, once, without
  // clobbering anything the user (or a resumed draft) already filled in.
  const prefilled = useRef(false);

  const clean = national.replace(DIGITS, '');
  const fullPhone = `+998${clean}`;
  const telegramOn = methods.includes('telegram');
  const callOn = methods.includes('phone');
  const valid = clean.length === 9 && name.trim().length > 0;

  function setSeller(p: Partial<NonNullable<MarketDraft['seller']>>) {
    patch({ seller: { ...(form.seller ?? { id: '', name: '' }), ...p } });
  }

  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;

    const apply = (rawName?: string, rawPhone?: string) => {
      const nat = toNational(rawPhone);
      const patchSeller: Partial<NonNullable<MarketDraft['seller']>> = {};
      // Only set a name that looks like a name (skip phone-number usernames).
      if (!form.seller?.name && rawName && /[^\d+\s]/.test(rawName)) patchSeller.name = rawName;
      if (!toNational(form.seller?.phone) && nat.length === 9) {
        patchSeller.phone = `+998${nat}`;
        setNational(nat);
      }
      if (Object.keys(patchSeller).length) setSeller(patchSeller);
    };

    // Fast local prefill (Flutter WebView injects the user), then backend profile.
    const u = getUser();
    apply((u?.name ?? u?.username) as string | undefined, (u?.phone ?? u?.username) as string | undefined);
    getUserProfile()
      .then((p) => apply(p.name, p.phoneNumber))
      .catch(() => { /* ignore — manual entry still works */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onPhoneChange(v: string) {
    setNational(v);
    setSeller({ phone: `+998${v.replace(DIGITS, '')}` });
  }

  function setMethod(m: MarketContactMethod, on: boolean) {
    const set = new Set(methods);
    if (on) set.add(m); else set.delete(m);
    set.add('chat'); // chat is always available
    patch({ contactMethods: Array.from(set) });
  }

  function handleCta() {
    setSeller({ phone: fullPhone });
    if (authed) onPublish();
    else onNeedAuth(fullPhone);
  }

  return (
    <StepScaffold
      title={t.mk_contacts_title}
      ctaLabel={t.mk_publish_cta}
      ctaDisabled={!valid}
      onCta={handleCta}
    >
      {/* Phone */}
      <label className="block text-[15px] font-bold text-black dark:text-white mb-2">{t.mk_phone_title}</label>
      <div className="flex items-center gap-2.5">
        <div className="h-14 px-4 flex items-center rounded-2xl text-[16px] font-semibold text-black dark:text-white" style={{ background: 'rgba(128,128,128,0.10)' }}>
          +998
        </div>
        <input
          value={national}
          inputMode="numeric"
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="90 123 45 67"
          className="flex-1 h-14 px-4 rounded-2xl text-[16px] outline-none text-black dark:text-white"
          style={{ background: 'rgba(128,128,128,0.10)' }}
        />
      </div>
      {authed && (
        <div className="flex items-center gap-2 mt-2 text-[13px] text-[#3BA55D] font-medium">
          <Check size={16} strokeWidth={2.5} />
          <span>{t.mk_phone_authed_note} {fullPhone}</span>
        </div>
      )}

      {/* Name */}
      <label className="block text-[15px] font-bold text-black dark:text-white mt-6 mb-2">{t.mk_contacts_name}</label>
      <input
        value={name}
        onChange={(e) => setSeller({ name: e.target.value })}
        placeholder={t.mk_contacts_name_ph}
        className="w-full px-4 h-14 rounded-2xl text-[16px] outline-none text-black dark:text-white"
        style={{ background: 'rgba(128,128,128,0.10)' }}
      />

      {/* Contact methods */}
      <p className="text-[15px] font-bold text-black dark:text-white mt-6 mb-3">{t.mk_contacts_methods}</p>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: 'rgba(128,128,128,0.08)' }}>
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#3BA55D' }}>
            <MessageCircle size={20} color="white" />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold text-black dark:text-white">{t.mk_contact_chat}</span>
            <span className="block text-[13px] text-black/45 dark:text-white/45">{t.mk_contact_chat_note}</span>
          </span>
          <Toggle on disabled onChange={() => {}} />
        </div>

        {/* Phone call */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: 'rgba(128,128,128,0.08)' }}>
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#6366F1' }}>
            <Phone size={20} color="white" />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold text-black dark:text-white">{t.mk_contact_call}</span>
            <span className="block text-[13px] text-black/45 dark:text-white/45">{t.mk_contact_call_note}</span>
          </span>
          <Toggle on={callOn} onChange={(v) => setMethod('phone', v)} />
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: 'rgba(128,128,128,0.08)' }}>
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#229ED9' }}>
            <Send size={20} color="white" />
          </span>
          <span className="flex-1 text-[15px] font-semibold text-black dark:text-white">{t.mk_contact_telegram}</span>
          <Toggle on={telegramOn} onChange={(v) => setMethod('telegram', v)} />
        </div>

        {/* When Telegram is on: explain the phone redirect + offer a username. */}
        {telegramOn && (
          <div className="rounded-2xl p-3.5" style={{ background: 'rgba(34,158,217,0.08)' }}>
            <p className="text-[13px] leading-relaxed text-black/60 dark:text-white/60 mb-2.5">
              {t.mk_contact_tg_note} <span className="font-semibold text-black/75 dark:text-white/75">{fullPhone}</span>
            </p>
            <div className="flex items-center px-3.5 h-12 rounded-xl bg-white dark:bg-[#2c2c2e]">
              <span className="text-[15px] font-semibold text-black/40 dark:text-white/40">@</span>
              <input
                value={telegramUsername.replace(/^@/, '')}
                onChange={(e) => setSeller({ telegramUsername: e.target.value.replace(/[^A-Za-z0-9_]/g, '') })}
                placeholder={t.mk_contact_tg_username_ph}
                className="flex-1 bg-transparent outline-none text-[15px] ml-1 text-black dark:text-white"
              />
            </div>
          </div>
        )}
      </div>
    </StepScaffold>
  );
}
