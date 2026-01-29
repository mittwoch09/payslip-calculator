import { describe, it, expect } from 'vitest';
import { calcHourlyRate, calcDailyRate, calcWorkedHours, calcDayPay, calcPayslip } from './calculator';
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
  it('calculates correctly for $1000/month', () => {
    // 1000 / 21.67 = 46.15
    expect(calcDailyRate(1000)).toBeCloseTo(46.15, 1);
  });
});

describe('calcWorkedHours', () => {
  it('calculates 8 hours with 60 min break', () => {
    expect(calcWorkedHours('08:00', '17:00', 60)).toBe(8);
  });

  it('calculates 10 hours with 60 min break', () => {
    expect(calcWorkedHours('07:00', '18:00', 60)).toBe(10);
  });

  it('returns 0 for negative', () => {
    expect(calcWorkedHours('17:00', '08:00', 0)).toBe(0);
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
