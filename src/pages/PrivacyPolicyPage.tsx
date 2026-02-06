import { useTranslation } from 'react-i18next';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export default function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
  const { t } = useTranslation();
  const body = t('privacy.body');
  const paragraphs = body.split('\n\n');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-black font-bold min-h-12 px-2 hover:bg-gray-100 transition-colors"
        >
          {t('form.back')}
        </button>
        <h2 className="text-2xl font-black text-black">{t('privacy.title')}</h2>
      </div>
      <div className="bg-white border-2 border-black p-4 space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
