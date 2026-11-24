"use client";

import React, { useState, useEffect } from "react";
import { 
  Inbox, 
  Search, 
  Filter, 
  ShieldAlert, 
  Clock, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  RefreshCw, 
  ChevronDown, 
  Save, 
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { LoadingSpinner, ErrorAlert } from "@/components/common/UIStates";

interface Enquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
  client_ip: string | null;
  status: "new" | "in_review" | "replied" | "archived";
  internal_notes: string | null;
  replied_at: string | null;
  replied_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminEnquiriesPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  
  // Edit states for selected enquiry
  const [editStatus, setEditStatus] = useState<string>("new");
  const [editNotes, setEditNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchEnquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      // First get current user
      const userRes = await apiClient<any>("/auth/me");
      setCurrentUser(userRes.data);

      const userRole = userRes.data?.role;
      if (userRole !== "admin" && userRole !== "operator") {
        setError("Access Restricted: Viewing contact enquiries requires Operator or Administrator permissions.");
        setLoading(false);
        return;
      }

      const res = await apiClient<Enquiry[]>("/contact/enquiries");
      const list = res.data || [];
      setEnquiries(list);
      if (list.length > 0 && !selectedEnquiry) {
        setSelectedEnquiry(list[0]);
        setEditStatus(list[0].status);
        setEditNotes(list[0].internal_notes || "");
      }
    } catch (err: any) {
      if (err.message?.includes("403") || err.code === "FORBIDDEN") {
        setError("Access Restricted: Viewing contact enquiries requires Operator or Administrator permissions.");
      } else {
        setError(err.message || "Failed to load enquiries.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectEnquiry = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setEditStatus(enquiry.status);
    setEditNotes(enquiry.internal_notes || "");
    setSaveSuccess(false);
  };

  const handleUpdate = async () => {
    if (!selectedEnquiry) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await apiClient<Enquiry>(`/contact/enquiries/${selectedEnquiry.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: editStatus,
          internal_notes: editNotes.trim(),
        }),
      });

      if (res.data) {
        const updated = res.data;
        setEnquiries(prev => prev.map(e => e.id === updated.id ? updated : e));
        setSelectedEnquiry(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      alert("Failed to update enquiry: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEnquiries = enquiries.filter(e => {
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      e.name.toLowerCase().includes(query) ||
      e.email.toLowerCase().includes(query) ||
      e.subject.toLowerCase().includes(query) ||
      e.category.toLowerCase().includes(query) ||
      e.id.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  if (loading && !currentUser) {
    return <LoadingSpinner message="Checking administrative credentials..." />;
  }

  if (error && (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "operator"))) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="p-6 bg-card rounded-2xl border border-rose-500/30 shadow-sm space-y-3">
          <div className="flex items-center gap-3 text-rose-500">
            <ShieldAlert className="w-6 h-6" />
            <h3 className="text-base font-bold text-foreground">Access Restricted</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error}
          </p>
          <div className="p-3 bg-muted rounded-lg text-xs font-mono text-muted-foreground">
            Current Identity: {currentUser?.email || "Unknown"} (Role: {currentUser?.role || "analyst"})
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              Admin Console
            </span>
            <span className="text-xs text-muted-foreground">RBAC: {currentUser?.role?.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Contact Enquiries Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review, triage, and update customer inquiries and platform collaboration requests.
          </p>
        </div>

        <button
          onClick={fetchEnquiries}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border text-foreground hover:bg-muted rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sender, email, subject, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Status:</span>
          <select
            id="filter-status"
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Enquiries ({enquiries.length})</option>
            <option value="new">New</option>
            <option value="in_review">In Review</option>
            <option value="replied">Replied</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Master-Detail Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Enquiries List (5 cols) */}
        <div className="lg:col-span-5 bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="p-3.5 bg-muted/50 border-b border-border flex justify-between items-center text-xs font-semibold text-muted-foreground">
            <span>Enquiries ({filteredEnquiries.length})</span>
            <span>Sorted by Recent</span>
          </div>

          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {filteredEnquiries.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <Inbox className="w-8 h-8 mx-auto opacity-40" />
                <p>No contact enquiries match your search criteria.</p>
              </div>
            ) : (
              filteredEnquiries.map((enquiry) => {
                const isSelected = selectedEnquiry?.id === enquiry.id;
                return (
                  <button
                    key={enquiry.id}
                    data-testid="enquiry-item"
                    onClick={() => handleSelectEnquiry(enquiry)}
                    className={`w-full text-left p-4 transition-all duration-150 flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-primary/5 border-l-4 border-l-primary"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground truncate max-w-[180px]">
                        {enquiry.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(enquiry.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-xs text-foreground font-medium truncate">
                      {enquiry.subject}
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {enquiry.message}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          enquiry.status === "new"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : enquiry.status === "in_review"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : enquiry.status === "replied"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {enquiry.status.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        &bull; {enquiry.category}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Enquiry Details (7 cols) */}
        <div className="lg:col-span-7 bg-card rounded-xl border border-border p-6 shadow-sm">
          {selectedEnquiry ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      {selectedEnquiry.id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      &bull; {new Date(selectedEnquiry.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-1">
                    {selectedEnquiry.subject}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`mailto:${selectedEnquiry.email}?subject=Re: ${encodeURIComponent(selectedEnquiry.subject)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Reply via Email</span>
                  </a>
                </div>
              </div>

              {/* Sender Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/30 p-3.5 rounded-lg border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Sender Name:</span>
                  <span className="font-semibold text-foreground">{selectedEnquiry.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Sender Email:</span>
                  <span className="font-semibold text-foreground font-mono">{selectedEnquiry.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Category:</span>
                  <span className="font-semibold text-foreground">{selectedEnquiry.category}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Client IP:</span>
                  <span className="font-mono text-foreground">{selectedEnquiry.client_ip || "Unknown / Proxy"}</span>
                </div>
              </div>

              {/* Message Payload */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Original Message Body
                </span>
                <div className="p-4 bg-muted/40 rounded-lg border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedEnquiry.message}
                </div>
              </div>

              {/* Triage & Management Form */}
              <div className="pt-4 border-t border-border space-y-4">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Operator Triage & Notes
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="triage-status" className="text-xs font-semibold text-foreground">Enquiry Status</label>
                    <select
                      id="triage-status"
                      aria-label="Triage status"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="new">New</option>
                      <option value="in_review">In Review</option>
                      <option value="replied">Replied</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Internal Notes (Visible to Staff Only)</label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add operational notes, dispatch records, or follow-up details..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleUpdate}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? "Saving Changes..." : "Save Triage Updates"}</span>
                  </button>

                  {saveSuccess && (
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Updates saved successfully!
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto opacity-40" />
              <p>Select an enquiry from the list to view full details and update triage status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
