import type { DayEntry, DayType } from '../types/timecard';
import type { PayslipInput, PayslipResult, DayPayResult } from '../types/payslip';
import {
  HOURLY_RATE_DIVISOR,
  DAILY_RATE_DIVISOR,
  NORMAL_HOURS_PER_DAY,
  MAX_DAILY_HOURS,
  MAX_MONTHLY_OT,
  MAX_DEDUCTION_RATIO,
  MAX_ACCOMMODATION_RATIO,
  OT_MULTIPLIER,
  REST_DAY_MULTIPLIER,
  getSgPublicHolidays,
} from './constants';

export function calcHourlyRate(monthlySalary: number): number {
  return (12 * monthlySalary) / HOURLY_RATE_DIVISOR;
}

export function calcDailyRate(monthlySalary: number): number {
  return monthlySalary / DAILY_RATE_DIVISOR;
}

export function calcWorkedHours(clockIn: string, clockOut: string, breakMinutes: number): number {
  const [inH, inM] = clockIn.split(':').map(Number);
  const [outH, outM] = clockOut.split(':').map(Number);
  let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // overnight shift
  totalMinutes -= breakMinutes;
  return Math.max(0, totalMinutes / 60);
}

export function isPublicHoliday(date: string): boolean {
  const year = parseInt(date.substring(0, 4), 10);
  return getSgPublicHolidays(year).has(date);
}

export function calcDayPay(entry: DayEntry, hourlyRate: number, dailyRate: number, otRate: number = hourlyRate * OT_MULTIPLIER): DayPayResult {
  const baseWorkedHours = calcWorkedHours(entry.clockIn, entry.clockOut, entry.breakMinutes);
  const extraOtHours = entry.extraOtHours ?? 0;
  const workedHours = baseWorkedHours + extraOtHours;
  const extraOtLabel = extraOtHours > 0 ? ` (+${extraOtHours})` : '';
  let basicPay = 0;
  let otPay = 0;
  let regularHours = 0;
  let otHours = 0;
  let description = '';

  // Determine effective day type - if PH falls on rest day, use PH rules (higher pay)
  const dayType: DayType = entry.dayType;

  switch (dayType) {
    case 'normal': {
      regularHours = Math.min(baseWorkedHours, NORMAL_HOURS_PER_DAY);
      otHours = Math.max(0, baseWorkedHours - NORMAL_HOURS_PER_DAY) + extraOtHours;
      // Basic pay is already part of monthly salary, so we only compute OT
      // For payslip breakdown, we show the daily portion of basic
      basicPay = regularHours * hourlyRate;
      otPay = otHours * otRate;
      description = otHours > 0 ? `Normal day + ${otHours.toFixed(1)}h OT${extraOtLabel}` : 'Normal day';
      break;
    }
    case 'rest': {
      // MOM rest day pay: up to half normal hours = 1 day's salary,
      // more than half = 2 days' salary, OT beyond normal hours at 1.5x hourly rate
      const halfDay = NORMAL_HOURS_PER_DAY / 2;
      if (baseWorkedHours <= halfDay) {
        regularHours = baseWorkedHours;
        otHours = extraOtHours;
        basicPay = dailyRate; // 1 day's salary
        otPay = otHours * otRate;
      } else if (baseWorkedHours <= NORMAL_HOURS_PER_DAY) {
        regularHours = baseWorkedHours;
        otHours = extraOtHours;
        basicPay = dailyRate * REST_DAY_MULTIPLIER; // 2 days' salary
        otPay = otHours * otRate;
      } else {
        regularHours = NORMAL_HOURS_PER_DAY;
        otHours = (baseWorkedHours - NORMAL_HOURS_PER_DAY) + extraOtHours;
        basicPay = dailyRate * REST_DAY_MULTIPLIER; // 2 days' salary
        otPay = otHours * otRate; // OT at 1.5x
      }
      description = otHours > 0 ? `Rest day + ${otHours.toFixed(1)}h OT${extraOtLabel}` : 'Rest day work';
      break;
    }
    case 'publicHoliday': {
      // PH work: 1 day gross (daily rate) + 1 day basic (daily rate) for working
      // Plus OT at 1.5x for hours beyond normal
      regularHours = Math.min(baseWorkedHours, NORMAL_HOURS_PER_DAY);
      otHours = Math.max(0, baseWorkedHours - NORMAL_HOURS_PER_DAY) + extraOtHours;
      // 1 day gross pay (already in monthly salary) + 1 extra day basic pay for working
      basicPay = dailyRate; // extra day's pay for working on PH
      otPay = otHours * otRate;
      description = otHours > 0 ? `Public holiday + ${otHours.toFixed(1)}h OT${extraOtLabel}` : 'Public holiday work';
      break;
    }
  }

  return {
    date: entry.date,
    dayType,
    workedHours: Math.round(workedHours * 100) / 100,
    regularHours: Math.round(regularHours * 100) / 100,
    otHours: Math.round(otHours * 100) / 100,
    basicPay: Math.round(basicPay * 100) / 100,
    otPay: Math.round(otPay * 100) / 100,
    totalDayPay: Math.round((basicPay + otPay) * 100) / 100,
    description,
  };
}

export function calcPayslip(input: PayslipInput): PayslipResult {
  const hourlyRate = (input.hourlyRateOverride && input.hourlyRateOverride > 0)
    ? input.hourlyRateOverride
    : calcHourlyRate(input.monthlySalary);
  const otRate = (input.otRateOverride && input.otRateOverride > 0)
    ? input.otRateOverride
    : hourlyRate * OT_MULTIPLIER;
  const dailyRate = calcDailyRate(input.monthlySalary);
  const warnings: string[] = [];

  // Calculate each day
  const dayBreakdown = input.timecard.entries.map(entry =>
    calcDayPay(entry, hourlyRate, dailyRate, otRate)
  );

  // Sum up pay categories
  let regularOtPay = 0;
  let restDayPay = 0;
  let publicHolidayPay = 0;
  let totalOtHours = 0;
  let totalWorkedHours = 0;

  for (const day of dayBreakdown) {
    totalOtHours += day.otHours;
    totalWorkedHours += day.workedHours;

    if (day.workedHours > MAX_DAILY_HOURS) {
      warnings.push(`${day.date}: Daily hours (${day.workedHours.toFixed(1)}) exceed 12-hour limit`);
    }

    switch (day.dayType) {
      case 'normal':
        regularOtPay += day.otPay;
        break;
      case 'rest':
        restDayPay += day.basicPay + day.otPay;
        break;
      case 'publicHoliday':
        publicHolidayPay += day.basicPay + day.otPay;
        break;
    }
  }

  if (totalOtHours > MAX_MONTHLY_OT) {
    warnings.push(`Monthly OT (${totalOtHours.toFixed(1)}h) exceeds 72-hour limit`);
  }

  // Allowances
  const allowanceBreakdown: { label: string; amount: number }[] = [];
  if (input.allowances.transport > 0) allowanceBreakdown.push({ label: 'Transport', amount: input.allowances.transport });
  if (input.allowances.food > 0) allowanceBreakdown.push({ label: 'Food', amount: input.allowances.food });
  if (input.allowances.other > 0) allowanceBreakdown.push({ label: 'Other', amount: input.allowances.other });
  const totalAllowances = allowanceBreakdown.reduce((sum, a) => sum + a.amount, 0);

  // Basic pay from monthly salary (pro-rata for the period is just the monthly salary for simplicity)
  const basicPay = input.monthlySalary;

  // Gross pay
  const grossPay = basicPay + regularOtPay + restDayPay + publicHolidayPay + totalAllowances;

  // Deductions with caps
  const deductionBreakdown: { label: string; amount: number }[] = [];
  let accommodation = input.deductions.accommodation;
  const maxAccommodation = input.monthlySalary * MAX_ACCOMMODATION_RATIO;
  if (accommodation > maxAccommodation) {
    accommodation = maxAccommodation;
  }
  if (accommodation > 0) deductionBreakdown.push({ label: 'Accommodation', amount: accommodation });
  if (input.deductions.meals > 0) deductionBreakdown.push({ label: 'Meals', amount: input.deductions.meals });
  if (input.deductions.advances > 0) deductionBreakdown.push({ label: 'Salary Advance', amount: input.deductions.advances });
  if (input.deductions.other > 0) deductionBreakdown.push({ label: 'Other', amount: input.deductions.other });

  let totalDeductions = deductionBreakdown.reduce((sum, d) => sum + d.amount, 0);
  const maxDeductions = input.monthlySalary * MAX_DEDUCTION_RATIO;
  if (totalDeductions > maxDeductions) {
    totalDeductions = maxDeductions;
    warnings.push(`Total deductions capped at 50% of salary (SGD ${maxDeductions.toFixed(2)})`);
  }

  const netPay = grossPay - totalDeductions;

  return {
    basicPay: Math.round(basicPay * 100) / 100,
    regularOtPay: Math.round(regularOtPay * 100) / 100,
    restDayPay: Math.round(restDayPay * 100) / 100,
    publicHolidayPay: Math.round(publicHolidayPay * 100) / 100,
    totalAllowances: Math.round(totalAllowances * 100) / 100,
    grossPay: Math.round(grossPay * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,
    dayBreakdown,
    deductionBreakdown,
    allowanceBreakdown,
    totalOtHours: Math.round(totalOtHours * 100) / 100,
    totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
    warnings,
  };
}
