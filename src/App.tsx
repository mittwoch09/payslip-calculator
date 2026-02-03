import { useState, Suspense } from 'react';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import EntryPage from './pages/EntryPage';
import CapturePage from './pages/CapturePage';
import HistoryPage from './pages/HistoryPage';
import RemittancePage from './pages/RemittancePage';

type Page = 'home' | 'capture' | 'entry' | 'history' | 'remittance';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [remittanceAmount, setRemittanceAmount] = useState<number>(0);

  const handleNavigateRemittance = (amount: number) => {
    setRemittanceAmount(amount);
    setPage('remittance');
  };

  return (
    <Suspense fallback={<div className="min-h-screen bg-amber-50 flex items-center justify-center text-black">Loading...</div>}>
      <Layout>
        {page === 'home' && <HomePage onNavigate={setPage} />}
        {page === 'entry' && (
          <EntryPage
            onBack={() => setPage('home')}
            onNavigateRemittance={handleNavigateRemittance}
          />
        )}
        {page === 'capture' && <CapturePage onBack={() => setPage('home')} onComplete={() => { setPage('entry'); }} onNavigateRemittance={handleNavigateRemittance} />}
        {page === 'history' && <HistoryPage onBack={() => setPage('home')} />}
        {page === 'remittance' && (
          <RemittancePage
            initialAmount={remittanceAmount}
            onBack={() => setPage('entry')}
          />
        )}
      </Layout>
    </Suspense>
  );
}
