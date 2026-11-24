import React from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Terminal, 
  Layers, 
  FileCode2, 
  Cpu, 
  CheckCircle2, 
  Copy, 
  ArrowRight,
  ShieldCheck,
  Activity
} from "lucide-react";

export const metadata = {
  title: "Documentation | AIOps Sentinel",
  description: "Getting started guide, CLI usage, OpenTelemetry collector configuration, and CI/CD policy gates.",
};

export default function DocsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header Banner */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span>Developer Reference</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Platform Documentation & Quick Start
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            Get up and running with AIOps Sentinel in minutes: assess codebases via CLI or UI, 
            wire up OpenTelemetry collectors, and enforce production-readiness in CI/CD pipelines.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* Quickstart: Docker Compose */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            1. Quick Start: Local Deployment
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            AIOps Sentinel can be launched locally using Docker Compose. This boots the Web UI, API Gateway, 
            FastAPI Backend, PostgreSQL, Redis, and full OpenTelemetry observability stack.
          </p>

          <div className="p-4 bg-muted/60 rounded-xl font-mono text-xs text-foreground space-y-2 border border-border overflow-x-auto">
            <p className="text-muted-foreground"># Clone repository and enter directory</p>
            <p className="text-primary font-bold">git clone https://github.com/organization/aiops-sentinel.git</p>
            <p className="text-primary font-bold">cd aiops-sentinel</p>
            <br />
            <p className="text-muted-foreground"># Start staging / local environment</p>
            <p className="text-primary font-bold">docker compose -f docker-compose.staging.yml up -d</p>
            <br />
            <p className="text-muted-foreground"># Open Gateway in your browser</p>
            <p className="text-primary font-bold">open http://localhost:8088</p>
          </div>
        </section>

        {/* Codebase Assessment via CLI */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-primary" />
            2. Ingesting & Assessing Codebases
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Run a static production-readiness assessment directly against a local repository or ZIP package.
          </p>

          <div className="p-4 bg-muted/60 rounded-xl font-mono text-xs text-foreground space-y-2 border border-border overflow-x-auto">
            <p className="text-muted-foreground"># Evaluate a local repository path</p>
            <p className="text-primary font-bold">python -m app.cli.assess --path ./my-microservice --format sarif --output report.sarif</p>
            <br />
            <p className="text-muted-foreground"># Upload a ZIP package via curl to the API Gateway</p>
            <p className="text-primary font-bold">
              curl -X POST http://localhost:8088/api/v1/assessments/upload \
            </p>
            <p className="text-primary font-bold pl-4">
              -H &quot;Authorization: Bearer $SENTINEL_TOKEN&quot; \
            </p>
            <p className="text-primary font-bold pl-4">
              -F &quot;file=@service.zip&quot;
            </p>
          </div>
        </section>

        {/* Configuring OpenTelemetry */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            3. Connecting OpenTelemetry Workloads
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Configure your microservice applications to export traces and metrics directly to the Sentinel OpenTelemetry Collector.
          </p>

          <div className="p-4 bg-muted/60 rounded-xl font-mono text-xs text-foreground space-y-2 border border-border overflow-x-auto">
            <p className="text-muted-foreground"># Python OTel Environment Variables</p>
            <p className="text-primary font-bold">export OTEL_EXPORTER_OTLP_ENDPOINT=&quot;http://sentinel-gateway:4318&quot;</p>
            <p className="text-primary font-bold">export OTEL_EXPORTER_OTLP_PROTOCOL=&quot;http/protobuf&quot;</p>
            <p className="text-primary font-bold">export OTEL_SERVICE_NAME=&quot;payment-service&quot;</p>
          </div>
        </section>

        {/* CI/CD Integration */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            4. GitHub Actions CI/CD Policy Gate
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Incorporate Sentinel into your pull request workflows to block releases that score below production threshold.
          </p>

          <div className="p-4 bg-muted/60 rounded-xl font-mono text-xs text-foreground space-y-2 border border-border overflow-x-auto">
            <pre className="text-foreground/90">{`name: Sentinel Readiness Gate
on: [pull_request]

jobs:
  assess:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run AIOps Sentinel Assessment
        run: |
          docker run --rm -v \${{ github.workspace }}:/code \\
            aiops-sentinel-cli:latest assess --path /code --min-score 80 --sarif results.sarif
      - name: Upload SARIF to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif`}</pre>
          </div>
        </section>

        {/* CTA */}
        <section className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Have questions or custom requirements?</h3>
            <p className="text-xs text-muted-foreground">Our solutions engineering team can guide your cluster integration.</p>
          </div>
          <Link
            href="/contact"
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition-colors shrink-0"
          >
            Contact Engineering
          </Link>
        </section>
      </div>
    </div>
  );
}
