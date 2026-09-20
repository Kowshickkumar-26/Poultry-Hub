import { useState } from "react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveBatch } from "@/lib/api/batches";
import { getVaccines, addVaccine } from "@/lib/api/batchModules";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  PlusCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Info,
  Sparkles,
} from "lucide-react";

interface VaccineFormValues {
  vaccineName: string;
  givenDate?: string;
  remarks?: string;
}

const COMMON_VACCINES = [
  { name: "Newcastle (NDV-Lasota / Ranikhet)", schedule: "Day 5-7 (Drinking Water / Eye Drop)" },
  { name: "IBD (Gumboro)", schedule: "Day 12-14 (Drinking Water)" },
  { name: "IBD Booster", schedule: "Day 18-20 (Drinking Water)" },
  { name: "Newcastle Booster (NDV-R2B)", schedule: "Day 21-24 (Drinking Water)" },
  { name: "Marek's Disease (HVT)", schedule: "Hatchery (Subcutaneous)" },
  { name: "Infectious Bronchitis (IB)", schedule: "Day 1-3 (Spray / Eye Drop)" },
  { name: "Fowl Pox", schedule: "Day 28-30 (Wing Web)" },
];

export default function FarmerVaccinesPage() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: activeBatch, isLoading: isBatchLoading } = useQuery({
    queryKey: ["activeBatch"],
    queryFn: getActiveBatch,
  });

  const { data: vaccines = [], isLoading: isVaccinesLoading } = useQuery({
    queryKey: ["vaccines", activeBatch?.id],
    queryFn: () => getVaccines(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<VaccineFormValues>({
    defaultValues: {
      vaccineName: "",
      givenDate: todayStr,
      remarks: "",
    },
  });

  // Calculate Flock Age
  const currentAge = (() => {
    if (!activeBatch?.startDate) return 1;
    const start = new Date(activeBatch.startDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  })();

  const addVaccineMutation = useMutation({
    mutationFn: (values: VaccineFormValues) => {
      return addVaccine(activeBatch!.id, {
        vaccineName: values.vaccineName.trim(),
        givenDate: values.givenDate || todayStr,
        remarks: values.remarks?.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaccines", activeBatch?.id] });
      queryClient.invalidateQueries({ queryKey: ["activeBatch"] });
      setSuccessMessage("Vaccination record successfully saved!");
      setServerError(null);
      setTimeout(() => setSuccessMessage(null), 5000);
      reset({
        vaccineName: "",
        givenDate: todayStr,
        remarks: "",
      });
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        setServerError(error.response?.data?.message || "Failed to log vaccination.");
      } else {
        setServerError("An unexpected error occurred while saving vaccination.");
      }
    },
  });

  function onSubmit(values: VaccineFormValues) {
    setSuccessMessage(null);
    setServerError(null);
    if (!values.vaccineName || !values.vaccineName.trim()) {
      setServerError("Vaccine name is required.");
      return;
    }
    addVaccineMutation.mutate(values);
  }

  function handleSelectSuggestion(name: string) {
    setValue("vaccineName", name);
  }

  if (isBatchLoading) {
    return (
      <AppLayout title="Vaccines" breadcrumb={[{ label: "Vaccines" }]}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-sm text-slate-600">Loading active flock vaccination logs...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Flock Vaccination Management"
      breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Vaccines" }]}
    >
      <div className="space-y-8 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
        {!activeBatch ? (
          <Card className="rounded-2xl border-slate-200 p-8 text-center shadow-sm">
            <ShieldCheck className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-3 text-xl font-bold text-slate-900">No Active Batch</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create an active flock batch from the Home Dashboard before logging vaccinations.
            </p>
          </Card>
        ) : (
          <>
            {/* Header Batch Overview Banner */}
            <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 p-6 text-white shadow-lg md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-400/20 text-teal-300 ring-1 ring-teal-400/40">
                  <Stethoscope size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">Flock Vaccination Protocol</h2>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                      Batch {activeBatch.batchCode}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/80">
                    Farm: {activeBatch.farmName} • Started {activeBatch.startDate}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-200">
                <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/20">
                  <span className="text-emerald-300 uppercase text-[10px] block">Current Flock Age</span>
                  <p className="text-base font-bold text-white">Day {currentAge}</p>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/20">
                  <span className="text-emerald-300 uppercase text-[10px] block">Vaccines Administered</span>
                  <p className="text-base font-bold text-teal-300">{vaccines.length} doses</p>
                </div>
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

            {/* Main Grid: Form + Vaccine History Table */}
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Vaccine Entry Form (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <PlusCircle size={18} className="text-emerald-600" />
                      Log Vaccination Dose
                    </h3>
                    <p className="text-xs text-slate-500">
                      Record administered poultry vaccines. Age in days is automatically calculated.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* 1. Vaccine Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="vaccineName" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        Vaccine Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="vaccineName"
                        type="text"
                        placeholder="e.g. Newcastle (NDV-Lasota)"
                        className="rounded-xl h-11 text-sm font-semibold"
                        {...register("vaccineName", { required: true })}
                      />
                    </div>

                    {/* Quick Standard Vaccine Chips */}
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Sparkles size={12} className="text-amber-500" /> Standard Vaccination Suggestions:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {COMMON_VACCINES.map((v, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectSuggestion(v.name)}
                            className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-800 hover:bg-emerald-50/50 transition text-left shadow-2xs"
                            title={v.schedule}
                          >
                            + {v.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Date Given */}
                    <div className="space-y-1.5">
                      <Label htmlFor="givenDate" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Calendar size={14} className="text-blue-600" />
                        Date Administered
                      </Label>
                      <Input
                        id="givenDate"
                        type="date"
                        max={todayStr}
                        className="rounded-xl"
                        {...register("givenDate")}
                      />
                      <p className="text-[11px] text-slate-400">Defaults to today if left as is.</p>
                    </div>

                    {/* 3. Remarks */}
                    <div className="space-y-1.5">
                      <Label htmlFor="remarks" className="text-xs font-bold text-slate-700">
                        Administration Route / Remarks (Optional)
                      </Label>
                      <Input
                        id="remarks"
                        type="text"
                        placeholder="e.g. Drinking water with skim milk stabilizer, no reactions"
                        className="rounded-xl"
                        {...register("remarks")}
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isSubmitting || addVaccineMutation.isPending}
                      className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 shadow-md transition"
                    >
                      {addVaccineMutation.isPending ? "Saving Vaccination..." : "+ Log Vaccination"}
                    </Button>
                  </form>
                </Card>

                {/* Schedule Reference Card */}
                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
                    <Info size={14} className="text-teal-600" /> Broiler Vaccination Protocol Reference
                  </h4>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-semibold text-slate-800">Day 1–3:</span>
                      <span>Marek's & Infectious Bronchitis</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-semibold text-slate-800">Day 5–7:</span>
                      <span>Newcastle (NDV-Lasota)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-semibold text-slate-800">Day 12–14:</span>
                      <span>Infectious Bursal Disease (IBD / Gumboro)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-semibold text-slate-800">Day 18–20:</span>
                      <span>IBD Gumboro Booster</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800">Day 21–24:</span>
                      <span>Newcastle Booster (Lasota / R2B)</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Vaccine Records Table (7 cols) */}
              <div className="lg:col-span-7">
                <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Vaccination History Log</h3>
                      <p className="text-xs text-slate-500">
                        Administered doses and age records for batch {activeBatch.batchCode}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {vaccines.length} Recorded
                    </span>
                  </div>

                  {isVaccinesLoading ? (
                    <p className="py-8 text-center text-xs text-slate-500">Loading vaccination logs...</p>
                  ) : vaccines.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                      <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="font-semibold text-slate-700">No vaccines recorded yet for this batch.</p>
                      <p className="text-slate-500 max-w-sm mx-auto">
                        Use the form on the left to record the first vaccination dose.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-600">
                            <th className="py-3 px-3.5">Date Given</th>
                            <th className="py-3 px-3.5">Flock Age</th>
                            <th className="py-3 px-3.5">Vaccine Name</th>
                            <th className="py-3 px-3.5">Route / Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vaccines.slice().reverse().map((v) => (
                            <tr key={v.id} className="hover:bg-emerald-50/30 transition-colors">
                              <td className="py-3 px-3.5 font-bold text-slate-900">
                                {v.givenDate}
                              </td>
                              <td className="py-3 px-3.5">
                                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                                  Day {v.ageDays}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 font-bold text-emerald-800">
                                <div className="flex items-center gap-1.5">
                                  <ShieldCheck size={14} className="text-emerald-600" />
                                  <span>{v.vaccineName}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3.5 text-slate-600 max-w-xs truncate" title={v.remarks || ""}>
                                {v.remarks || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
