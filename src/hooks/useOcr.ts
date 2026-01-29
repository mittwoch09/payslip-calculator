import { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';

export function useOcr() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(async (imageSource: string | File) => {
    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const worker = await createWorker('eng', undefined, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data: { text } } = await worker.recognize(imageSource);
      await worker.terminate();
      setResult(text);
      return text;
    } catch {
      setError('OCR processing failed');
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  return { processing, progress, result, error, processImage };
}
