"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, RefreshCw, XCircle, AlertTriangle, ShieldAlert, CheckCircle2, Activity } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge, SeverityBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorAlert } from "@/components/common/UIStates";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (search.trim()) params.append("search", search.trim());
      if (severity) params.append("severity", severity);
      if (statusFilter) params.append("status", statusFilter);

      const res = await apiClient<any[]>(`/incidents?${params.toString()}`);
      setIncidents(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, severity, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchIncidents();
  };

  const handleClearFilters = () => {
    setSearch("");
    setSeverity("");
    setStatusFilter("");
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active & Resolved Incidents</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated anomaly detection alerts and RCA investigations across system services.
          </p>
        </div>
        <button
          onClick={fetchIncidents}
          className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Incidents</span>
            <AlertTriangle className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{total || incidents.length}</div>
          <div className="text-xs text-slate-500 mt-1">Recorded anomaly detections</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active & In-Flight</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {incidents.filter((i) => i.status !== "resolved" && i.status !== "closed").length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Open, Acknowledged or Investigating</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Critical Impact</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">
            {incidents.filter((i) => i.severity === "critical").length}
          </div>
          <div className="text-xs text-slate-500 mt-1">High-priority service anomalies</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved / Mitigated</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {incidents.filter((i) => i.status === "resolved" || i.status === "closed").length}
          </div>
          <div className="text-xs text-slate-500 mt-1">SLA restoration verified</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search incident ID, title, or service..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </form>

          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {(search || severity || statusFilter) && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-900">{incidents.length}</span> of {total} incidents
        </div>
      </div>

      {/* Incidents Table */}
      {error ? (
        <ErrorAlert message={error} onRetry={fetchIncidents} />
      ) : loading && incidents.length === 0 ? (
        <LoadingSpinner message="Querying incidents list..." />
      ) : incidents.length === 0 ? (
        <EmptyState
          title="No incidents found"
          description="No incidents match the active filters or search terms."
          actionLabel="Clear Filters"
          onAction={handleClearFilters}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Incident Summary</th>
                  <th className="px-5 py-3">Affected Service</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Detected At</th>
                  <th className="px-5 py-3">Detector</th>
                  <th className="px-5 py-3">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900 max-w-sm">
                      <Link href={`/incidents/${inc.id}`} className="text-indigo-600 hover:underline">
                        {inc.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono font-medium text-slate-800">
                      {inc.primary_service_name || "N/A"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(inc.detected_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      <code>{inc.detector_name}</code>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {inc.assigned_user_name || <span className="text-slate-400">Unassigned</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {incidents.length} of {total} incidents
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
