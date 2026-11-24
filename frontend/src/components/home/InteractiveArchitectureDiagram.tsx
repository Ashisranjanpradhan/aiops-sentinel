"use client";

import React, { useState } from "react";
import { 
  Monitor, 
  ShieldAlert, 
  Server, 
  BrainCircuit, 
  Database, 
  LineChart, 
  Layers,
  ArrowDownUp,
  Cpu,
  Lock,
  Workflow
} from "lucide-react";

interface ArchLayer {
  id: string;
  name: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  techStack: string[];
  protocol: string;
  description: string;
  components: {
    name: string;
    role: string;
  }[];
  securityGuards: string[];
}

const ARCHITECTURE_LAYERS: ArchLayer[] = [
  {
    id: "presentation",
    name: "Presentation & Edge UI",
    category: "Client Layer",
    icon: Monitor,
    color: "from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    techStack: ["Next.js 14 (App Router)", "TypeScript", "Tailwind CSS", "Lucide React", "Playwright E2E"],
    protocol: "HTTPS (TLS 1.3), Secure WebSocket (WSS)",
    description: "Responsive enterprise UI with server-side rendered public marketing and SEO pages, alongside an authenticated real-time operations console supporting Dark/Light/System theme toggles.",
    components: [
      { name: "Public SaaS Portal", role: "Landing, About, Features, Research, and Contact pages" },
      { name: "Operations Console", role: "Real-time incident investigation, dynamic topology, & remediation" },
      { name: "Assessment Studio", role: "Codebase ZIP & file upload with interactive 10-dimension reports" },
      { name: "Theme Engine", role: "Zero-flash theme switcher with OS media-query synchronization" }
    ],
    securityGuards: [
      "Strict Content Security Policy (CSP)",
      "Anti-CSRF headers & SameSite cookies",
      "Client-side input sanitization & honeypot traps"
    ]
  },
  {
    id: "gateway",
    name: "API Gateway & Edge Proxy",
    category: "Ingress Layer",
    icon: ShieldAlert,
    color: "from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    techStack: ["Traefik / Nginx Reverse Proxy", "Docker Bridge Network", "Rate Limit Middleware"],
    protocol: "HTTP/1.1 & HTTP/2 Reverse Proxy",
    description: "Single entry point for all frontend, API, and OpenTelemetry ingestion traffic. Provides path-based routing, unified SSL termination, and request throttling.",
    components: [
      { name: "Path Routing", role: "/api/v1/* to FastAPI, /* to Next.js Web, /v1/traces to OTel" },
      { name: "IP Throttler", role: "Sliding-window rate limiter protecting public contact and auth endpoints" },
      { name: "Security Headers", role: "Injects HSTS, X-Frame-Options, and X-Content-Type-Options" }
    ],
    securityGuards: [
      "Rate limiting on public endpoints (e.g. 10/hour contact form)",
      "Strict CORS origin white-listing",
      "Transparent IP forwarding via X-Forwarded-For"
    ]
  },
  {
    id: "application",
    name: "Core Application Backend",
    category: "Business Logic",
    icon: Server,
    color: "from-violet-500/20 to-pink-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30",
    techStack: ["FastAPI 0.110+", "Python 3.11", "Pydantic v2", "SQLAlchemy 2.0 Async", "Alembic"],
    protocol: "RESTful JSON, Asynchronous SQLAlchemy, Redis Pub/Sub",
    description: "High-performance async Python backend enforcing strict domain validation, multi-role RBAC authorization (Admin, Operator, Analyst, Viewer), and assessment sandboxing.",
    components: [
      { name: "Auth & RBAC Module", role: "JWT issuance, Argon2 password hashing, and role permission gates" },
      { name: "Assessment Engine", role: "AST parsing, Zip Slip prevention, and 10-dimension rubric scorer" },
      { name: "Telemetry Service", role: "Aggregates golden signals, anomaly alerts, and incident states" },
      { name: "Contact Service", role: "Validation, honeypot rejection, persistence, and SMTP notification" }
    ],
    securityGuards: [
      "Zip-Slip path sanitization (restricts extract targets inside sandbox)",
      "Strict Pydantic v2 input model parsing",
      "Role-Based Access Control enforced on all sensitive mutations"
    ]
  },
  {
    id: "intelligence",
    name: "AI & ML Inference Engine",
    category: "Analytical Intelligence",
    icon: BrainCircuit,
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    techStack: ["NumPy", "Scikit-Learn (IsolationForest)", "NetworkX", "Custom Statistical Models"],
    protocol: "Internal Python In-Process & Async Micro-Batching",
    description: "Statistically sound anomaly detection and root-cause analysis without hallucination. Combines non-parametric statistical baselines with topological graph traversal.",
    components: [
      { name: "Statistical Anomaly Detector", role: "Adaptive Median Absolute Deviation (MAD) & EWMA variance" },
      { name: "Isolation Forest", role: "Multi-variate clustering for subtle multi-signal degradation" },
      { name: "Root-Cause Ranker", role: "Random Walk with Restart (RWR) over microservice dependency DAG" },
      { name: "Remediation Synthesizer", role: "Generates risk-assessed step-by-step mitigation plans" }
    ],
    securityGuards: [
      "Zero execution of user-submitted untrusted code",
      "Human-in-the-loop requirement for all production remediations",
      "Deterministic benchmark provenance evaluation (RCAEval)"
    ]
  },
  {
    id: "persistence",
    name: "State & Message Queue",
    category: "Data Layer",
    icon: Database,
    color: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
    techStack: ["PostgreSQL 16", "Redis 7", "Celery / ARQ Worker", "Alembic Migrations"],
    protocol: "PostgreSQL Wire Protocol, Redis Protocol (RESP)",
    description: "ACID-compliant relational storage for application entities, alongside high-speed in-memory caching and durable background job execution.",
    components: [
      { name: "PostgreSQL Database", role: "Users, incidents, assessment records, contact enquiries, audit logs" },
      { name: "Redis In-Memory Broker", role: "Session revocation cache, task queue broker, and rate limit counters" },
      { name: "Durable Worker", role: "Asynchronous codebase parsing, heavy AST scans, and SARIF export" }
    ],
    securityGuards: [
      "Isolated container networks for database ports",
      "Parameterized queries preventing SQL injection",
      "Encrypted connection parameters & secret management"
    ]
  },
  {
    id: "observability",
    name: "Telemetry & Observability Fabric",
    category: "Platform Telemetry",
    icon: LineChart,
    color: "from-rose-500/20 to-red-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
    techStack: ["OpenTelemetry Collector", "Prometheus 2.50", "Grafana Loki 2.9", "Grafana Tempo 2.3"],
    protocol: "OTLP/gRPC (4317), OTLP/HTTP (4318), PromQL, LogQL, TraceQL",
    description: "Industry-standard open-source observability stack providing 360-degree visibility across microservice traces, metrics, and application logs.",
    components: [
      { name: "OpenTelemetry Collector", role: "Ingests standard OTLP metrics and traces from client workloads" },
      { name: "Prometheus", role: "Scrapes and retains time-series metrics for golden signals & alerts" },
      { name: "Grafana Loki", role: "Aggregates structured JSON logs indexed by service and incident ID" },
      { name: "Grafana Tempo", role: "Stores distributed traces for end-to-end request latency analysis" }
    ],
    securityGuards: [
      "Sanitized trace attributes stripping Authorization tokens and PII",
      "Retention window limits preventing disk exhaustion",
      "Isolated telemetry pipeline decoupled from critical path"
    ]
  }
];

export default function InteractiveArchitectureDiagram() {
  const [selectedLayerId, setSelectedLayerId] = useState<string>("intelligence");
  const selectedLayer = ARCHITECTURE_LAYERS.find(l => l.id === selectedLayerId) || ARCHITECTURE_LAYERS[0];

  return (
    <div className="w-full bg-card rounded-2xl border border-border shadow-lg p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            System Architecture
          </span>
          <h3 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground mt-2">
            6-Layer Modular Architecture
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Click any architectural tier to inspect its technology stack, communication protocols, and safety guarantees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
            <Lock className="w-3.5 h-3.5 text-emerald-500" /> Sandboxed & Defense-in-Depth
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Layer Stack Representation (Left side) */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Architectural Tiers</span>
            <span className="text-[11px] font-normal">Top to Bottom Flow</span>
          </div>

          {ARCHITECTURE_LAYERS.map((layer, index) => {
            const Icon = layer.icon;
            const isSelected = layer.id === selectedLayerId;

            return (
              <div key={layer.id} className="relative">
                <button
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                    isSelected
                      ? `bg-muted/80 border-primary ring-1 ring-primary shadow-sm`
                      : "bg-card border-border hover:border-border/80 hover:bg-muted/40"
                  }`}
                  aria-selected={isSelected}
                  role="tab"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-muted border border-border ${isSelected ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {layer.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground block">
                        {layer.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted/60 border border-border text-muted-foreground">
                      L{index + 1}
                    </span>
                  </div>
                </button>

                {/* Vertical arrow connector between layers */}
                {index < ARCHITECTURE_LAYERS.length - 1 && (
                  <div className="w-px h-2 bg-border mx-auto my-0.5" />
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Layer Details Panel (Right side) */}
        <div className="lg:col-span-7 bg-muted/30 rounded-xl border border-border p-5 lg:p-6 transition-all duration-200">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  {selectedLayer.category}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  Protocol: {selectedLayer.protocol}
                </span>
              </div>
              <h4 className="text-lg font-bold text-foreground mt-2">
                {selectedLayer.name}
              </h4>
              <p className="text-sm text-foreground/80 mt-1">
                {selectedLayer.description}
              </p>
            </div>
          </div>

          {/* Subcomponents Breakdown */}
          <div className="mt-5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" /> Key Subcomponents
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {selectedLayer.components.map((comp, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-card border border-border">
                  <span className="text-xs font-bold text-foreground block">
                    {comp.name}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5 block leading-normal">
                    {comp.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Technology Badges */}
          <div className="mt-5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-primary" /> Technology Stack
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedLayer.techStack.map((tech, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-xs font-mono bg-card border border-border text-foreground/90"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Defense-in-depth and Security Controls */}
          <div className="mt-5 pt-4 border-t border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" /> Security & Reliability Controls
            </span>
            <ul className="space-y-1.5">
              {selectedLayer.securityGuards.map((guard, idx) => (
                <li key={idx} className="text-xs text-foreground/90 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{guard}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
