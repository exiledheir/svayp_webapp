import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  KIOSK_SHAPES,
  KIOSK_STYLES,
  kioskMoney,
  kioskText,
  type KioskLang,
} from '@/lib/kiosk-i18n';
import type { KioskCatalogItem, KioskLook } from '@/lib/kiosk-api';

type T = (key: Parameters<typeof kioskText>[0]) => string;

/** Заставка: работает, пока никто не подошёл. */
export function IdleScreen({
  lang,
  t,
  storeLabel,
  onCreate,
  onCatalog,
}: {
  lang: KioskLang;
  t: T;
  storeLabel: string | null;
  onCreate: () => void;
  onCatalog: () => void;
}) {
  return (
    <div className="idle">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="copy">
        <div className="eyebrow">{t('idleEyebrow')}</div>
        <h1>
          {t('idleTitle')} <em>{t('idleTitleAccent')}</em>
        </h1>
        <div className="cta">
          <button className="btn" onClick={onCreate}>
            {t('ctaCreate')}
          </button>
          <button className="btn dark" onClick={onCatalog}>
            {t('ctaCatalog')}
          </button>
        </div>
      </div>
      <div className="host">
        <span>{storeLabel ?? ''}</span>
        <span>{t('free')}</span>
      </div>

      <style jsx>{`
        .idle {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
        }
        .b1 {
          width: 820px;
          height: 820px;
          background: rgba(244, 71, 155, 0.2);
          top: -200px;
          right: -240px;
        }
        .b2 {
          width: 620px;
          height: 620px;
          background: rgba(199, 154, 51, 0.14);
          bottom: 280px;
          left: -220px;
        }
        .copy {
          position: relative;
          padding: 0 64px 186px;
        }
        .eyebrow {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--pink);
        }
        h1 {
          font-size: 104px;
          line-height: 1.02;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-top: 24px;
        }
        h1 em {
          font-style: normal;
          color: var(--pink);
        }
        .cta {
          margin-top: 52px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .host {
          position: absolute;
          left: 64px;
          right: 64px;
          bottom: 66px;
          padding-top: 30px;
          border-top: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          font-size: 24px;
          font-weight: 600;
          color: var(--mute);
        }
      `}</style>
    </div>
  );
}

/** Как это работает — только в ветке «создать образ». */
export function IntroScreen({ t, onStart }: { t: T; onStart: () => void }) {
  const steps = [
    [t('step1Title'), t('step1Text')],
    [t('step2Title'), t('step2Text')],
    [t('step3Title'), t('step3Text')],
  ];
  return (
    <div className="body">
      <div className="head">
        <div className="eyebrow">{t('introEyebrow')}</div>
        <h1>{t('introTitle')}</h1>
      </div>
      <div className="steps">
        {steps.map(([title, text], i) => (
          <div className="step" key={title}>
            <b>{i + 1}</b>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="note">{t('privacyLong')}</div>
      <div className="foot">
        <button className="btn" onClick={onStart}>
          {t('introCta')}
        </button>
      </div>

      <style jsx>{`
        .body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0 64px 68px;
        }
        .head {
          margin-top: 48px;
        }
        .eyebrow {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--pink);
        }
        h1 {
          font-size: 82px;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-top: 24px;
        }
        .steps {
          margin-top: 48px;
        }
        .step {
          display: flex;
          gap: 36px;
          padding: 44px 0;
          border-bottom: 1px solid var(--line);
        }
        .step:last-child {
          border-bottom: 0;
        }
        .step b {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          background: var(--tint);
          color: var(--pink);
          font-size: 30px;
          font-weight: 800;
          display: grid;
          place-items: center;
          flex: none;
        }
        h3 {
          font-size: 42px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 10px;
        }
        .step p {
          font-size: 28px;
          color: var(--mute);
        }
        .note {
          margin-top: 34px;
          padding: 28px 32px;
          border-radius: 24px;
          background: var(--tint);
          font-size: 25px;
          line-height: 1.42;
          font-weight: 600;
          color: #b12e75;
        }
        .foot {
          margin-top: auto;
          padding-top: 40px;
        }
      `}</style>
    </div>
  );
}

/** Пол и тип фигуры. При смене пола выбор фигуры сбрасывается — списки разные. */
export function BodyScreen({
  lang,
  t,
  gender,
  shape,
  onGender,
  onShape,
  onNext,
  nextLabel,
}: {
  lang: KioskLang;
  t: T;
  gender: 'FEMALE' | 'MALE' | null;
  shape: string | null;
  onGender: (g: 'FEMALE' | 'MALE') => void;
  onShape: (code: string) => void;
  onNext: () => void;
  nextLabel: string;
}) {
  const shapes = KIOSK_SHAPES[gender ?? 'FEMALE'];
  return (
    <div className="body">
      <h2>{t('bodyTitle')}</h2>
      <p className="sub">{t('bodySubtitle')}</p>

      <div className="qlabel">{t('qGender')}</div>
      <div className="gender">
        {(['FEMALE', 'MALE'] as const).map((g) => (
          <button
            key={g}
            className={`gcell ${gender === g ? 'sel' : ''}`}
            onClick={() => onGender(g)}
            aria-pressed={gender === g}
          >
            {g === 'FEMALE' ? t('female') : t('male')}
          </button>
        ))}
      </div>

      <div className="qlabel">{t('qShape')}</div>
      <div className="shapes">
        {shapes.map((s) => (
          <button
            key={s.code}
            className={`shape ${shape === s.code ? 'sel' : ''}`}
            onClick={() => onShape(s.code)}
            aria-pressed={shape === s.code}
          >
            <span>{s.label[lang === 'uz' ? 1 : 0]}</span>
          </button>
        ))}
        {/* «Не знаю» есть всегда: честный ответ лучше выдуманной фигуры. */}
        <button
          className={`shape unknown ${shape === 'UNKNOWN' ? 'sel' : ''}`}
          onClick={() => onShape('UNKNOWN')}
          aria-pressed={shape === 'UNKNOWN'}
        >
          <i>?</i>
          <span>{t('dontKnow')}</span>
        </button>
      </div>

      <div className="foot">
        <button className="btn" disabled={!gender || !shape} onClick={onNext}>
          {nextLabel}
        </button>
      </div>

      <style jsx>{`
        .body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0 64px 68px;
          overflow-y: auto;
        }
        h2 {
          font-size: 64px;
          font-weight: 800;
          letter-spacing: -0.025em;
          margin-top: 40px;
        }
        .sub {
          font-size: 30px;
          line-height: 1.45;
          color: var(--mute);
          margin-top: 22px;
        }
        .qlabel {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--mute);
          margin: 46px 0 22px;
        }
        .gender {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .gcell {
          height: 150px;
          border-radius: 28px;
          background: var(--card);
          border: 3px solid transparent;
          font-size: 38px;
          font-weight: 700;
          cursor: pointer;
        }
        .gcell.sel {
          border-color: var(--pink);
          background: var(--tint);
        }
        .shapes {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .shape {
          border-radius: 28px;
          background: var(--card);
          border: 3px solid transparent;
          padding: 40px 14px;
          cursor: pointer;
          font-size: 26px;
          font-weight: 700;
          line-height: 1.2;
          min-height: 200px;
        }
        .shape.sel {
          border-color: var(--pink);
          background: var(--tint);
        }
        .shape.unknown i {
          display: grid;
          place-items: center;
          width: 104px;
          height: 104px;
          margin: 0 auto 22px;
          border-radius: 50%;
          background: var(--lav);
          color: var(--mute);
          font-style: normal;
          font-size: 52px;
          font-weight: 800;
        }
        .foot {
          margin-top: auto;
          padding-top: 48px;
        }
      `}</style>
    </div>
  );
}

/** Выбор стилей: мультивыбор, минимум один. */
export function StyleScreen({
  lang,
  t,
  selected,
  onToggle,
  onNext,
}: {
  lang: KioskLang;
  t: T;
  selected: string[];
  onToggle: (code: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="body">
      <h2>{t('styleTitle')}</h2>
      <p className="sub">{t('styleSubtitle')}</p>
      <div className="grid">
        {KIOSK_STYLES.map((style) => {
          const on = selected.includes(style.code);
          return (
            <button
              key={style.code}
              className={`tile ${on ? 'sel' : ''}`}
              onClick={() => onToggle(style.code)}
              aria-pressed={on}
            >
              <span className="chk">{on ? '✓' : ''}</span>
              <span className="label">{style.label[lang === 'uz' ? 1 : 0]}</span>
            </button>
          );
        })}
      </div>
      <div className="foot">
        <button className="btn" disabled={selected.length === 0} onClick={onNext}>
          {t('ctaCreate')}
        </button>
      </div>

      <style jsx>{`
        .body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0 64px 68px;
        }
        h2 {
          font-size: 64px;
          font-weight: 800;
          letter-spacing: -0.025em;
          margin-top: 44px;
        }
        .sub {
          font-size: 30px;
          color: var(--mute);
          margin-top: 22px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
          margin-top: 42px;
        }
        .tile {
          position: relative;
          height: 268px;
          border-radius: 30px;
          border: 3px solid transparent;
          background: var(--card);
          cursor: pointer;
          display: flex;
          align-items: flex-end;
          padding: 28px;
        }
        .tile.sel {
          border-color: var(--pink);
          background: var(--tint);
        }
        .label {
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .chk {
          position: absolute;
          top: 24px;
          left: 24px;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #fff;
          display: grid;
          place-items: center;
          font-size: 26px;
          color: var(--pink);
        }
        .tile.sel .chk {
          background: var(--pink);
          color: #fff;
        }
        .foot {
          margin-top: auto;
          padding-top: 48px;
        }
      `}</style>
    </div>
  );
}

/** Каталог зала: мультивыбор вещей. */
export function CatalogScreen({
  lang,
  t,
  items,
  selected,
  loading,
  onToggle,
  onNext,
}: {
  lang: KioskLang;
  t: T;
  items: KioskCatalogItem[];
  selected: string[];
  loading: boolean;
  onToggle: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="body">
      <h2>{t('catalogTitle')}</h2>
      <p className="sub">{t('catalogSubtitle')}</p>

      <div className="grid">
        {items.map((item) => {
          const on = selected.includes(item.id);
          return (
            <div
              key={item.id}
              className={`card ${on ? 'sel' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => onToggle(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggle(item.id);
                }
              }}
              aria-pressed={on}
            >
              <div className="ph">
                {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" />}
                <span className="mk">{on ? '✓' : ''}</span>
              </div>
              <div className="info">
                <div className="name">{item.title}</div>
                <div className="price">{item.price ? kioskMoney(item.price, lang) : ''}</div>
              </div>
            </div>
          );
        })}
        {!loading && items.length === 0 && <p className="empty">{t('catalogEmpty')}</p>}
      </div>

      <div className="foot">
        <button className="btn" disabled={selected.length === 0} onClick={onNext}>
          {selected.length > 0
            ? `${t('catalogNext')} · ${t('picked')} ${selected.length}`
            : t('catalogNext')}
        </button>
      </div>

      <style jsx>{`
        .body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0 64px 68px;
          min-height: 0;
        }
        h2 {
          font-size: 64px;
          font-weight: 800;
          letter-spacing: -0.025em;
          margin-top: 34px;
        }
        .sub {
          font-size: 30px;
          color: var(--mute);
          margin-top: 14px;
        }
        .grid {
          flex: 1;
          overflow-y: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
          align-content: start;
          margin-top: 30px;
          padding-bottom: 24px;
        }
        .card {
          /* Высота фиксирована намеренно: грид считал строку по 32px и карточка
             схлопывалась в полоску. Заодно сетка получается ровной — на витрине
             это правильнее, чем карточки разной высоты из-за длины названия. */
          height: 470px;
          display: flex;
          flex-direction: column;
          border-radius: 30px;
          overflow: hidden;
          background: #fff;
          border: 3px solid transparent;
          box-shadow: 0 10px 34px rgba(23, 23, 43, 0.07);
          cursor: pointer;
          text-align: left;
          padding: 0;
          font-family: inherit;
        }
        .card.sel {
          border-color: var(--pink);
        }
        .ph {
          position: relative;
          flex: none;
          height: 330px;
          background: var(--card);
        }
        .ph img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .mk {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: #fff;
          display: grid;
          place-items: center;
          font-size: 28px;
          color: var(--pink);
        }
        .card.sel .mk {
          background: var(--pink);
          color: #fff;
        }
        .info {
          padding: 22px 26px 26px;
        }
        .name {
          font-size: 29px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .price {
          font-size: 25px;
          font-weight: 600;
          color: var(--mute);
          margin-top: 6px;
        }
        .empty {
          grid-column: 1 / -1;
          font-size: 30px;
          color: var(--mute);
          text-align: center;
          padding: 80px 0;
        }
        .foot {
          padding-top: 24px;
        }
      `}</style>
    </div>
  );
}

/** Генерация: честный прогресс по замеренным цифрам, отмена доступна всегда. */
export function GeneratingScreen({
  t,
  elapsed,
  failed,
  reason,
  onCancel,
  onRetry,
}: {
  t: T;
  elapsed: number;
  failed: boolean;
  /** Техническая причина: без неё сбой у стенда невозможно разобрать потом. */
  reason?: string | null;
  onCancel: () => void;
  onRetry: () => void;
}) {
  // Медиана замера — 27 c, максимум 34 c (docs/kiosk-benchmark.md). Прогресс идёт
  // к 90% за 30 секунд и там притормаживает, чтобы не врать «почти готово».
  const progress = failed ? 100 : Math.min(90, Math.round((elapsed / 30) * 90));
  const stages = [t('gen1'), t('gen2'), t('gen3'), t('gen4')];
  const stage = stages[Math.min(stages.length - 1, Math.floor(elapsed / 8))];

  return (
    <div className="body">
      <div className="center">
        <h2>{failed ? t('genFailed') : t('genTitle')}</h2>
        <div className="stat">{failed ? t('genContinueInApp') : elapsed > 45 ? t('genAlmost') : stage}</div>
        <div className="progress">
          <i style={{ width: `${progress}%` }} />
        </div>
        {failed && reason && <div className="reason">{reason}</div>}
      </div>
      <div className="foot">
        {failed ? (
          <button className="btn" onClick={onRetry}>
            {t('genRetry')}
          </button>
        ) : null}
        <button className="btn ghost" onClick={onCancel}>
          {t('cancel')}
        </button>
      </div>

      <style jsx>{`
        .body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0 64px 68px;
        }
        .center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        h2 {
          font-size: 64px;
          font-weight: 800;
          letter-spacing: -0.025em;
        }
        .stat {
          font-size: 30px;
          font-weight: 600;
          color: var(--mute);
          margin-top: 22px;
          min-height: 44px;
        }
        .progress {
          margin-top: 44px;
          width: 420px;
          height: 8px;
          border-radius: 8px;
          background: var(--lav);
          overflow: hidden;
        }
        .progress i {
          display: block;
          height: 100%;
          background: var(--pink);
          transition: width 0.9s linear;
        }
        .reason {
          margin-top: 28px;
          font-size: 20px;
          color: var(--mute);
          font-family: ui-monospace, monospace;
        }
        .foot {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
      `}</style>
    </div>
  );
}

/** Результат: образ, QR и две кнопки. */
export function ResultScreen({
  lang,
  t,
  look,
  shareUrl,
  onRegenerate,
  onCollect,
}: {
  lang: KioskLang;
  t: T;
  look: KioskLook;
  shareUrl: string | null;
  onRegenerate: () => void;
  onCollect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hintShown, setHintShown] = useState(false);

  useEffect(() => {
    if (!shareUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, shareUrl, { width: 176, margin: 0 }).catch(() => {});
  }, [shareUrl]);

  return (
    <div className="body">
      <div className="stage">
        {look.resultImageUrl && <img src={look.resultImageUrl} alt="" />}
        <div className="tag">{t('resultTag')}</div>
        <div className="meta">
          {look.items.length} {t('itemsCount')} · {kioskMoney(look.totalPrice, lang)}
        </div>
      </div>

      <div className="qrcard">
        <div className="qs">{shareUrl ? <canvas ref={canvasRef} /> : null}</div>
        <div className="qt">
          <b>{t('qrTitle')}</b>
          <p>{hintShown ? t('downloadHint') : t('qrSubtitle')}</p>
          <button className="dl" onClick={() => setHintShown(true)}>
            ↓ {t('download')}
          </button>
        </div>
      </div>

      <div className="row">
        <button className="btn ghost" onClick={onRegenerate} disabled={!look.canRegenerate}>
          {look.canRegenerate ? t('regenerate') : t('continueInApp')}
        </button>
        <button className="btn wide" onClick={onCollect}>
          {t('collect')}
          <small>{kioskMoney(look.totalPrice, lang)}</small>
        </button>
      </div>

      <style jsx>{`
        .body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0 64px 68px;
          min-height: 0;
        }
        .stage {
          flex: 1;
          position: relative;
          border-radius: 36px;
          background: var(--card);
          overflow: hidden;
          margin-top: 26px;
          min-height: 0;
        }
        .stage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .tag {
          position: absolute;
          top: 32px;
          left: 32px;
          padding: 14px 26px;
          border-radius: 100px;
          background: var(--pink);
          color: #fff;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .meta {
          position: absolute;
          left: 32px;
          bottom: 32px;
          font-size: 28px;
          font-weight: 600;
          color: #fff;
          text-shadow: 0 2px 18px rgba(0, 0, 0, 0.5);
        }
        .qrcard {
          display: flex;
          gap: 28px;
          align-items: center;
          margin-top: 24px;
          padding: 26px 30px;
          border-radius: 30px;
          background: #fff;
          border: 1px solid var(--line);
          box-shadow: 0 10px 34px rgba(23, 23, 43, 0.07);
        }
        .qs {
          width: 176px;
          height: 176px;
          flex: none;
          display: grid;
          place-items: center;
          border-radius: 20px;
          border: 1px solid var(--line);
        }
        .qt b {
          display: block;
          font-size: 34px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }
        .qt p {
          font-size: 24px;
          line-height: 1.35;
          color: var(--mute);
          margin-bottom: 16px;
        }
        .dl {
          border: 0;
          background: var(--lav);
          font-size: 25px;
          font-weight: 700;
          padding: 18px 30px;
          border-radius: 100px;
          cursor: pointer;
        }
        .row {
          display: flex;
          gap: 18px;
          margin-top: 22px;
        }
        .row :global(.btn) {
          flex: 1;
        }
        .row :global(.btn.wide) {
          flex: 1.45;
        }
      `}</style>
    </div>
  );
}

/** Состав образа и код продавца. */
export function BuyScreen({
  lang,
  t,
  look,
  code,
  onBack,
}: {
  lang: KioskLang;
  t: T;
  look: KioskLook;
  code: string | null;
  onBack: () => void;
}) {
  return (
    <div className="body">
      <h2>{t('buyTitle')}</h2>
      <p className="sub">{t('buySubtitle')}</p>

      <div className="items">
        {look.items.map((item) => (
          <div className="item" key={item.productId}>
            <div className="thumb">{item.imageUrl && <img src={item.imageUrl} alt="" />}</div>
            <div className="info">
              <div className="name">{item.title}</div>
              <div className="meta">
                {t('sizeLabel')} {item.size ?? '—'} · <em>{t('inStock')}</em>
              </div>
            </div>
            <div className="price">{item.price ? kioskMoney(item.price, lang) : ''}</div>
          </div>
        ))}
      </div>

      <div className="total">
        <span>{t('total')}</span>
        <b>{kioskMoney(look.totalPrice, lang)}</b>
      </div>

      <div className="codecard">
        <span>{t('codeLabel')}</span>
        <b>{code ?? '…'}</b>
      </div>
      <button className="btn ghost" onClick={onBack}>
        {t('backToLook')}
      </button>

      <style jsx>{`
        .body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0 64px 68px;
          min-height: 0;
        }
        h2 {
          font-size: 64px;
          font-weight: 800;
          letter-spacing: -0.025em;
          margin-top: 34px;
        }
        .sub {
          font-size: 30px;
          color: var(--mute);
          margin-top: 14px;
        }
        .items {
          flex: 1;
          overflow-y: auto;
          margin-top: 26px;
          min-height: 0;
        }
        .item {
          display: flex;
          gap: 26px;
          align-items: center;
          padding: 22px 0;
          border-bottom: 1px solid var(--line);
        }
        .thumb {
          width: 112px;
          height: 138px;
          border-radius: 20px;
          background: var(--card);
          overflow: hidden;
          flex: none;
        }
        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .info {
          flex: 1;
          min-width: 0;
        }
        .name {
          font-size: 32px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .meta {
          font-size: 25px;
          color: var(--mute);
          margin-top: 8px;
        }
        .meta em {
          font-style: normal;
          color: #12b76a;
          font-weight: 700;
        }
        .price {
          font-size: 32px;
          font-weight: 800;
          white-space: nowrap;
        }
        .total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 28px 0 22px;
          border-top: 2px solid var(--ink);
        }
        .total span {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--mute);
        }
        .total b {
          font-size: 50px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .codecard {
          padding: 30px 36px;
          border-radius: 28px;
          background: var(--lav);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin-bottom: 20px;
        }
        .codecard span {
          font-size: 26px;
          font-weight: 600;
          color: var(--mute);
          max-width: 520px;
        }
        .codecard b {
          font-size: 46px;
          font-weight: 800;
          letter-spacing: 0.14em;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
