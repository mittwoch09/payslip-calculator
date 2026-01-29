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
        <div className="bg-slate-800 rounded-xl p-6 text-center">
          <p className="text-yellow-400 mb-4">{t('ocr.noCamera')}</p>
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
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-blue-400 active:bg-blue-100"
              aria-label={t('ocr.capture')}
            />
          )}
        </div>
      )}

      <label className="block w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 text-center cursor-pointer font-medium">
        {t('ocr.upload')}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
