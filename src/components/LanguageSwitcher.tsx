import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ms', label: 'BM' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <div className="flex gap-1">
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          className={`min-w-8 min-h-8 px-2 text-xs rounded-lg font-bold transition-colors ${
            i18n.language === code
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 active:bg-slate-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
