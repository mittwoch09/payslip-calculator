import { useTranslation } from 'react-i18next';
import type { ProviderQuote } from '../../types/remittance';

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
          <span className="font-semibold">{t('remittance.fee')}:</span> S${quote.fee.toFixed(2)}
        </div>

        <div>
          <span className="font-semibold">{t('remittance.rate')}:</span> {quote.exchangeRate.toFixed(2)}
        </div>

        <div>
          <span className="font-semibold">{t('remittance.recipientGets')}:</span> {targetCurrency} {quote.receiveAmount.toFixed(2)}
        </div>

        <div className="text-sm text-gray-600">
          {quote.deliveryTime}
        </div>
      </div>

      <button
        onClick={onSendNow}
        className="mt-4 w-full bg-black text-white font-bold py-3 px-4 hover:bg-gray-800 transition-colors"
      >
        <span className="block">{t('remittance.sendNow')} →</span>
        <span className="block text-xs font-normal opacity-80 mt-1">{t('remittance.clickForActualRate')}</span>
      </button>
    </div>
  );
}
