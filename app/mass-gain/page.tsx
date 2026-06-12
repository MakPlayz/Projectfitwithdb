import { notFound } from 'next/navigation';
import { getDietWithPlanOverrides } from '@/lib/program-plan-overrides';
import DietPageTemplate from '@/components/diet/DietPageTemplate';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mass Gain | Project Fit',
  description: 'High-protein, energy-dense meals for muscle growth and recovery.',
};

export default async function MassGainPage() {
  const diet = await getDietWithPlanOverrides('mass-gain');
  if (!diet) notFound();
  return <DietPageTemplate diet={diet} />;
}
