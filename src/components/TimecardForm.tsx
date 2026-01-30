import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DayEntry, DayType } from '../types/timecard';

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
});

export default function TimecardForm({ entries, onChange, onNext }: TimecardFormProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<DayEntry>(emptyEntry());

  const addEntry = () => {
    onChange([...entries, { ...current }]);
    const next = new Date(current.date);
    next.setDate(next.getDate() + 1);
    setCurrent({ ...emptyEntry(), date: next.toISOString().split('T')[0] });
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const dayTypeOptions: { value: DayType; labelKey: string }[] = [
    { value: 'normal', labelKey: 'form.normal' },
    { value: 'rest', labelKey: 'form.restDay' },
    { value: 'publicHoliday', labelKey: 'form.publicHoliday' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-xl p-4 space-y-4">
        <div>
          <label className="block font-medium text-slate-300 mb-2">{t('form.date')}</label>
          <input
            type="date"
            value={current.date}
            onChange={e => setCurrent({ ...current, date: e.target.value })}
            className="w-full bg-slate-700 text-white rounded-lg px-4 min-h-12 text-lg font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-slate-300 mb-2">{t('form.clockIn')}</label>
            <input
              type="time"
              value={current.clockIn}
              onChange={e => setCurrent({ ...current, clockIn: e.target.value })}
              className="w-full bg-slate-700 text-white rounded-lg px-4 min-h-12 text-lg font-medium"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-300 mb-2">{t('form.clockOut')}</label>
            <input
              type="time"
              value={current.clockOut}
              onChange={e => setCurrent({ ...current, clockOut: e.target.value })}
              className="w-full bg-slate-700 text-white rounded-lg px-4 min-h-12 text-lg font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block font-medium text-slate-300 mb-2">{t('form.break')}</label>
          <input
            type="number"
            value={current.breakMinutes}
            onChange={e => setCurrent({ ...current, breakMinutes: Number(e.target.value) })}
            className="w-full bg-slate-700 text-white rounded-lg px-4 min-h-12 text-lg font-medium"
            min={0}
            max={120}
          />
        </div>

        <div>
          <label className="block font-medium text-slate-300 mb-2">{t('form.dayType')}</label>
          <div className="flex gap-2">
            {dayTypeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setCurrent({ ...current, dayType: opt.value })}
                className={`flex-1 min-h-12 rounded-lg font-bold transition-colors ${
                  current.dayType === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 active:bg-slate-600'
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={addEntry}
          className="w-full bg-emerald-600 active:bg-emerald-700 text-white rounded-lg min-h-12 font-bold text-lg"
        >
          {t('form.addDay')}
        </button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-base">{entry.date}</div>
                <div className="text-slate-300 text-sm">
                  {entry.clockIn} - {entry.clockOut} | {t(`form.${entry.dayType === 'publicHoliday' ? 'publicHoliday' : entry.dayType === 'rest' ? 'restDay' : 'normal'}`)}
                </div>
              </div>
              <button
                onClick={() => removeEntry(i)}
                className="text-red-400 active:text-red-300 min-w-12 min-h-12 font-bold shrink-0"
              >
                {t('form.removeDay')}
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <button
          onClick={onNext}
          className="w-full bg-blue-600 active:bg-blue-700 text-white rounded-xl min-h-14 font-bold text-xl"
        >
          {t('form.next')}
        </button>
      )}
    </div>
  );
}
