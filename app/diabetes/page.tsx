import { notFound } from 'next/navigation';
import { getDietWithPlanOverrides } from '@/lib/program-plan-overrides';
import DietPageTemplate from '@/components/diet/DietPageTemplate';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Diabetes-Friendly Diet | Project Fit',
  description: 'Blood-sugar smart meals with transparent carb labeling.',
};

export default async function DiabetesPage() {
  const diet = await getDietWithPlanOverrides('diabetes');
  if (!diet) notFound();
  return <DietPageTemplate diet={diet} />;
}
