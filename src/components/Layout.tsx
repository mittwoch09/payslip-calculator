import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

interface LayoutProps {
  children: ReactNode;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, onNavigate }: LayoutProps) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-amber-50 text-black">
      <header className="sticky top-0 z-50 bg-white border-b-3 border-black px-4 py-2">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-lg font-black text-black">{t('app.title')}</h1>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-gray-300 bg-amber-50 py-6 px-4">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex flex-wrap gap-3 justify-center text-sm">
            <button
              onClick={() => onNavigate('privacy')}
              className="text-gray-600 hover:text-black transition-colors underline"
            >
              {t('footer.privacy')}
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={() => onNavigate('terms')}
              className="text-gray-600 hover:text-black transition-colors underline"
            >
              {t('footer.terms')}
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={() => onNavigate('disclosure')}
              className="text-gray-600 hover:text-black transition-colors underline"
            >
              {t('footer.disclosure')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
