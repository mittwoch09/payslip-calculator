import type { Provider } from '../types/remittance';

export const providers: Provider[] = [
  {
    id: 'wise',
    name: 'Wise',
    logo: '/logos/wise_logo.svg',
    affiliateUrl: 'https://wise.com/send-money/send-money-to-bangladesh',
    // Wise public send money page: https://wise.com/send-money/send-money-to-{targetCountryCode}
    affiliateUrlTemplate: 'https://wise.com/send-money/send-money-to-{targetCountryCode}',
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
  {
    id: 'remitly',
    name: 'Remitly',
    logo: '/logos/remitly_logo.svg',
    affiliateUrl: 'https://www.remitly.com/sg/en',
    // Remitly Singapore homepage (no corridor-specific public pages available)
    affiliateUrlTemplate: 'https://www.remitly.com/sg/en',
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
    id: 'instarem',
    name: 'InstaReM',
    logo: '/logos/Instarem_logo.jpeg',
    affiliateUrl: 'https://www.instarem.com/en-sg/',
    affiliateUrlTemplate: 'https://www.instarem.com/en-sg/',
    rateMargin: 0.007,
    fees: {
      'SGD-BDT': { fixed: 0, percent: 0.006 },
      'SGD-INR': { fixed: 0, percent: 0.005 },
      'SGD-CNY': { fixed: 0, percent: 0.0065 },
      'SGD-MMK': { fixed: 0, percent: 0.007 },
      'SGD-PHP': { fixed: 0, percent: 0.006 },
      'SGD-IDR': { fixed: 0, percent: 0.006 },
      'SGD-THB': { fixed: 0, percent: 0.0065 },
    },
    deliveryTime: 'Instant to 1 day',
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
