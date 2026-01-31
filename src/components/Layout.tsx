import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700 px-4 py-2">
        <div className="flex items-center justify-between max-w-lg mx-auto gap-4">
          <div>
            <h1 className="text-lg font-bold text-blue-400">{t('app.title')}</h1>
            <p className="text-xs text-slate-400">Calculate your Malaysian payslip</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
