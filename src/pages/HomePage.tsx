import { useTranslation } from 'react-i18next';

interface HomePageProps {
  onNavigate: (page: 'capture' | 'entry' | 'history') => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      <p className="text-slate-300 text-center font-medium">{t('app.subtitle')}</p>

      <button
        onClick={() => onNavigate('capture')}
        className="w-full bg-blue-600 active:bg-blue-700 text-white rounded-2xl p-4 flex flex-row items-center gap-3 transition-colors"
      >
        <span className="text-3xl">📷</span>
        <div className="flex flex-col items-start text-left">
          <span className="text-lg font-bold">{t('home.scan')}</span>
          <span className="text-sm text-blue-100">{t('home.scanDesc')}</span>
        </div>
      </button>

      <button
        onClick={() => onNavigate('entry')}
        className="w-full bg-emerald-600 active:bg-emerald-700 text-white rounded-2xl p-4 flex flex-row items-center gap-3 transition-colors"
      >
        <span className="text-3xl">✏️</span>
        <div className="flex flex-col items-start text-left">
          <span className="text-lg font-bold">{t('home.manual')}</span>
          <span className="text-sm text-emerald-100">{t('home.manualDesc')}</span>
        </div>
      </button>

      <button
        onClick={() => onNavigate('history')}
        className="w-full bg-slate-800 active:bg-slate-700 text-white rounded-2xl p-4 flex flex-row items-center gap-3 transition-colors"
      >
        <span className="text-3xl">🕒</span>
        <div className="flex flex-col items-start text-left">
          <span className="text-lg font-bold">{t('home.history')}</span>
          <span className="text-sm text-slate-300">{t('home.historyDesc')}</span>
        </div>
      </button>

      <p className="text-slate-500 text-sm text-center mt-4 px-4 leading-relaxed">{t('app.disclaimer')}</p>
    </div>
  );
}
