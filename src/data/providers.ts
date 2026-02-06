import type { Provider } from '../types/remittance';

// IMPORTANT: All fees, margins, and delivery times below are ESTIMATES only.
// They are manually researched approximations, NOT live data from provider APIs.
// Last manually verified: February 2025
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
  },
  {
    id: 'wise',
    name: 'Wise',
    logo: '/logos/wise_logo.svg',
    affiliateUrl: 'https://wise.com/send-money/send-money-to-bangladesh',
    // Wise public send money page: https://wise.com/send-money/send-money-to-{targetCountryCode}
    affiliateUrlTemplate: 'https://wise.com/send-money/send-money-to-{targetCountryCode}',
    affiliateId: undefined, // TODO: Replace with actual Wise affiliate tracking ID from partner dashboard
    rateMargin: 0.005,
    fees: {
      'SGD-BDT': { fixed: 2.50, percent: 0 },
      'SGD-INR': { fixed: 2.50, percent: 0 },
      'SGD-CNY': { fixed: 2.50, percent: 0 },
      'SGD-MMK': { fixed: 3.00, percent: 0 },
      'SGD-PHP': { fixed: 2.50, percent: 0 },
      'SGD-IDR': { fixed: 2.50, percent: 0 },
      'SGD-THB': { fixed: 2.50, percent: 0 },
    },
    deliveryTime: '1-2 days',
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
