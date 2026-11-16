"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitCommit,
  RefreshCw,
  Info,
  CheckCircle2,
  ShieldAlert,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Play,
  ArrowRight,
  Server,
  Zap,
  Lock,
  Wrench,
  Activity,
  Check,
  Database,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorAlert } from "@/components/common/UIStates";

interface ServiceItem {
  id: string;
  name: string;
  health_status: string;
  environment: string;
}

interface PipelineCheck {
  check_id: string;
  name: string;
  status: "passed" | "warning" | "failed";
  duration_ms: number;
  details: string;
  metrics?: Record<string, any>;
}

interface RiskItem {
  category: string;
  target: string;
  severity: "critical" | "high" | "moderate" | "low";
  description: string;
  blast_radius_percentage: number;
}

interface RemediationChange {
  id: string;
  priority: "BLOCKING" | "REQUIRED" | "RECOMMENDED";
  component: string;
  issue: string;
  required_change: string;
  config_target: string;
}

interface PreflightResult {
  service_id: string;
  service_name: string;
  candidate_version: string;
  target_environment: string;
  commit_hash: string;
  pipeline_strategy: string;
  decision: "PROCEED" | "CHANGES_REQUIRED" | "BLOCKED";
  risk_score: number;
  risk_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  summary: string;
  evaluated_at: string;
  pipeline_checks: PipelineCheck[];
  what_is_at_risk: RiskItem[];
  what_needs_to_be_changed: RemediationChange[];
  downstream_dependencies: string[];
  upstream_callers: string[];
}

export default function DeploymentsPage() {
  const [activeTab, setActiveTab] = useState<"preflight" | "history">("preflight");

  // Services list for dropdown
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  // Preflight form state
  const [candidateVersion, setCandidateVersion] = useState("v2.4.0-rc3");
  const [targetEnvironment, setTargetEnvironment] = useState("production");
  const [commitHash, setCommitHash] = useState("git-7b3e9a1");
  const [pipelineStrategy, setPipelineStrategy] = useState("canary_10");
  const [simulateCanaryFailure, setSimulateCanaryFailure] = useState(false);
  const [simulateSchemaDrift, setSimulateSchemaDrift] = useState(false);

  // Preflight execution state
  const [checking, setChecking] = useState(false);
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);

  // Delivery state
  const [delivering, setDelivering] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState<any | null>(null);

  // Historical deployments state
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Fetch initial services list
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await apiClient<ServiceItem[]>("/services");
        const srvs = res.data || [];
        setServices(srvs);
        if (srvs.length > 0) {
          // Default to checkout or first service
          const checkoutSrv = srvs.find((s) => s.name === "checkout") || srvs[0];
          setSelectedServiceId(checkoutSrv.id);
        }
      } catch (err) {
        console.warn("Failed to load services for deployment gate:", err);
      }
    }
    loadServices();
  }, []);

  // Fetch history
  const fetchDeployments = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await apiClient<any[]>("/deployments");
      setDeployments(res.data || []);
    } catch (err: any) {
      setHistoryError(err.message || "Failed to load deployment history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  // Run Preflight Check
  const handleRunPreflight = async () => {
    if (!selectedServiceId) return;
    setChecking(true);
    setPreflightError(null);
    setDeliverySuccess(null);

    try {
      const res = await apiClient<PreflightResult>("/deployments/preflight-check", {
        method: "POST",
        body: JSON.stringify({
          service_id: selectedServiceId,
          candidate_version: candidateVersion,
          target_environment: targetEnvironment,
          commit_hash: commitHash,
          pipeline_strategy: pipelineStrategy,
          simulate_canary_failure: simulateCanaryFailure,
          simulate_schema_drift: simulateSchemaDrift,
        }),
      });

      if (res.data) {
        setPreflightResult(res.data);
      }
    } catch (err: any) {
      setPreflightError(err.message || "Failed to execute pre-flight safety check.");
    } finally {
      setChecking(false);
    }
  };

  // Run initial check once service is selected
  useEffect(() => {
    if (selectedServiceId && !preflightResult) {
      handleRunPreflight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceId]);

  // Deliver candidate release
  const handleDeliverRelease = async () => {
    if (!selectedServiceId || !preflightResult) return;
    setDelivering(true);
    try {
      const res = await apiClient<any>("/deployments/deliver", {
        method: "POST",
        body: JSON.stringify({
          service_id: selectedServiceId,
          candidate_version: candidateVersion,
          target_environment: targetEnvironment,
          commit_hash: commitHash,
          preflight_decision: preflightResult.decision,
          risk_score: preflightResult.risk_score,
          notes: `Automated delivery after ${preflightResult.decision} gate verification.`,
        }),
      });

      if (res.data) {
        setDeliverySuccess(res.data);
        fetchDeployments();
      }
    } catch (err: any) {
      alert(`Delivery failed: ${err.message || "Unknown error"}`);
    } finally {
      setDelivering(false);
    }
  };

  // Quick preset handlers
  const handlePresetHealthy = () => {
    const authSrv = services.find((s) => s.name === "auth" || s.health_status === "healthy");
    if (authSrv) setSelectedServiceId(authSrv.id);
    setCandidateVersion("v1.8.4");
    setCommitHash("git-9e4a11b");
    setSimulateCanaryFailure(false);
    setSimulateSchemaDrift(false);
  };

  const handlePresetHighRisk = () => {
    const checkoutSrv = services.find((s) => s.name === "checkout") || services[0];
    if (checkoutSrv) setSelectedServiceId(checkoutSrv.id);
    setCandidateVersion("v2.5.0-rc1");
    setCommitHash("git-7b3e9a1");
    setSimulateCanaryFailure(true);
    setSimulateSchemaDrift(false);
  };

  const handlePresetSchemaDrift = () => {
    const checkoutSrv = services.find((s) => s.name === "checkout") || services[0];
    if (checkoutSrv) setSelectedServiceId(checkoutSrv.id);
    setCandidateVersion("v2.5.0-rc2");
    setCommitHash("git-3f82cd0");
    setSimulateCanaryFailure(false);
    setSimulateSchemaDrift(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Software Delivery & Release Pipeline</h2>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              DeployGuard
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-flight automated release verification window, blast radius risk assessment, and deployment correlation ledger.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setActiveTab("preflight")}
            className={`inline-flex items-center px-3 py-1.5 rounded-md transition-all ${
              activeTab === "preflight"
                ? "bg-white text-indigo-700 font-semibold shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Pre-Deployment Verification Window
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`inline-flex items-center px-3 py-1.5 rounded-md transition-all ${
              activeTab === "history"
                ? "bg-white text-indigo-700 font-semibold shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GitCommit className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Deployment History & Audit ({deployments.length})
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: PRE-FLIGHT VERIFICATION WINDOW ===================== */}
      {activeTab === "preflight" && (
        <div className="space-y-6">
          {/* Top Operational Context Banner */}
          <div className="flex items-start p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-indigo-900 text-xs">
            <Radio className="w-4 h-4 text-indigo-600 mt-0.5 mr-2 shrink-0 animate-pulse" />
            <div className="flex-1">
              <span className="font-semibold text-indigo-950">Automated Pipeline Pre-Flight Verification Gate:</span>
              <span className="ml-1 text-indigo-800">
                Inspect candidate builds against active incident state, upstream/downstream dependency blast radius, canary error thresholds, and backward-compatible database schema rules before production delivery.
              </span>
            </div>
          </div>

          {/* Configuration / Candidate Input Window */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Candidate Software Release Specification</h3>
                <p className="text-xs text-slate-500">Configure target microservice and candidate release metadata to evaluate release readiness.</p>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium text-slate-400">Test Scenarios:</span>
                <button
                  type="button"
                  onClick={handlePresetHealthy}
                  className="px-2.5 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100"
                >
                  Healthy Release (Auth)
                </button>
                <button
                  type="button"
                  onClick={handlePresetHighRisk}
                  className="px-2.5 py-1 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded hover:bg-rose-100"
                >
                  High-Risk Gate (Checkout)
                </button>
                <button
                  type="button"
                  onClick={handlePresetSchemaDrift}
                  className="px-2.5 py-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100"
                >
                  Schema Drift Block
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Service Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Microservice</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.health_status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Candidate Version */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Candidate Version Tag</label>
                <input
                  type="text"
                  value={candidateVersion}
                  onChange={(e) => setCandidateVersion(e.target.value)}
                  placeholder="v2.4.0-rc3"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Target Environment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Environment</label>
                <select
                  value={targetEnvironment}
                  onChange={(e) => setTargetEnvironment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="production">production (k8s-prod-us-east)</option>
                  <option value="staging">staging (k8s-staging-preview)</option>
                  <option value="canary">canary (isolated traffic partition)</option>
                </select>
              </div>

              {/* Commit Hash */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Git Commit SHA</label>
                <input
                  type="text"
                  value={commitHash}
                  onChange={(e) => setCommitHash(e.target.value)}
                  placeholder="git-7b3e9a1"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Pipeline Strategy */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Strategy</label>
                <select
                  value={pipelineStrategy}
                  onChange={(e) => setPipelineStrategy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="canary_10">Canary 10% Progressive Gate</option>
                  <option value="blue_green">Blue/Green Instant Cutover</option>
                  <option value="rolling_25">Rolling 25% Step Partition</option>
                  <option value="shadow">Shadow Traffic Mirroring</option>
                </select>
              </div>
            </div>

            {/* Simulation Checkboxes */}
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 text-xs">
              <span className="font-semibold text-slate-600">Chaos & Stress Simulation:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={simulateCanaryFailure}
                  onChange={(e) => setSimulateCanaryFailure(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-3.5 w-3.5"
                />
                <span>Simulate Canary Error Spike (&gt;0.50% &amp; P99 &gt;250ms)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={simulateSchemaDrift}
                  onChange={(e) => setSimulateSchemaDrift(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <span>Simulate Non-Backward-Compatible Schema Migration (DDL Lock)</span>
              </label>

              <div className="ml-auto">
                <button
                  type="button"
                  onClick={handleRunPreflight}
                  disabled={checking}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
                >
                  {checking ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Evaluating Safety Gates...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                      Run Automated Pipeline Checks
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Delivery Success Toast */}
          {deliverySuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg shadow-sm flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Release Successfully Delivered &amp; Deployed to Production
                  </h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    Deployment ID: <span className="font-mono font-semibold">{deliverySuccess.deployment_id}</span> | Service:{" "}
                    <span className="font-semibold">{deliverySuccess.service_name}</span> | Commit:{" "}
                    <span className="font-mono">{deliverySuccess.commit_id}</span>
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Production rollout active via automated canary controllers. Event logged into audit trail.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium shrink-0"
              >
                View in Audit History &rarr;
              </button>
            </div>
          )}

          {/* Preflight Results Display */}
          {checking && !preflightResult ? (
            <LoadingSpinner message="Auditing dependency topology, calculating blast radius, and running canary telemetry checks..." />
          ) : preflightError ? (
            <ErrorAlert message={preflightError} onRetry={handleRunPreflight} />
          ) : preflightResult ? (
            <div className="space-y-6">
              {/* HERO DECISION STATUS BANNER */}
              <div
                className={`p-5 rounded-lg border shadow-sm transition-all ${
                  preflightResult.decision === "PROCEED"
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                    : preflightResult.decision === "CHANGES_REQUIRED"
                    ? "bg-amber-50/90 border-amber-300 text-amber-950"
                    : "bg-rose-50/90 border-rose-300 text-rose-950"
                }`}
              >
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md border ${
                          preflightResult.decision === "PROCEED"
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : preflightResult.decision === "CHANGES_REQUIRED"
                            ? "bg-amber-600 text-white border-amber-700"
                            : "bg-rose-600 text-white border-rose-700"
                        }`}
                      >
                        {preflightResult.decision === "PROCEED"
                          ? "READY TO DELIVER - ALL GATES PASSED"
                          : preflightResult.decision === "CHANGES_REQUIRED"
                          ? "CONDITIONAL APPROVAL - CHANGES REQUIRED"
                          : "DEPLOYMENT BLOCKED - HIGH RISK THRESHOLD BREACH"}
                      </span>

                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/70 border border-slate-200">
                        Risk Score:{" "}
                        <span
                          className={`font-mono font-bold ${
                            preflightResult.risk_score >= 65
                              ? "text-rose-700"
                              : preflightResult.risk_score >= 30
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {preflightResult.risk_score} / 100
                        </span>{" "}
                        ({preflightResult.risk_level} RISK)
                      </span>

                      <span className="text-xs text-slate-500 font-mono">
                        Target: {preflightResult.service_name} : {preflightResult.candidate_version} ({preflightResult.target_environment})
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed max-w-4xl pt-1">
                      {preflightResult.summary}
                    </p>
                  </div>

                  {/* Primary CTA Delivery Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    {preflightResult.decision === "PROCEED" && (
                      <button
                        type="button"
                        onClick={handleDeliverRelease}
                        disabled={delivering}
                        className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-md text-xs font-bold shadow-sm transition-colors"
                      >
                        {delivering ? (
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mr-1.5 stroke-[3]" />
                        )}
                        Approve &amp; Deliver Release to Production
                      </button>
                    )}

                    {preflightResult.decision === "CHANGES_REQUIRED" && (
                      <button
                        type="button"
                        onClick={handleDeliverRelease}
                        disabled={delivering}
                        className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-md text-xs font-bold shadow-sm transition-colors"
                      >
                        {delivering ? (
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Override Safety Gate &amp; Deliver
                      </button>
                    )}

                    {preflightResult.decision === "BLOCKED" && (
                      <button
                        type="button"
                        disabled
                        title="Delivery halted. Remediate blocking items below to unlock release promotion."
                        className="inline-flex items-center px-4 py-2 bg-slate-300 text-slate-600 cursor-not-allowed rounded-md text-xs font-bold shadow-sm"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1.5" />
                        Delivery Halted (Resolve Blockers Below)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 5 AUTOMATED PIPELINE SAFETY GATES */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    Automated Pipeline Safety Verification Gates (5 of 5 Evaluated)
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Evaluated at: {new Date(preflightResult.evaluated_at).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {preflightResult.pipeline_checks.map((gate) => (
                    <div
                      key={gate.check_id}
                      className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between space-y-2.5"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-xs font-semibold text-slate-900 leading-tight">{gate.name}</span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded shrink-0 ${
                              gate.status === "passed"
                                ? "bg-emerald-100 text-emerald-800"
                                : gate.status === "warning"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {gate.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{gate.details}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>Latency</span>
                        <span>{gate.duration_ms} ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TWO-COLUMN DEEP-DIVE: WHAT IS AT RISK vs WHAT NEEDS TO BE CHANGED */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* COLUMN 1: WHAT IS AT RISK */}
                <div className="bg-white border border-rose-200/80 rounded-lg shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-100 rounded text-rose-700">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">What is at Risk</h4>
                        <p className="text-xs text-slate-500">Blast radius, downstream dependencies, and SLO degradation.</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      {preflightResult.what_is_at_risk.length} Risk Factors
                    </span>
                  </div>

                  {/* Risk Items List */}
                  <div className="space-y-3">
                    {preflightResult.what_is_at_risk.map((risk, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-md space-y-1.5 text-xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                            {risk.category}: <span className="font-mono text-indigo-700">{risk.target}</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              risk.severity === "critical"
                                ? "bg-rose-100 text-rose-800"
                                : risk.severity === "high"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : risk.severity === "moderate"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {risk.severity}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">{risk.description}</p>
                        {risk.blast_radius_percentage > 0 && (
                          <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500">
                            <span>Blast Radius Exposure:</span>
                            <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className="bg-rose-500 h-full rounded-full"
                                style={{ width: `${Math.min(100, risk.blast_radius_percentage)}%` }}
                              ></div>
                            </div>
                            <span className="font-mono font-medium text-slate-700">{risk.blast_radius_percentage}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Connected Topology Pills */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Dependent Microservices in Blast Radius
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Downstream Callees:</span>
                      {preflightResult.downstream_dependencies.length > 0 ? (
                        preflightResult.downstream_dependencies.map((d) => (
                          <span
                            key={d}
                            className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-amber-50 text-amber-800 border border-amber-200"
                          >
                            {d}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">None (leaf microservice)</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-slate-400 font-medium">Upstream Ingress Callers:</span>
                      {preflightResult.upstream_callers.length > 0 ? (
                        preflightResult.upstream_callers.map((u) => (
                          <span
                            key={u}
                            className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-indigo-50 text-indigo-800 border border-indigo-200"
                          >
                            {u}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">None (edge entry point)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: WHAT NEEDS TO BE CHANGED */}
                <div className="bg-white border border-indigo-200/80 rounded-lg shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 rounded text-indigo-700">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">What Needs to be Changed</h4>
                        <p className="text-xs text-slate-500">Actionable remediation steps and required configuration updates.</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {preflightResult.what_needs_to_be_changed.length} Action Items
                    </span>
                  </div>

                  {/* Remediation Changes List */}
                  <div className="space-y-3">
                    {preflightResult.what_needs_to_be_changed.map((change) => (
                      <div
                        key={change.id}
                        className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-md space-y-2 text-xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-semibold text-slate-900">{change.component}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                              change.priority === "BLOCKING"
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : change.priority === "REQUIRED"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            }`}
                          >
                            {change.priority}
                          </span>
                        </div>

                        <div className="text-slate-600">
                          <strong className="text-slate-700">Issue:</strong> {change.issue}
                        </div>

                        <div className="p-2.5 bg-white border border-slate-200 rounded text-slate-800">
                          <strong className="text-indigo-900 block mb-0.5">Required Action:</strong>
                          <span>{change.required_change}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                          <span>Target Config:</span>
                          <span className="text-slate-600 underline">{change.config_target}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ===================== TAB 2: HISTORICAL DEPLOYMENTS AUDIT ===================== */}
      {activeTab === "history" && (
        <div className="space-y-6">
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
          {historyError ? (
            <ErrorAlert message={historyError} onRetry={fetchDeployments} />
          ) : loadingHistory && deployments.length === 0 ? (
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
      )}
    </div>
  );
}
