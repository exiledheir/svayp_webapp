import React, { useCallback, useEffect, useRef, useState } from 'react';
import { kioskText, type KioskLang } from '@/lib/kiosk-i18n';
import { confirmPhoto, uploadPhoto, type KioskPhotoValidation } from '@/lib/kiosk-api';

/**
 * Экран камеры. Снимаем кадр камеры ЦЕЛИКОМ, без обрезки: квадрат «под круг»
 * срезал плечи и волосы, а модели нужен весь человек, какой попал в кадр. Превью
 * показывает ровно тот кадр, что уйдёт на генерацию; овал — подсказка, где лицо.
 *
 * Живого потока камеры в проекте раньше не было нигде (везде нативный файловый
 * пикер), поэтому getUserMedia здесь написан с нуля.
 */

interface Props {
  lang: KioskLang;
  sessionId: string;
  onConfirmed: () => void;
  onEvent: (name: string, props?: Record<string, unknown>) => void;
}

type Phase = 'live' | 'countdown' | 'captured' | 'uploading';

export default function CameraStep({ lang, sessionId, onConfirmed, onEvent }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>('live');
  const [countdown, setCountdown] = useState(3);
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [validation, setValidation] = useState<KioskPhotoValidation | null>(null);
  const [uploadError, setUploadError] = useState(false);
  /** Пропорции кадра камеры (ш/в) и размер области под превью — рамка вписывается без обрезки. */
  const [ratio, setRatio] = useState(3 / 4);
  const [stageBox, setStageBox] = useState({ w: 0, h: 0 });
  const stageRef = useRef<HTMLDivElement | null>(null);
  /** Экран уже закрыт: запоздавший ответ загрузки не должен переключать экраны. */
  const aliveRef = useRef(true);
  useEffect(
    () => () => {
      aliveRef.current = false;
    },
    [],
  );

  // После «Переснять» <video> создаётся заново: поток подключаем к каждому новому
  // элементу, иначе живое превью чёрное, а снимок не получается.
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) el.srcObject = streamRef.current;
  }, []);

  const t = (key: Parameters<typeof kioskText>[0]) => kioskText(key, lang);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageBox({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Рамка превью = пропорции камеры, вписанные в свободное место (как object-fit: contain).
  const frameW = stageBox.w && stageBox.h ? Math.min(stageBox.w, stageBox.h * ratio) : 0;
  const frameH = frameW ? frameW / ratio : 0;

  // ── поток камеры ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1440 } } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        if (!cancelled) setCameraError(true);
      });

    return () => {
      cancelled = true;
      // Гасим камеру при уходе с экрана: индикатор записи в зале не должен гореть впустую.
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // ── съёмка ────────────────────────────────────────────────────────────────
  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      // Камера ещё не дала кадр — возвращаем кнопку «Снять», а не зависаем на отсчёте.
      setPhase('live');
      return;
    }

    // Весь кадр без обрезки — ровно то, что человек видел в рамке.
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setPhase('live');
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setPhase('live');
          return;
        }
        setShot({ url: URL.createObjectURL(blob), blob });
        setPhase('captured');
        onEvent('kiosk_photo_taken');
      },
      'image/jpeg',
      0.92,
    );
  }, [onEvent]);

  const startCountdown = () => {
    setPhase('countdown');
    setCountdown(3);
  };

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown === 0) {
      capture();
      return;
    }
    const timer = setTimeout(() => setCountdown((n) => n - 1), 900);
    return () => clearTimeout(timer);
  }, [phase, countdown, capture]);

  const retake = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    setValidation(null);
    setUploadError(false);
    setPhase('live');
    onEvent('kiosk_photo_retaken');
  };

  const confirm = async () => {
    if (!shot) return;
    setPhase('uploading');
    setUploadError(false);
    try {
      const blobKey = await uploadPhoto(sessionId, shot.blob);
      if (!aliveRef.current) return;
      const result = await confirmPhoto(sessionId, blobKey);
      if (!aliveRef.current) return;
      setValidation(result);
      // Единственная блокирующая проверка — лица нет вообще. Остальное подсказка:
      // человек стоит у стенда, и придираться к его снимку мы не вправе.
      if (!result.faceFound) {
        setPhase('captured');
        return;
      }
      onEvent('kiosk_photo_confirmed', { faceRatio: result.faceRatio, tooDark: result.tooDark });
      onConfirmed();
    } catch {
      if (!aliveRef.current) return;
      setUploadError(true);
      setPhase('captured');
    }
  };

  const hintText = (): string | null => {
    if (uploadError) return t('uploadFailed');
    if (!validation) return null;
    switch (validation.hint) {
      case 'FACE_NOT_FOUND':
        return t('faceNotFound');
      case 'MULTIPLE_FACES':
        return t('faceMultiple');
      case 'MOVE_CLOSER':
        return t('faceCloser');
      case 'TOO_DARK':
        return t('faceTooDark');
      default:
        return null;
    }
  };

  const captured = phase === 'captured' || phase === 'uploading';

  return (
    <div className="camWrap">
      <div className="camHint">
        <b>{captured ? t('camDone') : t('camAim')}</b>
        <span>{hintText() ?? (captured ? t('camDoneHint') : t('camLook'))}</span>
      </div>

      <div className="camStage" ref={stageRef}>
        {cameraError ? (
          <div className="camError">{t('camNoAccess')}</div>
        ) : (
          <div className="frame" style={{ width: frameW || undefined, height: frameH || undefined }}>
            {captured && shot ? (
              <img src={shot.url} alt="" />
            ) : (
              <>
                <video
                  ref={attachVideo}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
                  }}
                />
                <div className="faceGuide" />
                {phase === 'countdown' && countdown > 0 && <div className="countdown">{countdown}</div>}
              </>
            )}
          </div>
        )}
      </div>

      <div className="camFooter">
        <div className="privLine">{t('privacyShort')}</div>
        {captured ? (
          <div className="camRow">
            <button className="btn ghost" onClick={retake} disabled={phase === 'uploading'}>
              {t('retake')}
            </button>
            <button
              className="btn"
              onClick={confirm}
              disabled={phase === 'uploading' || validation?.faceFound === false}
            >
              {phase === 'uploading' ? '…' : t('done')}
            </button>
          </div>
        ) : (
          <button className="btn" onClick={startCountdown} disabled={cameraError || phase === 'countdown'}>
            {t('shoot')}
          </button>
        )}
      </div>

      <style jsx>{`
        .camWrap {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .camHint {
          text-align: center;
          padding: 0 64px;
        }
        .camHint b {
          display: block;
          font-size: 46px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .camHint span {
          display: block;
          font-size: 28px;
          color: var(--mute);
          margin-top: 14px;
          min-height: 40px;
        }
        .camStage {
          flex: 1;
          min-height: 0;
          margin: 26px 64px;
          position: relative;
          display: grid;
          place-items: center;
        }
        .frame {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 36px;
          overflow: hidden;
          background: var(--card);
        }
        /* Рамка повторяет пропорции камеры, поэтому cover здесь ничего не срезает. */
        video,
        .frame img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1); /* зеркало: человек видит себя как в зеркале, иначе движения путают */
        }
        .faceGuide {
          position: absolute;
          left: 50%;
          top: 8%;
          width: 30%;
          aspect-ratio: 3 / 4;
          transform: translateX(-50%);
          border-radius: 50%;
          border: 6px dashed var(--pink);
          opacity: 0.85;
          pointer-events: none;
        }
        .countdown {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          font-size: 300px;
          font-weight: 800;
          color: var(--pink);
          text-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
        }
        .camError {
          font-size: 32px;
          color: var(--mute);
          text-align: center;
          padding: 0 80px;
        }
        .camFooter {
          padding: 0 64px 68px;
        }
        .privLine {
          text-align: center;
          font-size: 24px;
          font-weight: 600;
          color: var(--mute);
          margin-bottom: 26px;
        }
        .camRow {
          display: flex;
          gap: 18px;
        }
        .camRow :global(.btn) {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
