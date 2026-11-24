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
  Wrench,
  ShieldCheck,
  Check,
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

  // Remediation runbooks state
  const [runbooks, setRunbooks] = useState<any[]>([]);
  const [selectedRunbookId, setSelectedRunbookId] = useState<string>("restart_pod");
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [remediationParams, setRemediationParams] = useState<Record<string, any>>({ grace_period_seconds: 30, replicas: 3 });
  const [executingRemediation, setExecutingRemediation] = useState(false);
  const [remediationHistory, setRemediationHistory] = useState<any[]>([]);
  const [remediationMsg, setRemediationMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    apiClient<any[]>("/remediations/runbooks")
      .then((res) => {
        if (res.data) setRunbooks(res.data);
      })
      .catch(() => {});
    if (incidentId) {
      apiClient<any[]>(`/incidents/${incidentId}/remediations`)
        .then((res) => {
          if (res.data) setRemediationHistory(res.data);
        })
        .catch(() => {});
    }
  }, [incidentId]);

  const handleExecuteRemediation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRunbookId || !approvalConfirmed) return;
    setExecutingRemediation(true);
    setRemediationMsg(null);
    try {
      const res = await apiClient<any>(`/incidents/${incidentId}/remediations`, {
        method: "POST",
        body: JSON.stringify({
          runbook_id: selectedRunbookId,
          human_approval_confirmed: approvalConfirmed,
          approval_notes: approvalNotes,
          parameters: remediationParams,
        }),
      });
      setRemediationMsg({
        type: "success",
        text: res.data?.action_summary || "Remediation executed successfully.",
      });
      setApprovalConfirmed(false);
      setApprovalNotes("");
      await fetchIncident();
      const historyRes = await apiClient<any[]>(`/incidents/${incidentId}/remediations`);
      if (historyRes.data) setRemediationHistory(historyRes.data);
    } catch (err: any) {
      setRemediationMsg({
        type: "error",
        text: err.message || "Failed to execute remediation.",
      });
    } finally {
      setExecutingRemediation(false);
    }
  };

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

      {/* Human-in-the-Loop Remediation Runbooks Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Human-in-the-Loop Remediation Runbooks
            </h3>
          </div>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-400 font-mono">
            Target: {incident?.primary_service_name || "Service"}
          </span>
        </div>

        {remediationMsg && (
          <div
            className={`p-3 rounded-md text-xs flex items-center space-x-2 ${
              remediationMsg.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            }`}
          >
            {remediationMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{remediationMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleExecuteRemediation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Authorized Runbook
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: "restart_pod",
                  name: "Graceful Pod Restart",
                  risk: "moderate",
                  desc: "Performs rolling graceful restart of worker pods.",
                },
                {
                  id: "scale_replicas",
                  name: "Horizontal Pod Scaling",
                  risk: "moderate",
                  desc: "Adjusts container replica count between 1 and 20.",
                },
                {
                  id: "rollback_deployment",
                  name: "Deployment Rollback",
                  risk: "high",
                  desc: "Rolls back target microservice to prior stable revision.",
                },
                {
                  id: "toggle_circuit_breaker",
                  name: "Circuit Breaker Override",
                  risk: "high",
                  desc: "Isolates failing callees via mesh circuit breaker.",
                },
              ].map((rb) => (
                <div
                  key={rb.id}
                  onClick={() => setSelectedRunbookId(rb.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    selectedRunbookId === rb.id
                      ? "border-indigo-600 dark:border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-600 dark:ring-indigo-400"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{rb.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                        rb.risk === "high"
                          ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                          : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {rb.risk}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">{rb.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Parameters */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Runbook Parameters & Blast Radius Verification
            </span>

            {selectedRunbookId === "scale_replicas" && (
              <div className="flex items-center space-x-3">
                <label className="text-xs text-slate-600 dark:text-slate-400">Target Replicas (1 - 20):</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={remediationParams.replicas ?? 3}
                  onChange={(e) =>
                    setRemediationParams({ ...remediationParams, replicas: parseInt(e.target.value) || 1 })
                  }
                  className="w-20 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            {selectedRunbookId === "restart_pod" && (
              <div className="flex items-center space-x-3">
                <label className="text-xs text-slate-600 dark:text-slate-400">Grace Period (seconds):</label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={remediationParams.grace_period_seconds ?? 30}
                  onChange={(e) =>
                    setRemediationParams({
                      ...remediationParams,
                      grace_period_seconds: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            {selectedRunbookId === "rollback_deployment" && (
              <div className="flex items-center space-x-3">
                <label className="text-xs text-slate-600 dark:text-slate-400">Target Revision ID (Optional):</label>
                <input
                  type="number"
                  placeholder="e.g. 2"
                  value={remediationParams.target_revision ?? ""}
                  onChange={(e) =>
                    setRemediationParams({
                      ...remediationParams,
                      target_revision: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="w-28 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            {selectedRunbookId === "toggle_circuit_breaker" && (
              <div className="flex items-center space-x-3">
                <label className="text-xs text-slate-600 dark:text-slate-400">Circuit Breaker State:</label>
                <select
                  value={remediationParams.state ?? "open"}
                  onChange={(e) => setRemediationParams({ ...remediationParams, state: e.target.value })}
                  className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="open">open (Trip breaker / isolate service)</option>
                  <option value="half-open">half-open (Canary probe)</option>
                  <option value="closed">closed (Normal routing)</option>
                </select>
              </div>
            )}

            <div className="pt-2">
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Operational Justification / Approval Notes (Required for High-Risk Actions):
              </label>
              <textarea
                rows={2}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="e.g. Approved rolling restart following confirmed memory leak in payment worker..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="approval_checkbox"
                checked={approvalConfirmed}
                onChange={(e) => setApprovalConfirmed(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <label htmlFor="approval_checkbox" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                I confirm that I am an authorized SRE operator and have evaluated the blast radius for this action.
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={executingRemediation || !approvalConfirmed}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              {executingRemediation ? "Executing Runbook..." : "Authorize & Execute Runbook"}
            </button>
          </div>
        </form>

        {/* Historical Applied Remediations */}
        {remediationHistory.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Applied Incident Remediations ({remediationHistory.length})
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {remediationHistory.map((h: any) => (
                <div
                  key={h.id}
                  className="p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded text-xs flex justify-between items-center"
                >
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {h.details?.action_summary || h.event_type}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ID: {h.details?.remediation_id || h.id} • Reason: {h.reason || "Manual operator runbook"}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(h.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
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
