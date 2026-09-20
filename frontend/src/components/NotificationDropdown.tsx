import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/api/notifications";
import type { NotificationDto } from "@/types/notification";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Package,
  Calendar,
  FileText,
  ExternalLink,
} from "lucide-react";

export function NotificationDropdown() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: 30000, // Poll every 30 seconds for live alerts
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (n: NotificationDto) => {
    if (!n.read) {
      markReadMutation.mutate(n.id);
    }
    setIsOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const getNotificationIcon = (n: NotificationDto) => {
    if (n.category === "FEED") {
      return <Package className="h-4 w-4 text-amber-600" />;
    }
    if (n.category === "DAILY_RECORD") {
      return <Calendar className="h-4 w-4 text-blue-600" />;
    }
    if (n.severity === "CRITICAL") {
      return <AlertCircle className="h-4 w-4 text-rose-600" />;
    }
    if (n.severity === "WARNING") {
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    }
    if (n.severity === "SUCCESS") {
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    }
    if (n.type === "BATCH_COMPLETED") {
      return <FileText className="h-4 w-4 text-teal-600" />;
    }
    return <Info className="h-4 w-4 text-indigo-600" />;
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "WARNING":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "SUCCESS":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        className={`relative rounded-xl p-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
          isOpen
            ? "bg-slate-100 text-slate-900"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
        aria-label="Notifications menu"
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white shadow-md ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 origin-top-right rounded-2xl border border-slate-200/90 bg-white p-0 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 z-40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  {unreadCount} new
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  All caught up
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors disabled:opacity-50"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-800">No Notifications</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
                  All batch operations, feed inventory, and daily records are currently on track.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative flex cursor-pointer gap-3 p-3.5 transition-colors hover:bg-slate-50/90 ${
                    !n.read ? "bg-emerald-50/30" : ""
                  }`}
                >
                  {/* Icon avatar */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      !n.read ? "border-emerald-200 bg-white shadow-xs" : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    {getNotificationIcon(n)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-bold truncate ${!n.read ? "text-slate-900" : "text-slate-700"}`}>
                        {n.title}
                      </p>
                      <span className={`inline-block rounded-md border px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider ${getSeverityBadgeClass(n.severity)}`}>
                        {n.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{n.batchCode ? `Flock ${n.batchCode}` : "System"}</span>
                      {n.link && (
                        <span className="flex items-center gap-0.5 text-emerald-700 font-medium group-hover:underline">
                          View details <ExternalLink size={10} />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unread indicator dot */}
                  {!n.read && (
                    <div className="flex items-center">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0"></span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
