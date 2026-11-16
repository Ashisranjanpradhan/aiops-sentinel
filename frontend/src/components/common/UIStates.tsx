import React from "react";
import { AlertCircle, RefreshCw, FolderSearch } from "lucide-react";

export function LoadingSpinner({ message = "Loading data..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function EmptyState({
  title = "No data found",
  description = "No records match the selected criteria.",
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
        <FolderSearch className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1 mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-start p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
      <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 mr-3 shrink-0" />
      <div className="flex-1">
        <h4 className="text-sm font-semibold">Service Request Error</h4>
        <p className="text-sm text-rose-700 mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 px-3 py-1 bg-white border border-rose-300 text-rose-700 rounded text-xs font-medium hover:bg-rose-50"
        >
          Retry
        </button>
      )}
    </div>
  );
}
