import { useTranslation } from 'react-i18next';
import ProviderCard from './ProviderCard';
import ComparisonProviderCard from './ComparisonProviderCard';
import type { ProviderQuote } from '../../types/remittance';
import type { ComparisonProvider } from '../../lib/wise-compare';

interface ProviderListProps {
  quotes: ProviderQuote[];
  targetCurrency: string;
  onProviderClick: (quote: ProviderQuote) => void;
  activeGuideProviderId?: string | null;
  onDismissGuide?: () => void;
  onGuideProceed?: () => void;
  bankProviders?: ComparisonProvider[];
  bestTargetAmount?: number;
}

export default function ProviderList({
  quotes,
  targetCurrency,
  onProviderClick,
  activeGuideProviderId,
  onDismissGuide,
  onGuideProceed,
  bankProviders,
  bestTargetAmount,
}: ProviderListProps) {
  const { t } = useTranslation();

  if (quotes.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        {t('remittance.noProviders')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {quotes.map((quote, index) => (
        <ProviderCard
          key={quote.providerId}
          quote={quote}
          targetCurrency={targetCurrency}
          isBest={index === 0}
          onSendNow={() => onProviderClick(quote)}
          showGuide={quote.providerId === activeGuideProviderId}
          onDismissGuide={onDismissGuide ?? (() => {})}
          onGuideProceed={onGuideProceed}
        />
      ))}

      {bankProviders && bankProviders.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
            {t('remittance.bankComparison')}
          </h4>
          {bankProviders.map((bank) => (
            <ComparisonProviderCard
              key={bank.providerName}
              provider={bank}
              targetCurrency={targetCurrency}
              bestTargetAmount={bestTargetAmount}
            />
          ))}
          <p className="text-xs text-gray-400">{t('remittance.bankComparisonNote')}</p>
        </div>
      )}
    </div>
  );
}
