import { useTranslation } from 'react-i18next';
import type { ProviderQuote } from '../../types/remittance';
import { providers } from '../../data/providers';
import ProviderInfo from './ProviderInfo';
import PreTransferChecklist from './PreTransferChecklist';
import TransferGuide from './TransferGuide';

interface ProviderCardProps {
  quote: ProviderQuote;
  isBest: boolean;
  targetCurrency: string;
  onSendNow: () => void;
  showGuide: boolean;
  onDismissGuide: () => void;
  onGuideProceed?: () => void;
}

export default function ProviderCard({
  quote,
  isBest,
  targetCurrency,
  onSendNow,
  showGuide,
  onDismissGuide,
  onGuideProceed,
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
          <span className="font-semibold">{t('remittance.fee')}:</span>{' '}
          {quote.rateSource === 'live' ? (
            <><span className="inline-block bg-green-100 text-green-800 text-xs font-bold px-1.5 py-0.5 mr-1">{t('remittance.liveQuote')}</span>S${quote.fee.toFixed(2)}</>
          ) : (
            <>{t('remittance.estimatedLabel')} S${quote.fee.toFixed(2)}</>
          )}
        </div>

        <div>
          <span className="font-semibold">{t('remittance.rate')}:</span>{' '}
          {quote.rateSource === 'live' ? (
            <><span className="inline-block bg-green-100 text-green-800 text-xs font-bold px-1.5 py-0.5 mr-1">{t('remittance.liveQuote')}</span>{quote.exchangeRate.toFixed(2)}</>
          ) : (
            <>{t('remittance.estimatedLabel')} {quote.exchangeRate.toFixed(2)}</>
          )}
        </div>

        <div>
          <span className="font-semibold">{t('remittance.recipientGets')}:</span> {targetCurrency} {quote.receiveAmount.toFixed(2)}
        </div>

        <div className="text-sm text-gray-600">
          {quote.deliveryEstimate || quote.deliveryTime}
        </div>
      </div>

      {quote.savingsVsBank != null && quote.savingsVsBank > 0 && quote.sendAmount > 100 && (
        <div className="mt-2 text-sm font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-1">
          {t('remittance.savingsVsBank', { amount: Math.floor(quote.savingsVsBank).toLocaleString(), currency: targetCurrency })}
        </div>
      )}

      {quote.rateSource !== 'live' && (
        <p className="mt-2 text-xs text-gray-500">
          {t('remittance.estimatedDisclaimer', { provider: quote.providerName })}
        </p>
      )}

      <button
        onClick={onSendNow}
        className="mt-3 w-full bg-black text-white font-bold py-3 px-4 hover:bg-gray-800 transition-colors"
      >
        {t('remittance.sendWithProvider', { provider: quote.providerName })} →
      </button>

      {showGuide && provider?.steps && (
        <TransferGuide
          providerName={quote.providerName}
          steps={provider.steps}
          onDismiss={onDismissGuide}
          onProceed={onGuideProceed}
        />
      )}

      {provider?.checklist && (
        <PreTransferChecklist
          providerName={quote.providerName}
          items={provider.checklist}
        />
      )}

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
