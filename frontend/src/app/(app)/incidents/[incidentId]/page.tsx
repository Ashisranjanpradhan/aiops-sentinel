"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  Play,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
  FileText,
  Activity,
  GitBranch,
  ShieldAlert,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge, SeverityBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, ErrorAlert } from "@/components/common/UIStates";

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params?.incidentId as string;

  const [incident, setIncident] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Note form state
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Investigation run state
  const [runningInvestigation, setRunningInvestigation] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchIncident = async () => {
    if (!incidentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any>(`/incidents/${incidentId}`);
      setIncident(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load incident details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [incidentId]);

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await apiClient(`/incidents/${incidentId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchIncident();
    } catch (err: any) {
      alert(`Status transition failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setSubmittingNote(true);
    try {
      await apiClient(`/incidents/${incidentId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: noteText.trim() }),
      });
      setNoteText("");
      await fetchIncident();
    } catch (err: any) {
      alert(`Failed to add note: ${err.message}`);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleRunInvestigation = async () => {
    setRunningInvestigation(true);
    try {
      await apiClient(`/incidents/${incidentId}/investigations`, {
        method: "POST",
      });
      await fetchIncident();
    } catch (err: any) {
      alert(`Investigation trigger failed: ${err.message}`);
    } finally {
      setRunningInvestigation(false);
    }
  };

  if (loading && !incident) return <LoadingSpinner message="Loading incident investigation..." />;
  if (error && !incident) return <ErrorAlert message={error} onRetry={fetchIncident} />;

  const candidates = incident?.latest_investigation?.candidates || [];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-slate-500">
        <Link href="/incidents" className="hover:text-indigo-600 flex items-center">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Incidents
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-700">{incident?.id?.slice(0, 8)}</span>
      </div>

      {/* Incident Header & Actions Bar */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-3">
            <SeverityBadge severity={incident?.severity || "high"} />
            <StatusBadge status={incident?.status || "open"} />
            <span className="text-xs font-mono text-slate-500">{incident?.id}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{incident?.title}</h2>
          <p className="text-xs text-slate-500 flex items-center space-x-2">
            <span>Primary Service:</span>
            <Link
              href={`/services/${incident?.primary_service_id}`}
              className="font-mono font-medium text-indigo-600 hover:underline"
            >
              {incident?.primary_service_name}
            </Link>
            <span>•</span>
            <span>Detected: {new Date(incident?.detected_at).toLocaleString()}</span>
            <span>•</span>
            <span>Detector: {incident?.detector_name} (v{incident?.detector_version})</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {incident?.status === "open" && (
            <button
              onClick={() => handleStatusChange("acknowledged")}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-800 rounded-md text-xs font-medium hover:bg-amber-100"
            >
              Acknowledge
            </button>
          )}

          {incident?.status !== "investigating" && incident?.status !== "resolved" && (
            <button
              onClick={() => handleStatusChange("investigating")}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-blue-50 border border-blue-300 text-blue-800 rounded-md text-xs font-medium hover:bg-blue-100"
            >
              Mark Investigating
            </button>
          )}

          {incident?.status !== "resolved" && (
            <button
              onClick={() => handleStatusChange("resolved")}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-medium hover:bg-emerald-700 shadow-sm"
            >
              Resolve Incident
            </button>
          )}

          {incident?.status === "resolved" && (
            <button
              onClick={() => handleStatusChange("open")}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-md text-xs font-medium hover:bg-rose-100"
            >
              Reopen Incident
            </button>
          )}

          <button
            onClick={handleRunInvestigation}
            disabled={runningInvestigation}
            className="inline-flex items-center px-3.5 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 mr-1.5 ${runningInvestigation ? "animate-spin" : ""}`} />
            {runningInvestigation ? "Analyzing..." : "Run Investigation"}
          </button>
        </div>
      </div>

      {/* Root Cause Analysis (RCA) Results Section */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Ranked Root Cause Candidates</h3>
          </div>
          <span className="text-xs text-slate-500">
            Model: <code>{incident?.latest_investigation?.model_version || "rca-baseline-v1"}</code>
          </span>
        </div>

        {candidates.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No root cause analysis run yet. Click <strong>Run Investigation</strong> above to correlate metrics, logs, and topology.
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map((c: any) => (
              <div
                key={c.id}
                className={`p-4 rounded-lg border ${
                  c.rank === 1
                    ? "bg-indigo-50/50 border-indigo-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        c.rank === 1
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      #{c.rank}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{c.service_name}</span>
                    <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-600">
                      Indicator: {c.candidate_indicator}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-indigo-700 block">
                      Confidence: {c.calibrated_confidence ? `${Math.round(c.calibrated_confidence * 100)}%` : "N/A"}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Score: {c.score}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 mt-1 leading-relaxed">{c.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supporting Evidence Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metric & Trace Evidence */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Telemetry Evidence ({incident?.evidence?.length || 0})</span>
          </h3>

          <div className="space-y-3">
            {incident?.evidence?.map((ev: any) => (
              <div key={ev.id} className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold uppercase tracking-wider text-slate-700">
                    {ev.evidence_type} Evidence
                  </span>
                  <span className="font-mono text-slate-400 text-[10px]">{ev.source_reference}</span>
                </div>
                <div className="text-slate-600 mt-1">
                  {ev.evidence_type === "metric" && (
                    <p>
                      Metric <code>{ev.summary_json?.metric_name}</code> spiked to{" "}
                      <strong>{ev.summary_json?.observed_value}</strong> (z-score: {ev.summary_json?.z_score})
                    </p>
                  )}
                  {ev.evidence_type === "log" && (
                    <p className="font-mono text-rose-800 bg-rose-50 p-1.5 rounded border border-rose-200">
                      {ev.summary_json?.message}
                    </p>
                  )}
                  {ev.evidence_type === "trace" && (
                    <p>
                      Trace <code>{ev.summary_json?.trace_id}</code> failed in{" "}
                      <strong>{ev.summary_json?.failing_span}</strong> ({ev.summary_json?.duration_ms}ms)
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline & Analyst Notes */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Incident Timeline & Notes</span>
          </h3>

          {/* Add Note Form */}
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add investigation finding or note..."
              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={submittingNote || !noteText.trim()}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              Post Note
            </button>
          </form>

          {/* Timeline Events List */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {incident?.events?.map((ev: any) => (
              <div key={ev.id} className="text-xs border-l-2 border-indigo-500 pl-3 py-1 space-y-0.5">
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>{ev.actor_name || "System"}</span>
                  <span>{new Date(ev.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="font-medium text-slate-800">
                  {ev.event_type === "note" ? (
                    <span className="italic text-slate-700">{ev.new_value_json?.note}</span>
                  ) : (
                    <span>{ev.reason || ev.event_type}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
