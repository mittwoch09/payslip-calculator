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
      <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-3">
        <p className="text-blue-300 text-sm">{t('ocr.reviewDesc')}</p>
      </div>

      <TimecardForm entries={entries} onChange={onChange} onNext={onConfirm} />

      <button
        onClick={onRetake}
        className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 font-medium"
      >
        {t('ocr.retake')}
      </button>
    </div>
  );
}
