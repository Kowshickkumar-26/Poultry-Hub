import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  description?: string;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "success";
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          icon: <AlertTriangle className="h-6 w-6 text-rose-600" />,
          iconBg: "bg-rose-100 ring-8 ring-rose-50",
          button: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500",
        };
      case "success":
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />,
          iconBg: "bg-emerald-100 ring-8 ring-emerald-50",
          button: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs focus:ring-emerald-500",
        };
      default:
        return {
          icon: <HelpCircle className="h-6 w-6 text-emerald-600" />,
          iconBg: "bg-emerald-100 ring-8 ring-emerald-50",
          button: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs focus:ring-emerald-500",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}>
            {styles.icon}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {description}
              </p>
            )}
          </div>
        </div>

        {children && <div className="mt-4 border-t border-slate-100 pt-4">{children}</div>}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {cancelText}
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${styles.button}`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
