// ─── Feed (Лента) localStorage backend ───────────────────────────────────────
// Temporary client-only implementation so the Feed can be tested end-to-end
// (publish → feed → profile → like → delete) BEFORE the Spring `/feed/*`
// endpoints exist. feed-api.ts delegates to these when `isFeedLocalMode()` is on.
// Mirrors how the Market shipped on localStorage first (lib/market-storage.ts).
//
// To switch over to the real API later: set NEXT_PUBLIC_FEED_LOCAL=false.

import { getUser } from '@/lib/auth';
import type {
  FeedPost,
  FeedPostImage,
  FeedProfile,
  CreatePostPayload,
  UpdateProfilePayload,
} from '@/types/feed';
import type { Page } from '@/lib/feed-api';

const POSTS_KEY = 'svayp_feed_posts';
const PROFILE_KEY = 'svayp_feed_profile';
const HIDDEN_KEY = 'svayp_feed_hidden';
const SEEDED_KEY = 'svayp_feed_seeded';

/** Local-storage mode until the backend /feed/* endpoints exist. */
export function isFeedLocalMode(): boolean {
  return process.env.NEXT_PUBLIC_FEED_LOCAL !== 'false';
}

// ── low-level storage ─────────────────────────────────────────────────────────
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writePosts(posts: FeedPost[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  } catch {
    // QuotaExceeded — data-URL snapshot images are heavy. Drop the oldest half
    // and retry once so a publish never hard-fails during local testing.
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(posts.slice(0, Math.max(1, Math.ceil(posts.length / 2)))));
    } catch {
      /* give up silently */
    }
  }
}

// ── current user ──────────────────────────────────────────────────────────────
function me(): { id: string; username: string; displayName: string } {
  const u = getUser();
  const rawUsername = (u?.username as string) || '';
  const id = (u?.id as string) || 'local-user';
  const username = /^[a-z0-9_.]{3,20}$/i.test(rawUsername) ? rawUsername.toLowerCase() : 'me';
  return { id, username, displayName: 'You' };
}

function defaultProfile(): FeedProfile {
  const m = me();
  return {
    userId: m.id,
    username: m.username,
    displayName: m.displayName,
    avatarUrl: null,
    bio: null,
    postsCount: 0,
    likesTotal: 0,
    isOwn: true,
  };
}

// ── seed demo content (first run only) ────────────────────────────────────────
function img(seed: string): string {
  return `https://picsum.photos/seed/${seed}/400/500`;
}

function ensureSeed(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SEEDED_KEY)) return;
  localStorage.setItem(SEEDED_KEY, '1');
  if (localStorage.getItem(POSTS_KEY)) return; // never clobber real posts

  const t = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000).toISOString();
  const mk = (
    id: string,
    username: string,
    display: string,
    avatarSeed: string,
    imgs: { sourceType: FeedPostImage['sourceType']; seed: string }[],
    caption: string,
    likes: number,
    minsAgo: number,
  ): FeedPost => ({
    id,
    author: { id: `u_${username}`, username, displayName: display, avatarUrl: img(avatarSeed) },
    images: imgs.map((x, i) => ({ id: `${id}_${i}`, sourceType: x.sourceType, imageUrl: img(x.seed), position: i, sourceRefId: null })),
    caption,
    likesCount: likes,
    isLiked: false,
    containsRealPhoto: imgs.some((x) => x.sourceType === 'tryon'),
    status: 'active',
    isOwner: false,
    createdAt: t(minsAgo),
  });

  const seed: FeedPost[] = [
    mk('seed_1', 'zarina.style', 'Zarina', 'av-zar', [{ sourceType: 'board', seed: 'libas-a1' }], 'Серые брюки + платок, на работу', 128, 35),
    mk('seed_2', 'dildora_k', 'Dildora', 'av-dil', [{ sourceType: 'board', seed: 'libas-b1' }, { sourceType: 'tryon', seed: 'libas-b2' }], 'Лён и чёрные брюки на лето', 86, 120),
    mk('seed_3', 'malika_a', 'Malika', 'av-mal', [{ sourceType: 'calendar', seed: 'libas-c1' }], 'Образ дня ✨', 212, 300),
  ];
  writePosts(seed);
}

function readPosts(): FeedPost[] {
  ensureSeed();
  return readJSON<FeedPost[]>(POSTS_KEY, []);
}

function paginate<T>(items: T[], pageNum: number, size: number): Page<T> {
  const start = pageNum * size;
  return {
    content: items.slice(start, start + size),
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
    number: pageNum,
    size,
  };
}

function loadMyProfile(): FeedProfile {
  const stored = readJSON<FeedProfile | null>(PROFILE_KEY, null);
  const base = stored ?? defaultProfile();
  const mine = readPosts().filter((p) => p.author.id === base.userId && p.status === 'active');
  return {
    ...base,
    isOwn: true,
    postsCount: mine.length,
    likesTotal: mine.reduce((s, p) => s + p.likesCount, 0),
  };
}

function profileFromPosts(match: (p: FeedPost) => boolean, fallback: Partial<FeedProfile>): FeedProfile {
  const m = loadMyProfile();
  const posts = readPosts().filter((p) => match(p) && p.status === 'active');
  if (posts.length) {
    const a = posts[0].author;
    return {
      userId: a.id,
      username: a.username,
      displayName: a.displayName,
      avatarUrl: a.avatarUrl,
      bio: null,
      postsCount: posts.length,
      likesTotal: posts.reduce((s, p) => s + p.likesCount, 0),
      isOwn: a.id === m.userId,
    };
  }
  return {
    userId: fallback.userId ?? 'unknown',
    username: fallback.username ?? 'unknown',
    displayName: fallback.displayName ?? fallback.username ?? 'unknown',
    avatarUrl: null,
    bio: null,
    postsCount: 0,
    likesTotal: 0,
    isOwn: false,
  };
}

// ── API surface (mirrors lib/feed-api.ts) ─────────────────────────────────────
export async function getFeed(page = 0, size = 10): Promise<Page<FeedPost>> {
  const hidden = readJSON<string[]>(HIDDEN_KEY, []);
  const posts = readPosts()
    .filter((p) => p.status === 'active' && !hidden.includes(p.author.id))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return paginate(posts, page, size);
}

export async function getPost(id: string): Promise<FeedPost> {
  const post = readPosts().find((p) => p.id === id);
  if (!post) throw new Error('Post not found');
  return post;
}

export async function createPost(body: CreatePostPayload): Promise<FeedPost> {
  const prof = loadMyProfile();
  const images: FeedPostImage[] = (body.images ?? [])
    .map((im, i) => ({
      id: `img_${Date.now()}_${i}`,
      sourceType: im.sourceType,
      // local mode carries the image as a data URL in imageUrl (try-on) or
      // imageId (uploaded snapshot → data URL stand-in from uploadFeedImage).
      imageUrl: im.imageUrl ?? im.imageId ?? '',
      position: im.position ?? i,
      sourceRefId: im.sourceRefId ?? null,
    }))
    .filter((im) => im.imageUrl);

  const post: FeedPost = {
    id: `local_${Date.now()}`,
    author: { id: prof.userId, username: prof.username, displayName: prof.displayName, avatarUrl: prof.avatarUrl },
    images,
    caption: body.caption ?? null,
    likesCount: 0,
    isLiked: false,
    containsRealPhoto: images.some((im) => im.sourceType === 'tryon'),
    status: 'active',
    isOwner: true,
    createdAt: new Date().toISOString(),
  };

  const posts = readPosts();
  posts.unshift(post);
  writePosts(posts);
  return post;
}

export async function deletePost(id: string): Promise<void> {
  writePosts(readPosts().filter((p) => p.id !== id));
}

export async function getMyPosts(page = 0, size = 21): Promise<Page<FeedPost>> {
  const uid = loadMyProfile().userId;
  const posts = readPosts().filter((p) => p.author.id === uid).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return paginate(posts, page, size);
}

export async function getUserPosts(userId: string, page = 0, size = 21): Promise<Page<FeedPost>> {
  const posts = readPosts()
    .filter((p) => p.author.id === userId && p.status === 'active')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return paginate(posts, page, size);
}

export async function getProfile(userId: string): Promise<FeedProfile> {
  const m = loadMyProfile();
  if (userId === m.userId) return m;
  return profileFromPosts((p) => p.author.id === userId, { userId });
}

export async function getProfileByUsername(username: string): Promise<FeedProfile> {
  const m = loadMyProfile();
  if (username.toLowerCase() === m.username.toLowerCase()) return m;
  return profileFromPosts((p) => p.author.username.toLowerCase() === username.toLowerCase(), { username });
}

export async function getMyProfile(): Promise<FeedProfile> {
  return loadMyProfile();
}

export async function updateMyProfile(patch: UpdateProfilePayload): Promise<FeedProfile> {
  const current = loadMyProfile();
  const next: FeedProfile = {
    ...current,
    displayName: patch.displayName ?? current.displayName,
    username: patch.username ? patch.username.toLowerCase() : current.username,
    bio: patch.bio !== undefined ? patch.bio : current.bio,
    // local mode: avatarImageId IS the avatar data URL (see uploadFeedImage).
    avatarUrl: patch.avatarImageId ?? current.avatarUrl,
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(next));

  // Reflect identity changes onto this user's existing posts.
  const posts = readPosts().map((p) =>
    p.author.id === next.userId
      ? { ...p, author: { id: next.userId, username: next.username, displayName: next.displayName, avatarUrl: next.avatarUrl } }
      : p,
  );
  writePosts(posts);
  return loadMyProfile();
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const u = username.toLowerCase();
  const m = loadMyProfile();
  if (u === m.username.toLowerCase()) return true; // my own current name
  return !readPosts().some((p) => p.author.username.toLowerCase() === u && p.author.id !== m.userId);
}

export async function toggleLike(postId: string): Promise<{ isLiked: boolean; likesCount: number }> {
  const posts = readPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post) return { isLiked: false, likesCount: 0 };
  post.isLiked = !post.isLiked;
  post.likesCount = Math.max(0, post.likesCount + (post.isLiked ? 1 : -1));
  writePosts(posts);
  return { isLiked: post.isLiked, likesCount: post.likesCount };
}

export async function reportPost(): Promise<void> {
  /* no-op locally */
}

export async function hideUserPosts(userId: string): Promise<void> {
  const hidden = readJSON<string[]>(HIDDEN_KEY, []);
  if (!hidden.includes(userId)) {
    hidden.push(userId);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
  }
}

export async function unhideUserPosts(userId: string): Promise<void> {
  const hidden = readJSON<string[]>(HIDDEN_KEY, []).filter((id) => id !== userId);
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
}
