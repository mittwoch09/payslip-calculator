import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface SectionProps {
  heading: string;
  body: string;
}

function Section({ heading, body }: SectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-bold text-black">{heading}</h3>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{body}</p>
    </div>
  );
}

export default function AffiliateDisclosurePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-black font-bold min-h-12 px-2 hover:bg-gray-100 transition-colors"
        >
          {t('form.back')}
        </button>
        <h2 className="text-2xl font-black text-black">{t('affiliateDisclosure.title')}</h2>
      </div>
      <div className="bg-white border-2 border-black p-4 space-y-6">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {t('affiliateDisclosure.body')}
        </p>
        <hr className="border-gray-200" />
        <Section
          heading={t('affiliateDisclosure.howWeEarn').split('\n')[0]}
          body={t('affiliateDisclosure.howWeEarn').split('\n').slice(2).join('\n')}
        />
        <Section
          heading={t('affiliateDisclosure.whatItMeans').split('\n')[0]}
          body={t('affiliateDisclosure.whatItMeans').split('\n').slice(2).join('\n')}
        />
        <Section
          heading={t('affiliateDisclosure.ourPromise').split('\n')[0]}
          body={t('affiliateDisclosure.ourPromise').split('\n').slice(2).join('\n')}
        />
      </div>
    </div>
  );
}
