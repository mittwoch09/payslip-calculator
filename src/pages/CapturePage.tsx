import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOcr } from '../hooks/useOcr';
import { useSalaryProfile } from '../hooks/useSalaryProfile';
import { usePayslipHistory } from '../hooks/usePayslipHistory';
import { parseTimecardText, parseTimecardLines, remapYearMonth } from '../ocr/timecard-parser';
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

type Step = 'salary' | 'camera' | 'processing' | 'preview' | 'result';

const now = new Date();

export default function CapturePage({ onBack }: CapturePageProps) {
  const { t } = useTranslation();
  const { processing, progress, processImage } = useOcr();
  const { loadProfile, saveProfile, clearProfile } = useSalaryProfile();
  const { addEntry: addToHistory } = usePayslipHistory();
  const [step, setStep] = useState<Step>('salary');
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [previewRows, setPreviewRows] = useState<TimecardPreviewRow[]>([]);
  const [payYear, setPayYear] = useState(now.getFullYear());
  const [payMonth, setPayMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [salaryData, setSalaryData] = useState(() => {
    const saved = loadProfile();
    return saved ?? {
      employeeName: '',
      employerName: '',
      monthlySalary: 0,
      deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
      allowances: { transport: 0, food: 0, other: 0 },
    };
  });
  const [result, setResult] = useState<PayslipResult | null>(null);

  const handleImage = async (source: string | File) => {
    setStep('processing');
    const ocrResult = await processImage(source);
    if (ocrResult) {
      const parsed = ocrResult.lines.length > 0
        ? parseTimecardLines(ocrResult.lines, payYear, payMonth)
        : parseTimecardText(ocrResult.text, payYear, payMonth);
      setEntries(parsed.entries);
      setPreviewRows(parsed.rows);
      setStep('preview');
    } else {
      setStep('camera');
    }
  };

  const handleCalculate = (freshEntries?: DayEntry[]) => {
    const data = freshEntries ?? entries;
    const dates = data.map(e => e.date).sort();
    const payslipResult = calcPayslip({
      ...salaryData,
      paymentPeriodStart: dates[0] ?? '',
      paymentPeriodEnd: dates[dates.length - 1] ?? '',
      timecard: { entries: data },
    });
    setEntries(data);
    setResult(payslipResult);
    setStep('result');

    // Save to history
    addToHistory({
      periodStart: dates[0] ?? '',
      periodEnd: dates[dates.length - 1] ?? '',
      employeeName: salaryData.employeeName,
      employerName: salaryData.employerName,
      monthlySalary: salaryData.monthlySalary,
      netPay: payslipResult.netPay,
      grossPay: payslipResult.grossPay,
      result: payslipResult,
    });
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
          monthlySalary={salaryData.monthlySalary}
          hourlyRate={salaryData.hourlyRateOverride}
          otRate={salaryData.otRateOverride}
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setStep('salary')}
            className="flex-1 bg-white border-2 border-black text-black font-bold shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] min-h-14 text-base"
          >
            {t('payslip.editSalary')}
          </button>
          <button
            onClick={() => setStep('preview')}
            className="flex-1 bg-white border-2 border-black text-black font-bold shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] min-h-14 text-base"
          >
            {t('payslip.editTimecard')}
          </button>
        </div>
        <button
          onClick={() => { setStep('salary'); setEntries([]); setPreviewRows([]); setResult(null); }}
          className="w-full mt-2 bg-gray-100 border-2 border-black text-gray-600 font-bold text-sm min-h-12"
        >
          {t('payslip.startOver')}
        </button>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div>
        <h2 className="text-2xl font-black text-black mb-4">{t('ocr.review')}</h2>
        <OcrPreview
          entries={entries}
          previewRows={previewRows}
          onChange={setEntries}
          onConfirm={handleCalculate}
          onRetake={() => { setStep('camera'); setEntries([]); setPreviewRows([]); }}
          year={payYear}
        />
      </div>
    );
  }

  if (step === 'processing' || processing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="w-20 h-20 border-[6px] border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-black text-xl font-bold">{t('ocr.processing')}</p>
        {progress > 0 && (
          <div className="w-64 bg-gray-200 border-2 border-black h-3">
            <div className="bg-lime-400 h-3 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    );
  }

  if (step === 'camera') {
    return (
      <div>
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setStep('salary')} className="text-black font-bold min-h-12 px-2">{t('form.back')}</button>
          <h2 className="text-2xl font-black text-black">{t('home.scan')}</h2>
        </div>
        <CameraCapture
          onCapture={handleImage}
          onFileUpload={handleImage}
        />
      </div>
    );
  }

  // salary step (initial) — includes year & month picker
  return (
    <div>
      <h2 className="text-2xl font-black text-black mb-4">{t('salary.title')}</h2>

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-black text-sm font-bold mb-1">{t('salary.year')}</label>
          <select
            value={payYear}
            onChange={e => setPayYear(Number(e.target.value))}
            className="w-full bg-white border-2 border-black min-h-12 px-3 text-black text-lg"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-black text-sm font-bold mb-1">{t('salary.month')}</label>
          <select
            value={payMonth}
            onChange={e => setPayMonth(Number(e.target.value))}
            className="w-full bg-white border-2 border-black min-h-12 px-3 text-black text-lg"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{(i + 1).toString().padStart(2, '0')}</option>
            ))}
          </select>
        </div>
      </div>

      <SalaryInput
        data={salaryData}
        onChange={setSalaryData}
        onCalculate={() => {
          if (previewRows.length > 0) {
            const { rows, entries: remapped } = remapYearMonth(previewRows, entries, payYear, payMonth);
            setPreviewRows(rows);
            setEntries(remapped);
            setStep('preview');
          } else {
            setStep('camera');
          }
        }}
        onBack={onBack}
        submitLabel={t('form.next')}
        onSaveDefault={() => saveProfile(salaryData)}
        onClearDefault={() => {
          clearProfile();
          setSalaryData({
            employeeName: '',
            employerName: '',
            monthlySalary: 0,
            deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
            allowances: { transport: 0, food: 0, other: 0 },
          });
        }}
      />
    </div>
  );
}
