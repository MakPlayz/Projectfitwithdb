import type { Metadata } from 'next';
import './globals.css';
import AppChrome from '@/components/layout/AppChrome';

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
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
