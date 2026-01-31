import { describe, it, expect } from 'vitest';
import { validateSalary, validateEntry, validateEntries } from '../validation';
import { calcWorkedHours } from '../../engine/calculator';

describe('validation', () => {
  describe('validateSalary', () => {
    it('returns error when salary is 0', () => {
      const errors = validateSalary(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('monthlySalary');
      expect(errors[0].message).toBe('validation.salaryRequired');
    });

    it('returns error when salary is negative', () => {
      const errors = validateSalary(-100);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('monthlySalary');
    });

    it('returns empty array when salary is valid', () => {
      const errors = validateSalary(1000);
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateEntry', () => {
    it('returns empty array for valid entry', () => {
      const entry = {
        date: '2026-01-15',
        clockIn: '08:00',
        clockOut: '17:00',
        breakMinutes: 60,
      };
      const errors = validateEntry(entry);
      expect(errors).toHaveLength(0);
    });

    it('returns error when clockIn is missing', () => {
      const entry = {
        date: '2026-01-15',
        clockIn: '',
        clockOut: '17:00',
        breakMinutes: 60,
      };
      const errors = validateEntry(entry);
      expect(errors.some(e => e.field === 'clockIn')).toBe(true);
      expect(errors.find(e => e.field === 'clockIn')?.message).toBe('validation.clockInRequired');
    });

    it('returns error when clockOut is missing', () => {
      const entry = {
        date: '2026-01-15',
        clockIn: '08:00',
        clockOut: '',
        breakMinutes: 60,
      };
      const errors = validateEntry(entry);
      expect(errors.some(e => e.field === 'clockOut')).toBe(true);
    });

    it('returns error when date is missing', () => {
      const entry = {
        date: '',
        clockIn: '08:00',
        clockOut: '17:00',
        breakMinutes: 60,
      };
      const errors = validateEntry(entry);
      expect(errors.some(e => e.field === 'date')).toBe(true);
    });

    it('returns error when break is negative', () => {
      const entry = {
        date: '2026-01-15',
        clockIn: '08:00',
        clockOut: '17:00',
        breakMinutes: -10,
      };
      const errors = validateEntry(entry);
      expect(errors.some(e => e.field === 'breakMinutes')).toBe(true);
      expect(errors.find(e => e.field === 'breakMinutes')?.message).toBe('validation.breakNegative');
    });

    it('returns error when break exceeds work hours', () => {
      const entry = {
        date: '2026-01-15',
        clockIn: '08:00',
        clockOut: '09:00',
        breakMinutes: 120, // 2 hours break for 1 hour work
      };
      const errors = validateEntry(entry);
      expect(errors.some(e => e.field === 'breakMinutes')).toBe(true);
      expect(errors.find(e => e.field === 'breakMinutes')?.message).toBe('validation.breakExceedsWork');
    });

    it('handles overnight shifts correctly in validation', () => {
      const entry = {
        date: '2026-01-15',
        clockIn: '22:00',
        clockOut: '06:00',
        breakMinutes: 60,
      };
      const errors = validateEntry(entry);
      // Should not error because overnight shift is 8 hours, break is 1 hour
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateEntries', () => {
    it('returns error when entries array is empty', () => {
      const errors = validateEntries([]);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('entries');
      expect(errors[0].message).toBe('validation.atLeastOneDay');
    });

    it('returns empty array when entries has items', () => {
      const errors = validateEntries([{ date: '2026-01-15' }]);
      expect(errors).toHaveLength(0);
    });
  });

  describe('calcWorkedHours overnight fix', () => {
    it('calculates overnight shift correctly', () => {
      // 22:00 to 06:00 = 8 hours, minus 1 hour break = 7 hours
      const hours = calcWorkedHours('22:00', '06:00', 60);
      expect(hours).toBe(7.0);
    });

    it('calculates normal shift correctly', () => {
      // 08:00 to 17:00 = 9 hours, minus 1 hour break = 8 hours
      const hours = calcWorkedHours('08:00', '17:00', 60);
      expect(hours).toBe(8.0);
    });

    it('handles midnight crossing', () => {
      // 23:00 to 01:00 = 2 hours, minus 0 break = 2 hours
      const hours = calcWorkedHours('23:00', '01:00', 0);
      expect(hours).toBe(2.0);
    });
  });
});
