"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  User,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface AuthCardProps {
  initialMode?: "login" | "register";
}

export function AuthCard({ initialMode = "login" }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryMode = searchParams?.get("mode") || searchParams?.get("tab");
  const defaultRegister = initialMode === "register" || queryMode === "register" || queryMode === "signup";

  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(defaultRegister);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (queryMode === "register" || queryMode === "signup") {
      setIsRegisterMode(true);
    } else if (queryMode === "login" || queryMode === "signin") {
      setIsRegisterMode(false);
    }
  }, [queryMode]);

  const validateInputs = (): boolean => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg("Please enter both email and password.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return false;
    }

    if (isRegisterMode) {
      const trimmedName = displayName.trim();
      if (!trimmedName) {
        setErrorMsg("Please enter your display name.");
        return false;
      }
      if (trimmedName.length < 2) {
        setErrorMsg("Display name must be at least 2 characters long.");
        return false;
      }

      if (password.length < 8) {
        setErrorMsg("Password must be at least 8 characters long.");
        return false;
      }
      if (!/[A-Z]/.test(password)) {
        setErrorMsg("Password must contain at least one uppercase letter (A-Z).");
        return false;
      }
      if (!/[a-z]/.test(password)) {
        setErrorMsg("Password must contain at least one lowercase letter (a-z).");
        return false;
      }
      if (!/\d/.test(password)) {
        setErrorMsg("Password must contain at least one numerical digit (0-9).");
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    if (isRegisterMode) {
      try {
        const res = await apiClient<any>("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: password,
            display_name: displayName.trim(),
            role: "analyst",
          }),
        });

        if (res.data?.access_token) {
          localStorage.setItem("aiops_token", res.data.access_token);
          setSuccessMsg("Account created successfully! Redirecting to platform...");
          setTimeout(() => {
            router.push("/overview");
          }, 600);
        } else {
          setSuccessMsg("Account created! Please sign in.");
          setIsRegisterMode(false);
        }
      } catch (err: any) {
        console.error("Registration error:", err);
        setErrorMsg(err.message || "Failed to create account. Please check your credentials and try again.");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const res = await apiClient<any>("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: password,
          }),
        });

        if (res.data?.access_token) {
          localStorage.setItem("aiops_token", res.data.access_token);
          router.push("/overview");
        } else {
          setErrorMsg("Login succeeded but no access token was returned.");
        }
      } catch (err: any) {
        console.error("Login error:", err);
        setErrorMsg(err.message || "Invalid email or password. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const switchToRegister = () => {
    setIsRegisterMode(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPassword("");
    setConfirmPassword("");
  };

  const switchToLogin = () => {
    setIsRegisterMode(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-2 text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <span>AIOps Sentinel</span>
        </div>
        <h2 className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Intelligent Observability & Incident Investigation Platform
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-lg sm:px-10">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
            <button
              type="button"
              onClick={switchToLogin}
              className={`flex-1 pb-3 text-xs font-semibold text-center border-b-2 transition-colors ${
                !isRegisterMode
                  ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={switchToRegister}
              className={`flex-1 pb-3 text-xs font-semibold text-center border-b-2 transition-colors ${
                isRegisterMode
                  ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Create Account
            </button>
          </div>

          <form noValidate className="space-y-4" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded text-rose-800 dark:text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {isRegisterMode && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Full Name / Display Name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. Ashis Pradhan"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="analyst@domain.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
              </div>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder={isRegisterMode ? "Min. 8 characters" : "Enter password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {isRegisterMode && (
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Must be at least 8 characters with uppercase, lowercase, and a number.
                </p>
              )}
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Confirm password"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 transition-colors"
              >
                {loading
                  ? isRegisterMode
                    ? "Creating Account..."
                    : "Authenticating..."
                  : isRegisterMode
                  ? "Create Account & Sign In"
                  : "Sign in to Sentinel"}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            {isRegisterMode ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={switchToLogin}
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center"
                >
                  Sign in
                  <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Need an account?{" "}
                <button
                  type="button"
                  onClick={switchToRegister}
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center"
                >
                  Create one now
                  <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
