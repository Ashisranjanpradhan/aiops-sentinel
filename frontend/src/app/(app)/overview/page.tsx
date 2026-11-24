"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Server,
  AlertTriangle,
  Activity,
  CheckCircle2,
  RefreshCw,
  Database,
  ArrowRight,
  Clock,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge, SeverityBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, ErrorAlert } from "@/components/common/UIStates";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function OverviewPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshToast, setRefreshToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else if (!data) {
      setLoading(true);
    }
    setError(null);

    const minDelay = isManual ? new Promise((r) => setTimeout(r, 450)) : Promise.resolve();

    try {
      const [res] = await Promise.all([
        apiClient<any>("/overview/summary"),
        minDelay,
      ]);
      setData(res.data);
      setLastUpdated(new Date());
      if (isManual) {
        setRefreshToast(true);
        setTimeout(() => setRefreshToast(false), 2400);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load platform overview.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview(false);
  }, []);

  if (loading && !data) return <LoadingSpinner message="Aggregating observability summary..." />;
  if (error && !data) return <ErrorAlert message={error} onRetry={() => fetchOverview(false)} />;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">System Reliability Overview</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex items-center space-x-2">
            <span>Real-time health status, active incidents, and telemetry backends.</span>
            {lastUpdated && (
              <>
                <span>•</span>
                <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px] flex items-center">
                  <Clock className="w-3 h-3 mr-1 text-slate-500 dark:text-slate-400" />
                  Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {refreshToast && (
            <span className="inline-flex items-center text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-md animate-fade-in shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
              Refreshed
            </span>
          )}

          <button
            type="button"
            onClick={() => fetchOverview(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs disabled:opacity-60 cursor-pointer active:scale-95 transition-all"
            aria-label="Refresh overview telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`} />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Monitored Services</span>
            <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data?.total_services || 0}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-2 flex items-center space-x-2">
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">{data?.healthy_services} healthy</span>
            <span>•</span>
            <span className="text-amber-700 dark:text-amber-400 font-medium">{data?.warning_services} warning</span>
            <span>•</span>
            <span className="text-rose-700 dark:text-rose-400 font-medium">{data?.critical_services} critical</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Incidents</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data?.active_incidents_count || 0}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-2 flex items-center space-x-2">
            <span className="text-rose-700 dark:text-rose-400 font-semibold">{data?.critical_incidents_count} Critical</span>
            <span>•</span>
            <span className="text-amber-700 dark:text-amber-400 font-medium">{data?.high_incidents_count} High</span>
            <span>•</span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">{data?.medium_incidents_count} Medium</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Telemetry Backends</span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">Active</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-2 flex items-center space-x-2">
            {data?.telemetry_sources?.map((s: any) => (
              <span key={s.name} className="capitalize font-medium">
                {s.name}: <span className={s.status === "healthy" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}>{s.status}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">RCA Engine</span>
            <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">Multi-Modal</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            Topology-aware ranker active
          </div>
        </div>
      </div>

      {/* Anomaly Trend Chart */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Anomaly & Incident Trend (Last 24 Hours)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.anomaly_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", fontSize: "12px", borderRadius: "6px", color: "var(--text-primary)" }}
              />
              <Line type="monotone" dataKey="anomalies" name="Detected Anomalies" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="incidents" name="Incidents Created" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Split Tables: Service Health & Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Health Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Service Inventory & Health</h3>
            <Link href="/services" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center">
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Service</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">p95 Latency</th>
                  <th className="px-4 py-2.5">Error Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {data?.service_health_summary?.slice(0, 6).map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                      <Link href={`/services/${s.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={s.health_status} />
                    </td>
                    <td className="px-4 py-2.5 font-medium">{s.p95_latency_ms} ms</td>
                    <td className="px-4 py-2.5 font-medium">{(s.error_rate * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Incidents Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Active Incidents</h3>
            <Link href="/incidents" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center">
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5">Incident Title</th>
                  <th className="px-4 py-2.5">Service</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {data?.recent_incidents?.map((inc: any) => (
                  <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                      <Link href={`/incidents/${inc.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                        {inc.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">{inc.primary_service_name || "N/A"}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={inc.status} />
                    </td>
                  </tr>
                ))}
                {(!data?.recent_incidents || data.recent_incidents.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                      No active incidents. Systems operating normally.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
