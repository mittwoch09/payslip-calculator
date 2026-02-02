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

async function resizeImage(imageUrl: string, maxDimension: number = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      let newWidth = width;
      let newHeight = height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          newWidth = maxDimension;
          newHeight = (height / width) * maxDimension;
        } else {
          newHeight = maxDimension;
          newWidth = (width / height) * maxDimension;
        }
      }

      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert to JPEG with 0.9 quality
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      resolve(resizedDataUrl);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/** Preprocess image for better OCR: grayscale, contrast, sharpen, adaptive threshold */
async function preprocessForOcr(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas context')); return; }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Step 1: Convert to grayscale
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = gray;
      }

      // Step 2: Contrast enhancement (CLAHE-like simple version)
      // Find histogram bounds and stretch
      let min = 255, max = 0;
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      // Use 5th/95th percentile for robustness
      const hist = new Uint32Array(256);
      const totalPixels = width * height;
      for (let i = 0; i < data.length; i += 4) hist[data[i]]++;
      let cumulative = 0;
      let p5 = 0, p95 = 255;
      for (let i = 0; i < 256; i++) {
        cumulative += hist[i];
        if (cumulative >= totalPixels * 0.05 && p5 === 0) p5 = i;
        if (cumulative >= totalPixels * 0.95) { p95 = i; break; }
      }
      const range = Math.max(p95 - p5, 1);
      for (let i = 0; i < data.length; i += 4) {
        const stretched = Math.round(((data[i] - p5) / range) * 255);
        const clamped = Math.max(0, Math.min(255, stretched));
        data[i] = data[i + 1] = data[i + 2] = clamped;
      }

      // Step 3: Unsharp mask (sharpen)
      // Create blurred copy, then sharpen = original + amount * (original - blurred)
      const blurred = new Float32Array(width * height);
      const src = new Float32Array(width * height);
      for (let i = 0; i < width * height; i++) src[i] = data[i * 4];

      // Simple 3x3 box blur
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sum = 0, count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy, nx = x + dx;
              if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                sum += src[ny * width + nx];
                count++;
              }
            }
          }
          blurred[y * width + x] = sum / count;
        }
      }

      const sharpenAmount = 1.5;
      for (let i = 0; i < width * height; i++) {
        const sharpened = Math.round(src[i] + sharpenAmount * (src[i] - blurred[i]));
        const clamped = Math.max(0, Math.min(255, sharpened));
        data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = clamped;
      }

      // Step 4: Adaptive thresholding (Sauvola-like)
      // Use a window to compute local mean, then binarize
      const windowSize = Math.max(15, Math.round(Math.min(width, height) / 40) | 1);
      const half = Math.floor(windowSize / 2);
      const k = 0.2; // sensitivity (lower = more text preserved)

      // Build integral image for fast mean computation
      const integral = new Float64Array((width + 1) * (height + 1));
      const integralSq = new Float64Array((width + 1) * (height + 1));
      const iw = width + 1;

      for (let y = 1; y <= height; y++) {
        for (let x = 1; x <= width; x++) {
          const v = data[((y - 1) * width + (x - 1)) * 4];
          integral[y * iw + x] = v + integral[(y - 1) * iw + x] + integral[y * iw + (x - 1)] - integral[(y - 1) * iw + (x - 1)];
          integralSq[y * iw + x] = v * v + integralSq[(y - 1) * iw + x] + integralSq[y * iw + (x - 1)] - integralSq[(y - 1) * iw + (x - 1)];
        }
      }

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const y1 = Math.max(0, y - half);
          const y2 = Math.min(height - 1, y + half);
          const x1 = Math.max(0, x - half);
          const x2 = Math.min(width - 1, x + half);
          const area = (y2 - y1 + 1) * (x2 - x1 + 1);

          const sum = integral[(y2 + 1) * iw + (x2 + 1)] - integral[y1 * iw + (x2 + 1)] - integral[(y2 + 1) * iw + x1] + integral[y1 * iw + x1];
          const sumSq = integralSq[(y2 + 1) * iw + (x2 + 1)] - integralSq[y1 * iw + (x2 + 1)] - integralSq[(y2 + 1) * iw + x1] + integralSq[y1 * iw + x1];

          const mean = sum / area;
          const variance = sumSq / area - mean * mean;
          const stddev = Math.sqrt(Math.max(0, variance));

          const threshold = mean * (1 + k * (stddev / 128 - 1));
          const pixel = data[(y * width + x) * 4];
          const val = pixel < threshold ? 0 : 255;
          data[(y * width + x) * 4] = val;
          data[(y * width + x) * 4 + 1] = val;
          data[(y * width + x) * 4 + 2] = val;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for preprocessing'));
    img.src = imageUrl;
  });
}

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
  })().catch(e => {
    ocrInitPromise = null;
    throw e;
  });

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

      // Resize image before OCR to prevent mobile crashes
      const resizedInput = await resizeImage(input);
      setProgress(40);

      // Preprocess: grayscale, contrast, sharpen, adaptive threshold
      const preprocessed = await preprocessForOcr(resizedInput);
      setProgress(55);

      const detectedLines = await ocr.detect(preprocessed);
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
