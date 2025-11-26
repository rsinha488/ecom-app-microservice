'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, initialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (initialized) {
      if (!isAuthenticated) {
        router.push('/auth/login');
        router.refresh();
      } else {
        router.push('/products');
        router.refresh();
      }
    }
  }, [isAuthenticated, initialized, router]);

  // Show loading while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
