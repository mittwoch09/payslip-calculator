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
        <div className="bg-slate-800 rounded-xl p-8 text-center">
          <p className="text-yellow-300 text-lg font-bold">{t('ocr.noCamera')}</p>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full aspect-[4/3] object-cover"
          />
          {stream && (
            <button
              onClick={handleCapture}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full border-[6px] border-blue-500 active:bg-blue-100 shadow-2xl"
              aria-label={t('ocr.capture')}
            />
          )}
        </div>
      )}

      <label className="block w-full bg-slate-700 active:bg-slate-600 text-white rounded-xl min-h-14 flex items-center justify-center cursor-pointer font-bold text-lg">
        {t('ocr.upload')}
        <input
          type="file"
          accept="image/*,.pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
