'use client';

import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import AuthUrlScrubber from '@/components/auth/AuthUrlScrubber';
import BackgroundDecor from '@/components/layout/BackgroundDecor';
import Cart from '@/components/Cart';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/Navbar';

interface AppChromeProps {
  children: React.ReactNode;
}

export default function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const isChefRoute = Boolean(pathname?.startsWith('/chef'));

  if (isChefRoute) {
    return (
      <>
        <AuthUrlScrubber />
        {children}
      </>
    );
  }

  return (
    <>
      <AuthUrlScrubber />
      <BackgroundDecor />
      <Navbar />
      <AuthGuard>{children}</AuthGuard>
      <Footer />
      <Cart />
    </>
  );
}
