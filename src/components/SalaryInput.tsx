import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateSalary, type ValidationError } from '../utils/validation';

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
  submitLabel?: string;
  onSaveDefault?: () => void;
  onClearDefault?: () => void;
}

export default function SalaryInput({ data, onChange, onCalculate, onBack, submitLabel, onSaveDefault, onClearDefault }: SalaryInputProps) {
  const { t } = useTranslation();
  const [showDeductions, setShowDeductions] = useState(false);
  const [showAllowances, setShowAllowances] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const update = (partial: Partial<SalaryData>) => onChange({ ...data, ...partial });

  const handleCalculate = () => {
    const validationErrors = validateSalary(data.monthlySalary);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    onCalculate();
  };

  const getError = (field: string) => errors.find(e => e.field === field);

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-xl p-4 space-y-4">
        <div>
          <label className="block font-medium text-slate-300 mb-2">{t('salary.employeeName')}</label>
          <input
            type="text"
            value={data.employeeName}
            onChange={e => update({ employeeName: e.target.value })}
            className="w-full bg-slate-700 text-white rounded-lg px-4 min-h-12 text-lg"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-300 mb-2">{t('salary.employerName')}</label>
          <input
            type="text"
            value={data.employerName}
            onChange={e => update({ employerName: e.target.value })}
            className="w-full bg-slate-700 text-white rounded-lg px-4 min-h-12 text-lg"
          />
        </div>
        <div>
          <label className="block font-bold text-white mb-2 text-lg">{t('salary.monthly')}</label>
          <input
            type="number"
            value={data.monthlySalary || ''}
            onChange={e => {
              update({ monthlySalary: Number(e.target.value) });
              setErrors([]);
            }}
            className={`w-full bg-slate-700 text-white rounded-lg px-4 min-h-14 text-2xl font-bold ${getError('monthlySalary') ? 'border-2 border-red-500' : ''}`}
            placeholder="1000"
            min={0}
          />
          {getError('monthlySalary') && <div className="text-red-400 text-sm mt-1">{t(getError('monthlySalary')!.message)}</div>}
        </div>
      </div>

      {/* Deductions accordion */}
      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowDeductions(!showDeductions)}
          className="w-full px-4 min-h-14 flex items-center justify-between text-left"
        >
          <span className="font-bold text-lg">{t('salary.deductions')}</span>
          <span className="text-slate-400 text-2xl">{showDeductions ? '▲' : '▼'}</span>
        </button>
        {showDeductions && (
          <div className="px-4 pb-4 space-y-4">
            {(['accommodation', 'meals', 'advances', 'otherDeductions'] as const).map(field => {
              const key = field === 'otherDeductions' ? 'other' : field;
              return (
                <div key={field}>
                  <label className="block font-medium text-slate-300 mb-2">{t(`salary.${field}`)}</label>
                  <input
                    type="number"
                    value={data.deductions[key as keyof typeof data.deductions] || ''}
                    onChange={e => update({ deductions: { ...data.deductions, [key]: Number(e.target.value) } })}
                    className="w-full bg-slate-700 text-white rounded-lg px-4 min-h-12 text-lg"
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
          className="w-full px-4 min-h-14 flex items-center justify-between text-left"
        >
          <span className="font-bold text-lg">{t('salary.allowances')}</span>
          <span className="text-slate-400 text-2xl">{showAllowances ? '▲' : '▼'}</span>
        </button>
        {showAllowances && (
          <div className="px-4 pb-4 space-y-4">
            {(['transport', 'food', 'otherAllowances'] as const).map(field => {
              const key = field === 'otherAllowances' ? 'other' : field;
              return (
                <div key={field}>
                  <label className="block font-medium text-slate-300 mb-2">{t(`salary.${field}`)}</label>
                  <input
                    type="number"
                    value={data.allowances[key as keyof typeof data.allowances] || ''}
                    onChange={e => update({ allowances: { ...data.allowances, [key]: Number(e.target.value) } })}
                    className="w-full bg-slate-700 text-white rounded-lg px-4 min-h-12 text-lg"
                    min={0}
                    placeholder="0"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(onSaveDefault || onClearDefault) && (
        <div className="flex gap-3 items-center justify-end mb-2">
          {onSaveDefault && (
            <button
              onClick={onSaveDefault}
              className="text-blue-400 active:text-blue-300 font-medium text-sm underline"
            >
              {t('salary.saveDefault')}
            </button>
          )}
          {onClearDefault && (
            <button
              onClick={onClearDefault}
              className="text-slate-400 active:text-slate-300 font-medium text-sm"
            >
              {t('salary.clearDefault')}
            </button>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-slate-700 active:bg-slate-600 text-white rounded-xl min-h-14 font-bold text-lg"
        >
          {t('form.back')}
        </button>
        <button
          onClick={handleCalculate}
          disabled={!data.monthlySalary}
          className="flex-[2] bg-blue-600 active:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-xl min-h-14 font-bold text-xl"
        >
          {submitLabel ?? t('salary.calculate')}
        </button>
      </div>
    </div>
  );
}
