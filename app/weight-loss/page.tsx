import { notFound } from 'next/navigation';
import { getDietBySlug } from '@/data/diets';
import DietPageTemplate from '@/components/diet/DietPageTemplate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Weight Loss | Project Fit',
  description: 'Lean, calorie-smart meals for sustainable weight loss.',
};

export default function WeightLossPage() {
  const diet = getDietBySlug('weight-loss');
  if (!diet) notFound();
  return <DietPageTemplate diet={diet} />;
}
