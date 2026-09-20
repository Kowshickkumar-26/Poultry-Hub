import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { DashboardCard } from "@/components/DashboardCard";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { FcrHeatmap } from "@/components/charts/FcrHeatmap";
import { getCeoMultiFarmReport } from "@/lib/api/ceoReports";
import { getAllFarms } from "@/lib/api/farms";
import { exportReportToCsv, exportReportToPdf } from "@/lib/reportExportUtils";
import type { BatchStatus } from "@/types/batch";
import type { FarmComparisonItem } from "@/types/ceoReport";
import {
  Building2,
  Activity,
  Bird,
  AlertOctagon,
  Scale,
  DollarSign,
  Filter,
  RotateCcw,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  FileText,
  MapPin,
} from "lucide-react";

type SortField = "fcr" | "mortalityPct" | "avgWeight" | "feed" | "revenue" | "activeBatches" | "rank";
type SortOrder = "asc" | "desc";

export default function CEOReportsPage() {
  // Filter states
  const [selectedFarmId, setSelectedFarmId] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<BatchStatus | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Table search & sort states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("fcr");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Query all farms for the filter dropdown
  const { data: allFarms = [] } = useQuery({
    queryKey: ["allFarms"],
    queryFn: getAllFarms,
  });

  // Query CEO multi-farm report with filters
  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["ceoMultiFarmReport", selectedFarmId, selectedStatus, startDate, endDate],
    queryFn: () =>
      getCeoMultiFarmReport({
        farmId: selectedFarmId,
        batchStatus: selectedStatus,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const selectedFarmObj = allFarms.find((f) => f.id === selectedFarmId);

  const resetFilters = () => {
    setSelectedFarmId(undefined);
    setSelectedStatus(undefined);
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedFarmId !== undefined ||
    selectedStatus !== undefined ||
    startDate !== "" ||
    endDate !== "";

  // Handle farm ranking sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      // Default lower-is-better for FCR and mortality to ASC, others to DESC
      if (field === "fcr" || field === "mortalityPct") {
        setSortOrder("asc");
      } else {
        setSortOrder("desc");
      }
    }
  };

  // Filter and sort farm rankings
  const processedFarms = useMemo(() => {
    if (!report?.farmRankings) return [];

    let list = [...report.farmRankings];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.farmName.toLowerCase().includes(q) ||
          (f.farmLocation && f.farmLocation.toLowerCase().includes(q)) ||
          (f.farmerName && f.farmerName.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "fcr": {
          const fcrA = a.avgFcr ?? 999;
          const fcrB = b.avgFcr ?? 999;
          comparison = fcrA - fcrB;
          break;
        }
        case "mortalityPct": {
          comparison = a.mortalityPct - b.mortalityPct;
          break;
        }
        case "avgWeight": {
          const wA = a.avgWeightG ?? 0;
          const wB = b.avgWeightG ?? 0;
          comparison = wA - wB;
          break;
        }
        case "feed": {
          comparison = a.totalFeedConsumedKg - b.totalFeedConsumedKg;
          break;
        }
        case "revenue": {
          comparison = a.totalRevenue - b.totalRevenue;
          break;
        }
        case "activeBatches": {
          comparison = a.activeBatchesCount - b.activeBatchesCount;
          break;
        }
        default:
          comparison = 0;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return list;
  }, [report?.farmRankings, searchQuery, sortField, sortOrder]);

  const handleExportCsv = () => {
    if (!report) return;
    exportReportToCsv(report, {
      farmName: selectedFarmObj?.name,
      batchStatus: selectedStatus,
      startDate,
      endDate,
    });
  };

  const handleExportPdf = () => {
    if (!report) return;
    exportReportToPdf(report, {
      farmName: selectedFarmObj?.name,
      batchStatus: selectedStatus,
      startDate,
      endDate,
    });
  };

  return (
    <AppLayout title="Executive Multi-Farm Reports" breadcrumb={[{ label: "Reports" }]}>
      <div className="space-y-8 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header Title & Executive Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 sm:p-8 text-white shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                CEO Analytics Hub
              </span>
              {isFetching && (
                <span className="text-[11px] text-emerald-300 animate-pulse flex items-center gap-1">
                  • Syncing live records...
                </span>
              )}
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Multi-Farm Comparative Reports
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
              Cross-network flock performance, authoritative FCR benchmarks, mortality analysis, and financial yields.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isLoading || !report}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs h-9 px-3.5 backdrop-blur-xs shadow-xs"
            >
              <FileSpreadsheet size={15} className="mr-1.5 text-emerald-400" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={isLoading || !report}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 rounded-xl text-xs h-9 px-3.5 shadow-md"
            >
              <FileText size={15} className="mr-1.5" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs h-9 px-3"
              title="Refresh report data"
            >
              <RotateCcw size={14} className={isFetching ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {/* Global Multi-Farm Filter Bar */}
        <Card className="rounded-2xl border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Filter size={16} />
              </span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Report Filters
                </h4>
                <p className="text-[11px] text-slate-500">
                  Filter by farm facility, batch operational status, or date range
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Farm filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Farm Facility
                </label>
                <select
                  value={selectedFarmId ?? ""}
                  onChange={(e) =>
                    setSelectedFarmId(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">All Farms ({allFarms.length})</option>
                  {allFarms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} {farm.location ? `(${farm.location})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Batch Status
                </label>
                <select
                  value={selectedStatus ?? ""}
                  onChange={(e) =>
                    setSelectedStatus(
                      e.target.value ? (e.target.value as BatchStatus) : undefined
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">All Statuses (Active & Completed)</option>
                  <option value="ACTIVE">Active Batches Only</option>
                  <option value="COMPLETED">Completed Batches Only</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <RotateCcw size={12} className="mr-1" /> Reset Filters
              </Button>
            )}
          </div>
        </Card>

        {/* Loading / Error States */}
        {isLoading ? (
          <LoadingState message="Aggregating network data across farms..." />
        ) : isError ? (
          <ErrorState
            title="Failed to generate multi-farm report"
            message={
              error instanceof Error
                ? error.message
                : "Could not retrieve multi-farm records from the backend."
            }
          />
        ) : !report ? (
          <EmptyState
            title="No Report Data Available"
            description="No farm or batch records match the selected query."
            icon={<Building2 size={48} />}
          />
        ) : (
          <>
            {/* 1. Network Executive KPIs Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Network Executive KPI Summary
                </h3>
                <span className="text-xs text-slate-500">
                  {report.networkKpis.totalFarms} Farms Monitored • {report.networkKpis.totalBatches} Batches Total
                </span>
              </div>

              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                <DashboardCard
                  title="Farms Monitored"
                  value={report.networkKpis.totalFarms}
                  subtitle={`${report.networkKpis.totalActiveBatches} Active Batches`}
                  icon={<Building2 size={20} />}
                />

                <DashboardCard
                  title="Birds in Production"
                  value={report.networkKpis.totalRemainingBirds.toLocaleString()}
                  subtitle={`of ${report.networkKpis.totalInitialBirds.toLocaleString()} initial`}
                  icon={<Bird size={20} />}
                />

                <DashboardCard
                  title="Network Mortality"
                  value={`${report.networkKpis.totalMortality.toLocaleString()}`}
                  subtitle={`${report.networkKpis.networkMortalityPct}% loss rate`}
                  icon={<AlertOctagon size={20} />}
                />

                <DashboardCard
                  title="Network Avg FCR"
                  value={
                    report.networkKpis.averageFcr != null
                      ? String(report.networkKpis.averageFcr)
                      : "—"
                  }
                  subtitle={
                    report.networkKpis.averageFcr != null && report.networkKpis.averageFcr < 1.55
                      ? "Excellent conversion"
                      : "Target range"
                  }
                  icon={<Scale size={20} />}
                />

                <DashboardCard
                  title="Feed Consumed"
                  value={`${(report.networkKpis.totalFeedConsumedKg / 1000).toFixed(1)} MT`}
                  subtitle={`${report.networkKpis.totalFeedConsumedKg.toLocaleString()} kg total`}
                  icon={<Activity size={20} />}
                />

                <DashboardCard
                  title="Gross Revenue"
                  value={`$${report.networkKpis.totalRevenue.toLocaleString()}`}
                  subtitle="From completed sales"
                  icon={<DollarSign size={20} />}
                />
              </div>
            </div>

            {/* 2. Comparative Farm Performance Ranking Table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    Comparative Farm Performance Rankings
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click column headers to sort. Lower FCR and lower mortality indicate higher efficiency.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search farm or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {processedFarms.length === 0 ? (
                <EmptyState
                  title="No Farms Found"
                  description="No farm facility matches the current search or filter criteria."
                  icon={<Building2 size={36} />}
                />
              ) : (
                <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-sm bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-4 py-3.5 text-center w-12">Rank</th>
                          <th className="px-4 py-3.5">Farm Facility</th>
                          <th className="px-4 py-3.5">Farmer</th>
                          <th className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => handleSort("activeBatches")}
                              className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-emerald-700"
                            >
                              Batches (Act/Tot)
                              <ArrowUpDown size={12} />
                            </button>
                          </th>
                          <th className="px-4 py-3.5 text-right">Birds (Live/Init)</th>
                          <th className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleSort("mortalityPct")}
                              className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-emerald-700"
                              title="Lower mortality is better"
                            >
                              Mortality
                              {sortField === "mortalityPct" ? (
                                sortOrder === "asc" ? <ArrowDown size={12} className="text-emerald-600" /> : <ArrowUp size={12} className="text-emerald-600" />
                              ) : (
                                <ArrowUpDown size={12} />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleSort("avgWeight")}
                              className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-emerald-700"
                              title="Higher weight is better"
                            >
                              Avg Weight
                              {sortField === "avgWeight" ? (
                                sortOrder === "desc" ? <ArrowDown size={12} className="text-emerald-600" /> : <ArrowUp size={12} className="text-emerald-600" />
                              ) : (
                                <ArrowUpDown size={12} />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleSort("fcr")}
                              className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950"
                              title="Lower FCR is better"
                            >
                              Avg FCR
                              {sortField === "fcr" ? (
                                sortOrder === "asc" ? <ArrowDown size={12} className="text-emerald-600" /> : <ArrowUp size={12} className="text-emerald-600" />
                              ) : (
                                <ArrowUpDown size={12} />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleSort("feed")}
                              className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-emerald-700"
                            >
                              Feed Consumed
                              <ArrowUpDown size={12} />
                            </button>
                          </th>
                          <th className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleSort("revenue")}
                              className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-emerald-700"
                            >
                              Revenue
                              <ArrowUpDown size={12} />
                            </button>
                          </th>
                          <th className="px-4 py-3.5 text-center">Performance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {processedFarms.map((farm: FarmComparisonItem, index: number) => {
                          const isExcellent = farm.performanceStatus === "EXCELLENT";
                          const isGood = farm.performanceStatus === "GOOD";
                          const isNeedsAttn = farm.performanceStatus === "NEEDS_ATTENTION";

                          return (
                            <tr
                              key={farm.farmId}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="px-4 py-3.5 text-center font-bold">
                                <span
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                                    index === 0
                                      ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300 font-black"
                                      : index === 1
                                      ? "bg-slate-200 text-slate-800 font-bold"
                                      : index === 2
                                      ? "bg-orange-100 text-orange-800 font-bold"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {index + 1}
                                </span>
                              </td>

                              <td className="px-4 py-3.5">
                                <div>
                                  <p className="font-bold text-slate-900 text-xs">
                                    {farm.farmName}
                                  </p>
                                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                    <MapPin size={11} /> {farm.farmLocation || "—"}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 font-medium text-slate-700">
                                {farm.farmerName}
                              </td>

                              <td className="px-4 py-3.5 text-center font-semibold">
                                <span className="text-emerald-800 font-bold">
                                  {farm.activeBatchesCount}
                                </span>
                                <span className="text-slate-400"> / {farm.totalBatchesCount}</span>
                              </td>

                              <td className="px-4 py-3.5 text-right">
                                <span className="font-bold text-emerald-800">
                                  {farm.remainingBirds.toLocaleString()}
                                </span>
                                <span className="text-slate-400"> / {farm.totalBirds.toLocaleString()}</span>
                              </td>

                              <td className="px-4 py-3.5 text-right font-medium">
                                <span
                                  className={
                                    farm.mortalityPct > 5.0
                                      ? "text-rose-600 font-bold"
                                      : "text-slate-700"
                                  }
                                >
                                  {farm.totalMortality.toLocaleString()} ({farm.mortalityPct}%)
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-right font-medium text-slate-800">
                                {farm.avgWeightG != null ? `${farm.avgWeightG} g` : "—"}
                              </td>

                              <td className="px-4 py-3.5 text-right font-bold">
                                {farm.avgFcr != null ? (
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md ${
                                      farm.avgFcr < 1.5
                                        ? "bg-emerald-100 text-emerald-900"
                                        : farm.avgFcr <= 1.75
                                        ? "bg-amber-100 text-amber-900"
                                        : "bg-rose-100 text-rose-900"
                                    }`}
                                  >
                                    {farm.avgFcr}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic font-normal">—</span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                                {farm.totalFeedConsumedKg.toLocaleString()} kg
                              </td>

                              <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                                ${farm.totalRevenue.toLocaleString()}
                              </td>

                              <td className="px-4 py-3.5 text-center">
                                <span
                                  className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                    isExcellent
                                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                      : isGood
                                      ? "bg-teal-100 text-teal-900 border-teal-300"
                                      : isNeedsAttn
                                      ? "bg-rose-100 text-rose-900 border-rose-300"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                  title={farm.performanceNote}
                                >
                                  {farm.performanceStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>

            {/* 3. Network FCR Heatmap */}
            <FcrHeatmap
              cells={report.fcrHeatmap}
              batches={report.batchReports}
            />

            {/* 4. Detailed Batch Performance Records */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    Detailed Batch Performance Records
                  </h3>
                  <p className="text-xs text-slate-500">
                    Individual batch tracking records across all monitored farms.
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {report.batchReports.length} Batches Listed
                </span>
              </div>

              {report.batchReports.length === 0 ? (
                <Card className="p-6 text-center text-slate-400 rounded-2xl border-slate-200">
                  No batch records found matching the criteria.
                </Card>
              ) : (
                <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-sm bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-4 py-3.5">Batch Code</th>
                          <th className="px-4 py-3.5">Farm</th>
                          <th className="px-4 py-3.5">Farmer</th>
                          <th className="px-4 py-3.5 text-center">Status</th>
                          <th className="px-4 py-3.5">Timeline</th>
                          <th className="px-4 py-3.5 text-right">Birds (Live/Init)</th>
                          <th className="px-4 py-3.5 text-right">Mortality</th>
                          <th className="px-4 py-3.5 text-right">Latest Weight</th>
                          <th className="px-4 py-3.5 text-right">FCR</th>
                          <th className="px-4 py-3.5 text-right">Feed Consumed</th>
                          <th className="px-4 py-3.5 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {report.batchReports.map((b) => (
                          <tr key={b.batchId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3.5 font-bold text-slate-900">
                              {b.batchCode}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-slate-700">
                              {b.farmName}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600">
                              {b.farmerName}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <StatusBadge status={b.status} />
                            </td>
                            <td className="px-4 py-3.5 text-slate-600">
                              {b.startDate
                                ? new Date(b.startDate).toLocaleDateString()
                                : "—"}{" "}
                              {b.endDate ? `→ ${new Date(b.endDate).toLocaleDateString()}` : ""}
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium">
                              <span className="font-bold text-emerald-800">
                                {b.remainingBirds.toLocaleString()}
                              </span>
                              <span className="text-slate-400"> / {b.initialBirds.toLocaleString()}</span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium">
                              <span
                                className={
                                  b.mortalityPct > 5.0 ? "text-rose-600 font-bold" : "text-slate-700"
                                }
                              >
                                {b.totalMortality} ({b.mortalityPct}%)
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-slate-800">
                              {b.latestAvgWeightG != null ? `${b.latestAvgWeightG} g` : "—"}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold">
                              {b.latestFcr != null ? (
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                                    b.latestFcr < 1.5
                                      ? "bg-emerald-100 text-emerald-900"
                                      : b.latestFcr <= 1.75
                                      ? "bg-amber-100 text-amber-900"
                                      : "bg-rose-100 text-rose-900"
                                  }`}
                                >
                                  {b.latestFcr}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic font-normal">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                              {b.totalFeedConsumedKg.toLocaleString()} kg
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                              ${b.totalRevenue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
