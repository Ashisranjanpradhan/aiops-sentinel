import React from "react";
import Link from "next/link";
import { 
  ShieldAlert, 
  Target, 
  Layers, 
  AlertCircle, 
  Compass, 
  Workflow, 
  Code2, 
  Activity, 
  ArrowRight,
  CheckCircle,
  HelpCircle,
  ShieldCheck
} from "lucide-react";

export const metadata = {
  title: "About | AIOps Sentinel",
  description: "Learn why AIOps Sentinel was built, our research objectives, architectural philosophy, known limitations, and engineering roadmap.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header Banner */}
      <section className="py-16 md:py-24 border-b border-border bg-surface-raised/50 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span>Engineering Philosophy & Mission</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-text-primary">
            Bridging Static Code Quality & Runtime Observability
          </h1>
          <p className="text-base sm:text-lg text-text-body leading-relaxed max-w-3xl">
            AIOps Sentinel was conceived to resolve a fundamental disconnect in modern software engineering: 
            the artificial boundary between pre-deployment codebase verification and post-deployment incident triage.
          </p>
        </div>
      </section>

      {/* Main Content Sections */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        {/* Section 1: The Problem */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              The Modern Reliability Crisis
            </h2>
          </div>
          <div className="space-y-4 text-base text-text-body leading-relaxed">
            <p>
              As organizations migrate from monolithic systems to distributed microservices, application complexity explodes exponentially. 
              A single user transaction now traverses dozens of decoupled services, asynchronous queues, and database shards. 
              In this environment, failure is not an anomaly—it is an inevitability.
            </p>
            <p>
              Traditional monitoring systems flood on-call engineers with hundreds of uncorrelated alerts when a single upstream component degrades. 
              Mean Time to Resolution (MTTR) increases as engineers struggle to distinguish between the <em>symptom</em> (e.g., an API gateway timeout) 
              and the true <em>root cause</em> (e.g., connection pool exhaustion in a payment database proxy).
            </p>
          </div>
        </section>

        {/* Section 2: Why Both Pillars Matter */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Why Codebase Assessment + Runtime Intelligence?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-card rounded-xl border border-border space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                <h3 className="font-bold text-text-primary text-base">Pre-Deployment Codebase Assessment</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                Most operational outages originate in architectural anti-patterns that could have been identified prior to release: 
                unhandled async exceptions, missing connection timeouts, uninstrumented HTTP clients, and unvalidated environment variables. 
                Our 10-dimension assessment catches these vulnerabilities at the PR boundary.
              </p>
            </div>

            <div className="p-6 bg-card rounded-xl border border-border space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h3 className="font-bold text-text-primary text-base">Post-Deployment Runtime Observability</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                Static analysis alone cannot foresee unpredictable production workloads, noisy-neighbor contention, or downstream vendor outages. 
                Our OpenTelemetry-native runtime ingestion, statistical anomaly detection, and causal topological random walks step in when code encounters live traffic.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Research Objectives & Scientific Grounding */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-400 flex items-center justify-center border border-violet-500/20">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Research Objectives & Empirical Rigor
            </h2>
          </div>
          <div className="space-y-4 text-base text-text-body leading-relaxed">
            <p>
              Many contemporary &quot;AIOps&quot; vendors make sweeping marketing claims powered by non-deterministic generative models that hallucinate 
              non-existent causes and suggest risky production remediations. AIOps Sentinel rejects this approach in favor of empirical verification:
            </p>
            <ul className="space-y-3 list-none pl-0">
              <li className="flex items-start gap-3 text-text-body text-sm leading-relaxed">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
                <span><strong className="text-text-primary">Mathematical Baselines:</strong> Using non-parametric Median Absolute Deviation (MAD) and online Exponentially Weighted Moving Average (EWMA) for robust anomaly scoring resilient to non-normal distributions.</span>
              </li>
              <li className="flex items-start gap-3 text-text-body text-sm leading-relaxed">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
                <span><strong className="text-text-primary">Causal Graph Propagation:</strong> Leveraging Random Walk with Restart (RWR) over dynamic microservice dependency graphs to isolate the true origin node.</span>
              </li>
              <li className="flex items-start gap-3 text-text-body text-sm leading-relaxed">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
                <span><strong className="text-text-primary">RCAEval Benchmark Provenance:</strong> Evaluated directly against the peer-reviewed RCAEval dataset containing 60 curated real microservice failure episodes across diverse topologies.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Candid Limitations & Non-Goals */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              System Limitations & Non-Goals
            </h2>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            We believe enterprise software engineers value intellectual honesty over exaggerated promises. Here is what AIOps Sentinel deliberately does NOT do:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-card rounded-xl border border-border space-y-2 shadow-xs">
              <span className="text-sm font-bold text-text-primary block">Zero Code Execution</span>
              <p className="text-xs text-text-secondary leading-relaxed">
                We never execute uploaded user source code or binaries. All codebase assessments rely strictly on static AST parsing and declarative configuration inspection.
              </p>
            </div>

            <div className="p-5 bg-card rounded-xl border border-border space-y-2 shadow-xs">
              <span className="text-sm font-bold text-text-primary block">No Blind Auto-Remediation</span>
              <p className="text-xs text-text-secondary leading-relaxed">
                Sentinel does not unilaterally mutate production infrastructure without human sign-off. High-risk operations always require authorized operator approval.
              </p>
            </div>

            <div className="p-5 bg-card rounded-xl border border-border space-y-2 shadow-xs">
              <span className="text-sm font-bold text-text-primary block">No Proprietary Lock-In</span>
              <p className="text-xs text-text-secondary leading-relaxed">
                We do not enforce proprietary telemetry agents. All runtime ingestion is built on open standards: OpenTelemetry (OTLP), Prometheus, Loki, and Tempo.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Future Roadmap */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Engineering Roadmap
            </h2>
          </div>
          <div className="space-y-3">
            {[
              {
                phase: "Phase 1 (Current)",
                title: "Production Assessment & OTel Core",
                items: "10-dimension static rubric, SARIF export, OTLP ingestion, MAD/EWMA anomaly models, RCAEval evaluation.",
                status: "Completed"
              },
              {
                phase: "Phase 2 (Near-Term)",
                title: "Extended AST Grammars & eBPF",
                items: "Tree-sitter AST parsing for Rust, Java, and Go; optional zero-instrumentation eBPF network probe ingestion.",
                status: "In Development"
              },
              {
                phase: "Phase 3 (Future)",
                title: "Reinforcement Learning Guardrails",
                items: "Feedback-driven policy optimization for remediation dry-runs based on verified operator approvals.",
                status: "Planned"
              }
            ].map((milestone, idx) => (
              <div key={idx} className="p-5 bg-card rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-text-secondary">{milestone.phase}</span>
                    <span className="text-sm font-bold text-text-primary">&bull; {milestone.title}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{milestone.items}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md self-start sm:self-auto border ${
                  milestone.status === "Completed" 
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30"
                }`}>
                  {milestone.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Interested in our research or deployment?</h3>
            <p className="text-xs sm:text-sm text-text-secondary">Our engineering team is happy to review your architecture or share benchmark reproduction scripts.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/research"
              className="px-4 py-2 rounded-lg bg-card border border-border hover:bg-surface-raised text-xs font-semibold text-text-primary transition-colors shadow-xs"
            >
              Explore Research
            </Link>
            <Link
              href="/contact"
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-xs font-semibold text-primary-foreground transition-colors shadow-xs"
            >
              Contact Engineering
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
