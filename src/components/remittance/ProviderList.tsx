import { useTranslation } from 'react-i18next';
import ProviderCard from './ProviderCard';
import type { ProviderQuote } from '../../types/remittance';

interface ProviderListProps {
  quotes: ProviderQuote[];
  targetCurrency: string;
  onProviderClick: (quote: ProviderQuote) => void;
}

export default function ProviderList({
  quotes,
  targetCurrency,
  onProviderClick,
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
        />
      ))}
    </div>
  );
}
