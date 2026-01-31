import { useTranslation } from 'react-i18next';
import type { EditableRow } from '../hooks/useEditableTimecard';
import type { DayType } from '../types/timecard';

interface EditableOcrPreviewProps {
  rows: EditableRow[];
  onUpdateTime: (index: number, field: 'clockIn' | 'clockOut', value: string) => void;
  onToggleOff: (index: number) => void;
  onUpdateExtraOt: (index: number, value: number | undefined) => void;
}

const DAY_TYPE_BADGE: Record<DayType, { short: string; cls: string }> = {
  normal: { short: 'N', cls: 'bg-slate-700 text-slate-400' },
  rest: { short: 'R', cls: 'bg-orange-500/20 text-orange-300' },
  publicHoliday: { short: 'PH', cls: 'bg-red-500/20 text-red-300' },
};

const SHORT_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function dayLabel(dateStr: string): string {
  return SHORT_DAYS[new Date(dateStr + 'T00:00:00').getDay()];
}

function dayColor(dateStr: string, dayType: DayType): string {
  if (dayType === 'publicHoliday') return 'text-red-400';
  const dl = dayLabel(dateStr);
  if (dl === 'Su') return 'text-orange-400';
  if (dl === 'Sa') return 'text-blue-400';
  return 'text-slate-400';
}

function formatOcrPlaceholder(raw: string): string {
  if (!raw) return '';
  if (raw.includes(':')) return raw;
  if (/^\d{4}$/.test(raw)) return `${raw.slice(0, 2)}:${raw.slice(2)}`;
  return raw;
}

/** Compute worked hours from HH:MM strings. Returns null if invalid. */
function workedHours(clockIn: string, clockOut: string): number | null {
  if (!clockIn || !clockOut) return null;
  const [ih, im] = clockIn.split(':').map(Number);
  const [oh, om] = clockOut.split(':').map(Number);
  if (isNaN(ih) || isNaN(im) || isNaN(oh) || isNaN(om)) return null;
  let mins = (oh * 60 + om) - (ih * 60 + im);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export default function EditableOcrPreview({ rows, onUpdateTime, onToggleOff, onUpdateExtraOt }: EditableOcrPreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      {rows.length === 0 && (
        <div className="px-4 py-6 text-sm text-slate-400">{t('ocrPreview.empty')}</div>
      )}
      {rows.map((row, i) => {
        const hasOcrData = row.ocrRawIn !== '' || row.ocrRawOut !== '';
        const edited = hasOcrData && (
          row.clockIn !== formatOcrPlaceholder(row.ocrRawIn) ||
          row.clockOut !== formatOcrPlaceholder(row.ocrRawOut)
        );
        const badge = DAY_TYPE_BADGE[row.dayType];
        const hours = workedHours(row.clockIn, row.clockOut);
        const otHours = hours !== null ? Math.max(0, hours - 1 - 8) : null; // minus 1h break, 8h regular

        return (
          <div
            key={row.date}
            className={`bg-slate-800/60 rounded-lg px-3 py-2 space-y-1 ${edited ? 'border-l-4 border-amber-500/60' : 'border-l-4 border-transparent'}`}
          >
            {/* Row 1: date, day, badge, hours info, OFF toggle */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-200 text-sm">
                {row.date.slice(5)}
              </span>
              <span className={`text-sm font-medium ${dayColor(row.date, row.dayType)}`}>
                {dayLabel(row.date)}
              </span>
              <span className={`min-h-[24px] min-w-[24px] px-1 rounded text-[10px] font-bold inline-flex items-center justify-center ${badge.cls}`}>
                {badge.short}
              </span>
              {!row.isOff && hours !== null && hours > 0 && (
                <span className="text-slate-400 text-xs">
                  {hours.toFixed(1)}h
                </span>
              )}
              {!row.isOff && otHours !== null && otHours > 0 && (
                <span className="text-emerald-300 text-xs font-semibold">
                  +{otHours.toFixed(1)}OT
                </span>
              )}
              {row.extraOtHours !== undefined && row.extraOtHours > 0 && (
                <span className="text-emerald-400 text-[10px] font-bold">+{row.extraOtHours}</span>
              )}
              <div className="flex-1" />
              <button
                onClick={() => onToggleOff(i)}
                className={`min-h-[36px] min-w-[48px] px-2 rounded-lg text-[11px] font-bold transition-colors ${
                  row.isOff
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50'
                    : 'bg-slate-700 text-slate-500 active:bg-slate-600'
                }`}
              >
                {t('ocrPreview.offLabel')}
              </button>
            </div>

            {/* Row 2: time inputs (full width, hidden when off) */}
            {!row.isOff && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={row.clockIn}
                  placeholder={formatOcrPlaceholder(row.ocrRawIn)}
                  onChange={e => onUpdateTime(i, 'clockIn', e.target.value)}
                  className="flex-1 bg-slate-700 text-white rounded-lg px-3 min-h-[48px] text-base font-medium"
                />
                <span className="text-slate-500 text-sm shrink-0">→</span>
                <input
                  type="time"
                  value={row.clockOut}
                  placeholder={formatOcrPlaceholder(row.ocrRawOut)}
                  onChange={e => onUpdateTime(i, 'clockOut', e.target.value)}
                  className="flex-1 bg-slate-700 text-white rounded-lg px-3 min-h-[48px] text-base font-medium"
                />
                {row.extraOtHours !== undefined && row.extraOtHours > 0 && (
                  <span className="text-emerald-400 text-sm font-bold shrink-0">+{row.extraOtHours}</span>
                )}
              </div>
            )}

            {/* Extra OT edit for all working days */}
            {!row.isOff && (
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-emerald-400 text-xs shrink-0">Extra OT</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={24}
                  step={0.5}
                  value={row.extraOtHours ?? 0}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    onUpdateExtraOt(i, isNaN(v) || v <= 0 ? undefined : v);
                  }}
                  className="w-16 bg-slate-700 text-white rounded-lg px-2 min-h-[36px] text-sm font-medium text-center"
                />
                <span className="text-slate-500 text-xs shrink-0">hrs</span>
                <div className="flex-1" />
                <button
                  onClick={() => onUpdateExtraOt(i, row.extraOtHours !== undefined ? undefined : 1)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-bold transition-colors ${
                    row.extraOtHours !== undefined
                      ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {row.extraOtHours !== undefined ? '✓' : '✗'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
