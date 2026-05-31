import { notFound } from 'next/navigation';
import { getDietBySlug } from '@/data/diets';
import DietPageTemplate from '@/components/diet/DietPageTemplate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PCOS / PCOD Diet | Project Fit',
  description: 'Hormone-balancing, low-GI nutrition for PCOS and PCOD wellness.',
};

export default function PcosPcodPage() {
  const diet = getDietBySlug('pcos-pcod');
  if (!diet) notFound();
  return <DietPageTemplate diet={diet} />;
}
