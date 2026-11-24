"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Inbox,
  Settings,
  Server,
  Activity,
  FileCode2,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { LoadingSpinner, ErrorAlert } from "@/components/common/UIStates";

export default function AdminConsolePage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enquiryCount, setEnquiryCount] = useState<number>(0);
  const [metadata, setMetadata] = useState<any | null>(null);
  const [sources, setSources] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient<any>("/auth/me")
      .then((res) => {
        if (res.data) {
          setCurrentUser(res.data);
          if (res.data.role !== "admin") {
            setError("Access Restricted: This dashboard requires Administrator privileges.");
            setLoading(false);
            return;
          }

          // Fetch admin metadata
          Promise.all([
            apiClient<any[]>("/contact/enquiries").catch(() => ({ data: [] })),
            apiClient<any>("/meta").catch(() => ({ data: null })),
            apiClient<any>("/settings/sources").catch(() => ({ data: null })),
          ]).then(([enqRes, metaRes, srcRes]) => {
            if (enqRes.data) setEnquiryCount(enqRes.data.length);
            if (metaRes.data) setMetadata(metaRes.data);
            if (srcRes.data) setSources(srcRes.data);
            setLoading(false);
          });
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to authenticate administrator session.");
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingSpinner message="Verifying administrator security boundaries..." />;

  if (error || currentUser?.role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/50 rounded-full flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Access Restricted
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {error || "Your current account role does not have administrative authorization."}
          </p>
          <div className="pt-2">
            <Link
              href="/overview"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              Return to Operator Console
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Superuser Clearance
            </span>
            <span className="text-xs text-slate-500 font-mono">ID: {currentUser?.id?.slice(0, 8)}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
            Administrator Governance & Operations Console
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage public inbound contact inquiries, evaluate platform telemetry sources, and review RBAC boundaries.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/settings/enquiries"
            className="inline-flex items-center px-3.5 py-2 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Inbox className="w-3.5 h-3.5 mr-1.5" />
            <span>Manage Enquiries ({enquiryCount})</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 font-medium">Inbound Enquiries</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{enquiryCount}</div>
          <div className="text-[11px] text-slate-400">Public contact form submissions</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 font-medium">Platform Version</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
            v{metadata?.version || "1.0.0"}
          </div>
          <div className="text-[11px] text-slate-400">Environment: {metadata?.environment || "production"}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 font-medium">RBAC Role Hierarchy</span>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            viewer &lt; analyst &lt; operator &lt; admin
          </div>
          <div className="text-[11px] text-slate-400">Full superuser overrides enabled</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 font-medium">Active Telemetry Backends</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {sources ? Object.keys(sources).length : 4}
          </div>
          <div className="text-[11px] text-slate-400">Prometheus, Loki, Tempo, OTel</div>
        </div>
      </div>

      {/* Admin Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/settings/enquiries"
          className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 dark:hover:border-indigo-400 transition-all group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              Inbound Inquiries Triage
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Inspect submitted enterprise contact inquiries, review client IP address metadata, and append internal investigation notes.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>Open Inquiries Panel</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/settings"
          className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 dark:hover:border-indigo-400 transition-all group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              Telemetry Sources & Connections
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Verify real-time connectivity states for Prometheus metrics scrapers, Grafana Loki log streams, and Tempo distributed traces.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>Inspect Data Sources</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/deployments"
          className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 dark:hover:border-indigo-400 transition-all group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              DeployGuard Delivery Risk Gates
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Review microservice deployment releases, automated preflight check results, and blast-radius anomaly correlation.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400">
            <span>Open Delivery Gates</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
