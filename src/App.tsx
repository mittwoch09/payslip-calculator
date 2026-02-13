import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-amber-50 flex items-center justify-center text-black">Loading...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
