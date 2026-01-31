import type { PayslipResult } from '../types/payslip';

const STORAGE_KEY = 'payslip-history';
const MAX_ENTRIES = 24;

export interface HistoryEntry {
  id: string;
  savedAt: string;
  periodStart: string;
  periodEnd: string;
  employeeName: string;
  employerName: string;
  monthlySalary: number;
  netPay: number;
  grossPay: number;
  result: PayslipResult;
}

export function usePayslipHistory() {
  const getEntries = (): HistoryEntry[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored) as HistoryEntry[];
    } catch {
      return [];
    }
  };

  const addEntry = (entry: Omit<HistoryEntry, 'id' | 'savedAt'>) => {
    const entries = getEntries();
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
    };
    entries.unshift(newEntry);
    if (entries.length > MAX_ENTRIES) {
      entries.pop(); // FIFO
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  };

  const deleteEntry = (id: string) => {
    const entries = getEntries().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  };

  return { getEntries, addEntry, deleteEntry };
}
