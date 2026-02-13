import type { Provider, ProviderQuote } from '../types/remittance';

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
  midMarketRate: number
): ProviderQuote[] {
  const quotes: ProviderQuote[] = providers.map((provider) => {
    // Get fee structure for this corridor
    const providerFee = provider.fees[corridorId] || { fixed: 0, percent: 0 };

    // Calculate fee: fixed + (amount * percent)
    const fee = providerFee.fixed + (amount * providerFee.percent);

    // Calculate provider rate: midMarketRate * (1 - rateMargin)
    const exchangeRate = midMarketRate * (1 - provider.rateMargin);

    // Calculate receive amount: floor((amount - fee) * providerRate)
    const receiveAmount = Math.floor((amount - fee) * exchangeRate);

    return {
      providerId: provider.id,
      providerName: provider.name,
      logo: provider.logo,
      sendAmount: amount,
      fee,
      exchangeRate,
      receiveAmount,
      deliveryTime: provider.deliveryTime,
      affiliateUrl: provider.affiliateUrl,
      affiliateUrlTemplate: provider.affiliateUrlTemplate,
      partnerizeRef: provider.partnerizeRef,
    };
  });

  // Sort quotes by receiveAmount descending (best rate first)
  return quotes.sort((a, b) => b.receiveAmount - a.receiveAmount);
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
