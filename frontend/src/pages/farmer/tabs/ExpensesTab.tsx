import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExpenses, addExpense, getExpenseBreakdown } from "@/lib/api/batchModules";
import { expenseSchema, type ExpenseFormValues } from "@/lib/validation/batchModules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["FEED", "MEDICINE", "LABOR", "TRANSPORT", "UTILITIES", "MISC"] as const;

export function ExpensesTab({ batchId }: { batchId: number }) {
  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses", batchId],
    queryFn: () => getExpenses(batchId),
  });

  const { data: breakdown } = useQuery({
    queryKey: ["expenseBreakdown", batchId],
    queryFn: () => getExpenseBreakdown(batchId),
  });

  const addMutation = useMutation({
    mutationFn: (values: ExpenseFormValues) => addExpense(batchId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", batchId] });
      queryClient.invalidateQueries({ queryKey: ["expenseBreakdown", batchId] });
      reset({ expenseDate: "", amount: undefined, description: "" });
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({ resolver: zodResolver(expenseSchema) });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {breakdown?.map((b) => (
          <div key={b.category} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{b.category}</p>
            <p className="text-lg font-medium">{b.total}</p>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit((v) => addMutation.mutate(v))}
        className="grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-4"
      >
        <div className="space-y-2">
          <Label htmlFor="expenseDate">Date</Label>
          <Input id="expenseDate" type="date" {...register("expenseDate")} />
          {errors.expenseDate && <p className="text-sm text-destructive">{errors.expenseDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" step="0.01" {...register("amount", { valueAsNumber: true })} />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input id="description" {...register("description")} />
        </div>
        <div className="col-span-2 sm:col-span-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Log expense"}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !expenses || expenses.length === 0 ? (
        <p className="text-muted-foreground">No expenses logged yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.expenseDate}</TableCell>
                <TableCell>{e.category}</TableCell>
                <TableCell>{e.amount}</TableCell>
                <TableCell>{e.description ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
