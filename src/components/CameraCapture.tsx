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
        <div className="bg-amber-100 border-2 border-black p-8 text-center">
          <p className="text-black text-lg font-bold">{t('ocr.noCamera')}</p>
        </div>
      ) : (
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
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full border-4 border-black active:bg-gray-100 shadow-[4px_4px_0_black]"
              aria-label={t('ocr.capture')}
            />
          )}
        </div>
      )}

      <label className="block w-full bg-white border-2 border-black text-black min-h-14 flex items-center justify-center cursor-pointer font-bold text-lg shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]">
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
