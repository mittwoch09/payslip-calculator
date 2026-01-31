import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePayslipHistory, type HistoryEntry } from '../usePayslipHistory';
import type { PayslipResult } from '../../types/payslip';

const STORAGE_KEY = 'payslip-history';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const createMockResult = (): PayslipResult => ({
  basicPay: 1000,
  regularOtPay: 100,
  restDayPay: 0,
  publicHolidayPay: 0,
  totalAllowances: 50,
  grossPay: 1150,
  totalDeductions: 50,
  netPay: 1100,
  dayBreakdown: [],
  deductionBreakdown: [],
  allowanceBreakdown: [],
  totalOtHours: 5,
  totalWorkedHours: 160,
  warnings: [],
});

const createMockEntry = (overrides?: Partial<Omit<HistoryEntry, 'id' | 'savedAt'>>): Omit<HistoryEntry, 'id' | 'savedAt'> => ({
  periodStart: '2025-01-01',
  periodEnd: '2025-01-31',
  employeeName: 'Test Employee',
  employerName: 'Test Employer',
  monthlySalary: 5000,
  netPay: 1100,
  grossPay: 1150,
  result: createMockResult(),
  ...overrides,
});

describe('usePayslipHistory', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('should return empty array when no history exists', () => {
    const { result } = renderHook(() => usePayslipHistory());
    expect(result.current.getEntries()).toEqual([]);
  });

  it('should add entry to localStorage and retrieve it', () => {
    const { result } = renderHook(() => usePayslipHistory());
    const mockEntry = createMockEntry();

    act(() => {
      result.current.addEntry(mockEntry);
    });

    const entries = result.current.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject(mockEntry);
    expect(entries[0]?.id).toBeDefined();
    expect(entries[0]?.savedAt).toBeDefined();
  });

  it('should store entries sorted by newest first', () => {
    const { result } = renderHook(() => usePayslipHistory());

    act(() => {
      result.current.addEntry(createMockEntry({ employeeName: 'First' }));
    });

    // Wait a tick to ensure different timestamps
    act(() => {
      result.current.addEntry(createMockEntry({ employeeName: 'Second' }));
    });

    const entries = result.current.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.employeeName).toBe('Second');
    expect(entries[1]?.employeeName).toBe('First');
  });

  it('should enforce FIFO when exceeding MAX_ENTRIES (24)', () => {
    const { result } = renderHook(() => usePayslipHistory());

    // Add 25 entries
    act(() => {
      for (let i = 0; i < 25; i++) {
        result.current.addEntry(createMockEntry({ employeeName: `Employee ${i}` }));
      }
    });

    const entries = result.current.getEntries();
    expect(entries).toHaveLength(24);
    // Newest entry should be Employee 24
    expect(entries[0]?.employeeName).toBe('Employee 24');
    // Oldest entry should be Employee 1 (Employee 0 should be evicted)
    expect(entries[23]?.employeeName).toBe('Employee 1');
    expect(entries.find(e => e.employeeName === 'Employee 0')).toBeUndefined();
  });

  it('should delete entry by id', async () => {
    const { result } = renderHook(() => usePayslipHistory());

    await act(async () => {
      result.current.addEntry(createMockEntry({ employeeName: 'First' }));
      await new Promise(resolve => setTimeout(resolve, 1));
      result.current.addEntry(createMockEntry({ employeeName: 'Second' }));
    });

    let entries = result.current.getEntries();
    expect(entries).toHaveLength(2);

    const idToDelete = entries[0]?.id;
    expect(idToDelete).toBeDefined();

    await act(async () => {
      result.current.deleteEntry(idToDelete!);
    });

    entries = result.current.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.employeeName).toBe('First');
  });

  it('should handle corrupted localStorage gracefully', () => {
    localStorageMock.setItem(STORAGE_KEY, 'invalid json');
    const { result } = renderHook(() => usePayslipHistory());
    expect(result.current.getEntries()).toEqual([]);
  });

  it('should persist entries across hook instances', () => {
    const { result: firstHook } = renderHook(() => usePayslipHistory());

    act(() => {
      firstHook.current.addEntry(createMockEntry({ employeeName: 'Persisted' }));
    });

    // Create a new hook instance
    const { result: secondHook } = renderHook(() => usePayslipHistory());
    const entries = secondHook.current.getEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0]?.employeeName).toBe('Persisted');
  });

  it('should generate unique IDs for each entry', async () => {
    const { result } = renderHook(() => usePayslipHistory());

    await act(async () => {
      result.current.addEntry(createMockEntry());
      await new Promise(resolve => setTimeout(resolve, 1));
      result.current.addEntry(createMockEntry());
      await new Promise(resolve => setTimeout(resolve, 1));
      result.current.addEntry(createMockEntry());
    });

    const entries = result.current.getEntries();
    const ids = entries.map(e => e.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(3);
  });
});
