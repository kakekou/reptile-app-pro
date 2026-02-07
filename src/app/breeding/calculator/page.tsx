import { PageHeader } from '@/components/ui/page-header';
import { MorphCalculator } from '@/components/breeding/morph-calculator';

export default function CalculatorPage() {
  return (
    <>
      <PageHeader title="モルフ計算機" subtitle="遺伝子の組み合わせを計算" />
      <MorphCalculator />
    </>
  );
}
