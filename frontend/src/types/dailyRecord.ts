export interface DailyRecordResponse {
  id: number;
  batchId: number;
  recordDate: string;
  ageDays?: number;
  morningMortality: number;
  mortality: number;
  cumulativeMortality: number;
  cumulativeMortalityPct?: number | null;
  remainingBirds: number;
  feedType?: string | null;
  bagCapacityKg?: number | null;
  minFeedIntakeG?: number | null;
  cumulativeFeedMinKg?: number | null;
  cumulativeFeedActualKg?: number | null;
  feedConsumedKg: number;
  minBodyWeightG?: number | null;
  avgWeightG?: number | null;
  standardFcr?: number | null;
  fcr?: number | null;
  feedBagsConsumed?: number | null;
  feedBagsTotal?: number | null;
  feedBagsClosingStock?: number | null;
  signature?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface DailyRecordRequest {
  recordDate?: string;
  morningMortality?: number;
  mortality: number;
  feedType?: string;
  feedBagsConsumed?: number;
  bagCapacityKg?: number;
  feedConsumedKg?: number;
  avgWeightG?: number;
  minFeedIntakeG?: number;
  cumulativeFeedMinKg?: number;
  cumulativeFeedActualKg?: number;
  minBodyWeightG?: number;
  standardFcr?: number;
  feedBagsTotal?: number;
  feedBagsClosingStock?: number;
  signature?: string;
  notes?: string;
}
