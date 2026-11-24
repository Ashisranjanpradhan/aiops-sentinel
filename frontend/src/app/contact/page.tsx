"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  MessageSquare, 
  Building2, 
  HelpCircle,
  FileCode2,
  Sparkles,
  ArrowRight
} from "lucide-react";

const CATEGORIES = [
  "General Enquiry",
  "Technical Support",
  "Research Collaboration",
  "Bug Report",
  "Feature Suggestion",
  "Partnership or Project Discussion",
] as const;

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "General Enquiry",
    message: "",
    website: "", // Honeypot field
  });

  const [formLoadTime, setFormLoadTime] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResponse, setSuccessResponse] = useState<{
    id: string;
    name: string;
    email: string;
    category: string;
    createdAt: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Record form load timestamp in seconds
    setFormLoadTime(Date.now() / 1000);
  }, []);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = "Full name must be at least 2 characters.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errors.email = "Please enter a valid business email address.";
    }
    if (!formData.subject.trim() || formData.subject.trim().length < 3) {
      errors.subject = "Subject must be at least 3 characters.";
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine API URL (gateway path `/api/v1/contact`)
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          subject: formData.subject.trim(),
          category: formData.category,
          message: formData.message.trim(),
          website: formData.website, // honeypot
          client_timestamp: formLoadTime,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("You have exceeded the inquiry rate limit (10 per hour). Please try again later.");
        }
        const errorDetail = data?.detail || data?.message || "Failed to submit inquiry. Please verify your inputs.";
        throw new Error(errorDetail);
      }

      const enquiry = data?.data || data;
      setSuccessResponse({
        id: enquiry.id || "REQ-SUBMITTED",
        name: enquiry.name || formData.name,
        email: enquiry.email || formData.email,
        category: enquiry.category || formData.category,
        createdAt: enquiry.created_at || new Date().toISOString(),
      });
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while transmitting your request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header Banner */}
      <section className="py-16 md:py-20 border-b border-border bg-muted/20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Mail className="w-3.5 h-3.5" />
            <span>Direct Engineering Contact</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Contact AIOps Sentinel
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            Have questions about enterprise deployment, research dataset access, or custom integrations? 
            Submit an inquiry and our systems engineering team will respond within one business day.
          </p>
        </div>
      </section>

      {/* Main Form and Info Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Form Container (Left 7 Cols) */}
          <div className="lg:col-span-7 bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
            {successResponse ? (
              <div className="space-y-6 text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">
                    Enquiry Successfully Received
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Thank you, <strong>{successResponse.name}</strong>. Your inquiry has been routed to our technical team under ticket reference:
                  </p>
                  <div className="inline-block px-4 py-2 rounded-lg bg-muted border border-border font-mono text-xs font-bold text-primary mt-2">
                    {successResponse.id}
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl border border-border text-xs text-muted-foreground max-w-md mx-auto space-y-1 text-left">
                  <p><strong>Category:</strong> {successResponse.category}</p>
                  <p><strong>Sender Email:</strong> {successResponse.email}</p>
                  <p><strong>Submitted:</strong> {new Date(successResponse.createdAt).toLocaleString()}</p>
                  <p className="text-foreground pt-1">A confirmation dispatch has been logged. We will follow up shortly.</p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      setSuccessResponse(null);
                      setFormData({
                        name: "",
                        email: "",
                        subject: "",
                        category: "General Enquiry",
                        message: "",
                        website: "",
                      });
                      setFormLoadTime(Date.now() / 1000);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Send Us a Message</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    All fields marked with an asterisk (<span className="text-rose-500">*</span>) are required.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Honeypot field (hidden from legitimate users) */}
                <div style={{ opacity: 0, position: "absolute", top: 0, left: 0, height: 0, width: 0, zIndex: -1, pointerEvents: "none" }}>
                  <label htmlFor="website">Website (Leave blank)</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {/* Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Full Name <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Dr. Jordan Ellis"
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-background border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                        fieldErrors.name ? "border-rose-500 focus:ring-rose-500" : "border-border"
                      }`}
                      required
                    />
                    {fieldErrors.name && (
                      <span className="text-[11px] text-rose-500">{fieldErrors.name}</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Business Email <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jordan@enterprise.io"
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-background border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                        fieldErrors.email ? "border-rose-500 focus:ring-rose-500" : "border-border"
                      }`}
                      required
                    />
                    {fieldErrors.email && (
                      <span className="text-[11px] text-rose-500">{fieldErrors.email}</span>
                    )}
                  </div>
                </div>

                {/* Category & Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="category" className="text-xs font-semibold text-foreground">
                      Inquiry Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="subject" className="text-xs font-semibold text-foreground">
                      Subject <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Enterprise Kubernetes integration inquiry"
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-background border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                        fieldErrors.subject ? "border-rose-500 focus:ring-rose-500" : "border-border"
                      }`}
                      required
                    />
                    {fieldErrors.subject && (
                      <span className="text-[11px] text-rose-500">{fieldErrors.subject}</span>
                    )}
                  </div>
                </div>

                {/* Message Textarea */}
                <div className="space-y-1.5">
                  <label htmlFor="message" className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Message Body <span className="text-rose-500">*</span></span>
                    <span className="text-[11px] text-muted-foreground font-normal">Min. 10 characters</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Please describe your architecture, questions, or evaluation timeline..."
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-background border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                      fieldErrors.message ? "border-rose-500 focus:ring-rose-500" : "border-border"
                    }`}
                    required
                  />
                  {fieldErrors.message && (
                    <span className="text-[11px] text-rose-500">{fieldErrors.message}</span>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        <span>Transmitting Securely...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Inquiry</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Info Side Panel (Right 5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* SLA Card */}
            <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Response Commitment</h4>
                  <span className="text-xs text-muted-foreground">Direct from Engineering</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All inquiries submitted through this portal are processed by our core engineering team. 
                We target a <strong>24-hour business day SLA</strong> for technical and sales evaluations.
              </p>
            </div>

            {/* Direct Channels */}
            <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
              <h4 className="text-sm font-bold text-foreground">Communication Channels</h4>
              <ul className="space-y-3 text-xs">
                <li className="flex items-start gap-2.5 text-muted-foreground">
                  <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block">Engineering Support</span>
                    <a href="mailto:support@aiops-sentinel.local" className="hover:underline text-primary">
                      support@aiops-sentinel.local
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2.5 text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block">Security Vulnerability Disclosures</span>
                    <a href="mailto:security@aiops-sentinel.local" className="hover:underline text-primary">
                      security@aiops-sentinel.local
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2.5 text-muted-foreground">
                  <FileCode2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block">Documentation & API Spec</span>
                    <Link href="/docs" className="hover:underline text-primary">
                      View Platform Docs &rarr;
                    </Link>
                  </div>
                </li>
              </ul>
            </div>

            {/* Spam Protection Notice */}
            <div className="p-4 bg-muted/40 rounded-xl border border-border text-[11px] text-muted-foreground space-y-1 leading-relaxed">
              <span className="font-semibold text-foreground block flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Automated Protection
              </span>
              <p>
                Submissions are guarded by sliding-window rate limiting (10 submissions per IP per hour) 
                and invisible honeypot tripwires to prevent automated spam and resource exhaustion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
