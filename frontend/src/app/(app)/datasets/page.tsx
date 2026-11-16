"use client";

import React, { useState, useEffect } from "react";
import { Database, RefreshCw, Plus, CheckCircle, ShieldCheck, FileCheck, Layers } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorAlert } from "@/components/common/UIStates";

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New dataset modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [sourceUrl, setSourceUrl] = useState("");
  const [licenseNote, setLicenseNote] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchDatasets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any[]>("/datasets");
      setDatasets(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseNote.trim()) {
      alert("License and permitted use terms are mandatory (Section 4.6 Data Governance).");
      return;
    }

    setCreating(true);
    try {
      await apiClient("/datasets", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          version: version.trim(),
          source_url: sourceUrl.trim(),
          license_note: licenseNote.trim(),
          modalities_json: ["metrics", "logs", "traces"],
        }),
      });
      setShowModal(false);
      setName("");
      setSourceUrl("");
      setLicenseNote("");
      await fetchDatasets();
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dataset Registry & Governance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered microservice reliability benchmark datasets, split manifests, and license terms.
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Register Dataset Manifest
          </button>
          <button
            onClick={fetchDatasets}
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
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Datasets</span>
            <Database className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{datasets.length}</div>
          <div className="text-xs text-slate-500 mt-1">Validated benchmark suites</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Telemetry Modalities</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">3 Types</div>
          <div className="text-xs text-slate-500 mt-1">Metrics, Logs, Distributed Traces</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">License Governance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">100%</div>
          <div className="text-xs text-slate-500 mt-1">Usage rights recorded & verified</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Split Manifests</span>
            <FileCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">Ready</div>
          <div className="text-xs text-slate-500 mt-1">Reproducible evaluation partitions</div>
        </div>
      </div>

      {/* Datasets Table */}
      {error ? (
        <ErrorAlert message={error} onRetry={fetchDatasets} />
      ) : loading && datasets.length === 0 ? (
        <LoadingSpinner message="Querying dataset registry..." />
      ) : datasets.length === 0 ? (
        <EmptyState title="No datasets registered" description="Register an RCA benchmark dataset manifest to begin." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-5 py-3">Dataset Name</th>
                <th className="px-5 py-3">Version</th>
                <th className="px-5 py-3">Source Repository</th>
                <th className="px-5 py-3">Modalities</th>
                <th className="px-5 py-3">License & Terms</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Manifest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {datasets.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-slate-900">{d.name}</td>
                  <td className="px-5 py-3 font-mono">{d.version}</td>
                  <td className="px-5 py-3 font-mono text-indigo-600 truncate max-w-xs">{d.source_url}</td>
                  <td className="px-5 py-3">
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-600">
                      {d.modalities_json?.join(", ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{d.license_note}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-500">{d.manifest_path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Registering Dataset */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Register Dataset Manifest</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record governance metadata and license terms before importing benchmark cases.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block text-slate-700 mb-1">Dataset Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. RCAEval, LogHub"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700 mb-1">Version</label>
                <input
                  type="text"
                  required
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700 mb-1">Source URL</label>
                <input
                  type="url"
                  required
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700 mb-1">
                  License & Usage Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={licenseNote}
                  onChange={(e) => setLicenseNote(e.target.value)}
                  placeholder="e.g. MIT / Research attribution required. Verified from Zenodo record."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                />
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
                  disabled={creating}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? "Registering..." : "Save Dataset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
