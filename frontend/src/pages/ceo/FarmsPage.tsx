import { useQuery } from "@tanstack/react-query";
import { getAllFarms } from "@/lib/api/farms";
import { AppLayout } from "@/components/AppLayout";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function CEOFarmsPage() {
  const {
    data: farms = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["allFarms"],
    queryFn: getAllFarms,
  });

  if (isLoading) {
    return (
      <AppLayout title="Farms">
        <LoadingState message="Loading farms..." />
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout title="Farms">
        <ErrorState
          title="Failed to load farms"
          message="Could not load farms list. Please try again."
        />
      </AppLayout>
    );
  }

  if (farms.length === 0) {
    return (
      <AppLayout title="Farms">
        <div className="p-6">
          <EmptyState
            title="No farms"
            description="No farms are registered in the system yet."
            icon={<MapPin size={48} />}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Farms" breadcrumb={[{ label: "Farms" }]}>
      <div className="space-y-6 p-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Farm Name
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody>
                {farms.map((farm) => (
                  <tr key={farm.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{farm.name}</td>
                    <td className="px-6 py-3">{farm.location}</td>
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
