import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getCurrentUserProfile } from "@/lib/api/user";
import { getAllFarmers } from "@/lib/api/farmers";
import { getAllFarms } from "@/lib/api/farms";
import { getActiveBatches, getCompletedBatches } from "@/lib/api/batches";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  User,
  Shield,
  Building2,
  Users,
  Activity,
  CheckCircle2,
  Layers,
  LogOut,
  BarChart3,
  Bot,
} from "lucide-react";

export default function CEOProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: userProfile, isLoading: isUserLoading, isError: isUserError } = useQuery({
    queryKey: ["currentUserProfile"],
    queryFn: getCurrentUserProfile,
  });

  const { data: farmers = [], isLoading: isFarmersLoading } = useQuery({
    queryKey: ["allFarmers"],
    queryFn: getAllFarmers,
  });

  const { data: farms = [], isLoading: isFarmsLoading } = useQuery({
    queryKey: ["allFarms"],
    queryFn: getAllFarms,
  });

  const { data: activeBatches = [], isLoading: isActiveBatchesLoading } = useQuery({
    queryKey: ["activeBatches"],
    queryFn: getActiveBatches,
  });

  const { data: completedBatches = [], isLoading: isCompletedBatchesLoading } = useQuery({
    queryKey: ["completedBatches"],
    queryFn: getCompletedBatches,
  });

  const isLoading = isUserLoading || isFarmersLoading || isFarmsLoading || isActiveBatchesLoading || isCompletedBatchesLoading;

  if (isLoading) {
    return (
      <AppLayout title="CEO Profile" breadcrumb={[{ label: "Profile" }]}>
        <LoadingState message="Loading executive profile and live statistics..." />
      </AppLayout>
    );
  }

  if (isUserError) {
    return (
      <AppLayout title="CEO Profile" breadcrumb={[{ label: "Profile" }]}>
        <ErrorState
          title="Failed to load profile"
          message="Could not retrieve your user details. Please try again."
        />
      </AppLayout>
    );
  }

  const displayName = userProfile?.name || user?.name || "Administrator";
  const displayEmail = userProfile?.email || user?.email || "—";
  const displayPhone = userProfile?.phone || user?.phone || "Not specified";
  const totalBatches = activeBatches.length + completedBatches.length;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <AppLayout title="Executive Profile" breadcrumb={[{ label: "Profile" }]}>
      <div className="space-y-8 p-6 md:p-8 max-w-6xl mx-auto">
        {/* Hero Header */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-3xl font-black text-white shadow-inner ring-4 ring-white/20 backdrop-blur-md">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="rounded-full bg-emerald-400/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                    CHIEF EXECUTIVE OFFICER
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-emerald-100 ring-1 ring-white/20">
                    Full System Privileges
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {displayName}
                </h1>
                <p className="text-sm text-emerald-100/80">{displayEmail}</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-3">
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

        {/* Live Operational Summary Metrics */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Live Enterprise Operations Summary</h2>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Live Database Data
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="rounded-2xl border-slate-200 p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Farmers</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Users size={18} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900">{farmers.length}</p>
              <p className="mt-1 text-xs text-slate-500">Registered farm operators</p>
            </Card>

            <Card className="rounded-2xl border-slate-200 p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Farms</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Building2 size={18} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900">{farms.length}</p>
              <p className="mt-1 text-xs text-slate-500">Managed poultry facilities</p>
            </Card>

            <Card className="rounded-2xl border-slate-200 p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Batches</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <Activity size={18} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black text-emerald-700">{activeBatches.length}</p>
              <p className="mt-1 text-xs text-slate-500">Currently in progress</p>
            </Card>

            <Card className="rounded-2xl border-slate-200 p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900">{completedBatches.length}</p>
              <p className="mt-1 text-xs text-slate-500">Closed flock batches</p>
            </Card>

            <Card className="rounded-2xl border-slate-200 p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Batches</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <Layers size={18} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900">{totalBatches}</p>
              <p className="mt-1 text-xs text-slate-500">All-time recorded flocks</p>
            </Card>
          </div>
        </div>

        {/* 2-Column Section */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Executive Details Card */}
          <Card className="rounded-2xl border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <User size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Account Profile</h3>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-500">Full Name</p>
                <p className="font-semibold text-slate-900 mt-0.5">{displayName}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Email Address</p>
                <p className="font-semibold text-slate-900 mt-0.5 truncate">{displayEmail}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Phone Number</p>
                <p className="font-semibold text-slate-900 mt-0.5">{displayPhone}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Security Role</p>
                <p className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                  <Shield size={14} />
                  Chief Executive Officer (CEO)
                </p>
              </div>

              {userProfile?.createdAt && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Account Created</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {new Date(userProfile.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Active Batches Highlight */}
          <Card className="rounded-2xl border-slate-200 p-6 shadow-sm space-y-5 md:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                  <Activity size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Active Batches Overview</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/ceo/active-batches")}
                className="text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                View All ({activeBatches.length}) →
              </Button>
            </div>

            {activeBatches.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No active batches running across any farm at this moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-3">Batch Code</th>
                      <th className="py-2.5 px-3">Farmer</th>
                      <th className="py-2.5 px-3">Farm</th>
                      <th className="py-2.5 px-3">Birds</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeBatches.slice(0, 5).map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{batch.batchCode}</td>
                        <td className="py-2.5 px-3 text-slate-700">{batch.farmerName}</td>
                        <td className="py-2.5 px-3 text-slate-700">{batch.farmName}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{batch.initialBirds?.toLocaleString()}</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={batch.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Quick Management Shortcuts */}
        <Card className="rounded-2xl border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4">
            Executive Controls & Navigation
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl border-slate-200 p-4 h-auto flex flex-col items-center gap-2 hover:border-emerald-500 hover:bg-emerald-50/50"
            >
              <Activity className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-800">CEO Dashboard</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/ceo/farmers")}
              className="rounded-xl border-slate-200 p-4 h-auto flex flex-col items-center gap-2 hover:border-emerald-500 hover:bg-emerald-50/50"
            >
              <Users className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-800">Farmers ({farmers.length})</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/ceo/farms")}
              className="rounded-xl border-slate-200 p-4 h-auto flex flex-col items-center gap-2 hover:border-blue-500 hover:bg-blue-50/50"
            >
              <Building2 className="h-5 w-5 text-blue-600" />
              <span className="text-xs font-semibold text-slate-800">Farms ({farms.length})</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/ceo/reports")}
              className="rounded-xl border-slate-200 p-4 h-auto flex flex-col items-center gap-2 hover:border-amber-500 hover:bg-amber-50/50"
            >
              <BarChart3 className="h-5 w-5 text-amber-600" />
              <span className="text-xs font-semibold text-slate-800">Reports</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/ceo/ai-assistant")}
              className="rounded-xl border-slate-200 p-4 h-auto flex flex-col items-center gap-2 hover:border-purple-500 hover:bg-purple-50/50"
            >
              <Bot className="h-5 w-5 text-purple-600" />
              <span className="text-xs font-semibold text-slate-800">AI Assistant</span>
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
