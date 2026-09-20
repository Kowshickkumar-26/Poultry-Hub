import type { BatchStatus } from "./batch";

export interface CeoNetworkKpis {
  totalFarms: number;
  totalActiveBatches: number;
  totalCompletedBatches: number;
  totalBatches: number;
  totalInitialBirds: number;
  totalRemainingBirds: number;
  totalMortality: number;
  networkMortalityPct: number;
  averageFcr: number | null;
  totalFeedConsumedKg: number;
  totalRevenue: number;
  averageBirdWeightG: number | null;
}

export type PerformanceStatus = "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "NO_DATA";

export interface FarmComparisonItem {
  farmId: number;
  farmName: string;
  farmLocation: string;
  farmerId: number | null;
  farmerName: string;
  activeBatchesCount: number;
  completedBatchesCount: number;
  totalBatchesCount: number;
  totalBirds: number;
  remainingBirds: number;
  totalMortality: number;
  mortalityPct: number;
  avgWeightG: number | null;
  avgFcr: number | null;
  totalFeedConsumedKg: number;
  totalRevenue: number;
  performanceStatus: PerformanceStatus;
  performanceNote: string;
}

export interface BatchReportItem {
  batchId: number;
  batchCode: string;
  farmId: number;
  farmName: string;
  farmerId: number | null;
  farmerName: string;
  status: BatchStatus;
  startDate: string | null;
  endDate: string | null;
  initialBirds: number;
  remainingBirds: number;
  totalMortality: number;
  mortalityPct: number;
  latestAvgWeightG: number | null;
  latestFcr: number | null;
  totalFeedConsumedKg: number;
  totalRevenue: number;
}

export type FcrCategory = "EXCELLENT" | "NORMAL" | "NEEDS_ATTENTION" | "NO_DATA";

export interface HeatmapCellItem {
  farmId: number;
  farmName: string;
  batchId: number;
  batchCode: string;
  recordDate: string;
  dayNumber: number;
  fcr: number | null;
  fcrCategory: FcrCategory;
  mortality: number;
  feedConsumedKg: number;
  avgWeightG: number | null;
}

export interface CeoMultiFarmReportResponse {
  networkKpis: CeoNetworkKpis;
  farmRankings: FarmComparisonItem[];
  batchReports: BatchReportItem[];
  fcrHeatmap: HeatmapCellItem[];
}

export interface CeoReportFilterParams {
  farmId?: number;
  batchStatus?: BatchStatus;
  startDate?: string;
  endDate?: string;
}
