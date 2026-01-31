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
      <div className="bg-violet-100 border-2 border-black p-4">
        <p className="text-black font-medium">{t('ocr.reviewDesc')}</p>
      </div>

      <EditableOcrPreview
        rows={rows}
        onUpdateTime={updateTime}
        onToggleOff={toggleOff}
        onUpdateExtraOt={updateExtraOt}
      />

      <button
        onClick={handleConfirm}
        className="w-full bg-black text-white border-2 border-black min-h-14 font-bold text-xl shadow-[3px_3px_0_#7c3aed] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
      >
        {t('form.confirm')}
      </button>

      <button
        onClick={onRetake}
        className="w-full bg-white text-black border-2 border-black min-h-14 font-bold text-lg shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
      >
        {t('ocr.retake')}
      </button>
    </div>
  );
}
