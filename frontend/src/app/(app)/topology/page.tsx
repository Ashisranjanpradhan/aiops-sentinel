"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Network, RefreshCw, Layers, List, Eye } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoadingSpinner, ErrorAlert } from "@/components/common/UIStates";

export default function TopologyPage() {
  const [topology, setTopology] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"graph" | "list">("graph");

  const fetchTopology = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any>("/topology");
      setTopology(res.data);
      if (res.data?.nodes?.length > 0) {
        setSelectedNode(res.data.nodes[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load service topology.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
  }, []);

  if (loading && !topology) return <LoadingSpinner message="Mapping microservice dependency topology..." />;
  if (error && !topology) return <ErrorAlert message={error} onRetry={fetchTopology} />;

  const nodes = topology?.nodes || [];
  const edges = topology?.edges || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Service Dependency Topology</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Trace-derived call graphs and communication dependencies across production services.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-white border border-slate-200 rounded-md p-1 flex space-x-1">
            <button
              onClick={() => setViewMode("graph")}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                viewMode === "graph" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Graph View
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                viewMode === "list" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Accessible List
            </button>
          </div>

          <button
            onClick={fetchTopology}
            className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {viewMode === "graph" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Graph Surface */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm p-6 relative overflow-hidden min-h-[500px] flex items-center justify-center">
            {/* Render 2D SVG Graph Layout */}
            <svg className="w-full h-[480px]" viewBox="0 0 700 480">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Static coordinates mapping for clean predictable layout */}
              {edges.map((e: any, idx: number) => {
                // Find node positions
                const srcIdx = nodes.findIndex((n: any) => n.name === e.source);
                const tgtIdx = nodes.findIndex((n: any) => n.name === e.target);
                if (srcIdx === -1 || tgtIdx === -1) return null;

                const getCoords = (i: number) => {
                  const angle = (i / nodes.length) * 2 * Math.PI;
                  return {
                    x: 350 + 220 * Math.cos(angle),
                    y: 240 + 170 * Math.sin(angle),
                  };
                };

                const p1 = getCoords(srcIdx);
                const p2 = getCoords(tgtIdx);

                return (
                  <line
                    key={e.id || idx}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={e.error_rate > 0.05 ? "#f43f5e" : "#cbd5e1"}
                    strokeWidth={e.error_rate > 0.05 ? 2.5 : 1.5}
                    markerEnd="url(#arrow)"
                    strokeDasharray={e.error_rate > 0.05 ? "4 4" : undefined}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((node: any, idx: number) => {
                const angle = (idx / nodes.length) * 2 * Math.PI;
                const cx = 350 + 220 * Math.cos(angle);
                const cy = 240 + 170 * Math.sin(angle);
                const isSelected = selectedNode?.name === node.name;

                let strokeColor = "#10b981"; // healthy
                if (node.health_status === "warning") strokeColor = "#f59e0b";
                if (node.health_status === "critical") strokeColor = "#ef4444";

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-transform hover:scale-105"
                    onClick={() => setSelectedNode(node)}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 26 : 22}
                      fill="#ffffff"
                      stroke={isSelected ? "#4f46e5" : strokeColor}
                      strokeWidth={isSelected ? 3.5 : 2.5}
                      className="shadow-sm"
                    />
                    <text
                      x={cx}
                      y={cy + 34}
                      textAnchor="middle"
                      className={`text-[11px] font-semibold ${
                        isSelected ? "fill-indigo-700 font-bold" : "fill-slate-700"
                      }`}
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Node Detail Drawer Panel */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4">
            {selectedNode ? (
              <>
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">{selectedNode.name}</h3>
                    <StatusBadge status={selectedNode.health_status} />
                  </div>
                  <span className="text-xs text-slate-500 font-mono">Env: {selectedNode.environment}</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Request Rate:</span>
                    <span className="font-semibold text-slate-900">{selectedNode.request_rate} req/s</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Error Rate:</span>
                    <span className={`font-semibold ${selectedNode.error_rate > 0.02 ? "text-rose-600" : "text-slate-900"}`}>
                      {(selectedNode.error_rate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">p95 Latency:</span>
                    <span className="font-semibold text-slate-900">{selectedNode.p95_latency_ms} ms</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Active Incidents:</span>
                    <span className="font-semibold text-rose-600">{selectedNode.active_incidents}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Link
                    href={`/services/${selectedNode.id}`}
                    className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 shadow-sm"
                  >
                    Open Service Detail Page
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-xs text-slate-400">
                Click a node in the graph to inspect its service metrics.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Accessible List View */
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Health Status</th>
                <th className="px-5 py-3">Request Rate</th>
                <th className="px-5 py-3">p95 Latency</th>
                <th className="px-5 py-3">Error Rate</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {nodes.map((n: any) => (
                <tr key={n.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">{n.name}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={n.health_status} />
                  </td>
                  <td className="px-5 py-3">{n.request_rate} req/s</td>
                  <td className="px-5 py-3">{n.p95_latency_ms} ms</td>
                  <td className="px-5 py-3">{(n.error_rate * 100).toFixed(2)}%</td>
                  <td className="px-5 py-3">
                    <Link href={`/services/${n.id}`} className="text-indigo-600 hover:underline">
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
