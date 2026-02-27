import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CorridorSelector from '../components/remittance/CorridorSelector';
import AmountInput from '../components/remittance/AmountInput';
import ProviderList from '../components/remittance/ProviderList';
import SalaryToRemittanceWidget from '../components/remittance/SalaryToRemittanceWidget';
import { corridors, languageToCorridorMap } from '../data/corridors';
import { providers } from '../data/providers';
import { calculateQuotes } from '../lib/rate-calculator';
import { buildDeepLink, buildPartnerizeUrl, trackClick } from '../lib/affiliate-tracker';
import { getExchangeRate, getCacheTimestamp, getRateSource } from '../lib/exchange-rate';
import { trackEvent } from '../lib/analytics';
import { fetchWiseQuote } from '../lib/wise-quote';
import { fetchComparison } from '../lib/wise-compare';
import type { ComparisonProvider } from '../lib/wise-compare';
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCorridor, setSelectedCorridor] = useState<string>(
    () => languageToCorridorMap[i18n.language] || 'SGD-INR'
  );
  const [amount, setAmount] = useState<number>(() => {
    const param = searchParams.get('amount');
    return param ? Number(param) : 0;
  });
  const [quotes, setQuotes] = useState<ProviderQuote[]>([]);
  const [bankProviders, setBankProviders] = useState<ComparisonProvider[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
  const [ratesTimestamp, setRatesTimestamp] = useState<number | null>(null);
  const [rateSource, setRateSource] = useState<string | null>(null);
  const [activeGuide, setActiveGuide] = useState<string | null>(null);
  const [activeGuideUrl, setActiveGuideUrl] = useState<string | null>(null);
  const guideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync amount changes to URL search params
  useEffect(() => {
    if (amount > 0) {
      setSearchParams({ amount: amount.toString() }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [amount, setSearchParams]);

  // Track remittance page view
  useEffect(() => {
    trackEvent('remittance', 'page_view', selectedCorridor);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate quotes whenever corridor or amount changes
  useEffect(() => {
    const updateQuotes = async () => {
      if (amount > 0) {
        setIsLoadingRates(true);
        try {
          const targetCurrencyForQuote = selectedCorridor.split('-')[1];
          const [midMarketRate, wiseQuote, comparisonData] = await Promise.all([
            getExchangeRate(selectedCorridor),
            fetchWiseQuote('SGD', targetCurrencyForQuote, amount),
            fetchComparison('SGD', targetCurrencyForQuote, amount),
          ]);
          const quoteOverrides = wiseQuote ? {
            wise: { fee: wiseQuote.fee, rate: wiseQuote.rate, rateSource: 'live' as const, deliveryEstimate: wiseQuote.deliveryEstimate }
          } : undefined;
          const calculatedQuotes = calculateQuotes(amount, selectedCorridor, providers, midMarketRate, quoteOverrides);
          setQuotes(calculatedQuotes);
          setBankProviders(
            comparisonData?.filter((p) => p.type === 'bank') ?? []
          );
          setRatesTimestamp(getCacheTimestamp());
          setRateSource(getRateSource());
        } catch (error) {
          console.error('Failed to fetch rates:', error);
          setQuotes([]);
          setBankProviders([]);
        } finally {
          setIsLoadingRates(false);
        }
      } else {
        setQuotes([]);
        setBankProviders([]);
      }
    };
    updateQuotes();
  }, [selectedCorridor, amount]);

  const handleProviderClick = (quote: ProviderQuote) => {
    trackEvent('remittance', 'provider_click', quote.providerId, amount);
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

    // Store URL and show guide — user proceeds via guide CTA
    setActiveGuideUrl(partnerizeUrl || deepLink);
    if (guideTimerRef.current) clearTimeout(guideTimerRef.current);
    setActiveGuide(quote.providerId);
  };

  const handleGuideProceed = () => {
    if (activeGuideUrl) {
      window.open(activeGuideUrl, '_blank', 'noopener,noreferrer');
    }
    setActiveGuide(null);
    setActiveGuideUrl(null);
    if (guideTimerRef.current) clearTimeout(guideTimerRef.current);
  };

  // Get target currency from corridor
  const targetCurrency = corridors.find(c => c.id === selectedCorridor)?.target || 'BDT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/')} className="text-gray-500 text-sm font-bold mb-1">&larr; {t('form.back')}</button>
        <h2 className="text-2xl font-black text-black">💸 {t('remittance.title')}</h2>
      </div>

      {/* Affiliate Disclosure */}
      <div className="bg-blue-50 border-2 border-blue-200 p-3 text-sm text-blue-800">
        {t('remittance.affiliateDisclosure')}
      </div>

      {/* Salary-to-Remittance Widget */}
      <SalaryToRemittanceWidget
        corridorId={selectedCorridor}
        onAmountCalculated={(amount) => {
          setAmount(amount);
          trackEvent('remittance', 'widget_amount_used', selectedCorridor, amount);
        }}
      />

      {/* Corridor Selector */}
      <CorridorSelector
        value={selectedCorridor}
        onChange={(corridor) => {
          setSelectedCorridor(corridor);
          trackEvent('remittance', 'corridor_selected', corridor);
        }}
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
            <>
              {quotes.length > 0 && quotes[0].savingsVsBank != null && quotes[0].savingsVsBank > 0 && (
                <div className="bg-green-50 border-2 border-green-300 p-3 text-green-800 font-bold text-center">
                  {t('remittance.savingsSummary', {
                    amount: amount,
                    name: quotes[0].providerName,
                    currency: targetCurrency,
                    receive: quotes[0].receiveAmount.toLocaleString(),
                    savings: Math.floor(quotes[0].savingsVsBank).toLocaleString(),
                  })}
                </div>
              )}
              <ProviderList
                quotes={quotes}
                targetCurrency={targetCurrency}
                onProviderClick={handleProviderClick}
                activeGuideProviderId={activeGuide}
                onDismissGuide={() => {
                  setActiveGuide(null);
                  setActiveGuideUrl(null);
                  if (guideTimerRef.current) clearTimeout(guideTimerRef.current);
                }}
                onGuideProceed={handleGuideProceed}
                bankProviders={bankProviders}
                bestTargetAmount={quotes.length > 0 ? quotes[0].receiveAmount : undefined}
              />
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-4 space-y-1">
        {ratesTimestamp && rateSource && (
          <div>
            {rateSource === 'wise'
              ? t('remittance.rateSourceWise', { time: formatTimeAgo(ratesTimestamp) })
              : rateSource === 'open-er-api'
                ? t('remittance.rateSourceEstimated', { time: formatTimeAgo(ratesTimestamp) })
                : t('remittance.rateSourceOffline')}
          </div>
        )}
        {(!ratesTimestamp || !rateSource) && (
          <div>{t('remittance.updatedJustNow')}</div>
        )}
      </div>
    </div>
  );
}
