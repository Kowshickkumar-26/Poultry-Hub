import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFarmerById } from "@/lib/api/farmers";
import { downloadBatchClosingReport } from "@/lib/api/batches";
import { LoadingState } from "@/components/LoadingState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Building2,
  MapPin,
  Activity,
  History,
  X,
  ShieldCheck,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface CEOFarmerDetailsModalProps {
  farmerId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CEOFarmerDetailsModal({
  farmerId,
  isOpen,
  onClose,
}: CEOFarmerDetailsModalProps) {
  const [downloadingBatchId, setDownloadingBatchId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const {
    data: farmer,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["farmerDetails", farmerId],
    queryFn: () => getFarmerById(farmerId!),
    enabled: isOpen && !!farmerId,
  });

  const handleDownloadReport = async (batchId: number, batchCode?: string) => {
    if (downloadingBatchId !== null) return;
    setDownloadingBatchId(batchId);
    setDownloadError(null);
    try {
      await downloadBatchClosingReport(batchId, batchCode);
    } catch (err: unknown) {
      console.error("Failed to download closing report", err);
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setDownloadError(message || "Failed to download Closing Report PDF.");
    } finally {
      setDownloadingBatchId(null);
    }
  };

  if (!isOpen || !farmerId) return null;

  // Batch Age calculation
  const getBatchAge = (startDate?: string | null) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-300 ring-2 ring-white/20">
              <User size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                  Farmer Details
                </span>
                <span className="text-xs text-slate-300">ID #{farmer?.id || farmerId}</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">{farmer?.userName || "Loading..."}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
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

          {isLoading ? (
            <LoadingState message="Loading farmer full details and history..." />
          ) : isError || !farmer ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700 text-sm">
              Failed to load detailed profile for this farmer. Please try again.
            </div>
          ) : (
            <>
              {/* 2-Column: Personal Profile + Farm Details */}
              <div className="grid gap-5 md:grid-cols-2">
                {/* Farmer Profile Card */}
                <Card className="rounded-2xl border-slate-200 bg-slate-50/50 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
                    <User size={17} className="text-emerald-700" />
                    <h3 className="font-bold text-slate-900 text-sm">Farmer Information</h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Full Name</span>
                      <span className="font-bold text-slate-900">{farmer.userName}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Email</span>
                      <span className="font-semibold text-slate-800">{farmer.userEmail}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Phone Number</span>
                      <span className="font-semibold text-slate-800">
                        {farmer.userPhone || "Not provided"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Farmer ID</span>
                      <span className="font-semibold text-emerald-800">#{farmer.id}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Registered Date</span>
                      <span className="font-semibold text-slate-800">
                        {farmer.joinedDate
                          ? new Date(farmer.joinedDate).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Farm Details Card */}
                <Card className="rounded-2xl border-slate-200 bg-slate-50/50 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={17} className="text-blue-700" />
                      <h3 className="font-bold text-slate-900 text-sm">Farm Facility</h3>
                    </div>
                    {farmer.farmId && (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        Farm #{farmer.farmId}
                      </span>
                    )}
                  </div>

                  {farmer.farmId ? (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Farm Name</span>
                        <span className="font-bold text-slate-900">{farmer.farmName}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-500">Location</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <MapPin size={12} className="text-emerald-600" />
                          {farmer.farmLocation || "Location not recorded"}
                        </span>
                      </div>

                      {farmer.farmCreatedAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Created Date</span>
                          <span className="font-semibold text-slate-800">
                            {new Date(farmer.farmCreatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      <div>
                        <span className="text-slate-500 block mb-1">Facility Description:</span>
                        <div className="rounded-xl bg-white p-2.5 text-slate-700 border border-slate-200">
                          {farmer.farmDescription || "No detailed description provided."}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-500">
                      No farm linked to this farmer.
                    </div>
                  )}
                </Card>
              </div>

              {/* Current Active Batch Section */}
              <Card className="rounded-2xl border-slate-200 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity size={18} className="text-emerald-700" />
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Current Active Batch
                    </h3>
                  </div>

                  {farmer.activeBatchId ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                      {farmer.activeBatchStatus} • Day {getBatchAge(farmer.activeBatchStartDate)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-600">
                      NO ACTIVE BATCH
                    </span>
                  )}
                </div>

                {farmer.activeBatchId ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                      <span className="text-slate-500">Batch Code</span>
                      <p className="mt-1 font-bold text-slate-900 text-sm">{farmer.activeBatchCode}</p>
                      <p className="text-[10px] text-slate-500">Batch ID #{farmer.activeBatchId}</p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                      <span className="text-slate-500">Initial Birds</span>
                      <p className="mt-1 font-bold text-slate-900 text-sm">
                        {farmer.initialBirds?.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500">Started {farmer.activeBatchStartDate || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50/60 p-3.5 border border-emerald-100">
                      <span className="text-emerald-700 font-semibold">Live Remaining Birds</span>
                      <p className="mt-1 font-black text-emerald-800 text-sm">
                        {(farmer.remainingBirds ?? farmer.initialBirds)?.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-emerald-600">
                        Mortality: {farmer.totalMortality ?? 0}
                      </p>
                    </div>

                    <div className="rounded-xl bg-amber-50/60 p-3.5 border border-amber-100">
                      <span className="text-amber-800 font-semibold">Feed Stock Balance</span>
                      <p className="mt-1 font-black text-amber-900 text-sm">
                        {farmer.feedStockKg ?? 0} kg
                      </p>
                      <p className="text-[10px] text-amber-700">Available on site</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500">
                    This farmer has no active flock running at the moment.
                  </div>
                )}
              </Card>

              {/* Batch History Table */}
              <Card className="rounded-2xl border-slate-200 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-purple-700" />
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Complete Batch History ({farmer.batchHistory?.length || 0})
                    </h3>
                  </div>
                </div>

                {!farmer.batchHistory || farmer.batchHistory.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No historical batch records found for this farmer.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
                        <tr>
                          <th className="px-4 py-2.5 font-bold">Batch Code</th>
                          <th className="px-4 py-2.5 font-bold">Timeline</th>
                          <th className="px-4 py-2.5 font-bold text-right">Initial Birds</th>
                          <th className="px-4 py-2.5 font-bold text-right">Final Birds</th>
                          <th className="px-4 py-2.5 font-bold text-right">Mortality</th>
                          <th className="px-4 py-2.5 font-bold text-center">Status</th>
                          <th className="px-4 py-2.5 font-bold text-center">Closing Report</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {farmer.batchHistory.map((batch) => (
                          <tr key={batch.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-bold text-slate-900">{batch.batchCode}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : "—"}
                              {" → "}
                              {batch.endDate ? new Date(batch.endDate).toLocaleDateString() : "Present"}
                            </td>
                            <td className="px-4 py-3 font-semibold text-right">
                              {batch.initialBirds?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 font-bold text-emerald-800 text-right">
                              {batch.finalRemainingBirds?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-rose-700 font-semibold text-right">
                              {batch.totalMortality}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  batch.status === "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : batch.status === "COMPLETED"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {batch.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {batch.status === "COMPLETED" ? (
                                <Button
                                  onClick={() => handleDownloadReport(batch.id, batch.batchCode)}
                                  disabled={downloadingBatchId === batch.id}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 rounded-lg border-emerald-300 bg-emerald-50 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400"
                                >
                                  {downloadingBatchId === batch.id ? (
                                    <>
                                      <Loader2 size={12} className="animate-spin mr-1" />
                                      <span>Downloading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <FileText size={12} className="mr-1 text-emerald-700" />
                                      <span>PDF Report</span>
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <span className="text-slate-400 text-[11px]">In Progress</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Read-only CEO Administrative Overview</span>
          </div>

          <Button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
