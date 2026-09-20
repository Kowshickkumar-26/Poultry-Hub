import { useQuery } from "@tanstack/react-query";
import { getBatchHistory } from "@/lib/api/batches";
import { AppLayout } from "@/components/AppLayout";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Layers } from "lucide-react";

export default function FarmerBatchesPage() {
  const {
    data: batches = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["batchHistory"],
    queryFn: getBatchHistory,
  });

  if (isLoading) {
    return (
      <AppLayout title="Batches">
        <LoadingState message="Loading batches..." />
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout title="Batches">
        <ErrorState
          title="Failed to load batches"
          message="Could not load your batches. Please try again."
        />
      </AppLayout>
    );
  }

  if (batches.length === 0) {
    return (
      <AppLayout title="Batches">
        <div className="p-6">
          <EmptyState
            title="No batches"
            description="You haven't created any batches yet."
            icon={<Layers size={48} />}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Batches" breadcrumb={[{ label: "Batches" }]}>
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
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Initial Birds
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
                    <td className="px-6 py-3">
                      {batch.startDate
                        ? new Date(batch.startDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-3">
                      {batch.endDate
                        ? new Date(batch.endDate).toLocaleDateString()
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
