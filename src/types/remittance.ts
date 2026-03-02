export interface Corridor {
  id: string;
  source: string;
  target: string;
  country: string;
  flag: string;
}

export interface ProviderFee {
  fixed: number;
  percent: number;
}

export interface Provider {
  id: string;
  name: string;
  logo: string;
  affiliateUrl: string;
  affiliateUrlTemplate?: string;
  affiliateId?: string; // Affiliate tracking ID from provider's partner program
  partnerizeRef?: string; // Partnerize camref for providers using Partnerize (e.g. Wise)
  rateMargin: number;
  fees: Record<string, ProviderFee>;
  deliveryTime: string;
  description?: string;    // i18n key for provider description
  features?: string[];     // i18n keys for feature bullets
  regulatedBy?: string;    // i18n key for regulation info
  checklist?: string[];    // i18n keys for pre-transfer checklist items
  steps?: string[];        // i18n keys for post-click step-by-step guide
}

export interface QuoteOverride {
  fee: number;
  rate: number;
  receiveAmount?: number;
  rateSource?: 'live' | 'estimated';
  deliveryEstimate?: string;
}

export interface ProviderQuote {
  providerId: string;
  providerName: string;
  logo: string;
  sendAmount: number;
  fee: number;
  exchangeRate: number;
  receiveAmount: number;
  deliveryTime: string;
  deliveryEstimate?: string;
  affiliateUrl: string;
  affiliateUrlTemplate?: string;
  partnerizeRef?: string;
  savingsVsBank?: number; // difference in receive amount vs typical bank transfer
  rateSource?: 'live' | 'estimated';
}

export interface ClickEvent {
  timestamp: number;
  providerId: string;
  corridor: string;
  amount: number;
}
