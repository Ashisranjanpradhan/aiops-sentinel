"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Settings, CheckCircle2, ShieldCheck, RefreshCw, Server, AlertCircle, Mail, ArrowRight } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, ErrorAlert } from "@/components/common/UIStates";

export default function SettingsPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [meta, setMeta] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [srcRes, metaRes] = await Promise.all([
        apiClient<any[]>("/settings/sources"),
        apiClient<any>("/meta"),
      ]);
      setSources(srcRes.data || []);
      setMeta(metaRes.data);
    } catch (err: any) {
      setError(err.message || "Failed to load platform settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading && !meta) return <LoadingSpinner message="Checking platform configuration..." />;
  if (error && !meta) return <ErrorAlert message={error} onRetry={fetchSettings} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Configuration & Integrations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Observability backends connectivity, security boundaries, and telemetry adapters.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Verify Backends
        </button>
      </div>

      {/* Telemetry Sources Connectivity */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Server className="w-4 h-4 text-indigo-600" />
          <span>Observability Backend Connections</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sources.map((src) => (
            <div key={src.name} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900 text-sm">{src.name}</span>
                <StatusBadge status={src.status} />
              </div>
              <div className="text-xs text-slate-500">
                <div className="flex justify-between py-0.5">
                  <span>Type:</span>
                  <span className="font-mono capitalize text-slate-700">{src.type}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Latency:</span>
                  <span className="font-semibold text-slate-700">{src.latency_ms ? `${src.latency_ms.toFixed(1)} ms` : "N/A"}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Endpoint:</span>
                  <span className="font-mono text-slate-400">{src.endpoint}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">{src.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detection & Data Policy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Anomaly Detection Sensitivity */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Settings className="w-4 h-4 text-indigo-600" />
            <span>Detection & Inference Parameters</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Robust Z-Score Threshold:</span>
              <span className="font-mono font-semibold text-slate-800">3.5 MAD</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">EWMA Smoothing Factor (α):</span>
              <span className="font-mono font-semibold text-slate-800">0.20</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Isolation Forest Contamination:</span>
              <span className="font-mono font-semibold text-slate-800">0.05 (5%)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">RCA Candidate Ranking Depth:</span>
              <span className="font-mono font-semibold text-indigo-700">Top 5 Candidates</span>
            </div>
          </div>
        </div>

        {/* Telemetry Scraping & Retention */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Server className="w-4 h-4 text-indigo-600" />
            <span>Scraping & Retention Policy</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Scrape Resolution:</span>
              <span className="font-semibold text-slate-800">15 seconds (Prometheus)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Metrics Retention Window:</span>
              <span className="font-semibold text-slate-800">30 days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Log Distributor Buffer:</span>
              <span className="font-semibold text-slate-800">14 days (Loki)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Trace Sampling Strategy:</span>
              <span className="font-semibold text-emerald-700">100% on Error, 10% Baseline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer & Community Inquiries */}
      <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center space-x-2">
              <Mail className="w-4 h-4 text-primary" />
              <span>Contact Enquiries & Triage Console</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Review, filter, and respond to incoming customer messages, collaboration requests, and sales inquiries.
            </p>
          </div>
          <Link
            href="/settings/enquiries"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-md shadow-sm transition-colors self-start sm:self-auto"
          >
            <span>Open Enquiries</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Platform Metadata & Version */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Platform Version & Security Profile</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Application Name:</span>
              <span className="font-semibold text-slate-900">{meta?.app_name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">API Version:</span>
              <span className="font-mono font-semibold">{meta?.api_version}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Environment:</span>
              <span className="font-mono capitalize">{meta?.app_env}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Demo Telemetry Mode:</span>
              <span className="font-semibold text-indigo-700">{meta?.demo_mode ? "Enabled" : "Live OTLP"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Authentication Protocol:</span>
              <span className="font-semibold">Argon2id + HTTP-Only JWT Cookie</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Remediation Policy:</span>
              <span className="font-semibold text-emerald-700">Strict Read-Only Guidance (Human Control)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
