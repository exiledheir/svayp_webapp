import React from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { updateMyProfile, checkUsernameAvailable, uploadFeedImage } from '@/lib/feed-api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';
import Avatar from '@/components/feed/Avatar';
import type { FeedProfile } from '@/types/feed';

interface Props {
  profile: FeedProfile;
  onSaved: (p: FeedProfile) => void;
  onClose: () => void;
}

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

/** Owner-only profile editor: display name, unique username, bio, avatar. */
export default function ProfileEditSheet({ profile, onSaved, onClose }: Props) {
  const { t } = useI18n();
  const [displayName, setDisplayName] = React.useState(profile.displayName ?? '');
  const [username, setUsername] = React.useState(profile.username ?? '');
  const [bio, setBio] = React.useState(profile.bio ?? '');
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(profile.avatarUrl);
  const [avatarImageId, setAvatarImageId] = React.useState<string | undefined>(undefined);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [usernameState, setUsernameState] = React.useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

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

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const up = await uploadFeedImage(file);
      if (up.status === 'COMPLETED' && up.feedImageId) {
        setAvatarImageId(up.feedImageId);
        if (up.imageUrl) setAvatarPreview(up.imageUrl);
      }
    } catch {
      setAvatarPreview(profile.avatarUrl);
    } finally {
      setUploadingAvatar(false);
    }
  }

  const canSave =
    !saving &&
    !uploadingAvatar &&
    displayName.trim().length > 0 &&
    USERNAME_RE.test(username.trim().toLowerCase()) &&
    usernameState !== 'taken' &&
    usernameState !== 'checking';

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim() || undefined,
        avatarImageId,
      });
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
        {/* Avatar */}
        <div className="flex flex-col items-center mb-5">
          <button onClick={() => fileRef.current?.click()} className="relative" disabled={uploadingAvatar}>
            <Avatar url={avatarPreview} name={displayName || username} size={88} />
            <span className="absolute bottom-0 right-0 text-[11px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: '#F370A7' }}>
              {uploadingAvatar ? '…' : '+'}
            </span>
          </button>
          <span className="text-[12px] text-black/45 dark:text-white/45 mt-2">{t.feed_avatar}</span>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
        </div>

        {/* Display name */}
        <label className="block text-[13px] font-semibold text-black/60 dark:text-white/60 mb-1">{t.feed_display_name}</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          className="w-full p-3 rounded-xl text-[14px] bg-black/5 dark:bg-white/10 text-black dark:text-white outline-none mb-4"
        />

        {/* Username */}
        <label className="block text-[13px] font-semibold text-black/60 dark:text-white/60 mb-1">{t.feed_username}</label>
        <div className="flex items-center rounded-xl bg-black/5 dark:bg-white/10 px-3 mb-1">
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
        <div className="h-4 mb-3" />

        {/* Bio */}
        <label className="block text-[13px] font-semibold text-black/60 dark:text-white/60 mb-1">{t.feed_bio}</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 160))}
          rows={3}
          maxLength={160}
          className="w-full p-3 rounded-xl text-[14px] bg-black/5 dark:bg-white/10 text-black dark:text-white outline-none resize-none"
        />
      </div>
    </div>
  );
}
