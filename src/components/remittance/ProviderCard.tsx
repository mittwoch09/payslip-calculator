import { useTranslation } from 'react-i18next';
import type { ProviderQuote } from '../../types/remittance';
import { providers } from '../../data/providers';
import ProviderInfo from './ProviderInfo';

interface ProviderCardProps {
  quote: ProviderQuote;
  isBest: boolean;
  targetCurrency: string;
  onSendNow: () => void;
}

export default function ProviderCard({
  quote,
  isBest,
  targetCurrency,
  onSendNow
}: ProviderCardProps) {
  const { t } = useTranslation();

  const provider = providers.find((p) => p.id === quote.providerId);

  return (
    <div className={`
      bg-white border-2 p-4
      ${isBest ? 'border-4 border-lime-400' : 'border-black'}
    `}>
      {isBest && (
        <div className="mb-2 text-lime-600 font-bold">
          🥇 {t('remittance.bestRate')}
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <img
          src={quote.logo}
          alt={quote.providerName}
          className="w-6 h-6 rounded"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <span className="font-bold text-lg">{quote.providerName}</span>
      </div>

      <div className="space-y-2">
        <div>
          <span className="font-semibold">{t('remittance.fee')}:</span> {t('remittance.estimatedLabel')} S${quote.fee.toFixed(2)}
        </div>

        <div>
          <span className="font-semibold">{t('remittance.rate')}:</span> {t('remittance.estimatedLabel')} {quote.exchangeRate.toFixed(2)}
        </div>

        <div>
          <span className="font-semibold">{t('remittance.recipientGets')}:</span> {targetCurrency} {quote.receiveAmount.toFixed(2)}
        </div>

        <div className="text-sm text-gray-600">
          {quote.deliveryTime}
        </div>
      </div>

      {quote.savingsVsBank != null && quote.savingsVsBank > 0 && quote.sendAmount > 100 && (
        <div className="mt-2 text-sm font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-1">
          {t('remittance.savingsVsBank', { amount: Math.floor(quote.savingsVsBank).toLocaleString(), currency: targetCurrency })}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        {t('remittance.estimatedDisclaimer', { provider: quote.providerName })}
      </p>

      <button
        onClick={onSendNow}
        className="mt-3 w-full bg-black text-white font-bold py-3 px-4 hover:bg-gray-800 transition-colors"
      >
        {quote.partnerizeRef ? `${t('remittance.checkRate')} → (${t('remittance.affiliateLink')})` : `${t('remittance.checkRate')} →`}
      </button>

      {provider?.features && provider.regulatedBy && (
        <ProviderInfo
          providerName={quote.providerName}
          features={provider.features}
          regulatedBy={provider.regulatedBy}
        />
      )}
    </div>
  );
}
