"use client";

import React, { useState, useEffect } from "react";
import { Bell, RefreshCw, Plus, Trash2, CheckCircle2, ShieldAlert, Activity, Server } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { SeverityBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorAlert } from "@/components/common/UIStates";

export default function AlertRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [service, setService] = useState("checkout");
  const [metric, setMetric] = useState("error_rate");
  const [threshold, setThreshold] = useState("0.05");
  const [severity, setSeverity] = useState("high");
  const [interval, setInterval] = useState("60");
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any[]>("/alert-rules");
      setRules(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load alert rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleEnabled = async (ruleId: string, currentEnabled: boolean) => {
    try {
      await apiClient(`/alert-rules/${ruleId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_enabled: !currentEnabled }),
      });
      await fetchRules();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this alert rule policy?")) return;
    try {
      await apiClient(`/alert-rules/${ruleId}`, { method: "DELETE" });
      await fetchRules();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient("/alert-rules", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          service_scope_json: [service],
          condition_json: { metric: metric, operator: ">", threshold: parseFloat(threshold) },
          severity: severity,
          evaluation_interval_seconds: parseInt(interval, 10),
          is_enabled: true,
        }),
      });
      setShowModal(false);
      setName("");
      setDescription("");
      await fetchRules();
    } catch (err: any) {
      alert(`Creation failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Alert Rule Policies</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure threshold and detector evaluation triggers that spawn system incidents.
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Alert Rule
          </button>
          <button
            onClick={fetchRules}
            className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Policies</span>
            <Bell className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{rules.length}</div>
          <div className="text-xs text-slate-500 mt-1">Configured detection triggers</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Evaluators</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {rules.filter((r) => r.is_enabled).length} Enabled
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {rules.filter((r) => !r.is_enabled).length} disabled policies
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Critical Triggers</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">
            {rules.filter((r) => r.severity === "critical").length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Immediate pager duty alerts</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Evaluation Rate</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">60s</div>
          <div className="text-xs text-slate-500 mt-1">Periodic background workers</div>
        </div>
      </div>

      {/* Rules Table */}
      {error ? (
        <ErrorAlert message={error} onRetry={fetchRules} />
      ) : loading && rules.length === 0 ? (
        <LoadingSpinner message="Querying alert rules..." />
      ) : rules.length === 0 ? (
        <EmptyState title="No alert rules found" description="Create an alert rule policy to monitor service health." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-5 py-3">Rule Name</th>
                <th className="px-5 py-3">Service Scope</th>
                <th className="px-5 py-3">Condition</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Interval</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-slate-900">
                    <div>{r.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{r.description}</div>
                  </td>
                  <td className="px-5 py-3 font-mono">{r.service_scope_json?.join(", ") || "All"}</td>
                  <td className="px-5 py-3 font-mono text-slate-800">
                    {r.condition_json?.metric} {r.condition_json?.operator} {r.condition_json?.threshold}
                  </td>
                  <td className="px-5 py-3">
                    <SeverityBadge severity={r.severity} />
                  </td>
                  <td className="px-5 py-3 text-slate-500">{r.evaluation_interval_seconds}s</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggleEnabled(r.id, r.is_enabled)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        r.is_enabled
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {r.is_enabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Creating Rule */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create Alert Rule</h3>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block text-slate-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. High Payment Latency"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief explanation of policy..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block text-slate-700 mb-1">Service Scope</label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-800"
                  >
                    <option value="checkout">checkout</option>
                    <option value="payment">payment</option>
                    <option value="frontend">frontend</option>
                    <option value="shipping">shipping</option>
                    <option value="auth">auth</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block text-slate-700 mb-1">Metric</label>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-800"
                  >
                    <option value="error_rate">error_rate</option>
                    <option value="p95_latency">p95_latency</option>
                    <option value="request_rate">request_rate</option>
                    <option value="cpu_utilization">cpu_utilization</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block text-slate-700 mb-1">Threshold</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-semibold block text-slate-700 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-800"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block text-slate-700 mb-1">Interval (s)</label>
                  <input
                    type="number"
                    required
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
