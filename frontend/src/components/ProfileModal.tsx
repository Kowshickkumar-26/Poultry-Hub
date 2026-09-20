import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types/auth";
import { getCurrentUserProfile } from "@/lib/api/user";
import { getMyFarmerProfile, getAllFarmers } from "@/lib/api/farmers";
import { getAllFarms } from "@/lib/api/farms";
import { getActiveBatch, getBatchHistory, getActiveBatches, getCompletedBatches } from "@/lib/api/batches";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  Shield,
  MapPin,
  CheckCircle2,
  Users,
  LogOut,
  ExternalLink,
  Building2,
  Activity,
  History,
  X,
} from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"details" | "operations">("details");

  const isCEO = user?.role === Role.CEO;
  const isFarmer = user?.role === Role.FARMER;

  // Real backend user profile
  const { data: userProfile } = useQuery({
    queryKey: ["currentUserProfile"],
    queryFn: getCurrentUserProfile,
    enabled: isOpen,
    staleTime: 30000,
  });

  // Farmer specific queries
  const { data: farmerProfile } = useQuery({
    queryKey: ["farmerProfile"],
    queryFn: getMyFarmerProfile,
    enabled: isOpen && isFarmer,
    retry: false,
    staleTime: 30000,
  });

  const { data: activeBatch } = useQuery({
    queryKey: ["activeBatch"],
    queryFn: getActiveBatch,
    enabled: isOpen && isFarmer,
    staleTime: 30000,
  });

  const { data: batchHistory = [] } = useQuery({
    queryKey: ["batchHistory"],
    queryFn: getBatchHistory,
    enabled: isOpen && isFarmer,
    staleTime: 30000,
  });

  // CEO specific queries
  const { data: allFarmers = [] } = useQuery({
    queryKey: ["allFarmers"],
    queryFn: getAllFarmers,
    enabled: isOpen && isCEO,
    staleTime: 30000,
  });

  const { data: allFarms = [] } = useQuery({
    queryKey: ["allFarms"],
    queryFn: getAllFarms,
    enabled: isOpen && isCEO,
    staleTime: 30000,
  });

  const { data: activeBatches = [] } = useQuery({
    queryKey: ["activeBatches"],
    queryFn: getActiveBatches,
    enabled: isOpen && isCEO,
    staleTime: 30000,
  });

  const { data: completedBatches = [] } = useQuery({
    queryKey: ["completedBatches"],
    queryFn: getCompletedBatches,
    enabled: isOpen && isCEO,
    staleTime: 30000,
  });

  if (!isOpen) return null;

  const handleLogout = () => {
    onClose();
    logout();
    navigate("/login");
  };

  const navigateTo = (path: string) => {
    onClose();
    navigate(path);
  };

  const displayName = userProfile?.name || user?.name || "User";
  const displayEmail = userProfile?.email || user?.email || "No email available";
  const displayPhone = userProfile?.phone || farmerProfile?.userPhone || user?.phone || "Not provided";
  const displayRole = userProfile?.role || user?.role || Role.FARMER;

  // Calculate Farmer batch stats
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Profile Header Banner */}
        <div className="relative bg-gradient-to-r from-emerald-800 via-green-800 to-teal-900 px-6 py-6 text-white sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold text-white shadow-inner ring-2 ring-white/30 backdrop-blur-md">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight sm:text-2xl">
                  {displayName}
                </h3>
                <p className="text-xs text-emerald-100/90 sm:text-sm">
                  {displayEmail}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/40">
                    <Shield size={12} />
                    {displayRole}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-emerald-100 ring-1 ring-white/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    Active Account
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs inside header */}
          <div className="mt-6 flex border-b border-emerald-700/50">
            <button
              onClick={() => setActiveTab("details")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all sm:text-sm ${
                activeTab === "details"
                  ? "border-b-2 border-emerald-300 text-white"
                  : "text-emerald-200/70 hover:text-white"
              }`}
            >
              Account Details
            </button>
            <button
              onClick={() => setActiveTab("operations")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all sm:text-sm ${
                activeTab === "operations"
                  ? "border-b-2 border-emerald-300 text-white"
                  : "text-emerald-200/70 hover:text-white"
              }`}
            >
              {isCEO ? "Executive Operations" : "Farm & Batches"}
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="max-h-[60vh] overflow-y-auto p-6 sm:p-8 space-y-6">
          {activeTab === "details" ? (
            <div className="space-y-6">
              {/* Account Details Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-50">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <User size={15} className="text-emerald-600" />
                    <span>Full Name</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{displayName}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-50">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Mail size={15} className="text-emerald-600" />
                    <span>Email Address</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{displayEmail}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-50">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Phone size={15} className="text-emerald-600" />
                    <span>Phone Number</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{displayPhone}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-50">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Shield size={15} className="text-emerald-600" />
                    <span>Role & Permissions</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {displayRole === Role.CEO ? "Chief Executive (Full System Access)" : "Poultry Farm Operator"}
                  </p>
                </div>
              </div>

              {/* Specific info card depending on role */}
              {isFarmer && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {farmerProfile?.farmName || "Primary Farm"}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {farmerProfile?.farmLocation ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} className="text-emerald-600" />
                              {farmerProfile.farmLocation}
                            </span>
                          ) : (
                            "Farm location on record"
                          )}
                        </p>
                      </div>
                    </div>
                    {farmerProfile?.joinedDate && (
                      <span className="text-xs font-medium text-slate-500">
                        Joined: {new Date(farmerProfile.joinedDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isCEO && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Executive Scope</h4>
                      <p className="text-xs text-slate-600">
                        Authorized to monitor and manage all poultry operations, farmers, farms, and batch reports across the network.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Operations Tab */
            <div className="space-y-6">
              {isFarmer ? (
                <>
                  {/* Farmer Stats Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                      <p className="text-xs font-medium text-slate-500">Active Batch</p>
                      <p className="mt-1 text-xl font-bold text-emerald-700">
                        {activeBatch ? activeBatch.batchCode : "None"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                      <p className="text-xs font-medium text-slate-500">Completed Batches</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">{completedBatchesCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center col-span-2 sm:col-span-1">
                      <p className="text-xs font-medium text-slate-500">Total Batches</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">{totalBatchesCount}</p>
                    </div>
                  </div>

                  {/* Active Batch Summary */}
                  {activeBatch ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                            Current Active Flock
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-700">
                          Day {getBatchAge(activeBatch.startDate)}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
                        <div>
                          <span className="text-slate-500">Batch Code</span>
                          <p className="font-bold text-slate-900">{activeBatch.batchCode}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Initial Birds</span>
                          <p className="font-bold text-slate-900">{activeBatch.initialBirds?.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Start Date</span>
                          <p className="font-bold text-slate-900">
                            {activeBatch.startDate ? new Date(activeBatch.startDate).toLocaleDateString() : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                      No active batch in progress. You can start a new batch from the dashboard.
                    </div>
                  )}

                  {/* Quick Shortcuts */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Navigation</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateTo("/farmer/farm")}
                        className="justify-start text-xs rounded-xl text-slate-700"
                      >
                        <Building2 size={14} className="mr-2 text-emerald-600" />
                        Farm Overview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateTo("/farmer/history")}
                        className="justify-start text-xs rounded-xl text-slate-700"
                      >
                        <History size={14} className="mr-2 text-blue-600" />
                        Batch History
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* CEO Operations */
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 mb-1">
                        <Users size={16} />
                      </div>
                      <p className="text-xs font-medium text-slate-500">Total Farmers</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{allFarmers.length}</p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 mb-1">
                        <Building2 size={16} />
                      </div>
                      <p className="text-xs font-medium text-slate-500">Total Farms</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{allFarms.length}</p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700 mb-1">
                        <Activity size={16} />
                      </div>
                      <p className="text-xs font-medium text-slate-500">Active Batches</p>
                      <p className="mt-1 text-lg font-bold text-emerald-700">{activeBatches.length}</p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 mb-1">
                        <CheckCircle2 size={16} />
                      </div>
                      <p className="text-xs font-medium text-slate-500">Completed</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{completedBatches.length}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Navigation</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateTo("/ceo/farmers")}
                        className="justify-start text-xs rounded-xl text-slate-700"
                      >
                        <Users size={14} className="mr-2 text-emerald-600" />
                        Manage Farmers
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateTo("/ceo/active-batches")}
                        className="justify-start text-xs rounded-xl text-slate-700"
                      >
                        <Activity size={14} className="mr-2 text-teal-600" />
                        Active Batches
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/90 px-6 py-4 sm:px-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateTo(isCEO ? "/ceo/profile" : "/farmer/profile")}
            className="text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <ExternalLink size={14} className="mr-1.5" />
            Open Dedicated Profile Page
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
              Close
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="rounded-xl bg-rose-600 text-xs text-white hover:bg-rose-700"
            >
              <LogOut size={14} className="mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
