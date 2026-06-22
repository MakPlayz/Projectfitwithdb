'use client';

import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import AuthUrlScrubber from '@/components/auth/AuthUrlScrubber';
import BackgroundDecor from '@/components/layout/BackgroundDecor';
import Cart from '@/components/Cart';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/Navbar';
import NotificationsButton from '@/components/NotificationsButton';
import LeafAuthModal from '@/components/auth/LeafAuthModal';
import TextCursor from '@/components/ui/TextCursor';

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
      <NotificationsButton />
      <LeafAuthModal />
      <TextCursor
        text="🥦"
        spacing={80}
        followMouseDirection
        randomFloat
        exitDuration={0.3}
        removalInterval={20}
        maxPoints={10}
      />
    </>
  );
}
