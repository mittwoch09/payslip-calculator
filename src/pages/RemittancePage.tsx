import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CorridorSelector from '../components/remittance/CorridorSelector';
import AmountInput from '../components/remittance/AmountInput';
import ProviderList from '../components/remittance/ProviderList';
import { corridors } from '../data/corridors';
import { providers } from '../data/providers';
import { calculateQuotes } from '../lib/rate-calculator';
import { buildDeepLink, buildPartnerizeUrl, trackClick } from '../lib/affiliate-tracker';
import { getExchangeRate, getCacheTimestamp } from '../lib/exchange-rate';
import type { ProviderQuote } from '../types/remittance';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return '<1 min';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default function RemittancePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCorridor, setSelectedCorridor] = useState<string>('SGD-BDT');
  const [amount, setAmount] = useState<number>(() => {
    const param = searchParams.get('amount');
    return param ? Number(param) : 0;
  });
  const [quotes, setQuotes] = useState<ProviderQuote[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
  const [ratesTimestamp, setRatesTimestamp] = useState<number | null>(null);

  // Sync amount changes to URL search params
  useEffect(() => {
    if (amount > 0) {
      setSearchParams({ amount: amount.toString() }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [amount, setSearchParams]);

  // Calculate quotes whenever corridor or amount changes
  useEffect(() => {
    const updateQuotes = async () => {
      if (amount > 0) {
        setIsLoadingRates(true);
        try {
          const midMarketRate = await getExchangeRate(selectedCorridor);
          const calculatedQuotes = calculateQuotes(amount, selectedCorridor, providers, midMarketRate);
          setQuotes(calculatedQuotes);
          setRatesTimestamp(getCacheTimestamp());
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

    // Build the provider deep link
    const deepLink = buildDeepLink(
      quote.affiliateUrlTemplate,
      quote.affiliateUrl,
      amount,
      selectedCorridor
    );

    // Wrap in Partnerize tracking URL if provider uses Partnerize
    const partnerizeUrl = quote.partnerizeRef
      ? buildPartnerizeUrl(quote.partnerizeRef, deepLink, selectedCorridor)
      : null;

    window.open(partnerizeUrl || deepLink, '_blank', 'noopener,noreferrer');
  };

  // Get target currency from corridor
  const targetCurrency = corridors.find(c => c.id === selectedCorridor)?.target || 'BDT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
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
      <div className="text-center text-sm text-gray-500 py-4 space-y-1">
        {ratesTimestamp && (
          <div>{t('remittance.ratesRefreshed', { time: formatTimeAgo(ratesTimestamp) })}</div>
        )}
        <div>{t('remittance.updatedJustNow')}</div>
      </div>
    </div>
  );
}
