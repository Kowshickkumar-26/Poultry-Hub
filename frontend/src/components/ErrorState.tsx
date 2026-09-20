import { AlertCircle } from "lucide-react";
import { clsx } from "clsx";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-lg border border-red-300 bg-red-50 p-8 text-center",
        className
      )}
    >
      <AlertCircle className="mb-4 h-8 w-8 text-red-600" />
      <h3 className="text-lg font-semibold text-red-900">{title}</h3>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}
