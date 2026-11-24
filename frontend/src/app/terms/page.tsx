import React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

export const metadata = {
  title: "Terms of Service | AIOps Sentinel",
  description: "Terms of service and software licensing agreements for AIOps Sentinel.",
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <section className="py-16 border-b border-border bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>Legal Agreements</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: November 2026 &bull; Version 1.0
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 prose dark:prose-invert text-muted-foreground text-sm sm:text-base leading-relaxed space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the AIOps Sentinel software platform, APIs, documentation, and web interfaces, you agree to be bound by these Terms of Service. 
            If you are using the software on behalf of an enterprise or organization, you represent that you have authority to bind that entity.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">2. Permitted Use & Software Boundaries</h2>
          <p>
            AIOps Sentinel provides automated software reliability intelligence, static codebase assessment, and root-cause analysis recommendations. 
            You acknowledge that while our statistical and causal models are validated against standardized benchmarks, 
            production remediations must always undergo human verification by qualified engineering personnel prior to execution.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">3. Security Responsibilities</h2>
          <p>
            Users are responsible for maintaining the confidentiality of their API tokens, credentials, and access keys. 
            You agree not to bypass sandboxing controls, attempt Zip-Slip path traversals, or submit intentionally malicious payloads designed to destabilize the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">4. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, AIOps Sentinel and its contributors shall not be liable for any indirect, incidental, 
            or consequential damages resulting from downtime, deployment rollbacks, or operational remediations executed on your production infrastructure.
          </p>
        </section>
      </div>
    </div>
  );
}
