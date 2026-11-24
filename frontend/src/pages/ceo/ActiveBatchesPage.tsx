import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActiveBatches, downloadBatchClosingReport } from "@/lib/api/batches";
import { exportBatchesListToCsv, exportBatchesListToPdf } from "@/lib/reportExportUtils";
import { AppLayout } from "@/components/AppLayout";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

export default function CEOActiveBatchesPage() {
  const [downloadingBatchId, setDownloadingBatchId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const {
    data: batches = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["activeBatches"],
    queryFn: getActiveBatches,
  });

  const handleDownloadBatchReport = async (batchId: number, batchCode?: string) => {
    if (downloadingBatchId !== null) return;
    setDownloadingBatchId(batchId);
    setDownloadError(null);
    try {
      await downloadBatchClosingReport(batchId, batchCode);
    } catch (err: unknown) {
      console.error("Failed to download batch report", err);
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setDownloadError(message || "Failed to generate Batch Report PDF. Please try again.");
    } finally {
      setDownloadingBatchId(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Active Batches">
        <LoadingState message="Loading active batches..." />
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout title="Active Batches">
        <ErrorState
          title="Failed to load active batches"
          message="Could not load active batches. Please try again."
        />
      </AppLayout>
    );
  }

  if (batches.length === 0) {
    return (
      <AppLayout title="Active Batches">
        <div className="p-6">
          <EmptyState
            title="No active batches"
            description="There are no active batches at the moment."
            icon={<CheckCircle2 size={48} />}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Active Batches" breadcrumb={[{ label: "Active Batches" }]}>
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Active Batches Live Overview</h2>
            <p className="text-xs text-slate-500">Live production batches across all partner farms.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportBatchesListToCsv(batches, "active-batches")}
              disabled={batches.length === 0}
              className="h-8 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50 border-slate-300"
            >
              <FileSpreadsheet size={13} className="mr-1.5 text-emerald-700" />
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportBatchesListToPdf(batches, "Active Batches Directory Report", "active-batches")}
              disabled={batches.length === 0}
              className="h-8 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50 border-slate-300"
            >
              <FileText size={13} className="mr-1.5 text-rose-700" />
              Export PDF
            </Button>
          </div>
        </div>

        {downloadError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center justify-between">
            <span>{downloadError}</span>
            <button onClick={() => setDownloadError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
          </div>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Batch Code
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Farmer
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Farm
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Birds
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center font-medium text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{batch.batchCode}</td>
                    <td className="px-6 py-3">{batch.farmerName}</td>
                    <td className="px-6 py-3">{batch.farmName}</td>
                    <td className="px-6 py-3">
                      {batch.startDate
                        ? new Date(batch.startDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-3">{batch.initialBirds?.toLocaleString()}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="px-6 py-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadBatchReport(batch.id, batch.batchCode)}
                        disabled={downloadingBatchId === batch.id}
                        className="h-7 rounded-xl border-emerald-300 bg-emerald-50 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400"
                      >
                        {downloadingBatchId === batch.id ? (
                          <>
                            <Loader2 size={12} className="animate-spin mr-1" />
                            <span>Downloading...</span>
                          </>
                        ) : (
                          <>
                            <Download size={12} className="mr-1 text-emerald-700" />
                            <span>Download PDF</span>
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
