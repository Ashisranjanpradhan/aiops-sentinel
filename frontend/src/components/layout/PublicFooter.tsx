import React from "react";
import Link from "next/link";
import { Activity, Github, Shield, Terminal, BookOpen, Mail } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                AIOps <span className="text-indigo-600 dark:text-indigo-400">Sentinel</span>
              </span>
            </Link>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
              Assess software production readiness, monitor running systems, detect anomalies and
              investigate operational failures through an integrated engineering intelligence platform.
            </p>
            <div className="mt-4 flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center">
                <Shield className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                Enterprise RBAC & Advisory Locking
              </span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Platform
            </h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/features" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Platform Features
                </Link>
              </li>
              <li>
                <Link href="/features#codebase-intelligence" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Codebase Intelligence
                </Link>
              </li>
              <li>
                <Link href="/features#runtime-reliability" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Runtime Reliability
                </Link>
              </li>
              <li>
                <Link href="/overview" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Live Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Research & Docs */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Research & Docs
            </h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/research" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Research Foundations
                </Link>
              </li>
              <li>
                <Link href="/research#benchmarks" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Benchmark Provenance
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Documentation & Quickstart
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Ashisranjanpradhan/aiops-sentinel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Github className="w-3.5 h-3.5 mr-1" />
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>

          {/* Governance & Contact */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Governance
            </h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/about" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  About AIOps Sentinel
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} AIOps Sentinel Platform. Open research & software reliability intelligence.</p>
          <div className="mt-3 sm:mt-0 flex items-center space-x-6">
            <span>OpenTelemetry Native</span>
            <span>Prometheus / Loki / Tempo</span>
            <span>PostgreSQL 16</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
