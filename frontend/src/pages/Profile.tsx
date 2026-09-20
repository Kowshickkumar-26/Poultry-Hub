import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types/auth";
import FarmerProfilePage from "@/pages/farmer/FarmerProfilePage";
import CEOProfilePage from "@/pages/ceo/CEOProfilePage";

export default function ProfilePage() {
  const { user } = useAuth();

  if (user?.role === Role.CEO) {
    return <CEOProfilePage />;
  }

  return <FarmerProfilePage />;
}
