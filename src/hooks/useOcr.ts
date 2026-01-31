import { useState, useCallback } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFPageProxy } from 'pdfjs-dist';
import type { Line } from '@gutenye/ocr-common';

export type { Line as OcrLine };

export interface OcrResult {
  text: string;
  lines: Line[];
}

// Set up PDF.js worker
GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface OcrEngine {
  detect(image: string): Promise<Line[]>;
}

// Singleton OCR instance
let ocrInstance: OcrEngine | null = null;
let ocrInitPromise: Promise<OcrEngine> | null = null;

async function getOcr() {
  if (ocrInstance) return ocrInstance;
  if (ocrInitPromise) return ocrInitPromise;

  ocrInitPromise = (async () => {
    const ort = await import('onnxruntime-web');
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/';
    const { default: Ocr } = await import('@gutenye/ocr-browser');
    const ocr = await Ocr.create({
      models: {
        detectionPath: '/models/en_det.onnx',
        recognitionPath: '/models/en_rec.onnx',
        dictionaryPath: '/models/en_dict.txt',
      },
    });
    ocrInstance = ocr;
    return ocr;
  })();

  return ocrInitPromise;
}

async function renderPdfPageToCanvas(page: PDFPageProxy, scale: number = 4): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D context is unavailable');
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvas: canvas,
    canvasContext: context,
    viewport: viewport,
  }).promise;

  return canvas;
}

async function processPdf(
  file: File,
  onProgress: (progress: number) => void,
): Promise<OcrResult> {
  const ocr = await getOcr();
  onProgress(10);

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const allLines: Line[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const canvas = await renderPdfPageToCanvas(page);
    const dataUrl = canvas.toDataURL('image/png');
    const lines = await ocr.detect(dataUrl);
    allLines.push(...lines);
    onProgress(10 + Math.round((i / numPages) * 90));
  }

  const text = allLines.map((l) => l.text).join('\n');
  return { text, lines: allLines };
}

export function useOcr() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(async (imageSource: string | File): Promise<OcrResult | null> => {
    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Check if it's a PDF file
      if (imageSource instanceof File && imageSource.type === 'application/pdf') {
        const ocrResult = await processPdf(imageSource, setProgress);
        setResult(ocrResult.text);
        return ocrResult;
      }

      // Process as image
      setProgress(10);
      const ocr = await getOcr();
      setProgress(30);

      let input: string;
      if (imageSource instanceof File) {
        input = URL.createObjectURL(imageSource);
      } else {
        input = imageSource;
      }

      const detectedLines = await ocr.detect(input);
      setProgress(100);

      if (imageSource instanceof File && input.startsWith('blob:')) {
        URL.revokeObjectURL(input);
      }

      const text = detectedLines.map((l: Line) => l.text).join('\n');
      setResult(text);
      return { text, lines: detectedLines };
    } catch (e) {
      console.error('OCR processing failed:', e);
      setError('OCR processing failed');
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  return { processing, progress, result, error, processImage };
}
