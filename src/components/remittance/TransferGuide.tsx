import { useTranslation } from 'react-i18next';

interface TransferGuideProps {
  providerName: string;
  steps: string[]; // i18n keys
  onDismiss: () => void;
  onProceed?: () => void;
}

export default function TransferGuide({ providerName, steps, onDismiss, onProceed }: TransferGuideProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-3 bg-yellow-50 border-2 border-black p-3">
      <div className="flex justify-between items-start mb-2">
        <span className="font-bold text-sm">{t('guide.title', { provider: providerName })}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-gray-400 hover:text-black font-bold text-lg leading-none ml-2"
        >
          ✕
        </button>
      </div>
      <ol className="space-y-2">
        {steps.map((stepKey, i) => (
          <li key={stepKey} className="flex gap-2 text-sm">
            <span className="font-black text-black shrink-0">{i + 1}.</span>
            <span className="text-gray-700">{t(stepKey)}</span>
          </li>
        ))}
      </ol>
      {onProceed && (
        <button
          type="button"
          onClick={onProceed}
          className="mt-3 w-full bg-black text-white font-bold py-3 px-4 hover:bg-gray-800 transition-colors"
        >
          {t('guide.goToProvider', { provider: providerName })} →
        </button>
      )}
      <p className="text-xs text-gray-500 mt-2">{t('guide.switchTab')}</p>
    </div>
  );
}
