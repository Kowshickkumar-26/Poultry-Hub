import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

  const { data: records, isLoading } = useQuery({
    queryKey: ["dailyRecords", batchId],
    queryFn: () => getDailyRecords(batchId),
  });

  const addRecordMutation = useMutation({
    mutationFn: (values: DailyRecordFormValues) => addDailyRecord(batchId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyRecords", batchId] });
      reset({ recordDate: "", mortality: 0, feedConsumedKg: 0, avgWeightG: undefined });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(dailyRecordSchema),
  });

  function onSubmit(values: DailyRecordFormValues) {
    addRecordMutation.mutate(values);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-4"
      >
        <div className="space-y-2">
          <Label htmlFor="recordDate">Date</Label>
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
            {...register("avgWeightG", { valueAsNumber: true })}
          />
          {errors.avgWeightG && (
            <p className="text-sm text-destructive">{errors.avgWeightG.message}</p>
          )}
        </div>

        <div className="col-span-2 sm:col-span-4">
          {addRecordMutation.isError && (
            <p className="mb-2 text-sm text-destructive">
              Could not save this entry. It may already exist for this date.
            </p>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Add entry"}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-muted-foreground">Loading records...</p>
      ) : !records || records.length === 0 ? (
        <p className="text-muted-foreground">No daily records yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Mortality</TableHead>
              <TableHead>Cumulative</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Feed (kg)</TableHead>
              <TableHead>Avg weight (g)</TableHead>
              <TableHead>FCR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.recordDate}</TableCell>
                <TableCell>{record.mortality}</TableCell>
                <TableCell>{record.cumulativeMortality}</TableCell>
                <TableCell>{record.remainingBirds}</TableCell>
                <TableCell>{record.feedConsumedKg}</TableCell>
                <TableCell>{record.avgWeightG ?? "-"}</TableCell>
                <TableCell>{record.fcr ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
