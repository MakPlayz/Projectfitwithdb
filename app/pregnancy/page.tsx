import { notFound } from 'next/navigation';
import { getDietBySlug } from '@/data/diets';
import DietPageTemplate from '@/components/diet/DietPageTemplate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pregnancy Nutrition | Project Fit',
  description: 'Nourishing meals for maternal wellness through every trimester.',
};

export default function PregnancyPage() {
  const diet = getDietBySlug('pregnancy');
  if (!diet) notFound();
  return <DietPageTemplate diet={diet} />;
}
