import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveBatch } from "@/lib/api/batches";
import { getFeedLoads, getFeedStock, addFeedLoad } from "@/lib/api/batchModules";
import { getDailyRecords } from "@/lib/api/dailyRecords";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  PlusCircle,
  Truck,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Wheat,
  Layers,
  Clock,
  Scale,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";

interface FeedLoadFormValues {
  bags: number;
  weightPerBagKg: number;
  feedType: string;
}

export default function FarmerFeedPage() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: activeBatch, isLoading: isBatchLoading } = useQuery({
    queryKey: ["activeBatch"],
    queryFn: getActiveBatch,
  });

  const { data: stock, isLoading: isStockLoading } = useQuery({
    queryKey: ["feedStock", activeBatch?.id],
    queryFn: () => getFeedStock(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const { data: loads = [], isLoading: isLoadsLoading } = useQuery({
    queryKey: ["feedLoads", activeBatch?.id],
    queryFn: () => getFeedLoads(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const { data: records = [], isLoading: isRecordsLoading } = useQuery({
    queryKey: ["dailyRecords", activeBatch?.id],
    queryFn: () => getDailyRecords(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<FeedLoadFormValues>({
    defaultValues: {
      bags: 10,
      weightPerBagKg: 50,
      feedType: "Starter",
    },
  });

  const watchedBags = watch("bags") || 0;
  const watchedCapacity = watch("weightPerBagKg") || 50;
  const watchedFeedType = watch("feedType") || "Starter";

  // Real-time calculation of new delivery quantity
  const liveLoadQuantityKg = useMemo(() => {
    return Number((watchedBags * watchedCapacity).toFixed(2));
  }, [watchedBags, watchedCapacity]);

  const currentStockKg = stock?.currentStockKg ?? 0;
  const liveNewStockKg = useMemo(() => {
    return Number((currentStockKg + liveLoadQuantityKg).toFixed(2));
  }, [currentStockKg, liveLoadQuantityKg]);

  const addFeedLoadMutation = useMutation({
    mutationFn: (values: FeedLoadFormValues) => {
      return addFeedLoad(activeBatch!.id, {
        bags: Number(values.bags),
        weightPerBagKg: Number(values.weightPerBagKg),
        feedType: values.feedType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedLoads", activeBatch?.id] });
      queryClient.invalidateQueries({ queryKey: ["feedStock", activeBatch?.id] });
      queryClient.invalidateQueries({ queryKey: ["activeBatch"] });
      setSuccessMessage("Feed delivery successfully logged and added to capacity inventory!");
      setServerError(null);
      setTimeout(() => setSuccessMessage(null), 5000);
      reset({
        bags: 10,
        weightPerBagKg: 50,
        feedType: "Starter",
      });
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        setServerError(error.response?.data?.message || "Failed to log feed delivery");
      } else {
        setServerError("An unexpected error occurred while saving feed load.");
      }
    },
  });

  function onSubmit(values: FeedLoadFormValues) {
    setSuccessMessage(null);
    setServerError(null);
    if (!values.bags || values.bags <= 0) {
      setServerError("Number of bags must be greater than zero.");
      return;
    }
    addFeedLoadMutation.mutate(values);
  }

  if (isBatchLoading) {
    return (
      <AppLayout title="Feed Management" breadcrumb={[{ label: "Feed" }]}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-sm text-slate-600">Loading feed details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const inventoryItems = stock?.inventory || [];

  return (
    <AppLayout
      title="Feed Management & Stock"
      breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Feed Management" }]}
    >
      <div className="space-y-8 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
        {!activeBatch ? (
          <Card className="rounded-2xl border-slate-200 p-8 text-center shadow-sm">
            <Package className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-3 text-xl font-bold text-slate-900">No Active Batch</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create an active flock batch from the Home Dashboard before loading feed deliveries.
            </p>
          </Card>
        ) : (
          <>
            {/* Header Batch Bar */}
            <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-xs border border-slate-200 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Wheat size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">Capacity-Aware Feed Stock</h2>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      {activeBatch.batchCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Farm: {activeBatch.farmName} • Started {activeBatch.startDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <Clock size={14} className="text-slate-500" />
                  Auto-timestamped Transactions
                </span>
              </div>
            </div>

            {/* Success & Error Alerts */}
            {successMessage && (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
            {serverError && (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-800 border border-rose-200">
                <AlertCircle size={20} className="text-rose-600 flex-shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Summary Metrics Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Current Total Feed Stock */}
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Available Stock</p>
                  <Package className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="mt-3">
                  <p className={`text-2xl font-black ${currentStockKg <= 0 ? "text-rose-600" : "text-emerald-700"}`}>
                    {currentStockKg.toLocaleString()} kg
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    {stock?.currentBags ?? 0} total bags available
                  </p>
                </div>
              </Card>

              {/* Total Loaded */}
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Feed Loaded</p>
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-black text-slate-900">
                    {(stock?.totalLoadedKg ?? 0).toLocaleString()} kg
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Across {loads.length} deliveries
                  </p>
                </div>
              </Card>

              {/* Total Consumed */}
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Consumed</p>
                  <TrendingDown className="h-5 w-5 text-amber-600" />
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-black text-slate-900">
                    {(stock?.totalConsumedKg ?? 0).toLocaleString()} kg
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    From {records.length} daily logs
                  </p>
                </div>
              </Card>

              {/* Consumption by Type */}
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Consumption by Type</p>
                  <Layers className="h-5 w-5 text-purple-600" />
                </div>
                <div className="mt-2.5 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pre-starter:</span>
                    <span className="font-bold text-slate-800">{(stock?.preStarterConsumedKg ?? 0).toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Starter:</span>
                    <span className="font-bold text-slate-800">{(stock?.starterConsumedKg ?? 0).toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Finisher:</span>
                    <span className="font-bold text-slate-800">{(stock?.finisherConsumedKg ?? 0).toLocaleString()} kg</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* CAPACITY-SEGREGATED INVENTORY BREAKDOWN TABLE */}
            <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Scale size={18} className="text-emerald-700" />
                    Feed Stock by Type & Bag Capacity
                  </h3>
                  <p className="text-xs text-slate-500">
                    Strict capacity-aware balance (50 kg vs 70 kg bags). Consumption is deducted per specific capacity.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  {inventoryItems.length} Stock Categories
                </span>
              </div>

              {isStockLoading ? (
                <p className="py-8 text-center text-xs text-slate-500">Loading capacity breakdown...</p>
              ) : inventoryItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No stock records available.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/90 font-bold uppercase tracking-wider text-slate-600">
                        <th className="py-3 px-3.5">Feed Type</th>
                        <th className="py-3 px-3.5">Bag Capacity</th>
                        <th className="py-3 px-3.5">Loaded Bags</th>
                        <th className="py-3 px-3.5">Consumed Bags</th>
                        <th className="py-3 px-3.5">Available Bags</th>
                        <th className="py-3 px-3.5">Available (kg)</th>
                        <th className="py-3 px-3.5">Stock Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventoryItems.map((item, idx) => {
                        const isOut = item.stockStatus === "OUT_OF_STOCK" || item.availableBags <= 0;
                        const isLow = item.stockStatus === "LOW_STOCK";
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-3.5 font-bold text-slate-900">
                              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                                {item.feedTypeDisplay || item.feedType}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 font-semibold text-slate-700">
                              {item.bagCapacityKg} kg
                            </td>
                            <td className="py-3 px-3.5 font-medium text-slate-600">
                              {item.loadedBags} bags
                            </td>
                            <td className="py-3 px-3.5 font-medium text-slate-600">
                              {item.consumedBags} bags
                            </td>
                            <td className="py-3 px-3.5 font-black text-slate-900">
                              <span className={isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-emerald-700"}>
                                {item.availableBags} bags
                              </span>
                            </td>
                            <td className="py-3 px-3.5 font-black text-slate-900">
                              <span className={isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-slate-900"}>
                                {item.availableKg.toLocaleString()} kg
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              {isOut ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                                  <AlertCircle size={12} /> Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                                  <AlertTriangle size={12} /> Low Stock (≤ 2 bags)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                  <CheckCircle2 size={12} /> In Stock
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Main Section: Load Feed Form + Deliveries Table */}
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Feed Loading Form (5 cols) */}
              <div className="lg:col-span-5">
                <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <PlusCircle size={18} className="text-emerald-600" />
                      Log Feed Delivery
                    </h3>
                    <p className="text-xs text-slate-500">
                      Record new feed bags arriving at the farm. Date is recorded automatically.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* 1. Bags */}
                    <div className="space-y-1.5">
                      <Label htmlFor="bags" className="text-xs font-bold text-slate-700">
                        Number of Bags <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="bags"
                        type="number"
                        step="0.5"
                        min="1"
                        placeholder="e.g. 10"
                        className="rounded-xl h-11 text-base font-semibold"
                        {...register("bags", { valueAsNumber: true })}
                      />
                    </div>

                    {/* 2. Bag Capacity */}
                    <div className="space-y-1.5">
                      <Label htmlFor="weightPerBagKg" className="text-xs font-bold text-slate-700">
                        Bag Capacity <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        id="weightPerBagKg"
                        className="w-full rounded-xl border border-input bg-white px-3.5 py-2.5 text-sm font-semibold shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        {...register("weightPerBagKg", { valueAsNumber: true })}
                      >
                        <option value={50}>50 kg (Standard Bag)</option>
                        <option value={70}>70 kg (Large Bag)</option>
                      </select>
                    </div>

                    {/* 3. Feed Type */}
                    <div className="space-y-1.5">
                      <Label htmlFor="feedType" className="text-xs font-bold text-slate-700">
                        Feed Type <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        id="feedType"
                        className="w-full rounded-xl border border-input bg-white px-3.5 py-2.5 text-sm font-semibold shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        {...register("feedType")}
                      >
                        <option value="Pre-starter">Pre-starter</option>
                        <option value="Starter">Starter</option>
                        <option value="Finisher">Finisher</option>
                      </select>
                    </div>

                    {/* Live Calculation Preview Banner */}
                    <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-emerald-950 font-semibold">
                        <span>Total To Load:</span>
                        <span className="font-bold text-emerald-800">
                          {watchedBags} bags ({watchedFeedType}) × {watchedCapacity} kg = {liveLoadQuantityKg} kg
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>New Total Stock:</span>
                        <span className="font-black text-slate-900">
                          {liveNewStockKg.toLocaleString()} kg
                        </span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isSubmitting || addFeedLoadMutation.isPending || !watchedBags || watchedBags <= 0}
                      className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 shadow-md transition"
                    >
                      {addFeedLoadMutation.isPending ? "Logging Delivery..." : "+ Add to Feed Stock"}
                    </Button>
                  </form>
                </Card>
              </div>

              {/* Feed Deliveries Table (7 cols) */}
              <div className="lg:col-span-7">
                <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Feed Delivery History</h3>
                      <p className="text-xs text-slate-500">All feed loads for batch {activeBatch.batchCode}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {loads.length} Deliveries
                    </span>
                  </div>

                  {isLoadsLoading ? (
                    <p className="py-8 text-center text-xs text-slate-500">Loading feed deliveries...</p>
                  ) : loads.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                      <Truck className="mx-auto h-8 w-8 text-slate-300" />
                      <p>No feed deliveries logged yet for this batch.</p>
                      <p className="text-slate-500">Use the form on the left to add your first delivery.</p>
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-600">
                            <th className="py-3 px-3">Date</th>
                            <th className="py-3 px-3">Type</th>
                            <th className="py-3 px-3">Bags</th>
                            <th className="py-3 px-3">Capacity</th>
                            <th className="py-3 px-3">Total Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loads.slice().reverse().map((item) => {
                            const totalKg = item.totalWeightKg ?? (item.bags * (item.weightPerBagKg || 50));
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 px-3 font-bold text-slate-900">{item.loadDate}</td>
                                <td className="py-2.5 px-3">
                                  <span className="rounded-md bg-emerald-100/70 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                    {item.feedType}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{item.bags} bags</td>
                                <td className="py-2.5 px-3 text-slate-600">{item.weightPerBagKg || 50} kg</td>
                                <td className="py-2.5 px-3 font-black text-slate-900">{totalKg.toLocaleString()} kg</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {/* Consumption History Table from Daily Records */}
            <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-emerald-700" />
                    Feed Consumption History (from Daily Records)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daily feeding logs deducting from bag-capacity stock balance
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {records.filter((r) => (r.feedConsumedKg || 0) > 0).length} Entries
                </span>
              </div>

              {isRecordsLoading ? (
                <p className="py-8 text-center text-xs text-slate-500">Loading consumption logs...</p>
              ) : records.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No daily records entered yet for this batch.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-600">
                        <th className="py-3 px-3.5">Date</th>
                        <th className="py-3 px-3.5">Feed Type</th>
                        <th className="py-3 px-3.5">Bags Consumed</th>
                        <th className="py-3 px-3.5">Bag Capacity</th>
                        <th className="py-3 px-3.5">Feed Consumed (kg)</th>
                        <th className="py-3 px-3.5">Cumulative Feed (kg)</th>
                        <th className="py-3 px-3.5">FCR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.slice().reverse().map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-slate-900">{r.recordDate}</td>
                          <td className="py-2.5 px-3.5">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                              {r.feedType || "Starter"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                            {r.feedBagsConsumed != null ? `${r.feedBagsConsumed} bags` : "—"}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600">
                            {r.bagCapacityKg ? `${r.bagCapacityKg} kg` : "50 kg"}
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-900">
                            {r.feedConsumedKg} kg
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-emerald-800">
                            {r.cumulativeFeedActualKg ? `${r.cumulativeFeedActualKg} kg` : "—"}
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-teal-700">
                            {r.fcr != null ? Number(r.fcr).toFixed(2) : "—"}
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
