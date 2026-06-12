import { notFound } from 'next/navigation';
import { getDietWithPlanOverrides } from '@/lib/program-plan-overrides';
import DietPageTemplate from '@/components/diet/DietPageTemplate';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PCOS / PCOD Diet | Project Fit',
  description: 'Hormone-balancing, low-GI nutrition for PCOS and PCOD wellness.',
};

export default async function PcosPcodPage() {
  const diet = await getDietWithPlanOverrides('pcos-pcod');
  if (!diet) notFound();
  return <DietPageTemplate diet={diet} />;
}
