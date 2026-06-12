import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chef Portal | Project Fit',
  description: 'Protected Project Fit kitchen and admin operations console.',
};

export default function ChefLayout({ children }: { children: React.ReactNode }) {
  return children;
}
