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
  Settings,
  User,
  LogOut,
  Radio,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

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
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>("SRE Lead");
  const [telemetryReady, setTelemetryReady] = useState<boolean>(true);

  useEffect(() => {
    // Check user info and telemetry status
    apiClient<any>("/auth/me")
      .then((res) => {
        if (res.data) {
          setUserName(res.data.display_name);
        }
      })
      .catch(() => {
        // Not authenticated
        if (pathname !== "/login") {
          router.push("/login");
        }
      });

    apiClient<any>("/health/ready")
      .then((res) => {
        if (res.data) {
          setTelemetryReady(res.data.status === "ready");
        }
      })
      .catch(() => setTelemetryReady(false));
  }, [pathname, router]);

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

  // If on login page, don't show shell
  if (pathname === "/login") {
    return <>{children}</>;
  }

  const currentNav = PRIMARY_NAV.find((item) =>
    pathname === item.href || (item.href !== "/overview" && pathname.startsWith(item.href))
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div>
          {/* Product Wordmark */}
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <Link href="/overview" className="flex items-center space-x-2">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                AIOps <span className="text-indigo-600">Sentinel</span>
              </span>
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
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-3 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Secondary Links & Account */}
        <div className="p-4 border-t border-slate-100 space-y-1">
          <Link
            href="/settings"
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              pathname === "/settings"
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Settings className="w-4 h-4 mr-3 text-slate-400" />
            Settings
          </Link>
          <Link
            href="/profile"
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              pathname === "/profile"
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <User className="w-4 h-4 mr-3 text-slate-400" />
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 rounded-md transition-colors text-left"
          >
            <LogOut className="w-4 h-4 mr-3 text-slate-400" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-semibold text-slate-900">
              {currentNav?.name || "Observability Console"}
            </h1>
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono">
              Demo Environment
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Live Data Backend Indicator */}
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
              <Radio
                className={`w-3.5 h-3.5 ${
                  telemetryReady ? "text-emerald-500 animate-pulse" : "text-amber-500"
                }`}
              />
              <span>{telemetryReady ? "Telemetry Active" : "Telemetry Degraded"}</span>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-900 block">{userName}</span>
              <span className="text-[10px] text-slate-500 block">SRE Operator</span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
