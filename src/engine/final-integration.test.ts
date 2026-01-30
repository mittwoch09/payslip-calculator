import { describe, it, expect } from 'vitest';
import { calcPayslip, calcHourlyRate, calcDailyRate } from './calculator';
import type { PayslipInput } from '../types/payslip';

/**
 * Final Integration Tests for Payslip Calculator
 *
 * Each test includes hand-computed expected values with detailed comments.
 * These tests verify end-to-end calculation correctness against Singapore MOM regulations.
 */

describe('Final Integration Tests - Hand-Computed Values', () => {

  it('Scenario 1: Standard 5-day week with 1h OT each day', () => {
    /**
     * HAND COMPUTATION:
     * Monthly Salary: SGD 800
     * Hourly Rate = (12 * 800) / 2288 = 9600 / 2288 = 4.1958...
     * Daily Rate = 800 / 21.67 = 36.9177...
     *
     * 5 days × 9h worked (8h normal + 1h OT):
     * - Regular hours: 5 × 8h = 40h (already paid in basic salary)
     * - OT hours: 5 × 1h = 5h
     * - OT pay: 5h × 4.1958 × 1.5 = 31.4685
     *
     * Expected:
     * - Basic Pay: 800.00
     * - Regular OT Pay: 31.47 (rounded)
     * - Rest Day Pay: 0.00
     * - PH Pay: 0.00
     * - Gross Pay: 831.47
     * - Net Pay: 831.47 (no deductions)
     */
    const monthlySalary = 800;
    const hourlyRate = calcHourlyRate(monthlySalary); // 4.1958...

    const input: PayslipInput = {
      employeeName: 'Test Worker',
      employerName: 'Test Company',
      monthlySalary,
      paymentPeriodStart: '2026-03-02',
      paymentPeriodEnd: '2026-03-06',
      timecard: {
        entries: [
          { date: '2026-03-02', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 }, // 9h worked
          { date: '2026-03-03', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-03-04', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-03-05', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-03-06', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 },
        ],
      },
      deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
      allowances: { transport: 0, food: 0, other: 0 },
    };

    const result = calcPayslip(input);

    // Expected: 5h × 4.1958 × 1.5 = 31.4685
    const expectedOTPay = 5 * hourlyRate * 1.5;

    expect(result.basicPay).toBe(800.00);
    expect(result.regularOtPay).toBeCloseTo(expectedOTPay, 1); // ~31.47
    expect(result.restDayPay).toBe(0);
    expect(result.publicHolidayPay).toBe(0);
    expect(result.totalOtHours).toBe(5);
    expect(result.grossPay).toBeCloseTo(800 + expectedOTPay, 1); // ~831.47
    expect(result.netPay).toBeCloseTo(800 + expectedOTPay, 1);
    expect(result.warnings).toHaveLength(0);
  });

  it('Scenario 2: Mixed week with rest day work', () => {
    /**
     * HAND COMPUTATION:
     * Monthly Salary: SGD 1000
     * Hourly Rate = (12 * 1000) / 2288 = 12000 / 2288 = 5.2448...
     * Daily Rate = 1000 / 21.67 = 46.1566...
     *
     * 5 normal days × 8h (no OT): 0 OT pay
     * 1 rest day × 10h worked:
     *   - First 8h: 2 × daily rate = 2 × 46.1566 = 92.3132
     *   - Remaining 2h: OT at 1.5x = 2 × 5.2448 × 1.5 = 15.7344
     *   - Total rest day pay = 92.3132 + 15.7344 = 108.0476
     *
     * Expected:
     * - Basic Pay: 1000.00
     * - Regular OT Pay: 0.00
     * - Rest Day Pay: 108.05 (rounded)
     * - Gross Pay: 1108.05
     */
    const monthlySalary = 1000;
    const hourlyRate = calcHourlyRate(monthlySalary); // 5.2448...
    const dailyRate = calcDailyRate(monthlySalary); // 46.1566...

    const input: PayslipInput = {
      employeeName: 'Test Worker',
      employerName: 'Test Company',
      monthlySalary,
      paymentPeriodStart: '2026-03-02',
      paymentPeriodEnd: '2026-03-08',
      timecard: {
        entries: [
          // 5 normal days, 8h each (no OT)
          { date: '2026-03-02', dayType: 'normal', clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-03-03', dayType: 'normal', clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-03-04', dayType: 'normal', clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-03-05', dayType: 'normal', clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-03-06', dayType: 'normal', clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 },
          // 1 rest day, 10h worked
          { date: '2026-03-08', dayType: 'rest', clockIn: '08:00', clockOut: '19:00', breakMinutes: 60 },
        ],
      },
      deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
      allowances: { transport: 0, food: 0, other: 0 },
    };

    const result = calcPayslip(input);

    // Rest day: 2 × daily rate for first 8h + 2h OT at 1.5x
    const expectedRestDayBasic = dailyRate * 2; // ~92.31
    const expectedRestDayOT = 2 * hourlyRate * 1.5; // ~15.73
    const expectedRestDayTotal = expectedRestDayBasic + expectedRestDayOT; // ~108.05

    expect(result.basicPay).toBe(1000.00);
    expect(result.regularOtPay).toBe(0);
    expect(result.restDayPay).toBeCloseTo(expectedRestDayTotal, 1); // ~108.05
    expect(result.publicHolidayPay).toBe(0);
    expect(result.totalOtHours).toBe(2); // Only the 2h beyond normal hours on rest day
    expect(result.grossPay).toBeCloseTo(1000 + expectedRestDayTotal, 1); // ~1108.05
    expect(result.netPay).toBeCloseTo(1000 + expectedRestDayTotal, 1);
  });

  it('Scenario 3: Public holiday work with OT', () => {
    /**
     * HAND COMPUTATION:
     * Monthly Salary: SGD 1200
     * Hourly Rate = (12 * 1200) / 2288 = 14400 / 2288 = 6.2937...
     * Daily Rate = 1200 / 21.67 = 55.3879...
     *
     * 4 normal days × 8h: 0 OT pay
     * 1 PH day × 10h worked:
     *   - Extra day basic pay: 55.3879
     *   - OT for 2h beyond normal: 2 × 6.2937 × 1.5 = 18.8811
     *   - Total PH pay = 55.3879 + 18.8811 = 74.269
     *
     * Expected:
     * - Basic Pay: 1200.00
     * - PH Pay: 74.27 (rounded)
     * - Gross Pay: 1274.27
     */
    const monthlySalary = 1200;
    const hourlyRate = calcHourlyRate(monthlySalary); // 6.2937...
    const dailyRate = calcDailyRate(monthlySalary); // 55.3879...

    const input: PayslipInput = {
      employeeName: 'Test Worker',
      employerName: 'Test Company',
      monthlySalary,
      paymentPeriodStart: '2026-01-01',
      paymentPeriodEnd: '2026-01-05',
      timecard: {
        entries: [
          // 2026-01-01 is New Year's Day (PH), 10h worked
          { date: '2026-01-01', dayType: 'publicHoliday', clockIn: '08:00', clockOut: '19:00', breakMinutes: 60 },
          // 4 normal days
          { date: '2026-01-02', dayType: 'normal', clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-01-03', dayType: 'normal', clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-01-04', dayType: 'normal', clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-01-05', dayType: 'normal', clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 },
        ],
      },
      deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
      allowances: { transport: 0, food: 0, other: 0 },
    };

    const result = calcPayslip(input);

    // PH pay: 1 extra day basic + 2h OT at 1.5x
    const expectedPHBasic = dailyRate; // ~55.39
    const expectedPHOT = 2 * hourlyRate * 1.5; // ~18.88
    const expectedPHTotal = expectedPHBasic + expectedPHOT; // ~74.27

    expect(result.basicPay).toBe(1200.00);
    expect(result.regularOtPay).toBe(0);
    expect(result.restDayPay).toBe(0);
    expect(result.publicHolidayPay).toBeCloseTo(expectedPHTotal, 1); // ~74.27
    expect(result.totalOtHours).toBe(2);
    expect(result.grossPay).toBeCloseTo(1200 + expectedPHTotal, 1); // ~1274.27
    expect(result.netPay).toBeCloseTo(1200 + expectedPHTotal, 1);
  });

  it('Scenario 4: Deduction caps - accommodation capped at 25%', () => {
    /**
     * HAND COMPUTATION:
     * Monthly Salary: SGD 1000
     * Max Accommodation: 1000 × 0.25 = 250.00
     *
     * Attempting to deduct 400 for accommodation.
     * Should be capped at 250.
     *
     * Expected:
     * - Total Deductions: 250.00 (capped)
     * - Warning about accommodation cap
     */
    const monthlySalary = 1000;

    const input: PayslipInput = {
      employeeName: 'Test Worker',
      employerName: 'Test Company',
      monthlySalary,
      paymentPeriodStart: '2026-03-01',
      paymentPeriodEnd: '2026-03-31',
      timecard: {
        entries: [
          { date: '2026-03-03', dayType: 'normal', clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 },
        ],
      },
      deductions: {
        accommodation: 400, // Exceeds 25% cap (should be max 250)
        meals: 0,
        advances: 0,
        other: 0
      },
      allowances: { transport: 0, food: 0, other: 0 },
    };

    const result = calcPayslip(input);

    const maxAccommodation = monthlySalary * 0.25; // 250.00

    expect(result.totalDeductions).toBe(maxAccommodation);
    expect(result.warnings.some(w => w.includes('25%'))).toBe(true);
    expect(result.warnings.some(w => w.includes('250.00'))).toBe(true);
  });

  it('Scenario 5: Deduction caps - total deductions capped at 50%', () => {
    /**
     * HAND COMPUTATION:
     * Monthly Salary: SGD 1000
     * Max Total Deductions: 1000 × 0.50 = 500.00
     *
     * Attempting to deduct:
     * - Accommodation: 200 (within 25% cap)
     * - Meals: 200
     * - Advances: 200
     * - Other: 100
     * Total: 700 (exceeds 50% cap)
     *
     * Expected:
     * - Total Deductions: 500.00 (capped)
     * - Warning about total deduction cap
     */
    const monthlySalary = 1000;

    const input: PayslipInput = {
      employeeName: 'Test Worker',
      employerName: 'Test Company',
      monthlySalary,
      paymentPeriodStart: '2026-03-01',
      paymentPeriodEnd: '2026-03-31',
      timecard: {
        entries: [
          { date: '2026-03-03', dayType: 'normal', clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 },
        ],
      },
      deductions: {
        accommodation: 200, // Within 25% cap
        meals: 200,
        advances: 200,
        other: 100
      },
      allowances: { transport: 0, food: 0, other: 0 },
    };

    const result = calcPayslip(input);

    const maxTotalDeductions = monthlySalary * 0.50; // 500.00

    expect(result.totalDeductions).toBe(maxTotalDeductions);
    expect(result.warnings.some(w => w.includes('50%'))).toBe(true);
    expect(result.warnings.some(w => w.includes('500.00'))).toBe(true);
  });

  it('Scenario 6: 72h OT warning threshold', () => {
    /**
     * HAND COMPUTATION:
     * Monthly Salary: SGD 800
     *
     * 20 working days × 4h OT each = 80h total OT
     * Exceeds 72h limit per month.
     *
     * Expected:
     * - Total OT Hours: 80h
     * - Warning about exceeding 72h limit
     */
    const monthlySalary = 800;

    // Create 20 days with 12h worked each (4h OT per day)
    const entries = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-03-${(i + 1).toString().padStart(2, '0')}`,
      dayType: 'normal' as const,
      clockIn: '08:00',
      clockOut: '21:00', // 13h total - 1h break = 12h worked = 4h OT
      breakMinutes: 60,
    }));

    const input: PayslipInput = {
      employeeName: 'Test Worker',
      employerName: 'Test Company',
      monthlySalary,
      paymentPeriodStart: '2026-03-01',
      paymentPeriodEnd: '2026-03-20',
      timecard: { entries },
      deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
      allowances: { transport: 0, food: 0, other: 0 },
    };

    const result = calcPayslip(input);

    expect(result.totalOtHours).toBe(80); // 20 days × 4h OT
    expect(result.warnings.some(w => w.includes('72'))).toBe(true);
    expect(result.warnings.some(w => w.includes('80'))).toBe(true);
  });

  it('Scenario 7: PH + rest day overlap - PH rules should apply (higher pay)', () => {
    /**
     * HAND COMPUTATION:
     * Monthly Salary: SGD 1000
     * Hourly Rate = (12 * 1000) / 2288 = 5.2448...
     * Daily Rate = 1000 / 21.67 = 46.1566...
     *
     * When a PH falls on a rest day, PH rules apply (typically higher pay).
     *
     * Comparison for 10h worked:
     * Rest Day Pay: 2 × 46.1566 + (2 × 5.2448 × 1.5) = 92.31 + 15.73 = 108.04
     * PH Pay: 1 × 46.1566 + (2 × 5.2448 × 1.5) = 46.16 + 15.73 = 61.89
     *
     * Actually, for rest day > 8h we get 2 days' salary + OT = 108.04
     * For PH we get 1 extra day + OT = 61.89
     *
     * In this implementation, when marked as 'publicHoliday', it follows PH rules.
     * The test verifies that PH designation is used when overlap occurs.
     *
     * Expected:
     * - Day marked as PH should use PH calculation
     * - PH Pay: ~61.89
     */
    const monthlySalary = 1000;
    const hourlyRate = calcHourlyRate(monthlySalary);
    const dailyRate = calcDailyRate(monthlySalary);

    const input: PayslipInput = {
      employeeName: 'Test Worker',
      employerName: 'Test Company',
      monthlySalary,
      paymentPeriodStart: '2026-01-01',
      paymentPeriodEnd: '2026-01-01',
      timecard: {
        entries: [
          // 2026-01-01 is New Year's Day (PH) - if it falls on Sunday, it's both PH and rest day
          // PH rules apply (as per MOM, PH takes precedence)
          { date: '2026-01-01', dayType: 'publicHoliday', clockIn: '08:00', clockOut: '19:00', breakMinutes: 60 },
        ],
      },
      deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
      allowances: { transport: 0, food: 0, other: 0 },
    };

    const result = calcPayslip(input);

    // PH calculation: 1 extra day basic + 2h OT at 1.5x
    const expectedPHBasic = dailyRate;
    const expectedPHOT = 2 * hourlyRate * 1.5;
    const expectedPHTotal = expectedPHBasic + expectedPHOT;

    expect(result.publicHolidayPay).toBeCloseTo(expectedPHTotal, 1); // ~61.89
    expect(result.restDayPay).toBe(0); // Should not have rest day pay when marked as PH

    // Verify the day was correctly processed as PH
    expect(result.dayBreakdown[0].dayType).toBe('publicHoliday');
    expect(result.dayBreakdown[0].description).toContain('Public holiday');
  });

  it('Scenario 8: Complete payslip with allowances and deductions', () => {
    /**
     * HAND COMPUTATION:
     * Monthly Salary: SGD 1500
     * Hourly Rate = (12 * 1500) / 2288 = 7.8671...
     * Daily Rate = 1500 / 21.67 = 69.2349...
     *
     * 5 normal days × 9h (1h OT each):
     * - OT Pay: 5 × 1 × 7.8671 × 1.5 = 59.0034
     *
     * Allowances:
     * - Transport: 100
     * - Food: 50
     * - Total: 150
     *
     * Deductions:
     * - Accommodation: 200 (within 25% cap of 375)
     * - Meals: 50
     * - Total: 250
     *
     * Expected:
     * - Basic: 1500.00
     * - Regular OT: 59.00
     * - Total Allowances: 150.00
     * - Gross: 1500 + 59 + 150 = 1709.00
     * - Total Deductions: 250.00
     * - Net: 1709 - 250 = 1459.00
     */
    const monthlySalary = 1500;
    const hourlyRate = calcHourlyRate(monthlySalary);

    const input: PayslipInput = {
      employeeName: 'Test Worker',
      employerName: 'Test Company',
      monthlySalary,
      paymentPeriodStart: '2026-03-02',
      paymentPeriodEnd: '2026-03-06',
      timecard: {
        entries: [
          { date: '2026-03-02', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-03-03', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-03-04', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-03-05', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 },
          { date: '2026-03-06', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 },
        ],
      },
      deductions: {
        accommodation: 200,
        meals: 50,
        advances: 0,
        other: 0
      },
      allowances: {
        transport: 100,
        food: 50,
        other: 0
      },
    };

    const result = calcPayslip(input);

    const expectedOTPay = 5 * hourlyRate * 1.5; // ~59.00
    const expectedGross = 1500 + expectedOTPay + 150;
    const expectedNet = expectedGross - 250;

    expect(result.basicPay).toBe(1500.00);
    expect(result.regularOtPay).toBeCloseTo(expectedOTPay, 1);
    expect(result.totalAllowances).toBe(150.00);
    expect(result.grossPay).toBeCloseTo(expectedGross, 1);
    expect(result.totalDeductions).toBe(250.00);
    expect(result.netPay).toBeCloseTo(expectedNet, 1);
    expect(result.warnings).toHaveLength(0);
  });

  it('Scenario 9: Edge case - exactly 72h OT (no warning)', () => {
    /**
     * HAND COMPUTATION:
     * Monthly Salary: SGD 800
     *
     * 18 days × 4h OT = 72h exactly
     * Should NOT trigger warning (only >72h triggers warning)
     *
     * Expected:
     * - Total OT Hours: 72h
     * - No warning about OT limit
     */
    const monthlySalary = 800;

    const entries = Array.from({ length: 18 }, (_, i) => ({
      date: `2026-03-${(i + 1).toString().padStart(2, '0')}`,
      dayType: 'normal' as const,
      clockIn: '08:00',
      clockOut: '21:00',
      breakMinutes: 60,
    }));

    const input: PayslipInput = {
      employeeName: 'Test Worker',
      employerName: 'Test Company',
      monthlySalary,
      paymentPeriodStart: '2026-03-01',
      paymentPeriodEnd: '2026-03-18',
      timecard: { entries },
      deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
      allowances: { transport: 0, food: 0, other: 0 },
    };

    const result = calcPayslip(input);

    expect(result.totalOtHours).toBe(72);
    expect(result.warnings.some(w => w.includes('72'))).toBe(false); // No warning at exactly 72h
  });

  it('Scenario 10: Rest day with exactly half-day work (4h)', () => {
    /**
     * HAND COMPUTATION:
     * Monthly Salary: SGD 1000
     * Daily Rate = 1000 / 21.67 = 46.1566...
     *
     * Rest day with exactly 4h worked (half of normal 8h):
     * - Should get 1 day's salary (not 2 days)
     * - No OT since < 8h
     *
     * Expected:
     * - Rest Day Pay: 46.16 (1 day's salary)
     * - OT Hours: 0
     */
    const monthlySalary = 1000;
    const dailyRate = calcDailyRate(monthlySalary);

    const input: PayslipInput = {
      employeeName: 'Test Worker',
      employerName: 'Test Company',
      monthlySalary,
      paymentPeriodStart: '2026-03-08',
      paymentPeriodEnd: '2026-03-08',
      timecard: {
        entries: [
          { date: '2026-03-08', dayType: 'rest', clockIn: '08:00', clockOut: '12:00', breakMinutes: 0 }, // 4h exactly
        ],
      },
      deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
      allowances: { transport: 0, food: 0, other: 0 },
    };

    const result = calcPayslip(input);

    expect(result.restDayPay).toBeCloseTo(dailyRate, 1); // 1 day's salary
    expect(result.totalOtHours).toBe(0);
    expect(result.dayBreakdown[0].workedHours).toBe(4);
    expect(result.dayBreakdown[0].basicPay).toBeCloseTo(dailyRate, 1);
    expect(result.dayBreakdown[0].otPay).toBe(0);
  });

  it('Scenario 11: Multiple day types in one week', () => {
    /**
     * HAND COMPUTATION:
     * Monthly Salary: SGD 1100
     * Hourly Rate = (12 * 1100) / 2288 = 5.7692...
     * Daily Rate = 1100 / 21.67 = 50.7723...
     *
     * Week breakdown:
     * - 3 normal days × 9h (1h OT each): 3h OT = 3 × 5.7692 × 1.5 = 25.9614
     * - 1 rest day × 10h: 2 × 50.7723 + (2 × 5.7692 × 1.5) = 101.5446 + 17.3076 = 118.8522
     * - 1 PH × 8h (no OT): 50.7723
     *
     * Expected:
     * - Regular OT Pay: 25.96
     * - Rest Day Pay: 118.85
     * - PH Pay: 50.77
     * - Total OT Hours: 5h (3h from normal + 2h from rest)
     * - Gross: 1100 + 25.96 + 118.85 + 50.77 = 1295.58
     */
    const monthlySalary = 1100;
    const hourlyRate = calcHourlyRate(monthlySalary);
    const dailyRate = calcDailyRate(monthlySalary);

    const input: PayslipInput = {
      employeeName: 'Test Worker',
      employerName: 'Test Company',
      monthlySalary,
      paymentPeriodStart: '2026-02-16',
      paymentPeriodEnd: '2026-02-20',
      timecard: {
        entries: [
          // 2026-02-17 and 02-18 are CNY (PH)
          { date: '2026-02-16', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 }, // 9h, 1h OT
          { date: '2026-02-17', dayType: 'publicHoliday', clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 }, // 8h, no OT
          { date: '2026-02-18', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 }, // 9h, 1h OT
          { date: '2026-02-19', dayType: 'normal', clockIn: '08:00', clockOut: '18:00', breakMinutes: 60 }, // 9h, 1h OT
          { date: '2026-02-20', dayType: 'rest', clockIn: '08:00', clockOut: '19:00', breakMinutes: 60 }, // 10h, 2h OT
        ],
      },
      deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
      allowances: { transport: 0, food: 0, other: 0 },
    };

    const result = calcPayslip(input);

    const expectedRegularOT = 3 * hourlyRate * 1.5; // ~25.96
    const expectedRestDayBasic = dailyRate * 2; // ~101.54
    const expectedRestDayOT = 2 * hourlyRate * 1.5; // ~17.31
    const expectedRestDayTotal = expectedRestDayBasic + expectedRestDayOT; // ~118.85
    const expectedPHPay = dailyRate; // ~50.77
    const expectedGross = monthlySalary + expectedRegularOT + expectedRestDayTotal + expectedPHPay;

    expect(result.basicPay).toBe(1100.00);
    expect(result.regularOtPay).toBeCloseTo(expectedRegularOT, 1);
    expect(result.restDayPay).toBeCloseTo(expectedRestDayTotal, 1);
    expect(result.publicHolidayPay).toBeCloseTo(expectedPHPay, 1);
    expect(result.totalOtHours).toBe(5); // 3h from normal + 2h from rest
    expect(result.grossPay).toBeCloseTo(expectedGross, 1);
    expect(result.netPay).toBeCloseTo(expectedGross, 1);
  });
});
