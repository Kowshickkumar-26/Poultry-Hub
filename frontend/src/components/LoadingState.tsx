import { clsx } from "clsx";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center space-y-4 py-12",
        className
      )}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-green-600"></div>
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
}
