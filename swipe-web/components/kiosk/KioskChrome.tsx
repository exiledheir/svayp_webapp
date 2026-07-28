import React from 'react';
import { kioskText, type KioskLang } from '@/lib/kiosk-i18n';

/**
 * Обвязка экранов киоска: шапка, индикатор шагов, диалог бездействия.
 *
 * Индикатор всегда из четырёх шагов независимо от ветки — по ТЗ человек не должен
 * чувствовать, что один путь длиннее другого.
 */

export function KioskBar({
  lang,
  onBack,
  onLang,
}: {
  lang: KioskLang;
  onBack?: () => void;
  onLang?: (lang: KioskLang) => void;
}) {
  return (
    <div className="bar">
      {onBack ? (
        <button className="back" onClick={onBack} aria-label={kioskText('back', lang)}>
          ←
        </button>
      ) : (
        <span className="spacer" />
      )}
      <div className="mark">
        LIB<i>Λ</i>S
      </div>
      {onLang ? (
        <div className="lang">
          <button className={lang === 'ru' ? 'act' : ''} onClick={() => onLang('ru')}>
            РУ
          </button>
          <button className={lang === 'uz' ? 'act' : ''} onClick={() => onLang('uz')}>
            UZ
          </button>
        </div>
      ) : (
        <span className="spacer" />
      )}

      <style jsx>{`
        .bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 54px 64px 0;
          height: 140px;
          flex: none;
        }
        .spacer {
          width: 88px;
        }
        .back {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          border: 0;
          background: var(--lav);
          font-size: 36px;
          cursor: pointer;
        }
        .mark {
          font-weight: 700;
          font-size: 30px;
          letter-spacing: 0.3em;
        }
        .mark i {
          font-style: normal;
          font-weight: 500;
        }
        .lang {
          display: flex;
          background: var(--lav);
          border-radius: 100px;
          padding: 6px;
        }
        .lang button {
          background: none;
          border: 0;
          color: var(--mute);
          font-size: 24px;
          font-weight: 700;
          padding: 16px 26px;
          border-radius: 100px;
          cursor: pointer;
        }
        .lang button.act {
          background: var(--dark);
          color: #fff;
        }
      `}</style>
    </div>
  );
}

/** Четыре шага всегда: ветки «создать» и «каталог» выглядят одинаково длинными. */
export function KioskSteps({ current }: { current: number }) {
  return (
    <div className="steps">
      {[0, 1, 2, 3].map((i) => (
        <i key={i} className={i < current ? 'done' : i === current ? 'now' : ''} />
      ))}
      <style jsx>{`
        .steps {
          display: flex;
          gap: 10px;
          padding: 26px 64px 0;
          flex: none;
        }
        .steps i {
          flex: 1;
          height: 6px;
          border-radius: 6px;
          background: var(--lav);
        }
        .steps i.done {
          background: var(--pink);
        }
        .steps i.now {
          background: linear-gradient(90deg, var(--pink) 45%, var(--lav) 45%);
        }
      `}</style>
    </div>
  );
}

/** Предупреждение о бездействии: 10 секунд на то, чтобы сказать «я здесь». */
export function IdleWarning({
  lang,
  seconds,
  onStay,
}: {
  lang: KioskLang;
  seconds: number;
  onStay: () => void;
}) {
  return (
    <div className="overlay" onClick={onStay}>
      <div className="card">
        <h2>{kioskText('stillHere', lang)}</h2>
        <p>
          {kioskText('stillHereHint', lang)} {seconds}
        </p>
        <button className="btn" onClick={onStay}>
          {kioskText('imHere', lang)}
        </button>
      </div>

      <style jsx>{`
        .overlay {
          position: absolute;
          inset: 0;
          z-index: 60;
          background: rgba(23, 23, 43, 0.55);
          display: grid;
          place-items: center;
        }
        .card {
          background: #fff;
          border-radius: 44px;
          padding: 72px 64px;
          width: 760px;
          text-align: center;
        }
        h2 {
          font-size: 64px;
          font-weight: 800;
          letter-spacing: -0.025em;
        }
        p {
          font-size: 32px;
          color: var(--mute);
          margin: 24px 0 48px;
        }
      `}</style>
    </div>
  );
}

/** Обрыв связи: показываем не ошибку браузера, а понятную инструкцию. */
export function OfflineScreen({ lang }: { lang: KioskLang }) {
  return (
    <div className="offline">
      <h1>{kioskText('offlineTitle', lang)}</h1>
      <p>{kioskText('offlineHint', lang)}</p>

      <style jsx>{`
        .offline {
          position: absolute;
          inset: 0;
          z-index: 70;
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 28px;
          text-align: center;
          padding: 0 80px;
        }
        h1 {
          font-size: 96px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        p {
          font-size: 34px;
          color: var(--mute);
        }
      `}</style>
    </div>
  );
}
