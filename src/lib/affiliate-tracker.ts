import type { ClickEvent } from '../types/remittance';

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
