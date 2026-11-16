"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, RefreshCw, XCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorAlert } from "@/components/common/UIStates";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination state
  const [search, setSearch] = useState("");
  const [environment, setEnvironment] = useState("");
  const [healthStatus, setHealthStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (search.trim()) params.append("search", search.trim());
      if (environment) params.append("environment", environment);
      if (healthStatus) params.append("health_status", healthStatus);

      const res = await apiClient<any[]>(`/services?${params.toString()}`);
      setServices(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load services list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Monitored Services</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Discover and inspect telemetry health across registered microservice workloads.
          </p>
        </div>
        <button
          onClick={fetchServices}
          className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={environment}
            onChange={(e) => {
              setEnvironment(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Health Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>

          {(search || environment || healthStatus) && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
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
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium">
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
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link href={`/services/${s.id}`} className="text-indigo-600 hover:underline">
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
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
                          {s.active_incidents_count} Active
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {services.length} of {total} services
            </div>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 py-1">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-700 disabled:opacity-40"
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
