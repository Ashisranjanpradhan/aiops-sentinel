"use client";

import React from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowRight, 
  Code2, 
  Activity, 
  Layers, 
  Terminal, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  Cpu, 
  Lock, 
  Gauge, 
  Workflow, 
  GitPullRequest, 
  ExternalLink,
  ChevronRight
} from "lucide-react";
import AnimatedTopologyGraph from "@/components/home/AnimatedTopologyGraph";
import AnimatedTelemetryStream from "@/components/home/AnimatedTelemetryStream";
import WorkflowVisualizer from "@/components/home/WorkflowVisualizer";
import InteractiveArchitectureDiagram from "@/components/home/InteractiveArchitectureDiagram";
import ProjectShowcase from "@/components/home/ProjectShowcase";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden border-b border-border">
        {/* Subtle background ambient gradients */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute -top-40 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Pill Announcement */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Unified Reliability Intelligence &bull; OpenTelemetry Native</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Verify Code Before Deployment.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400">
                Guard Reliability at Runtime.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              AIOps Sentinel bridges pre-deployment codebase assessment with real-time distributed telemetry. 
              Evaluate repository readiness across 10 critical dimensions, detect statistical anomalies, 
              and pinpoint root causes across microservices.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2 group"
              >
                <span>Launch Sentinel Console</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/features"
                className="px-6 py-3 rounded-xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted/60 transition-all flex items-center gap-2"
              >
                <span>Explore Capabilities</span>
              </Link>

              <Link
                href="/research"
                className="px-6 py-3 rounded-xl bg-muted/50 border border-transparent text-muted-foreground hover:text-foreground font-medium text-sm transition-all"
              >
                <span>Read Benchmark Paper</span>
              </Link>
            </div>

            {/* Pillar Badges */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
              <div className="p-3 bg-card/60 backdrop-blur rounded-lg border border-border">
                <span className="text-xs font-bold text-foreground block">10-Dimension Rubric</span>
                <span className="text-[11px] text-muted-foreground">AST static codebase scoring</span>
              </div>
              <div className="p-3 bg-card/60 backdrop-blur rounded-lg border border-border">
                <span className="text-xs font-bold text-foreground block">SARIF & HTML Export</span>
                <span className="text-[11px] text-muted-foreground">CI/CD pipeline policy gates</span>
              </div>
              <div className="p-3 bg-card/60 backdrop-blur rounded-lg border border-border">
                <span className="text-xs font-bold text-foreground block">OTel Golden Signals</span>
                <span className="text-[11px] text-muted-foreground">Multi-variate MAD & EWMA</span>
              </div>
              <div className="p-3 bg-card/60 backdrop-blur rounded-lg border border-border">
                <span className="text-xs font-bold text-foreground block">Causal RCA Ranking</span>
                <span className="text-[11px] text-muted-foreground">RCAEval benchmarked models</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DUAL PILLARS SUMMARY */}
      <section className="py-16 bg-muted/20 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Two Interconnected Pillars of Software Resilience
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Most tools look at code in isolation or react after production collapses. 
              AIOps Sentinel unifies both sides of the reliability lifecycle into one coherent intelligence plane.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pillar 1 */}
            <div className="bg-card rounded-2xl border border-border p-6 lg:p-8 relative overflow-hidden flex flex-col justify-between shadow-xs hover:border-border-strong transition-all">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Code2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 tracking-wider uppercase">Pillar One</span>
                  <h3 className="text-xl font-bold text-foreground mt-1">Codebase Production-Readiness</h3>
                </div>
                <p className="text-sm text-text-body leading-relaxed">
                  Upload a ZIP archive, folder, or multi-file bundle. The sandboxed AST engine analyzes architecture, 
                  modularity, secrets, error handling, testing, Docker, CI/CD, and observability readiness without executing untrusted code.
                </p>
                <ul className="space-y-2 pt-2 text-xs text-text-secondary">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Deterministic 0–100 production readiness grade</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Industry-standard SARIF v2.1.0 output for CI/CD gates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Actionable line-level remediation checklists</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-border">
                <Link
                  href="/features#codebase-intelligence"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  <span>Deep dive into Codebase Intelligence</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-card rounded-2xl border border-border p-6 lg:p-8 relative overflow-hidden flex flex-col justify-between shadow-xs hover:border-border-strong transition-all">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-wider uppercase">Pillar Two</span>
                  <h3 className="text-xl font-bold text-foreground mt-1">Runtime Reliability Intelligence</h3>
                </div>
                <p className="text-sm text-text-body leading-relaxed">
                  Stream live telemetry via OpenTelemetry, Prometheus, Loki, and Tempo. Dynamic service graphs, 
                  statistical anomaly detection, and causal topological random walks pinpoint real root causes during incidents.
                </p>
                <ul className="space-y-2 pt-2 text-xs text-text-secondary">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Adaptive non-parametric anomaly detection (MAD & EWMA)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Topological Root-Cause Analysis with RCAEval validation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Operator-in-the-loop remediation with RBAC safeguards</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-border">
                <Link
                  href="/features#runtime-reliability"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <span>Deep dive into Runtime Reliability</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DYNAMIC VISUALIZATION 1: TOPOLOGY & TELEMETRY */}
      <section className="py-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Live Mesh Dynamics</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
              Interactive Microservice Topology & Telemetry
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Explore dynamic service interactions and see how anomalies propagate across downstream dependencies in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <AnimatedTopologyGraph />
            <AnimatedTelemetryStream />
          </div>
        </div>
      </section>

      {/* 4. WORKFLOW VISUALIZER */}
      <section className="py-16 bg-muted/10 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <WorkflowVisualizer />
        </div>
      </section>

      {/* 5. EIGHT PLATFORM CAPABILITIES */}
      <section className="py-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Comprehensive Toolset</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
              Eight Core Enterprise Capabilities
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Engineered from the ground up for software architects, reliability engineers, and DevOps leads.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: FileText,
                title: "Codebase Ingestion",
                desc: "Safely ingest ZIP archives, project folders, and individual files with path sanitization and strict size boundaries.",
                link: "/features#ingestion"
              },
              {
                icon: Layers,
                title: "10-Dimension Rubric",
                desc: "Weighted AST scoring covering Architecture, Modularity, Secrets, Error Handling, Docker, Testing, and Observability.",
                link: "/features#rubric"
              },
              {
                icon: GitPullRequest,
                title: "SARIF & Policy Gates",
                desc: "Export standard SARIF v2.1.0 and interactive HTML reports to block regressions at CI/CD pull request boundaries.",
                link: "/features#sarif"
              },
              {
                icon: Activity,
                title: "OpenTelemetry Ingestion",
                desc: "Native OTLP/gRPC and HTTP ingestion aggregating Golden Signals, Prometheus metrics, Loki logs, and Tempo traces.",
                link: "/features#telemetry"
              },
              {
                icon: Gauge,
                title: "Live Topology Mapping",
                desc: "Real-time directed microservice graph reconstruction with latency percentiles, error rates, and blast radius.",
                link: "/features#topology"
              },
              {
                icon: Cpu,
                title: "Statistical Anomaly Detection",
                desc: "Non-parametric Median Absolute Deviation (MAD), EWMA drift, and Isolation Forest without fixed alert thresholds.",
                link: "/features#anomaly"
              },
              {
                icon: Workflow,
                title: "Causal RCA Ranking",
                desc: "Topological random walk over dependency graphs to isolate the root-cause culprit rather than downstream victims.",
                link: "/features#rca"
              },
              {
                icon: ShieldCheck,
                title: "Guarded Remediation",
                desc: "Role-Based Access Control and strict human-in-the-loop approval workflows for safe, verifiable production fixes.",
                link: "/features#remediation"
              }
            ].map((cap, idx) => {
              const Icon = cap.icon;
              return (
                <Link
                  key={idx}
                  href={cap.link}
                  className="group p-5 bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {cap.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>
                  <div className="pt-4 mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                    <span>Learn more</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE ARCHITECTURE DIAGRAM */}
      <section className="py-16 bg-muted/10 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <InteractiveArchitectureDiagram />
        </div>
      </section>

      {/* 7. AUTHENTIC PRODUCT SHOWCASE */}
      <section className="py-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProjectShowcase />
        </div>
      </section>

      {/* 8. RESEARCH & BENCHMARK INTEGRITY */}
      <section className="py-16 bg-muted/20 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Scientific Rigor</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Validated Against the Official RCAEval Benchmark
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Rather than claiming unverifiable AI magic, our root-cause analysis models are evaluated 
                against real microservice incident episodes from the peer-reviewed RCAEval dataset 
                (covering TrainTicket, Shopper, and SocialNetwork topologies).
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-card rounded-lg border border-border">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">Methodology</span>
                  <span className="text-sm font-bold text-foreground">RWR on Graph</span>
                </div>
                <div className="p-3 bg-card rounded-lg border border-border">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">Evaluation Metric</span>
                  <span className="text-sm font-bold text-foreground">MRR & Top-k</span>
                </div>
                <div className="p-3 bg-card rounded-lg border border-border">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">Provenance</span>
                  <span className="text-sm font-bold text-foreground">Transparent Data</span>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  href="/research"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Explore research methodology, mathematical formulas, and benchmarks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 bg-card rounded-xl border border-border p-6 space-y-3 font-mono text-xs">
              <span className="text-xs font-bold font-sans text-foreground block">
                Benchmark Provenance Guarantee
              </span>
              <div className="p-3 rounded-lg bg-muted text-muted-foreground text-[11px] space-y-1.5 leading-relaxed">
                <p>
                  &bull; <strong>Curated RCAEval Split:</strong> 60 real multi-service incident episodes.
                </p>
                <p>
                  &bull; <strong>Internal Synthetic Scenarios:</strong> Distinctly labeled separate test suite for controlled edge-case fault injections.
                </p>
                <p>
                  &bull; <strong>Zero Fabricated Metrics:</strong> All reported evaluation scores correspond directly to executable automated test fixtures.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CONTACT & GET STARTED CTA */}
      <section className="py-20 bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span>Ready for Resilient Engineering?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Transform Your Reliability Posture Today
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Deploy AIOps Sentinel in your self-hosted Kubernetes cluster or container infrastructure. 
            Connect with our engineering team for technical inquiries or schedule an architecture review.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2"
            >
              <span>Access Application</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/contact"
              className="px-6 py-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm border border-border transition-all flex items-center gap-2"
            >
              <span>Contact Engineering Team</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
