import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Cart from '@/components/Cart';
import BackgroundDecor from '@/components/layout/BackgroundDecor';
import Footer from '@/components/layout/Footer';
import LeafAuthModal from '@/components/auth/LeafAuthModal';
import TextCursor from '@/components/ui/TextCursor';

export const metadata: Metadata = {
  title: 'Project Fit | Premium Health & Diet Nutrition',
  description:
    'Personalized diet programs — weight loss, mass gain, pregnancy, PCOS, and diabetes-friendly meals delivered fresh.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <BackgroundDecor />
        <Navbar />
        {children}
        <Footer />
        <Cart />
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
      </body>
    </html>
  );
}
