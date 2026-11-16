"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GitCommit, RefreshCw, AlertCircle, Info, CheckCircle2, ShieldAlert, Layers } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorAlert } from "@/components/common/UIStates";

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeployments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any[]>("/deployments");
      setDeployments(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load deployment history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Deployment History & Correlation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit deployment releases and correlate incident timing with change events.
          </p>
        </div>
        <button
          onClick={fetchDeployments}
          className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Deployments</span>
            <GitCommit className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{deployments.length}</div>
          <div className="text-xs text-slate-500 mt-1">Recorded release lifecycle events</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Successful Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">100%</div>
          <div className="text-xs text-slate-500 mt-1">0 rollback operations executed</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Correlated Incidents</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {deployments.reduce((acc, d) => acc + (d.correlated_incidents_count || 0), 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Temporal association candidates</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Environment</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">Production</div>
          <div className="text-xs text-slate-500 mt-1">Kubernetes / ArgoCD sync active</div>
        </div>
      </div>

      {/* Scientific Caution Note (Section 7.3 H) */}
      <div className="flex items-start p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 mr-2 shrink-0" />
        <span>
          <strong>Scientific Principle:</strong> Temporal proximity between a deployment and an incident indicates correlation, not definitive causation. Always verify logs and trace error paths before rolling back.
        </span>
      </div>

      {/* Deployments Table */}
      {error ? (
        <ErrorAlert message={error} onRetry={fetchDeployments} />
      ) : loading && deployments.length === 0 ? (
        <LoadingSpinner message="Loading deployment records..." />
      ) : deployments.length === 0 ? (
        <EmptyState title="No deployments recorded" description="No recent service deployment events recorded." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-5 py-3">Deployment ID</th>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Environment</th>
                <th className="px-5 py-3">Commit</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Completed At</th>
                <th className="px-5 py-3">Correlated Incidents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {deployments.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-slate-900 font-mono">{d.deployment_id}</td>
                  <td className="px-5 py-3 font-medium text-indigo-600">
                    <Link href={`/services/${d.service_id}`} className="hover:underline">
                      {d.service_name || d.service_id}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-mono">{d.environment}</td>
                  <td className="px-5 py-3 font-mono text-slate-500">{d.commit_id}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-5 py-3 text-slate-500">{new Date(d.started_at).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    {d.correlated_incidents_count > 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
                        {d.correlated_incidents_count} Correlated
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
      )}
    </div>
  );
}
