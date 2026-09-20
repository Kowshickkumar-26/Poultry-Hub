// Feed Load + Feed Stock
export interface FeedInventoryItem {
  feedType: string;
  feedTypeDisplay: string;
  bagCapacityKg: number;
  loadedBags: number;
  consumedBags: number;
  availableBags: number;
  availableKg: number;
  stockStatus: "NORMAL" | "LOW_STOCK" | "OUT_OF_STOCK";
}

export interface FeedLoadResponse {
  id: number;
  batchId: number;
  loadDate: string;
  feedType: string;
  bags: number;
  weightPerBagKg: number;
  totalWeightKg?: number;
  createdAt?: string;
}
export interface FeedLoadRequest {
  loadDate?: string;
  feedType: string;
  bags: number;
  weightPerBagKg?: number;
}
export interface FeedStockResponse {
  batchId: number;
  currentBags: number;
  currentStockKg?: number;
  totalLoadedKg?: number;
  totalConsumedKg?: number;
  preStarterLoadedKg?: number;
  starterLoadedKg?: number;
  finisherLoadedKg?: number;
  preStarterConsumedKg?: number;
  starterConsumedKg?: number;
  finisherConsumedKg?: number;
  inventory?: FeedInventoryItem[];
  lastUpdated?: string;
}

// Vaccine
export interface VaccineResponse {
  id: number;
  batchId: number;
  givenDate: string;
  vaccineName: string;
  ageDays: number;
  remarks: string | null;
}
export interface VaccineRequest {
  givenDate?: string;
  vaccineName: string;
  remarks?: string;
}

// Sale
export interface SaleResponse {
  id: number;
  batchId: number;
  saleDate: string;
  traderName?: string | null;
  birdsSold: number;
  totalWeightKg: number;
  avgWeightPerBirdKg: number;
  ratePerKg: number;
  liftingSignature?: string | null;
  revenue: number;
  createdAt?: string;
}
export interface SaleRequest {
  saleDate: string;
  traderName?: string;
  birdsSold: number;
  totalWeightKg: number;
  ratePerKg: number;
  liftingSignature?: string;
}

// Expense
export type ExpenseCategory =
  | "FEED"
  | "MEDICINE"
  | "LABOR"
  | "TRANSPORT"
  | "UTILITIES"
  | "MISC";

export interface ExpenseResponse {
  id: number;
  batchId: number;
  expenseDate: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
}
export interface ExpenseRequest {
  expenseDate: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
}
export interface ExpenseCategoryTotal {
  category: ExpenseCategory;
  total: number;
}

// Remark
export interface RemarkResponse {
  id: number;
  batchId: number;
  remarkDate: string;
  note: string;
  createdByUserId: number;
  createdByName: string;
  createdByRole: string;
}
export interface RemarkRequest {
  remarkDate: string;
  note: string;
}
