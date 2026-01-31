import { describe, it, expect } from 'vitest';
import { calcPayslip } from './calculator';
import { parseTimecardText } from '../ocr/timecard-parser';
import type { DayEntry } from '../types/timecard';
import type { PayslipInput } from '../types/payslip';

describe('Timecard Integration - Mr. Mani Chelladurai, Nov 2025', () => {
  /**
   * Real timecard data from PDF:
   * Employee: Mr. Mani Chelladurai
   * Period: November 2025 (30 days)
   * Site: C2A @ Sengkang
   *
   * Working pattern:
   * - Standard shift: 07:00-19:00 (12h total, 60min break = 11h worked)
   * - "+1" shift: 07:00-19:00 +1 (13h total, 60min break = 12h worked)
   * - Sundays (Nov 2, 9, 16, 23, 30) are rest days in Singapore construction
   * - Day 9, 16: OFF (rest days taken)
   * - Day 2, 23, 30: Worked on rest days (Sundays)
   *
   * Expected counts:
   * - Total working days: 28
   * - Rest days worked: 3 (Nov 2, 23, 30)
   * - OFF days: 2 (Nov 9, 16)
   */

  const buildTimecardEntries = (): DayEntry[] => {
    const entries: DayEntry[] = [];

    // Helper to determine if day is Sunday (rest day in construction)
    const isRestDay = (day: number): boolean => {
      return [2, 9, 16, 23, 30].includes(day);
    };

    // Days with +1 extra hour (12h worked instead of 11h)
    const plusOneDays = [3, 7, 11, 13, 15, 18, 24, 27, 30];

    // Days OFF (rest days taken)
    const offDays = [9, 16];

    for (let day = 1; day <= 30; day++) {
      // Skip OFF days
      if (offDays.includes(day)) {
        continue;
      }

      const date = `2025-11-${day.toString().padStart(2, '0')}`;
      const isPlusOne = plusOneDays.includes(day);
      const isRestDayWorked = isRestDay(day) && !offDays.includes(day);

      // Standard: 07:00-19:00 = 12h total, 60min break = 11h worked
      // +1: 07:00-20:00 = 13h total, 60min break = 12h worked
      const clockOut = isPlusOne ? '20:00' : '19:00';

      entries.push({
        date,
        dayType: isRestDayWorked ? 'rest' : 'normal',
        clockIn: '07:00',
        clockOut,
        breakMinutes: 60,
      });
    }

    return entries;
  };

  it('calculates correct payslip for November 2025 timecard', () => {
    const entries = buildTimecardEntries();

    // Verify entry counts
    expect(entries.length).toBe(28); // 30 days - 2 OFF days

    const normalDays = entries.filter(e => e.dayType === 'normal').length;
    const restDays = entries.filter(e => e.dayType === 'rest').length;

    expect(normalDays).toBe(25); // 28 working days - 3 rest days worked
    expect(restDays).toBe(3); // Nov 2, 23, 30 (Sundays worked)

    // Common salary for construction workers in Singapore
    const monthlySalary = 800;

    const input: PayslipInput = {
      employeeName: 'Mr. Mani Chelladurai',
      employerName: 'Construction Company',
      monthlySalary,
      paymentPeriodStart: '2025-11-01',
      paymentPeriodEnd: '2025-11-30',
      timecard: { entries },
      deductions: { accommodation: 0, meals: 0, advances: 0, other: 0 },
      allowances: { transport: 0, food: 0, other: 0 },
    };

    const result = calcPayslip(input);

    // Basic validations
    expect(result.basicPay).toBe(monthlySalary);
    expect(result.dayBreakdown.length).toBe(28);

    // Count working days by type
    const normalDayResults = result.dayBreakdown.filter(d => d.dayType === 'normal');
    const restDayResults = result.dayBreakdown.filter(d => d.dayType === 'rest');

    expect(normalDayResults.length).toBe(25);
    expect(restDayResults.length).toBe(3);

    // Verify rest day dates
    const restDayDates = restDayResults.map(d => d.date);
    expect(restDayDates).toContain('2025-11-02'); // Sunday
    expect(restDayDates).toContain('2025-11-23'); // Sunday
    expect(restDayDates).toContain('2025-11-30'); // Sunday

    // Verify OT hours are calculated correctly
    // Standard day: 11h worked - 8h normal = 3h OT
    // +1 day: 12h worked - 8h normal = 4h OT
    const plusOneDays = [3, 7, 11, 13, 15, 18, 24, 27, 30];

    for (const dayResult of normalDayResults) {
      const dayNum = parseInt(dayResult.date.split('-')[2]);
      const isPlusOne = plusOneDays.includes(dayNum);

      if (isPlusOne) {
        // 12h worked - 8h normal = 4h OT
        expect(dayResult.workedHours).toBe(12);
        expect(dayResult.otHours).toBe(4);
      } else {
        // 11h worked - 8h normal = 3h OT
        expect(dayResult.workedHours).toBe(11);
        expect(dayResult.otHours).toBe(3);
      }
    }

    // Rest days: all worked 11h or 12h
    // Rest day pay follows MOM rules:
    // - Up to 4h = 1 day's salary
    // - More than 4h = 2 days' salary
    // - Hours beyond 8h = OT at 1.5x
    for (const dayResult of restDayResults) {
      const dayNum = parseInt(dayResult.date.split('-')[2]);
      const isPlusOne = plusOneDays.includes(dayNum);

      if (isPlusOne) {
        expect(dayResult.workedHours).toBe(12);
        expect(dayResult.otHours).toBe(4); // 12h - 8h = 4h OT
      } else {
        expect(dayResult.workedHours).toBe(11);
        expect(dayResult.otHours).toBe(3); // 11h - 8h = 3h OT
      }

      // All rest days worked > 4h, so should get 2 days' salary
      const dailyRate = monthlySalary / 21.67; // ~36.92
      expect(dayResult.basicPay).toBeCloseTo(dailyRate * 2, 1);
    }

    // Verify totals make sense
    expect(result.regularOtPay).toBeGreaterThan(0);
    expect(result.restDayPay).toBeGreaterThan(0);
    expect(result.totalOtHours).toBeGreaterThan(0);
    expect(result.grossPay).toBeGreaterThan(monthlySalary);
    expect(result.netPay).toBe(result.grossPay); // No deductions

    // Print detailed breakdown for manual verification
    console.log('\n=== PAYSLIP BREAKDOWN ===');
    console.log(`Employee: ${input.employeeName}`);
    console.log(`Period: ${input.paymentPeriodStart} to ${input.paymentPeriodEnd}`);
    console.log(`Monthly Salary: SGD ${monthlySalary.toFixed(2)}`);
    console.log('\n--- Working Days Summary ---');
    console.log(`Total working days: ${result.dayBreakdown.length}`);
    console.log(`Normal days: ${normalDayResults.length}`);
    console.log(`Rest days worked: ${restDayResults.length}`);
    console.log(`Total worked hours: ${result.totalWorkedHours.toFixed(1)}h`);
    console.log(`Total OT hours: ${result.totalOtHours.toFixed(1)}h`);

    console.log('\n--- Pay Components ---');
    console.log(`Basic Pay: SGD ${result.basicPay.toFixed(2)}`);
    console.log(`Regular OT Pay: SGD ${result.regularOtPay.toFixed(2)}`);
    console.log(`Rest Day Pay: SGD ${result.restDayPay.toFixed(2)}`);
    console.log(`Public Holiday Pay: SGD ${result.publicHolidayPay.toFixed(2)}`);
    console.log(`Total Allowances: SGD ${result.totalAllowances.toFixed(2)}`);
    console.log(`Gross Pay: SGD ${result.grossPay.toFixed(2)}`);
    console.log(`Total Deductions: SGD ${result.totalDeductions.toFixed(2)}`);
    console.log(`Net Pay: SGD ${result.netPay.toFixed(2)}`);

    console.log('\n--- Daily Breakdown (First 10 days) ---');
    result.dayBreakdown.slice(0, 10).forEach(day => {
      console.log(
        `${day.date} (${day.dayType}): ${day.workedHours}h worked, ` +
        `${day.regularHours}h regular, ${day.otHours}h OT, ` +
        `Basic: SGD ${day.basicPay.toFixed(2)}, OT: SGD ${day.otPay.toFixed(2)}, ` +
        `Total: SGD ${day.totalDayPay.toFixed(2)} - ${day.description}`
      );
    });

    console.log('\n--- Rest Days Detail ---');
    restDayResults.forEach(day => {
      console.log(
        `${day.date} (${day.dayType}): ${day.workedHours}h worked, ` +
        `${day.regularHours}h regular, ${day.otHours}h OT, ` +
        `Basic: SGD ${day.basicPay.toFixed(2)}, OT: SGD ${day.otPay.toFixed(2)}, ` +
        `Total: SGD ${day.totalDayPay.toFixed(2)} - ${day.description}`
      );
    });

    if (result.warnings.length > 0) {
      console.log('\n--- Warnings ---');
      result.warnings.forEach(w => console.log(`⚠️  ${w}`));
    }
    console.log('=== END PAYSLIP ===\n');
  });

  it('validates specific day calculations', () => {
    const entries = buildTimecardEntries();

    // Day 1 (Nov 1, Friday): Normal day, 11h worked, 3h OT
    const day1 = entries.find(e => e.date === '2025-11-01');
    expect(day1).toBeDefined();
    expect(day1?.dayType).toBe('normal');
    expect(day1?.clockOut).toBe('19:00'); // Standard shift

    // Day 2 (Nov 2, Sunday): Rest day worked, 11h worked, 3h OT
    const day2 = entries.find(e => e.date === '2025-11-02');
    expect(day2).toBeDefined();
    expect(day2?.dayType).toBe('rest');
    expect(day2?.clockOut).toBe('19:00'); // Standard shift

    // Day 3 (Nov 3, Monday): Normal day with +1, 12h worked, 4h OT
    const day3 = entries.find(e => e.date === '2025-11-03');
    expect(day3).toBeDefined();
    expect(day3?.dayType).toBe('normal');
    expect(day3?.clockOut).toBe('20:00'); // +1 shift

    // Day 9 (Nov 9, Sunday): Should be absent (OFF)
    const day9 = entries.find(e => e.date === '2025-11-09');
    expect(day9).toBeUndefined();

    // Day 23 (Nov 23, Sunday): Rest day worked, 11h worked
    const day23 = entries.find(e => e.date === '2025-11-23');
    expect(day23).toBeDefined();
    expect(day23?.dayType).toBe('rest');
    expect(day23?.clockOut).toBe('19:00'); // Standard shift

    // Day 30 (Nov 30, Sunday): Rest day worked with +1, 12h worked
    const day30 = entries.find(e => e.date === '2025-11-30');
    expect(day30).toBeDefined();
    expect(day30?.dayType).toBe('rest');
    expect(day30?.clockOut).toBe('20:00'); // +1 shift
  });
});

describe('OCR Parser Integration', () => {
  it('parses simulated OCR text from timecard PDF', () => {
    // Simulate OCR output from a typical construction timecard
    const ocrText = `
Site: C2A @ Sengkang
Employee: Mr. Mani Chelladurai
Period: November 2025

Day 1  2025-11-01  07:00 - 19:00  (normal)
Day 2  2025-11-02  07:00 - 19:00  (rest day)
Day 3  2025-11-03  07:00 - 20:00  +1
Day 4  2025-11-04  07:00 - 19:00
Day 5  2025-11-05  07.00 - 19.00
Day 6  06/11/2025  0700 1900
Day 7  07-11-2025  07:00 - 20:00  +1
Day 8  2025-11-08  OFF  +1
    `.trim();

    const entries = parseTimecardText(ocrText).entries;

    // Should parse at least the first few entries
    expect(entries.length).toBeGreaterThanOrEqual(5);

    // Check first entry
    const firstEntry = entries.find(e => e.date.includes('11-01'));
    expect(firstEntry).toBeDefined();
    expect(firstEntry?.clockIn).toBe('07:00');
    expect(firstEntry?.clockOut).toBe('19:00');

    const plusOneEntry = entries.find(e => e.date.includes('11-03'));
    expect(plusOneEntry).toBeDefined();
    expect(plusOneEntry?.extraOtHours).toBe(1);

    const offEntry = entries.find(e => e.date.includes('11-08'));
    expect(offEntry).toBeUndefined();

    // Check that various date and time formats are recognized
    expect(entries.some(e => e.clockIn === '07:00')).toBe(true);
    expect(entries.some(e => e.clockOut === '19:00' || e.clockOut === '20:00')).toBe(true);
  });

  it('parses dates in different formats', () => {
    const ocrText = `
2025-11-01  07:00 - 19:00
01/11/2025  07:00 - 19:00
01-11-2025  07:00 - 19:00
    `.trim();

    const entries = parseTimecardText(ocrText).entries;

    // Should parse all three date formats
    expect(entries.length).toBe(3);

    // All should be normalized to Nov 1, 2025
    entries.forEach(entry => {
      expect(entry.date).toMatch(/2025-11-01/);
    });
  });

  it('parses times with different separators', () => {
    const ocrText = `
2025-11-01  07:00 - 19:00
2025-11-02  07.00 - 19.00
    `.trim();

    const entries = parseTimecardText(ocrText).entries;

    // Parser supports colon and dot separators (07:00, 07.00)
    expect(entries.length).toBe(2);

    entries.forEach(entry => {
      expect(entry.clockIn).toBe('07:00');
      expect(entry.clockOut).toBe('19:00');
    });
  });

  it('handles missing clock out time gracefully', () => {
    const ocrText = `
2025-11-01  07:00
    `.trim();

    const entries = parseTimecardText(ocrText).entries;

    expect(entries.length).toBe(1);
    expect(entries[0].clockIn).toBe('07:00');
    expect(entries[0].clockOut).toBe('17:00'); // Default fallback
  });

  it('handles malformed or partial data', () => {
    const ocrText = `
Some header text
2025-11-01  CORRUPTED DATA
2025-11-02  07:00 - 19:00
Random text without date or time
2025-11-03  08:00 - 18:00
    `.trim();

    const entries = parseTimecardText(ocrText).entries;

    // Should parse only valid entries
    expect(entries.length).toBeGreaterThanOrEqual(2);

    const validEntry = entries.find(e => e.date.includes('11-02'));
    expect(validEntry).toBeDefined();
    expect(validEntry?.clockIn).toBe('07:00');
    expect(validEntry?.clockOut).toBe('19:00');
  });
});
