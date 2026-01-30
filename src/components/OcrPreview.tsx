import { useTranslation } from 'react-i18next';
import type { DayEntry } from '../types/timecard';
import type { TimecardPreviewRow } from '../ocr/timecard-parser';
import { useEditableTimecard } from '../hooks/useEditableTimecard';
import EditableOcrPreview from './EditableOcrPreview';

interface OcrPreviewProps {
  entries: DayEntry[];
  previewRows: TimecardPreviewRow[];
  onChange: (entries: DayEntry[]) => void;
  onConfirm: (entries: DayEntry[]) => void;
  onRetake: () => void;
  year?: number;
}

export default function OcrPreview({ entries, previewRows, onChange, onConfirm, onRetake, year }: OcrPreviewProps) {
  const { t } = useTranslation();
  const { rows, updateTime, toggleOff, updateExtraOt, getEntries } = useEditableTimecard(entries, previewRows, year);

  const handleConfirm = () => {
    const fresh = getEntries();
    onChange(fresh);
    onConfirm(fresh);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-900/40 border-2 border-blue-600 rounded-xl p-4">
        <p className="text-blue-200 font-medium">{t('ocr.reviewDesc')}</p>
      </div>

      <EditableOcrPreview
        rows={rows}
        onUpdateTime={updateTime}
        onToggleOff={toggleOff}
        onUpdateExtraOt={updateExtraOt}
      />

      <button
        onClick={handleConfirm}
        className="w-full bg-blue-600 active:bg-blue-700 text-white rounded-xl min-h-14 font-bold text-xl"
      >
        {t('form.confirm')}
      </button>

      <button
        onClick={onRetake}
        className="w-full bg-slate-700 active:bg-slate-600 text-white rounded-xl min-h-14 font-bold text-lg"
      >
        {t('ocr.retake')}
      </button>
    </div>
  );
}
