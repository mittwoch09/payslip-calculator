import type { TimeCard } from './timecard';

export interface PayslipInput {
  employeeName: string;
  employerName: string;
  monthlySalary: number;
  paymentPeriodStart: string;
  paymentPeriodEnd: string;
  timecard: TimeCard;
  deductions: {
    accommodation: number;
    meals: number;
    advances: number;
    other: number;
  };
  allowances: {
    transport: number;
    food: number;
    other: number;
  };
  hourlyRateOverride?: number;  // manual hourly basic rate
  otRateOverride?: number;      // manual overtime rate
}

export interface DayPayResult {
  date: string;
  dayType: import('./timecard').DayType;
  workedHours: number;
  regularHours: number;
  otHours: number;
  basicPay: number;
  otPay: number;
  totalDayPay: number;
  description: string;
}

export interface PayslipResult {
  basicPay: number;
  regularOtPay: number;
  restDayPay: number;
  publicHolidayPay: number;
  totalAllowances: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  dayBreakdown: DayPayResult[];
  deductionBreakdown: { label: string; amount: number }[];
  allowanceBreakdown: { label: string; amount: number }[];
  totalOtHours: number;
  totalWorkedHours: number;
  warnings: string[];
}
