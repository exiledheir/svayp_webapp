import React, { useEffect, useRef, useState } from 'react';
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

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS притворяется Mac'ом, но у Mac нет тача.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Картинка образа файлом — для «Скачать» и «Поделиться». Берём через свой
 * /api/proxy-image: хранилище картинок не отдаёт CORS, и fetch напрямую упал бы.
 */
async function fetchLookFile(url: string, code: string): Promise<File> {
  const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const blob = await res.blob();
  const type = blob.type || 'image/jpeg';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  return new File([blob], `libas-${code}.${ext}`, { type });
}

const canShareFile = (file: File) =>
  typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

/** Пользователь закрыл системное окно «Поделиться» — это не ошибка. */
const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

export default function KioskSharePage() {
  const router = useRouter();
  const { code } = router.query;

  const [share, setShare] = useState<Share | null>(null);
  const [error, setError] = useState<'expired' | 'notfound' | 'network' | null>(null);

  // Файл образа качаем сразу, как пришли данные: на iPhone окно «Поделиться»
  // открывается только прямо по нажатию, ждать сеть внутри обработчика нельзя.
  const [file, setFile] = useState<File | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

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

  useEffect(() => {
    if (!share?.resultImageUrl) return;
    let cancelled = false;
    fetchLookFile(share.resultImageUrl, share.code)
      .then((f) => !cancelled && setFile(f))
      .catch(() => {
        // Не скачалось — кнопки работают запасным путём (см. ниже).
      });
    return () => {
      cancelled = true;
    };
  }, [share]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  /**
   * «Скачать». Android: файл сразу в «Загрузки» — Галерея его видит. iPhone:
   * Safari не умеет класть в «Фото» напрямую, поэтому открываем системное окно
   * с картинкой — там «Сохранить изображение» кладёт её в «Фото».
   */
  const onDownload = async () => {
    if (!share?.resultImageUrl) return;
    if (file && isIos() && canShareFile(file)) {
      try {
        await navigator.share({ files: [file] });
      } catch (err) {
        if (!isAbort(err)) showToast('Не получилось сохранить фото');
      }
      return;
    }
    if (file) {
      const href = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = href;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      showToast('Фото сохранено');
      return;
    }
    // Файл не скачался: открываем картинку — сохранить можно долгим нажатием.
    window.open(share.resultImageUrl, '_blank', 'noopener');
  };

  /** «Поделиться»: системное окно с картинкой; без неё — со ссылкой на страницу. */
  const onShare = async () => {
    if (!share) return;
    const url = window.location.href;
    const text = 'Мой образ из LIBAS';
    try {
      if (file && canShareFile(file)) {
        await navigator.share({ files: [file], title: text, text: `${text} — ${url}` });
      } else if (typeof navigator.share === 'function') {
        await navigator.share({ title: text, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Ссылка скопирована');
      }
    } catch (err) {
      if (!isAbort(err)) showToast('Не получилось поделиться');
    }
  };

  return (
    <>
      <Head>
        <title>LIBAS — ваш образ</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="page">
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

            {share.resultImageUrl && (
              <div className="actions">
                <button className="cta" onClick={onDownload}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" />
                  </svg>
                  Скачать
                </button>
                <button className="cta ghost" onClick={onShare}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M6 12v7h12v-7" />
                  </svg>
                  Поделиться
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      <style jsx>{`
        .page {
          max-width: 520px;
          margin: 0 auto;
          padding: 24px 20px 48px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #17172b;
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
        .actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }
        .cta {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          border: 2px solid #f4479b;
          border-radius: 100px;
          background: #f4479b;
          color: #fff;
          font-size: 16px;
          font-family: inherit;
          font-weight: 700;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .cta:active {
          transform: scale(0.98);
        }
        .cta.ghost {
          background: #fff;
          color: #f4479b;
        }
        .cta svg {
          width: 20px;
          height: 20px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .toast {
          position: fixed;
          left: 50%;
          bottom: calc(24px + env(safe-area-inset-bottom));
          transform: translateX(-50%);
          padding: 12px 20px;
          border-radius: 100px;
          background: #17172b;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          white-space: nowrap;
          z-index: 10;
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
