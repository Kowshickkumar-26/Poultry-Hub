import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types/auth";
import FarmerDashboard from "@/pages/farmer/FarmerDashboard";
import CEODashboard from "@/pages/ceo/CEODashboard";

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === Role.CEO) {
    return <CEODashboard />;
  }

  return <FarmerDashboard />;
}
