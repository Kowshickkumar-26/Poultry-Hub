import { useQuery } from "@tanstack/react-query";
import { getActiveBatch } from "@/lib/api/batches";
import { getExpenses, getExpenseBreakdown } from "@/lib/api/batchModules";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";

export default function FarmerExpensesPage() {
  const { data: activeBatch } = useQuery({
    queryKey: ["activeBatch"],
    queryFn: getActiveBatch,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", activeBatch?.id],
    queryFn: () => getExpenses(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const { data: breakdown = [] } = useQuery({
    queryKey: ["expenseBreakdown", activeBatch?.id],
    queryFn: () => getExpenseBreakdown(activeBatch!.id),
    enabled: !!activeBatch,
  });

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const highestCategory = breakdown.reduce((max, item) => (item.total > max.total ? item : max), breakdown[0] ?? { category: "MISC", total: 0 });

  return (
    <AppLayout title="Expenses" breadcrumb={[{ label: "Expenses" }]}>
      <div className="space-y-6 p-6">
        {!activeBatch ? (
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">No active batch</h2>
            <p className="mt-2 text-gray-600">Create a batch to track running costs.</p>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Batch</p>
                <p className="mt-2 text-2xl font-bold">{activeBatch.batchCode}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total spent</p>
                <p className="mt-2 text-2xl font-bold">KES {totalExpenses.toLocaleString()}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Largest category</p>
                <p className="mt-2 text-2xl font-bold">{highestCategory.category}</p>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Expense breakdown</h3>
                {breakdown.length === 0 ? (
                  <p className="text-muted-foreground">No cost data has been logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {breakdown.map((item) => (
                      <div key={item.category} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span>{item.category}</span>
                        <span className="font-semibold">KES {item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Recent expenses</h3>
                {expenses.length === 0 ? (
                  <p className="text-muted-foreground">No expenses recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {expenses.slice().reverse().map((item) => (
                      <div key={item.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.category}</span>
                          <span className="font-semibold">KES {item.amount.toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{item.expenseDate}</p>
                        <p className="mt-1 text-sm">{item.description ?? "No description"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
