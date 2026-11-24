import React from "react";
import Link from "next/link";
import { 
  Code2, 
  Activity, 
  FileCheck2, 
  ShieldCheck, 
  Layers, 
  FolderGit2, 
  Lock, 
  Cpu, 
  Workflow, 
  CheckCircle2, 
  Download, 
  ArrowRight,
  GitPullRequest,
  Gauge,
  SearchCode,
  Network,
  Terminal,
  AlertTriangle,
  FileCode
} from "lucide-react";

export const metadata = {
  title: "Features | AIOps Sentinel",
  description: "Comprehensive technical capabilities across Codebase Production-Readiness Assessment and Runtime Reliability Intelligence.",
};

const CODEBASE_DIMENSIONS = [
  {
    num: 1,
    name: "Architecture & Structural Integrity",
    desc: "Evaluates layered separation, cyclical dependency loops, framework idiomatic layout, and clean service interfaces.",
    weight: "12%",
    checks: ["Circular import detection", "Layer boundary compliance", "Decoupled domain models"]
  },
  {
    num: 2,
    name: "Modularity & Component Cohesion",
    desc: "Analyzes module fan-in/fan-out, function cyclomatic complexity, Single Responsibility Principle compliance, and abstraction depth.",
    weight: "10%",
    checks: ["Low cyclomatic complexity thresholds", "Clean public API surface", "Bounded context adherence"]
  },
  {
    num: 3,
    name: "Security, Secrets & Vulnerabilities",
    desc: "Comprehensive AST scanning for hardcoded secrets, insecure API keys, dangerous deserialization calls, and SQL injection risks.",
    weight: "15%",
    checks: ["High-entropy secret detection", "Zero plain-text private keys", "Parameterized DB queries"]
  },
  {
    num: 4,
    name: "Reliability & Error Handling",
    desc: "Checks for unhandled asynchronous promises, bare except/catch clauses, missing circuit breakers, and network timeout definitions.",
    weight: "12%",
    checks: ["No swallow-all catch blocks", "Mandatory HTTP client timeouts", "Graceful shutdown hooks"]
  },
  {
    num: 5,
    name: "Performance & Resource Efficiency",
    desc: "Identifies blocking I/O on async loops, N+1 query patterns, unbounded memory accumulation, and unindexed database lookups.",
    weight: "10%",
    checks: ["Non-blocking async event loops", "Batch query enforcement", "Bounded stream buffering"]
  },
  {
    num: 6,
    name: "Testing & Quality Assurance",
    desc: "Scans for test suites, unit vs integration separation, test assertion density, mock sanity, and code coverage configurations.",
    weight: "10%",
    checks: ["Presence of unit & integration tests", "High assertion density", "Deterministic fixture setup"]
  },
  {
    num: 7,
    name: "Docker & Containerization",
    desc: "Inspects Dockerfiles for non-root USER execution, multi-stage builds, pin versions, and minimal base images (Alpine/Distroless).",
    weight: "8%",
    checks: ["Non-root user declaration", "Multi-stage artifact extraction", "No dangling secret build-args"]
  },
  {
    num: 8,
    name: "CI/CD & Automation",
    desc: "Evaluates pipeline definitions (.github/workflows, .gitlab-ci.yml), linting enforcement, automated test triggers, and release tagging.",
    weight: "8%",
    checks: ["Automated pull-request triggers", "Strict linting & type checks", "Artifact provenance signing"]
  },
  {
    num: 9,
    name: "Observability & Telemetry Readiness",
    desc: "Checks for OpenTelemetry trace header propagation, structured JSON logging, Prometheus metric endpoints, and health probes.",
    weight: "10%",
    checks: ["OTel context propagation", "Structured JSON logging", "/healthz & /readyz probes"]
  },
  {
    num: 10,
    name: "Documentation & Maintainability",
    desc: "Reviews README quality, architecture diagrams, docstrings, OpenAPI/Swagger specifications, and licensing files.",
    weight: "5%",
    checks: ["Comprehensive setup README", "OpenAPI/Swagger route docs", "Valid LICENSE file"]
  }
];

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header Banner */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span>Platform Specification</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Complete Feature Deep-Dive
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            A comprehensive overview of AIOps Sentinel&apos;s two interconnected pillars: 
            Static Codebase Production-Readiness Assessment and Runtime Reliability Intelligence.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        {/* PILLAR 1: CODEBASE PRODUCTION-READINESS ASSESSMENT */}
        <section id="codebase-intelligence" className="space-y-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
              <Code2 className="w-4 h-4" />
              <span>PILLAR ONE</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              Codebase Production-Readiness Assessment
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Before deploying any software into production, AIOps Sentinel grades its structural, operational, and security readiness. 
              The assessment engine parses raw Abstract Syntax Trees (ASTs) in an isolated sandbox, ensuring zero untrusted code execution.
            </p>
          </div>

          {/* Ingestion Modes */}
          <div id="ingestion" className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-blue-500" />
              Flexible, Sandboxed Ingestion Modes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-card rounded-xl border border-border space-y-2">
                <span className="text-xs font-bold text-foreground block">ZIP Archive Upload</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload compressed repositories up to 100MB. The extractor enforces strict Zip-Slip path sanitization, 
                  rejecting path traversal sequences (`../`) and symlink attacks.
                </p>
              </div>

              <div className="p-5 bg-card rounded-xl border border-border space-y-2">
                <span className="text-xs font-bold text-foreground block">Local Folder Selection</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Point the Sentinel CLI or UI to an existing directory. Scans the file tree deterministically 
                  while honoring `.gitignore` and skipping generated `node_modules` or `vendor` trees.
                </p>
              </div>

              <div className="p-5 bg-card rounded-xl border border-border space-y-2">
                <span className="text-xs font-bold text-foreground block">Multi-File Program Selection</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Evaluate individual program files (.py, .ts, .js, .go, Dockerfiles, yaml manifests) 
                  for rapid pre-commit validation and targeted function inspections.
                </p>
              </div>
            </div>
          </div>

          {/* 10-Dimension Rubric */}
          <div id="rubric" className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" />
                The 10-Dimension Evaluation Rubric
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Every codebase is graded across 10 mathematically normalized dimensions. Zero mocked or hardcoded scores.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CODEBASE_DIMENSIONS.map((dim) => (
                <div key={dim.num} className="p-4 bg-card rounded-xl border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-xs font-bold flex items-center justify-center">
                        {dim.num}
                      </span>
                      <h4 className="text-sm font-bold text-foreground">{dim.name}</h4>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted">
                      Weight: {dim.weight}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {dim.desc}
                  </p>
                  <ul className="space-y-1 pt-1">
                    {dim.checks.map((check, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{check}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* SARIF & Artifacts */}
          <div id="sarif" className="p-6 bg-muted/40 rounded-2xl border border-border space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Standardized Export Formats & CI/CD Gates
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Sentinel generates three standard evaluation artifacts on every assessment run:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-card rounded-lg border border-border">
                <span className="text-xs font-bold text-foreground block">SARIF v2.1.0</span>
                <span className="text-[11px] text-muted-foreground block mt-1">
                  Static Analysis Results Interchange Format. Directly uploadable to GitHub Code Scanning & GitLab SAST.
                </span>
              </div>
              <div className="p-3 bg-card rounded-lg border border-border">
                <span className="text-xs font-bold text-foreground block">Interactive HTML Report</span>
                <span className="text-[11px] text-muted-foreground block mt-1">
                  Self-contained standalone HTML report with collapsible findings, line snippets, and visual score dials.
                </span>
              </div>
              <div className="p-3 bg-card rounded-lg border border-border">
                <span className="text-xs font-bold text-foreground block">Structured JSON Manifest</span>
                <span className="text-[11px] text-muted-foreground block mt-1">
                  Machine-readable JSON schema for automated policy evaluation gates and Slack/PagerDuty webhooks.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* PILLAR 2: RUNTIME RELIABILITY INTELLIGENCE */}
        <section id="runtime-reliability" className="space-y-12 pt-8 border-t border-border">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <Activity className="w-4 h-4" />
              <span>PILLAR TWO</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              Runtime Reliability Intelligence
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Once deployed, Sentinel continuously ingests distributed telemetry to identify multi-variate degradations, 
              construct dynamic dependency graphs, and pinpoint root causes with causal precision.
            </p>
          </div>

          {/* Telemetry Stack */}
          <div id="telemetry" className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              OpenTelemetry Native Integration
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              No proprietary agents required. Connect standard OTel SDKs directly via OTLP/gRPC (port 4317) or OTLP/HTTP (port 4318).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 bg-card rounded-xl border border-border space-y-1">
                <span className="text-xs font-bold text-foreground block">OpenTelemetry Collector</span>
                <span className="text-[11px] text-muted-foreground">High-throughput trace and metric pipeline</span>
              </div>
              <div className="p-4 bg-card rounded-xl border border-border space-y-1">
                <span className="text-xs font-bold text-foreground block">Prometheus 2.50</span>
                <span className="text-[11px] text-muted-foreground">Time-series storage for Golden Signals</span>
              </div>
              <div className="p-4 bg-card rounded-xl border border-border space-y-1">
                <span className="text-xs font-bold text-foreground block">Grafana Loki 2.9</span>
                <span className="text-[11px] text-muted-foreground">Log aggregation indexed by trace context</span>
              </div>
              <div className="p-4 bg-card rounded-xl border border-border space-y-1">
                <span className="text-xs font-bold text-foreground block">Grafana Tempo 2.3</span>
                <span className="text-[11px] text-muted-foreground">Distributed trace waterfall storage</span>
              </div>
            </div>
          </div>

          {/* Live Topology */}
          <div id="topology" className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Network className="w-5 h-5 text-emerald-500" />
              Dynamic Topology & Golden Signals
            </h3>
            <div className="p-5 bg-card rounded-xl border border-border space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Sentinel listens to incoming distributed trace spans and automatically derives the directed acyclic graph (DAG) 
                representing inter-service dependencies. Each node is continuously scored against the Four Golden Signals:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-xs font-bold text-foreground block">Latency</span>
                  <span className="text-[11px] text-muted-foreground">p50, p90, p95, p99 percentiles</span>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-xs font-bold text-foreground block">Throughput</span>
                  <span className="text-[11px] text-muted-foreground">Requests per second (RPS)</span>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-xs font-bold text-foreground block">Errors</span>
                  <span className="text-[11px] text-muted-foreground">HTTP 5xx & exception rates</span>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-xs font-bold text-foreground block">Saturation</span>
                  <span className="text-[11px] text-muted-foreground">Pool & queue utilization</span>
                </div>
              </div>
            </div>
          </div>

          {/* Anomaly Detection */}
          <div id="anomaly" className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-500" />
              Statistical Anomaly Detection (MAD, EWMA & Isolation Forest)
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Fixed static alert thresholds fail in modern dynamic environments. Sentinel utilizes adaptive non-parametric statistical models:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-card rounded-xl border border-border space-y-2">
                <span className="text-xs font-bold text-foreground block">Median Absolute Deviation (MAD)</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Robust measure of statistical dispersion. Immune to extreme outliers that distort traditional standard deviation baselines.
                </p>
              </div>

              <div className="p-4 bg-card rounded-xl border border-border space-y-2">
                <span className="text-xs font-bold text-foreground block">Online EWMA Drift</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Exponentially Weighted Moving Average tracks temporal trends and subtle baseline drifts over sliding windows.
                </p>
              </div>

              <div className="p-4 bg-card rounded-xl border border-border space-y-2">
                <span className="text-xs font-bold text-foreground block">Isolation Forest</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Multi-variate tree ensemble identifying anomalous combinations of latency and resource consumption in high-dimensional space.
                </p>
              </div>
            </div>
          </div>

          {/* Root-Cause Analysis */}
          <div id="rca" className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <SearchCode className="w-5 h-5 text-emerald-500" />
              Causal Root-Cause Analysis (Random Walk with Restart)
            </h3>
            <div className="p-5 bg-card rounded-xl border border-border space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                When an alert fires, downstream services cascade into errors. Sentinel does not blame the API gateway; 
                instead, it executes a Random Walk with Restart (RWR) algorithm over the directed call graph weighted by telemetry anomaly scores.
              </p>
              <div className="p-3 bg-muted rounded-lg font-mono text-xs text-foreground/90 space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase font-sans font-semibold">Algorithm Execution:</p>
                <p>1. Identify anomalous symptom nodes across mesh</p>
                <p>2. Build transition probability matrix P based on call frequency and latency divergence</p>
                <p>3. Iterate r^(t+1) = (1 - c) * P * r^(t) + c * e until convergence</p>
                <p>4. Rank nodes by stationary distribution probability vector</p>
              </div>
            </div>
          </div>

          {/* Guarded Remediation */}
          <div id="remediation" className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Guarded Human-in-the-Loop Remediation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-card rounded-xl border border-border space-y-2">
                <span className="text-xs font-bold text-foreground block">Role-Based Access Control (RBAC)</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Strict authorization boundaries. Only certified Operators and Administrators can approve and trigger remediation actions.
                </p>
              </div>

              <div className="p-4 bg-card rounded-xl border border-border space-y-2">
                <span className="text-xs font-bold text-foreground block">Audited Dry-Runs & Rollbacks</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Every proposed remediation includes a dry-run diff, estimated blast radius, risk tier, and instant automated rollback triggers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Ready to test AIOps Sentinel?</h3>
            <p className="text-xs text-muted-foreground">Sign in to the live console or view our mathematical formulations.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/research"
              className="px-4 py-2 rounded-lg bg-card border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors"
            >
              Read Research
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition-colors"
            >
              Launch Console
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
