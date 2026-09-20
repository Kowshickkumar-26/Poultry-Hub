import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { Role } from "@/types/auth";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import UnauthorizedPage from "@/pages/Unauthorized";
import DashboardPage from "@/pages/Dashboard";
import ProfilePage from "@/pages/Profile";

// Farmer Pages
import FarmerFarmPage from "@/pages/farmer/FarmPage";
import FarmerBatchesPage from "@/pages/farmer/BatchesPage";
import FarmerDailyRecordsPage from "@/pages/farmer/DailyRecordsPage";
import FarmerFeedPage from "@/pages/farmer/FeedPage";
import FarmerVaccinesPage from "@/pages/farmer/VaccinesPage";
import FarmerSalesPage from "@/pages/farmer/SalesPage";
import FarmerExpensesPage from "@/pages/farmer/ExpensesPage";
import FarmerRemarksPage from "@/pages/farmer/RemarksPage";
import FarmerEndBatchPage from "@/pages/farmer/EndBatchPage";
import FarmerReportsPage from "@/pages/farmer/ReportsPage";
import FarmerHistoryPage from "@/pages/farmer/HistoryPage";
import FarmerAIAssistantPage from "@/pages/farmer/AIAssistantPage";
import FarmerProfilePage from "@/pages/farmer/FarmerProfilePage";

// CEO Pages
import CEOFarmersPage from "@/pages/ceo/FarmersPage";
import CEOFarmsPage from "@/pages/ceo/FarmsPage";
import CEOActiveBatchesPage from "@/pages/ceo/ActiveBatchesPage";
import CEOCompletedBatchesPage from "@/pages/ceo/CompletedBatchesPage";
import CEOReportsPage from "@/pages/ceo/ReportsPage";
import CEOAIAssistantPage from "@/pages/ceo/AIAssistantPage";
import CEOProfilePage from "@/pages/ceo/CEOProfilePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* General Protected Dashboard & Profile */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Farmer Routes */}
            <Route
              path="/farmer/profile"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/farm"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerFarmPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/batches"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerBatchesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/daily-records"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerDailyRecordsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/feed"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerFeedPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/vaccines"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerVaccinesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/sales"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerSalesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/expenses"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerExpensesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/remarks"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerRemarksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/end-batch"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerEndBatchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/reports"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/history"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/ai-assistant"
              element={
                <ProtectedRoute allowedRoles={[Role.FARMER, Role.CEO]}>
                  <FarmerAIAssistantPage />
                </ProtectedRoute>
              }
            />

            {/* CEO Routes */}
            <Route
              path="/ceo/profile"
              element={
                <ProtectedRoute allowedRoles={[Role.CEO]}>
                  <CEOProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ceo/farmers"
              element={
                <ProtectedRoute allowedRoles={[Role.CEO]}>
                  <CEOFarmersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ceo/farms"
              element={
                <ProtectedRoute allowedRoles={[Role.CEO]}>
                  <CEOFarmsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ceo/active-batches"
              element={
                <ProtectedRoute allowedRoles={[Role.CEO]}>
                  <CEOActiveBatchesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ceo/completed-batches"
              element={
                <ProtectedRoute allowedRoles={[Role.CEO]}>
                  <CEOCompletedBatchesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ceo/reports"
              element={
                <ProtectedRoute allowedRoles={[Role.CEO]}>
                  <CEOReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ceo/ai-assistant"
              element={
                <ProtectedRoute allowedRoles={[Role.CEO]}>
                  <CEOAIAssistantPage />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
