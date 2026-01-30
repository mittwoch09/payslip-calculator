import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TimecardForm from '../components/TimecardForm';
import SalaryInput from '../components/SalaryInput';
import PayslipDisplay from '../components/PayslipDisplay';
import { calcPayslip } from '../engine/calculator';
import type { DayEntry } from '../types/timecard';
import type { PayslipResult } from '../types/payslip';

interface EntryPageProps {
  onBack: () => void;
  initialEntries?: DayEntry[];
}

type Step = 'timecard' | 'salary' | 'result';

export default function EntryPage({ onBack, initialEntries }: EntryPageProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(initialEntries?.length ? 'salary' : 'timecard');
  const [entries, setEntries] = useState<DayEntry[]>(initialEntries ?? []);
  const [salaryData, setSalaryData] = useState({
    employeeName: '',
    employerName: '',
    monthlySalary: 0,
    deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
    allowances: { transport: 0, food: 0, other: 0 },
  });
  const [result, setResult] = useState<PayslipResult | null>(null);

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
          onClick={() => { setStep('timecard'); setEntries([]); setResult(null); }}
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
          onBack={() => setStep('timecard')}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="text-blue-400 font-bold min-h-12 px-2">{t('form.back')}</button>
        <h2 className="text-2xl font-black">{t('home.manual')}</h2>
      </div>
      <TimecardForm
        entries={entries}
        onChange={setEntries}
        onNext={() => setStep('salary')}
      />
    </div>
  );
}
