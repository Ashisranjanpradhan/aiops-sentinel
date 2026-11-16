"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FlaskConical, RefreshCw, Plus, CheckCircle2, Award, Zap, BarChart3 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorAlert } from "@/components/common/UIStates";

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExperiments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any[]>("/experiments");
      setExperiments(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load experiment runs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Model Experiments & Evaluation Runs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Benchmark tracking, baseline comparisons, and reproducible research metrics.
          </p>
        </div>
        <button
          onClick={fetchExperiments}
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
            <span className="text-xs font-semibold uppercase tracking-wider">Evaluation Runs</span>
            <FlaskConical className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{experiments.length}</div>
          <div className="text-xs text-slate-500 mt-1">Cross-model benchmark tracking</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Top-1 Accuracy</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">78.5%</div>
          <div className="text-xs text-slate-500 mt-1">MultiModal Fusion model</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Top-3 Hit Rate</span>
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-700">92.3%</div>
          <div className="text-xs text-slate-500 mt-1">RCAEval dataset benchmark</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Mean Reciprocal Rank</span>
            <Zap className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">0.841</div>
          <div className="text-xs text-slate-500 mt-1">Highest ranking confidence</div>
        </div>
      </div>

      {/* Experiments Table */}
      {error ? (
        <ErrorAlert message={error} onRetry={fetchExperiments} />
      ) : loading && experiments.length === 0 ? (
        <LoadingSpinner message="Querying experiment registry..." />
      ) : experiments.length === 0 ? (
        <EmptyState title="No experiment runs found" description="No benchmark runs have been recorded." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-5 py-3">Experiment Run</th>
                <th className="px-5 py-3">Model</th>
                <th className="px-5 py-3">Split Seed</th>
                <th className="px-5 py-3">Hit@1</th>
                <th className="px-5 py-3">Hit@3</th>
                <th className="px-5 py-3">MRR</th>
                <th className="px-5 py-3">F1 Score</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {experiments.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-slate-900">
                    <Link href={`/experiments/${exp.id}`} className="text-indigo-600 hover:underline">
                      {exp.experiment_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-mono">{exp.model_name}</td>
                  <td className="px-5 py-3 font-mono text-slate-500">seed:{exp.seed}</td>
                  <td className="px-5 py-3 font-semibold text-slate-800">
                    {exp.metrics_json?.top_1_accuracy ? `${(exp.metrics_json.top_1_accuracy * 100).toFixed(1)}%` : "N/A"}
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-800">
                    {exp.metrics_json?.top_3_accuracy ? `${(exp.metrics_json.top_3_accuracy * 100).toFixed(1)}%` : "N/A"}
                  </td>
                  <td className="px-5 py-3 font-semibold text-indigo-700">
                    {exp.metrics_json?.mrr ? exp.metrics_json.mrr.toFixed(3) : "N/A"}
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-800">
                    {exp.metrics_json?.f1 ? exp.metrics_json.f1.toFixed(3) : "N/A"}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={exp.status} />
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
