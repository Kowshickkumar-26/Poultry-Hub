import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { SidebarToggle } from "@/components/Sidebar";
import { ProfileModal } from "@/components/ProfileModal";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Role } from "@/types/auth";
import {
  User,
  LogOut,
  ChevronDown,
  Shield,
  LayoutDashboard,
  Building2,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  title: string;
  breadcrumb?: { label: string; href?: string }[];
  onSidebarToggle: () => void;
}

export function TopBar({
  title,
  breadcrumb,
  onSidebarToggle,
}: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCEO = user?.role === Role.CEO;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login");
  };

  const openProfile = () => {
    setDropdownOpen(false);
    setProfileModalOpen(true);
  };

  const goToProfilePage = () => {
    setDropdownOpen(false);
    navigate(isCEO ? "/ceo/profile" : "/farmer/profile");
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3 sm:gap-4">
            <SidebarToggle onClick={onSidebarToggle} />
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">{title}</h1>
              {breadcrumb && breadcrumb.length > 0 && (
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  {breadcrumb.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      {index > 0 && <span className="text-slate-300">/</span>}
                      {item.href ? (
                        <a href={item.href} className="hover:text-emerald-700 transition-colors font-medium">
                          {item.label}
                        </a>
                      ) : (
                        <span>{item.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Real-time Notification Dropdown */}
            <NotificationDropdown />

            {/* User Profile Trigger & Dropdown Menu */}
            <div className="relative border-l border-slate-200 pl-3 sm:pl-4" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 rounded-xl p-1.5 text-left transition-all hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                aria-label="User profile menu"
                aria-expanded={dropdownOpen}
              >
                <div className="hidden text-right md:block">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">
                    {user?.name || "User"}
                  </p>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    <p className="text-xs font-medium text-emerald-700">{user?.role || "FARMER"}</p>
                  </div>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-xs font-bold text-sm ring-2 ring-emerald-500/20">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User size={18} />}
                </div>

                <ChevronDown
                  size={15}
                  className={`text-slate-400 transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180 text-emerald-700" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 z-30">
                  {/* User Info Header */}
                  <div className="rounded-xl bg-slate-50 p-3 mb-1">
                    <p className="font-bold text-sm text-slate-900 truncate">{user?.name || "User"}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <Shield size={10} />
                        {user?.role || "FARMER"}
                      </span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="space-y-0.5">
                    <button
                      onClick={openProfile}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                    >
                      <User size={15} className="text-emerald-600" />
                      <span>View Profile Details</span>
                    </button>

                    <button
                      onClick={goToProfilePage}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      {isCEO ? (
                        <Users size={15} className="text-teal-600" />
                      ) : (
                        <Building2 size={15} className="text-teal-600" />
                      )}
                      <span>Dedicated Profile Page</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate("/dashboard");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <LayoutDashboard size={15} className="text-blue-600" />
                      <span>Dashboard</span>
                    </button>

                    <div className="my-1 border-t border-slate-100"></div>

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut size={15} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Logout Button */}
            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Interactive Profile Modal */}
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </>
  );
}
