import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Cart from '@/components/Cart';
import BackgroundDecor from '@/components/layout/BackgroundDecor';
import Footer from '@/components/layout/Footer';
import AuthGuard from '@/components/auth/AuthGuard';
import AuthUrlScrubber from '@/components/auth/AuthUrlScrubber';

export const metadata: Metadata = {
  title: 'Project Fit | Premium Health & Diet Nutrition',
  description:
    'Personalized diet programs for weight loss, mass gain, pregnancy, PCOS, and diabetes-friendly meals delivered fresh.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthUrlScrubber />
        <BackgroundDecor />
        <Navbar />
        <AuthGuard>{children}</AuthGuard>
        <Footer />
        <Cart />
      </body>
    </html>
  );
}
