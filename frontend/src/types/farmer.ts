export interface BatchHistoryItem {
  id: number;
  batchCode: string;
  startDate?: string;
  endDate?: string;
  initialBirds: number;
  finalRemainingBirds: number;
  totalMortality: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export interface FarmerResponse {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone?: string;
  joinedDate: string;

  // Farm info
  farmId: number;
  farmName: string;
  farmLocation?: string;
  farmDescription?: string;
  farmCreatedAt?: string;

  // Active batch live stats
  activeBatchId?: number;
  activeBatchCode?: string;
  activeBatchStatus?: "ACTIVE" | "COMPLETED" | "CANCELLED";
  activeBatchStartDate?: string;
  initialBirds?: number;
  remainingBirds?: number;
  totalMortality?: number;
  feedStockKg?: number;

  // Aggregate batch counts
  totalBatchesCount?: number;
  completedBatchesCount?: number;

  // Full batch history for drill-down views
  batchHistory?: BatchHistoryItem[];
}

export interface FarmerProfileUpdateRequest {
  name: string;
  phone?: string;
  farmName: string;
  farmLocation?: string;
  farmDescription?: string;
}
