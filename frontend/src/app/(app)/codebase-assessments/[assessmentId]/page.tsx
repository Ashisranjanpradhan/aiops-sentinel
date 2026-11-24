"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileCode2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  ExternalLink,
  Filter,
  Search,
  Code,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Terminal,
  Download,
  Trash2,
  FolderTree,
  FileCheck,
  AlertOctagon,
  FileText,
  HelpCircle,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Finding {
  id: string;
  dimension: string;
  rule_id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  file_path: string;
  line_number?: number;
  evidence_snippet?: string;
  remediation_advice: string;
}

interface DimensionScore {
  score: number;
  weight: number;
  status: string;
  findings_count: number;
  summary: string;
  passed_checks?: number;
  failed_checks?: number;
  unverified_checks?: number;
  not_applicable_checks?: number;
  confidence?: string;
  evidence_coverage?: number;
}

interface AssessmentDetail {
  id: string;
  project_name: string;
  source_type: string;
  source_size_bytes: number;
  file_count: number;
  primary_languages_json: Array<{ language: string; files: number; percentage: number }>;
  frameworks_json: string[];
  profile?: string;
  execution_mode?: string;
  overall_score: number;
  readiness_level: string;
  dimension_scores_json: Record<string, DimensionScore>;
  summary: string;
  recommendations_json: Array<{
    priority: string;
    dimension: string;
    title: string;
    action: string;
    target_file: string;
  }>;
  project_tree?: string[];
  capability_matrix?: Array<{
    language: string;
    status: string;
    supported_checks: string[];
    limitations: string;
  }>;
  missing_critical_files?: Array<{
    file: string;
    importance: string;
    reason: string;
  }>;
  created_at: string;
  findings: Finding[];
}

export default function AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.assessmentId as string;

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Findings Filters
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dimensionFilter, setDimensionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // UI state
  const [showTree, setShowTree] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (!assessmentId) return;
    setLoading(true);
    apiClient<AssessmentDetail>(`/assessments/${assessmentId}`)
      .then((res) => {
        setAssessment(res.data);
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load assessment report.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [assessmentId]);

  const handleExport = async (format: "json" | "sarif" | "html") => {
    if (!assessment) return;
    setIsExporting(format);
    try {
      const isBrowser = typeof window !== "undefined";
      const primaryBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const token = isBrowser ? localStorage.getItem("aiops_token") : null;

      const res = await fetch(`${primaryBase}/api/v1/assessments/${assessmentId}/export?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Export request failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileExt = format === "sarif" ? "sarif" : format;
      const cleanName = assessment.project_name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      a.download = `${cleanName}_assessment.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiClient(`/assessments/${assessmentId}`, { method: "DELETE" });
      router.push("/codebase-assessments");
    } catch (err: any) {
      alert(`Failed to delete assessment: ${err.message}`);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading codebase assessment report...
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="py-12 text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-sm font-bold text-slate-900">Unable to load assessment</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{error || "Assessment not found."}</p>
        <Link
          href="/codebase-assessments"
          className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700"
        >
          Return to Assessments
        </Link>
      </div>
    );
  }

  const findings = assessment.findings || [];

  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (dimensionFilter !== "all" && f.dimension !== dimensionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        f.title.toLowerCase().includes(q) ||
        f.file_path.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.rule_id.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300 uppercase">
            Critical
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-100 text-orange-900 border border-orange-300 uppercase">
            High
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-300 uppercase">
            Medium
          </span>
        );
      case "low":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-900 border border-blue-300 uppercase">
            Low
          </span>
        );
    }
  };

  const getReadinessBanner = (level: string = "NEEDS_WORK", score: number = 0) => {
    const safeLevel = (level || "NEEDS_WORK").toUpperCase();
    const safeScore = typeof score === "number" ? score : 0;
    let bg = "bg-rose-50 border-rose-200 text-rose-950";
    let badgeBg = "bg-rose-600 text-white";
    let icon = <XCircle className="w-5 h-5 text-rose-600" />;
    let desc =
      "Significant security, reliability, or architectural vulnerabilities must be remediated before production release.";

    if (safeLevel === "PRODUCTION_READY") {
      bg = "bg-emerald-50 border-emerald-200 text-emerald-950";
      badgeBg = "bg-emerald-600 text-white";
      icon = <CheckCircle className="w-5 h-5 text-emerald-600" />;
      desc =
        "Codebase satisfies core enterprise production readiness criteria across security, observability, and architecture.";
    } else if (safeLevel === "NEAR_PRODUCTION") {
      bg = "bg-blue-50 border-blue-200 text-blue-950";
      badgeBg = "bg-blue-600 text-white";
      icon = <CheckCircle2 className="w-5 h-5 text-blue-600" />;
      desc =
        "Minor improvements recommended in testing or documentation, but no critical security blockers detected.";
    } else if (safeLevel === "NEEDS_WORK") {
      bg = "bg-amber-50 border-amber-200 text-amber-950";
      badgeBg = "bg-amber-600 text-white";
      icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
      desc =
        "Moderate deficits detected in error handling, test coverage, or configuration hygiene.";
    }

    const criticalCount = findings.filter((f) => f && f.severity === "critical").length;

    return (
      <div className={`p-5 rounded-lg border ${bg} flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm`}>
        <div className="flex items-start space-x-3.5">
          <div className="mt-0.5 flex-shrink-0">{icon}</div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${badgeBg}`}>
                {safeLevel.replace(/_/g, " ")}
              </span>
              <span className="font-mono text-sm font-bold">Overall Score: {safeScore.toFixed(1)} / 100</span>
              {criticalCount > 0 && (
                <span className="text-xs bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-semibold">
                  {criticalCount} Critical Blocker{criticalCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-xs mt-1.5 opacity-90 leading-relaxed max-w-2xl">{desc}</p>
          </div>
        </div>

        <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-black/10">
          <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500">Evaluated On</span>
          <span className="text-xs font-mono font-medium">
            {assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : "Recently"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header & Navigation */}
      <div>
        <Link
          href="/codebase-assessments"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Codebase Assessments
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-2">
          <div className="flex items-start space-x-3">
            <FileCode2 className="w-7 h-7 text-indigo-600 mt-1 flex-shrink-0" />
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{assessment.project_name}</h1>
                {assessment.profile && (
                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-[11px] font-semibold">
                    {assessment.profile}
                  </span>
                )}
                {assessment.execution_mode && (
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-mono capitalize">
                    {assessment.execution_mode.replace("_", " ")}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 flex items-center space-x-2 mt-1">
                <span>{assessment.file_count} files analyzed</span>
                <span>•</span>
                <span>{(assessment.source_size_bytes / 1024).toFixed(1)} KB source</span>
                <span>•</span>
                <span className="uppercase font-mono">{assessment.source_type}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar: Exports & Deletion */}
          <div className="flex items-center space-x-2 self-start lg:self-auto flex-wrap gap-y-2">
            <button
              onClick={() => handleExport("sarif")}
              disabled={isExporting !== null}
              className="inline-flex items-center px-2.5 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              {isExporting === "sarif" ? "Exporting..." : "Export SARIF"}
            </button>
            <button
              onClick={() => handleExport("html")}
              disabled={isExporting !== null}
              className="inline-flex items-center px-2.5 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              {isExporting === "html" ? "Exporting..." : "Export HTML"}
            </button>
            <button
              onClick={() => handleExport("json")}
              disabled={isExporting !== null}
              className="inline-flex items-center px-2.5 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              {isExporting === "json" ? "Exporting..." : "Export JSON"}
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-2.5 py-1.5 border border-rose-300 rounded text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Readiness Status Banner */}
      {getReadinessBanner(assessment.readiness_level, assessment.overall_score)}

      {/* Executive Summary Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
          <Info className="w-4 h-4 text-indigo-600" />
          <span>Executive Assessment Summary</span>
        </h3>
        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded border border-slate-200 font-sans">
          {assessment.summary}
        </p>

        {/* Language & Framework Badges */}
        <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-semibold">Languages:</span>
            {assessment.primary_languages_json?.map((l) => (
              <span key={l.language} className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 text-[11px] font-medium">
                {l.language} ({l.percentage}%)
              </span>
            ))}
          </div>

          {assessment.frameworks_json && assessment.frameworks_json.length > 0 && (
            <div className="flex items-center space-x-1.5 border-l border-slate-200 pl-4">
              <span className="text-slate-500 font-semibold">Frameworks:</span>
              {assessment.frameworks_json.map((fw) => (
                <span
                  key={fw}
                  className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-medium border border-indigo-100"
                >
                  {fw}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Missing Critical Files Checklist */}
      {assessment.missing_critical_files && Array.isArray(assessment.missing_critical_files) && assessment.missing_critical_files.length > 0 && (
        <div className="bg-white rounded-lg border border-amber-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 text-amber-600" />
              <span>Missing Foundational Project Files ({assessment.missing_critical_files.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">Structural Checklist</span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden bg-slate-50/50">
            {assessment.missing_critical_files.map((item, idx) => (
              <div key={idx} className="p-3 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-800">{item.file}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        item.importance === "CRITICAL"
                          ? "bg-rose-100 text-rose-800"
                          : item.importance === "HIGH"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.importance}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Structure Tree (Collapsible) */}
      {assessment.project_tree && Array.isArray(assessment.project_tree) && assessment.project_tree.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowTree(!showTree)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
          >
            <div className="flex items-center space-x-2">
              <FolderTree className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Project Structure Tree</span>
              <span className="text-[11px] text-slate-500">({assessment.project_tree.length} entries)</span>
            </div>
            <span className="text-xs text-indigo-600 font-medium">{showTree ? "Hide Tree" : "View Tree"}</span>
          </button>

          {showTree && (
            <div className="p-4 border-t border-slate-200 bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-72">
              <pre>{assessment.project_tree.join("\n")}</pre>
            </div>
          )}
        </div>
      )}

      {/* Multi-Language Capability Matrix */}
      {assessment.capability_matrix && Array.isArray(assessment.capability_matrix) && assessment.capability_matrix.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Static Analyzer Capability Matrix</span>
          </h3>
          <p className="text-xs text-slate-500">
            Explicit verification boundaries and AST support levels across scanned programming languages.
          </p>

          <div className="border border-slate-200 rounded-md overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-2.5">Language</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Supported Checks</th>
                  <th className="p-2.5">Scope & Limitations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {assessment.capability_matrix.map((row) => (
                  <tr key={row.language} className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-bold font-mono text-slate-900">{row.language}</td>
                    <td className="p-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          row.status === "Supported"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.status === "Partial"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-[11px]">
                      {row.supported_checks && Array.isArray(row.supported_checks) && row.supported_checks.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.supported_checks.map((chk) => (
                            <span key={chk} className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px]">
                              {chk}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">Heuristic file inventory only</span>
                      )}
                    </td>
                    <td className="p-2.5 text-[11px] text-slate-500 max-w-xs">{row.limitations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 10-Dimension Scorecard Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">10-Dimension Production Scorecard</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(assessment.dimension_scores_json || {}).map(([dimName, rawData]: [string, any]) => {
            const data = typeof rawData === "object" && rawData !== null ? rawData : {};
            const score = typeof rawData === "number" ? rawData : (typeof data.score === "number" ? data.score : 0);
            const weight = typeof data.weight === "number" ? data.weight : 0.1;
            const status = data.status || (score >= 80 ? "EXCELLENT" : score >= 60 ? "GOOD" : "NEEDS_WORK");
            const findingsCount = data.findings_count ?? 0;
            const passedChecks = data.passed_checks ?? (score >= 80 ? 4 : 2);
            const failedChecks = data.failed_checks ?? findingsCount;
            const unverifiedChecks = data.unverified_checks ?? 0;
            const confidence = data.confidence || "HIGH";
            const coverage = Math.round((data.evidence_coverage ?? 1.0) * 100);

            return (
              <div key={dimName} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-xs text-slate-900">{dimName}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      status === "EXCELLENT"
                        ? "bg-emerald-100 text-emerald-800"
                        : status === "GOOD"
                        ? "bg-blue-100 text-blue-800"
                        : status === "MARGINAL"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Score: {score.toFixed(1)} / 100</span>
                    <span>Weight: {(weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                    />
                  </div>
                </div>

                {/* Detailed Check Breakdown */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-500">
                  <div className="bg-slate-50 p-1.5 rounded">
                    <span className="text-emerald-700 font-bold">{passedChecks}</span> Passed
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded">
                    <span className="text-rose-700 font-bold">{failedChecks}</span> Failed
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded">
                    <span className="text-slate-600 font-bold">{unverifiedChecks}</span> Unverified
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                  <span className="font-mono text-[10px] text-slate-400">
                    Confidence: {confidence} • Coverage: {coverage}%
                  </span>
                  <button
                    onClick={() => setDimensionFilter(dimName)}
                    className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                  >
                    Filter findings
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prioritized Action Plan / Recommendations */}
      {assessment.recommendations_json && assessment.recommendations_json.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Prioritized Remediation Action Plan</span>
          </h3>
          <div className="space-y-2.5">
            {assessment.recommendations_json.map((rec, i) => (
              <div
                key={i}
                className="p-3 rounded border border-slate-200 bg-slate-50 flex items-start space-x-3 text-xs"
              >
                <span className="font-mono font-bold text-slate-400 mt-0.5">{i + 1}.</span>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{rec.title}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        rec.priority === "CRITICAL"
                          ? "bg-rose-100 text-rose-800"
                          : rec.priority === "HIGH"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {rec.priority}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">({rec.dimension})</span>
                  </div>
                  <p className="text-slate-600">{rec.action}</p>
                  <div className="text-[11px] font-mono text-slate-400">Target: {rec.target_file}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Findings Explorer */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span>Findings & Code Evidence ({filteredFindings.length})</span>
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Filter Pills */}
            <div className="flex rounded border border-slate-200 overflow-hidden text-xs">
              {["all", "critical", "high", "medium", "low"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 capitalize ${
                    severityFilter === sev
                      ? "bg-indigo-600 text-white font-semibold"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Dimension Filter Select */}
            <select
              value={dimensionFilter}
              onChange={(e) => setDimensionFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Dimensions</option>
              {Object.keys(assessment.dimension_scores_json || {}).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search filter input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter findings by file, title, or rule ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Findings List */}
        {filteredFindings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No findings matching the selected filter criteria.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFindings.map((finding) => (
              <div
                key={finding.id}
                className="p-4 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 transition space-y-2.5 text-xs shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="flex items-center space-x-2">
                    {getSeverityBadge(finding.severity)}
                    <span className="font-bold text-slate-900">{finding.title}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">{finding.rule_id}</span>
                </div>

                <p className="text-slate-600">{finding.description}</p>

                <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                  <Code className="w-3.5 h-3.5 text-slate-400" />
                  <span>{finding.file_path}</span>
                  {finding.line_number && <span className="text-slate-400">:{finding.line_number}</span>}
                </div>

                {finding.evidence_snippet && (
                  <div className="bg-slate-900 text-slate-200 font-mono text-[11px] p-2.5 rounded overflow-x-auto">
                    <code>{finding.evidence_snippet}</code>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 text-[11px] flex items-start space-x-1.5">
                  <span className="font-semibold text-emerald-700">Remediation:</span>
                  <span className="text-slate-600">{finding.remediation_advice}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900">Delete Codebase Assessment</h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">{assessment.project_name}</span>?
              This action will permanently delete all assessment findings, scorecard metrics, and workspace artifacts.
              This cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
