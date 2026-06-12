import { notFound } from 'next/navigation';
import { getDietWithPlanOverrides } from '@/lib/program-plan-overrides';
import DietPageTemplate from '@/components/diet/DietPageTemplate';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Weight Loss | Project Fit',
  description: 'Lean, calorie-smart meals for sustainable weight loss.',
};

export default async function WeightLossPage() {
  const diet = await getDietWithPlanOverrides('weight-loss');
  if (!diet) notFound();
  return <DietPageTemplate diet={diet} />;
}
