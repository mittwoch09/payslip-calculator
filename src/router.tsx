import { createBrowserRouter, Navigate } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import HomePage from './pages/HomePage';
import EntryPage from './pages/EntryPage';
import CapturePage from './pages/CapturePage';
import HistoryPage from './pages/HistoryPage';
import RemittancePage from './pages/RemittancePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import AffiliateDisclosurePage from './pages/AffiliateDisclosurePage';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'entry', element: <Navigate to="/entry/timecard" replace /> },
      { path: 'entry/:step', element: <EntryPage /> },
      { path: 'capture', element: <Navigate to="/capture/salary" replace /> },
      { path: 'capture/:step', element: <CapturePage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'history/:id', element: <HistoryPage /> },
      { path: 'remittance', element: <RemittancePage /> },
      { path: 'privacy', element: <PrivacyPolicyPage /> },
      { path: 'terms', element: <TermsOfServicePage /> },
      { path: 'disclosure', element: <AffiliateDisclosurePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
