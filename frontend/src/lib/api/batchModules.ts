import { api } from "@/lib/api";
import type {
  FeedLoadRequest,
  FeedLoadResponse,
  FeedStockResponse,
  VaccineRequest,
  VaccineResponse,
  SaleRequest,
  SaleResponse,
  ExpenseRequest,
  ExpenseResponse,
  ExpenseCategoryTotal,
  RemarkRequest,
  RemarkResponse,
} from "@/types/batchModules";

// Feed
export async function getFeedLoads(batchId: number): Promise<FeedLoadResponse[]> {
  const res = await api.get<FeedLoadResponse[]>(`/api/batches/${batchId}/feed-loads`);
  return res.data;
}
export async function addFeedLoad(
  batchId: number,
  data: FeedLoadRequest
): Promise<FeedLoadResponse> {
  const res = await api.post<FeedLoadResponse>(`/api/batches/${batchId}/feed-loads`, data);
  return res.data;
}
export async function getFeedStock(batchId: number): Promise<FeedStockResponse> {
  const res = await api.get<FeedStockResponse>(`/api/batches/${batchId}/feed-stock`);
  return res.data;
}

// Vaccines
export async function getVaccines(batchId: number): Promise<VaccineResponse[]> {
  const res = await api.get<VaccineResponse[]>(`/api/batches/${batchId}/vaccines`);
  return res.data;
}
export async function addVaccine(
  batchId: number,
  data: VaccineRequest
): Promise<VaccineResponse> {
  const res = await api.post<VaccineResponse>(`/api/batches/${batchId}/vaccines`, data);
  return res.data;
}

// Sales
export async function getSales(batchId: number): Promise<SaleResponse[]> {
  const res = await api.get<SaleResponse[]>(`/api/batches/${batchId}/sales`);
  return res.data;
}
export async function addSale(batchId: number, data: SaleRequest): Promise<SaleResponse> {
  const res = await api.post<SaleResponse>(`/api/batches/${batchId}/sales`, data);
  return res.data;
}

// Expenses
export async function getExpenses(batchId: number): Promise<ExpenseResponse[]> {
  const res = await api.get<ExpenseResponse[]>(`/api/batches/${batchId}/expenses`);
  return res.data;
}
export async function addExpense(
  batchId: number,
  data: ExpenseRequest
): Promise<ExpenseResponse> {
  const res = await api.post<ExpenseResponse>(`/api/batches/${batchId}/expenses`, data);
  return res.data;
}
// Named to match the backend concept directly: category-wise totals for
// the profitability breakdown. If your file currently has this as
// getExpenseTotals, either rename it to getExpenseBreakdown (matches
// ExpensesTab.tsx's import) or update that one import instead -- just
// make sure both sides use the same name.
export async function getExpenseBreakdown(
  batchId: number
): Promise<ExpenseCategoryTotal[]> {
  const res = await api.get<ExpenseCategoryTotal[]>(
    `/api/batches/${batchId}/expenses/breakdown`
  );
  return res.data;
}

// Remarks
export async function getRemarks(batchId: number): Promise<RemarkResponse[]> {
  const res = await api.get<RemarkResponse[]>(`/api/batches/${batchId}/remarks`);
  return res.data;
}
export async function addRemark(
  batchId: number,
  data: RemarkRequest
): Promise<RemarkResponse> {
  const res = await api.post<RemarkResponse>(`/api/batches/${batchId}/remarks`, data);
  return res.data;
}
