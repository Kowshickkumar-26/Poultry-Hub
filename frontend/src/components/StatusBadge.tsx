import { type BatchStatus } from "@/types/batch";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

interface StatusBadgeProps {
  status: BatchStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyle = (status: BatchStatus) => {
    switch (status) {
      case "ACTIVE":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          icon: CheckCircle2,
          label: "Active",
        };
      case "COMPLETED":
        return {
          bg: "bg-blue-100",
          text: "text-blue-800",
          icon: CheckCircle2,
          label: "Completed",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          icon: AlertCircle,
          label: "Unknown",
        };
    }
  };

  const { bg, text, icon: Icon, label } = getStatusStyle(status);

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
        bg,
        text,
        className
      )}
    >
      <Icon size={16} />
      {label}
    </span>
  );
}
