import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getCurrentUserProfile } from "@/lib/api/user";
import { getMyFarmerProfile, updateMyFarmerProfile } from "@/lib/api/farmers";
import { getActiveBatch, getBatchHistory } from "@/lib/api/batches";
import type { FarmerProfileUpdateRequest } from "@/types/farmer";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { useToast, ToastContainer } from "@/components/Toast";
import {
  User,
  MapPin,
  Building2,
  Activity,
  LogOut,
  Layers,
  FileSpreadsheet,
  Edit3,
  CheckCircle2,
  Lock,
  Calendar,
  Package,
  X,
  Save,
} from "lucide-react";

export default function FarmerProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, addToast } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState<FarmerProfileUpdateRequest>({
    name: "",
    phone: "",
    farmName: "",
    farmLocation: "",
    farmDescription: "",
  });

  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone?: string;
    farmName?: string;
  }>({});

  const {
    data: userProfile,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useQuery({
    queryKey: ["currentUserProfile"],
    queryFn: getCurrentUserProfile,
  });

  const {
    data: farmerProfile,
    isLoading: isFarmerLoading,
    isError: isFarmerError,
  } = useQuery({
    queryKey: ["farmerProfile"],
    queryFn: getMyFarmerProfile,
    retry: false,
  });

  const { data: activeBatch, isLoading: isBatchLoading } = useQuery({
    queryKey: ["activeBatch"],
    queryFn: getActiveBatch,
  });

  const { data: batchHistory = [] } = useQuery({
    queryKey: ["batchHistory"],
    queryFn: getBatchHistory,
  });

  // Populate form state when profile data arrives
  useEffect(() => {
    if (farmerProfile || userProfile) {
      setFormData({
        name: userProfile?.name || farmerProfile?.userName || user?.name || "",
        phone: userProfile?.phone || farmerProfile?.userPhone || user?.phone || "",
        farmName: farmerProfile?.farmName || "",
        farmLocation: farmerProfile?.farmLocation || "",
        farmDescription: farmerProfile?.farmDescription || "",
      });
    }
  }, [farmerProfile, userProfile, user]);

  // Mutation to update profile
  const updateMutation = useMutation({
    mutationFn: (data: FarmerProfileUpdateRequest) => updateMyFarmerProfile(data),
    onSuccess: (updatedFarmer) => {
      // Invalidate queries so all views refresh immediately
      queryClient.invalidateQueries({ queryKey: ["farmerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["farm"] });

      // Update AuthContext session immediately
      updateUser({
        name: updatedFarmer.userName,
        phone: updatedFarmer.userPhone,
      });

      addToast("Profile Updated", "Your personal and farm details were successfully updated.", "success");
      setIsEditModalOpen(false);
      setFormErrors({});
    },
    onError: (err: any) => {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to update profile. Please review the inputs and try again.";
      addToast("Update Failed", errMsg, "error");
    },
  });

  const validateForm = (): boolean => {
    const errors: { name?: string; phone?: string; farmName?: string } = {};

    if (!formData.name.trim()) {
      errors.name = "Full name is required.";
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[+0-9\s\-()]{7,20}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errors.phone = "Please enter a valid phone number (7–20 characters).";
      }
    }

    if (!formData.farmName.trim()) {
      errors.farmName = "Farm facility name is required.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    updateMutation.mutate({
      name: formData.name.trim(),
      phone: formData.phone?.trim() || undefined,
      farmName: formData.farmName.trim(),
      farmLocation: formData.farmLocation?.trim() || undefined,
      farmDescription: formData.farmDescription?.trim() || undefined,
    });
  };

  const handleOpenEdit = () => {
    setFormData({
      name: userProfile?.name || farmerProfile?.userName || user?.name || "",
      phone: userProfile?.phone || farmerProfile?.userPhone || user?.phone || "",
      farmName: farmerProfile?.farmName || "",
      farmLocation: farmerProfile?.farmLocation || "",
      farmDescription: farmerProfile?.farmDescription || "",
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const isLoading = isUserLoading || isFarmerLoading || isBatchLoading;

  if (isLoading) {
    return (
      <AppLayout title="Profile" breadcrumb={[{ label: "Profile" }]}>
        <LoadingState message="Loading your farmer profile..." />
      </AppLayout>
    );
  }

  if (isUserError && isFarmerError) {
    return (
      <AppLayout title="Profile" breadcrumb={[{ label: "Profile" }]}>
        <ErrorState
          title="Could not load profile"
          message="Failed to load your profile details. Please try again or refresh the page."
        />
      </AppLayout>
    );
  }

  const displayName = userProfile?.name || farmerProfile?.userName || user?.name || "Farmer";
  const displayEmail = userProfile?.email || farmerProfile?.userEmail || user?.email || "—";
  const displayPhone = farmerProfile?.userPhone || userProfile?.phone || user?.phone || "Not specified";
  const completedBatchesCount = batchHistory.length;
  const totalBatchesCount = (activeBatch ? 1 : 0) + completedBatchesCount;

  // Batch Age calculation
  const getBatchAge = (startDate?: string | null) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <AppLayout title="Farmer Profile" breadcrumb={[{ label: "Profile" }]}>
      <ToastContainer toasts={toasts} />

      <div className="space-y-6 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
        {/* Profile Hero Header */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-green-800 to-teal-900 p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-3xl font-black text-white shadow-inner ring-4 ring-white/20 backdrop-blur-md">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="rounded-full bg-emerald-400/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                    FARMER
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-emerald-100 ring-1 ring-white/20">
                    Farmer ID #{farmerProfile?.id || "—"}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-emerald-100 ring-1 ring-white/20">
                    User #{userProfile?.id || user?.userId || farmerProfile?.userId}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {displayName}
                </h1>
                <p className="text-sm text-emerald-100/80">{displayEmail}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
              <Button
                onClick={handleOpenEdit}
                className="rounded-xl bg-white font-semibold text-emerald-900 shadow-md hover:bg-emerald-50 transition-all"
              >
                <Edit3 size={16} className="mr-2 text-emerald-700" />
                Edit Profile
              </Button>

              <Button
                onClick={handleLogout}
                variant="destructive"
                className="rounded-xl bg-rose-600 font-semibold text-white shadow-md hover:bg-rose-700 transition-all"
              >
                <LogOut size={16} className="mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* 3-Column Grid for Information */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Personal Information Card */}
          <Card className="rounded-2xl border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <User size={18} />
                </div>
                <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-500">Full Name</p>
                <p className="font-semibold text-slate-900 mt-0.5">{displayName}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Email Address (Immutable)</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="font-semibold text-slate-900 truncate">{displayEmail}</p>
                  <span title="Security locked field">
                    <Lock size={12} className="text-slate-400 shrink-0" />
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Mobile / Phone Number</p>
                <p className="font-semibold text-slate-900 mt-0.5">{displayPhone}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <p className="text-xs font-medium text-slate-500">Farmer ID</p>
                  <p className="font-semibold text-emerald-800 mt-0.5">#{farmerProfile?.id || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">User Account ID</p>
                  <p className="font-semibold text-slate-700 mt-0.5">#{farmerProfile?.userId || user?.userId || "—"}</p>
                </div>
              </div>

              {farmerProfile?.joinedDate && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Registration Date</p>
                  <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    {new Date(farmerProfile.joinedDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Farm Information Card */}
          <Card className="rounded-2xl border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Building2 size={18} />
                </div>
                <h2 className="text-base font-bold text-slate-900">Farm Information</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/farmer/farm")}
                className="text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Farm View →
              </Button>
            </div>

            {farmerProfile?.farmId ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-slate-500">Farm Name</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{farmerProfile.farmName}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">Location</p>
                  <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-600 shrink-0" />
                    {farmerProfile.farmLocation || "Location not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">Farm Details & Description</p>
                  <p className="text-xs text-slate-700 mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 min-h-[44px]">
                    {farmerProfile.farmDescription || "No detailed facility notes added yet."}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400">Farm Reference</span>
                    <p className="font-bold text-slate-800">ID #{farmerProfile.farmId}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 size={13} /> Active
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
                No farm record linked to this account yet.
              </div>
            )}
          </Card>

          {/* Batch Performance & Live Stats Card */}
          <Card className="rounded-2xl border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                  <Layers size={18} />
                </div>
                <h2 className="text-base font-bold text-slate-900">Batches Summary</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/farmer/history")}
                className="text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                History →
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-center">
                <p className="text-xs font-medium text-slate-500">Total Batches</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{totalBatchesCount}</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-center">
                <p className="text-xs font-medium text-slate-500">Completed</p>
                <p className="mt-1 text-2xl font-black text-emerald-700">{completedBatchesCount}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Status</p>
              {activeBatch ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900">{activeBatch.batchCode}</span>
                    <span className="rounded-full bg-emerald-200 px-2 py-0.5 font-bold text-emerald-800">
                      Day {getBatchAge(activeBatch.startDate)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800">
                    <div>
                      <span className="text-emerald-600">Initial:</span> {activeBatch.initialBirds?.toLocaleString()} birds
                    </div>
                    {farmerProfile?.remainingBirds !== undefined && (
                      <div>
                        <span className="text-emerald-600">Live Birds:</span> {farmerProfile.remainingBirds?.toLocaleString()}
                      </div>
                    )}
                    {farmerProfile?.totalMortality !== undefined && (
                      <div>
                        <span className="text-emerald-600">Mortality:</span> {farmerProfile.totalMortality}
                      </div>
                    )}
                    {farmerProfile?.feedStockKg !== undefined && (
                      <div>
                        <span className="text-emerald-600">Feed Stock:</span> {farmerProfile.feedStockKg} kg
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  No active batch running currently.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Navigation Panel */}
        <Card className="rounded-2xl border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4">
            Farmer Dashboard Quick Links
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl border-slate-200 p-4 h-auto flex flex-col items-center gap-2 hover:border-emerald-500 hover:bg-emerald-50/50"
            >
              <Activity className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-800">Dashboard</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/farmer/daily-records")}
              className="rounded-xl border-slate-200 p-4 h-auto flex flex-col items-center gap-2 hover:border-emerald-500 hover:bg-emerald-50/50"
            >
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-800">Daily Records</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/farmer/farm")}
              className="rounded-xl border-slate-200 p-4 h-auto flex flex-col items-center gap-2 hover:border-blue-500 hover:bg-blue-50/50"
            >
              <Building2 className="h-5 w-5 text-blue-600" />
              <span className="text-xs font-semibold text-slate-800">My Farm</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/farmer/feed")}
              className="rounded-xl border-slate-200 p-4 h-auto flex flex-col items-center gap-2 hover:border-amber-500 hover:bg-amber-50/50"
            >
              <Package className="h-5 w-5 text-amber-600" />
              <span className="text-xs font-semibold text-slate-800">Feed Stock</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsEditModalOpen(false)}
          />

          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-800 to-green-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <Edit3 className="h-5 w-5 text-emerald-300" />
                <h3 className="text-lg font-bold text-white">Edit Profile & Farm Details</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProfile}>
              <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5 text-sm">
                {/* Personal Information Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                    <User size={14} /> Personal Details
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                        formErrors.name ? "border-rose-400 bg-rose-50/30" : "border-slate-300"
                      }`}
                      placeholder="e.g. John Doe"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-xs text-rose-600">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Mobile / Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                        formErrors.phone ? "border-rose-400 bg-rose-50/30" : "border-slate-300"
                      }`}
                      placeholder="e.g. +1 555-0199 or 9876543210"
                    />
                    {formErrors.phone && (
                      <p className="mt-1 text-xs text-rose-600">{formErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500">
                      Email Address (System Protected)
                    </label>
                    <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">
                      <span>{displayEmail}</span>
                      <Lock size={14} className="text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Farm Facility Section */}
                <div className="space-y-3 pt-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                    <Building2 size={14} /> Farm Facility Details
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Farm Facility Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.farmName}
                      onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                      className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                        formErrors.farmName ? "border-rose-400 bg-rose-50/30" : "border-slate-300"
                      }`}
                      placeholder="e.g. Green Meadow Poultry Farm"
                    />
                    {formErrors.farmName && (
                      <p className="mt-1 text-xs text-rose-600">{formErrors.farmName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Farm Location / Address
                    </label>
                    <input
                      type="text"
                      value={formData.farmLocation || ""}
                      onChange={(e) => setFormData({ ...formData, farmLocation: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="e.g. Sector 4, Rural District"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Farm Description / Facility Notes
                    </label>
                    <textarea
                      rows={3}
                      value={formData.farmDescription || ""}
                      onChange={(e) => setFormData({ ...formData, farmDescription: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                      placeholder="e.g. Fully automated ventilation, 10,000 bird capacity shed."
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
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
                  disabled={updateMutation.isPending}
                  className="rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  {updateMutation.isPending ? (
                    <span className="flex items-center gap-1.5">Saving changes...</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Save size={14} /> Save Profile Changes
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
