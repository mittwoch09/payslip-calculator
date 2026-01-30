import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOcr } from '../hooks/useOcr';
import { parseTimecardText, parseTimecardLines } from '../ocr/timecard-parser';
import type { TimecardPreviewRow } from '../ocr/timecard-parser';
import CameraCapture from '../components/CameraCapture';
import OcrPreview from '../components/OcrPreview';
import SalaryInput from '../components/SalaryInput';
import PayslipDisplay from '../components/PayslipDisplay';
import { calcPayslip } from '../engine/calculator';
import type { DayEntry } from '../types/timecard';
import type { PayslipResult } from '../types/payslip';

interface CapturePageProps {
  onBack: () => void;
  onComplete: (entries: DayEntry[]) => void;
}

type Step = 'camera' | 'processing' | 'preview' | 'salary' | 'result';

export default function CapturePage({ onBack }: CapturePageProps) {
  const { t } = useTranslation();
  const { processing, progress, processImage } = useOcr();
  const [step, setStep] = useState<Step>('camera');
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [previewRows, setPreviewRows] = useState<TimecardPreviewRow[]>([]);
  const [salaryData, setSalaryData] = useState({
    employeeName: '',
    employerName: '',
    monthlySalary: 0,
    deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
    allowances: { transport: 0, food: 0, other: 0 },
  });
  const [result, setResult] = useState<PayslipResult | null>(null);

  const handleImage = async (source: string | File) => {
    setStep('processing');
    const ocrResult = await processImage(source);
    if (ocrResult) {
      const parsed = ocrResult.lines.length > 0
        ? parseTimecardLines(ocrResult.lines)
        : parseTimecardText(ocrResult.text);
      setEntries(parsed.entries);
      setPreviewRows(parsed.rows);
      setStep('preview');
    } else {
      setStep('camera');
    }
  };

  const handleCalculate = () => {
    const dates = entries.map(e => e.date).sort();
    const payslipResult = calcPayslip({
      ...salaryData,
      paymentPeriodStart: dates[0] ?? '',
      paymentPeriodEnd: dates[dates.length - 1] ?? '',
      timecard: { entries },
    });
    setResult(payslipResult);
    setStep('result');
  };

  if (step === 'result' && result) {
    const dates = entries.map(e => e.date).sort();
    return (
      <div>
        <PayslipDisplay
          result={result}
          employeeName={salaryData.employeeName}
          employerName={salaryData.employerName}
          periodStart={dates[0] ?? ''}
          periodEnd={dates[dates.length - 1] ?? ''}
        />
        <button
          onClick={() => { setStep('camera'); setEntries([]); setResult(null); }}
          className="w-full mt-4 bg-slate-700 active:bg-slate-600 text-white rounded-xl min-h-14 font-bold text-lg"
        >
          {t('payslip.startOver')}
        </button>
      </div>
    );
  }

  if (step === 'salary') {
    return (
      <div>
        <h2 className="text-2xl font-black mb-4">{t('salary.title')}</h2>
        <SalaryInput
          data={salaryData}
          onChange={setSalaryData}
          onCalculate={handleCalculate}
          onBack={() => setStep('preview')}
        />
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div>
        <h2 className="text-2xl font-black mb-4">{t('ocr.review')}</h2>
        <OcrPreview
          entries={entries}
          previewRows={previewRows}
          onChange={setEntries}
          onConfirm={() => setStep('salary')}
          onRetake={() => { setStep('camera'); setEntries([]); setPreviewRows([]); }}
        />
      </div>
    );
  }

  if (step === 'processing' || processing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="w-20 h-20 border-[6px] border-blue-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-200 text-xl font-bold">{t('ocr.processing')}</p>
        {progress > 0 && (
          <div className="w-64 bg-slate-700 rounded-full h-3">
            <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="text-blue-400 font-bold min-h-12 px-2">{t('form.back')}</button>
        <h2 className="text-2xl font-black">{t('home.scan')}</h2>
      </div>
      <CameraCapture
        onCapture={handleImage}
        onFileUpload={handleImage}
      />
    </div>
  );
}
