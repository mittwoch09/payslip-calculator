import { useTranslation } from 'react-i18next';

interface HomePageProps {
  onNavigate: (page: 'capture' | 'entry') => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <p className="text-slate-400 text-center text-sm">{t('app.subtitle')}</p>

      <button
        onClick={() => onNavigate('capture')}
        className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl p-6 flex flex-col items-center gap-3 transition-colors min-h-[120px]"
      >
        <span className="text-4xl">📷</span>
        <span className="text-lg font-semibold">{t('home.scan')}</span>
        <span className="text-sm text-blue-200">{t('home.scanDesc')}</span>
      </button>

      <button
        onClick={() => onNavigate('entry')}
        className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl p-6 flex flex-col items-center gap-3 transition-colors min-h-[120px]"
      >
        <span className="text-4xl">✏️</span>
        <span className="text-lg font-semibold">{t('home.manual')}</span>
        <span className="text-sm text-emerald-200">{t('home.manualDesc')}</span>
      </button>

      <p className="text-slate-500 text-xs text-center mt-4 px-4">{t('app.disclaimer')}</p>
    </div>
  );
}
