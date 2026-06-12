import { notFound } from 'next/navigation';
import { getDietWithPlanOverrides } from '@/lib/program-plan-overrides';
import DietPageTemplate from '@/components/diet/DietPageTemplate';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pregnancy Nutrition | Project Fit',
  description: 'Nourishing meals for maternal wellness through every trimester.',
};

export default async function PregnancyPage() {
  const diet = await getDietWithPlanOverrides('pregnancy');
  if (!diet) notFound();
  return <DietPageTemplate diet={diet} />;
}
