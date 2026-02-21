import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PreTransferChecklistProps {
  providerName: string;
  items: string[]; // i18n keys
}

export default function PreTransferChecklist({ providerName, items }: PreTransferChecklistProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="text-sm text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline focus:outline-none"
      >
        {t('checklist.whatYouNeed')}
        <span className="ml-1 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <ul className="space-y-1">
            {items.map((itemKey) => (
              <li key={itemKey} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-0.5 flex-shrink-0 text-gray-400">☐</span>
                <span>{t(itemKey)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400">{t('checklist.tip')}</p>
        </div>
      )}
    </div>
  );
}
