import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRemarks, addRemark } from "@/lib/api/batchModules";
import { remarkSchema, type RemarkFormValues } from "@/lib/validation/batchModules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RemarksTab({ batchId }: { batchId: number }) {
  const queryClient = useQueryClient();

  const { data: remarks, isLoading, isError } = useQuery({
    queryKey: ["remarks", batchId],
    queryFn: () => getRemarks(batchId),
  });

  const addMutation = useMutation({
    mutationFn: (values: RemarkFormValues) => addRemark(batchId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remarks", batchId] });
      reset({ remarkDate: "", note: "" });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RemarkFormValues>({ resolver: zodResolver(remarkSchema) });

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit((v) => addMutation.mutate(v))}
        className="space-y-4 rounded-lg border p-4"
      >
        <div className="space-y-2">
          <Label htmlFor="remarkDate">Date</Label>
          <Input id="remarkDate" type="date" {...register("remarkDate")} />
          {errors.remarkDate && <p className="text-sm text-destructive">{errors.remarkDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="note">Note</Label>
          <Input id="note" placeholder="Birds slightly lethargic this morning" {...register("note")} />
          {errors.note && <p className="text-sm text-destructive">{errors.note.message}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting || addMutation.isPending}>
          {addMutation.isPending ? "Saving..." : "Add remark"}
        </Button>
      </form>

      {addMutation.isError && <p className="text-sm text-destructive">Could not save this remark.</p>}
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load remarks.</p>
      ) : !remarks || remarks.length === 0 ? (
        <p className="text-muted-foreground">No remarks yet.</p>
      ) : (
        <div className="space-y-3">
          {remarks.map((r) => (
            <div key={r.id} className="rounded-lg border p-3">
              <p className="text-sm">{r.note}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.remarkDate} · {r.createdByName} ({r.createdByRole})
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
