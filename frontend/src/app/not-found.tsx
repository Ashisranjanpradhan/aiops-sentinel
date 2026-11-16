import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Resource Not Found</h2>
      <p className="text-sm text-slate-500 mt-1 mb-6 max-w-md">
        The requested resource identifier does not exist or may have been removed.
      </p>
      <Link
        href="/overview"
        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm"
      >
        Return to Overview
      </Link>
    </div>
  );
}
