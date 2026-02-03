import type { ClickEvent } from '../types/remittance';
import { countryCodeMap } from '../data/providers';

const STORAGE_KEY = 'affiliate_clicks';

interface BuildAffiliateUrlParams {
  amount: number;
  corridor: string;
  userId?: string;
}

export function buildAffiliateUrl(
  baseUrl: string,
  params: BuildAffiliateUrlParams
): string {
  const url = new URL(baseUrl);

  url.searchParams.set('utm_source', 'payslip-calculator');
  url.searchParams.set('utm_medium', 'affiliate');
  url.searchParams.set('utm_campaign', params.corridor);
  url.searchParams.set('amount', params.amount.toString());

  if (params.userId) {
    url.searchParams.set('user_id', params.userId);
  }

  return url.toString();
}

/**
 * Build a deep link with pre-filled amount for a provider
 * @param template - The URL template with placeholders
 * @param fallbackUrl - The fallback URL if template is not available
 * @param amount - The amount to send
 * @param corridor - The corridor ID (e.g., 'SGD-BDT')
 * @returns The deep link URL with pre-filled amount
 */
export function buildDeepLink(
  template: string | undefined,
  fallbackUrl: string,
  amount: number,
  corridor: string
): string {
  if (!template) {
    return fallbackUrl;
  }

  const targetCurrency = corridor.split('-')[1]; // e.g., 'BDT' from 'SGD-BDT'
  const targetCurrencyLower = targetCurrency.toLowerCase(); // e.g., 'bdt'
  const targetCountryCode = countryCodeMap[targetCurrency] || targetCurrency.toLowerCase();

  return template
    .replace('{amount}', amount.toString())
    .replace('{targetCurrency}', targetCurrency)
    .replace('{targetCurrencyLower}', targetCurrencyLower)
    .replace('{targetCountryCode}', targetCountryCode);
}

export function trackClick(event: ClickEvent): void {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const clicks: ClickEvent[] = existing ? JSON.parse(existing) : [];

    clicks.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clicks));
  } catch (error) {
    console.error('Failed to track click:', error);
  }
}

export function getClickHistory(): ClickEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to retrieve click history:', error);
    return [];
  }
}
