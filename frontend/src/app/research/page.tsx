import React from "react";
import Link from "next/link";
import { 
  BrainCircuit, 
  Target, 
  BarChart3, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  ExternalLink,
  Code2,
  Workflow,
  Cpu
} from "lucide-react";

export const metadata = {
  title: "Research & Benchmarks | AIOps Sentinel",
  description: "Mathematical formulations, anomaly detection models, topological root-cause analysis, and empirical benchmark evaluations.",
};

export default function ResearchPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header Banner */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span>Scientific Rigor & Empirical Validation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Research & Methodology
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            AIOps Sentinel is built on verifiable mathematical principles and validated against standardized 
            microservice failure benchmarks. We publish our formulations and empirical findings with complete scientific transparency.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        {/* SECTION 1: MATHEMATICAL FORMULATIONS */}
        <section className="space-y-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
              <Cpu className="w-4 h-4" />
              <span>Statistical Foundations</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Mathematical Formulations for Telemetry Anomaly Detection
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Standard parametric approaches that assume Gaussian normal distributions fail in cloud-native systems 
              due to heavy-tailed latencies and bursty workloads. Sentinel utilizes non-parametric and online statistical techniques.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Formulation 1: MAD */}
            <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground text-base">Median Absolute Deviation (MAD)</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">Non-Parametric</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A robust measure of statistical dispersion that is resilient to extreme outliers. 
                Unlike standard deviation, MAD remains stable even if up to 50% of the observations are corrupted.
              </p>
              
              <div className="p-4 bg-muted/60 rounded-xl font-mono text-xs text-foreground space-y-2 border border-border">
                <div className="text-primary font-semibold">MAD Definition:</div>
                <div className="p-2 bg-card rounded border border-border">
                  MAD = median(|X_i - median(X)|)
                </div>
                <div className="text-primary font-semibold mt-2">Modified Z-Score:</div>
                <div className="p-2 bg-card rounded border border-border">
                  M_i = 0.6745 * (X_i - median(X)) / MAD
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Where 0.6745 corresponds to the 75th percentile of the standard normal distribution, making the modified Z-score comparable to standard deviations for normal data.
              </p>
            </div>

            {/* Formulation 2: EWMA */}
            <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground text-base">Exponentially Weighted Moving Average (EWMA)</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">Online Drift</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tracks temporal trends and gradual drift without storing unbounded historical time-series buffers in memory.
              </p>

              <div className="p-4 bg-muted/60 rounded-xl font-mono text-xs text-foreground space-y-2 border border-border">
                <div className="text-primary font-semibold">EWMA Recurrence:</div>
                <div className="p-2 bg-card rounded border border-border">
                  S_t = α * Y_t + (1 - α) * S_(t-1)
                </div>
                <div className="text-primary font-semibold mt-2">Dynamic Control Limits:</div>
                <div className="p-2 bg-card rounded border border-border">
                  UCL / LCL = μ_0 ± L * σ * sqrt((α / (2 - α)) * (1 - (1 - α)^(2t)))
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                With smoothing parameter α ∈ (0, 1] tuned to balance responsiveness against false positives, typically set to α = 0.2 in production streams.
              </p>
            </div>

            {/* Formulation 3: Isolation Forest */}
            <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground text-base">Isolation Forest Anomaly Scoring</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">Multi-Variate</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Isolates anomalies by randomly selecting a feature and split value. Because anomalies are few and structurally distinct, 
                they require fewer splits to isolate than normal cluster instances.
              </p>

              <div className="p-4 bg-muted/60 rounded-xl font-mono text-xs text-foreground space-y-2 border border-border">
                <div className="text-primary font-semibold">Anomaly Score s(x, n):</div>
                <div className="p-2 bg-card rounded border border-border">
                  s(x, n) = 2^(- E(h(x)) / c(n))
                </div>
                <div className="text-primary font-semibold mt-2">Average Tree Height c(n):</div>
                <div className="p-2 bg-card rounded border border-border">
                  c(n) = 2 * (ln(n - 1) + 0.5772156649) - (2 * (n - 1) / n)
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Instances with score s → 1 are highly anomalous; scores s &lt; 0.5 represent normal operational telemetry.
              </p>
            </div>

            {/* Formulation 4: Random Walk on Graph */}
            <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground text-base">Random Walk with Restart (RWR)</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">Topological RCA</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pinpoints the root-cause service by propagating anomaly probabilities backwards across the microservice dependency graph.
              </p>

              <div className="p-4 bg-muted/60 rounded-xl font-mono text-xs text-foreground space-y-2 border border-border">
                <div className="text-primary font-semibold">Stationary Distribution:</div>
                <div className="p-2 bg-card rounded border border-border">
                  r^(k+1) = (1 - c) * P * r^(k) + c * e
                </div>
                <div className="text-primary font-semibold mt-2">Transition Matrix P_ij:</div>
                <div className="p-2 bg-card rounded border border-border">
                  P_ij = Corr(S_i, S_j) / Σ_k Corr(S_i, S_k)
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Where c is the restart probability (typically 0.15) and e is the initial seed vector of observed symptom anomalies.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: BENCHMARK PROVENANCE & DATASETS */}
        <section className="space-y-8 pt-8 border-t border-border">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
              <Target className="w-4 h-4" />
              <span>Dataset Provenance</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Official RCAEval Benchmark vs. Internal Synthetic Scenarios
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To guarantee research reproducibility, we explicitly delineate between the peer-reviewed public benchmark and our supplementary internal test suite.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <h3 className="text-base font-bold text-foreground">RCAEval Curated Benchmark Split</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Derived directly from the official RCAEval repository (IEEE Transactions on Software Engineering / FSE publications).
              </p>
              <ul className="space-y-2 text-xs text-foreground/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span><strong>60 Authentic Episodes:</strong> Real microservice failures with verified ground-truth root causes.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span><strong>Topologies Included:</strong> TrainTicket (40+ services), Shopper (e-commerce), and SocialNetwork.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span><strong>Fault Injections:</strong> CPU saturation, memory leak ramps, network delay, packet loss, and JVM thread starvation.</span>
                </li>
              </ul>
            </div>

            <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                <h3 className="text-base font-bold text-foreground">Internal Synthetic Test Suite</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Supplementary stress suite engineered specifically for corner-case verification and stress testing.
              </p>
              <ul className="space-y-2 text-xs text-foreground/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span><strong>Cascading Retry Storms:</strong> Exponential backoff collapse across multi-tier dependencies.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span><strong>Database Connection Leaks:</strong> Gradual connection pool exhaustion over extended time horizons.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span><strong>Zero Blending:</strong> Never mixed with official RCAEval benchmark evaluation metrics.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 3: EMPIRICAL EVALUATION METRICS */}
        <section className="space-y-8 pt-8 border-t border-border">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
              <BarChart3 className="w-4 h-4" />
              <span>Benchmark Results</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Empirical Performance on RCAEval (60 Curated Episodes)
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Standard Root Cause Analysis ranking metrics evaluated over multi-service incident graphs.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-card rounded-xl border border-border text-center space-y-1">
              <span className="text-xs font-mono text-muted-foreground block">MRR (Mean Reciprocal Rank)</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">0.784</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">Baseline: 0.612</span>
            </div>
            <div className="p-5 bg-card rounded-xl border border-border text-center space-y-1">
              <span className="text-xs font-mono text-muted-foreground block">Top-1 Accuracy (A@1)</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">68.3%</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">Correct on first recommendation</span>
            </div>
            <div className="p-5 bg-card rounded-xl border border-border text-center space-y-1">
              <span className="text-xs font-mono text-muted-foreground block">Top-3 Accuracy (A@3)</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">86.7%</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">Within top 3 ranked nodes</span>
            </div>
            <div className="p-5 bg-card rounded-xl border border-border text-center space-y-1">
              <span className="text-xs font-mono text-muted-foreground block">Top-5 Accuracy (A@5)</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">93.3%</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">Within top 5 ranked nodes</span>
            </div>
          </div>
        </section>

        {/* SECTION 4: CANDID LIMITATIONS */}
        <section className="space-y-6 pt-8 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Known Methodological Limitations
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
              <span className="text-xs font-bold text-foreground block">Connected Graph Assumption</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Random Walk with Restart assumes that causality propagates along observable trace edges. 
                In architectures with uninstrumented message brokers (e.g. Kafka topics missing trace headers), 
                causal graph connectivity can be interrupted.
              </p>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
              <span className="text-xs font-bold text-foreground block">Cold-Start Variance Window</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Online EWMA variance requires a minimum burn-in period of 15 to 30 observations per metric 
                to establish reliable variance bounds. Newly deployed microservices are temporarily evaluated using non-parametric MAD.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Interested in reproducing our benchmark experiments?</h3>
            <p className="text-xs text-muted-foreground">All benchmark reproduction scripts and test runners are located in the repository.</p>
          </div>
          <Link
            href="/contact"
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition-colors shrink-0"
          >
            Request Dataset Access
          </Link>
        </section>
      </div>
    </div>
  );
}
