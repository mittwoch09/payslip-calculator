import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getMockRate } from '../../lib/rate-calculator';
import { providers } from '../../data/providers';
import { languageToCorridorMap } from '../../data/corridors';
import { trackEvent } from '../../lib/analytics';

interface RemittanceCTAProps {
  netPay: number;
  onCompareRates: () => void;
  liveSavings?: number;
}

export default function RemittanceCTA({ netPay, onCompareRates, liveSavings }: RemittanceCTAProps) {
  const { t, i18n } = useTranslation();

  // Calculate savings preview using sync mock rates
  const corridorId = languageToCorridorMap[i18n.language] || 'SGD-INR';
  const targetCurrency = corridorId.split('-')[1];
  const mockRate = getMockRate(corridorId);

  let savingsPreview: string | null = null;
  if (netPay > 0 && mockRate > 1) {
    // Import the bank benchmark values directly to avoid circular dependency issues
    const bankFee = 25;
    const bankMargin = 0.04;
    const bankReceive = Math.floor((netPay - bankFee) * mockRate * (1 - bankMargin));

    // Find best provider receive amount
    const bestProviderReceive = providers.reduce((best, provider) => {
      const fee = provider.fees[corridorId];
      if (!fee) return best;
      const totalFee = fee.fixed + (netPay * fee.percent);
      const rate = mockRate * (1 - provider.rateMargin);
      const receive = Math.floor((netPay - totalFee) * rate);
      return receive > best ? receive : best;
    }, 0);

    const savings = bestProviderReceive - bankReceive;
    if (savings > 0) {
      savingsPreview = t('remittance.cta.savingsPreview', {
        currency: targetCurrency,
        amount: savings.toLocaleString(),
      });
    }
  }

  useEffect(() => {
    trackEvent('remittance', 'cta_impression', corridorId, netPay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-violet-200 border-2 border-black p-4 shadow-[4px_4px_0_black]">
      <p className="text-black font-bold text-lg">💸 {t('remittance.cta.title')}</p>
      <p className="text-gray-700 text-sm mb-3">{t('remittance.cta.subtitle')}</p>
      {liveSavings != null && liveSavings > 0 ? (
        <p className="text-sm font-bold text-green-800 mb-3">
          <span className="inline-block bg-green-100 text-green-800 text-xs font-bold px-1.5 py-0.5 mr-1">{t('remittance.liveQuote')}</span>
          {t('remittance.cta.savingsPreview', { currency: targetCurrency, amount: Math.floor(liveSavings).toLocaleString() })}
        </p>
      ) : savingsPreview ? (
        <p className="text-sm font-bold text-green-800 mb-3">{savingsPreview}</p>
      ) : null}
      <p className="text-xs text-gray-600 mb-3">{t('remittance.affiliateDisclosure')}</p>
      <button
        onClick={() => {
          trackEvent('remittance', 'cta_click', corridorId, netPay);
          onCompareRates();
        }}
        className="w-full py-3 bg-black text-white border-2 border-black font-bold active:translate-x-1 active:translate-y-1 transition-transform"
      >
        {t('remittance.cta.button')} →
      </button>
    </div>
  );
}
