import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActiveBatch, getBatchHistory } from "@/lib/api/batches";
import { getDailyRecords } from "@/lib/api/dailyRecords";
import { getExpenses, getSales, getFeedLoads } from "@/lib/api/batchModules";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import {
  GrowthCurveChart,
  FcrTrajectoryChart,
  MortalityChart,
} from "@/components/charts";
import {
  BarChart3,
  Layers,
  Activity,
  AlertCircle,
  Package,
  IndianRupee,
  Scale,
} from "lucide-react";

export default function FarmerReportsPage() {
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  // 1. Fetch active batch
  const { data: activeBatch, isLoading: isBatchLoading } = useQuery({
    queryKey: ["activeBatch"],
    queryFn: getActiveBatch,
  });

  // 2. Fetch all historical batches for batch selection
  const { data: batchHistory = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ["batchHistory"],
    queryFn: getBatchHistory,
  });

  // Combine active batch and history batches into a unique list
  const allBatches = useMemo(() => {
    const list = [...batchHistory];
    if (activeBatch && !list.some((b) => b.id === activeBatch.id)) {
      list.unshift(activeBatch);
    }
    return list;
  }, [activeBatch, batchHistory]);

  // Current selected batch object
  const currentBatch = useMemo(() => {
    if (selectedBatchId != null) {
      return allBatches.find((b) => b.id === selectedBatchId) || activeBatch || allBatches[0] || null;
    }
    return activeBatch || allBatches[0] || null;
  }, [selectedBatchId, allBatches, activeBatch]);

  const batchId = currentBatch?.id;

  // 3. Fetch data for the selected batch
  const { data: records = [], isLoading: isRecordsLoading } = useQuery({
    queryKey: ["dailyRecords", batchId],
    queryFn: () => getDailyRecords(batchId!),
    enabled: !!batchId,
  });

  const { data: sales = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ["sales", batchId],
    queryFn: () => getSales(batchId!),
    enabled: !!batchId,
  });

  const { data: expenses = [], isLoading: isExpensesLoading } = useQuery({
    queryKey: ["expenses", batchId],
    queryFn: () => getExpenses(batchId!),
    enabled: !!batchId,
  });

  const { data: feedLoads = [], isLoading: isFeedLoading } = useQuery({
    queryKey: ["feedLoads", batchId],
    queryFn: () => getFeedLoads(batchId!),
    enabled: !!batchId,
  });

  const isDataLoading =
    isRecordsLoading || isSalesLoading || isExpensesLoading || isFeedLoading;

  // Metrics computation from real database data
  const latestRecord = records.length > 0 ? records[records.length - 1] : null;
  const initialBirds = currentBatch?.initialBirds ?? 0;
  const totalMortality = records.reduce((sum, r) => sum + (r.mortality || 0), 0);
  const totalBirdsSold = sales.reduce((sum, s) => sum + (s.birdsSold || 0), 0);
  const remainingBirds = Math.max(0, initialBirds - totalMortality - totalBirdsSold);

  const totalRevenue = sales.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalFeedBags = feedLoads.reduce((sum, item) => sum + (item.bags || 0), 0);
  const totalFeedKg = records.reduce((sum, item) => sum + (item.feedConsumedKg || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const isCompleted = currentBatch?.status === "COMPLETED";

  if (isBatchLoading && isHistoryLoading) {
    return (
      <AppLayout title="Performance Reports" breadcrumb={[{ label: "Reports" }]}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            <p className="text-sm text-slate-600">Loading batch reports...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Flock Performance Reports & Analytics"
      breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Reports" }]}
    >
      <div className="space-y-8 p-6 md:p-8">
        {/* Header and Batch Selector Bar */}
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-xs border border-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Analytics Hub
              </span>
              {currentBatch && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isCompleted
                      ? "bg-slate-100 text-slate-700 border border-slate-300"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-300"
                  }`}
                >
                  {isCompleted ? "Completed Batch (Historical)" : "Active Batch"}
                </span>
              )}
            </div>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {currentBatch ? `Batch Performance: ${currentBatch.batchCode}` : "No Batches Available"}
            </h2>
            {currentBatch && (
              <p className="text-xs text-slate-500">
                Started: {currentBatch.startDate} {currentBatch.endDate ? `• Ended: ${currentBatch.endDate}` : ""}
              </p>
            )}
          </div>

          {/* Batch Selector Dropdown */}
          {allBatches.length > 0 && (
            <div className="flex items-center gap-3">
              <label htmlFor="batchSelect" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Select Batch:
              </label>
              <select
                id="batchSelect"
                value={currentBatch?.id || ""}
                onChange={(e) => setSelectedBatchId(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {allBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchCode} ({b.status === "ACTIVE" ? "Active" : "Completed"}) — {b.startDate}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!currentBatch ? (
          <Card className="rounded-2xl border-slate-200 p-12 text-center shadow-xs">
            <Layers className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-3 text-xl font-bold text-slate-900">No Batches Found</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a batch from the Home Dashboard to generate interactive performance reports.
            </p>
          </Card>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Live / Final Remaining Birds */}
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {isCompleted ? "Final Birds" : "Live Birds"}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-black text-slate-900">{remainingBirds.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Initial: {initialBirds.toLocaleString()} • Sold: {totalBirdsSold.toLocaleString()}
                  </p>
                </div>
              </Card>

              {/* Cumulative Mortality */}
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Cumulative Mortality
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-slate-900">{totalMortality.toLocaleString()}</p>
                    {initialBirds > 0 && (
                      <span className="text-xs font-bold text-rose-600">
                        {((totalMortality / initialBirds) * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Total flock losses</p>
                </div>
              </Card>

              {/* Feed Consumed & Delivered */}
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Feed Delivered
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Package className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-black text-slate-900">{totalFeedBags} bags</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Total consumed: {totalFeedKg.toLocaleString()} kg
                  </p>
                </div>
              </Card>

              {/* Net Profit Margin */}
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Net Revenue Margin
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className={`text-2xl font-black ${netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    ₹{netProfit.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Rev: ₹{totalRevenue.toLocaleString()} • Exp: ₹{totalExpenses.toLocaleString()}
                  </p>
                </div>
              </Card>
            </div>

            {/* Interactive Charts Section */}
            <div className="space-y-6">
              {/* Growth Curve Chart */}
              <GrowthCurveChart
                records={records}
                isLoading={isDataLoading}
                height={320}
              />

              {/* 2-Column Grid: FCR Trajectory and Mortality Analysis */}
              <div className="grid gap-6 lg:grid-cols-2">
                <FcrTrajectoryChart
                  records={records}
                  isLoading={isDataLoading}
                  height={280}
                />
                <MortalityChart
                  records={records}
                  initialBirds={initialBirds}
                  isLoading={isDataLoading}
                  height={280}
                />
              </div>
            </div>

            {/* Batch Performance Summary & Ledger Breakdown */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">Batch Financial & Biomass Summary</h3>
                  <Scale className="h-5 w-5 text-slate-400" />
                </div>
                <div className="mt-4 divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 font-medium">Initial Birds Placed</span>
                    <span className="font-bold text-slate-900">{initialBirds.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 font-medium">Total Birds Sold</span>
                    <span className="font-bold text-slate-900">{totalBirdsSold.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 font-medium">Gross Sales Revenue</span>
                    <span className="font-bold text-emerald-700">₹{totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 font-medium">Total Farm Expenses</span>
                    <span className="font-bold text-rose-600">₹{totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 font-medium">Latest Feed Conversion Ratio (FCR)</span>
                    <span className="font-bold text-blue-700">{latestRecord?.fcr != null ? Number(latestRecord.fcr).toFixed(2) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 font-medium">Latest Average Bird Weight</span>
                    <span className="font-bold text-emerald-800">
                      {latestRecord?.avgWeightG ? `${latestRecord.avgWeightG} g` : "N/A"}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">Operational Log Records</h3>
                  <BarChart3 className="h-5 w-5 text-slate-400" />
                </div>
                <ul className="mt-4 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <span className="font-medium">Daily Card Records Logged</span>
                    <span className="font-bold text-slate-900">{records.length} entries</span>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <span className="font-medium">Sales & Lifting Ledger Entries</span>
                    <span className="font-bold text-slate-900">{sales.length} transactions</span>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <span className="font-medium">Expense Entries Recorded</span>
                    <span className="font-bold text-slate-900">{expenses.length} records</span>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <span className="font-medium">Feed Shipments Received</span>
                    <span className="font-bold text-slate-900">{feedLoads.length} deliveries</span>
                  </li>
                </ul>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
