import React, { useCallback, useEffect, useRef, useState } from 'react';
import { kioskText, type KioskLang } from '@/lib/kiosk-i18n';
import { confirmPhoto, uploadPhoto, type KioskPhotoValidation } from '@/lib/kiosk-api';

/**
 * Экран камеры. Снимаем ТОЛЬКО лицо: в полный рост у стойки не сфотографируешь,
 * да и не нужно — фигуру человек выбирает сам на следующем шаге.
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

  const t = (key: Parameters<typeof kioskText>[0]) => kioskText(key, lang);

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
    if (!video || !video.videoWidth) return;

    // Кадрируем в квадрат по центру — ровно то, что человек видел в круге.
    const side = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      side,
      side,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
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
      const result = await confirmPhoto(sessionId, blobKey);
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

      <div className="camStage">
        {cameraError ? (
          <div className="camError">{t('camNoAccess')}</div>
        ) : captured && shot ? (
          <div className="shotCircle">
            <img src={shot.url} alt="" />
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted />
            <div className="faceRing" />
            {phase === 'countdown' && countdown > 0 && <div className="countdown">{countdown}</div>}
          </>
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
          position: relative;
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1); /* зеркало: человек видит себя как в зеркале, иначе движения путают */
        }
        .faceRing {
          position: relative;
          width: 560px;
          height: 560px;
          border-radius: 50%;
          border: 7px dashed var(--pink);
          box-shadow: 0 0 0 9999px rgba(255, 255, 255, 0.74);
        }
        .countdown {
          position: absolute;
          font-size: 300px;
          font-weight: 800;
          color: var(--pink);
        }
        .shotCircle {
          width: 560px;
          height: 560px;
          border-radius: 50%;
          overflow: hidden;
          border: 7px solid var(--pink);
        }
        .shotCircle img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
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
