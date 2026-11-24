"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  AlertTriangle,
  Network,
  GitCommit,
  FlaskConical,
  Database,
  Bell,
  FileCode2,
  Settings,
  User,
  LogOut,
  Radio,
  Clock,
  Inbox,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { name: "Overview", href: "/overview", icon: LayoutDashboard },
  { name: "Services", href: "/services", icon: Server },
  { name: "Incidents", href: "/incidents", icon: AlertTriangle },
  { name: "Topology", href: "/topology", icon: Network },
  { name: "Deployments", href: "/deployments", icon: GitCommit },
  { name: "Experiments", href: "/experiments", icon: FlaskConical },
  { name: "Datasets", href: "/datasets", icon: Database },
  { name: "Alert rules", href: "/alert-rules", icon: Bell },
  { name: "Codebase Assessment", href: "/codebase-assessments", icon: FileCode2 },
];

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/features",
  "/research",
  "/docs",
  "/contact",
  "/privacy",
  "/terms",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>("SRE Operator");
  const [userRole, setUserRole] = useState<string>("operator");
  const [telemetryReady, setTelemetryReady] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<string>("3h");

  const isLoginRoute = pathname === "/login";
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    // Only verify authentication on protected console routes
    if (!isLoginRoute && !isPublicRoute) {
      apiClient<any>("/auth/me")
        .then((res) => {
          if (res.data) {
            setUserName(res.data.display_name || "SRE Operator");
            setUserRole(res.data.role || "operator");
          }
        })
        .catch(() => {
          router.push("/login");
        });

      apiClient<any>("/health/ready")
        .then((res) => {
          if (res.data) {
            setTelemetryReady(res.data.status === "ready");
          }
        })
        .catch(() => setTelemetryReady(false));
    }
  }, [pathname, router, isLoginRoute, isPublicRoute]);

  const handleLogout = async () => {
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("aiops_token");
    }
    router.push("/login");
  };

  // 1. If on login route, display standalone auth card with theme switcher
  if (isLoginRoute) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center relative transition-colors">
        <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2.5 py-1.5 rounded"
          >
            ← Back to Home
          </Link>
          <ThemeToggle />
        </div>
        {children}
      </div>
    );
  }

  // 2. If on public marketing/documentation route, render public SaaS chrome
  if (isPublicRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
        <PublicHeader />
        <main className="flex-1">{children}</main>
        <PublicFooter />
      </div>
    );
  }

  // 3. Authenticated Application Console
  let pageTitle = "Observability Console";
  if (pathname === "/overview") pageTitle = "Overview";
  else if (pathname.startsWith("/services/")) pageTitle = "Services / Detail";
  else if (pathname === "/services") pageTitle = "Services";
  else if (pathname.startsWith("/incidents/")) pageTitle = "Incidents / Investigation";
  else if (pathname === "/incidents") pageTitle = "Incidents";
  else if (pathname === "/topology") pageTitle = "Topology";
  else if (pathname === "/deployments") pageTitle = "Deployments";
  else if (pathname.startsWith("/experiments/")) pageTitle = "Experiments / Run";
  else if (pathname === "/experiments") pageTitle = "Experiments";
  else if (pathname === "/datasets") pageTitle = "Datasets";
  else if (pathname === "/alert-rules") pageTitle = "Alert Rules";
  else if (pathname.startsWith("/codebase-assessments/")) pageTitle = "Codebase Assessment / Detail";
  else if (pathname === "/codebase-assessments") pageTitle = "Codebase Assessment";
  else if (pathname === "/settings/enquiries") pageTitle = "Settings / Contact Enquiries";
  else if (pathname === "/settings") pageTitle = "Settings";
  else if (pathname === "/profile") pageTitle = "User Profile";

  const isStaff = userRole === "admin" || userRole === "operator";

  return (
    <div className="flex h-screen bg-background font-sans text-foreground transition-colors">
      {/* Sidebar */}
      <aside className="w-64 bg-surface dark:bg-slate-900 border-r border-border dark:border-slate-800 flex flex-col justify-between shrink-0 transition-colors">
        <div>
          {/* Product Wordmark */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-border dark:border-slate-800">
            <Link href="/overview" className="flex items-center space-x-2">
              <span className="text-base font-bold tracking-tight text-text-primary">
                AIOps <span className="text-primary">Sentinel</span>
              </span>
            </Link>
            <Link
              href="/"
              target="_blank"
              title="Open Public Website"
              className="text-text-muted hover:text-text-primary p-1 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/overview" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-hover font-semibold"
                      : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-3 ${isActive ? "text-primary" : "text-text-muted"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Secondary Links & Account */}
        <div className="p-4 border-t border-border dark:border-slate-800 space-y-1">
          {isStaff && (
            <Link
              href="/settings/enquiries"
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                pathname === "/settings/enquiries"
                  ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-hover font-semibold"
                  : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
              }`}
            >
              <Inbox className="w-4 h-4 mr-3 text-text-muted" />
              Enquiries
            </Link>
          )}
          <Link
            href="/settings"
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              pathname === "/settings"
                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-hover font-semibold"
                : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
            }`}
          >
            <Settings className="w-4 h-4 mr-3 text-text-muted" />
            Settings
          </Link>
          <Link
            href="/profile"
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              pathname === "/profile"
                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-hover font-semibold"
                : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
            }`}
          >
            <User className="w-4 h-4 mr-3 text-text-muted" />
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-text-secondary hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-400 rounded-md transition-colors text-left"
          >
            <LogOut className="w-4 h-4 mr-3 text-text-muted" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-surface dark:bg-slate-900 border-b border-border dark:border-slate-800 flex items-center justify-between px-6 lg:px-8 shrink-0 transition-colors">
          <div className="flex items-center space-x-3">
            <h1 className="text-base font-semibold text-text-primary tracking-tight">
              {pageTitle}
            </h1>
            <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded font-mono">
              Production Telemetry
            </span>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Theme Toggle in Console Header */}
            <ThemeToggle />

            {/* Global Time Range Selector */}
            <div className="flex items-center bg-surface dark:bg-slate-800 border border-border dark:border-slate-700 rounded-md shadow-xs px-2.5 py-1 text-xs text-text-secondary">
              <Clock className="w-3.5 h-3.5 text-text-muted mr-1.5" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-transparent text-xs font-medium text-text-primary focus:outline-none cursor-pointer"
              >
                <option value="15m" className="bg-surface text-text-primary">Last 15 minutes</option>
                <option value="1h" className="bg-surface text-text-primary">Last 1 hour</option>
                <option value="3h" className="bg-surface text-text-primary">Last 3 hours</option>
                <option value="24h" className="bg-surface text-text-primary">Last 24 hours</option>
                <option value="7d" className="bg-surface text-text-primary">Last 7 days</option>
              </select>
            </div>

            {/* Live Data Backend Indicator */}
            <div className="flex items-center space-x-2 text-xs font-medium text-text-secondary bg-surface-raised border border-border dark:border-slate-700 px-3 py-1.5 rounded-full">
              <Radio
                className={`w-3.5 h-3.5 ${
                  telemetryReady ? "text-emerald-500 animate-pulse" : "text-amber-500"
                }`}
              />
              <span className="hidden sm:inline">{telemetryReady ? "Telemetry Active" : "Telemetry Degraded"}</span>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-text-primary block">{userName}</span>
              <span className="text-[10px] text-text-secondary block capitalize">{userRole}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-8 bg-background transition-colors">
          <div className="max-w-7xl mx-auto w-full space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
