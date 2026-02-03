import type { Provider } from '../types/remittance';

export const providers: Provider[] = [
  {
    id: 'wise',
    name: 'Wise',
    logo: '/logos/wise_logo.svg',
    affiliateUrl: 'https://wise.com/send',
    affiliateUrlTemplate: 'https://wise.com/send#/amount/{amount}/SGD/{targetCurrency}',
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
    affiliateUrl: 'https://www.remitly.com/us/en/singapore',
    affiliateUrlTemplate: 'https://www.remitly.com/us/en/singapore/send/{targetCountryCode}?amount={amount}',
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
    id: 'worldremit',
    name: 'WorldRemit',
    logo: '/logos/worldremit_logo.svg',
    affiliateUrl: 'https://www.worldremit.com/en/send-money',
    affiliateUrlTemplate: 'https://www.worldremit.com/en/send-money?sendAmount={amount}&sendCurrency=SGD&receiveCurrency={targetCurrency}',
    rateMargin: 0.015,
    fees: {
      'SGD-BDT': { fixed: 4.50, percent: 0 },
      'SGD-INR': { fixed: 4.50, percent: 0 },
      'SGD-CNY': { fixed: 5.50, percent: 0 },
      'SGD-MMK': { fixed: 5.50, percent: 0 },
      'SGD-PHP': { fixed: 4.50, percent: 0 },
      'SGD-IDR': { fixed: 4.50, percent: 0 },
      'SGD-THB': { fixed: 4.50, percent: 0 },
    },
    deliveryTime: '1-3 days',
  },
];

// Country codes for Remitly deep linking
export const countryCodeMap: Record<string, string> = {
  'BDT': 'bangladesh',
  'INR': 'india',
  'CNY': 'china',
  'MMK': 'myanmar',
  'PHP': 'philippines',
  'IDR': 'indonesia',
  'THB': 'thailand',
};
