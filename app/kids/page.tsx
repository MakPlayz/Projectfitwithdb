import { notFound } from 'next/navigation';
import { getDietBySlug } from '@/data/diets';
import DietPageTemplate from '@/components/diet/DietPageTemplate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kids Section | Project Fit',
  description: 'Highly nutritious, brain-boosting meals tailored specifically for kids.',
};

export default function KidsPage() {
  const diet = getDietBySlug('kids');
  if (!diet) notFound();
  return <DietPageTemplate diet={diet} />;
}
