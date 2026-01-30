import { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Set up PDF.js worker
GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

async function renderPdfPageToImage(page: any, scale: number = 4): Promise<Blob> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    });
  });
}

async function processPdf(file: File, onProgress: (progress: number) => void): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const allText: string[] = [];

  const worker = await createWorker(['eng', 'chi_sim']);

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const imageBlob = await renderPdfPageToImage(page);

    const { data: { text } } = await worker.recognize(imageBlob);
    allText.push(text);

    onProgress(Math.round((i / numPages) * 100));
  }

  await worker.terminate();
  return allText.join('\n');
}

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
      // Check if it's a PDF file
      if (imageSource instanceof File && imageSource.type === 'application/pdf') {
        const text = await processPdf(imageSource, setProgress);
        setResult(text);
        return text;
      }

      // Process as image
      const worker = await createWorker(['eng', 'chi_sim'], undefined, {
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
