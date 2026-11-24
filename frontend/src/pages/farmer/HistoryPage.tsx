import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBatchHistory, downloadBatchClosingReport } from "@/lib/api/batches";
import { getDailyRecords } from "@/lib/api/dailyRecords";
import { getSales, getExpenses } from "@/lib/api/batchModules";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BatchResponse } from "@/types/batch";
import {
  History,
  Search,
  Eye,
  Activity,
  X,
  CheckCircle2,
  FileText,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function FarmerHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<BatchResponse | null>(null);
  const [downloadingBatchId, setDownloadingBatchId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["batchHistory"],
    queryFn: getBatchHistory,
  });

  const handleDownloadReport = async (batch: BatchResponse, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (downloadingBatchId !== null) return;
    setDownloadingBatchId(batch.id);
    setDownloadError(null);
    try {
      await downloadBatchClosingReport(batch.id, batch.batchCode);
    } catch (err: unknown) {
      console.error("Failed to download batch report", err);
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setDownloadError(
        message || "Failed to generate Batch Report PDF. Please try again."
      );
    } finally {
      setDownloadingBatchId(null);
    }
  };

  // Queries for detail modal
  const { data: detailRecords = [] } = useQuery({
    queryKey: ["historyDailyRecords", selectedBatch?.id],
    queryFn: () => getDailyRecords(selectedBatch!.id),
    enabled: !!selectedBatch,
  });

  const { data: detailSales = [] } = useQuery({
    queryKey: ["historySales", selectedBatch?.id],
    queryFn: () => getSales(selectedBatch!.id),
    enabled: !!selectedBatch,
  });

  const { data: detailExpenses = [] } = useQuery({
    queryKey: ["historyExpenses", selectedBatch?.id],
    queryFn: () => getExpenses(selectedBatch!.id),
    enabled: !!selectedBatch,
  });

  const filteredBatches = batches.filter((b) =>
    b.batchCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.farmName && b.farmName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Overall Historical Aggregates
  const totalBirdsReared = batches.reduce((sum, b) => sum + (b.initialBirds || 0), 0);

  // Detail batch calculations
  const totalMortality = detailRecords.reduce((sum, r) => sum + (r.mortality || 0), 0);
  const totalFeedKg = detailRecords.reduce((sum, r) => sum + (r.feedConsumedKg || 0), 0);
  const totalRevenue = detailSales.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const totalExpensesAmount = detailExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  if (isLoading) {
    return (
      <AppLayout title="Batch History" breadcrumb={[{ label: "View History" }]}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-sm font-medium text-slate-600">Loading batch archives...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Completed Batches History"
      breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "View History" }]}
    >
      <div className="space-y-8 p-6 md:p-8">
        {/* Header Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed Batches</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <History size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900">{batches.length}</p>
            <p className="mt-1 text-xs text-slate-500">Archived flock cycles</p>
          </Card>

          <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Chicks Reared</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Activity size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900">{totalBirdsReared.toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-500">Across all completed cycles</p>
          </Card>

          <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-emerald-700">Read-Only</p>
            <p className="mt-1 text-xs text-slate-500">Protected historical data</p>
          </Card>
        </div>

        {/* Error Alert Banner */}
        {downloadError && (
          <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{downloadError}</span>
            </div>
            <button
              onClick={() => setDownloadError(null)}
              className="rounded-lg p-1 text-rose-500 hover:bg-rose-100 hover:text-rose-700"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by batch code or farm name..."
              className="rounded-xl pl-9 bg-white text-sm shadow-2xs"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Showing {filteredBatches.length} of {batches.length} completed batches
          </span>
        </div>

        {/* Batches Table / Grid */}
        {filteredBatches.length === 0 ? (
          <Card className="rounded-2xl border-slate-200 p-8 text-center shadow-sm">
            <History className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-lg font-bold text-slate-900">No Completed Batches Found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Batches that you end will automatically be archived here as permanent historical records.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBatches.map((batch) => (
              <Card
                key={batch.id}
                className="flex flex-col justify-between rounded-2xl border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-emerald-200"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                        {batch.batchCode}
                      </span>
                      <h4 className="mt-1 text-base font-bold text-slate-900">{batch.farmName}</h4>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      COMPLETED
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lifecycle Period:</span>
                      <span className="font-semibold text-slate-800">{batch.startDate} → {batch.endDate ?? "Ended"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Initial Flock Size:</span>
                      <span className="font-bold text-slate-900">{batch.initialBirds.toLocaleString()} birds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Farm ID:</span>
                      <span className="font-medium text-slate-700">#{batch.farmId}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-2 border-t border-slate-100 pt-3">
                  <Button
                    onClick={(e) => handleDownloadReport(batch, e)}
                    disabled={downloadingBatchId === batch.id}
                    className="w-full rounded-xl bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 shadow-xs flex items-center justify-center gap-1.5"
                  >
                    {downloadingBatchId === batch.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={14} />
                        <span>Download Batch Closing Report</span>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setSelectedBatch(batch)}
                    variant="outline"
                    className="w-full rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  >
                    <Eye size={14} className="mr-1.5" />
                    Inspect Batch Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Read-Only Batch Inspection Modal */}
        {selectedBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setSelectedBatch(null)}
            />

            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">Historical Batch: {selectedBatch.batchCode}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      READ-ONLY ARCHIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Farm: {selectedBatch.farmName} • Period: {selectedBatch.startDate} to {selectedBatch.endDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleDownloadReport(selectedBatch)}
                    disabled={downloadingBatchId === selectedBatch.id}
                    size="sm"
                    className="rounded-xl bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800 flex items-center gap-1.5"
                  >
                    {downloadingBatchId === selectedBatch.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        <span>Download Closing Report PDF</span>
                      </>
                    )}
                  </Button>
                  <button
                    onClick={() => setSelectedBatch(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* KPI Summary Banner */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs">
                  <span className="text-slate-400 uppercase text-[10px]">Initial Birds</span>
                  <p className="text-base font-bold text-slate-900">{selectedBatch.initialBirds}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs">
                  <span className="text-slate-400 uppercase text-[10px]">Total Mortality</span>
                  <p className="text-base font-bold text-rose-600">{totalMortality}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs">
                  <span className="text-slate-400 uppercase text-[10px]">Total Feed</span>
                  <p className="text-base font-bold text-slate-900">{totalFeedKg} kg</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs">
                  <span className="text-slate-400 uppercase text-[10px]">Sales Revenue</span>
                  <p className="text-base font-bold text-emerald-700">₹{totalRevenue.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs">
                  <span className="text-slate-400 uppercase text-[10px]">Expenses</span>
                  <p className="text-base font-bold text-rose-600">₹{totalExpensesAmount.toLocaleString()}</p>
                </div>
              </div>

              {/* Daily Records Tabulation */}
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Daily Card Log ({detailRecords.length} entries)
                </h4>
                <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Age</th>
                        <th className="p-2">Mortality</th>
                        <th className="p-2">Feed (kg)</th>
                        <th className="p-2">Avg Weight (g)</th>
                        <th className="p-2">FCR</th>
                        <th className="p-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="p-2 font-semibold text-slate-800">{r.recordDate}</td>
                          <td className="p-2 text-slate-600">Day {r.ageDays ?? "—"}</td>
                          <td className="p-2 font-bold text-rose-600">{r.mortality}</td>
                          <td className="p-2 text-slate-700">{r.feedConsumedKg} kg</td>
                          <td className="p-2 text-slate-700">{r.avgWeightG ? `${r.avgWeightG} g` : "—"}</td>
                          <td className="p-2 font-bold text-emerald-700">{r.fcr != null ? Number(r.fcr).toFixed(2) : "—"}</td>
                          <td className="p-2 text-slate-500 max-w-[120px] truncate">{r.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sales Entries Tabulation */}
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Sales Details ({detailSales.length} records)
                </h4>
                <div className="mt-2 rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Trader</th>
                        <th className="p-2">Birds Sold</th>
                        <th className="p-2">Total Weight</th>
                        <th className="p-2">Rate/kg (₹)</th>
                        <th className="p-2">Revenue (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailSales.map((s) => (
                        <tr key={s.id}>
                          <td className="p-2 font-semibold text-slate-800">{s.saleDate}</td>
                          <td className="p-2 text-slate-700">{s.traderName || "—"}</td>
                          <td className="p-2 font-bold text-slate-900">{s.birdsSold}</td>
                          <td className="p-2 text-slate-700">{s.totalWeightKg} kg</td>
                          <td className="p-2 text-slate-700">₹{s.ratePerKg}</td>
                          <td className="p-2 font-bold text-emerald-700">₹{s.revenue?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <Button
                  onClick={() => handleDownloadReport(selectedBatch)}
                  disabled={downloadingBatchId === selectedBatch.id}
                  className="rounded-xl bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 flex items-center gap-1.5"
                >
                  {downloadingBatchId === selectedBatch.id ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={14} />
                      <span>Download Batch Closing Report PDF</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setSelectedBatch(null)}
                  variant="outline"
                  className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Close Inspection
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

