import { useTranslation } from 'react-i18next';

interface HomePageProps {
  onNavigate: (page: 'capture' | 'entry' | 'history') => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      <p className="text-gray-600 text-center font-medium">{t('app.subtitle')}</p>

      <button
        onClick={() => onNavigate('capture')}
        className="w-full bg-white border-2 border-black shadow-[4px_4px_0_black] active:shadow-none active:translate-x-1 active:translate-y-1 p-4 flex flex-row items-center gap-3 transition-all"
      >
        <div className="w-12 h-12 flex items-center justify-center border-2 border-black bg-violet-200 text-2xl">
          📷
        </div>
        <div className="flex flex-col items-start text-left">
          <span className="text-lg font-bold text-black">{t('home.scan')}</span>
          <span className="text-sm text-gray-600">{t('home.scanDesc')}</span>
        </div>
      </button>

      <button
        onClick={() => onNavigate('entry')}
        className="w-full bg-white border-2 border-black shadow-[4px_4px_0_black] active:shadow-none active:translate-x-1 active:translate-y-1 p-4 flex flex-row items-center gap-3 transition-all"
      >
        <div className="w-12 h-12 flex items-center justify-center border-2 border-black bg-lime-200 text-2xl">
          ✏️
        </div>
        <div className="flex flex-col items-start text-left">
          <span className="text-lg font-bold text-black">{t('home.manual')}</span>
          <span className="text-sm text-gray-600">{t('home.manualDesc')}</span>
        </div>
      </button>

      <button
        onClick={() => onNavigate('history')}
        className="w-full bg-white border-2 border-black shadow-[4px_4px_0_black] active:shadow-none active:translate-x-1 active:translate-y-1 p-4 flex flex-row items-center gap-3 transition-all"
      >
        <div className="w-12 h-12 flex items-center justify-center border-2 border-black bg-amber-200 text-2xl">
          🕒
        </div>
        <div className="flex flex-col items-start text-left">
          <span className="text-lg font-bold text-black">{t('home.history')}</span>
          <span className="text-sm text-gray-600">{t('home.historyDesc')}</span>
        </div>
      </button>

      <p className="text-gray-400 text-sm text-center mt-4 px-4 leading-relaxed">{t('app.disclaimer')}</p>
    </div>
  );
}
