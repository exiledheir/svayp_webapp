import React, { useState } from 'react';
import { MessageCircle, Send, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
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
export default function ContactsStep({ form, patch, authed, onNeedAuth, onPublish }: ContactsStepProps) {
  const { t } = useI18n();
  const methods = form.contactMethods ?? ['chat'];
  const name = form.seller?.name ?? '';
  const [national, setNational] = useState((form.seller?.phone ?? '').replace(/^\+998/, ''));

  const clean = national.replace(DIGITS, '');
  const fullPhone = `+998${clean}`;
  const valid = clean.length === 9 && name.trim().length > 0;

  function setSeller(p: Partial<NonNullable<MarketDraft['seller']>>) {
    patch({ seller: { ...(form.seller ?? { id: '', name: '' }), ...p } });
  }

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

        <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: 'rgba(128,128,128,0.08)' }}>
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#229ED9' }}>
            <Send size={20} color="white" />
          </span>
          <span className="flex-1 text-[15px] font-semibold text-black dark:text-white">{t.mk_contact_telegram}</span>
          <Toggle on={methods.includes('telegram')} onChange={(v) => setMethod('telegram', v)} />
        </div>
      </div>
    </StepScaffold>
  );
}
