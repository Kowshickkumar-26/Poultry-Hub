import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCompletedBatches, downloadBatchClosingReport } from "@/lib/api/batches";
import { exportBatchesListToCsv, exportBatchesListToPdf } from "@/lib/reportExportUtils";
import { AppLayout } from "@/components/AppLayout";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

export default function CEOCompletedBatchesPage() {
  const [downloadingBatchId, setDownloadingBatchId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const {
    data: batches = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["completedBatches"],
    queryFn: getCompletedBatches,
  });

  const handleDownloadBatchReport = async (batchId: number, batchCode?: string) => {
    if (downloadingBatchId !== null) return;
    setDownloadingBatchId(batchId);
    setDownloadError(null);
    try {
      await downloadBatchClosingReport(batchId, batchCode);
    } catch (err: unknown) {
      console.error("Failed to download batch closing report", err);
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setDownloadError(message || "Failed to generate Batch Closing Report PDF. Please try again.");
    } finally {
      setDownloadingBatchId(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Completed Batches">
        <LoadingState message="Loading completed batches..." />
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout title="Completed Batches">
        <ErrorState
          title="Failed to load completed batches"
          message="Could not load completed batches. Please try again."
        />
      </AppLayout>
    );
  }

  if (batches.length === 0) {
    return (
      <AppLayout title="Completed Batches">
        <div className="p-6">
          <EmptyState
            title="No completed batches"
            description="No batches have been completed yet."
            icon={<CheckCircle2 size={48} />}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Completed Batches"
      breadcrumb={[{ label: "Completed Batches" }]}
    >
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Completed Batches Archive</h2>
            <p className="text-xs text-slate-500">Historical performance records and official closing reports.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportBatchesListToCsv(batches, "completed-batches")}
              disabled={batches.length === 0}
              className="h-8 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50 border-slate-300"
            >
              <FileSpreadsheet size={13} className="mr-1.5 text-emerald-700" />
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportBatchesListToPdf(batches, "Completed Batches Archive Report", "completed-batches")}
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
                    End Date
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
                    <td className="px-6 py-3">
                      {batch.endDate
                        ? new Date(batch.endDate).toLocaleDateString()
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
                        className="h-7 px-2.5 text-xs font-semibold rounded-lg text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                        title="Download Batch Closing Report PDF"
                      >
                        {downloadingBatchId === batch.id ? (
                          <>
                            <Loader2 size={12} className="mr-1 animate-spin" />
                            PDF...
                          </>
                        ) : (
                          <>
                            <Download size={12} className="mr-1" />
                            PDF Report
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
