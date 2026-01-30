import { useTranslation } from 'react-i18next';
import type { DayEntry } from '../types/timecard';
import TimecardForm from './TimecardForm';

interface OcrPreviewProps {
  entries: DayEntry[];
  onChange: (entries: DayEntry[]) => void;
  onConfirm: () => void;
  onRetake: () => void;
}

export default function OcrPreview({ entries, onChange, onConfirm, onRetake }: OcrPreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="bg-blue-900/40 border-2 border-blue-600 rounded-xl p-4">
        <p className="text-blue-200 font-medium">{t('ocr.reviewDesc')}</p>
      </div>

      <TimecardForm entries={entries} onChange={onChange} onNext={onConfirm} />

      <button
        onClick={onRetake}
        className="w-full bg-slate-700 active:bg-slate-600 text-white rounded-xl min-h-14 font-bold text-lg"
      >
        {t('ocr.retake')}
      </button>
    </div>
  );
}
