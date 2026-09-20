import { useState } from "react";
import { Card } from "@/components/ui/card";
import type { HeatmapCellItem, BatchReportItem } from "@/types/ceoReport";
import { Activity, Info } from "lucide-react";

interface FcrHeatmapProps {
  cells: HeatmapCellItem[];
  batches: BatchReportItem[];
}

export const FCR_THRESHOLDS = {
  EXCELLENT_MAX: 1.5,
  NORMAL_MAX: 1.75,
};

export function getFcrCategory(fcr: number | null | undefined): "EXCELLENT" | "NORMAL" | "NEEDS_ATTENTION" | "NO_DATA" {
  if (fcr === null || fcr === undefined || fcr <= 0) {
    return "NO_DATA";
  }
  if (fcr < FCR_THRESHOLDS.EXCELLENT_MAX) {
    return "EXCELLENT";
  }
  if (fcr <= FCR_THRESHOLDS.NORMAL_MAX) {
    return "NORMAL";
  }
  return "NEEDS_ATTENTION";
}

export function FcrHeatmap({ cells, batches }: FcrHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCellItem | null>(null);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("ALL");

  if (!batches || batches.length === 0) {
    return (
      <Card className="p-8 text-center text-slate-500 rounded-2xl border-slate-200">
        <Activity className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <p className="font-semibold text-slate-700">No FCR Heatmap Data Available</p>
        <p className="text-xs text-slate-400 mt-1">
          No daily record history found for the selected farm and batch filters.
        </p>
      </Card>
    );
  }

  // Filter batches if a specific batch is chosen in the mini filter
  const displayedBatches =
    selectedBatchFilter === "ALL"
      ? batches
      : batches.filter((b) => b.batchCode === selectedBatchFilter);

  // Group cells by batchId
  const cellsByBatch = new Map<number, HeatmapCellItem[]>();
  cells.forEach((c) => {
    if (!cellsByBatch.has(c.batchId)) {
      cellsByBatch.set(c.batchId, []);
    }
    cellsByBatch.get(c.batchId)!.push(c);
  });

  // Calculate heatmap summary distribution
  const recordedCells = cells.filter((c) => c.fcr != null && c.fcr > 0);
  const excellentCount = recordedCells.filter((c) => (c.fcr || 0) < FCR_THRESHOLDS.EXCELLENT_MAX).length;
  const normalCount = recordedCells.filter(
    (c) => (c.fcr || 0) >= FCR_THRESHOLDS.EXCELLENT_MAX && (c.fcr || 0) <= FCR_THRESHOLDS.NORMAL_MAX
  ).length;
  const needsAttentionCount = recordedCells.filter((c) => (c.fcr || 0) > FCR_THRESHOLDS.NORMAL_MAX).length;

  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <Activity size={16} />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Network FCR Trajectory Heatmap
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Chronological daily Feed Conversion Ratio (FCR) across farm flocks. Hover over any day cell for full record details.
          </p>
        </div>

        {/* Batch filter selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Batch Filter:</label>
          <select
            value={selectedBatchFilter}
            onChange={(e) => setSelectedBatchFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Batches ({batches.length})</option>
            {batches.map((b) => (
              <option key={b.batchId} value={b.batchCode}>
                {b.batchCode} ({b.farmName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend & Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-emerald-600 shrink-0 shadow-xs" />
          <div>
            <p className="font-bold text-slate-800">Excellent (&lt; 1.50)</p>
            <p className="text-[10px] text-slate-500">{excellentCount} days recorded</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-amber-400 shrink-0 shadow-xs" />
          <div>
            <p className="font-bold text-slate-800">Normal (1.50 – 1.75)</p>
            <p className="text-[10px] text-slate-500">{normalCount} days recorded</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-rose-500 shrink-0 shadow-xs" />
          <div>
            <p className="font-bold text-slate-800">Needs Attention (&gt; 1.75)</p>
            <p className="text-[10px] text-slate-500">{needsAttentionCount} days recorded</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-slate-200 border border-slate-300 shrink-0 shadow-xs" />
          <div>
            <p className="font-bold text-slate-800">No Data / Untracked</p>
            <p className="text-[10px] text-slate-500">Missing daily metrics</p>
          </div>
        </div>
      </div>

      {/* Heatmap Grid Rows */}
      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
        {displayedBatches.map((batch) => {
          const batchCells = cellsByBatch.get(batch.batchId) || [];
          // Sort cells by day number / record date
          const sortedCells = [...batchCells].sort(
            (a, b) => (a.dayNumber || 0) - (b.dayNumber || 0)
          );

          return (
            <div
              key={batch.batchId}
              className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors"
            >
              {/* Row title */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                    {batch.farmName}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {batch.batchCode}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      batch.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {batch.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    Initial:{" "}
                    <strong className="text-slate-800 font-semibold">
                      {batch.initialBirds.toLocaleString()}
                    </strong>
                  </span>
                  <span>
                    Mortality:{" "}
                    <strong className="text-rose-600 font-semibold">
                      {batch.totalMortality} ({batch.mortalityPct}%)
                    </strong>
                  </span>
                  {batch.latestFcr != null && (
                    <span>
                      Latest FCR:{" "}
                      <strong className="text-emerald-700 font-bold">
                        {batch.latestFcr}
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Day cells grid */}
              {sortedCells.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-2">
                  No daily records registered for this batch yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sortedCells.map((cell) => {
                    const cat = getFcrCategory(cell.fcr);
                    let bgClass = "bg-slate-100 text-slate-400 border border-slate-200";
                    if (cat === "EXCELLENT") {
                      bgClass = "bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700";
                    } else if (cat === "NORMAL") {
                      bgClass = "bg-amber-400 text-slate-950 shadow-2xs hover:bg-amber-500";
                    } else if (cat === "NEEDS_ATTENTION") {
                      bgClass = "bg-rose-500 text-white shadow-2xs hover:bg-rose-600";
                    }

                    return (
                      <div
                        key={`${cell.batchId}-${cell.recordDate}`}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`relative group flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-[10px] sm:text-[11px] font-bold cursor-pointer transition-transform hover:scale-110 ${bgClass}`}
                      >
                        {cell.dayNumber ? `D${cell.dayNumber}` : "•"}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating or fixed Tooltip info bar */}
      {hoveredCell && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold text-emerald-950">
                {hoveredCell.farmName} — {hoveredCell.batchCode}
              </span>
              <span className="text-slate-500 ml-2">
                (Day {hoveredCell.dayNumber || "—"}, {new Date(hoveredCell.recordDate).toLocaleDateString()})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500">FCR: </span>
              <span
                className={`font-bold ${
                  hoveredCell.fcr == null
                    ? "text-slate-400 italic"
                    : hoveredCell.fcr < FCR_THRESHOLDS.EXCELLENT_MAX
                    ? "text-emerald-800"
                    : hoveredCell.fcr <= FCR_THRESHOLDS.NORMAL_MAX
                    ? "text-amber-800"
                    : "text-rose-700"
                }`}
              >
                {hoveredCell.fcr != null ? hoveredCell.fcr : "No FCR"}
              </span>
            </div>

            <div>
              <span className="text-slate-500">Avg Weight: </span>
              <span className="font-semibold text-slate-900">
                {hoveredCell.avgWeightG != null ? `${hoveredCell.avgWeightG} g` : "—"}
              </span>
            </div>

            <div>
              <span className="text-slate-500">Mortality: </span>
              <span className="font-semibold text-rose-700">
                {hoveredCell.mortality ?? 0} birds
              </span>
            </div>

            <div>
              <span className="text-slate-500">Feed Consumed: </span>
              <span className="font-semibold text-slate-900">
                {hoveredCell.feedConsumedKg ?? 0} kg
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
