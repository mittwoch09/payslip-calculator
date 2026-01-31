import { useTranslation } from 'react-i18next';

interface HomePageProps {
  onNavigate: (page: 'capture' | 'entry' | 'history') => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <p className="text-slate-300 text-center font-medium">{t('app.subtitle')}</p>

      <button
        onClick={() => onNavigate('capture')}
        className="w-full max-w-xs bg-blue-600 active:bg-blue-700 text-white rounded-2xl p-8 flex flex-col items-center gap-4 transition-colors min-h-[140px]"
      >
        <span className="text-5xl">📷</span>
        <span className="text-xl font-black">{t('home.scan')}</span>
        <span className="text-base text-blue-100">{t('home.scanDesc')}</span>
      </button>

      <button
        onClick={() => onNavigate('entry')}
        className="w-full max-w-xs bg-emerald-600 active:bg-emerald-700 text-white rounded-2xl p-8 flex flex-col items-center gap-4 transition-colors min-h-[140px]"
      >
        <span className="text-5xl">✏️</span>
        <span className="text-xl font-black">{t('home.manual')}</span>
        <span className="text-base text-emerald-100">{t('home.manualDesc')}</span>
      </button>

      <button
        onClick={() => onNavigate('history')}
        className="w-full max-w-xs bg-slate-700 active:bg-slate-600 text-white rounded-2xl p-6 flex flex-col items-center gap-3 transition-colors border-2 border-slate-600"
      >
        <span className="text-4xl">🕒</span>
        <span className="text-lg font-black">{t('home.history')}</span>
        <span className="text-sm text-slate-300">{t('home.historyDesc')}</span>
      </button>

      <p className="text-slate-500 text-sm text-center mt-4 px-4 leading-relaxed">{t('app.disclaimer')}</p>
    </div>
  );
}
