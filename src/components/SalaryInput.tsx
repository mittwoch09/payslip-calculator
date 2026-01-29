import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SalaryData {
  employeeName: string;
  employerName: string;
  monthlySalary: number;
  deductions: { accommodation: number; meals: number; advances: number; other: number };
  allowances: { transport: number; food: number; other: number };
}

interface SalaryInputProps {
  data: SalaryData;
  onChange: (data: SalaryData) => void;
  onCalculate: () => void;
  onBack: () => void;
}

export default function SalaryInput({ data, onChange, onCalculate, onBack }: SalaryInputProps) {
  const { t } = useTranslation();
  const [showDeductions, setShowDeductions] = useState(false);
  const [showAllowances, setShowAllowances] = useState(false);

  const update = (partial: Partial<SalaryData>) => onChange({ ...data, ...partial });

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-xl p-4 space-y-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">{t('salary.employeeName')}</label>
          <input
            type="text"
            value={data.employeeName}
            onChange={e => update({ employeeName: e.target.value })}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-3 text-base"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">{t('salary.employerName')}</label>
          <input
            type="text"
            value={data.employerName}
            onChange={e => update({ employerName: e.target.value })}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-3 text-base"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">{t('salary.monthly')}</label>
          <input
            type="number"
            value={data.monthlySalary || ''}
            onChange={e => update({ monthlySalary: Number(e.target.value) })}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-3 text-base text-xl font-bold"
            placeholder="1000"
            min={0}
          />
        </div>
      </div>

      {/* Deductions accordion */}
      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowDeductions(!showDeductions)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
        >
          <span className="font-medium">{t('salary.deductions')}</span>
          <span className="text-slate-400">{showDeductions ? '▲' : '▼'}</span>
        </button>
        {showDeductions && (
          <div className="px-4 pb-4 space-y-3">
            {(['accommodation', 'meals', 'advances', 'otherDeductions'] as const).map(field => {
              const key = field === 'otherDeductions' ? 'other' : field;
              return (
                <div key={field}>
                  <label className="block text-sm text-slate-400 mb-1">{t(`salary.${field}`)}</label>
                  <input
                    type="number"
                    value={data.deductions[key as keyof typeof data.deductions] || ''}
                    onChange={e => update({ deductions: { ...data.deductions, [key]: Number(e.target.value) } })}
                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-3 text-base"
                    min={0}
                    placeholder="0"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Allowances accordion */}
      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAllowances(!showAllowances)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
        >
          <span className="font-medium">{t('salary.allowances')}</span>
          <span className="text-slate-400">{showAllowances ? '▲' : '▼'}</span>
        </button>
        {showAllowances && (
          <div className="px-4 pb-4 space-y-3">
            {(['transport', 'food', 'otherAllowances'] as const).map(field => {
              const key = field === 'otherAllowances' ? 'other' : field;
              return (
                <div key={field}>
                  <label className="block text-sm text-slate-400 mb-1">{t(`salary.${field}`)}</label>
                  <input
                    type="number"
                    value={data.allowances[key as keyof typeof data.allowances] || ''}
                    onChange={e => update({ allowances: { ...data.allowances, [key]: Number(e.target.value) } })}
                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-3 text-base"
                    min={0}
                    placeholder="0"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-4 font-semibold"
        >
          {t('form.back')}
        </button>
        <button
          onClick={onCalculate}
          disabled={!data.monthlySalary}
          className="flex-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-xl py-4 font-semibold text-lg"
        >
          {t('salary.calculate')}
        </button>
      </div>
    </div>
  );
}
