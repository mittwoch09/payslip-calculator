import type { Provider, ProviderQuote, QuoteOverride } from '../types/remittance';

/**
 * Conservative estimate for Singapore bank international wire transfers.
 * Based on published DBS/OCBC/UOB pricing for non-promoted corridors as of Feb 2026.
 * This is an approximation, not a quote from any specific bank.
 */
export const BANK_TRANSFER_BENCHMARK = { fixed: 25, percent: 0, rateMargin: 0.04 };

/**
 * Calculate quotes from all providers for a given amount and corridor
 * @param amount - The amount to send in base currency
 * @param corridorId - The corridor ID (e.g., 'SGD-BDT')
 * @param providers - Array of providers to get quotes from
 * @param midMarketRate - The mid-market exchange rate
 * @returns Array of provider quotes sorted by receiveAmount (best first)
 */
export function calculateQuotes(
  amount: number,
  corridorId: string,
  providers: Provider[],
  midMarketRate: number,
  quoteOverrides?: Record<string, QuoteOverride>
): ProviderQuote[] {
  // Calculate bank benchmark receive amount for savings comparison
  const bankFee = BANK_TRANSFER_BENCHMARK.fixed + (amount * BANK_TRANSFER_BENCHMARK.percent);
  const bankRate = midMarketRate * (1 - BANK_TRANSFER_BENCHMARK.rateMargin);
  const bankReceiveAmount = Math.floor((amount - bankFee) * bankRate);

  const quotes: ProviderQuote[] = providers.map((provider) => {
    const override = quoteOverrides?.[provider.id];

    let fee: number;
    let exchangeRate: number;
    let rateSource: 'live' | 'estimated';

    if (override) {
      // Use override values (from live API in Phase 2)
      fee = override.fee;
      exchangeRate = override.rate;
      rateSource = override.rateSource || 'live';
    } else {
      // Use estimated values from provider config
      const providerFee = provider.fees[corridorId] || { fixed: 0, percent: 0 };
      fee = providerFee.fixed + (amount * providerFee.percent);
      exchangeRate = midMarketRate * (1 - provider.rateMargin);
      rateSource = 'estimated';
    }

    // Calculate receive amount
    const receiveAmount = Math.floor((amount - fee) * exchangeRate);
    const savingsVsBank = receiveAmount - bankReceiveAmount;

    return {
      providerId: provider.id,
      providerName: provider.name,
      logo: provider.logo,
      sendAmount: amount,
      fee,
      exchangeRate,
      receiveAmount,
      deliveryTime: override?.deliveryEstimate || provider.deliveryTime,
      deliveryEstimate: override?.deliveryEstimate,
      affiliateUrl: provider.affiliateUrl,
      affiliateUrlTemplate: provider.affiliateUrlTemplate,
      partnerizeRef: provider.partnerizeRef,
      savingsVsBank,
      rateSource,
    };
  });

  // Sort quotes by receiveAmount descending (best rate first)
  return quotes.sort((a, b) => b.receiveAmount - a.receiveAmount);
}

/**
 * Estimate savings vs bank for a quick preview (used by RemittanceCTA)
 * @returns savings amount in target currency, or null if rate unavailable
 */
export function estimateSavings(
  amount: number,
  corridorId: string,
  providers: Provider[],
  midMarketRate: number
): number | null {
  if (midMarketRate <= 1) return null;
  const quotes = calculateQuotes(amount, corridorId, providers, midMarketRate);
  if (quotes.length === 0) return null;
  return quotes[0].savingsVsBank ?? null;
}

/**
 * Get mock mid-market rate for MVP (without external API)
 * @param corridorId - The corridor ID (e.g., 'SGD-BDT')
 * @returns Mock mid-market rate
 */
export function getMockRate(corridorId: string): number {
  const mockRates: Record<string, number> = {
    'SGD-BDT': 91.2,
    'SGD-INR': 63.1,
    'SGD-CNY': 5.42,
    'SGD-MMK': 1590,
    'SGD-PHP': 42.5,
    'SGD-IDR': 11900,
    'SGD-THB': 26.8,
  };

  return mockRates[corridorId] || 1;
}
