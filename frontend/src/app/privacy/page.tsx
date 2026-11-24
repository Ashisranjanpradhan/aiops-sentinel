import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | AIOps Sentinel",
  description: "Privacy policy, data retention practices, and telemetry confidentiality commitments.",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <section className="py-16 border-b border-border bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Governance & Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Privacy & Data Retention Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: November 2026 &bull; Version 1.0
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 prose dark:prose-invert text-muted-foreground text-sm sm:text-base leading-relaxed space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">1. Zero Source Code Retention</h2>
          <p>
            When codebases are ingested for production-readiness assessment (via ZIP archive upload, repository directory scan, or multi-file selection), 
            source code is analyzed exclusively in an ephemeral in-memory sandbox. Source code files are never persisted to permanent disk storage, 
            never used to train machine learning models, and never transmitted outside your self-hosted or dedicated tenancy perimeter.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">2. Telemetry and PII Sanitization</h2>
          <p>
            AIOps Sentinel ingests metrics, traces, and structured logs via standard OpenTelemetry collectors. 
            Telemetry pipelines are configured to sanitize sensitive HTTP headers (e.g., <code>Authorization</code>, <code>Cookie</code>, <code>X-Api-Key</code>) 
            prior to indexing in Prometheus, Loki, or Tempo.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">3. Contact Inquiries & Personal Information</h2>
          <p>
            When you submit an inquiry through our public contact form, we collect your name, business email address, category of inquiry, 
            and message payload. This data is stored in an encrypted PostgreSQL relational database and used solely to fulfill your technical or sales inquiry. 
            We do not sell, rent, or trade your contact information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">4. User Rights & Data Deletion</h2>
          <p>
            You may request the deletion of your account, contact submissions, or historical assessment metadata at any time by contacting our 
            security team at <a href="mailto:security@aiops-sentinel.local" className="text-primary hover:underline">security@aiops-sentinel.local</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
