import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import TimecardForm from '../components/TimecardForm';
import SalaryInput from '../components/SalaryInput';
import PayslipDisplay from '../components/PayslipDisplay';
import { calcPayslip } from '../engine/calculator';
import { useSalaryProfile } from '../hooks/useSalaryProfile';
import { usePayslipHistory } from '../hooks/usePayslipHistory';
import type { DayEntry } from '../types/timecard';
import type { PayslipResult } from '../types/payslip';

type Step = 'timecard' | 'salary' | 'result';

export default function EntryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { step: urlStep } = useParams<{ step: string }>();
  const step: Step = (urlStep === 'salary' || urlStep === 'result') ? urlStep : 'timecard';
  const { loadProfile, saveProfile, clearProfile } = useSalaryProfile();
  const { addEntry: addToHistory } = usePayslipHistory();
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [salaryData, setSalaryData] = useState(() => {
    const saved = loadProfile();
    return saved ?? {
      employeeName: '',
      employerName: '',
      monthlySalary: 0,
      workDaysPerWeek: 6 as const,
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
    navigate('/entry/result', { replace: true });
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
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => navigate('/entry/salary', { replace: true })}
            className="flex-1 bg-white border-2 border-black text-black font-bold shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] min-h-14 text-base"
          >
            {t('payslip.editSalary')}
          </button>
          <button
            onClick={() => navigate('/entry/timecard', { replace: true })}
            className="flex-1 bg-white border-2 border-black text-black font-bold shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] min-h-14 text-base"
          >
            {t('payslip.editTimecard')}
          </button>
        </div>
        <button
          onClick={() => { setEntries([]); setResult(null); navigate('/entry/timecard', { replace: true }); }}
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
          onBack={() => navigate('/entry/timecard', { replace: true })}
          onSaveDefault={() => saveProfile(salaryData)}
          onClearDefault={() => {
            clearProfile();
            setSalaryData({
              employeeName: '',
              employerName: '',
              monthlySalary: 0,
              workDaysPerWeek: 6,
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
      <div className="mb-4">
        <button onClick={() => navigate('/')} className="text-gray-500 text-sm font-bold mb-1">&larr; {t('form.back')}</button>
        <h2 className="text-2xl font-black text-black">{t('home.manual')}</h2>
      </div>
      <TimecardForm
        entries={entries}
        onChange={setEntries}
        onNext={() => navigate('/entry/salary', { replace: true })}
      />
    </div>
  );
}
