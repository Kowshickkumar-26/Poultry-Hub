import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { getActiveBatch, endBatch, downloadBatchClosingReport } from "@/lib/api/batches";
import { getDailyRecords } from "@/lib/api/dailyRecords";
import { getSales, getExpenses } from "@/lib/api/batchModules";
import { AppLayout } from "@/components/AppLayout";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  StopCircle,
  AlertTriangle,
  DollarSign,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Lock,
  TrendingDown,
  ShoppingBag,
  FileDown,
  Sparkles,
} from "lucide-react";

export default function FarmerEndBatchPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [completedBatchInfo, setCompletedBatchInfo] = useState<{ id: number; batchCode: string } | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const { data: activeBatch, isLoading: isBatchLoading } = useQuery({
    queryKey: ["activeBatch"],
    queryFn: getActiveBatch,
  });

  const { data: records = [] } = useQuery({
    queryKey: ["dailyRecords", activeBatch?.id],
    queryFn: () => getDailyRecords(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales", activeBatch?.id],
    queryFn: () => getSales(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", activeBatch?.id],
    queryFn: () => getExpenses(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const endBatchMutation = useMutation({
    mutationFn: (batchId: number) => endBatch(batchId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activeBatch"] });
      queryClient.invalidateQueries({ queryKey: ["batchHistory"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setIsConfirmOpen(false);
      setCompletedBatchInfo({ id: data.id, batchCode: data.batchCode });
    },
  });

  // Calculate Batch Summary
  const initialBirds = activeBatch?.initialBirds || 0;
  const totalMortality = records.reduce((sum, r) => sum + (r.mortality || 0), 0);
  const totalBirdsSold = sales.reduce((sum, s) => sum + (s.birdsSold || 0), 0);
  const remainingBirds = Math.max(0, initialBirds - totalMortality - totalBirdsSold);

  const mortalityPct = initialBirds > 0
    ? ((totalMortality / initialBirds) * 100).toFixed(2)
    : "0.00";
  const soldPct = initialBirds > 0
    ? ((totalBirdsSold / initialBirds) * 100).toFixed(2)
    : "0.00";

  const totalFeedKg = records.reduce((sum, r) => sum + (r.feedConsumedKg || 0), 0);
  const totalSalesRevenue = sales.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netMargin = totalSalesRevenue - totalExpenses;

  const isEligibleToEnd = remainingBirds === 0 && initialBirds > 0;

  const handleDownloadReport = async (batchId: number, batchCode?: string) => {
    try {
      setIsDownloadingPdf(true);
      await downloadBatchClosingReport(batchId, batchCode);
    } catch (error) {
      console.error("Failed to download PDF report:", error);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isBatchLoading) {
    return (
      <AppLayout title="End Batch" breadcrumb={[{ label: "End Batch" }]}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-sm text-slate-600">Loading batch details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // View shown immediately after successfully ending a batch
  if (completedBatchInfo) {
    return (
      <AppLayout
        title="Batch Closed Successfully"
        breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "End Batch" }]}
      >
        <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
          <Card className="rounded-3xl border-emerald-200 bg-gradient-to-b from-emerald-50/70 to-white p-8 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <CheckCircle2 size={36} />
            </div>

            <span className="mt-4 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              Batch {completedBatchInfo.batchCode} Completed
            </span>

            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Flock Finalized & Archived
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
              This batch has reached 0 remaining birds and is now permanently closed in history. You can now download the comprehensive Batch Closing Report PDF.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={() => handleDownloadReport(completedBatchInfo.id, completedBatchInfo.batchCode)}
                disabled={isDownloadingPdf}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700"
              >
                <FileDown className="mr-2 h-5 w-5" />
                {isDownloadingPdf ? "Generating PDF..." : "Download Batch Closing Report (PDF)"}
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/farmer/history")}
                className="w-full sm:w-auto rounded-xl border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
              >
                View Batch History →
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="End Batch Workflow"
      breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "End Batch" }]}
    >
      <div className="space-y-8 p-6 md:p-8">
        {!activeBatch ? (
          <Card className="rounded-2xl border-slate-200 p-8 text-center shadow-sm">
            <StopCircle className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-3 text-xl font-bold text-slate-900">No Active Batch</h2>
            <p className="mt-1 text-sm text-slate-500">
              There is currently no active flock batch to end. Start a new batch from the Home Dashboard.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="mt-4 rounded-xl bg-emerald-600 text-xs font-semibold text-white"
            >
              Go to Dashboard
            </Button>
          </Card>
        ) : (
          <>
            {/* Header Banner */}
            <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                    Active Flock Finalization
                  </span>
                  <span className="text-xs text-slate-300">Flock: {activeBatch.batchCode}</span>
                </div>
                <h2 className="mt-1 text-2xl font-bold text-white">Batch Closing & Finalization</h2>
                <p className="text-sm text-slate-300">
                  Strict Rule: All birds must reach exactly <strong>0 remaining</strong> (via daily mortality & sales) before closing.
                </p>
              </div>

              {isEligibleToEnd ? (
                <Button
                  onClick={() => setIsConfirmOpen(true)}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-6 py-3 font-bold text-white shadow-lg hover:from-rose-700 hover:to-red-700"
                >
                  <StopCircle className="mr-2 h-5 w-5" />
                  End & Complete Batch
                </Button>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-4 py-2.5 border border-slate-700 text-xs font-semibold text-amber-300">
                  <Lock size={15} />
                  <span>Locked: {remainingBirds.toLocaleString()} birds remaining</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {endBatchMutation.isError && (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-800 border border-rose-200">
                <AlertTriangle size={20} className="text-rose-600 shrink-0" />
                <span>
                  {isAxiosError(endBatchMutation.error)
                    ? endBatchMutation.error.response?.data?.message || "Failed to end batch"
                    : "An error occurred while ending the batch."}
                </span>
              </div>
            )}

            {/* 4 Primary Bird Count KPI Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {/* Initial Birds */}
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">1. Initial Flock</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <p className="text-2xl font-black text-slate-900">{initialBirds.toLocaleString()}</p>
                  <span className="text-xs font-semibold text-slate-500">Day-Old Chicks</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                  <div className="h-1.5 rounded-full bg-slate-400 w-full"></div>
                </div>
              </Card>

              {/* Cumulative Mortality */}
              <Card className="rounded-2xl border-rose-100 bg-rose-50/40 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                  <TrendingDown size={14} /> 2. Total Mortality
                </p>
                <div className="mt-2 flex items-baseline justify-between">
                  <p className="text-2xl font-black text-rose-600">{totalMortality.toLocaleString()}</p>
                  <span className="text-xs font-bold text-rose-700">{mortalityPct}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-rose-200/60">
                  <div
                    className="h-1.5 rounded-full bg-rose-500"
                    style={{ width: `${Math.min(100, parseFloat(mortalityPct))}%` }}
                  ></div>
                </div>
              </Card>

              {/* Total Birds Sold */}
              <Card className="rounded-2xl border-blue-100 bg-blue-50/40 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                  <ShoppingBag size={14} /> 3. Birds Sold
                </p>
                <div className="mt-2 flex items-baseline justify-between">
                  <p className="text-2xl font-black text-blue-600">{totalBirdsSold.toLocaleString()}</p>
                  <span className="text-xs font-bold text-blue-700">{soldPct}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-blue-200/60">
                  <div
                    className="h-1.5 rounded-full bg-blue-500"
                    style={{ width: `${Math.min(100, parseFloat(soldPct))}%` }}
                  ></div>
                </div>
              </Card>

              {/* Remaining Birds (Strict Enabler) */}
              <Card
                className={`rounded-2xl p-5 shadow-sm border-2 ${
                  isEligibleToEnd
                    ? "border-emerald-400 bg-emerald-50/60"
                    : "border-amber-300 bg-amber-50/60"
                }`}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                    isEligibleToEnd ? "text-emerald-800" : "text-amber-800"
                  }`}
                >
                  {isEligibleToEnd ? <CheckCircle2 size={14} /> : <Lock size={14} />} 4. Remaining Birds
                </p>
                <div className="mt-2 flex items-baseline justify-between">
                  <p
                    className={`text-2xl font-black ${
                      isEligibleToEnd ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {remainingBirds.toLocaleString()}
                  </p>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                      isEligibleToEnd
                        ? "bg-emerald-200/80 text-emerald-800"
                        : "bg-amber-200/80 text-amber-800"
                    }`}
                  >
                    {isEligibleToEnd ? "0 (Ready)" : "Must Reach 0"}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-medium text-slate-600">
                  {isEligibleToEnd
                    ? "✓ Flock 100% accounted for"
                    : `Must account for ${remainingBirds.toLocaleString()} more birds`}
                </p>
              </Card>
            </div>

            {/* Status Callout Banner */}
            {!isEligibleToEnd ? (
              <Card className="rounded-2xl border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm mt-0.5 sm:mt-0">
                      <AlertTriangle size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">
                        Batch Cannot Be Ended Yet: {remainingBirds.toLocaleString()} Birds Remaining
                      </h4>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                        The strict batch completion rule requires that <strong>Remaining Birds = 0</strong>.
                        Please record final sales (bird lifting) or today's mortality records before closing the batch.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
                    <Button
                      onClick={() => navigate("/farmer/sales")}
                      className="flex-1 sm:flex-initial rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                    >
                      <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                      Add Bird Sales →
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/farmer/daily-records")}
                      className="flex-1 sm:flex-initial rounded-xl border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Daily Records →
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="rounded-2xl border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm mt-0.5 sm:mt-0">
                      <Sparkles size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-950 text-base">
                        Flock Complete: Ready to End Batch & Generate Closing Report
                      </h4>
                      <p className="mt-1 text-xs sm:text-sm text-emerald-900/80 max-w-2xl leading-relaxed">
                        All {initialBirds.toLocaleString()} birds have been accounted for ({totalMortality.toLocaleString()} mortality + {totalBirdsSold.toLocaleString()} sold).
                        Ending this batch will generate your official PDF closing report.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setIsConfirmOpen(true)}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 shrink-0 w-full sm:w-auto"
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    End Batch Now
                  </Button>
                </div>
              </Card>
            )}

            {/* Final Batch Metrics Overview */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Production Summary Card */}
              <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
                  <Activity size={18} className="text-emerald-600" /> Production & Feed Metrics
                </h3>

                <div className="mt-4 space-y-3.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Initial Day-Old Chicks:</span>
                    <span className="font-bold text-slate-900">{initialBirds.toLocaleString()} birds</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Mortality Count:</span>
                    <span className="font-bold text-rose-600">{totalMortality.toLocaleString()} birds ({mortalityPct}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Birds Sold:</span>
                    <span className="font-bold text-blue-600">{totalBirdsSold.toLocaleString()} birds ({soldPct}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Remaining Birds:</span>
                    <span className={`font-bold ${isEligibleToEnd ? "text-emerald-700" : "text-amber-700"}`}>
                      {remainingBirds.toLocaleString()} birds
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Feed Consumed:</span>
                    <span className="font-bold text-slate-900">{totalFeedKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Daily Cards Recorded:</span>
                    <span className="font-semibold text-slate-800">{records.length} days</span>
                  </div>
                </div>
              </Card>

              {/* Financial & Sales Summary Card */}
              <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
                  <DollarSign size={18} className="text-blue-600" /> Financial & Sales Summary
                </h3>

                <div className="mt-4 space-y-3.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Sales Entries:</span>
                    <span className="font-bold text-blue-700">{sales.length} transactions</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Sales Revenue:</span>
                    <span className="font-bold text-emerald-700">₹{totalSalesRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Operational Expenses:</span>
                    <span className="font-bold text-rose-600">₹{totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-3">
                    <span className="font-bold text-slate-900">Net Operational Margin:</span>
                    <span className={`font-black ${netMargin >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      ₹{netMargin.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Checklist & Instructions */}
            <Card className="rounded-2xl border-slate-200 bg-slate-50/70 p-6">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-6 w-6 text-slate-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">What happens when you end a batch?</h4>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                    <li>✓ The batch status transitions permanently to <strong>COMPLETED</strong>.</li>
                    <li>✓ An automated completion date is stamped to today ({new Date().toISOString().split("T")[0]}).</li>
                    <li>✓ The batch is moved into <strong>Batch History</strong> as a read-only historical record.</li>
                    <li>✓ A professional <strong>Batch Closing Report PDF</strong> becomes immediately available to download.</li>
                    <li>✓ Your farm becomes eligible to start a brand new flock batch.</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
              <Button
                variant="outline"
                onClick={() => navigate("/farmer/sales")}
                className="rounded-xl border-slate-300 font-medium text-slate-700"
              >
                ← Review / Add Final Sales
              </Button>

              <Button
                onClick={() => {
                  if (isEligibleToEnd) {
                    setIsConfirmOpen(true);
                  }
                }}
                disabled={!isEligibleToEnd || endBatchMutation.isPending}
                className={`rounded-xl px-8 py-2.5 font-bold shadow-md transition-all ${
                  isEligibleToEnd
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                {isEligibleToEnd ? "End Batch Now →" : `Locked (${remainingBirds.toLocaleString()} Birds Left)`}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      {activeBatch && (
        <ConfirmDialog
          title="Are you sure you want to end this batch?"
          description={`Ending batch ${activeBatch.batchCode} will mark it as COMPLETED. No further daily records or edits will be permitted. All production data and sales records will be archived in your History, and your Batch Closing Report PDF will be generated.`}
          confirmText="Yes, End Batch"
          cancelText="Cancel"
          variant="destructive"
          isOpen={isConfirmOpen}
          isLoading={endBatchMutation.isPending}
          onConfirm={() => endBatchMutation.mutate(activeBatch.id)}
          onCancel={() => setIsConfirmOpen(false)}
        />
      )}
    </AppLayout>
  );
}
