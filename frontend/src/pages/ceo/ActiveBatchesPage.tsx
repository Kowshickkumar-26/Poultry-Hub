import { useQuery } from "@tanstack/react-query";
import { getActiveBatches } from "@/lib/api/batches";
import { AppLayout } from "@/components/AppLayout";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { CheckCircle2 } from "lucide-react";

export default function CEOActiveBatchesPage() {
  const {
    data: batches = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["activeBatches"],
    queryFn: getActiveBatches,
  });

  if (isLoading) {
    return (
      <AppLayout title="Active Batches">
        <LoadingState message="Loading active batches..." />
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout title="Active Batches">
        <ErrorState
          title="Failed to load active batches"
          message="Could not load active batches. Please try again."
        />
      </AppLayout>
    );
  }

  if (batches.length === 0) {
    return (
      <AppLayout title="Active Batches">
        <div className="p-6">
          <EmptyState
            title="No active batches"
            description="There are no active batches at the moment."
            icon={<CheckCircle2 size={48} />}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Active Batches" breadcrumb={[{ label: "Active Batches" }]}>
      <div className="space-y-6 p-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Batch Code
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Farmer
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Farm
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Birds
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{batch.batchCode}</td>
                    <td className="px-6 py-3">{batch.farmerName}</td>
                    <td className="px-6 py-3">{batch.farmName}</td>
                    <td className="px-6 py-3">
                      {batch.startDate
                        ? new Date(batch.startDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-3">{batch.initialBirds}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={batch.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
