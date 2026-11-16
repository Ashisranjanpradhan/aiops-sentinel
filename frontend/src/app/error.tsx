"use client";

import React, { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("UI Uncaught Error Boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-600 mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Application Error</h2>
      <p className="text-sm text-slate-500 mt-1 mb-6 max-w-md">
        An unexpected error interrupted this view. You can safely retry or return to the overview page.
      </p>
      <div className="flex space-x-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm"
        >
          Try Again
        </button>
        <button
          onClick={() => (window.location.href = "/overview")}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50"
        >
          Go to Overview
        </button>
      </div>
    </div>
  );
}
