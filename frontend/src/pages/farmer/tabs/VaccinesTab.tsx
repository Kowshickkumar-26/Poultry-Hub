import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getVaccines, addVaccine } from "@/lib/api/batchModules";
import { vaccineSchema, type VaccineFormValues } from "@/lib/validation/batchModules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function VaccinesTab({ batchId }: { batchId: number }) {
  const queryClient = useQueryClient();

  const { data: vaccines, isLoading, isError } = useQuery({
    queryKey: ["vaccines", batchId],
    queryFn: () => getVaccines(batchId),
  });

  const addMutation = useMutation({
    mutationFn: (values: VaccineFormValues) => addVaccine(batchId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaccines", batchId] });
      reset({ givenDate: "", vaccineName: "", remarks: "" });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VaccineFormValues>({ resolver: zodResolver(vaccineSchema) });

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit((v) => addMutation.mutate(v))}
        className="grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-3"
      >
        <div className="space-y-2">
          <Label htmlFor="givenDate">Date</Label>
          <Input id="givenDate" type="date" {...register("givenDate")} />
          {errors.givenDate && <p className="text-sm text-destructive">{errors.givenDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vaccineName">Vaccine</Label>
          <Input id="vaccineName" placeholder="Newcastle Disease" {...register("vaccineName")} />
          {errors.vaccineName && <p className="text-sm text-destructive">{errors.vaccineName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="remarks">Remarks (optional)</Label>
          <Input id="remarks" {...register("remarks")} />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <Button type="submit" disabled={isSubmitting || addMutation.isPending}>
            {addMutation.isPending ? "Saving..." : "Log vaccine"}
          </Button>
        </div>
      </form>

      {addMutation.isError && <p className="text-sm text-destructive">Could not save this vaccine.</p>}
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load vaccines.</p>
      ) : !vaccines || vaccines.length === 0 ? (
        <p className="text-muted-foreground">No vaccines logged yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vaccine</TableHead>
              <TableHead>Batch age (days)</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vaccines.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{v.givenDate}</TableCell>
                <TableCell>{v.vaccineName}</TableCell>
                <TableCell>{v.ageDays}</TableCell>
                <TableCell>{v.remarks ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
