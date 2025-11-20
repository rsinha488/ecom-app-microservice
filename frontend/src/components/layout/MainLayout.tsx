'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import { useAppSelector } from '@/store';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Routes where header should not be shown
  const authRoutes = ['/auth/login', '/auth/register', '/'];
  const shouldShowHeader = isAuthenticated && !authRoutes.includes(pathname);

  return (
    <>
      {shouldShowHeader && <Header />}
      {children}
    </>
  );
}
