import type { ReactNode } from "react";
import { clsx } from "clsx";

interface DashboardCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  highlight?: boolean;
}

export function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  children,
  className,
  highlight,
}: DashboardCardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md",
        highlight && "border-green-200 bg-green-50",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {value !== undefined && (
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          )}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          {children && <div className="mt-4">{children}</div>}
        </div>
        {icon && <div className="ml-4 text-gray-400">{icon}</div>}
      </div>
    </div>
  );
}
