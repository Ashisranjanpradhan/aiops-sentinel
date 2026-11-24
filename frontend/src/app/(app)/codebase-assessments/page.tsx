"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileCode2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface CodebaseAssessment {
  id: string;
  project_name: string;
  source_type: string;
  source_size_bytes: number;
  file_count: number;
  primary_languages_json: Array<{ language: string; files: number; percentage: number }>;
  frameworks_json: string[];
  overall_score: number;
  readiness_level: string;
  summary: string;
  created_at: string;
  findings_count: number;
}

export default function CodebaseAssessmentsPage() {
  const [assessments, setAssessments] = useState<CodebaseAssessment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<CodebaseAssessment[]>("/assessments?page=1&page_size=50");
      setAssessments(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load codebase assessments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const filtered = assessments.filter((a) =>
    a.project_name.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = assessments.length
    ? (assessments.reduce((acc, curr) => acc + curr.overall_score, 0) / assessments.length).toFixed(1)
    : "0.0";

  const readyCount = assessments.filter((a) => a.readiness_level === "PRODUCTION_READY").length;
  const highRiskCount = assessments.filter((a) => a.readiness_level === "HIGH_RISK").length;

  const getReadinessBadge = (level: string) => {
    switch (level) {
      case "PRODUCTION_READY":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
            Production Ready
          </span>
        );
      case "NEAR_PRODUCTION":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
            Near Production
          </span>
        );
      case "NEEDS_WORK":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
            Needs Remediation
          </span>
        );
      case "HIGH_RISK":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
            High Risk
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Codebase Production-Readiness</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Deterministic 10-dimension static analysis, security hygiene verification, and release gating.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAssessments}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/codebase-assessments/new"
            className="inline-flex items-center px-3.5 py-1.5 border border-transparent rounded text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Assessment
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Evaluated</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{assessments.length}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Uploaded codebases</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Mean Readiness Score</div>
          <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">{avgScore} / 100</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Across all dimensions</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Production Ready</div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{readyCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Passed release thresholds</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">High Risk / Blocked</div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">{highRiskCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Critical security or testing deficits</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search assessments by project name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Assessments List / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-600 dark:text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600 dark:text-indigo-400 mb-2" />
            Loading assessment records...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-600 dark:text-rose-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileCode2 className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No codebase assessments found</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              Upload a project ZIP or select repository files to perform automated production-readiness inspection.
            </p>
            <div className="pt-2">
              <Link
                href="/codebase-assessments/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Upload Codebase for Assessment
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Project / Repository</th>
                  <th className="px-5 py-3">Readiness Level</th>
                  <th className="px-5 py-3">Readiness Score</th>
                  <th className="px-5 py-3">Files & Languages</th>
                  <th className="px-5 py-3">Findings</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                      <Link
                        href={`/codebase-assessments/${item.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1.5 font-bold"
                      >
                        <span>{item.project_name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      </Link>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {item.source_type.toUpperCase()} • {(item.source_size_bytes / 1024).toFixed(1)} KB
                      </div>
                    </td>

                    <td className="px-5 py-3.5">{getReadinessBadge(item.readiness_level)}</td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{item.overall_score.toFixed(1)}%</span>
                        <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              item.overall_score >= 80
                                ? "bg-emerald-500"
                                : item.overall_score >= 60
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, item.overall_score)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.file_count} files</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.primary_languages_json?.slice(0, 3).map((l) => (
                          <span
                            key={l.language}
                            className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px]"
                          >
                            {l.language} ({l.percentage}%)
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="font-mono font-semibold text-slate-700">{item.findings_count}</span>
                      <span className="text-[11px] text-slate-400 ml-1">items</span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                      {new Date(item.created_at).toLocaleString()}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/codebase-assessments/${item.id}`}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition"
                      >
                        Inspect
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
