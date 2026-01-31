import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateSalary, type ValidationError } from '../utils/validation';
import { calcHourlyRate } from '../engine/calculator';
import { OT_MULTIPLIER } from '../engine/constants';

interface SalaryData {
  employeeName: string;
  employerName: string;
  monthlySalary: number;
  hourlyRateOverride?: number;
  otRateOverride?: number;
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

  const autoHourlyRate = data.monthlySalary > 0 ? calcHourlyRate(data.monthlySalary).toFixed(2) : '0.00';
  const autoOtRate = data.monthlySalary > 0 ? (calcHourlyRate(data.monthlySalary) * OT_MULTIPLIER).toFixed(2) : '0.00';

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
    <div className="space-y-3">
      <div className="bg-white border-2 border-black p-4 space-y-3">
        <div>
          <label className="block font-bold text-black mb-1">{t('salary.employeeName')}</label>
          <input
            type="text"
            value={data.employeeName}
            onChange={e => update({ employeeName: e.target.value })}
            className="w-full bg-white border-2 border-black text-black px-4 min-h-12 text-lg"
          />
        </div>
        <div>
          <label className="block font-bold text-black mb-1">{t('salary.employerName')}</label>
          <input
            type="text"
            value={data.employerName}
            onChange={e => update({ employerName: e.target.value })}
            className="w-full bg-white border-2 border-black text-black px-4 min-h-12 text-lg"
          />
        </div>
        <div>
          <label className="block font-bold text-black mb-1 text-base">{t('salary.monthly')}</label>
          <input
            type="number"
            value={data.monthlySalary || ''}
            onChange={e => {
              update({ monthlySalary: Number(e.target.value) });
              setErrors([]);
            }}
            className={`w-full bg-white border-2 ${getError('monthlySalary') ? 'border-red-500' : 'border-black'} text-black px-4 min-h-12 text-xl font-bold`}
            placeholder="1000"
            min={0}
          />
          {getError('monthlySalary') && <div className="text-red-600 text-sm mt-1 font-bold">{t(getError('monthlySalary')!.message)}</div>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-black mb-1 text-sm">{t('salary.hourlyRate')}</label>
            <input
              type="number"
              value={data.hourlyRateOverride || ''}
              onChange={e => update({ hourlyRateOverride: Number(e.target.value) || undefined })}
              className="w-full bg-white border-2 border-black text-black px-4 min-h-12 text-base"
              placeholder={autoHourlyRate}
              min={0}
              step="0.01"
            />
          </div>
          <div>
            <label className="block font-bold text-black mb-1 text-sm">{t('salary.otRate')}</label>
            <input
              type="number"
              value={data.otRateOverride || ''}
              onChange={e => update({ otRateOverride: Number(e.target.value) || undefined })}
              className="w-full bg-white border-2 border-black text-black px-4 min-h-12 text-base"
              placeholder={autoOtRate}
              min={0}
              step="0.01"
            />
          </div>
        </div>
        <p className="text-gray-500 text-xs">
          Optional: leave empty to auto-calculate from monthly salary
        </p>
      </div>

      {/* Deductions accordion */}
      <div className="bg-white border-2 border-black overflow-hidden">
        <button
          onClick={() => setShowDeductions(!showDeductions)}
          className="w-full px-4 min-h-12 flex items-center justify-between text-left font-bold"
        >
          <span className="text-base">{t('salary.deductions')}</span>
          <span className="text-black text-xl font-bold">{showDeductions ? '▲' : '▼'}</span>
        </button>
        {showDeductions && (
          <div className="px-4 pb-4 space-y-3">
            {(['accommodation', 'meals', 'advances', 'otherDeductions'] as const).map(field => {
              const key = field === 'otherDeductions' ? 'other' : field;
              return (
                <div key={field}>
                  <label className="block font-bold text-black mb-1">{t(`salary.${field}`)}</label>
                  <input
                    type="number"
                    value={data.deductions[key as keyof typeof data.deductions] || ''}
                    onChange={e => update({ deductions: { ...data.deductions, [key]: Number(e.target.value) } })}
                    className="w-full bg-white border-2 border-black text-black px-4 min-h-12 text-base"
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
      <div className="bg-white border-2 border-black overflow-hidden">
        <button
          onClick={() => setShowAllowances(!showAllowances)}
          className="w-full px-4 min-h-12 flex items-center justify-between text-left font-bold"
        >
          <span className="text-base">{t('salary.allowances')}</span>
          <span className="text-black text-xl font-bold">{showAllowances ? '▲' : '▼'}</span>
        </button>
        {showAllowances && (
          <div className="px-4 pb-4 space-y-3">
            {(['transport', 'food', 'otherAllowances'] as const).map(field => {
              const key = field === 'otherAllowances' ? 'other' : field;
              return (
                <div key={field}>
                  <label className="block font-bold text-black mb-1">{t(`salary.${field}`)}</label>
                  <input
                    type="number"
                    value={data.allowances[key as keyof typeof data.allowances] || ''}
                    onChange={e => update({ allowances: { ...data.allowances, [key]: Number(e.target.value) } })}
                    className="w-full bg-white border-2 border-black text-black px-4 min-h-12 text-base"
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
              className="text-black font-bold text-sm underline"
            >
              {t('salary.saveDefault')}
            </button>
          )}
          {onClearDefault && (
            <button
              onClick={onClearDefault}
              className="text-gray-500 font-bold text-sm"
            >
              {t('salary.clearDefault')}
            </button>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-white border-2 border-black text-black min-h-12 font-bold text-lg shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
        >
          {t('form.back')}
        </button>
        <button
          onClick={handleCalculate}
          disabled={!data.monthlySalary}
          className="flex-[2] bg-black text-white border-2 border-black min-h-12 font-bold text-xl shadow-[3px_3px_0_#7c3aed] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-300 disabled:shadow-none"
        >
          {submitLabel ?? t('salary.calculate')}
        </button>
      </div>
    </div>
  );
}
