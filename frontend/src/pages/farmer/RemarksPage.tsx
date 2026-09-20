import { useState } from "react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getActiveBatch } from "@/lib/api/batches";
import { addRemark, getRemarks } from "@/lib/api/batchModules";
import { remarkSchema, type RemarkFormValues } from "@/lib/validation/batchModules";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Calendar,
  CheckCircle2,
  AlertCircle,
  User,
} from "lucide-react";

export default function FarmerRemarksPage() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: activeBatch, isLoading: isBatchLoading } = useQuery({
    queryKey: ["activeBatch"],
    queryFn: getActiveBatch,
  });

  const { data: remarks = [], isLoading: isRemarksLoading } = useQuery({
    queryKey: ["remarks", activeBatch?.id],
    queryFn: () => getRemarks(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RemarkFormValues>({
    resolver: zodResolver(remarkSchema),
    defaultValues: {
      remarkDate: todayStr,
      note: "",
    },
  });

  const addRemarkMutation = useMutation({
    mutationFn: (values: RemarkFormValues) => addRemark(activeBatch!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remarks", activeBatch?.id] });
      setSuccessMessage("Observation remark recorded successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
      reset({ note: "", remarkDate: todayStr });
    },
  });

  function onSubmit(values: RemarkFormValues) {
    setSuccessMessage(null);
    addRemarkMutation.mutate(values);
  }

  if (isBatchLoading) {
    return (
      <AppLayout title="Remarks" breadcrumb={[{ label: "Remarks" }]}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-sm text-slate-600">Loading remarks...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Flock Observations & Remarks"
      breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Remarks" }]}
    >
      <div className="space-y-8 p-6 md:p-8">
        {!activeBatch ? (
          <Card className="rounded-2xl border-slate-200 p-8 text-center shadow-sm">
            <MessageSquare className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-3 text-xl font-bold text-slate-900">No Active Batch</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create an active flock batch from the Home Dashboard before logging remarks.
            </p>
          </Card>
        ) : (
          <>
            {/* Header info */}
            <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-xs border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Flock Remarks Log</h3>
                  <p className="text-xs text-slate-500">
                    Active Batch: {activeBatch.batchCode} • Farm: {activeBatch.farmName}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-200">
                {remarks.length} Entries
              </span>
            </div>

            {/* Success Alert */}
            {successMessage && (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Alert */}
            {addRemarkMutation.isError && (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-800 border border-rose-200">
                <AlertCircle size={20} className="text-rose-600" />
                <span>
                  {isAxiosError(addRemarkMutation.error)
                    ? addRemarkMutation.error.response?.data?.message || "Failed to record remark"
                    : "An unexpected error occurred."}
                </span>
              </div>
            )}

            {/* New Remark Form */}
            <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Add New Observation / Remark</h3>
                <p className="text-xs text-slate-500">Log shedding, temperature changes, health status, or feed transitions</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="remarkDate" className="text-xs font-bold text-slate-700">
                      Observation Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="remarkDate"
                      type="date"
                      className="rounded-xl"
                      {...register("remarkDate")}
                    />
                    {errors.remarkDate && (
                      <p className="text-xs text-rose-600">{errors.remarkDate.message}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="note" className="text-xs font-bold text-slate-700">
                      Observation Note <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="note"
                      type="text"
                      placeholder="e.g. Birds feeding aggressively, litter condition is dry and well-ventilated."
                      className="rounded-xl"
                      {...register("note")}
                    />
                    {errors.note && (
                      <p className="text-xs text-rose-600">{errors.note.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting || addRemarkMutation.isPending}
                    className="rounded-xl bg-purple-600 px-6 font-semibold text-white hover:bg-purple-700 shadow-md"
                  >
                    {addRemarkMutation.isPending ? "Saving..." : "+ Record Remark"}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Remarks Timeline List */}
            <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-4">
                Observation Timeline
              </h3>

              {isRemarksLoading ? (
                <p className="py-8 text-center text-xs text-slate-500">Loading remarks...</p>
              ) : remarks.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No remarks logged yet for this batch.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {remarks.slice().reverse().map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-50 hover:border-purple-200"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/50 pb-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                            <User size={12} />
                          </div>
                          <span className="font-bold text-slate-800">{r.createdByName}</span>
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                            {r.createdByRole}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 font-medium">
                          <Calendar size={13} />
                          <span>{r.remarkDate}</span>
                        </div>
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed text-slate-700">{r.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
