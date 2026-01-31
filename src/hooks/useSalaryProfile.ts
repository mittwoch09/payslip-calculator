const STORAGE_KEY = 'payslip-salary-profile';

export interface SalaryProfile {
  employeeName: string;
  employerName: string;
  monthlySalary: number;
  deductions: { accommodation: number; meals: number; advances: number; other: number };
  allowances: { transport: number; food: number; other: number };
}

export function useSalaryProfile() {
  const loadProfile = (): SalaryProfile | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as SalaryProfile;
    } catch {
      return null;
    }
  };

  const saveProfile = (profile: SalaryProfile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  };

  const clearProfile = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return { loadProfile, saveProfile, clearProfile };
}
