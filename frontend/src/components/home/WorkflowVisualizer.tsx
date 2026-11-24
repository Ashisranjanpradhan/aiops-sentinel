"use client";

import React, { useState } from "react";
import { 
  FolderGit2, 
  FileCheck2, 
  Rocket, 
  Activity, 
  AlertTriangle, 
  SearchCode, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2 
} from "lucide-react";

interface WorkflowStep {
  id: string;
  number: number;
  title: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  pillar: "Codebase Intelligence" | "Runtime Reliability";
  details: {
    input: string;
    engine: string;
    output: string;
    description: string;
    keyMetrics: string[];
  };
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "repo-submission",
    number: 1,
    title: "Codebase Ingestion",
    shortDesc: "Upload ZIP archives, target folders, or individual program files",
    icon: FolderGit2,
    pillar: "Codebase Intelligence",
    details: {
      input: "ZIP archive, repository folder path, or multi-file selection (.py, .ts, .js, .go, Dockerfile, etc.)",
      engine: "Deterministic File Walker, MIME verification, Zip Slip containment sandbox",
      output: "Sanitized memory buffer with AST extraction manifest",
      description: "Secure, sandboxed ingestion layer that scans directory trees while enforcing strict path traversal guards, file size caps, and AST parseability checks.",
      keyMetrics: ["Up to 100MB ZIP limits", "Path traversal sanitization", "Language-specific AST tree parsing"]
    }
  },
  {
    id: "static-assessment",
    number: 2,
    title: "10-Dimension Evaluation",
    shortDesc: "Comprehensive grading across architecture, security, and quality",
    icon: FileCheck2,
    pillar: "Codebase Intelligence",
    details: {
      input: "Parsed AST tokens, dependency trees, config maps, Dockerfiles, and test suites",
      engine: "Multi-dimension static analysis engine with rule-weighted scoring models",
      output: "Production readiness score (0–100), SARIF, HTML, and JSON reports",
      description: "Evaluates code against 10 critical dimensions: Architecture, Modularity, Security & Secrets, Reliability & Error Handling, Performance, Testing, Docker/Containerization, CI/CD, Observability, and Documentation.",
      keyMetrics: ["10 evaluation dimensions", "SARIF v2.1.0 export", "Zero hardcoded grades"]
    }
  },
  {
    id: "deployment-prep",
    number: 3,
    title: "Deployment Gatekeeping",
    shortDesc: "Automated verification against release readiness criteria",
    icon: Rocket,
    pillar: "Codebase Intelligence",
    details: {
      input: "Evaluated production-readiness report and threshold criteria",
      engine: "CI/CD Policy Gate Engine (GitHub Actions, GitLab CI, or custom webhook)",
      output: "Pass/Fail release verdict with blocker annotations and remediation hints",
      description: "Prevents fragile, undocumented, or insecure code from reaching staging and production environments by validating readiness thresholds at the CI pipeline boundary.",
      keyMetrics: ["Configurable threshold gates", "SARIF annotations in PRs", "Actionable blocker breakdown"]
    }
  },
  {
    id: "runtime-monitoring",
    number: 4,
    title: "Continuous Observability",
    shortDesc: "Stream OpenTelemetry metrics, traces, and structured logs",
    icon: Activity,
    pillar: "Runtime Reliability",
    details: {
      input: "OTel OTLP/gRPC streams, Prometheus scrapers, Loki log streams, Tempo trace IDs",
      engine: "High-throughput OpenTelemetry Collector and time-series aggregation pipeline",
      output: "Normalized service-to-service topology and multi-variate signal buffer",
      description: "Unifies Golden Signals (latency p50/p95/p99, traffic rps, error rate, saturation) with distributed trace context and structured logs across all microservices.",
      keyMetrics: ["OTel OTLP standard", "Dynamic topology reconstruction", "Real-time sliding window buffers"]
    }
  },
  {
    id: "anomaly-detection",
    number: 5,
    title: "Statistical Anomaly Detection",
    shortDesc: "Multi-variate anomaly scoring via MAD, EWMA, and Isolation Forest",
    icon: AlertTriangle,
    pillar: "Runtime Reliability",
    details: {
      input: "Live telemetry sliding windows and baseline historical distributions",
      engine: "Adaptive Median Absolute Deviation (MAD), EWMA drift tracking, Isolation Forest",
      output: "Weighted anomaly confidence scores and multi-metric deviation alerts",
      description: "Detects subtle latency degradations, memory leak ramps, and sudden error-burst anomalies without relying on brittle fixed-threshold alerts.",
      keyMetrics: ["Non-parametric MAD robustness", "Online EWMA variance tracking", "Sub-second inference turnaround"]
    }
  },
  {
    id: "incident-investigation",
    number: 6,
    title: "Probable Root-Cause Ranking",
    shortDesc: "Topological random walk and causal propagation analysis",
    icon: SearchCode,
    pillar: "Runtime Reliability",
    details: {
      input: "Directed service dependency graph, anomalous node signals, and trace spans",
      engine: "Random Walk with Restart (RWR) & Causal Telemetry Graph Traversal",
      output: "Ranked list of probable culprit services with Mean Reciprocal Rank confidence",
      description: "Traces symptom propagation backwards through microservice call graphs to pinpoint root-cause components rather than cascading downstream victims.",
      keyMetrics: ["RCAEval validated methodology", "Top-1, Top-3, Top-5 ranking", "Transparent causal graph evidence"]
    }
  },
  {
    id: "controlled-remediation",
    number: 7,
    title: "Operator-Guided Remediation",
    shortDesc: "Human-in-the-loop remediation plans with verified dry-runs",
    icon: ShieldCheck,
    pillar: "Runtime Reliability",
    details: {
      input: "Pinpointed root-cause diagnosis, deployment metadata, and rollback recipes",
      engine: "Remediation Engine with Role-Based Access Control and audit logging",
      output: "Executed mitigations (canary rollback, scale replica, circuit-break) with audit trail",
      description: "Generates step-by-step mitigation plans with explicit risk levels. Crucially requires human operator approval before executing any production state modification.",
      keyMetrics: ["Human-in-the-loop safeguard", "Cryptographic audit logging", "Instant automated rollback triggers"]
    }
  }
];

export default function WorkflowVisualizer() {
  const [activeStepId, setActiveStepId] = useState<string>("repo-submission");
  const activeStep = WORKFLOW_STEPS.find(s => s.id === activeStepId) || WORKFLOW_STEPS[0];

  return (
    <div className="w-full bg-card rounded-2xl border border-border shadow-lg p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            End-to-End Operational Lifecycle
          </span>
          <h3 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground mt-2">
            The Unified Reliability Workflow
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            How AIOps Sentinel bridges pre-deployment code quality with post-deployment runtime observability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Codebase Intelligence
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground ml-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Runtime Reliability
          </span>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="py-6 overflow-x-auto scrollbar-thin">
        <div className="flex items-center min-w-[700px] justify-between relative">
          {/* Connector Line behind circles */}
          <div className="absolute top-5 left-6 right-6 h-0.5 bg-border -z-0" />

          {WORKFLOW_STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === activeStepId;
            const isCodebase = step.pillar === "Codebase Intelligence";

            return (
              <button
                key={step.id}
                onClick={() => setActiveStepId(step.id)}
                className="relative z-10 flex flex-col items-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-2 transition-all"
                aria-label={`Step ${step.number}: ${step.title}`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
                    isActive
                      ? isCodebase
                        ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25 scale-110"
                        : "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/25 scale-110"
                      : "bg-card text-muted-foreground border-border group-hover:border-primary group-hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="mt-2 text-center">
                  <span className="block text-xs font-semibold text-muted-foreground">
                    Step {step.number}
                  </span>
                  <span
                    className={`block text-xs font-medium max-w-[90px] truncate ${
                      isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Step Card */}
      <div className="mt-2 p-6 rounded-xl bg-muted/40 border border-border transition-all duration-300">
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide uppercase ${
                  activeStep.pillar === "Codebase Intelligence"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {activeStep.pillar}
              </span>
              <span className="text-xs text-muted-foreground">Stage {activeStep.number} of 7</span>
            </div>

            <div>
              <h4 className="text-lg lg:text-xl font-bold text-foreground">
                {activeStep.title}
              </h4>
              <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                {activeStep.details.description}
              </p>
            </div>

            {/* Inputs & Outputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-lg bg-card border border-border">
                <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Input
                </span>
                <p className="text-xs text-foreground font-mono leading-relaxed">
                  {activeStep.details.input}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-card border border-border">
                <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Engine & Execution
                </span>
                <p className="text-xs text-foreground font-mono leading-relaxed">
                  {activeStep.details.engine}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-card border border-border">
                <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Output Artifact
                </span>
                <p className="text-xs text-foreground font-mono leading-relaxed">
                  {activeStep.details.output}
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics / Attributes Pill box */}
          <div className="w-full lg:w-72 bg-card rounded-xl p-4 border border-border shrink-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
              Guarantees & Capabilities
            </span>
            <ul className="space-y-2.5">
              {activeStep.details.keyMetrics.map((metric, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{metric}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
              {activeStep.number < WORKFLOW_STEPS.length ? (
                <button
                  onClick={() => {
                    const nextStep = WORKFLOW_STEPS[activeStep.number];
                    if (nextStep) setActiveStepId(nextStep.id);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Next: Step {activeStep.number + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setActiveStepId(WORKFLOW_STEPS[0].id)}
                  className="w-full py-2 px-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Restart Tour</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
