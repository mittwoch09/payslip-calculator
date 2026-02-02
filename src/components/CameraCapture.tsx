import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCamera } from '../hooks/useCamera';

interface CameraCaptureProps {
  onSubmit: (sources: (string | File)[]) => void;
}

interface QueueItem {
  id: string;
  source: string | File;
  thumbUrl: string;
}

export default function CameraCapture({ onSubmit }: CameraCaptureProps) {
  const { t } = useTranslation();
  const { videoRef, stream, error, startCamera, stopCamera, capturePhoto } = useCamera();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    return () => {
      stopCamera();
      // Cleanup all blob URLs
      queue.forEach(item => {
        if (item.thumbUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.thumbUrl);
        }
      });
    };
  }, [stopCamera]);

  const handleCapture = () => {
    const photo = capturePhoto();
    if (photo) {
      // Do NOT stop camera - allow multiple captures
      const newItem: QueueItem = {
        id: Date.now().toString(),
        source: photo,
        thumbUrl: photo // data URL is self-contained
      };
      setQueue(prev => [...prev, newItem]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: QueueItem[] = files.map(file => ({
      id: Date.now().toString() + Math.random(), // Ensure uniqueness
      source: file,
      thumbUrl: URL.createObjectURL(file)
    }));
    setQueue(prev => [...prev, ...newItems]);

    // Reset input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    setQueue(prev => {
      const item = prev.find(q => q.id === id);
      if (item && item.thumbUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.thumbUrl);
      }
      return prev.filter(q => q.id !== id);
    });
  };

  const handleProcess = () => {
    onSubmit(queue.map(q => q.source));
  };

  return (
    <div className="space-y-4">
      {cameraActive && !error ? (
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
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-violet-100 border-2 border-black p-4 space-y-1">
            <p className="text-black font-bold text-sm">{t('ocr.scanTip')}</p>
            <p className="text-gray-600 text-xs">{t('ocr.scanTipDesc')}</p>
          </div>

          {/* Primary: open native camera directly (single capture) */}
          <label className="block w-full bg-black text-white border-2 border-black min-h-14 flex items-center justify-center cursor-pointer font-bold text-lg shadow-[3px_3px_0_#7c3aed] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] gap-2">
            {t('ocr.takePhoto')}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Live camera viewfinder */}
          <button
            onClick={async () => {
              await startCamera();
              setCameraActive(true);
            }}
            className="w-full bg-white text-black border-2 border-black min-h-14 font-bold text-lg shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
          >
            {t('ocr.liveCamera')}
          </button>

          {/* Pick from gallery or files (multiple) */}
          <label className="block w-full bg-white text-black border-2 border-black min-h-14 flex items-center justify-center cursor-pointer font-bold text-lg shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]">
            {t('ocr.upload')}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Thumbnail strip */}
      {queue.length > 0 && (
        <div className="flex overflow-x-auto gap-2 py-2">
          {queue.map(item => (
            <div key={item.id} className="relative flex-shrink-0">
              <img
                src={item.thumbUrl}
                alt=""
                className="w-16 h-16 object-cover border-2 border-black"
              />
              <button
                onClick={() => handleRemove(item.id)}
                className="absolute top-0 right-0 bg-black text-white w-5 h-5 text-xs flex items-center justify-center"
                aria-label={t('ocr.removeImage')}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Process button */}
      {queue.length > 0 && (
        <button
          onClick={handleProcess}
          className="w-full bg-black text-white border-2 border-black min-h-14 font-bold text-lg shadow-[3px_3px_0_#7c3aed] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
        >
          {t('ocr.processImages', { count: queue.length })}
        </button>
      )}
    </div>
  );
}
