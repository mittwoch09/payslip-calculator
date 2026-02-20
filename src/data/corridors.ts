import type { Corridor } from '../types/remittance';

export const corridors: Corridor[] = [
  {
    id: 'SGD-CNY',
    source: 'SGD',
    target: 'CNY',
    country: 'China',
    flag: '🇨🇳',
  },
  {
    id: 'SGD-INR',
    source: 'SGD',
    target: 'INR',
    country: 'India',
    flag: '🇮🇳',
  },
  {
    id: 'SGD-BDT',
    source: 'SGD',
    target: 'BDT',
    country: 'Bangladesh',
    flag: '🇧🇩',
  },
  {
    id: 'SGD-MMK',
    source: 'SGD',
    target: 'MMK',
    country: 'Myanmar',
    flag: '🇲🇲',
  },
  {
    id: 'SGD-PHP',
    source: 'SGD',
    target: 'PHP',
    country: 'Philippines',
    flag: '🇵🇭',
  },
  {
    id: 'SGD-IDR',
    source: 'SGD',
    target: 'IDR',
    country: 'Indonesia',
    flag: '🇮🇩',
  },
  {
    id: 'SGD-THB',
    source: 'SGD',
    target: 'THB',
    country: 'Thailand',
    flag: '🇹🇭',
  },
];

/** Map UI language to most likely remittance corridor */
export const languageToCorridorMap: Record<string, string> = {
  bn: 'SGD-BDT',   // Bengali → Bangladesh
  my: 'SGD-MMK',   // Myanmar → Myanmar
  zh: 'SGD-CNY',   // Chinese → China
  ta: 'SGD-INR',   // Tamil → India
  en: 'SGD-INR',   // English default → India
};
