import { useTranslation } from 'react-i18next';
import type { ComparisonProvider } from '../../lib/wise-compare';

interface ComparisonProviderCardProps {
  provider: ComparisonProvider;
  targetCurrency: string;
  bestTargetAmount?: number;
}

export default function ComparisonProviderCard({ provider, targetCurrency, bestTargetAmount }: ComparisonProviderCardProps) {
  const { t } = useTranslation();

  const speedLabel =
    provider.speedMaxHours <= 1
      ? '< 1 hour'
      : provider.speedMaxHours <= 24
        ? `${provider.speedMinHours}–${provider.speedMaxHours} hrs`
        : `${Math.ceil(provider.speedMinHours / 24)}–${Math.ceil(provider.speedMaxHours / 24)} days`;

  const difference = bestTargetAmount && bestTargetAmount > provider.targetAmount
    ? Math.floor(bestTargetAmount - provider.targetAmount)
    : null;

  return (
    <div className="bg-gray-50 border border-gray-300 p-4">
      <div className="flex items-center gap-3 mb-3">
        {provider.providerLogo && (
          <img
            src={provider.providerLogo}
            alt={provider.providerName}
            className="w-6 h-6 rounded"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <span className="font-bold text-gray-700">{provider.providerName}</span>
      </div>

      {provider.markup > 0 && (
        <div className="mb-2 text-sm font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1">
          {t('remittance.bankMarkup', { percent: provider.markup.toFixed(2) })}
        </div>
      )}

      <div className="space-y-1 text-sm text-gray-600">
        <div>
          <span className="font-medium">{t('remittance.fee')}:</span> S${provider.fee.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">{t('remittance.rate')}:</span> {provider.rate.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">{t('remittance.recipientGets')}:</span> {targetCurrency} {provider.targetAmount.toLocaleString()}
        </div>
        {difference != null && difference > 0 && (
          <div className="text-red-600 font-semibold">
            −{targetCurrency} {difference.toLocaleString()} vs best provider
          </div>
        )}
        <div className="text-gray-500">{speedLabel}</div>
      </div>

      <p className="mt-2 text-xs text-gray-400">{t('remittance.comparisonSource')}</p>
    </div>
  );
}
