import { notFound } from 'next/navigation';
import { getDietBySlug } from '@/data/diets';
import DietPageTemplate from '@/components/diet/DietPageTemplate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Diabetes-Friendly Diet | Project Fit',
  description: 'Blood-sugar smart meals with transparent carb labeling.',
};

export default function DiabetesPage() {
  const diet = getDietBySlug('diabetes');
  if (!diet) notFound();
  return <DietPageTemplate diet={diet} />;
}
