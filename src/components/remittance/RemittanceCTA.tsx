import { useTranslation } from 'react-i18next';

interface RemittanceCTAProps {
  netPay: number;
  onCompareRates: () => void;
}

export default function RemittanceCTA({ netPay, onCompareRates }: RemittanceCTAProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-violet-200 border-2 border-black p-4 shadow-[4px_4px_0_black]">
      <p className="text-black font-bold text-lg">
        💸 {t('remittance.cta.title')}
      </p>
      <p className="text-gray-700 text-sm mb-3">
        {t('remittance.cta.subtitle')}
      </p>
      <button
        onClick={onCompareRates}
        className="w-full py-3 bg-black text-white border-2 border-black font-bold active:translate-x-1 active:translate-y-1 transition-transform"
      >
        {t('remittance.cta.button')} →
      </button>
    </div>
  );
}
