"use client";

import React, { useState } from "react";
import { 
  FileCheck2, 
  AlertOctagon, 
  Network, 
  ShieldCheck, 
  Download, 
  ExternalLink, 
  ArrowUpRight,
  TrendingUp,
  Cpu,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";

interface ShowcaseTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  description: string;
  badge: string;
}

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    id: "assessment",
    label: "Codebase Assessment",
    icon: FileCheck2,
    tagline: "Pre-deployment software readiness grading and SARIF export",
    description: "Evaluates codebase quality across 10 critical dimensions before deployment. Identifies missing health checks, unhandled exceptions, hardcoded secrets, and missing observability hooks.",
    badge: "Codebase Intelligence"
  },
  {
    id: "incidents",
    label: "Incident Investigation",
    icon: AlertOctagon,
    tagline: "Pinpoint root cause with topological random-walk ranking",
    description: "Correlates multi-variate statistical anomalies from OpenTelemetry metrics and traces, tracing back to the true causal root rather than cascading symptom services.",
    badge: "Runtime Reliability"
  },
  {
    id: "topology",
    label: "Topology & Health",
    icon: Network,
    tagline: "Dynamic microservice dependency graph with Golden Signals",
    description: "Real-time service mesh topology reconstructed from distributed trace contexts. Color-coded health statuses with instant latency percentile inspection.",
    badge: "Observability"
  },
  {
    id: "remediation",
    label: "Remediation Guardrails",
    icon: ShieldCheck,
    tagline: "Human-in-the-loop operational actions with dry-run diffs",
    description: "Synthesizes mitigation recipes with risk scores and strict operator sign-off requirements. Complete audit logging prevents unintended outages.",
    badge: "Production Safety"
  }
];

export default function ProjectShowcase() {
  const [activeTabId, setActiveTabId] = useState<string>("assessment");
  const activeTab = SHOWCASE_TABS.find(t => t.id === activeTabId) || SHOWCASE_TABS[0];

  return (
    <div className="w-full bg-card rounded-2xl border border-border shadow-lg p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            Interactive Product Preview
          </span>
          <h3 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground mt-2">
            Experience the Sentinel Console
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Explore authentic platform views engineered for high-velocity software engineering and SRE teams.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors shrink-0 shadow-sm"
        >
          <span>Launch Live App</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mt-6 overflow-x-auto scrollbar-none gap-2">
        {SHOWCASE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              role="tab"
              aria-selected={isActive}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Preview Area */}
      <div className="mt-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                {activeTab.badge}
              </span>
              <span className="text-sm font-bold text-foreground">
                {activeTab.tagline}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTab.description}
            </p>
          </div>
        </div>

        {/* Tab 1: Codebase Assessment Preview */}
        {activeTabId === "assessment" && (
          <div className="bg-muted/40 rounded-xl border border-border p-4 lg:p-6 space-y-4 font-mono text-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-card p-4 rounded-lg border border-border gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">payment-gateway-service.zip</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                    GRADE A (88/100)
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Scanned 142 source files &bull; 18,420 SLOC &bull; Language: Python / TypeScript &bull; Sandbox Mode: Clean
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-md bg-muted border border-border text-foreground hover:bg-muted/80 flex items-center gap-1.5 text-xs transition-colors">
                  <Download className="w-3.5 h-3.5" /> SARIF v2.1.0
                </button>
                <button className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 text-xs transition-colors">
                  <Download className="w-3.5 h-3.5" /> HTML Report
                </button>
              </div>
            </div>

            {/* 10-Dimension Score Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[
                { name: "Architecture", score: 92, status: "Pass" },
                { name: "Modularity", score: 85, status: "Pass" },
                { name: "Security & Secrets", score: 95, status: "Pass" },
                { name: "Reliability & Errors", score: 78, status: "Warn" },
                { name: "Performance", score: 82, status: "Pass" },
                { name: "Testing Coverage", score: 70, status: "Warn" },
                { name: "Container / Docker", score: 90, status: "Pass" },
                { name: "CI/CD Gates", score: 88, status: "Pass" },
                { name: "Observability", score: 65, status: "Warn" },
                { name: "Documentation", score: 96, status: "Pass" },
              ].map((dim, idx) => (
                <div key={idx} className="p-3 bg-card rounded-lg border border-border space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground truncate">{dim.name}</span>
                    <span className={dim.score >= 80 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                      {dim.score}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full ${dim.score >= 80 ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Finding Annotations */}
            <div className="p-4 bg-card rounded-lg border border-border space-y-2">
              <span className="text-xs font-semibold text-foreground block font-sans">
                Sample Findings & Critical Action Items:
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Observability [L42]:</strong> HTTP client instantiated without OpenTelemetry trace propagation headers. Requests will break distributed context.
                  </span>
                </div>
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Security [Verified]:</strong> Zero plaintext API tokens or hardcoded private keys detected across AST scan.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Incident Investigation Preview */}
        {activeTabId === "incidents" && (
          <div className="bg-muted/40 rounded-xl border border-border p-4 lg:p-6 space-y-4 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-card p-4 rounded-lg border border-border gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20">
                    CRITICAL INCIDENT #INC-8924
                  </span>
                  <span className="text-xs font-bold text-foreground">Checkout Latency Explosion</span>
                </div>
                <p className="text-muted-foreground text-[11px] mt-1">
                  Detected at 2026-11-23 14:22 UTC &bull; Root Cause Confidence: 94.2% &bull; RCAEval Rank #1
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-rose-500 text-white font-sans font-medium self-start sm:self-auto">
                Investigation Active
              </span>
            </div>

            {/* Root Cause Ranking Table */}
            <div className="bg-card rounded-lg border border-border p-4 space-y-3">
              <span className="text-xs font-semibold text-foreground block font-sans">
                Probable Root-Cause Ranking (Random Walk with Restart):
              </span>
              <div className="space-y-2">
                {[
                  { rank: 1, service: "database-proxy-cluster", score: "0.892", role: "Root Cause (Connection Pool Exhaustion)", isRoot: true },
                  { rank: 2, service: "payment-api-service", score: "0.412", role: "Cascading Latency Symptom", isRoot: false },
                  { rank: 3, service: "web-gateway-ingress", score: "0.198", role: "Cascading 504 Timeout Symptom", isRoot: false },
                ].map((item) => (
                  <div
                    key={item.rank}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      item.isRoot
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                        : "bg-muted/50 border-border text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-xs">
                        #{item.rank}
                      </span>
                      <div>
                        <span className="font-bold block text-xs">{item.service}</span>
                        <span className="text-[10px] text-muted-foreground">{item.role}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Anomaly Score</span>
                      <span className="font-bold text-xs">{item.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Topology & Health Preview */}
        {activeTabId === "topology" && (
          <div className="bg-muted/40 rounded-xl border border-border p-4 lg:p-6 space-y-4 font-mono text-xs">
            <div className="bg-card p-4 rounded-lg border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-xs font-bold text-foreground">Mesh Health: 8 Services Active</span>
                <p className="text-[11px] text-muted-foreground">OTel Dynamic Graph Discovery &bull; Auto-refreshing 5s</p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 7 Healthy</span>
                <span className="flex items-center gap-1 text-rose-500"><span className="w-2 h-2 rounded-full bg-rose-500"></span> 1 Degraded</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { name: "gateway-ingress", p95: "18ms", rps: "1,420 rps", err: "0.01%", ok: true },
                { name: "auth-service", p95: "24ms", rps: "310 rps", err: "0.00%", ok: true },
                { name: "orders-api", p95: "35ms", rps: "520 rps", err: "0.02%", ok: true },
                { name: "payment-service", p95: "480ms", rps: "280 rps", err: "4.85%", ok: false },
              ].map((svc, i) => (
                <div key={i} className={`p-3.5 bg-card rounded-lg border ${svc.ok ? "border-border" : "border-rose-500/40 bg-rose-500/5"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-foreground truncate">{svc.name}</span>
                    <span className={`w-2 h-2 rounded-full ${svc.ok ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
                  </div>
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>p95 Latency:</span>
                      <span className={svc.ok ? "text-foreground font-semibold" : "text-rose-500 font-bold"}>{svc.p95}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Throughput:</span>
                      <span className="text-foreground">{svc.rps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Error Rate:</span>
                      <span className={svc.ok ? "text-foreground" : "text-rose-500 font-bold"}>{svc.err}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Remediation Preview */}
        {activeTabId === "remediation" && (
          <div className="bg-muted/40 rounded-xl border border-border p-4 lg:p-6 space-y-4 font-mono text-xs">
            <div className="bg-card p-4 rounded-lg border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-xs font-bold text-foreground">Remediation Plan #REM-419</span>
                <p className="text-[11px] text-muted-foreground">Generated for Incident #INC-8924 &bull; Risk Level: LOW (Reversible)</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold">
                Requires Operator Approval
              </span>
            </div>

            <div className="p-4 bg-card rounded-lg border border-border space-y-3 font-sans">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Proposed Action: Scale Pool & Evict Stale Connections
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Increase database connection pool max connections from 50 to 120 and perform progressive eviction of idle leaked handles.
              </p>
              <div className="p-3 bg-muted rounded-lg font-mono text-[11px] text-foreground/90 overflow-x-auto">
                <code>
                  {`$ kubectl patch deployment/db-pool-proxy -p '{"spec":{"template":{"spec":{"containers":[{"name":"proxy","env":[{"name":"POOL_MAX","value":"120"}]}]}}}}'`}
                </code>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors">
                  Approve & Execute (Operator Charlie)
                </button>
                <button className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold transition-colors">
                  Reject & Escalate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
