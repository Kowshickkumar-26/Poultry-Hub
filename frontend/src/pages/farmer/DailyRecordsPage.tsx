import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveBatch } from "@/lib/api/batches";
import { getDailyRecords, addDailyRecord } from "@/lib/api/dailyRecords";
import { getFeedStock } from "@/lib/api/batchModules";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dailyRecordSchema,
  type DailyRecordFormValues,
} from "@/lib/validation/dailyRecord";
import {
  FileSpreadsheet,
  Activity,
  Package,
  Scale,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Info,
  Award,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function FarmerDailyRecordsPage() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Load Active Batch
  const { data: activeBatch, isLoading: isBatchLoading } = useQuery({
    queryKey: ["activeBatch"],
    queryFn: getActiveBatch,
  });

  // Load Daily Records for Active Batch
  const { data: records = [], isLoading: isRecordsLoading } = useQuery({
    queryKey: ["dailyRecords", activeBatch?.id],
    queryFn: () => getDailyRecords(activeBatch!.id),
    enabled: !!activeBatch,
  });

  // Load Feed Stock for Active Batch
  const { data: feedStock } = useQuery({
    queryKey: ["feedStock", activeBatch?.id],
    queryFn: () => getFeedStock(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const availableStockKg = feedStock?.currentStockKg ?? 0;

  // Check if today's record has already been logged
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const todayRecord = useMemo(() => {
    return records.find((r) => r.recordDate === todayStr);
  }, [records, todayStr]);

  const latestRecord = useMemo(
    () => (records.length > 0 ? records[records.length - 1] : null),
    [records]
  );


  // Previous metrics
  const totalMortalityBeforeToday = useMemo(() => {
    return records.reduce((sum, r) => {
      if (todayRecord && r.id === todayRecord.id) return sum;
      return sum + (r.mortality || 0);
    }, 0);
  }, [records, todayRecord]);

  const currentLiveBirdsBeforeToday = activeBatch
    ? Math.max(0, activeBatch.initialBirds - totalMortalityBeforeToday)
    : 0;

  const totalFeedConsumedBeforeToday = useMemo(() => {
    return records.reduce((sum, r) => {
      if (todayRecord && r.id === todayRecord.id) return sum;
      return sum + (r.feedConsumedKg || 0);
    }, 0);
  }, [records, todayRecord]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DailyRecordFormValues>({
    resolver: zodResolver(dailyRecordSchema),
    defaultValues: {
      mortality: 0,
      feedBagsConsumed: 0,
      bagCapacityKg: 50,
      feedType: "Starter",
      avgWeightG: undefined,
      notes: "",
    },
  });

  // Watch fields for live calculation preview
  const watchedMortality = watch("mortality") || 0;
  const watchedFeedBags = watch("feedBagsConsumed") || 0;
  const watchedBagCapacity = watch("bagCapacityKg") || 50;
  const watchedFeedType = watch("feedType") || "Starter";
  const watchedAvgWeight = watch("avgWeightG");

  // Real-time live derived calculations
  const liveTodaysFeedKg = useMemo(() => {
    return Number((watchedFeedBags * watchedBagCapacity).toFixed(2));
  }, [watchedFeedBags, watchedBagCapacity]);

  const liveCumulativeMortality = useMemo(() => {
    return totalMortalityBeforeToday + (Number(watchedMortality) || 0);
  }, [totalMortalityBeforeToday, watchedMortality]);

  const liveRemainingBirds = useMemo(() => {
    return Math.max(0, currentLiveBirdsBeforeToday - (Number(watchedMortality) || 0));
  }, [currentLiveBirdsBeforeToday, watchedMortality]);

  const liveCumulativeMortalityPct = useMemo(() => {
    if (!activeBatch || activeBatch.initialBirds <= 0) return "0.00";
    return ((liveCumulativeMortality * 100) / activeBatch.initialBirds).toFixed(2);
  }, [activeBatch, liveCumulativeMortality]);

  const liveRemainingStockKg = useMemo(() => {
    return Math.max(0, availableStockKg - liveTodaysFeedKg);
  }, [availableStockKg, liveTodaysFeedKg]);

  // Capacity-aware stock balance for selected Feed Type & Bag Capacity
  const selectedInventoryItem = useMemo(() => {
    if (!feedStock?.inventory) return null;
    const norm = (watchedFeedType || "Starter").toUpperCase().replace("-", "_").replace(" ", "_");
    return feedStock.inventory.find(
      (item) =>
        item.feedType.toUpperCase().replace("-", "_").replace(" ", "_") === norm &&
        Number(item.bagCapacityKg) === Number(watchedBagCapacity)
    );
  }, [feedStock?.inventory, watchedFeedType, watchedBagCapacity]);

  const availableBagsForSelectedCapacity = selectedInventoryItem?.availableBags ?? 0;
  const isCapacityStockInsufficient = (Number(watchedFeedBags) || 0) > availableBagsForSelectedCapacity;

  // Flock Age calculation
  const currentAge = useMemo(() => {
    if (!activeBatch?.startDate) return 1;
    const start = new Date(activeBatch.startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  }, [activeBatch]);

  // Live estimated FCR
  const liveEstimatedFcr = useMemo(() => {
    const weight = watchedAvgWeight || latestRecord?.avgWeightG;
    if (!weight || weight <= 0 || liveRemainingBirds <= 0) {
      return null;
    }
    const cumulativeFeed = totalFeedConsumedBeforeToday + liveTodaysFeedKg;
    const currentTotalWeightKg = (weight / 1000) * liveRemainingBirds;
    if (currentTotalWeightKg <= 0 || cumulativeFeed <= 0) return null;
    return (cumulativeFeed / currentTotalWeightKg).toFixed(2);
  }, [
    watchedAvgWeight,
    latestRecord?.avgWeightG,
    liveRemainingBirds,
    totalFeedConsumedBeforeToday,
    liveTodaysFeedKg,
  ]);

  const addRecordMutation = useMutation({
    mutationFn: (values: DailyRecordFormValues) => {
      const payload = {
        mortality: Number(values.mortality) || 0,
        feedBagsConsumed: Number(values.feedBagsConsumed) || 0,
        bagCapacityKg: Number(values.bagCapacityKg) || 50,
        feedType: values.feedType || "Starter",
        feedConsumedKg: (Number(values.feedBagsConsumed) || 0) * (Number(values.bagCapacityKg) || 50),
        avgWeightG: values.avgWeightG ? Number(values.avgWeightG) : undefined,
        notes: values.notes?.trim() || undefined,
      };
      return addDailyRecord(activeBatch!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyRecords", activeBatch?.id] });
      queryClient.invalidateQueries({ queryKey: ["feedStock", activeBatch?.id] });
      queryClient.invalidateQueries({ queryKey: ["activeBatch"] });
      setSuccessMessage("Daily record successfully saved to database!");
      setServerError(null);
      setTimeout(() => setSuccessMessage(null), 5000);
      reset({
        mortality: 0,
        feedBagsConsumed: 0,
        bagCapacityKg: 50,
        feedType: "Starter",
        avgWeightG: undefined,
        notes: "",
      });
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        setServerError(error.response?.data?.message || "Failed to save daily record");
      } else {
        setServerError("An unexpected error occurred while saving.");
      }
    },
  });

  const isMortalityExceeded = useMemo(() => {
    return (Number(watchedMortality) || 0) > currentLiveBirdsBeforeToday;
  }, [watchedMortality, currentLiveBirdsBeforeToday]);

  function onSubmit(values: DailyRecordFormValues) {
    setSuccessMessage(null);
    setServerError(null);

    if (isMortalityExceeded) {
      setServerError(
        `Today's mortality (${watchedMortality}) cannot exceed current live bird count (${currentLiveBirdsBeforeToday}).`
      );
      return;
    }

    if (isCapacityStockInsufficient && (Number(watchedFeedBags) || 0) > 0) {
      if (availableBagsForSelectedCapacity <= 0) {
        setServerError(
          `Feed stock for ${watchedFeedType} (${watchedBagCapacity} kg bags) is empty (0 bags available). Please select an available capacity or load feed.`
        );
      } else {
        setServerError(
          `Insufficient feed stock! Requested: ${watchedFeedBags} bags of ${watchedFeedType} (${watchedBagCapacity} kg), but only ${availableBagsForSelectedCapacity} bags are available in stock.`
        );
      }
      return;
    }

    addRecordMutation.mutate(values);
  }

  // Latest Record for Summary Card

  if (isBatchLoading) {
    return (
      <AppLayout title="Daily Records" breadcrumb={[{ label: "Daily Records" }]}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-sm text-slate-600">Loading active batch details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Daily Data Insertion"
      breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Data Insertion" }]}
    >
      <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
        {!activeBatch ? (
          <Card className="rounded-2xl border-slate-200 p-8 text-center shadow-sm">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-3 text-xl font-bold text-slate-900">No Active Batch</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create an active flock batch from the Home Dashboard before entering daily poultry records.
            </p>
          </Card>
        ) : (
          <>
            {/* Header Batch Bar */}
            <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-xs border border-slate-200 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">Daily Flock Log</h2>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      {activeBatch.batchCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Farm: {activeBatch.farmName} • Started {activeBatch.startDate} • {activeBatch.initialBirds.toLocaleString()} Initial Birds
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
                <div className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-100">
                  <span className="text-slate-400 uppercase text-[10px] block">Live Birds</span>
                  <p className="text-base font-bold text-emerald-700">{currentLiveBirdsBeforeToday.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-100">
                  <span className="text-slate-400 uppercase text-[10px] block">Available Feed Stock</span>
                  <p className={`text-base font-bold ${availableStockKg <= 0 ? "text-rose-600" : "text-slate-900"}`}>
                    {availableStockKg.toLocaleString()} kg
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-100">
                  <span className="text-slate-400 uppercase text-[10px] block">Batch Age</span>
                  <p className="text-base font-bold text-blue-700">Day {currentAge}</p>
                </div>
              </div>
            </div>

            {/* Success Alert */}
            {successMessage && (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Alert */}
            {serverError && (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-800 border border-rose-200">
                <AlertCircle size={20} className="text-rose-600 flex-shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Feed Stock Warning Alert if empty */}
            {availableStockKg <= 0 && (
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-900 border border-amber-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Feed stock is empty (0 kg).</strong> Please log a feed delivery on the Feed page before recording feed usage.
                  </span>
                </div>
                <Link
                  to="/farmer/feed"
                  className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition shadow-xs whitespace-nowrap"
                >
                  Load Feed →
                </Link>
              </div>
            )}

            {/* Main Grid: Form + Live Derived Card */}
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Simplified Daily Entry Form (7 cols) */}
              <div className="lg:col-span-7">
                <Card className="rounded-2xl border-slate-200 bg-white p-6 md:p-7 shadow-sm">
                  <div className="mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900">
                        {todayRecord ? `Update Today's Entry (Day ${todayRecord.ageDays ?? currentAge})` : "Record Today's Entry"}
                      </h3>
                      {todayRecord && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                          Already Logged Today
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {todayRecord
                        ? `A record for today (${todayRecord.recordDate}) already exists. Submitting updates today's telemetry.`
                        : "Enter today's mortality, feed bags used, and average bird weight. All cumulative metrics and FCR are calculated automatically."}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* 1. Mortality */}
                    <div className="space-y-2">
                      <Label htmlFor="mortality" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Activity size={15} className="text-rose-600" />
                        Number of Birds Died Today <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="mortality"
                        type="number"
                        min="0"
                        max={currentLiveBirdsBeforeToday}
                        placeholder="e.g. 3"
                        className="rounded-xl h-11 text-base font-semibold"
                        {...register("mortality", { valueAsNumber: true })}
                      />
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Info size={12} className="text-slate-400" />
                        Enter only birds that died today. Max available live birds: {currentLiveBirdsBeforeToday.toLocaleString()}
                      </p>
                      {errors.mortality && (
                        <p className="text-xs text-rose-600">{errors.mortality.message}</p>
                      )}
                      {isMortalityExceeded && (
                        <p className="text-xs font-semibold text-rose-600">
                          Mortality cannot exceed current live birds ({currentLiveBirdsBeforeToday}).
                        </p>
                      )}
                    </div>

                    {/* 2. Feed Usage Section */}
                    <div className="rounded-2xl bg-slate-50 p-4 md:p-5 border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                          <Package size={15} className="text-emerald-600" />
                          Feed Usage Today
                        </Label>
                        <span className="text-[11px] font-semibold text-slate-600">
                          Available: <strong>{availableStockKg.toLocaleString()} kg</strong>
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {/* Feed Bags Used */}
                        <div className="space-y-1.5">
                          <Label htmlFor="feedBagsConsumed" className="text-xs font-semibold text-slate-700">
                            Bags Used Today
                          </Label>
                          <Input
                            id="feedBagsConsumed"
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="e.g. 4"
                            className="rounded-xl bg-white"
                            {...register("feedBagsConsumed", { valueAsNumber: true })}
                          />
                          {errors.feedBagsConsumed && (
                            <p className="text-xs text-rose-600">{errors.feedBagsConsumed.message}</p>
                          )}
                        </div>

                        {/* Bag Capacity */}
                        <div className="space-y-1.5">
                          <Label htmlFor="bagCapacityKg" className="text-xs font-semibold text-slate-700">
                            Bag Capacity
                          </Label>
                          <select
                            id="bagCapacityKg"
                            className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            {...register("bagCapacityKg", { valueAsNumber: true })}
                          >
                            {[50, 70].map((cap) => {
                              const norm = (watchedFeedType || "Starter").toUpperCase().replace("-", "_").replace(" ", "_");
                              const inv = feedStock?.inventory?.find(
                                (item) => item.feedType.toUpperCase().replace("-", "_").replace(" ", "_") === norm && Number(item.bagCapacityKg) === cap
                              );
                              const avail = inv?.availableBags ?? 0;
                              return (
                                <option key={cap} value={cap}>
                                  {cap} kg ({avail} {avail === 1 ? "bag" : "bags"} in stock{avail === 0 ? " - Empty" : ""})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Feed Type */}
                        <div className="space-y-1.5">
                          <Label htmlFor="feedType" className="text-xs font-semibold text-slate-700">
                            Feed Type
                          </Label>
                          <select
                            id="feedType"
                            className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            {...register("feedType")}
                          >
                            <option value="Pre-starter">Pre-starter</option>
                            <option value="Starter">Starter</option>
                            <option value="Finisher">Finisher</option>
                          </select>
                        </div>
                      </div>

                      {/* Feed Live Calculated banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl bg-emerald-100/70 p-3 text-xs font-semibold text-emerald-900">
                        <span>Feed consumed today:</span>
                        <span className="text-sm font-bold text-emerald-800">
                          {watchedFeedBags} bags × {watchedBagCapacity} kg = {liveTodaysFeedKg} kg ({watchedFeedType})
                        </span>
                      </div>

                      {isCapacityStockInsufficient && (Number(watchedFeedBags) || 0) > 0 && (
                        <p className="text-xs font-bold text-rose-600">
                          {availableBagsForSelectedCapacity <= 0
                            ? `Stock for ${watchedFeedType} (${watchedBagCapacity} kg) is empty (0 bags). Please load feed or select an available bag capacity.`
                            : `Insufficient feed stock! Requested: ${watchedFeedBags} bags of ${watchedFeedType} (${watchedBagCapacity} kg), but only ${availableBagsForSelectedCapacity} bags available.`}
                        </p>
                      )}
                    </div>

                    {/* 3. Weight Section */}
                    <div className="space-y-2">
                      <Label htmlFor="avgWeightG" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Scale size={15} className="text-blue-600" />
                        Average Bird Weight (g)
                      </Label>
                      <Input
                        id="avgWeightG"
                        type="number"
                        step="1"
                        min="0"
                        placeholder="e.g. 1850"
                        className="rounded-xl h-11 text-base font-semibold"
                        {...register("avgWeightG", { valueAsNumber: true })}
                      />
                      <p className="text-[11px] text-slate-500">
                        Enter the sample average bird weight in grams. Used for automatic FCR calculation.
                      </p>
                      {errors.avgWeightG && (
                        <p className="text-xs text-rose-600">{errors.avgWeightG.message}</p>
                      )}
                    </div>

                    {/* 4. Notes */}
                    <div className="space-y-1.5">
                      <Label htmlFor="notes" className="text-xs font-bold text-slate-700">
                        Observations / Notes (Optional)
                      </Label>
                      <Input
                        id="notes"
                        type="text"
                        placeholder="e.g. Birds active, normal water intake, dry litter"
                        className="rounded-xl"
                        {...register("notes")}
                      />
                    </div>

                    {/* Action button */}
                    <div className="flex justify-end border-t border-slate-100 pt-4">
                      <Button
                        type="submit"
                        disabled={
                          isSubmitting ||
                          addRecordMutation.isPending ||
                          isMortalityExceeded ||
                          (isCapacityStockInsufficient && (Number(watchedFeedBags) || 0) > 0)
                        }
                        className="rounded-xl bg-emerald-600 px-7 py-2.5 font-bold text-white hover:bg-emerald-700 shadow-md transition disabled:opacity-50"
                      >
                        {addRecordMutation.isPending
                          ? "Saving Record..."
                          : todayRecord
                          ? `Update Today's Record (Day ${todayRecord.ageDays ?? currentAge})`
                          : "+ Save Daily Record"}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>

              {/* Automatic Calculation & Today's Summary Card (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Live Preview Card */}
                <Card className="rounded-2xl border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                    <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp size={16} className="text-emerald-700" />
                      Live Automatic Calculation
                    </h3>
                    <span className="rounded-full bg-emerald-200/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      Flock Day {currentAge}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3.5 text-xs">
                    {/* Mortality */}
                    <div className="flex justify-between items-center py-1.5 border-b border-emerald-100">
                      <span className="text-slate-600 font-medium">Mortality Today:</span>
                      <span className="font-bold text-slate-900">{watchedMortality} birds</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-emerald-100">
                      <span className="text-slate-600 font-medium">Total Cumulative Mortality:</span>
                      <span className="font-bold text-slate-900">{liveCumulativeMortality.toLocaleString()} birds</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-emerald-100">
                      <span className="text-slate-600 font-medium">Mortality %:</span>
                      <span className="font-bold text-slate-900">{liveCumulativeMortalityPct}%</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-emerald-100">
                      <span className="text-slate-600 font-medium">Remaining Live Birds:</span>
                      <span className="font-black text-emerald-700 text-sm">{liveRemainingBirds.toLocaleString()}</span>
                    </div>

                    {/* Feed */}
                    <div className="flex justify-between items-center py-1.5 border-b border-emerald-100">
                      <span className="text-slate-600 font-medium">Feed Used Today:</span>
                      <span className="font-bold text-slate-900">
                        {liveTodaysFeedKg} kg ({watchedFeedType})
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-emerald-100">
                      <span className="text-slate-600 font-medium">Remaining Feed Stock:</span>
                      <span className={`font-bold ${liveRemainingStockKg <= 0 ? "text-rose-600" : "text-slate-900"}`}>
                        {liveRemainingStockKg.toLocaleString()} kg
                      </span>
                    </div>

                    {/* FCR */}
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-600 font-medium">Estimated FCR:</span>
                      <span className="font-black text-blue-700 text-sm">
                        {liveEstimatedFcr ?? "Enter weight to calculate"}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Latest Record Summary Card */}
                {latestRecord && (
                  <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Award size={15} className="text-amber-500" />
                        Latest Recorded Summary ({latestRecord.recordDate})
                      </h4>
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        Day {latestRecord.ageDays ?? currentAge}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[10px] uppercase text-slate-400 font-semibold block">Died Today</span>
                        <span className="font-bold text-rose-600">{latestRecord.mortality} birds</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[10px] uppercase text-slate-400 font-semibold block">Live Birds</span>
                        <span className="font-bold text-emerald-700">{latestRecord.remainingBirds.toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[10px] uppercase text-slate-400 font-semibold block">Feed Used</span>
                        <span className="font-bold text-slate-900">{latestRecord.feedConsumedKg} kg</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[10px] uppercase text-slate-400 font-semibold block">FCR</span>
                        <span className="font-bold text-blue-700">{latestRecord.fcr != null ? Number(latestRecord.fcr).toFixed(2) : "—"}</span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Reference Guidance Card */}
                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                    <Info size={14} className="text-slate-400" /> Reference Guidance
                  </h4>
                  <div className="space-y-2 text-[11px] text-slate-500 leading-relaxed">
                    <p>
                      • <strong>Mortality:</strong> Typical daily broiler mortality is 0.05% - 0.15% per day.
                    </p>
                    <p>
                      • <strong>Feed Consumed:</strong> Automatically computed from bags × bag capacity.
                    </p>
                    <p>
                      • <strong>FCR (Feed Conversion Ratio):</strong> Calculated from total feed consumed divided by live bird weight gain. Lower is better (target: ~1.45 - 1.65).
                    </p>
                  </div>
                </Card>
              </div>
            </div>

            {/* Historical Daily Records Table */}
            <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recorded Daily Logs</h3>
                  <p className="text-xs text-slate-500">Complete historical logs for batch {activeBatch.batchCode}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {records.length} Records
                </span>
              </div>

              {isRecordsLoading ? (
                <p className="py-8 text-center text-xs text-slate-500">Loading daily records...</p>
              ) : records.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No daily records entered for this batch yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-600">
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Age</th>
                        <th className="py-3 px-3">Died Today</th>
                        <th className="py-3 px-3">Total Mort.</th>
                        <th className="py-3 px-3">Mort. %</th>
                        <th className="py-3 px-3">Live Birds</th>
                        <th className="py-3 px-3">Feed Used</th>
                        <th className="py-3 px-3">Feed Type</th>
                        <th className="py-3 px-3">Avg Wt</th>
                        <th className="py-3 px-3">FCR</th>
                        <th className="py-3 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.slice().reverse().map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{rec.recordDate}</td>
                          <td className="py-2.5 px-3 font-semibold text-blue-700">Day {rec.ageDays ?? "—"}</td>
                          <td className="py-2.5 px-3 font-bold text-rose-600">{rec.mortality}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{rec.cumulativeMortality}</td>
                          <td className="py-2.5 px-3 text-slate-600">{rec.cumulativeMortalityPct ?? "—"}%</td>
                          <td className="py-2.5 px-3 font-black text-slate-900">{rec.remainingBirds.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-800">
                            {rec.feedConsumedKg} kg
                            {rec.feedBagsConsumed ? ` (${rec.feedBagsConsumed} bags)` : ""}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{rec.feedType ?? "—"}</td>
                          <td className="py-2.5 px-3 text-slate-700">{rec.avgWeightG ? `${rec.avgWeightG} g` : "—"}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-700">{rec.fcr != null ? Number(rec.fcr).toFixed(2) : "—"}</td>
                          <td className="py-2.5 px-3 max-w-[150px] truncate text-slate-500" title={rec.notes || ""}>
                            {rec.notes || "—"}
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
    </AppLayout>
  );
}
