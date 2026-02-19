import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-amber-50 text-black flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b-3 border-black px-4 py-2">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link to="/" className="text-lg font-black text-black hover:opacity-80 transition-opacity">
            {t('app.title')}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="w-full max-w-lg mx-auto px-4 py-6 flex-1">
        {children}
      </main>
      <footer className="border-t border-gray-300 bg-amber-50 py-6 px-4">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center gap-2.5 justify-center text-xs whitespace-nowrap">
            <Link
              to="/privacy"
              className="text-gray-600 hover:text-black transition-colors underline"
            >
              {t('footer.privacy')}
            </Link>
            <span className="text-gray-400">|</span>
            <Link
              to="/terms"
              className="text-gray-600 hover:text-black transition-colors underline"
            >
              {t('footer.terms')}
            </Link>
            <span className="text-gray-400">|</span>
            <Link
              to="/disclosure"
              className="text-gray-600 hover:text-black transition-colors underline"
            >
              {t('footer.disclosure')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
