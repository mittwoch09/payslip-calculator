import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import CorridorSelector from '../components/remittance/CorridorSelector';
import AmountInput from '../components/remittance/AmountInput';
import ProviderList from '../components/remittance/ProviderList';
import { corridors } from '../data/corridors';
import { providers } from '../data/providers';
import { calculateQuotes } from '../lib/rate-calculator';
import { buildDeepLink, buildAffiliateUrl, trackClick } from '../lib/affiliate-tracker';
import { getExchangeRate } from '../lib/exchange-rate';
import type { ProviderQuote } from '../types/remittance';

interface RemittancePageProps {
  initialAmount: number;
  onBack: () => void;
}

export default function RemittancePage({ initialAmount, onBack }: RemittancePageProps) {
  const { t } = useTranslation();
  const [selectedCorridor, setSelectedCorridor] = useState<string>('SGD-BDT');
  const [amount, setAmount] = useState<number>(initialAmount);
  const [quotes, setQuotes] = useState<ProviderQuote[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);

  // Calculate quotes whenever corridor or amount changes
  useEffect(() => {
    const updateQuotes = async () => {
      if (amount > 0) {
        setIsLoadingRates(true);
        try {
          const midMarketRate = await getExchangeRate(selectedCorridor);
          const calculatedQuotes = calculateQuotes(amount, selectedCorridor, providers, midMarketRate);
          setQuotes(calculatedQuotes);
        } catch (error) {
          console.error('Failed to fetch rates:', error);
          setQuotes([]);
        } finally {
          setIsLoadingRates(false);
        }
      } else {
        setQuotes([]);
      }
    };
    updateQuotes();
  }, [selectedCorridor, amount]);

  const handleProviderClick = (quote: ProviderQuote) => {
    // Track click event
    trackClick({
      timestamp: Date.now(),
      providerId: quote.providerId,
      corridor: selectedCorridor,
      amount,
    });

    // Use deep link with amount pre-filled
    const deepLink = buildDeepLink(
      quote.affiliateUrlTemplate,
      quote.affiliateUrl,
      amount,
      selectedCorridor
    );

    window.open(deepLink, '_blank', 'noopener,noreferrer');
  };

  // Get target currency from corridor
  const targetCurrency = corridors.find(c => c.id === selectedCorridor)?.target || 'BDT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-black font-bold min-h-12 px-2 hover:bg-gray-100 transition-colors"
        >
          {t('form.back')}
        </button>
        <h2 className="text-2xl font-black text-black">
          💸 {t('remittance.title')}
        </h2>
      </div>

      {/* Affiliate Disclosure */}
      <div className="bg-blue-50 border-2 border-blue-200 p-3 text-sm text-blue-800">
        {t('remittance.affiliateDisclosure')}
      </div>

      {/* Corridor Selector */}
      <CorridorSelector
        value={selectedCorridor}
        onChange={setSelectedCorridor}
        corridors={corridors}
      />

      {/* Amount Input */}
      <AmountInput
        value={amount}
        onChange={setAmount}
      />

      {/* Provider List */}
      {amount > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-black">
            {t('remittance.compareProviders')}
          </h3>
          <div className="bg-amber-50 border-2 border-amber-300 p-3 text-sm text-amber-800">
            {t('remittance.rateDisclaimer')}
          </div>
          {isLoadingRates ? (
            <div className="text-center py-8 text-gray-500">
              Loading exchange rates...
            </div>
          ) : (
            <ProviderList
              quotes={quotes}
              targetCurrency={targetCurrency}
              onProviderClick={handleProviderClick}
            />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-4">
        {t('remittance.updatedJustNow')}
      </div>
    </div>
  );
}
