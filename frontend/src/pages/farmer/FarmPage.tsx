import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMyFarmerProfile } from "@/lib/api/farmers";
import { getMyFarm, updateMyFarm, type FarmRequest } from "@/lib/api/farms";
import { getActiveBatch } from "@/lib/api/batches";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { useToast, ToastContainer } from "@/components/Toast";
import {
  MapPin,
  User,
  CheckCircle2,
  Package,
  Activity,
  History,
  FileSpreadsheet,
  Edit3,
  X,
  Building2,
} from "lucide-react";

export default function FarmerFarmPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, addToast } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<FarmRequest>({
    name: "",
    location: "",
    description: "",
  });
  const [formErrors, setFormErrors] = useState<{ name?: string }>({});

  const {
    data: farmerProfile,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useQuery({
    queryKey: ["farmerProfile"],
    queryFn: getMyFarmerProfile,
    retry: false,
  });

  const {
    data: farm,
    isLoading: isFarmLoading,
    isError: isFarmError,
  } = useQuery({
    queryKey: ["myFarm"],
    queryFn: getMyFarm,
    retry: false,
  });

  const { data: activeBatch, isLoading: isBatchLoading } = useQuery({
    queryKey: ["activeBatch"],
    queryFn: getActiveBatch,
  });

  const updateFarmMutation = useMutation({
    mutationFn: (data: FarmRequest) => updateMyFarm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myFarm"] });
      queryClient.invalidateQueries({ queryKey: ["farmerProfile"] });
      addToast("Farm Updated", "Farm facility details have been saved.", "success");
      setIsEditModalOpen(false);
    },
    onError: (err: unknown) => {
      const errMsg =
        (err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string; error?: string } } }).response?.data?.message ||
            (err as { response?: { data?: { message?: string; error?: string } } }).response?.data?.error
          : undefined) ||
        "Failed to update farm details. Please try again.";
      addToast("Update Error", errMsg, "error");
    },
  });

  const handleOpenEdit = () => {
    setFormData({
      name: farm?.name || farmerProfile?.farmName || "",
      location: farm?.location || farmerProfile?.farmLocation || "",
      description: farm?.description || farmerProfile?.farmDescription || "",
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleSaveFarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormErrors({ name: "Farm facility name is required." });
      return;
    }

    updateFarmMutation.mutate({
      name: formData.name.trim(),
      location: formData.location?.trim() || undefined,
      description: formData.description?.trim() || undefined,
    });
  };

  const isLoading = isProfileLoading || isFarmLoading || isBatchLoading;

  if (isLoading) {
    return (
      <AppLayout title="My Farm" breadcrumb={[{ label: "My Farm" }]}>
        <LoadingState message="Loading farm details..." />
      </AppLayout>
    );
  }

  // If farmer has no farm linked
  if ((isProfileError || isFarmError) && !farmerProfile?.farmId) {
    return (
      <AppLayout title="My Farm" breadcrumb={[{ label: "My Farm" }]}>
        <div className="p-6 md:p-8 max-w-4xl mx-auto">
          <EmptyState
            title="No Farm Linked to Account"
            description="You do not have a registered farm facility assigned to your profile yet. Please contact administration or register your farm to begin tracking batches."
            icon={<Building2 size={48} className="text-slate-400" />}
          />
        </div>
      </AppLayout>
    );
  }

  const farmName = farm?.name || farmerProfile?.farmName || "My Farm";
  const farmLocation = farm?.location || farmerProfile?.farmLocation || "Location not specified";
  const farmDescription = farm?.description || farmerProfile?.farmDescription || "No additional description added.";
  const farmId = farm?.id || farmerProfile?.farmId;
  const ownerName = farm?.ownerName || farmerProfile?.userName || "Farmer";
  const farmCreatedAt = farm?.createdAt || farmerProfile?.farmCreatedAt;

  // Batch Age calculation
  const getBatchAge = (startDate?: string | null) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <AppLayout
      title="My Farm Overview"
      breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "My Farm" }]}
    >
      <ToastContainer toasts={toasts} />

      <div className="space-y-8 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
        {/* Farm Hero Banner */}
        <div className="flex flex-col gap-5 rounded-3xl bg-gradient-to-r from-emerald-800 via-green-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                Registered Facility
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-emerald-100 ring-1 ring-white/20">
                Facility #{farmId}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{farmName}</h2>
            <p className="flex items-center gap-1.5 text-xs sm:text-sm text-emerald-100/90">
              <MapPin size={15} className="text-emerald-400 shrink-0" />
              {farmLocation}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleOpenEdit}
              className="rounded-xl bg-white font-semibold text-emerald-900 shadow-md hover:bg-emerald-50 transition-all text-xs"
            >
              <Edit3 size={15} className="mr-2 text-emerald-700" />
              Edit Farm Details
            </Button>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="rounded-xl border-white/20 bg-white/10 font-semibold text-white hover:bg-white/20 text-xs"
            >
              Dashboard
            </Button>
          </div>
        </div>

        {/* 2-Column Grid: Farm Metadata & Owner Info */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Farm Facility Details Card */}
          <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Building2 size={18} />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Facility Information</h3>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={13} /> Active
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-500 font-medium">Facility ID</span>
                <span className="font-bold text-slate-900">#{farmId}</span>
              </div>

              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-500 font-medium">Farm Name</span>
                <span className="font-bold text-slate-900">{farmName}</span>
              </div>

              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-500 font-medium">Location</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-600" />
                  {farmLocation}
                </span>
              </div>

              {farmCreatedAt && (
                <div className="flex justify-between border-b border-slate-50 pb-2.5">
                  <span className="text-slate-500 font-medium">Establishment Date</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(farmCreatedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}

              <div>
                <span className="text-slate-500 font-medium block mb-1">Facility Description & Notes</span>
                <div className="rounded-xl bg-slate-50 p-3 text-slate-700 border border-slate-100">
                  {farmDescription}
                </div>
              </div>
            </div>
          </Card>

          {/* Farmer / Owner Profile Card */}
          <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <User size={18} />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Assigned Farm Operator</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/farmer/profile")}
                className="text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Profile →
              </Button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-500 font-medium">Farmer Name</span>
                <span className="font-bold text-slate-900">{ownerName}</span>
              </div>

              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-500 font-medium">Email Address</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                  {farmerProfile?.userEmail || "—"}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-500 font-medium">Phone Contact</span>
                <span className="font-semibold text-slate-800">
                  {farmerProfile?.userPhone || "Not specified"}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-500 font-medium">Farmer ID</span>
                <span className="font-semibold text-slate-800">#{farmerProfile?.id || "—"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Membership Date</span>
                <span className="font-semibold text-slate-800">
                  {farmerProfile?.joinedDate
                    ? new Date(farmerProfile.joinedDate).toLocaleDateString()
                    : "Active"}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Current Batch Live Monitoring Card */}
        <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                  <Activity size={18} />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Current Active Flock Batch</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">Live operational data for birds currently in the shed</p>
            </div>

            <div className="flex items-center gap-2">
              {activeBatch ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                  {activeBatch.status} • Day {getBatchAge(activeBatch.startDate)}
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  NO ACTIVE BATCH
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/farmer/history")}
                className="text-xs rounded-xl"
              >
                <History size={14} className="mr-1.5 text-slate-600" />
                View History
              </Button>
            </div>
          </div>

          {activeBatch ? (
            <div className="space-y-5">
              {/* Metric Highlights Grid */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-slate-500 font-medium text-[11px] uppercase tracking-wider">
                    Batch Code
                  </span>
                  <p className="mt-1 text-base sm:text-lg font-black text-slate-900">{activeBatch.batchCode}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">ID #{activeBatch.id}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-slate-500 font-medium text-[11px] uppercase tracking-wider">
                    Initial Birds Placed
                  </span>
                  <p className="mt-1 text-base sm:text-lg font-black text-slate-900">
                    {activeBatch.initialBirds?.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Day-old chicks</p>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <span className="text-emerald-700 font-semibold text-[11px] uppercase tracking-wider">
                    Current / Live Birds
                  </span>
                  <p className="mt-1 text-base sm:text-lg font-black text-emerald-800">
                    {(farmerProfile?.remainingBirds ?? activeBatch.initialBirds)?.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-600">Active flock count</p>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                  <span className="text-amber-800 font-semibold text-[11px] uppercase tracking-wider">
                    Feed Stock
                  </span>
                  <p className="mt-1 text-base sm:text-lg font-black text-amber-900">
                    {farmerProfile?.feedStockKg ?? 0} kg
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-700">Available on farm</p>
                </div>
              </div>

              {/* Secondary Details */}
              <div className="grid gap-3 sm:grid-cols-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-500">Batch Start Date:</span>
                  <span className="ml-1.5 font-bold text-slate-900">
                    {activeBatch.startDate ? new Date(activeBatch.startDate).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Cumulative Mortality:</span>
                  <span className="ml-1.5 font-bold text-rose-700">
                    {farmerProfile?.totalMortality ?? 0} birds
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Flock Status:</span>
                  <span className="ml-1.5 font-bold text-emerald-700">
                    {activeBatch.status} (In Production)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={() => navigate("/farmer/daily-records")}
                  className="rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  <FileSpreadsheet size={15} className="mr-1.5" />
                  + Add Daily Record
                </Button>
                <Button
                  onClick={() => navigate("/farmer/feed")}
                  variant="outline"
                  className="rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Package size={15} className="mr-1.5 text-amber-600" />
                  Manage Feed Stock
                </Button>
                <Button
                  onClick={() => navigate("/farmer/end-batch")}
                  variant="outline"
                  className="rounded-xl border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  End Batch / Sales Workflow
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500 space-y-3">
              <p className="text-sm font-medium text-slate-700">No active batch is currently running on this farm.</p>
              <p>You can create a new batch to start recording daily mortality, feed intake, and weight gains.</p>
              <div>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Start New Batch on Dashboard
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Edit Farm Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsEditModalOpen(false)}
          />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-800 to-green-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-300" />
                <h3 className="text-lg font-bold text-white">Edit Farm Information</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveFarm}>
              <div className="p-6 space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Farm Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                      formErrors.name ? "border-rose-400 bg-rose-50/30" : "border-slate-300"
                    }`}
                    placeholder="e.g. Green Valley Farm"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-rose-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Farm Location / Address
                  </label>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="e.g. Sector 4, Rural District"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Description & Facility Notes
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                    placeholder="e.g. 10,000 broilers capacity, automatic feed distribution line."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateFarmMutation.isPending}
                  className="rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  {updateFarmMutation.isPending ? "Saving..." : "Save Farm Details"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
