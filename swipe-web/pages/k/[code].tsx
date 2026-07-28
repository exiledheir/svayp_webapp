import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';

/**
 * Страница, которая открывается по QR с экрана киоска — уже на телефоне покупателя.
 *
 * Ни ключа устройства, ни аккаунта здесь нет и быть не может, поэтому данные берём
 * из публичной выдачи по коду. Фото лица сюда не приходит никогда: наружу уходят
 * только картинка образа и состав.
 */

interface ShareItem {
  productId: string;
  title: string;
  size: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
}

interface Share {
  code: string;
  storeLabel: string | null;
  resultImageUrl: string | null;
  items: ShareItem[];
  totalPrice: number;
  expiresAt: string | null;
}

const money = (value: number) => `${value.toLocaleString('ru-RU').replace(/,/g, ' ')} сум`;

const APP_SCHEME = 'com.svaypai.app';
const STORE_ANDROID = 'https://play.google.com/store/apps/details?id=com.svayp.app';
const STORE_IOS = 'https://apps.apple.com/app/libas/id0';

/** Пробуем открыть приложение; если его нет — уводим в стор. */
function openInApp(code: string): void {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const store = isIos ? STORE_IOS : STORE_ANDROID;
  const started = Date.now();

  const fallback = setTimeout(() => {
    // Если приложение открылось, вкладка ушла в фон и таймер отстанет — по разнице
    // времени понимаем, что перехода не случилось.
    if (Date.now() - started < 1600 && !document.hidden) window.location.href = store;
  }, 1200);

  window.location.href = `${APP_SCHEME}://kiosk/${encodeURIComponent(code)}`;
  window.addEventListener('pagehide', () => clearTimeout(fallback), { once: true });
}

export default function KioskSharePage() {
  const router = useRouter();
  const { code } = router.query;

  const [share, setShare] = useState<Share | null>(null);
  const [error, setError] = useState<'expired' | 'notfound' | 'network' | null>(null);

  useEffect(() => {
    if (!code || typeof code !== 'string') return;
    axios
      .get(`/proxy/kiosk/share/${encodeURIComponent(code)}`)
      .then((res) => {
        const payload = res.data?.data?.data ?? res.data?.data ?? res.data;
        setShare(payload as Share);
      })
      .catch((err) => {
        const status = err?.response?.status;
        setError(status === 410 ? 'expired' : status === 404 ? 'notfound' : 'network');
      });
  }, [code]);

  return (
    <>
      <Head>
        <title>LIBAS — ваш образ</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="page">
        <div className="mark">
          LIB<i>Λ</i>S
        </div>

        {error && (
          <div className="state">
            <h1>
              {error === 'expired'
                ? 'Ссылка больше не действует'
                : error === 'notfound'
                  ? 'Образ не найден'
                  : 'Не удалось загрузить образ'}
            </h1>
            <p>
              {error === 'expired'
                ? 'Образы хранятся неделю. Загляните в магазин ещё раз — соберём новый.'
                : 'Проверьте код на экране киоска.'}
            </p>
          </div>
        )}

        {!error && !share && <div className="state skeleton" />}

        {share && (
          <>
            {share.resultImageUrl && (
              <div className="hero">
                <img src={share.resultImageUrl} alt="Ваш образ" />
              </div>
            )}

            <div className="head">
              <h1>Ваш образ</h1>
              <p>
                {share.storeLabel ? `${share.storeLabel} · ` : ''}
                {share.items.length} вещи · {money(share.totalPrice)}
              </p>
            </div>

            <div className="items">
              {share.items.map((item) => (
                <div className="item" key={item.productId}>
                  <div className="thumb">{item.imageUrl && <img src={item.imageUrl} alt="" />}</div>
                  <div className="info">
                    <div className="name">{item.title}</div>
                    <div className="meta">Размер {item.size ?? '—'}</div>
                  </div>
                  <div className="price">{item.price ? money(item.price) : ''}</div>
                </div>
              ))}
            </div>

            <div className="code">
              Код для продавца: <b>{share.code}</b>
            </div>

            {/* Deep link в приложение с фолбэком в стор: если LIBAS не установлен,
                схема com.svaypai.app просто не сработает и через секунду уедем в магазин
                приложений — человек в любом случае не остаётся на пустом экране. */}
            <button className="cta" onClick={() => openInApp(share.code)}>
              Открыть в приложении
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        .page {
          max-width: 520px;
          margin: 0 auto;
          padding: 24px 20px 48px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #17172b;
        }
        .mark {
          font-weight: 700;
          letter-spacing: 0.3em;
          font-size: 15px;
          margin-bottom: 20px;
        }
        .mark i {
          font-style: normal;
          font-weight: 500;
        }
        .hero {
          border-radius: 24px;
          overflow: hidden;
          background: #f8f7fa;
          aspect-ratio: 3 / 4;
        }
        .hero img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .head {
          margin-top: 20px;
        }
        h1 {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .head p {
          color: #8e8a99;
          margin: 6px 0 0;
          font-size: 15px;
        }
        .items {
          margin-top: 20px;
        }
        .item {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #efedf3;
        }
        .thumb {
          width: 56px;
          height: 70px;
          border-radius: 12px;
          overflow: hidden;
          background: #f8f7fa;
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
          font-weight: 600;
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .meta {
          color: #8e8a99;
          font-size: 13px;
          margin-top: 2px;
        }
        .price {
          font-weight: 700;
          font-size: 14px;
          white-space: nowrap;
        }
        .code {
          margin-top: 20px;
          padding: 16px 18px;
          border-radius: 16px;
          background: #f1eef5;
          font-size: 14px;
          color: #8e8a99;
        }
        .code b {
          color: #17172b;
          font-size: 20px;
          letter-spacing: 0.12em;
          margin-left: 6px;
        }
        .cta {
          display: block;
          width: 100%;
          margin-top: 20px;
          padding: 16px;
          border: 0;
          border-radius: 100px;
          background: #f4479b;
          color: #fff;
          text-align: center;
          font-size: 16px;
          font-family: inherit;
          font-weight: 700;
          cursor: pointer;
        }
        .state {
          padding: 60px 0;
          text-align: center;
        }
        .state p {
          color: #8e8a99;
          margin-top: 10px;
        }
        .skeleton {
          height: 340px;
          border-radius: 24px;
          background: linear-gradient(90deg, #f4f3f7, #ecebf1, #f4f3f7);
          background-size: 200% 100%;
          animation: shimmer 1.4s linear infinite;
        }
        @keyframes shimmer {
          from {
            background-position: 200% 0;
          }
          to {
            background-position: -200% 0;
          }
        }
      `}</style>
    </>
  );
}
