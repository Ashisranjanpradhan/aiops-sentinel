"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  FileCode2,
  FolderArchive,
  FolderTree,
  Files,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Layers,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

type SubmissionMethod = "zip" | "folder" | "files";

const PROFILES = [
  { id: "auto", name: "Auto-detect from Repository" },
  { id: "Python Backend/API", name: "Python Backend / API (FastAPI, Flask, Django)" },
  { id: "JavaScript/TypeScript Web Application", name: "JavaScript / TypeScript Web Application (React, Vue)" },
  { id: "Full-Stack Web Application", name: "Full-Stack Web Application (Next.js, Remix, Node)" },
  { id: "Java Enterprise Application", name: "Java Enterprise Application (Spring Boot, Quarkus)" },
  { id: "Go Backend Application", name: "Go Backend Application (Gin, Fiber, Echo)" },
  { id: "Microservices Application", name: "Microservices Application (Multi-service / Compose / K8s)" },
  { id: "Machine Learning Application", name: "Machine Learning Application (PyTorch, TF, Scikit)" },
  { id: "Generic Software Repository", name: "Generic Software Repository" },
];

const MODES = [
  {
    id: "full_assessment",
    title: "Complete Static Assessment",
    desc: "Comprehensive 10-dimension evaluation of architecture, security, tests, reliability, and deployment.",
  },
  {
    id: "quick_scan",
    title: "Quick Static Scan",
    desc: "Fast credential scanning and high-severity vulnerability detection without full rubric scoring.",
  },
  {
    id: "isolated_verification",
    title: "Isolated Verification (Preview)",
    desc: "Architecture specification for future sandboxed build/test runner with zero-network and non-root isolation.",
  },
];

export default function NewCodebaseAssessmentPage() {
  const router = useRouter();

  // Submission Mode & Selection
  const [submissionMethod, setSubmissionMethod] = useState<SubmissionMethod>("zip");
  const [projectName, setProjectName] = useState<string>("");
  const [selectedProfile, setSelectedProfile] = useState<string>("auto");
  const [selectedMode, setSelectedMode] = useState<string>("full_assessment");

  // Files state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [relativePaths, setRelativePaths] = useState<string[]>([]);
  const [hasCredentialWarning, setHasCredentialWarning] = useState<boolean>(false);

  // Upload & Progress state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // File input refs
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const processFileList = (fileList: FileList | null, isFolder: boolean = false) => {
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    setSelectedFiles(filesArray);

    const rels: string[] = [];
    let hasCreds = false;

    for (const f of filesArray) {
      // webkitRelativePath is populated for folder selections
      const rel = (isFolder && (f as any).webkitRelativePath) ? (f as any).webkitRelativePath : f.name;
      rels.push(rel);

      const lower = rel.toLowerCase();
      if (
        lower.endsWith(".env") ||
        lower.includes(".env.") ||
        lower.includes("id_rsa") ||
        lower.includes("id_ed25519") ||
        lower.endsWith(".pem") ||
        lower.includes("credentials.json")
      ) {
        hasCreds = true;
      }
    }

    setRelativePaths(rels);
    setHasCredentialWarning(hasCreds);

    if (!projectName && filesArray.length > 0) {
      const first = filesArray[0];
      if (isFolder && (first as any).webkitRelativePath) {
        const rootFolder = (first as any).webkitRelativePath.split("/")[0];
        setProjectName(rootFolder);
      } else {
        const baseName = first.name.replace(/\.[^/.]+$/, "");
        setProjectName(baseName);
      }
    }
  };

  const pollJobStatus = async (jobId: string, assessmentId: string) => {
    let attempts = 0;
    const maxAttempts = 60;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await apiClient<{
          status: string;
          progress_percent: number;
          current_stage: string;
          error_message?: string;
        }>(`/assessments/jobs/${jobId}`);

        const job = res.data;
        if (job) {
          setUploadProgress(job.progress_percent || 10);
          setCurrentStage(job.current_stage || "Analyzing codebase...");

          if (job.status === "completed") {
            clearInterval(interval);
            router.push(`/codebase-assessments/${assessmentId}`);
          } else if (job.status === "failed") {
            clearInterval(interval);
            setIsUploading(false);
            setError(job.error_message || "Assessment failed during static analysis.");
          }
        }
      } catch {
        // Continue polling
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setIsUploading(false);
        setError("Assessment timed out. Check the assessments list for background status.");
      }
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      setError("Please select a ZIP archive, folder, or files to evaluate.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setCurrentStage("Uploading codebase to isolated sandbox...");
    setError(null);

    const formData = new FormData();
    formData.append("project_name", projectName.trim());
    formData.append("profile", selectedProfile);
    formData.append("mode", selectedMode);
    formData.append("relative_paths_json", JSON.stringify(relativePaths));

    for (const f of selectedFiles) {
      formData.append("files", f);
    }

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("aiops_token") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/v1/assessments/upload", {
        method: "POST",
        body: formData,
        headers,
        credentials: "include",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || "Failed to upload codebase.");
      }

      const { assessment_id, job_id } = json.data;
      setUploadProgress(25);
      setCurrentStage("Workspace initialized. Starting static analysis pipeline...");
      pollJobStatus(job_id, assessment_id);
    } catch (err: any) {
      setIsUploading(false);
      setError(err.message || "An unexpected error occurred during upload.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          href="/codebase-assessments"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Assessments
        </Link>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-2">New Codebase Readiness Assessment</h1>
        <p className="text-xs text-slate-500 mt-1">
          Inspect repositories, libraries, or service components for production deployability across 10 engineering dimensions.
        </p>
      </div>

      {/* Security & Sandbox Disclosure Card */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-xs text-indigo-900 space-y-2">
        <div className="flex items-center space-x-2 font-bold text-indigo-950">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Zero-Execution Static Sandbox Architecture</span>
        </div>
        <p className="text-indigo-800 leading-relaxed">
          Uploaded source files are treated as untrusted data. Files are inspected purely through AST parsing, credential entropy scanning,
          manifest evaluation, and configuration pattern analysis in isolated ephemeral scratch directories. Code is <strong>never executed</strong> on
          the server or API host.
        </p>
      </div>

      {/* Upload Form Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isUploading ? (
          <div className="py-12 px-4 text-center space-y-5">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Evaluating Codebase Readiness</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">{currentStage}</p>
            </div>

            <div className="max-w-md mx-auto space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Pipeline Progress</span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              Running 10-dimension evaluation (Security, Contracts, Reliability, Observability, Tests, Architecture).
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project / Repository Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Project / Repository Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. order-processing-service or aiops-sentinel"
                className="w-full px-3.5 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Human-readable identifier for reporting and historical audit tracking.
              </span>
            </div>

            {/* Submission Method Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">Codebase Archive or Files</label>
              <div className="flex border-b border-slate-200 mb-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setSubmissionMethod("zip");
                    setSelectedFiles([]);
                  }}
                  className={`pb-2.5 px-4 border-b-2 flex items-center space-x-1.5 transition ${
                    submissionMethod === "zip"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>ZIP Archive</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmissionMethod("folder");
                    setSelectedFiles([]);
                  }}
                  className={`pb-2.5 px-4 border-b-2 flex items-center space-x-1.5 transition ${
                    submissionMethod === "folder"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FolderTree className="w-4 h-4" />
                  <span>Complete Folder Selection</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmissionMethod("files");
                    setSelectedFiles([]);
                  }}
                  className={`pb-2.5 px-4 border-b-2 flex items-center space-x-1.5 transition ${
                    submissionMethod === "files"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Files className="w-4 h-4" />
                  <span>Individual Files</span>
                </button>
              </div>

              {/* Method A: ZIP Upload */}
              {submissionMethod === "zip" && (
                <div
                  onClick={() => zipInputRef.current?.click()}
                  className="flex justify-center px-6 pt-6 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-indigo-400 transition bg-slate-50 cursor-pointer text-center"
                >
                  <div className="space-y-2">
                    <FolderArchive className="mx-auto h-10 w-10 text-slate-400" />
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-indigo-600">Choose ZIP archive</span>
                      <span className="pl-1">or drag and drop</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Standard .zip archives up to 25 MB</p>
                    <input
                      ref={zipInputRef}
                      type="file"
                      accept=".zip"
                      onChange={(e) => processFileList(e.target.files, false)}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* Method B: Folder Selection */}
              {submissionMethod === "folder" && (
                <div
                  onClick={() => folderInputRef.current?.click()}
                  className="flex justify-center px-6 pt-6 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-indigo-400 transition bg-slate-50 cursor-pointer text-center"
                >
                  <div className="space-y-2">
                    <FolderTree className="mx-auto h-10 w-10 text-slate-400" />
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-indigo-600">Select Project Folder</span>
                      <span className="pl-1">via browser directory picker</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Preserves relative directory paths and nested subfolders.
                    </p>
                    {/* webkitdirectory attribute triggers native browser directory picker */}
                    <input
                      ref={folderInputRef}
                      type="file"
                      {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                      onChange={(e) => processFileList(e.target.files, true)}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* Method C: Multi-File Selection */}
              {submissionMethod === "files" && (
                <div
                  onClick={() => filesInputRef.current?.click()}
                  className="flex justify-center px-6 pt-6 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-indigo-400 transition bg-slate-50 cursor-pointer text-center"
                >
                  <div className="space-y-2">
                    <Files className="mx-auto h-10 w-10 text-slate-400" />
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-indigo-600">Choose multiple files</span>
                      <span className="pl-1">to inspect</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Python, TypeScript, JavaScript, Java, Go, Rust, Dockerfile, manifests
                    </p>
                    <input
                      ref={filesInputRef}
                      type="file"
                      multiple
                      accept=".py,.ts,.tsx,.js,.jsx,.java,.go,.rs,.sql,.sh,.yaml,.yml,.json,.toml,.md,Dockerfile"
                      onChange={(e) => processFileList(e.target.files, false)}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* Selected Files Badge & Preview */}
              {selectedFiles.length > 0 && (
                <div className="mt-3 p-3 bg-slate-100 rounded border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCode2 className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold">{selectedFiles[0].name}</span>
                    {selectedFiles.length > 1 && (
                      <span className="text-slate-500">(+{selectedFiles.length - 1} more files selected)</span>
                    )}
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB Total
                  </span>
                </div>
              )}

              {/* Pre-Upload Credential Warning */}
              {hasCredentialWarning && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Credential / Environment Files Detected:</span> Selection includes
                    potential configuration or credential files (e.g. <code>.env</code> or private keys). AIOps Sentinel runs in static zero-execution mode and automatically redacts secrets in findings, but we recommend omitting production keys.
                  </div>
                </div>
              )}
            </div>

            {/* Assessment Profile Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Project Profile</label>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  {PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Tailors scoring rubrics to specific architectural conventions.
                </span>
              </div>

              {/* Execution Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Execution Mode</label>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  {MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {MODES.find((m) => m.id === selectedMode)?.desc}
                </span>
              </div>
            </div>

            {/* Evaluated Dimensions Preview */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 mb-2">Evaluated Engineering Dimensions</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Architecture & Modularity</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>API Contracts & Schemas</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Database Migrations & ORM</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Security & Secret Hygiene</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fault Tolerance & Timeouts</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Observability & Probes</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Automated Testing Suite</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Configuration Hygiene</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Container Deployment</span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <Link
                href="/codebase-assessments"
                className="px-4 py-2 border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={selectedFiles.length === 0}
                className="px-5 py-2 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                Execute Assessment
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
