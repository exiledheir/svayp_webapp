import React from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { updateMyProfile, checkUsernameAvailable } from '@/lib/feed-api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';
import type { FeedProfile } from '@/types/feed';

interface Props {
  profile: FeedProfile;
  onSaved: (p: FeedProfile) => void;
  onClose: () => void;
}

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

/** Owner-only profile editor. For now only the username is editable — name and
 *  phone come from the account, and avatar/bio are intentionally left out. */
export default function ProfileEditSheet({ profile, onSaved, onClose }: Props) {
  const { t } = useI18n();
  const [username, setUsername] = React.useState(profile.username ?? '');
  const [usernameState, setUsernameState] = React.useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [saving, setSaving] = React.useState(false);

  // Debounced username availability check.
  React.useEffect(() => {
    const u = username.trim().toLowerCase();
    if (u === (profile.username ?? '').toLowerCase()) {
      setUsernameState('idle');
      return;
    }
    if (!USERNAME_RE.test(u)) {
      setUsernameState(u ? 'invalid' : 'idle');
      return;
    }
    setUsernameState('checking');
    const h = setTimeout(() => {
      checkUsernameAvailable(u)
        .then((ok) => setUsernameState(ok ? 'available' : 'taken'))
        .catch(() => setUsernameState('idle'));
    }, 400);
    return () => clearTimeout(h);
  }, [username, profile.username]);

  const canSave =
    !saving &&
    USERNAME_RE.test(username.trim().toLowerCase()) &&
    usernameState !== 'taken' &&
    usernameState !== 'checking';

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const updated = await updateMyProfile({ username: username.trim().toLowerCase() });
      logAnalyticsEvent(Events.FEED_PROFILE_EDITED);
      onSaved(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="absolute inset-0 z-[70] flex flex-col bg-white dark:bg-[#1c1c1e]" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-black/5 dark:border-white/10">
        <button onClick={onClose} className="text-black dark:text-white p-1" aria-label="Close">
          <X size={22} />
        </button>
        <h1 className="text-[16px] font-bold text-black dark:text-white">{t.feed_edit_profile}</h1>
        <button onClick={handleSave} disabled={!canSave} className="ml-auto text-[15px] font-semibold disabled:opacity-40" style={{ color: '#F370A7' }}>
          {t.feed_save}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Username — the only editable field for now */}
        <label className="block text-[13px] font-semibold text-black/60 dark:text-white/60 mb-1">{t.feed_username}</label>
        <div className="flex items-center rounded-xl bg-black/5 dark:bg-white/10 px-3">
          <span className="text-black/40 dark:text-white/40 text-[14px]">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
            maxLength={20}
            className="flex-1 p-3 bg-transparent text-[14px] text-black dark:text-white outline-none"
          />
          {usernameState === 'available' && <span className="text-[12px]" style={{ color: '#3BA55D' }}>{t.feed_username_available}</span>}
          {usernameState === 'taken' && <span className="text-[12px]" style={{ color: '#E5484D' }}>{t.feed_username_taken}</span>}
          {usernameState === 'checking' && <span className="text-[12px] text-black/40 dark:text-white/40">…</span>}
        </div>
      </div>
    </div>
  );
}
