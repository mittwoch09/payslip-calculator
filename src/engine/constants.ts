export const HOURS_PER_WEEK = 44;
export const HOURLY_RATE_DIVISOR = 2288; // 52 * 44
export const DAILY_RATE_DIVISOR = 21.67; // (52 * 5) / 12 = 260/12
export const NORMAL_HOURS_PER_DAY = 8;
export const MAX_DAILY_HOURS = 12;
export const MAX_MONTHLY_OT = 72;
export const MAX_DEDUCTION_RATIO = 0.50;
export const MAX_ACCOMMODATION_RATIO = 0.25;

export const OT_MULTIPLIER = 1.5;
export const REST_DAY_MULTIPLIER = 2.0;
export const PH_OT_MULTIPLIER = 1.5;

// Singapore Public Holidays 2026
// Hari Raya Puasa and Hari Raya Haji dates TBA - users can mark days manually
export const SG_PUBLIC_HOLIDAYS_2026: string[] = [
  '2026-01-01', // New Year's Day
  '2026-02-17', // Chinese New Year
  '2026-02-18', // Chinese New Year
  '2026-04-03', // Good Friday
  '2026-05-01', // Labour Day
  '2026-06-01', // Vesak Day (in lieu)
  '2026-08-10', // National Day (in lieu)
  '2026-11-09', // Deepavali (in lieu)
  '2026-12-25', // Christmas Day
];
