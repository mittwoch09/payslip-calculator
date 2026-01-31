import { useState, Suspense } from 'react';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import EntryPage from './pages/EntryPage';
import CapturePage from './pages/CapturePage';
import HistoryPage from './pages/HistoryPage';

type Page = 'home' | 'capture' | 'entry' | 'history';

export default function App() {
  const [page, setPage] = useState<Page>('home');

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>}>
      <Layout>
        {page === 'home' && <HomePage onNavigate={setPage} />}
        {page === 'entry' && <EntryPage onBack={() => setPage('home')} />}
        {page === 'capture' && <CapturePage onBack={() => setPage('home')} onComplete={() => { setPage('entry'); }} />}
        {page === 'history' && <HistoryPage onBack={() => setPage('home')} />}
      </Layout>
    </Suspense>
  );
}
