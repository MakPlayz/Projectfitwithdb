import { notFound } from 'next/navigation';
import { getDietBySlug } from '@/data/diets';
import DietPageTemplate from '@/components/diet/DietPageTemplate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mass Gain | Project Fit',
  description: 'High-protein, energy-dense meals for muscle growth and recovery.',
};

export default function MassGainPage() {
  const diet = getDietBySlug('mass-gain');
  if (!diet) notFound();
  return <DietPageTemplate diet={diet} />;
}
