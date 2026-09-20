import { useState } from "react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveBatch } from "@/lib/api/batches";
import { getSales, addSale } from "@/lib/api/batchModules";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saleSchema, type SaleFormValues } from "@/lib/validation/batchModules";
import {
  DollarSign,
  Truck,
  CheckCircle2,
  AlertCircle,
  Scale,
} from "lucide-react";

export default function FarmerSalesPage() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: activeBatch, isLoading: isBatchLoading } = useQuery({
    queryKey: ["activeBatch"],
    queryFn: getActiveBatch,
  });

  const { data: sales = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ["sales", activeBatch?.id],
    queryFn: () => getSales(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      saleDate: todayStr,
      traderName: "",
      birdsSold: undefined,
      totalWeightKg: undefined,
      ratePerKg: undefined,
      liftingSignature: "",
    },
  });

  const birdsSold = watch("birdsSold");
  const totalWeightKg = watch("totalWeightKg");
  const ratePerKg = watch("ratePerKg");

  // Client calculations for instant preview
  const estimatedAvgWeight = birdsSold && totalWeightKg && birdsSold > 0
    ? (totalWeightKg / birdsSold).toFixed(3)
    : "—";

  const estimatedRevenue = totalWeightKg && ratePerKg
    ? (totalWeightKg * ratePerKg).toFixed(2)
    : "—";

  const addSaleMutation = useMutation({
    mutationFn: (values: SaleFormValues) => addSale(activeBatch!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", activeBatch?.id] });
      queryClient.invalidateQueries({ queryKey: ["activeBatch"] });
      setSuccessMessage("Sales details entry successfully saved!");
      setTimeout(() => setSuccessMessage(null), 4000);
      reset({
        saleDate: todayStr,
        traderName: "",
        birdsSold: undefined,
        totalWeightKg: undefined,
        ratePerKg: undefined,
        liftingSignature: "",
      });
    },
  });

  function onSubmit(values: SaleFormValues) {
    setSuccessMessage(null);
    addSaleMutation.mutate(values);
  }

  // Summary KPIs
  const totalBirdsSold = sales.reduce((sum, s) => sum + (s.birdsSold || 0), 0);
  const totalWeightSold = sales.reduce((sum, s) => sum + (s.totalWeightKg || 0), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + (s.revenue || 0), 0);

  if (isBatchLoading) {
    return (
      <AppLayout title="Sales" breadcrumb={[{ label: "Sales" }]}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-sm text-slate-600">Loading sales records...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Sales & Lifting Details"
      breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Sales" }]}
    >
      <div className="space-y-8 p-6 md:p-8">
        {!activeBatch ? (
          <Card className="rounded-2xl border-slate-200 p-8 text-center shadow-sm">
            <DollarSign className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-3 text-xl font-bold text-slate-900">No Active Batch</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create an active flock batch from the Home Dashboard before recording sales.
            </p>
          </Card>
        ) : (
          <>
            {/* KPI Summary Banner */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Birds Sold</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <Truck size={18} />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900">{totalBirdsSold.toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-500">From batch {activeBatch.batchCode}</p>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Weight Lifted</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <Scale size={18} />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900">{totalWeightSold.toLocaleString()} kg</p>
                <p className="mt-1 text-xs text-slate-500">Cumulative net weight</p>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Sales Revenue</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <DollarSign size={18} />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-black text-emerald-700">${totalRevenue.toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-500">{sales.length} sales transactions</p>
              </Card>
            </div>

            {/* Success Alert */}
            {successMessage && (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Alert */}
            {addSaleMutation.isError && (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-800 border border-rose-200">
                <AlertCircle size={20} className="text-rose-600" />
                <span>
                  {isAxiosError(addSaleMutation.error)
                    ? addSaleMutation.error.response?.data?.message || "Failed to record sale"
                    : "An unexpected error occurred."}
                </span>
              </div>
            )}

            {/* Sales Details Form */}
            <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900">Add Sales Entry (Sales Receipt)</h3>
                <p className="text-xs text-slate-500">Record bird lifting details, trader name, weight, and rate</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="saleDate" className="text-xs font-bold text-slate-700">
                      Lifting / Sale Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="saleDate"
                      type="date"
                      className="rounded-xl"
                      {...register("saleDate")}
                    />
                    {errors.saleDate && (
                      <p className="text-xs text-rose-600">{errors.saleDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="traderName" className="text-xs font-bold text-slate-700">
                      Trader / Buyer Name
                    </Label>
                    <Input
                      id="traderName"
                      type="text"
                      placeholder="e.g. Apex Poultry Traders"
                      className="rounded-xl"
                      {...register("traderName")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="birdsSold" className="text-xs font-bold text-slate-700">
                      Number of Birds Lifted <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="birdsSold"
                      type="number"
                      placeholder="e.g. 500"
                      className="rounded-xl"
                      {...register("birdsSold", { valueAsNumber: true })}
                    />
                    {errors.birdsSold && (
                      <p className="text-xs text-rose-600">{errors.birdsSold.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="totalWeightKg" className="text-xs font-bold text-slate-700">
                      Net Weight (kg) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="totalWeightKg"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1000.00"
                      className="rounded-xl"
                      {...register("totalWeightKg", { valueAsNumber: true })}
                    />
                    {errors.totalWeightKg && (
                      <p className="text-xs text-rose-600">{errors.totalWeightKg.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ratePerKg" className="text-xs font-bold text-slate-700">
                      Rate per kg ($) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="ratePerKg"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 2.50"
                      className="rounded-xl"
                      {...register("ratePerKg", { valueAsNumber: true })}
                    />
                    {errors.ratePerKg && (
                      <p className="text-xs text-rose-600">{errors.ratePerKg.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="liftingSignature" className="text-xs font-bold text-slate-700">
                      Lifting / Authorized Signature
                    </Label>
                    <Input
                      id="liftingSignature"
                      type="text"
                      placeholder="e.g. Trader Signature / Name"
                      className="rounded-xl"
                      {...register("liftingSignature")}
                    />
                  </div>
                </div>

                {/* Real-time Calculation Preview */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200/60 text-xs">
                  <div>
                    <span className="text-slate-500">Calculated Average Weight:</span>
                    <span className="ml-2 font-bold text-slate-900">{estimatedAvgWeight} kg/bird</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Estimated Transaction Revenue:</span>
                    <span className="ml-2 font-black text-emerald-700">${estimatedRevenue}</span>
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting || addSaleMutation.isPending}
                    className="rounded-xl bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-700 shadow-md"
                  >
                    {addSaleMutation.isPending ? "Recording Sale..." : "+ Save Sales Entry"}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Sales Details Table */}
            <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Sales & Lifting Ledger</h3>
                  <p className="text-xs text-slate-500">All recorded transactions for batch {activeBatch.batchCode}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {sales.length} Transactions
                </span>
              </div>

              {isSalesLoading ? (
                <p className="py-8 text-center text-xs text-slate-500">Loading sales records...</p>
              ) : sales.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No sales recorded yet for this active batch.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-600">
                        <th className="py-3 px-3">Sl. No.</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Trader Name</th>
                        <th className="py-3 px-3">No. of Birds</th>
                        <th className="py-3 px-3">Net Weight (kg)</th>
                        <th className="py-3 px-3">Avg Wt / Bird</th>
                        <th className="py-3 px-3">Rate / kg</th>
                        <th className="py-3 px-3">Total Revenue</th>
                        <th className="py-3 px-3">Lifting Signature</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sales.map((sale, index) => (
                        <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-500">#{index + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{sale.saleDate}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{sale.traderName || "—"}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{sale.birdsSold}</td>
                          <td className="py-2.5 px-3 text-slate-800">{sale.totalWeightKg} kg</td>
                          <td className="py-2.5 px-3 text-slate-700">{sale.avgWeightPerBirdKg} kg</td>
                          <td className="py-2.5 px-3 text-slate-700">${sale.ratePerKg}</td>
                          <td className="py-2.5 px-3 font-black text-emerald-700">${sale.revenue?.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-slate-600 italic">{sale.liftingSignature || "—"}</td>
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
