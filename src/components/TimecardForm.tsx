import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DayEntry, DayType } from '../types/timecard';
import { validateEntry, validateEntries, type ValidationError } from '../utils/validation';

interface TimecardFormProps {
  entries: DayEntry[];
  onChange: (entries: DayEntry[]) => void;
  onNext: () => void;
}

const emptyEntry = (): DayEntry => ({
  date: new Date().toISOString().split('T')[0],
  dayType: 'normal',
  clockIn: '08:00',
  clockOut: '17:00',
  breakMinutes: 60,
  extraOtHours: 0,
});

export default function TimecardForm({ entries, onChange, onNext }: TimecardFormProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<DayEntry>(emptyEntry());
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const addEntry = () => {
    const validationErrors = validateEntry(current);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    onChange([...entries, { ...current, ...(current.extraOtHours ? { extraOtHours: current.extraOtHours } : {}) }]);
    const next = new Date(current.date);
    next.setDate(next.getDate() + 1);
    setCurrent({ ...emptyEntry(), date: next.toISOString().split('T')[0] });
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const getError = (field: string) => errors.find(e => e.field === field);

  const clearFieldError = (field: string) => {
    if (errors.length > 0) {
      setErrors(errors.filter(e => e.field !== field));
    }
  };

  const handleNext = () => {
    const validationErrors = validateEntries(entries);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    onNext();
  };

  const dayTypeOptions: { value: DayType; labelKey: string }[] = [
    { value: 'normal', labelKey: 'form.normal' },
    { value: 'rest', labelKey: 'form.restDay' },
    { value: 'publicHoliday', labelKey: 'form.publicHoliday' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-black p-4 space-y-4">
        <div>
          <label className="block font-bold text-black mb-1">{t('form.date')}</label>
          <input
            type="date"
            value={current.date}
            onChange={e => {
              setCurrent({ ...current, date: e.target.value });
              clearFieldError('date');
            }}
            className={`w-full bg-white border-2 ${getError('date') ? 'border-red-500' : 'border-black'} text-black px-4 min-h-12 text-lg font-medium`}
          />
          {getError('date') && <div className="text-red-600 text-sm mt-1 font-bold">{t(getError('date')!.message)}</div>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-black mb-1">{t('form.clockIn')}</label>
            <input
              type="time"
              value={current.clockIn}
              onChange={e => {
                setCurrent({ ...current, clockIn: e.target.value });
                clearFieldError('clockIn');
              }}
              className={`w-full bg-white border-2 ${getError('clockIn') ? 'border-red-500' : 'border-black'} text-black px-4 min-h-12 text-lg font-medium`}
            />
            {getError('clockIn') && <div className="text-red-600 text-sm mt-1 font-bold">{t(getError('clockIn')!.message)}</div>}
          </div>
          <div>
            <label className="block font-bold text-black mb-1">{t('form.clockOut')}</label>
            <input
              type="time"
              value={current.clockOut}
              onChange={e => {
                setCurrent({ ...current, clockOut: e.target.value });
                clearFieldError('clockOut');
              }}
              className={`w-full bg-white border-2 ${getError('clockOut') ? 'border-red-500' : 'border-black'} text-black px-4 min-h-12 text-lg font-medium`}
            />
            {getError('clockOut') && <div className="text-red-600 text-sm mt-1 font-bold">{t(getError('clockOut')!.message)}</div>}
          </div>
        </div>

        <div>
          <label className="block font-bold text-black mb-1">{t('form.break')}</label>
          <input
            type="number"
            value={current.breakMinutes}
            onChange={e => {
              setCurrent({ ...current, breakMinutes: Number(e.target.value) });
              clearFieldError('breakMinutes');
            }}
            className={`w-full bg-white border-2 ${getError('breakMinutes') ? 'border-red-500' : 'border-black'} text-black px-4 min-h-12 text-lg font-medium`}
            min={0}
            max={120}
          />
          {getError('breakMinutes') && <div className="text-red-600 text-sm mt-1 font-bold">{t(getError('breakMinutes')!.message)}</div>}
        </div>

        <div>
          <label className="block font-bold text-black mb-1">{t('form.dayType')}</label>
          <div className="flex gap-2">
            {dayTypeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setCurrent({ ...current, dayType: opt.value })}
                className={`flex-1 min-h-12 font-bold border-2 border-black ${
                  current.dayType === opt.value
                    ? 'bg-black text-white'
                    : 'bg-white text-black'
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-bold text-black mb-1">{t('form.extraOt')}</label>
          <input
            type="number"
            value={current.extraOtHours}
            onChange={e => setCurrent({ ...current, extraOtHours: Number(e.target.value) })}
            className="w-full bg-white border-2 border-black text-black px-4 min-h-12 text-lg font-medium"
            min={0}
            max={24}
            step={0.5}
          />
        </div>

        <button
          onClick={addEntry}
          className="w-full bg-lime-300 border-2 border-black text-black min-h-12 font-bold text-lg shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
        >
          {t('form.addDay')}
        </button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={i} className="bg-white border-2 border-black p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-base">{entry.date}</div>
                <div className="text-black text-sm">
                  {entry.clockIn} - {entry.clockOut} | {t(`form.${entry.dayType === 'publicHoliday' ? 'publicHoliday' : entry.dayType === 'rest' ? 'restDay' : 'normal'}`)}
                  {entry.extraOtHours && entry.extraOtHours > 0 && ` | +${entry.extraOtHours}h ${t('form.extraOtShort')}`}
                </div>
              </div>
              <button
                onClick={() => removeEntry(i)}
                className="text-red-600 min-w-12 min-h-12 font-bold shrink-0"
              >
                {t('form.removeDay')}
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div>
          <button
            onClick={handleNext}
            className="w-full bg-black text-white border-2 border-black min-h-14 font-bold text-xl shadow-[3px_3px_0_#7c3aed] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
          >
            {t('form.next')}
          </button>
          {getError('entries') && <div className="text-red-600 text-sm mt-2 text-center font-bold">{t(getError('entries')!.message)}</div>}
        </div>
      )}
    </div>
  );
}
