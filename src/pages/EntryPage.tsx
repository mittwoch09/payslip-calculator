import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TimecardForm from '../components/TimecardForm';
import SalaryInput from '../components/SalaryInput';
import PayslipDisplay from '../components/PayslipDisplay';
import { calcPayslip } from '../engine/calculator';
import { useSalaryProfile } from '../hooks/useSalaryProfile';
import { usePayslipHistory } from '../hooks/usePayslipHistory';
import type { DayEntry } from '../types/timecard';
import type { PayslipResult } from '../types/payslip';

interface EntryPageProps {
  onBack: () => void;
  initialEntries?: DayEntry[];
  onNavigateRemittance?: (amount: number) => void;
}

type Step = 'timecard' | 'salary' | 'result';

export default function EntryPage({ onBack, initialEntries, onNavigateRemittance }: EntryPageProps) {
  const { t } = useTranslation();
  const { loadProfile, saveProfile, clearProfile } = useSalaryProfile();
  const { addEntry: addToHistory } = usePayslipHistory();
  const [step, setStep] = useState<Step>(initialEntries?.length ? 'salary' : 'timecard');
  const [entries, setEntries] = useState<DayEntry[]>(initialEntries ?? []);
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
    window.scrollTo(0, 0);

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
          onNavigateRemittance={onNavigateRemittance}
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setStep('salary')}
            className="flex-1 bg-white border-2 border-black text-black font-bold shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] min-h-14 text-base"
          >
            {t('payslip.editSalary')}
          </button>
          <button
            onClick={() => setStep('timecard')}
            className="flex-1 bg-white border-2 border-black text-black font-bold shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] min-h-14 text-base"
          >
            {t('payslip.editTimecard')}
          </button>
        </div>
        <button
          onClick={() => { setStep('timecard'); setEntries([]); setResult(null); }}
          className="w-full mt-2 bg-gray-100 border-2 border-black text-gray-600 font-bold text-sm min-h-12"
        >
          {t('payslip.startOver')}
        </button>
      </div>
    );
  }

  if (step === 'salary') {
    return (
      <div>
        <h2 className="text-2xl font-black text-black mb-4">{t('salary.title')}</h2>
        <SalaryInput
          data={salaryData}
          onChange={setSalaryData}
          onCalculate={handleCalculate}
          onBack={() => setStep('timecard')}
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

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="text-black font-bold min-h-12 px-2">{t('form.back')}</button>
        <h2 className="text-2xl font-black text-black">{t('home.manual')}</h2>
      </div>
      <TimecardForm
        entries={entries}
        onChange={setEntries}
        onNext={() => setStep('salary')}
      />
    </div>
  );
}
