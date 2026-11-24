import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types/auth";
import {
  LayoutDashboard,
  MapPin,
  FileSpreadsheet,
  MessageSquare,
  StopCircle,
  History,
  Bot,
  LogOut,
  Menu,
  X,
  Layers,
  Users,
  CheckCircle2,
  BarChart3,
  User as UserIcon,
  Package,
  IndianRupee,
  Receipt,
  Syringe,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { clsx } from "clsx";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isFarmer = user?.role === Role.FARMER;

  const farmerNavItems = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "Profile", href: "/farmer/profile", icon: UserIcon },
    { label: "My Farm", href: "/farmer/farm", icon: MapPin },
    { label: "Data Insertion", href: "/farmer/daily-records", icon: FileSpreadsheet },
    { label: "Feed", href: "/farmer/feed", icon: Package },
    { label: "Vaccines", href: "/farmer/vaccines", icon: Syringe },
    { label: "Expenses", href: "/farmer/expenses", icon: Receipt },
    { label: "Sales", href: "/farmer/sales", icon: IndianRupee },
    { label: "Reports", href: "/farmer/reports", icon: BarChart3 },
    { label: "Remarks", href: "/farmer/remarks", icon: MessageSquare },
    { label: "End Batch", href: "/farmer/end-batch", icon: StopCircle },
    { label: "View History", href: "/farmer/history", icon: History },
    { label: "AI Assistant", href: "/farmer/ai-assistant", icon: Bot },
  ];

  const ceoNavItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Profile", href: "/ceo/profile", icon: UserIcon },
    { label: "Farmers", href: "/ceo/farmers", icon: Users },
    { label: "Farms", href: "/ceo/farms", icon: MapPin },
    { label: "Active Batches", href: "/ceo/active-batches", icon: CheckCircle2 },
    { label: "Completed Batches", href: "/ceo/completed-batches", icon: History },
    { label: "Reports", href: "/ceo/reports", icon: BarChart3 },
    { label: "AI Assistant", href: "/ceo/ai-assistant", icon: Bot },
  ];

  const navItems = isFarmer ? farmerNavItems : ceoNavItems;
  const isActive = (href: string) => location.pathname === href;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed left-0 top-0 z-30 flex h-screen w-64 flex-col bg-gradient-to-b from-green-800 via-green-900 to-slate-900 text-white shadow-xl transition-all duration-300",
          "md:relative md:z-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="border-b border-green-700/50 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">PoultryMgmt</h1>
                <p className="text-xs font-medium text-emerald-300/80">Smart Farm Hub</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-green-200 hover:bg-white/10 md:hidden"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    onClose?.();
                  }}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-400/30"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={19} className={clsx(active ? "text-white" : "text-emerald-400")} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-green-700/50 px-3 py-4 space-y-2">
          <button
            onClick={() => {
              navigate(isFarmer ? "/farmer/profile" : "/ceo/profile");
              onClose?.();
            }}
            className="w-full text-left rounded-xl bg-white/5 p-3 ring-1 ring-white/10 transition-colors hover:bg-white/10 focus:outline-none"
            title="Click to view full profile"
          >
            <div className="flex items-center justify-between">
              <p className="truncate text-sm font-semibold text-white">{user?.name || "Farmer"}</p>
              <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold">Profile →</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                {user?.role || "FARMER"}
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[120px]">{user?.email}</span>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 hover:text-rose-100"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
    >
      <Menu size={24} />
    </button>
  );
}
