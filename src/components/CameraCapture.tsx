import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

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
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      queue.forEach(item => {
        if (item.thumbUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.thumbUrl);
        }
      });
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: QueueItem[] = files.map(file => ({
      id: Date.now().toString() + Math.random(),
      source: file,
      thumbUrl: URL.createObjectURL(file)
    }));
    setQueue(prev => [...prev, ...newItems]);

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
      <div className="bg-violet-100 border-2 border-black p-4 space-y-1">
        <p className="text-black font-bold text-sm">{t('ocr.scanTip')}</p>
        <p className="text-gray-600 text-xs">{t('ocr.scanTipDesc')}</p>
      </div>

      {/* Primary: open native camera directly */}
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
