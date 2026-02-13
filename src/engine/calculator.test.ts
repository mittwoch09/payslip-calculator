import { describe, it, expect } from 'vitest';
import { calcHourlyRate, calcDailyRate, calcWorkedHours, calcDayPay, calcPayslip, isPublicHoliday } from './calculator';
import type { DayEntry } from '../types/timecard';
import type { PayslipInput } from '../types/payslip';

describe('calcHourlyRate', () => {
  it('calculates correctly for $1000/month', () => {
    // (12 * 1000) / 2288 = 5.2448...
    expect(calcHourlyRate(1000)).toBeCloseTo(5.24, 1);
  });

  it('calculates correctly for $2000/month', () => {
    expect(calcHourlyRate(2000)).toBeCloseTo(10.49, 1);
  });
});

describe('calcDailyRate', () => {
  it('calculates correctly for $1000/month (6-day workweek default)', () => {
    // 1000 / 26 = 38.46
    expect(calcDailyRate(1000)).toBeCloseTo(38.46, 1);
  });

  it('calculates correctly for 5-day workweek', () => {
    // 1000 / 21.67 = 46.15
    expect(calcDailyRate(1000, 5)).toBeCloseTo(46.15, 1);
  });
});

describe('calcWorkedHours', () => {
  it('calculates 8 hours with 60 min break', () => {
    expect(calcWorkedHours('08:00', '17:00', 60)).toBe(8);
  });

  it('calculates 10 hours with 60 min break', () => {
    expect(calcWorkedHours('07:00', '18:00', 60)).toBe(10);
  });

  it('handles overnight shift', () => {
    expect(calcWorkedHours('17:00', '08:00', 0)).toBe(15);
  });
});

describe('isPublicHoliday', () => {
  it('returns true for 2025 New Year', () => {
    expect(isPublicHoliday('2025-01-01')).toBe(true);
  });

  it('returns true for 2025 Polling Day', () => {
    expect(isPublicHoliday('2025-05-03')).toBe(true);
  });

  it('returns true for 2026 Chinese New Year', () => {
    expect(isPublicHoliday('2026-02-17')).toBe(true);
  });

  it('returns false for 2027 (no data)', () => {
    expect(isPublicHoliday('2027-01-01')).toBe(false);
  });

  it('returns false for non-holiday dates in 2025', () => {
    expect(isPublicHoliday('2025-06-15')).toBe(false);
  });
});

describe('calcDayPay', () => {
  const monthlySalary = 1000;
  const hourlyRate = calcHourlyRate(monthlySalary);
  const dailyRate = calcDailyRate(monthlySalary);

  it('normal day no OT', () => {
    const entry: DayEntry = { date: '2026-03-02', dayType: 'normal', clockIn: '08:00', clockOut: '17:00', breakMinutes: 60 };
    const result = calcDayPay(entry, hourlyRate, dailyRate);
    expect(result.workedHours).toBe(8);
    expect(result.otHours).toBe(0);
    expect(result.otPay).toBe(0);
  });

  it('normal day with 2h OT', () => {
    const entry: DayEntry = { date: '2026-03-02', dayType: 'normal', clockIn: '08:00', clockOut: '19:00', breakMinutes: 60 };
    const result = calcDayPay(entry, hourlyRate, dailyRate);
    expect(result.workedHours).toBe(10);
    expect(result.otHours).toBe(2);
    // OT = 2 * hourlyRate * 1.5
    expect(result.otPay).toBeCloseTo(2 * hourlyRate * 1.5, 1);
  });

  it('rest day up to half day = 1 day salary', () => {
    const entry: DayEntry = { date: '2026-03-01', dayType: 'rest', clockIn: '08:00', clockOut: '12:00', breakMinutes: 0 };
    const result = calcDayPay(entry, hourlyRate, dailyRate);
    expect(result.workedHours).toBe(4);
    expect(result.basicPay).toBeCloseTo(dailyRate, 1); // 1 day's salary
    expect(result.otPay).toBe(0);
  });

  it('rest day more than half day = 2 days salary', () => {
    const entry: DayEntry = { date: '2026-03-01', dayType: 'rest', clockIn: '08:00', clockOut: '17:00', breakMinutes: 60 };
    const result = calcDayPay(entry, hourlyRate, dailyRate);
    expect(result.workedHours).toBe(8);
    expect(result.basicPay).toBeCloseTo(dailyRate * 2, 1); // 2 days' salary
    expect(result.otPay).toBe(0);
  });

  it('rest day with OT beyond normal hours at 1.5x', () => {
    const entry: DayEntry = { date: '2026-03-01', dayType: 'rest', clockIn: '08:00', clockOut: '19:00', breakMinutes: 60 };
    const result = calcDayPay(entry, hourlyRate, dailyRate);
    expect(result.workedHours).toBe(10);
    expect(result.otHours).toBe(2);
    expect(result.basicPay).toBeCloseTo(dailyRate * 2, 1); // 2 days' salary
    expect(result.otPay).toBeCloseTo(2 * hourlyRate * 1.5, 1); // OT at 1.5x
  });

  it('public holiday extra day pay', () => {
    const entry: DayEntry = { date: '2026-01-01', dayType: 'publicHoliday', clockIn: '08:00', clockOut: '17:00', breakMinutes: 60 };
    const result = calcDayPay(entry, hourlyRate, dailyRate);
    expect(result.workedHours).toBe(8);
    expect(result.basicPay).toBeCloseTo(dailyRate, 1);
    expect(result.otPay).toBe(0);
  });

  it('public holiday with OT', () => {
    const entry: DayEntry = { date: '2026-01-01', dayType: 'publicHoliday', clockIn: '08:00', clockOut: '19:00', breakMinutes: 60 };
    const result = calcDayPay(entry, hourlyRate, dailyRate);
    expect(result.otHours).toBe(2);
    expect(result.otPay).toBeCloseTo(2 * hourlyRate * 1.5, 1);
  });
});

describe('calcPayslip', () => {
  const baseInput: PayslipInput = {
    employeeName: 'Test Worker',
    employerName: 'Test Corp',
    monthlySalary: 1000,
    paymentPeriodStart: '2026-03-01',
    paymentPeriodEnd: '2026-03-31',
    timecard: {
      entries: [
        { date: '2026-03-02', dayType: 'normal', clockIn: '08:00', clockOut: '17:00', breakMinutes: 60 },
        { date: '2026-03-03', dayType: 'normal', clockIn: '08:00', clockOut: '19:00', breakMinutes: 60 },
      ],
    },
    deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
    allowances: { transport: 0, food: 0, other: 0 },
  };

  it('calculates basic payslip', () => {
    const result = calcPayslip(baseInput);
    expect(result.basicPay).toBe(1000);
    expect(result.totalOtHours).toBe(2);
    expect(result.regularOtPay).toBeGreaterThan(0);
    expect(result.netPay).toBe(result.grossPay - result.totalDeductions);
    expect(result.warnings).toHaveLength(0);
  });

  it('caps accommodation deduction at 25%', () => {
    const input = { ...baseInput, deductions: { accommodation: 500, meals: 0, advances: 0, other: 0 } };
    const result = calcPayslip(input);
    expect(result.warnings.some(w => w.includes('25%'))).toBe(true);
  });

  it('caps total deductions at 50%', () => {
    const input = { ...baseInput, deductions: { accommodation: 200, meals: 200, advances: 200, other: 200 } };
    const result = calcPayslip(input);
    expect(result.totalDeductions).toBeLessThanOrEqual(500);
  });

  it('warns on daily hours exceeding 12', () => {
    const input = {
      ...baseInput,
      timecard: {
        entries: [
          { date: '2026-03-02', dayType: 'normal' as const, clockIn: '06:00', clockOut: '20:00', breakMinutes: 60 },
        ],
      },
    };
    const result = calcPayslip(input);
    expect(result.warnings.some(w => w.includes('12-hour'))).toBe(true);
  });

  it('includes allowances in gross pay', () => {
    const input = { ...baseInput, allowances: { transport: 100, food: 50, other: 0 } };
    const result = calcPayslip(input);
    expect(result.totalAllowances).toBe(150);
    expect(result.grossPay).toBe(result.basicPay + result.regularOtPay + result.restDayPay + result.publicHolidayPay + result.totalAllowances);
  });
});

describe('workDaysPerWeek and restDayInitiator', () => {
  it('5-day week: normal day 9h = no OT', () => {
    const entry: DayEntry = { date: '2026-03-02', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 };
    const hourlyRate = calcHourlyRate(1000);
    const dailyRate = calcDailyRate(1000, 5);
    const otRate = hourlyRate * 1.5;
    const result = calcDayPay(entry, hourlyRate, dailyRate, otRate, 9);
    expect(result.workedHours).toBe(9);
    expect(result.otHours).toBe(0);
    expect(result.otPay).toBe(0);
  });

  it('5-day week: normal day 10h = 1h OT', () => {
    const entry: DayEntry = { date: '2026-03-02', dayType: 'normal', clockIn: '08:00', clockOut: '19:00', breakMinutes: 60 };
    const hourlyRate = calcHourlyRate(1000);
    const dailyRate = calcDailyRate(1000, 5);
    const otRate = hourlyRate * 1.5;
    const result = calcDayPay(entry, hourlyRate, dailyRate, otRate, 9);
    expect(result.workedHours).toBe(10);
    expect(result.otHours).toBe(1);
    expect(result.otPay).toBeCloseTo(hourlyRate * 1.5, 1);
  });

  it('employee-requested rest day: half day = 0.5 day salary', () => {
    const hourlyRate = calcHourlyRate(1000);
    const dailyRate = calcDailyRate(1000);
    const otRate = hourlyRate * 1.5;
    const entry: DayEntry = { date: '2026-03-01', dayType: 'rest', clockIn: '08:00', clockOut: '12:00', breakMinutes: 0, restDayInitiator: 'employee' };
    const result = calcDayPay(entry, hourlyRate, dailyRate, otRate);
    expect(result.basicPay).toBeCloseTo(dailyRate * 0.5, 1);
  });

  it('employee-requested rest day: full day = 1 day salary', () => {
    const hourlyRate = calcHourlyRate(1000);
    const dailyRate = calcDailyRate(1000);
    const otRate = hourlyRate * 1.5;
    const entry: DayEntry = { date: '2026-03-01', dayType: 'rest', clockIn: '08:00', clockOut: '17:00', breakMinutes: 60, restDayInitiator: 'employee' };
    const result = calcDayPay(entry, hourlyRate, dailyRate, otRate);
    expect(result.basicPay).toBeCloseTo(dailyRate, 1);
  });

  it('employee-requested rest day with OT = 1 day salary + 1.5x OT', () => {
    const hourlyRate = calcHourlyRate(1000);
    const dailyRate = calcDailyRate(1000);
    const otRate = hourlyRate * 1.5;
    const entry: DayEntry = { date: '2026-03-01', dayType: 'rest', clockIn: '08:00', clockOut: '19:00', breakMinutes: 60, restDayInitiator: 'employee' };
    const result = calcDayPay(entry, hourlyRate, dailyRate, otRate);
    expect(result.basicPay).toBeCloseTo(dailyRate, 1);
    expect(result.otPay).toBeCloseTo(2 * hourlyRate * 1.5, 1);
  });

  it('employer-requested rest day (default): full day = 2 days salary', () => {
    const hourlyRate = calcHourlyRate(1000);
    const dailyRate = calcDailyRate(1000);
    const otRate = hourlyRate * 1.5;
    const entry: DayEntry = { date: '2026-03-01', dayType: 'rest', clockIn: '08:00', clockOut: '17:00', breakMinutes: 60 };
    const result = calcDayPay(entry, hourlyRate, dailyRate, otRate);
    expect(result.basicPay).toBeCloseTo(dailyRate * 2, 1);
  });

  it('calcPayslip with 5-day work week', () => {
    const input: PayslipInput = {
      employeeName: 'Test',
      employerName: 'Test',
      monthlySalary: 1000,
      paymentPeriodStart: '2026-03-02',
      paymentPeriodEnd: '2026-03-06',
      workDaysPerWeek: 5,
      timecard: {
        entries: [
          { date: '2026-03-02', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 }, // 9h = no OT with 5-day
        ],
      },
      deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
      allowances: { transport: 0, food: 0, other: 0 },
    };
    const result = calcPayslip(input);
    expect(result.totalOtHours).toBe(0);
    expect(result.regularOtPay).toBe(0);
  });
});
