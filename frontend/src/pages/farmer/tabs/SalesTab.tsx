import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSales, addSale } from "@/lib/api/batchModules";
import { saleSchema, type SaleFormValues } from "@/lib/validation/batchModules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SalesTab({ batchId }: { batchId: number }) {
  const queryClient = useQueryClient();

  const { data: sales, isLoading, isError } = useQuery({
    queryKey: ["sales", batchId],
    queryFn: () => getSales(batchId),
  });

  const addMutation = useMutation({
    mutationFn: (values: SaleFormValues) => addSale(batchId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", batchId] });
      reset({ saleDate: "", birdsSold: undefined, totalWeightKg: undefined, ratePerKg: undefined });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SaleFormValues>({ resolver: zodResolver(saleSchema) });

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit((v) => addMutation.mutate(v))}
        className="grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-4"
      >
        <div className="space-y-2">
          <Label htmlFor="saleDate">Date</Label>
          <Input id="saleDate" type="date" {...register("saleDate")} />
          {errors.saleDate && <p className="text-sm text-destructive">{errors.saleDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="birdsSold">Birds sold</Label>
          <Input id="birdsSold" type="number" {...register("birdsSold", { valueAsNumber: true })} />
          {errors.birdsSold && <p className="text-sm text-destructive">{errors.birdsSold.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalWeightKg">Total weight (kg)</Label>
          <Input id="totalWeightKg" type="number" step="0.1" {...register("totalWeightKg", { valueAsNumber: true })} />
          {errors.totalWeightKg && <p className="text-sm text-destructive">{errors.totalWeightKg.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ratePerKg">Rate per kg</Label>
          <Input id="ratePerKg" type="number" step="0.1" {...register("ratePerKg", { valueAsNumber: true })} />
          {errors.ratePerKg && <p className="text-sm text-destructive">{errors.ratePerKg.message}</p>}
        </div>
        <div className="col-span-2 sm:col-span-4">
          <Button type="submit" disabled={isSubmitting || addMutation.isPending}>
            {addMutation.isPending ? "Saving..." : "Log sale"}
          </Button>
        </div>
      </form>

      {addMutation.isError && <p className="text-sm text-destructive">Could not save this sale.</p>}
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load sales.</p>
      ) : !sales || sales.length === 0 ? (
        <p className="text-muted-foreground">No sales logged yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Birds</TableHead>
              <TableHead>Total weight (kg)</TableHead>
              <TableHead>Avg/bird (kg)</TableHead>
              <TableHead>Rate/kg</TableHead>
              <TableHead>Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.saleDate}</TableCell>
                <TableCell>{s.birdsSold}</TableCell>
                <TableCell>{s.totalWeightKg}</TableCell>
                <TableCell>{s.avgWeightPerBirdKg}</TableCell>
                <TableCell>{s.ratePerKg}</TableCell>
                <TableCell>{s.revenue}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
