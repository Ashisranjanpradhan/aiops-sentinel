"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle, User, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("admin@aiops.sentinel");
  const [password, setPassword] = useState("sentinel-admin-1234");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    if (isRegisterMode) {
      if (!displayName.trim()) {
        setErrorMsg("Please enter your display name.");
        return;
      }
      if (password.length < 8) {
        setErrorMsg("Password must be at least 8 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }

      setLoading(true);
      try {
        const res = await apiClient<any>("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password: password,
            display_name: displayName.trim(),
            role: "analyst",
          }),
        });

        if (res.data?.access_token) {
          localStorage.setItem("aiops_token", res.data.access_token);
          setSuccessMsg("Account created successfully! Redirecting...");
          setTimeout(() => {
            router.push("/overview");
          }, 600);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to create account. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode
      setLoading(true);
      try {
        const res = await apiClient<any>("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password: password,
          }),
        });

        if (res.data?.access_token) {
          localStorage.setItem("aiops_token", res.data.access_token);
          router.push("/overview");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Invalid credentials. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const switchToRegister = () => {
    setIsRegisterMode(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
  };

  const switchToLogin = () => {
    setIsRegisterMode(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmail("admin@aiops.sentinel");
    setPassword("sentinel-admin-1234");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-2 text-2xl font-bold text-slate-900 tracking-tight">
          <ShieldCheck className="w-8 h-8 text-indigo-600" />
          <span>AIOps Sentinel</span>
        </div>
        <h2 className="mt-2 text-center text-sm text-slate-600">
          Intelligent Observability & Incident Investigation Platform
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-lg sm:px-10">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={switchToLogin}
              className={`flex-1 pb-3 text-xs font-semibold text-center border-b-2 transition-colors ${
                !isRegisterMode
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={switchToRegister}
              className={`flex-1 pb-3 text-xs font-semibold text-center border-b-2 transition-colors ${
                isRegisterMode
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Account
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {isRegisterMode && (
              <div>
                <label className="block text-xs font-medium text-slate-700">Display Name / Full Name</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. Ashis Pradhan"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700">Email Address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="analyst@domain.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder={isRegisterMode ? "Min. 8 characters" : "Enter password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-xs font-medium text-slate-700">Confirm Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}

            <div>
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

          {/* Dev Seed Credentials helper */}
          {!isRegisterMode && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 text-center">
              <span className="font-medium text-slate-700 block mb-1">Local Dev Seed Account:</span>
              <code>admin@aiops.sentinel</code> / <code>sentinel-admin-1234</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
