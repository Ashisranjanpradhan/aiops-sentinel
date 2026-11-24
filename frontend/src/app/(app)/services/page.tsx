"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, RefreshCw, XCircle, Server, CheckCircle2, AlertTriangle, Activity } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorAlert } from "@/components/common/UIStates";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination state
  const [search, setSearch] = useState("");
  const [environment, setEnvironment] = useState("");
  const [healthStatus, setHealthStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchServices = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else if (services.length === 0) {
      setLoading(true);
    }
    setError(null);

    const minDelay = isManual ? new Promise((r) => setTimeout(r, 450)) : Promise.resolve();

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (search.trim()) params.append("search", search.trim());
      if (environment) params.append("environment", environment);
      if (healthStatus) params.append("health_status", healthStatus);

      const [res] = await Promise.all([
        apiClient<any[]>(`/services?${params.toString()}`),
        minDelay,
      ]);
      setServices(res.data || []);
      setTotal(res.meta?.total || 0);
      if (isManual) {
        setRefreshToast(true);
        setTimeout(() => setRefreshToast(false), 2400);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load services list.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServices(false);
  }, [page, environment, healthStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchServices();
  };

  const handleClearFilters = () => {
    setSearch("");
    setEnvironment("");
    setHealthStatus("");
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Monitored Services</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Discover and inspect telemetry health across registered microservice workloads.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {refreshToast && (
            <span className="inline-flex items-center text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
              Refreshed
            </span>
          )}

          <button
            type="button"
            onClick={() => fetchServices(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm disabled:opacity-60 cursor-pointer active:scale-95 transition-all"
            aria-label="Refresh services telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Services</span>
            <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{total || services.length}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Discovered workloads</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Healthy Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {services.filter((s) => s.health_status === "healthy").length}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Operating within SLA limits</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Degraded / Critical</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">
            {services.filter((s) => s.health_status === "critical" || s.health_status === "warning").length}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Requiring SRE investigation</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Incidents</span>
            <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {services.reduce((acc, s) => acc + (s.active_incidents_count || 0), 0)}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Correlated anomalies</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search service name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </form>

          <select
            value={environment}
            onChange={(e) => {
              setEnvironment(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>

          <select
            value={healthStatus}
            onChange={(e) => {
              setHealthStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Health Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>

          {(search || environment || healthStatus) && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center space-x-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400">
          Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{services.length}</span> of {total} services
        </div>
      </div>

      {/* Main Services Table */}
      {error ? (
        <ErrorAlert message={error} onRetry={fetchServices} />
      ) : loading && services.length === 0 ? (
        <LoadingSpinner message="Loading services list..." />
      ) : services.length === 0 ? (
        <EmptyState
          title="No services match your filters"
          description="Try clearing search filters or checking service registration."
          actionLabel="Clear Filters"
          onAction={handleClearFilters}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium">
                <tr>
                  <th className="px-5 py-3">Service Name</th>
                  <th className="px-5 py-3">Environment</th>
                  <th className="px-5 py-3">Health Status</th>
                  <th className="px-5 py-3">Request Rate</th>
                  <th className="px-5 py-3">p95 Latency</th>
                  <th className="px-5 py-3">Error Rate</th>
                  <th className="px-5 py-3">Active Incidents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <Link href={`/services/${s.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono">{s.environment}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={s.health_status} />
                    </td>
                    <td className="px-5 py-3">{s.request_rate} req/s</td>
                    <td className="px-5 py-3">{s.p95_latency_ms} ms</td>
                    <td className="px-5 py-3">{(s.error_rate * 100).toFixed(2)}%</td>
                    <td className="px-5 py-3">
                      {s.active_incidents_count > 0 ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                          {s.active_incidents_count} Active
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div>
              Showing {services.length} of {total} services
            </div>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 py-1">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
