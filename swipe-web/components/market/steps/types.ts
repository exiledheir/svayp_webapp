import type { MarketDraft } from '@/types/market';

export interface StepProps {
  form: MarketDraft;
  patch: (p: Partial<MarketDraft>) => void;
  onNext: () => void;
}
