import { notFound } from 'next/navigation';
import { getDietWithPlanOverrides } from '@/lib/program-plan-overrides';
import DietPageTemplate from '@/components/diet/DietPageTemplate';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kids Section | Project Fit',
  description: 'Highly nutritious, brain-boosting meals tailored specifically for kids.',
};

export default async function KidsPage() {
  const diet = await getDietWithPlanOverrides('kids');
  if (!diet) notFound();
  return <DietPageTemplate diet={diet} />;
}
