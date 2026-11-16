"use client";

import React, { useState, useEffect } from "react";
import { User, CheckCircle2, Shield } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { LoadingSpinner, ErrorAlert } from "@/components/common/UIStates";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tableDensity, setTableDensity] = useState<"compact" | "normal" | "comfortable">("normal");

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any>("/profile");
      if (res.data) {
        setProfile(res.data);
        setDisplayName(res.data.display_name || "");
        setTimeZone(res.data.time_zone || "Asia/Kolkata");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load user profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await apiClient("/profile", {
        method: "PATCH",
        body: JSON.stringify({
          display_name: displayName.trim(),
          time_zone: timeZone,
        }),
      });
      setSavedSuccess(true);
      await fetchProfile();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) return <LoadingSpinner message="Loading user profile..." />;
  if (error && !profile) return <ErrorAlert message={error} onRetry={fetchProfile} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Operator Profile & Preferences</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account credentials, display identity, and timezone localization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Preferences Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profile preferences updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold block text-slate-700 mb-1">Email Address</label>
              <input
                type="text"
                disabled
                value={profile?.email || ""}
                className="w-full px-3 py-2 border border-slate-200 rounded bg-slate-50 text-slate-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Managed by enterprise identity directory.</span>
            </div>

            <div>
              <label className="font-semibold block text-slate-700 mb-1">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold block text-slate-700 mb-1">Preferred Timezone</label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
                <option value="UTC">UTC (Universal Coordinated Time)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold block text-slate-700 mb-1">Table Density Preference</label>
              <div className="grid grid-cols-3 gap-2">
                {(["compact", "normal", "comfortable"] as const).map((density) => (
                  <button
                    key={density}
                    type="button"
                    onClick={() => setTableDensity(density)}
                    className={`py-1.5 px-3 border rounded text-center capitalize transition-colors ${
                      tableDensity === density
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {density}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Preferences"}
              </button>
            </div>
          </form>
        </div>

        {/* Security & Role Summary Card */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Role & Security Authority</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Assigned Role:</span>
                <span className="px-2 py-0.5 rounded font-semibold bg-indigo-50 text-indigo-700 uppercase tracking-wider text-[10px]">
                  {profile?.role || "analyst"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Incident Lifecycle:</span>
                <span className="font-medium text-emerald-700">Authorized</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Alert Rule Management:</span>
                <span className="font-medium text-emerald-700">Authorized</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Dataset Governance:</span>
                <span className="font-medium text-emerald-700">Authorized</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Auth Method:</span>
                <span className="font-mono text-slate-700">Argon2id + JWT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
