import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCamera } from '../hooks/useCamera';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onFileUpload: (file: File) => void;
}

export default function CameraCapture({ onCapture, onFileUpload }: CameraCaptureProps) {
  const { t } = useTranslation();
  const { videoRef, stream, error, startCamera, stopCamera, capturePhoto } = useCamera();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = () => {
    const photo = capturePhoto();
    if (photo) {
      stopCamera();
      onCapture(photo);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <div className="space-y-4">
          <div className="bg-violet-100 border-2 border-black p-4 space-y-1">
            <p className="text-black font-bold text-sm">{t('ocr.scanTip')}</p>
            <p className="text-gray-600 text-xs">{t('ocr.scanTipDesc')}</p>
          </div>

          {/* Primary: open native camera directly */}
          <label className="block w-full bg-black text-white border-2 border-black min-h-14 flex items-center justify-center cursor-pointer font-bold text-lg shadow-[3px_3px_0_#7c3aed] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] gap-2">
            📷 {t('ocr.takePhoto')}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Secondary: pick from gallery or files */}
          <label className="block w-full bg-white text-black border-2 border-black min-h-14 flex items-center justify-center cursor-pointer font-bold text-lg shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]">
            {t('ocr.upload')}
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden border-2 border-black bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full aspect-[4/3] object-cover"
            />
            {stream && (
              <button
                onClick={handleCapture}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full border-3 border-black active:bg-gray-100 shadow-[3px_3px_0_black]"
                aria-label={t('ocr.capture')}
              />
            )}
          </div>

          <label className="block w-full bg-white border-2 border-black text-black min-h-14 flex items-center justify-center cursor-pointer font-bold text-lg shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]">
            {t('ocr.upload')}
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </>
      )}
    </div>
  );
}
