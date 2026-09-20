import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getActiveBatches, getCompletedBatches } from "@/lib/api/batches";
import { getAllFarmers } from "@/lib/api/farmers";
import { getAllFarms } from "@/lib/api/farms";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { DashboardCard } from "@/components/DashboardCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { CEOFarmerDetailsModal } from "@/components/CEOFarmerDetailsModal";
import type { BatchResponse } from "@/types/batch";
import type { FarmerResponse } from "@/types/farmer";
import {
  Users,
  MapPin,
  CheckCircle2,
  Activity,
  Building2,
  ChevronRight,
  Eye,
  Bird,
} from "lucide-react";

export default function CEODashboard() {
  const navigate = useNavigate();
  const [selectedFarmerId, setSelectedFarmerId] = useState<number | null>(null);

  const {
    data: activeBatches = [],
    isLoading: isActiveBatchesLoading,
    isError: isActiveBatchesError,
  } = useQuery({
    queryKey: ["activeBatches"],
    queryFn: getActiveBatches,
  });

  const {
    data: completedBatches = [],
    isLoading: isCompletedBatchesLoading,
  } = useQuery({
    queryKey: ["completedBatches"],
    queryFn: getCompletedBatches,
  });

  const {
    data: farmers = [],
    isLoading: isFarmersLoading,
  } = useQuery({
    queryKey: ["allFarmers"],
    queryFn: getAllFarmers,
  });

  const {
    data: farms = [],
    isLoading: isFarmsLoading,
  } = useQuery({
    queryKey: ["allFarms"],
    queryFn: getAllFarms,
  });

  if (isActiveBatchesError) {
    return (
      <AppLayout title="CEO Dashboard" breadcrumb={[{ label: "Dashboard" }]}>
        <ErrorState
          title="Failed to load dashboard"
          message="Could not load dashboard data. Please try again."
        />
      </AppLayout>
    );
  }

  const isLoading = isFarmersLoading || isFarmsLoading || isActiveBatchesLoading || isCompletedBatchesLoading;

  // Calculate Total Birds in Active Batches
  const totalBirdsInActiveBatches = activeBatches.reduce(
    (sum, b) => sum + (b.initialBirds || 0),
    0
  );

  return (
    <AppLayout title="CEO Dashboard" breadcrumb={[{ label: "Dashboard" }]}>
      <div className="space-y-8 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 sm:p-8 text-white shadow-xl">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
              Executive Overview
            </span>
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome back, Chief Executive
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-emerald-100/80">
            Real-time poultry farm network monitoring, active flock analytics, and batch records.
          </p>
        </div>

        {/* 5 Summary Cards Grid */}
        {isLoading ? (
          <LoadingState message="Loading statistics..." />
        ) : (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <DashboardCard
              title="Total Farmers"
              value={farmers.length}
              icon={<Users size={22} />}
            />
            <DashboardCard
              title="Total Farms"
              value={farms.length}
              icon={<Building2 size={22} />}
            />
            <DashboardCard
              title="Active Batches"
              value={activeBatches.length}
              icon={<Activity size={22} />}
            />
            <DashboardCard
              title="Completed Batches"
              value={completedBatches.length}
              icon={<CheckCircle2 size={22} />}
            />
            <div className="col-span-2 lg:col-span-1 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-xs font-bold uppercase tracking-wider">Birds in Production</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-200/80 text-emerald-900">
                  <Bird size={20} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-emerald-950">
                {totalBirdsInActiveBatches.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] font-medium text-emerald-700">In Active Batches</p>
            </div>
          </div>
        )}

        {/* Farmer / Farm Network Overview Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Farmer & Farm Network Overview</h3>
              <p className="text-xs text-slate-500">
                Click any farmer row to view complete profile, farm facilities, and historical flock data.
              </p>
            </div>
            <button
              onClick={() => navigate("/ceo/farmers")}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
            >
              View Full Directory <ChevronRight size={14} />
            </button>
          </div>

          {farmers.length === 0 ? (
            <EmptyState
              title="No registered farmers"
              description="No farmers have been registered in the system yet."
              icon={<Users size={48} />}
            />
          ) : (
            <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Farmer</th>
                      <th className="px-5 py-3.5">Farm Facility</th>
                      <th className="px-5 py-3.5">Location</th>
                      <th className="px-5 py-3.5">Current Batch</th>
                      <th className="px-5 py-3.5 text-right">Birds (Live / Initial)</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {farmers.slice(0, 8).map((farmer: FarmerResponse) => (
                      <tr
                        key={farmer.id}
                        onClick={() => setSelectedFarmerId(farmer.id)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 font-bold text-emerald-800 text-xs">
                              {farmer.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{farmer.userName}</p>
                              <span className="text-[10px] text-slate-400">{farmer.userEmail}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 font-semibold text-slate-900">
                          {farmer.farmName || "—"}
                        </td>

                        <td className="px-5 py-3.5 text-slate-600">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[130px]">{farmer.farmLocation || "—"}</span>
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          {farmer.activeBatchCode ? (
                            <span className="font-bold text-emerald-950">{farmer.activeBatchCode}</span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right font-medium text-slate-800">
                          {farmer.remainingBirds !== undefined && farmer.remainingBirds !== null ? (
                            <span>
                              <span className="font-bold text-emerald-800">{farmer.remainingBirds.toLocaleString()}</span>
                              <span className="text-slate-400"> / {farmer.initialBirds?.toLocaleString()}</span>
                            </span>
                          ) : farmer.initialBirds ? (
                            <span>{farmer.initialBirds.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          {farmer.activeBatchStatus === "ACTIVE" ? (
                            <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                              IDLE
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setSelectedFarmerId(farmer.id);
                            }}
                            className="rounded-xl text-[11px] h-7 px-2.5 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300"
                          >
                            <Eye size={12} className="mr-1" /> View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Active Batches Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Active Batches Live Feed</h3>
            <button
              onClick={() => navigate("/ceo/active-batches")}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
            >
              View All Batches <ChevronRight size={14} />
            </button>
          </div>

          {activeBatches.length === 0 ? (
            <EmptyState
              title="No active batches"
              description="There are no active batches at the moment."
              icon={<CheckCircle2 size={48} />}
            />
          ) : (
            <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Batch Code</th>
                      <th className="px-5 py-3.5">Farmer</th>
                      <th className="px-5 py-3.5">Farm Facility</th>
                      <th className="px-5 py-3.5">Start Date</th>
                      <th className="px-5 py-3.5 text-right">Initial Birds</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {activeBatches.map((batch: BatchResponse) => (
                      <tr key={batch.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-3.5 font-bold text-slate-900">{batch.batchCode}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-700">{batch.farmerName}</td>
                        <td className="px-5 py-3.5 text-slate-700">{batch.farmName}</td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {batch.startDate
                            ? new Date(batch.startDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-emerald-800">
                          {batch.initialBirds?.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <StatusBadge status={batch.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* CEO Detailed Farmer Modal */}
      <CEOFarmerDetailsModal
        farmerId={selectedFarmerId}
        isOpen={!!selectedFarmerId}
        onClose={() => setSelectedFarmerId(null)}
      />
    </AppLayout>
  );
}
