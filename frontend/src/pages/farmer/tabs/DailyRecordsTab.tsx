import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDailyRecords, addDailyRecord } from "@/lib/api/dailyRecords";
import {
  dailyRecordSchema,
  type DailyRecordFormValues,
} from "@/lib/validation/dailyRecord";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DailyRecordsTabProps {
  batchId: number;
}

export function DailyRecordsTab({ batchId }: DailyRecordsTabProps) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const { data: records, isLoading } = useQuery({
    queryKey: ["dailyRecords", batchId],
    queryFn: () => getDailyRecords(batchId),
  });

  const addRecordMutation = useMutation({
    mutationFn: (values: DailyRecordFormValues) => {
      const payload: DailyRecordFormValues = {
        ...values,
        recordDate: values.recordDate && values.recordDate.trim() !== "" ? values.recordDate : undefined,
      };
      return addDailyRecord(batchId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyRecords", batchId] });
      setFormSuccess("Daily record saved successfully!");
      setFormError(null);
      reset({ recordDate: "", mortality: 0, feedConsumedKg: 0, avgWeightG: undefined });
      setTimeout(() => setFormSuccess(null), 4000);
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        setFormError(err.response?.data?.message || "Failed to save daily record.");
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Failed to save daily record.");
      }
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DailyRecordFormValues>({
    resolver: zodResolver(dailyRecordSchema),
    defaultValues: {
      recordDate: "",
      mortality: 0,
      feedConsumedKg: 0,
      avgWeightG: undefined,
    },
  });

  function onSubmit(values: DailyRecordFormValues) {
    setFormError(null);
    setFormSuccess(null);
    addRecordMutation.mutate(values);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-4"
      >
        <div className="space-y-2">
          <Label htmlFor="recordDate">Date (defaults to today)</Label>
          <Input id="recordDate" type="date" {...register("recordDate")} />
          {errors.recordDate && (
            <p className="text-sm text-destructive">{errors.recordDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mortality">Mortality</Label>
          <Input
            id="mortality"
            type="number"
            {...register("mortality", { valueAsNumber: true })}
          />
          {errors.mortality && (
            <p className="text-sm text-destructive">{errors.mortality.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedConsumedKg">Feed consumed (kg)</Label>
          <Input
            id="feedConsumedKg"
            type="number"
            step="0.1"
            {...register("feedConsumedKg", { valueAsNumber: true })}
          />
          {errors.feedConsumedKg && (
            <p className="text-sm text-destructive">
              {errors.feedConsumedKg.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="avgWeightG">Avg weight (g, optional)</Label>
          <Input
            id="avgWeightG"
            type="number"
            step="0.1"
            placeholder="e.g. 1500"
            {...register("avgWeightG", { valueAsNumber: true })}
          />
          {errors.avgWeightG && (
            <p className="text-sm text-destructive">{errors.avgWeightG.message}</p>
          )}
        </div>

        {formError && (
          <div className="col-span-full rounded-md bg-destructive/10 p-2 text-sm text-destructive font-medium">
            {formError}
          </div>
        )}

        {formSuccess && (
          <div className="col-span-full rounded-md bg-emerald-50 p-2 text-sm text-emerald-800 font-medium">
            {formSuccess}
          </div>
        )}

        <div className="col-span-2 flex items-end sm:col-span-4">
          <Button type="submit" disabled={isSubmitting || addRecordMutation.isPending}>
            {addRecordMutation.isPending ? "Saving..." : "Add Record"}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading records...</p>
      ) : records && records.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Age (days)</TableHead>
                <TableHead>Mortality</TableHead>
                <TableHead>Remaining birds</TableHead>
                <TableHead>Feed consumed (kg)</TableHead>
                <TableHead>Avg weight (g)</TableHead>
                <TableHead>FCR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.recordDate}</TableCell>
                  <TableCell>{record.ageDays}</TableCell>
                  <TableCell>{record.mortality}</TableCell>
                  <TableCell>{record.remainingBirds.toLocaleString()}</TableCell>
                  <TableCell>{record.feedConsumedKg} kg</TableCell>
                  <TableCell>
                    {record.avgWeightG != null ? `${record.avgWeightG} g` : "—"}
                  </TableCell>
                  <TableCell>{record.fcr != null ? Number(record.fcr).toFixed(2) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No records logged yet.</p>
      )}
    </div>
  );
}
