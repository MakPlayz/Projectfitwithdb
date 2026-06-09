import HeroSection from '@/components/hero/HeroSection';
import FeaturesSection from '@/components/home/FeaturesSection';
import HowItWorks from '@/components/home/HowItWorks';
import PlanOptionsSection from '@/components/home/PlanOptionsSection';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <PlanOptionsSection />
      <FeaturesSection />
      <HowItWorks />
    </main>
  );
}
