import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOcr } from '../hooks/useOcr';
import { parseTimecardText } from '../ocr/timecard-parser';
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
    const text = await processImage(source);
    if (text) {
      const parsed = parseTimecardText(text);
      setEntries(parsed);
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
          className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-4 font-semibold"
        >
          {t('payslip.startOver')}
        </button>
      </div>
    );
  }

  if (step === 'salary') {
    return (
      <div>
        <h2 className="text-lg font-bold mb-4">{t('salary.title')}</h2>
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
        <h2 className="text-lg font-bold mb-4">{t('ocr.review')}</h2>
        <OcrPreview
          entries={entries}
          onChange={setEntries}
          onConfirm={() => setStep('salary')}
          onRetake={() => { setStep('camera'); setEntries([]); }}
        />
      </div>
    );
  }

  if (step === 'processing' || processing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300">{t('ocr.processing')}</p>
        {progress > 0 && (
          <div className="w-48 bg-slate-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-blue-400 text-sm">{t('form.back')}</button>
        <h2 className="text-lg font-bold">{t('home.scan')}</h2>
      </div>
      <CameraCapture
        onCapture={handleImage}
        onFileUpload={handleImage}
      />
    </div>
  );
}
