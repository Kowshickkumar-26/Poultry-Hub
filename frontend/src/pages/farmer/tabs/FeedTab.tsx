import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFeedLoads, addFeedLoad, getFeedStock } from "@/lib/api/batchModules";
import { feedLoadSchema, type FeedLoadFormValues } from "@/lib/validation/batchModules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function FeedTab({ batchId }: { batchId: number }) {
  const queryClient = useQueryClient();

  const { data: stock, isError: isStockError } = useQuery({
    queryKey: ["feedStock", batchId],
    queryFn: () => getFeedStock(batchId),
  });

  const { data: loads, isLoading, isError: isLoadsError } = useQuery({
    queryKey: ["feedLoads", batchId],
    queryFn: () => getFeedLoads(batchId),
  });

  const addLoadMutation = useMutation({
    mutationFn: (values: FeedLoadFormValues) => addFeedLoad(batchId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedLoads", batchId] });
      queryClient.invalidateQueries({ queryKey: ["feedStock", batchId] });
      reset({ loadDate: "", feedType: "", bags: undefined });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeedLoadFormValues>({ resolver: zodResolver(feedLoadSchema) });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Current feed stock</p>
        <p className="text-2xl font-medium">
          {stock ? `${stock.currentBags} bags` : "—"}
        </p>
      </div>

      <form
        onSubmit={handleSubmit((v) => addLoadMutation.mutate(v))}
        className="grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-3"
      >
        <div className="space-y-2">
          <Label htmlFor="loadDate">Date</Label>
          <Input id="loadDate" type="date" {...register("loadDate")} />
          {errors.loadDate && <p className="text-sm text-destructive">{errors.loadDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="feedType">Feed type</Label>
          <Input id="feedType" placeholder="Starter" {...register("feedType")} />
          {errors.feedType && <p className="text-sm text-destructive">{errors.feedType.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bags">Bags</Label>
          <Input id="bags" type="number" step="0.1" {...register("bags", { valueAsNumber: true })} />
          {errors.bags && <p className="text-sm text-destructive">{errors.bags.message}</p>}
        </div>
        <div className="col-span-2 sm:col-span-3">
          <Button type="submit" disabled={isSubmitting || addLoadMutation.isPending}>
            {addLoadMutation.isPending ? "Saving..." : "Log delivery"}
          </Button>
        </div>
      </form>

      {isStockError && <p className="text-sm text-destructive">Could not load feed stock.</p>}
      {addLoadMutation.isError && <p className="text-sm text-destructive">Could not save this delivery.</p>}
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : isLoadsError ? (
        <p className="text-sm text-destructive">Could not load feed deliveries.</p>
      ) : !loads || loads.length === 0 ? (
        <p className="text-muted-foreground">No feed deliveries yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bags</TableHead>
              <TableHead>Weight/bag (kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loads.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.loadDate}</TableCell>
                <TableCell>{l.feedType}</TableCell>
                <TableCell>{l.bags}</TableCell>
                <TableCell>{l.weightPerBagKg}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
