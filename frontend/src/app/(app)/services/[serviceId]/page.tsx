"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Server,
  Activity,
  FileText,
  GitBranch,
  RefreshCw,
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

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params?.serviceId as string;

  const [service, setService] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [traces, setTraces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"metrics" | "logs" | "traces">("metrics");

  const fetchData = async () => {
    if (!serviceId) return;
    setLoading(true);
    setError(null);

    try {
      const [sRes, mRes, lRes, tRes] = await Promise.all([
        apiClient<any>(`/services/${serviceId}`),
        apiClient<any>(`/services/${serviceId}/metrics`),
        apiClient<any>(`/services/${serviceId}/logs`),
        apiClient<any>(`/services/${serviceId}/traces`),
      ]);

      setService(sRes.data);
      setMetrics(mRes.data?.metrics);
      setLogs(lRes.data?.logs || []);
      setTraces(tRes.data?.traces || []);
    } catch (err: any) {
      setError(err.message || "Failed to load service detail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [serviceId]);

  if (loading && !service) return <LoadingSpinner message="Querying telemetry for service..." />;
  if (error && !service) return <ErrorAlert message={error} onRetry={fetchData} />;

  // Format metric chart series
  const reqData = (metrics?.request_rate?.points || []).map((p: any) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: p.value,
  }));

  const errData = (metrics?.error_rate?.points || []).map((p: any) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: Number((p.value * 100).toFixed(2)),
  }));

  const latData = (metrics?.p95_latency?.points || []).map((p: any) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: p.value,
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-500">
        <Link href="/services" className="hover:text-indigo-600 flex items-center">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Services
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-700">{service?.name}</span>
      </div>

      {/* Service Header Summary Bar */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{service?.name}</h2>
            <StatusBadge status={service?.health_status || "healthy"} />
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
              {service?.environment}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last observed: {new Date(service?.last_seen_at).toLocaleString()}</span>
            <span>•</span>
            <span>Namespace: {service?.namespace}</span>
          </p>
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Telemetry
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-6">
        <button
          onClick={() => setActiveTab("metrics")}
          className={`pb-3 text-xs font-semibold flex items-center space-x-1.5 transition-colors border-b-2 ${
            activeTab === "metrics"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Metrics & Performance</span>
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 text-xs font-semibold flex items-center space-x-1.5 transition-colors border-b-2 ${
            activeTab === "logs"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Recent Logs ({logs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("traces")}
          className={`pb-3 text-xs font-semibold flex items-center space-x-1.5 transition-colors border-b-2 ${
            activeTab === "traces"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Distributed Traces ({traces.length})</span>
        </button>
      </div>

      {/* Tab 1: Metrics */}
      {activeTab === "metrics" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Request Rate (req/s)
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reqData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "6px" }} />
                  <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Error Rate (%)
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={errData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "6px" }} />
                  <Line type="monotone" dataKey="value" stroke="#e11d48" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              p95 Latency (ms)
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "6px" }} />
                  <Line type="monotone" dataKey="value" stroke="#d97706" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Logs */}
      {activeTab === "logs" && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto space-y-1.5 max-h-[600px] overflow-y-auto">
            {logs.map((l) => (
              <div key={l.id} className="flex items-start space-x-3 hover:bg-slate-800 p-1 rounded">
                <span className="text-slate-500 select-none">{new Date(l.timestamp).toLocaleTimeString()}</span>
                <span
                  className={`font-semibold px-1 rounded text-[10px] ${
                    l.severity === "ERROR" || l.severity === "CRITICAL"
                      ? "bg-rose-900 text-rose-300"
                      : l.severity === "WARN"
                      ? "bg-amber-900 text-amber-300"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {l.severity}
                </span>
                <span className="flex-1">{l.message}</span>
                {l.trace_id && (
                  <span className="text-[10px] text-indigo-400 select-none">{l.trace_id}</span>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-slate-500 text-center py-8">No recent log entries observed.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Traces */}
      {activeTab === "traces" && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-5 py-3">Trace ID</th>
                <th className="px-5 py-3">Root Operation</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {traces.map((t) => (
                <tr key={t.trace_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-indigo-600">{t.trace_id}</td>
                  <td className="px-5 py-3">{t.root_operation}</td>
                  <td className="px-5 py-3 font-medium">{t.duration_ms} ms</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-5 py-3 text-slate-500">{new Date(t.start_time).toLocaleString()}</td>
                </tr>
              ))}
              {traces.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                    No distributed trace records available in selected time range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
