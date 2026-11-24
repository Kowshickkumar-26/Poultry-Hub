import { useState } from "react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMyFarmerProfile } from "@/lib/api/farmers";
import { getActiveBatch, createBatch, endBatch } from "@/lib/api/batches";
import { getDailyRecords } from "@/lib/api/dailyRecords";
import { getSales, getExpenses, getFeedStock, getRemarks, getVaccines } from "@/lib/api/batchModules";
import { AppLayout } from "@/components/AppLayout";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FarmerAIAssistantSection } from "@/components/FarmerAIAssistantSection";
import {
  createBatchSchema,
  type CreateBatchFormValues,
} from "@/lib/validation/batch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Layers,
  PlusCircle,
  TrendingUp,
  Activity,
  IndianRupee,
  Package,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  MessageSquare,
  StopCircle,
  Scale,
  Sparkles,
  Award,
  TrendingDown,
  Building2,
  Clock,
} from "lucide-react";
import {
  GrowthCurveChart,
  FcrTrajectoryChart,
  MortalityChart,
} from "@/components/charts";

export default function FarmerDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isEndBatchModalOpen, setIsEndBatchModalOpen] = useState(false);

  // 1. Load Farmer profile
  const {
    data: farmerProfile,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useQuery({
    queryKey: ["farmerProfile"],
    queryFn: getMyFarmerProfile,
    retry: false,
  });

  // 2. Load Active Batch
  const {
    data: activeBatch,
    isLoading: isBatchLoading,
  } = useQuery({
    queryKey: ["activeBatch"],
    queryFn: getActiveBatch,
    enabled: !!farmerProfile,
  });

  // 3. Load Active Batch Modules
  const { data: records = [], isLoading: isRecordsLoading } = useQuery({
    queryKey: ["dailyRecords", activeBatch?.id],
    queryFn: () => getDailyRecords(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales", activeBatch?.id],
    queryFn: () => getSales(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", activeBatch?.id],
    queryFn: () => getExpenses(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const { data: feedStock } = useQuery({
    queryKey: ["feedStock", activeBatch?.id],
    queryFn: () => getFeedStock(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const { data: remarks = [] } = useQuery({
    queryKey: ["remarks", activeBatch?.id],
    queryFn: () => getRemarks(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const { data: vaccines = [] } = useQuery({
    queryKey: ["vaccines", activeBatch?.id],
    queryFn: () => getVaccines(activeBatch!.id),
    enabled: !!activeBatch,
  });

  // Create Batch Mutation
  const createBatchMutation = useMutation({
    mutationFn: createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeBatch"] });
    },
  });

  // End Batch Mutation
  const endBatchMutation = useMutation({
    mutationFn: endBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeBatch"] });
      queryClient.invalidateQueries({ queryKey: ["batchHistory"] });
      setIsEndBatchModalOpen(false);
      navigate("/farmer/history");
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateBatchFormValues>({
    resolver: zodResolver(createBatchSchema),
  });

  function onCreateBatch(values: CreateBatchFormValues) {
    if (!farmerProfile) return;
    createBatchMutation.mutate({
      farmId: farmerProfile.farmId,
      initialBirds: values.initialBirds,
    });
  }

  // Calculated Metrics
  const totalMortality = records.reduce((sum, r) => sum + (r.mortality || 0), 0);
  const totalBirdsSold = sales.reduce((sum, s) => sum + (s.birdsSold || 0), 0);
  const remainingBirds = activeBatch
    ? Math.max(0, activeBatch.initialBirds - totalMortality - totalBirdsSold)
    : 0;
  const mortalityPct =
    activeBatch && activeBatch.initialBirds > 0
      ? ((totalMortality / activeBatch.initialBirds) * 100).toFixed(2)
      : "0.00";

  const totalFeedKg = records.reduce((sum, r) => sum + (r.feedConsumedKg || 0), 0);
  const latestRecord = records.length > 0 ? records[records.length - 1] : null;

  const totalSalesRevenue = sales.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalSalesRevenue - totalExpenses;

  // Batch Age
  const calculateAge = () => {
    if (!activeBatch?.startDate) return 0;
    const start = new Date(activeBatch.startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  const batchAge = calculateAge();

  if (isProfileLoading || isBatchLoading) {
    return (
      <AppLayout title="Dashboard" breadcrumb={[{ label: "Dashboard" }]}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-sm font-medium text-slate-600">Loading farm dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isProfileError) {
    return (
      <AppLayout title="Dashboard" breadcrumb={[{ label: "Dashboard" }]}>
        <div className="p-6">
          <Card className="max-w-md border-rose-200 bg-rose-50/50 p-6">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertCircle size={24} />
              <h2 className="text-lg font-bold">Farm Connection Needed</h2>
            </div>
            <p className="mt-2 text-sm text-rose-600">
              Your account is not yet linked to an active farm. Please contact your system administrator or check back shortly.
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Farmer Home Dashboard" breadcrumb={[{ label: "Home / Dashboard" }]}>
      <div className="space-y-8 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
        {/* If NO active batch -> Show Start Batch Form */}
        {!activeBatch ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-2xl border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Start a New Batch</h3>
                  <p className="text-sm text-slate-500">Farm: {farmerProfile?.farmName}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onCreateBatch)} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="initialBirds" className="font-semibold text-slate-700">
                    Initial Bird Count (Day-Old Chicks)
                  </Label>
                  <Input
                    id="initialBirds"
                    type="number"
                    placeholder="e.g. 3000"
                    className="rounded-xl"
                    {...register("initialBirds", { valueAsNumber: true })}
                  />
                  {errors.initialBirds && (
                    <p className="text-xs font-medium text-rose-600">
                      {errors.initialBirds.message}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Automatic Details:</p>
                  <p className="mt-1">• Batch Start Date will be set automatically to today.</p>
                  <p>• A unique batch tracking code will be generated.</p>
                  <p>• Feed stock tracking will initialize at 0 bags.</p>
                </div>

                {createBatchMutation.isError && (
                  <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                    {isAxiosError(createBatchMutation.error)
                      ? createBatchMutation.error.response?.data?.message || "Failed to create batch"
                      : "An error occurred while creating the batch"}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || createBatchMutation.isPending}
                  className="w-full rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                >
                  {createBatchMutation.isPending ? "Creating Batch..." : "Create & Activate Batch"}
                </Button>
              </form>
            </Card>

            <Card className="flex flex-col justify-between rounded-2xl border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6 shadow-sm">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Why Digital Poultry Management?</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Record daily morning & total mortality, track feed intake against standards, monitor weight gain, compute automatic Feed Conversion Ratios (FCR), and log final sales seamlessly.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-200/60 pt-4 text-xs text-slate-500">
                <span>View previous batch reports</span>
                <Button
                  variant="link"
                  onClick={() => navigate("/farmer/history")}
                  className="p-0 font-semibold text-emerald-700"
                >
                  Go to Batch History →
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          /* ACTIVE FLOCK DASHBOARD - 4 ORDERED SECTIONS */
          <>
            {/* ========================================================= */}
            {/* 1. CURRENT BATCH OVERVIEW                                 */}
            {/* ========================================================= */}
            <section aria-label="Current Batch Overview" className="space-y-4">
              {/* Batch Banner Card */}
              <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-emerald-900 via-green-900 to-teal-950 p-6 sm:p-7 text-white shadow-xl md:flex-row md:items-center md:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/40">
                      Batch {activeBatch.batchCode}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-100">
                      Day {batchAge} ({activeBatch.startDate})
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {farmerProfile?.farmName || activeBatch.farmName || "My Farm"}
                  </h1>
                  <p className="text-xs sm:text-sm text-emerald-100/80">
                    Welcome back, <span className="font-semibold text-white">{farmerProfile?.userName || "Farmer"}</span>. Live active flock status and telemetry overview.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <Button
                    onClick={() => navigate("/farmer/daily-records")}
                    className="rounded-xl bg-white px-4 py-2 font-bold text-emerald-950 shadow-md hover:bg-emerald-50 transition"
                  >
                    <PlusCircle className="mr-2 h-4 w-4 text-emerald-700" />
                    + Add Daily Record
                  </Button>
                  <Button
                    onClick={() => navigate("/farmer/end-batch")}
                    variant="outline"
                    className="rounded-xl border-rose-300/40 bg-rose-500/20 px-3.5 py-2 font-semibold text-rose-100 hover:bg-rose-600/30 hover:text-white"
                  >
                    <StopCircle className="mr-2 h-4 w-4 text-rose-300" />
                    End Batch
                  </Button>
                </div>
              </div>

              {/* Current Batch Overview Metrics (All 11 Required Attributes) */}
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Batch Code & Farm Name */}
                <Card className="rounded-2xl border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Batch & Farm
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Building2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <p className="text-xl font-extrabold text-slate-900 truncate">
                      {activeBatch.batchCode}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      {farmerProfile?.farmName || activeBatch.farmName || "Primary Farm"}
                    </p>
                  </div>
                </Card>

                {/* 2. Batch Age */}
                <Card className="rounded-2xl border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Batch Age
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <p className="text-xl font-extrabold text-blue-700">
                      Day {batchAge}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Started {activeBatch.startDate}
                    </p>
                  </div>
                </Card>

                {/* 3. Initial Birds & Remaining Birds */}
                <Card className="rounded-2xl border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Live Birds / Initial
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Activity className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-extrabold text-emerald-700">
                        {remainingBirds.toLocaleString()}
                      </p>
                      <span className="text-xs text-slate-500">live</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Initial: {activeBatch.initialBirds.toLocaleString()} birds
                    </p>
                  </div>
                </Card>

                {/* 4. Mortality Today & Cumulative Mortality (%) */}
                <Card className="rounded-2xl border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Mortality (Today / Total)
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                      <TrendingDown className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-extrabold text-rose-600">
                        {latestRecord ? (latestRecord.mortality ?? 0) : 0}
                      </p>
                      <span className="text-xs font-bold text-rose-600">
                        today ({latestRecord?.cumulativeMortalityPct != null ? `${latestRecord.cumulativeMortalityPct}%` : `${mortalityPct}%`} cum.)
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Cum. deaths: {totalMortality.toLocaleString()} birds
                    </p>
                  </div>
                </Card>

                {/* 5. Current Feed Stock */}
                <Card className="rounded-2xl border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Current Feed Stock
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <Package className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <p className="text-xl font-extrabold text-slate-900">
                      {feedStock?.currentBags ?? 0} bags
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {feedStock?.currentStockKg ? `${feedStock.currentStockKg.toLocaleString()} kg available` : "0 kg remaining"}
                    </p>
                  </div>
                </Card>

                {/* 6. Average Bird Weight */}
                <Card className="rounded-2xl border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Average Bird Weight
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                      <Scale className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <p className="text-xl font-extrabold text-slate-900">
                      {latestRecord?.avgWeightG ? `${latestRecord.avgWeightG} g` : "Not weighed"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {latestRecord?.minBodyWeightG ? `Standard: ${latestRecord.minBodyWeightG} g` : "Sample bird weight"}
                    </p>
                  </div>
                </Card>

                {/* 7. FCR (Feed Conversion Ratio) */}
                <Card className="rounded-2xl border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Feed Conversion (FCR)
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                      <Award className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-extrabold text-teal-700">
                        {latestRecord?.fcr != null ? Number(latestRecord.fcr).toFixed(2) : "—"}
                      </p>
                      <span className="text-xs text-slate-500">ratio</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {latestRecord?.standardFcr ? `Target: ${latestRecord.standardFcr}` : "Total Feed ÷ Weight Gain"}
                    </p>
                  </div>
                </Card>

                {/* 8. Cumulative Feed Consumed */}
                <Card className="rounded-2xl border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Feed Consumed
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <p className="text-xl font-extrabold text-slate-900">
                      {totalFeedKg.toLocaleString()} kg
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {records.length} daily entries recorded
                    </p>
                  </div>
                </Card>
              </div>

              {/* Quick Farm Actions Strip */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Quick Farm Operations
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Batch: {activeBatch.batchCode}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <Button
                    onClick={() => navigate("/farmer/daily-records")}
                    variant="outline"
                    className="flex h-auto flex-col items-center gap-1 rounded-xl border-slate-200 bg-white p-2.5 hover:border-emerald-500 hover:bg-emerald-50/50"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">Add Daily Record</span>
                  </Button>

                  <Button
                    onClick={() => navigate("/farmer/feed")}
                    variant="outline"
                    className="flex h-auto flex-col items-center gap-1 rounded-xl border-slate-200 bg-white p-2.5 hover:border-amber-500 hover:bg-amber-50/50"
                  >
                    <Package className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">Load Feed</span>
                  </Button>

                  <Button
                    onClick={() => navigate("/farmer/sales")}
                    variant="outline"
                    className="flex h-auto flex-col items-center gap-1 rounded-xl border-slate-200 bg-white p-2.5 hover:border-blue-500 hover:bg-blue-50/50"
                  >
                    <IndianRupee className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">Record Sale</span>
                  </Button>

                  <Button
                    onClick={() => navigate("/farmer/expenses")}
                    variant="outline"
                    className="flex h-auto flex-col items-center gap-1 rounded-xl border-slate-200 bg-white p-2.5 hover:border-purple-500 hover:bg-purple-50/50"
                  >
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-800">Add Expense</span>
                  </Button>

                  <Button
                    onClick={() => navigate("/farmer/remarks")}
                    variant="outline"
                    className="flex h-auto flex-col items-center gap-1 rounded-xl border-slate-200 bg-white p-2.5 hover:border-teal-500 hover:bg-teal-50/50"
                  >
                    <MessageSquare className="h-4 w-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-800">Add Remark</span>
                  </Button>
                </div>
              </div>
            </section>

            {/* ========================================================= */}
            {/* 2. DAILY RECORDS — PRIORITY SECTION                       */}
            {/* ========================================================= */}
            <section aria-label="Daily Records Priority Section" className="space-y-4">
              <Card className="rounded-3xl border-emerald-200/80 bg-white p-5 sm:p-6 md:p-7 shadow-sm ring-1 ring-emerald-500/10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-black text-slate-900">
                          Daily Records (Flock Health & Feeding Log)
                        </h2>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          {records.length} Entries
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Priority operational flock ledger: mortality, feed usage, bird weight, and live FCR
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => navigate("/farmer/daily-records")}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                    >
                      <PlusCircle className="mr-1.5 h-4 w-4" />
                      Add Daily Record
                    </Button>
                  </div>
                </div>

                {/* State: Loading */}
                {isRecordsLoading ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
                    <p className="mt-3 text-xs font-medium text-slate-500">Loading flock daily records...</p>
                  </div>
                ) : records.length === 0 ? (
                  /* State: Empty */
                  <div className="py-12 px-4 text-center rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 mt-5">
                    <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-3 text-base font-bold text-slate-800">
                      No daily records recorded yet.
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Start recording today's bird mortality, feed consumed, and body weight to automatically generate live FCR and performance curves.
                    </p>
                    <Button
                      onClick={() => navigate("/farmer/daily-records")}
                      className="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                    >
                      <PlusCircle className="mr-1.5 h-4 w-4" />
                      + Add Today's First Record
                    </Button>
                  </div>
                ) : (
                  /* State: Records Table with All 10 Required Columns */
                  <div className="mt-5 space-y-4">
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/90 font-bold uppercase tracking-wider text-slate-600">
                            <th className="py-3 px-3.5">Date</th>
                            <th className="py-3 px-3.5">Birds Died Today</th>
                            <th className="py-3 px-3.5">Cum. Mortality</th>
                            <th className="py-3 px-3.5">Mortality %</th>
                            <th className="py-3 px-3.5">Remaining Birds</th>
                            <th className="py-3 px-3.5">Feed Type</th>
                            <th className="py-3 px-3.5">Feed Bags</th>
                            <th className="py-3 px-3.5">Feed Used (kg)</th>
                            <th className="py-3 px-3.5">Avg Bird Weight</th>
                            <th className="py-3 px-3.5">FCR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {records.slice().reverse().slice(0, 10).map((rec) => (
                            <tr key={rec.id} className="hover:bg-emerald-50/30 transition-colors">
                              {/* 1. Date */}
                              <td className="py-3 px-3.5 font-bold text-slate-900">
                                {rec.recordDate}
                                {rec.ageDays != null && (
                                  <span className="ml-1.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                                    Day {rec.ageDays}
                                  </span>
                                )}
                              </td>

                              {/* 2. Birds Died Today */}
                              <td className="py-3 px-3.5 font-bold text-rose-600">
                                {rec.mortality} {rec.mortality === 1 ? "bird" : "birds"}
                              </td>

                              {/* 3. Cumulative Mortality */}
                              <td className="py-3 px-3.5 font-semibold text-slate-800">
                                {rec.cumulativeMortality.toLocaleString()}
                              </td>

                              {/* 4. Mortality % */}
                              <td className="py-3 px-3.5 font-medium text-slate-600">
                                {rec.cumulativeMortalityPct != null
                                  ? `${Number(rec.cumulativeMortalityPct).toFixed(2)}%`
                                  : "—"}
                              </td>

                              {/* 5. Remaining Birds */}
                              <td className="py-3 px-3.5 font-black text-emerald-800">
                                {rec.remainingBirds.toLocaleString()}
                              </td>

                              {/* 6. Feed Type */}
                              <td className="py-3 px-3.5 text-slate-700">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                                  {rec.feedType || "Starter"}
                                </span>
                              </td>

                              {/* 7. Feed Bags Used */}
                              <td className="py-3 px-3.5 font-semibold text-slate-800">
                                {rec.feedBagsConsumed != null ? `${rec.feedBagsConsumed} bags` : "—"}
                              </td>

                              {/* 8. Feed Consumed (kg) */}
                              <td className="py-3 px-3.5 font-bold text-slate-900">
                                {rec.feedConsumedKg} kg
                              </td>

                              {/* 9. Average Bird Weight */}
                              <td className="py-3 px-3.5 font-semibold text-slate-800">
                                {rec.avgWeightG ? `${rec.avgWeightG} g` : "—"}
                              </td>

                              {/* 10. FCR */}
                              <td className="py-3 px-3.5 font-black text-teal-700">
                                {rec.fcr != null ? Number(rec.fcr).toFixed(2) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span>Showing {Math.min(records.length, 10)} most recent records (newest first)</span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate("/farmer/daily-records")}
                        className="p-0 font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        Open Full Daily Data Insertion Page →
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </section>

            {/* ========================================================= */}
            {/* 3. AI ASSISTANCE / CHATBOT                                */}
            {/* ========================================================= */}
            <section aria-label="AI Assistance / Chatbot">
              <FarmerAIAssistantSection />
            </section>

            {/* ========================================================= */}
            {/* 4. ANALYTICS / GRAPHS                                     */}
            {/* Sequence: Growth Curve -> FCR Trajectory -> Mortality Chart*/}
            {/* ========================================================= */}
            <section aria-label="Flock Analytics & Graphs" className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Flock Performance Analytics</h3>
                  <p className="text-xs text-slate-500">
                    Live charts tracking weight growth, feed conversion ratio trajectories, and flock mortality
                  </p>
                </div>
              </div>

              {/* 1. Growth Curve */}
              <div className="space-y-2">
                <GrowthCurveChart records={records} isLoading={isBatchLoading} height={320} />
              </div>

              {/* 2. FCR Trajectory */}
              <div className="space-y-2">
                <FcrTrajectoryChart records={records} isLoading={isBatchLoading} height={300} />
              </div>

              {/* 3. Mortality Chart */}
              <div className="space-y-2">
                <MortalityChart
                  records={records}
                  initialBirds={activeBatch.initialBirds}
                  isLoading={isBatchLoading}
                  height={300}
                />
              </div>
            </section>

            {/* Financial Summary & Batch Details (Supplementary Footer) */}
            <section aria-label="Batch Financial & Health Details" className="grid gap-6 lg:grid-cols-3 pt-2">
              {/* Financial Snapshot */}
              <Card className="rounded-2xl border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Financial Performance</h4>
                    <p className="text-[11px] text-slate-500">Live batch revenue & expenses</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <IndianRupee size={16} />
                  </div>
                </div>

                <div className="mt-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Total Sales Revenue</span>
                    <span className="font-bold text-emerald-700">₹{totalSalesRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Total Birds Sold</span>
                    <span className="font-semibold text-slate-800">{totalBirdsSold.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Total Batch Expenses</span>
                    <span className="font-bold text-rose-600">₹{totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="font-semibold text-slate-800">Estimated Net Margin</span>
                    <span className={`font-black ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      ₹{netProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Batch Metadata */}
              <Card className="rounded-2xl border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Flock Overview</h4>
                    <p className="text-[11px] text-slate-500">Lifecycle & Schedule</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Calendar size={16} />
                  </div>
                </div>

                <div className="mt-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Start Date</span>
                    <span className="font-semibold text-slate-800">{activeBatch.startDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Current Age</span>
                    <span className="font-bold text-emerald-700">Day {batchAge}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Daily Records Logged</span>
                    <span className="font-semibold text-slate-800">{records.length} entries</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Vaccinations Administered</span>
                    <span className="font-semibold text-slate-800">{vaccines.length} doses</span>
                  </div>
                </div>
              </Card>

              {/* Recent Remarks */}
              <Card className="rounded-2xl border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Recent Observations</h4>
                    <p className="text-[11px] text-slate-500">Notes & Flock Health</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                    <MessageSquare size={16} />
                  </div>
                </div>

                <div className="mt-3.5 space-y-2.5">
                  {remarks.length === 0 ? (
                    <p className="text-xs text-slate-500">No remarks logged yet. Use quick action to record notes.</p>
                  ) : (
                    remarks.slice(-2).reverse().map((r) => (
                      <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">{r.createdByName}</span>
                          <span>{r.remarkDate}</span>
                        </div>
                        <p className="mt-1 text-slate-700">{r.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </section>
          </>
        )}
      </div>

      {/* Confirmation Modal for End Batch */}
      {activeBatch && (
        <ConfirmDialog
          title="End Current Batch?"
          description={`Are you sure you want to end batch ${activeBatch.batchCode}? Once ended, the batch status becomes COMPLETED, no more daily records can be entered, and it will be moved to History.`}
          confirmText="Yes, Complete Batch"
          cancelText="Cancel"
          variant="destructive"
          isOpen={isEndBatchModalOpen}
          isLoading={endBatchMutation.isPending}
          onConfirm={() => endBatchMutation.mutate(activeBatch.id)}
          onCancel={() => setIsEndBatchModalOpen(false)}
        />
      )}
    </AppLayout>
  );
}
