import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllFarmers } from "@/lib/api/farmers";
import { AppLayout } from "@/components/AppLayout";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CEOFarmerDetailsModal } from "@/components/CEOFarmerDetailsModal";
import {
  Users,
  Search,
  Building2,
  MapPin,
  Mail,
  Eye,
} from "lucide-react";

export default function CEOFarmersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedFarmerId, setSelectedFarmerId] = useState<number | null>(null);

  const {
    data: farmers = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["allFarmers"],
    queryFn: getAllFarmers,
  });

  const filteredFarmers = useMemo(() => {
    return farmers.filter((farmer) => {
      const matchesSearch =
        farmer.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        farmer.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (farmer.farmName && farmer.farmName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (farmer.farmLocation && farmer.farmLocation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (farmer.activeBatchCode && farmer.activeBatchCode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && farmer.activeBatchStatus === "ACTIVE") ||
        (statusFilter === "INACTIVE" && !farmer.activeBatchStatus);

      return matchesSearch && matchesStatus;
    });
  }, [farmers, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <AppLayout title="Farmers Management" breadcrumb={[{ label: "Farmers" }]}>
        <LoadingState message="Loading registered farmers and flock operations..." />
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout title="Farmers Management" breadcrumb={[{ label: "Farmers" }]}>
        <ErrorState
          title="Failed to load farmers"
          message="Could not load farmers list. Please try again."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Farmer & Farm Directory"
      breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Farmers" }]}
    >
      <div className="space-y-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header Hero Section */}
        <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 p-6 sm:p-8 text-white shadow-xl md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                Network Management
              </span>
              <span className="text-xs text-emerald-200/80">Total Registered: {farmers.length}</span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">Farmers & Facilities</h2>
            <p className="mt-1 text-xs sm:text-sm text-emerald-100/80">
              Overview of all farmers, assigned facilities, live bird stocks, and historical performances.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3 text-center ring-1 ring-white/20">
              <p className="text-[11px] font-medium text-emerald-200">Active Batches</p>
              <p className="text-xl font-extrabold text-white">
                {farmers.filter((f) => f.activeBatchStatus === "ACTIVE").length}
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <Card className="rounded-2xl border-slate-200 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by farmer name, email, farm, location, or batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Flock Status:</span>
              {(["ALL", "ACTIVE", "INACTIVE"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    statusFilter === filter
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter === "ALL" ? "All Farmers" : filter === "ACTIVE" ? "Active Flock" : "Idle"}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Empty State */}
        {filteredFarmers.length === 0 ? (
          <EmptyState
            title="No farmers match your criteria"
            description="Try adjusting your search query or status filter to see results."
            icon={<Users size={48} className="text-slate-400" />}
          />
        ) : (
          <>
            {/* Desktop Table Layout */}
            <div className="hidden lg:block">
              <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-5 py-3.5">Farmer</th>
                        <th className="px-5 py-3.5">Contact</th>
                        <th className="px-5 py-3.5">Farm Facility</th>
                        <th className="px-5 py-3.5">Location</th>
                        <th className="px-5 py-3.5">Current Batch</th>
                        <th className="px-5 py-3.5 text-right">Initial Birds</th>
                        <th className="px-5 py-3.5 text-right">Live Birds</th>
                        <th className="px-5 py-3.5 text-center">Batch Status</th>
                        <th className="px-5 py-3.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredFarmers.map((farmer) => (
                        <tr
                          key={farmer.id}
                          onClick={() => setSelectedFarmerId(farmer.id)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          {/* Farmer */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 font-bold text-emerald-800 text-xs">
                                {farmer.userName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{farmer.userName}</p>
                                <span className="text-[10px] text-slate-400">ID #{farmer.id}</span>
                              </div>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="px-5 py-3.5 text-slate-600">
                            <div className="space-y-0.5">
                              <p className="truncate max-w-[150px] font-medium text-slate-700">{farmer.userEmail}</p>
                              <p className="text-[10px] text-slate-500">{farmer.userPhone || "No phone"}</p>
                            </div>
                          </td>

                          {/* Farm Facility */}
                          <td className="px-5 py-3.5">
                            <div>
                              <p className="font-bold text-slate-900">{farmer.farmName || "—"}</p>
                              {farmer.farmId && (
                                <span className="text-[10px] text-slate-400">Facility #{farmer.farmId}</span>
                              )}
                            </div>
                          </td>

                          {/* Location */}
                          <td className="px-5 py-3.5 text-slate-600">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[120px]">{farmer.farmLocation || "—"}</span>
                            </span>
                          </td>

                          {/* Current Batch */}
                          <td className="px-5 py-3.5">
                            {farmer.activeBatchCode ? (
                              <div>
                                <span className="font-bold text-emerald-950">{farmer.activeBatchCode}</span>
                                <p className="text-[10px] text-slate-500">
                                  Started: {farmer.activeBatchStartDate || "—"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No active batch</span>
                            )}
                          </td>

                          {/* Initial Birds */}
                          <td className="px-5 py-3.5 text-right font-medium text-slate-700">
                            {farmer.initialBirds ? farmer.initialBirds.toLocaleString() : "—"}
                          </td>

                          {/* Live Birds */}
                          <td className="px-5 py-3.5 text-right">
                            {farmer.remainingBirds !== undefined && farmer.remainingBirds !== null ? (
                              <span className="font-bold text-emerald-800">
                                {farmer.remainingBirds.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Batch Status */}
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

                          {/* Action Button */}
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
            </div>

            {/* Mobile / Tablet Responsive Cards Layout */}
            <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
              {filteredFarmers.map((farmer) => (
                <Card
                  key={farmer.id}
                  onClick={() => setSelectedFarmerId(farmer.id)}
                  className="rounded-2xl border-slate-200 p-5 shadow-sm space-y-4 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 font-black text-emerald-800 text-sm">
                        {farmer.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{farmer.userName}</h3>
                        <span className="text-xs text-slate-500">Farmer ID #{farmer.id}</span>
                      </div>
                    </div>

                    {farmer.activeBatchStatus === "ACTIVE" ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                        IDLE
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 border-y border-slate-100 py-3">
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{farmer.userEmail}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{farmer.farmName || "No farm linked"}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-emerald-600 shrink-0" />
                      <span>{farmer.farmLocation || "Location not provided"}</span>
                    </div>
                  </div>

                  {farmer.activeBatchCode ? (
                    <div className="rounded-xl bg-emerald-50/60 p-3 text-xs border border-emerald-100">
                      <div className="flex justify-between font-bold text-emerald-950">
                        <span>Batch: {farmer.activeBatchCode}</span>
                        <span>{farmer.remainingBirds?.toLocaleString()} birds</span>
                      </div>
                      <p className="text-[10px] text-emerald-700 mt-0.5">
                        Initial: {farmer.initialBirds?.toLocaleString()} • Started {farmer.activeBatchStartDate || "—"}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-2.5 text-center text-xs text-slate-400">
                      No active flock currently
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    <Eye size={13} className="mr-1.5" /> View Detailed Profile & History
                  </Button>
                </Card>
              ))}
            </div>
          </>
        )}
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
