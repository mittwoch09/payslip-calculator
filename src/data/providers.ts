import type { Provider } from '../types/remittance';

// IMPORTANT: All fees, margins, and delivery times below are ESTIMATES only.
// They are manually researched approximations, NOT live data from provider APIs.
// Last manually verified: February 2026
// Source: Provider websites (public pricing pages)
// These values may be outdated. Users are directed to provider websites for actual rates.
export const providers: Provider[] = [
  {
    id: 'remitly',
    name: 'Remitly',
    logo: '/logos/remitly_logo.svg',
    affiliateUrl: 'https://www.remitly.com/sg/en',
    // Remitly Singapore homepage (no corridor-specific public pages available)
    affiliateUrlTemplate: 'https://www.remitly.com/sg/en',
    affiliateId: undefined, // TODO: Replace with actual Remitly affiliate tracking ID from partner dashboard
    rateMargin: 0.012,
    fees: {
      'SGD-BDT': { fixed: 3.99, percent: 0 },
      'SGD-INR': { fixed: 3.99, percent: 0 },
      'SGD-CNY': { fixed: 4.99, percent: 0 },
      'SGD-MMK': { fixed: 4.99, percent: 0 },
      'SGD-PHP': { fixed: 3.99, percent: 0 },
      'SGD-IDR': { fixed: 3.99, percent: 0 },
      'SGD-THB': { fixed: 3.99, percent: 0 },
    },
    deliveryTime: 'Minutes to 1 day',
    description: 'providerInfo.remitly.description',
    features: [
      'providerInfo.remitly.fastDelivery',
      'providerInfo.remitly.firstTransfer',
      'providerInfo.remitly.mobile',
      'providerInfo.remitly.support',
    ],
    regulatedBy: 'providerInfo.remitly.regulatedBy',
  },
  {
    id: 'wise',
    name: 'Wise',
    logo: '/logos/wise_logo.svg',
    affiliateUrl: 'https://wise.com/compare/',
    // Wise compare page with pre-filled currency and amount: sourceCurrency=SGD, targetCurrency, sendAmount
    affiliateUrlTemplate: 'https://wise.com/compare/?sourceCurrency=SGD&targetCurrency={targetCurrency}&sendAmount={amount}',
    affiliateId: undefined, // TODO: Replace with actual Wise affiliate tracking ID from partner dashboard
    // Partnerize tracking: after Wise affiliate approval, set camref from Partnerize dashboard
    // e.g. partnerizeRef: '1234567890abcdef'
    partnerizeRef: import.meta.env.VITE_WISE_CAMREF || '',
    rateMargin: 0.005,
    fees: {
      // Wise uses variable pricing; these are typical fees for ~S$500 transfers from Singapore
      // Last verified: February 2026 on wise.com/pricing
      'SGD-BDT': { fixed: 1.51, percent: 0.0062 },
      'SGD-INR': { fixed: 1.51, percent: 0.0062 },
      'SGD-CNY': { fixed: 1.51, percent: 0.0062 },
      'SGD-MMK': { fixed: 1.51, percent: 0.0121 },
      'SGD-PHP': { fixed: 1.51, percent: 0.0062 },
      'SGD-IDR': { fixed: 1.51, percent: 0.0062 },
      'SGD-THB': { fixed: 1.51, percent: 0.0062 },
    },
    deliveryTime: 'Usually within 24 hours',
    description: 'providerInfo.wise.description',
    features: [
      'providerInfo.wise.midMarketRate',
      'providerInfo.wise.regulated',
      'providerInfo.wise.transparent',
      'providerInfo.wise.speed',
    ],
    regulatedBy: 'providerInfo.wise.regulatedBy',
  },
];

// Country codes for deep linking
export const countryCodeMap: Record<string, string> = {
  'BDT': 'bangladesh',
  'INR': 'india',
  'CNY': 'china',
  'MMK': 'myanmar',
  'PHP': 'philippines',
  'IDR': 'indonesia',
  'THB': 'thailand',
};
