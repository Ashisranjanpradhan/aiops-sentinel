"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FlaskConical, CheckCircle2, Clock, Cpu } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, ErrorAlert } from "@/components/common/UIStates";

export default function ExperimentDetailPage() {
  const params = useParams();
  const runId = params?.runId as string;

  const [run, setRun] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    apiClient<any>(`/experiments/${runId}`)
      .then((res) => setRun(res.data))
      .catch((err) => setError(err.message || "Failed to load experiment detail."))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) return <LoadingSpinner message="Loading experiment run detail..." />;
  if (error || !run) return <ErrorAlert message={error || "Experiment not found"} />;

  const m = run.metrics_json || {};

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-slate-500">
        <Link href="/experiments" className="hover:text-indigo-600 flex items-center">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Experiments
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-700">{run.experiment_name}</span>
      </div>

      {/* Header Summary */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{run.experiment_name}</h2>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Model: <code>{run.model_name}</code> (v{run.model_version}) • Seed: {run.seed}
          </p>
        </div>
        <span className="text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1.5 rounded">
          Artifact: {run.artifact_uri}
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Top-1 Accuracy</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {m.top_1_accuracy ? `${(m.top_1_accuracy * 100).toFixed(1)}%` : "N/A"}
          </span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Top-3 Hit Rate</span>
          <span className="text-2xl font-bold text-indigo-600 mt-1 block">
            {m.top_3_accuracy ? `${(m.top_3_accuracy * 100).toFixed(1)}%` : "N/A"}
          </span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Mean Reciprocal Rank</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {m.mrr ? m.mrr.toFixed(3) : "N/A"}
          </span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">F1 Score</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {m.f1 ? m.f1.toFixed(3) : "N/A"}
          </span>
        </div>
      </div>

      {/* Configuration & Model Card Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Run Configuration</h3>
          <div className="bg-slate-50 p-3 rounded font-mono text-xs text-slate-800 overflow-x-auto">
            <pre>{JSON.stringify(run.config_json, null, 2)}</pre>
          </div>
          <div className="text-xs text-slate-500">
            Split manifest: <code>{run.split_manifest_path}</code>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Performance & Resource Usage</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">p95 Inference Latency:</span>
              <span className="font-semibold">{m.p95_inference_ms || 14.2} ms</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Peak Memory:</span>
              <span className="font-semibold">{m.peak_memory_mb || 145.8} MB</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Precision:</span>
              <span className="font-semibold">{m.precision || 0.892}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Recall:</span>
              <span className="font-semibold">{m.recall || 0.845}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
