import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import CameraStep from '@/components/kiosk/CameraStep';
import { IdleWarning, KioskBar, KioskSteps, OfflineScreen } from '@/components/kiosk/KioskChrome';
import {
  BodyScreen,
  BuyScreen,
  CatalogScreen,
  GeneratingScreen,
  IdleScreen,
  IntroScreen,
  ResultScreen,
  StyleScreen,
} from '@/components/kiosk/KioskScreens';
import { kioskText, type KioskLang } from '@/lib/kiosk-i18n';
import { disableDemo, enableDemo, isDemoForced, isDemoMode } from '@/lib/kiosk-demo';
import {
  createLook,
  fetchWholeCatalog,
  finishSession,
  kioskErrorCode,
  resetSession,
  startSession,
  trackKiosk,
  watchLook,
  type KioskCatalogItem,
  type KioskLook,
} from '@/lib/kiosk-api';

/**
 * LIBAS Kiosk — планшет в зале магазина.
 *
 * Сценарий по ТЗ: фото лица → пол и тип фигуры → образ из вещей ЭТОГО магазина →
 * QR в приложение либо код продавцу. Два входа с заставки («создать» и «каталог»)
 * сходятся на экране генерации.
 *
 * Экран рассчитан на 1080×1920 и масштабируется целиком, как в прототипе: так
 * вёрстка одинакова на любом вертикальном планшете, без сюрпризов в зале.
 */

type Screen =
  | 'idle'
  | 'intro'
  | 'camera'
  | 'body'
  | 'style'
  | 'catalog'
  | 'generating'
  | 'result'
  | 'buy';

/** 45 секунд без касаний → предупреждение, ещё 10 → полный сброс (ТЗ, раздел 2). */
const IDLE_TIMEOUT_MS = 45_000;
const IDLE_GRACE_S = 10;

export default function KioskPage() {
  const [lang, setLang] = useState<KioskLang>('ru');
  const [screen, setScreen] = useState<Screen>('idle');
  const [path, setPath] = useState<'create' | 'catalog'>('create');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [storeLabel, setStoreLabel] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  const [gender, setGender] = useState<'FEMALE' | 'MALE' | null>(null);
  const [shape, setShape] = useState<string | null>(null);
  const [styles, setStyles] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  const [catalog, setCatalog] = useState<KioskCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const [look, setLook] = useState<KioskLook | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [genFailed, setGenFailed] = useState(false);
  const [genReason, setGenReason] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const [offline, setOffline] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const [idleLeft, setIdleLeft] = useState(IDLE_GRACE_S);

  const watchRef = useRef<{ close: () => void } | null>(null);
  /** Номер попытки: с ним пересборка даёт другой образ. */
  const attemptRef = useRef(0);
  /** Номер загрузки каталога: ответы прошлого фильтра не должны перетирать текущий. */
  const catalogRequestRef = useRef(0);
  const scaleRef = useRef<HTMLDivElement | null>(null);

  const t = useCallback((key: Parameters<typeof kioskText>[0]) => kioskText(key, lang), [lang]);
  const track = useCallback(
    (name: string, props?: Record<string, unknown>) => trackKiosk(name, sessionId, props),
    [sessionId],
  );

  // ── масштабирование под физический экран ─────────────────────────────────
  useEffect(() => {
    const fit = () => {
      const el = scaleRef.current;
      if (!el) return;
      const scale = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // ── киоск-режим: ни зума, ни контекстного меню, ни выделения ──────────────
  useEffect(() => {
    // Залипший флаг с прошлой сессии сбрасываем: живой бэкенд важнее прошлого сбоя.
    if (!isDemoForced()) disableDemo();
    setDemo(isDemoMode());

    const block = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    document.addEventListener('gesturestart', block);
    document.addEventListener('selectstart', block);

    const online = () => setOffline(false);
    const gone = () => setOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', gone);
    setOffline(typeof navigator !== 'undefined' && navigator.onLine === false);

    // Экран не должен гаснуть посреди зала.
    let release: any = null;
    (navigator as any)?.wakeLock?.request?.('screen').then((s: any) => (release = s)).catch(() => {});

    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('gesturestart', block);
      document.removeEventListener('selectstart', block);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', gone);
      release?.release?.().catch?.(() => {});
    };
  }, []);

  // ── сброс сессии ─────────────────────────────────────────────────────────
  const hardReset = useCallback(
    (reason: 'timeout' | 'manual') => {
      watchRef.current?.close();
      watchRef.current = null;
      if (sessionId) {
        track(reason === 'timeout' ? 'kiosk_session_timeout' : 'kiosk_session_reset', { screen });
        // Фото удаляется на бэкенде немедленно: следующий человек не должен
        // увидеть ничего от предыдущего.
        resetSession(sessionId).catch(() => {});
      }
      setSessionId(null);
      attemptRef.current = 0;
      setStoreLabel((label) => label); // подпись магазина переживает сброс
      setGender(null);
      setShape(null);
      setStyles([]);
      setPicked([]);
      setCategory(null);
      setLook(null);
      setCode(null);
      setShareUrl(null);
      setGenFailed(false);
      setElapsed(0);
      setIdleWarning(false);
      setScreen('idle');
    },
    [screen, sessionId, track],
  );

  // ── таймер бездействия ───────────────────────────────────────────────────
  useEffect(() => {
    if (screen === 'idle') return;

    let warnTimer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(warnTimer);
      setIdleWarning(false);
      warnTimer = setTimeout(() => {
        setIdleLeft(IDLE_GRACE_S);
        setIdleWarning(true);
      }, IDLE_TIMEOUT_MS);
    };

    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, arm));
    arm();

    return () => {
      clearTimeout(warnTimer);
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [screen]);

  useEffect(() => {
    if (!idleWarning) return;
    if (idleLeft <= 0) {
      hardReset('timeout');
      return;
    }
    const timer = setTimeout(() => setIdleLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [idleWarning, idleLeft, hardReset]);

  // ── старт сессии ─────────────────────────────────────────────────────────
  const begin = async (nextPath: 'create' | 'catalog') => {
    setPath(nextPath);
    try {
      let session;
      try {
        session = await startSession(lang, nextPath);
        // Бэкенд ответил — значит имитация больше не нужна.
        if (!isDemoForced()) {
          disableDemo();
          setDemo(false);
        }
      } catch (err) {
        // Бэкенд киоска ещё не раскатан (или планшет не подключён к магазину) —
        // переходим в демо вместо экрана «нет связи»: показ важнее.
        enableDemo();
        setDemo(true);
        session = await startSession(lang, nextPath);
      }
      setSessionId(session.sessionId);
      setStoreLabel(session.storeLabel);
      trackKiosk('kiosk_session_start', session.sessionId, { storeLabel: session.storeLabel, demo: isDemoMode() });
      trackKiosk('kiosk_path_selected', session.sessionId, { path: nextPath });
      if (nextPath === 'create') {
        setScreen('intro');
      } else {
        setScreen('catalog');
        loadCatalog();
      }
    } catch {
      setOffline(true);
    }
  };

  const loadCatalog = async (cat: string | null = null) => {
    const requestId = ++catalogRequestRef.current;
    const isCurrent = () => catalogRequestRef.current === requestId;

    setCatalogLoading(true);
    setCatalog([]);
    try {
      // Показываем первую порцию сразу, остальные страницы дотекают следом —
      // в зале человек не должен ждать, пока догрузится весь каталог.
      await fetchWholeCatalog(
        (items) => {
          if (isCurrent()) setCatalog(items);
        },
        cat,
        isCurrent,
      );
    } catch {
      if (isCurrent()) setOffline(true);
    } finally {
      if (isCurrent()) setCatalogLoading(false);
    }
  };

  // ── генерация ────────────────────────────────────────────────────────────
  const startGeneration = useCallback(async () => {
    if (!sessionId || !gender || !shape) return;
    setScreen('generating');
    setGenFailed(false);
    setGenReason(null);
    setElapsed(0);
    track('kiosk_generation_started', { path, styles, picked: picked.length });

    try {
      const created = await createLook({
        sessionId,
        gender,
        bodyShape: shape,
        styles,
        productIds: picked,
        attempt: attemptRef.current,
      });
      setLook(created);

      watchRef.current?.close();
      watchRef.current = watchLook(created.lookId, {
        onDone: (finished) => {
          setLook(finished);
          if (finished.status === 'COMPLETED') {
            track('kiosk_generation_completed', { lookId: finished.lookId });
            setScreen('result');
            track('kiosk_result_viewed');
          } else {
            track('kiosk_generation_failed', { reason: finished.failureReason });
            setGenReason(finished.failureReason ?? 'GENERATION_FAILED');
            setGenFailed(true);
          }
        },
        onError: (err) => {
          setGenReason(err?.message ?? 'STREAM_ERROR');
          setGenFailed(true);
        },
      });
    } catch (err) {
      const errorCode = kioskErrorCode(err);
      track('kiosk_generation_failed', { reason: errorCode ?? 'REQUEST_FAILED' });
      setGenReason(errorCode ?? 'REQUEST_FAILED');
      setGenFailed(true);
    }
  }, [gender, path, picked, sessionId, shape, styles, track]);

  // Счётчик секунд генерации — он же питает прогресс-бар.
  useEffect(() => {
    if (screen !== 'generating' || genFailed) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [screen, genFailed]);

  // ── забрать образ ────────────────────────────────────────────────────────
  const collect = async () => {
    if (!sessionId) return;
    try {
      const finish = await finishSession(sessionId);
      setCode(finish.code);
      setShareUrl(finish.shareUrl);
      track('kiosk_buy_opened', { code: finish.code });
      setScreen('buy');
    } catch {
      setOffline(true);
    }
  };

  // Код и ссылка нужны уже на экране результата — там висит QR.
  useEffect(() => {
    if (screen !== 'result' || !sessionId || shareUrl) return;
    finishSession(sessionId)
      .then((finish) => {
        setCode(finish.code);
        setShareUrl(finish.shareUrl);
      })
      .catch(() => {});
  }, [screen, sessionId, shareUrl]);

  const regenerate = () => {
    attemptRef.current += 1;
    track('kiosk_regenerate', { attempt: attemptRef.current });
    startGeneration();
  };

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  // ── шаг индикатора: обе ветки выглядят одинаково длинными ────────────────
  const stepIndex = (() => {
    if (path === 'create') {
      return { camera: 0, body: 1, style: 2, generating: 3, result: 3, buy: 3 }[
        screen as string
      ] ?? 0;
    }
    return { catalog: 0, camera: 1, body: 2, generating: 3, result: 3, buy: 3 }[screen as string] ?? 0;
  })();

  const showChrome = screen !== 'idle';

  return (
    <>
      <Head>
        <title>LIBAS Kiosk</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      <div className="stage">
        <div className="device" ref={scaleRef}>
          {offline && <OfflineScreen lang={lang} />}
          {demo && !offline && <div className="demoBadge">{t('demoBadge')}</div>}

          {showChrome && (
            <KioskBar
              lang={lang}
              onBack={() => {
                if (screen === 'intro' || screen === 'catalog') hardReset('manual');
                else if (screen === 'camera') setScreen(path === 'create' ? 'intro' : 'catalog');
                else if (screen === 'body') setScreen('camera');
                else if (screen === 'style') setScreen('body');
                else if (screen === 'result') setScreen(path === 'create' ? 'style' : 'catalog');
                else if (screen === 'buy') setScreen('result');
                else hardReset('manual');
              }}
              onLang={screen === 'intro' ? setLang : undefined}
            />
          )}
          {showChrome && screen !== 'intro' && <KioskSteps current={stepIndex} />}

          {screen === 'idle' && (
            <>
              <div className="idleTop">
                <div className="mark">
                  LIB<i>Λ</i>S
                </div>
                <div className="lang">
                  <button className={lang === 'ru' ? 'act' : ''} onClick={() => setLang('ru')}>
                    РУ
                  </button>
                  <button className={lang === 'uz' ? 'act' : ''} onClick={() => setLang('uz')}>
                    UZ
                  </button>
                </div>
              </div>
              <IdleScreen
                lang={lang}
                t={t}
                storeLabel={storeLabel}
                onCreate={() => begin('create')}
                onCatalog={() => begin('catalog')}
              />
            </>
          )}

          {screen === 'intro' && <IntroScreen t={t} onStart={() => setScreen('camera')} />}

          {screen === 'camera' && sessionId && (
            <CameraStep
              lang={lang}
              sessionId={sessionId}
              onConfirmed={() => setScreen('body')}
              onEvent={track}
            />
          )}

          {screen === 'body' && (
            <BodyScreen
              lang={lang}
              t={t}
              gender={gender}
              shape={shape}
              onGender={(g) => {
                setGender(g);
                setShape(null); // списки фигур для мужчин и женщин разные
              }}
              onShape={setShape}
              nextLabel={path === 'create' ? t('next') : t('ctaCreate')}
              onNext={() => {
                track('kiosk_profile_completed', { gender, bodyShape: shape });
                if (path === 'create') setScreen('style');
                else startGeneration();
              }}
            />
          )}

          {screen === 'style' && (
            <StyleScreen
              lang={lang}
              t={t}
              selected={styles}
              onToggle={(code) => setStyles((list) => toggle(list, code))}
              onNext={() => {
                track('kiosk_style_selected', { styles });
                startGeneration();
              }}
            />
          )}

          {screen === 'catalog' && (
            <CatalogScreen
              lang={lang}
              t={t}
              items={catalog}
              selected={picked}
              loading={catalogLoading}
              category={category}
              onCategory={(code) => {
                setCategory(code);
                loadCatalog(code);
              }}
              onToggle={(id) => setPicked((list) => toggle(list, id))}
              onNext={() => {
                track('kiosk_catalog_items_selected', { count: picked.length, ids: picked });
                setScreen('camera');
              }}
            />
          )}

          {screen === 'generating' && (
            <GeneratingScreen
              t={t}
              elapsed={elapsed}
              failed={genFailed}
              reason={genReason}
              onCancel={() => {
                watchRef.current?.close();
                track('kiosk_generation_cancelled', { elapsed });
                setScreen(path === 'create' ? 'style' : 'catalog');
              }}
              onRetry={startGeneration}
            />
          )}

          {screen === 'result' && look && (
            <ResultScreen
              lang={lang}
              t={t}
              look={look}
              shareUrl={shareUrl}
              onRegenerate={regenerate}
              onCollect={collect}
            />
          )}

          {screen === 'buy' && look && (
            <BuyScreen lang={lang} t={t} look={look} code={code} onBack={() => setScreen('result')} />
          )}

          {idleWarning && (
            <IdleWarning lang={lang} seconds={idleLeft} onStay={() => setIdleWarning(false)} />
          )}
        </div>
      </div>

      <style jsx global>{`
        :root {
          --bg: #ffffff;
          --ink: #17172b;
          --mute: #8e8a99;
          --pink: #f4479b;
          --tint: #fdebf4;
          --lav: #f1eef5;
          --lav-d: #e7e2ee;
          --line: #efedf3;
          --dark: #16161f;
          --card: #f8f7fa;
        }
        html,
        body {
          height: 100%;
          margin: 0;
          overflow: hidden;
          background: #dedae4;
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          overscroll-behavior: none;
        }
        .stage {
          position: fixed;
          inset: 0;
          overflow: hidden;
        }
        .device {
          width: 1080px;
          height: 1920px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform-origin: center center;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg);
          color: var(--ink);
          border-radius: 30px;
          box-shadow: 0 50px 130px rgba(23, 23, 43, 0.35);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .device h1,
        .device h2,
        .device h3 {
          margin: 0;
        }
        .device p {
          margin: 0;
        }
        .btn {
          width: 100%;
          height: 130px;
          border: 0;
          border-radius: 100px;
          background: var(--pink);
          color: #fff;
          font-size: 36px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          display: grid;
          place-items: center;
          box-shadow: 0 14px 34px rgba(244, 71, 155, 0.32);
          transition: transform 0.18s;
        }
        .btn:active {
          transform: scale(0.975);
        }
        .btn.ghost {
          background: var(--lav);
          color: var(--ink);
          box-shadow: none;
          height: 114px;
        }
        .btn.dark {
          background: var(--dark);
          color: #fff;
          box-shadow: none;
        }
        .btn:disabled {
          opacity: 0.35;
          pointer-events: none;
        }
        .btn small {
          display: block;
          font-size: 22px;
          font-weight: 600;
          opacity: 0.72;
          margin-top: 4px;
        }
        .idleTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 56px 64px 0;
        }
        .idleTop .mark {
          font-weight: 700;
          font-size: 30px;
          letter-spacing: 0.3em;
        }
        .idleTop .mark i {
          font-style: normal;
          font-weight: 500;
        }
        .idleTop .lang {
          display: flex;
          background: var(--lav);
          border-radius: 100px;
          padding: 6px;
        }
        .idleTop .lang button {
          background: none;
          border: 0;
          color: var(--mute);
          font-size: 24px;
          font-weight: 700;
          font-family: inherit;
          padding: 16px 26px;
          border-radius: 100px;
          cursor: pointer;
        }
        .idleTop .lang button.act {
          background: var(--dark);
          color: #fff;
        }
        .demoBadge {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 80;
          background: rgba(22, 22, 31, 0.86);
          color: #fff;
          font-size: 22px;
          text-align: center;
          padding: 14px;
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.001s !important;
            transition-duration: 0.001s !important;
          }
        }
      `}</style>
    </>
  );
}
