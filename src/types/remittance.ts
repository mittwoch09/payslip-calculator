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
  rateMargin: number;
  fees: Record<string, ProviderFee>;
  deliveryTime: string;
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
  affiliateUrl: string;
  affiliateUrlTemplate?: string;
}

export interface ClickEvent {
  timestamp: number;
  providerId: string;
  corridor: string;
  amount: number;
}
