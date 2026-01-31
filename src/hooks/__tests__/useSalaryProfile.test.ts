import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSalaryProfile, type SalaryProfile } from '../useSalaryProfile';

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

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

describe('useSalaryProfile', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should save profile to localStorage', () => {
    const { result } = renderHook(() => useSalaryProfile());
    const profile: SalaryProfile = {
      employeeName: 'John Doe',
      employerName: 'Test Company',
      monthlySalary: 2000,
      deductions: { accommodation: 200, meals: 100, advances: 50, other: 0 },
      allowances: { transport: 150, food: 100, other: 0 },
    };

    act(() => {
      result.current.saveProfile(profile);
    });

    const stored = localStorage.getItem('payslip-salary-profile');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual(profile);
  });

  it('should load profile from localStorage', () => {
    const profile: SalaryProfile = {
      employeeName: 'Jane Smith',
      employerName: 'Another Company',
      monthlySalary: 2500,
      deductions: { accommodation: 250, meals: 150, advances: 100, other: 50 },
      allowances: { transport: 200, food: 150, other: 100 },
    };

    localStorage.setItem('payslip-salary-profile', JSON.stringify(profile));

    const { result } = renderHook(() => useSalaryProfile());
    const loaded = result.current.loadProfile();

    expect(loaded).toEqual(profile);
  });

  it('should return null when localStorage is empty', () => {
    const { result } = renderHook(() => useSalaryProfile());
    const loaded = result.current.loadProfile();

    expect(loaded).toBeNull();
  });

  it('should clear profile from localStorage', () => {
    const profile: SalaryProfile = {
      employeeName: 'Test User',
      employerName: 'Test Employer',
      monthlySalary: 3000,
      deductions: { accommodation: 300, meals: 200, advances: 150, other: 100 },
      allowances: { transport: 250, food: 200, other: 150 },
    };

    localStorage.setItem('payslip-salary-profile', JSON.stringify(profile));

    const { result } = renderHook(() => useSalaryProfile());

    act(() => {
      result.current.clearProfile();
    });

    const stored = localStorage.getItem('payslip-salary-profile');
    expect(stored).toBeNull();
  });

  it('should return null when localStorage contains corrupted JSON', () => {
    localStorage.setItem('payslip-salary-profile', 'corrupted{json}data');

    const { result } = renderHook(() => useSalaryProfile());
    const loaded = result.current.loadProfile();

    expect(loaded).toBeNull();
  });

  it('should save and load profile with identical data', () => {
    const { result } = renderHook(() => useSalaryProfile());
    const originalProfile: SalaryProfile = {
      employeeName: 'Round Trip Test',
      employerName: 'Round Trip Company',
      monthlySalary: 1800,
      deductions: { accommodation: 180, meals: 90, advances: 45, other: 22 },
      allowances: { transport: 135, food: 90, other: 45 },
    };

    act(() => {
      result.current.saveProfile(originalProfile);
    });

    const loadedProfile = result.current.loadProfile();

    expect(loadedProfile).toEqual(originalProfile);
  });
});
