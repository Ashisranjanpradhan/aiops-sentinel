"use client";

import React, { useState, useEffect } from "react";
import { Server, ArrowRight, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  status: "healthy" | "warning" | "degraded";
  language: string;
  p95: string;
}

interface Edge {
  source: string;
  target: string;
  callRate: string;
}

const INITIAL_NODES: Node[] = [
  { id: "frontend", name: "frontend", x: 120, y: 140, status: "healthy", language: "Go", p95: "45ms" },
  { id: "checkout", name: "checkout", x: 320, y: 140, status: "healthy", language: "Go", p95: "95ms" },
  { id: "payment", name: "payment", x: 520, y: 70, status: "healthy", language: "Node.js", p95: "65ms" },
  { id: "shipping", name: "shipping", x: 520, y: 210, status: "healthy", language: "Java", p95: "55ms" },
  { id: "recommendation", name: "recommendation", x: 320, y: 270, status: "healthy", language: "Python", p95: "38ms" },
];

const EDGES: Edge[] = [
  { source: "frontend", target: "checkout", callRate: "18.5k rps" },
  { source: "frontend", target: "recommendation", callRate: "14.2k rps" },
  { source: "checkout", target: "payment", callRate: "14.5k rps" },
  { source: "checkout", target: "shipping", callRate: "9.0k rps" },
];

export default function AnimatedTopologyGraph() {
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [selectedNode, setSelectedNode] = useState<Node | null>(INITIAL_NODES[0]);
  const [simulatedFailure, setSimulatedFailure] = useState(false);

  useEffect(() => {
    if (simulatedFailure) {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === "payment") return { ...n, status: "degraded", p95: "850ms" };
          if (n.id === "checkout") return { ...n, status: "warning", p95: "280ms" };
          return { ...n, status: "healthy" };
        })
      );
    } else {
      setNodes(INITIAL_NODES);
    }
  }, [simulatedFailure]);

  const getNodeColor = (status: string) => {
    switch (status) {
      case "degraded":
        return {
          bg: "fill-rose-500/20 stroke-rose-500",
          text: "text-rose-600 dark:text-rose-400",
          badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        };
      case "warning":
        return {
          bg: "fill-amber-500/20 stroke-amber-500",
          text: "text-amber-600 dark:text-amber-400",
          badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        };
      default:
        return {
          bg: "fill-emerald-500/20 stroke-emerald-500",
          text: "text-emerald-600 dark:text-emerald-400",
          badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        };
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-500" />
            <span>Interactive Microservice Dependency Topology</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Directional call edges with telemetry health propagation. Click any node to inspect metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSimulatedFailure(!simulatedFailure)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              simulatedFailure
                ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200"
            }`}
          >
            {simulatedFailure ? "Reset Topology State" : "Simulate Payment Latency Spike"}
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-[320px] bg-slate-50/60 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80 overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 640 320">
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.4" />
            </linearGradient>
            <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
            </marker>
          </defs>

          {/* Render Connections */}
          {EDGES.map((edge) => {
            const src = nodes.find((n) => n.id === edge.source);
            const tgt = nodes.find((n) => n.id === edge.target);
            if (!src || !tgt) return null;

            return (
              <g key={`${edge.source}-${edge.target}`}>
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="#cbd5e1"
                  className="dark:stroke-slate-700"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="url(#edgeGrad)"
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                />
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const colors = getNodeColor(node.status);
            const isSelected = selectedNode?.id === node.id;

            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer transition-transform duration-150 hover:scale-105"
                transform={`translate(${node.x}, ${node.y})`}
              >
                {/* Outer ring */}
                <circle
                  r={isSelected ? "28" : "24"}
                  className={`${colors.bg} stroke-2 transition-all`}
                />
                <circle
                  r={isSelected ? "14" : "10"}
                  className="fill-white dark:fill-slate-900 stroke-1 stroke-slate-300 dark:stroke-slate-700"
                />
                {/* Node Label */}
                <text
                  y="42"
                  textAnchor="middle"
                  className="text-[11px] font-semibold fill-slate-800 dark:fill-slate-200 select-none font-sans"
                >
                  {node.name}
                </text>
                <text
                  y="55"
                  textAnchor="middle"
                  className="text-[9px] fill-slate-500 dark:fill-slate-400 select-none font-mono"
                >
                  {node.p95}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-lg p-3 border border-slate-200 dark:border-slate-800 shadow-md text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white capitalize">
                {selectedNode.name} Service
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${getNodeColor(selectedNode.status).badge}`}>
                {selectedNode.status}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
              <div>Runtime: <span className="font-mono text-slate-900 dark:text-slate-200">{selectedNode.language}</span></div>
              <div>Latency (p95): <span className="font-mono text-slate-900 dark:text-slate-200">{selectedNode.p95}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Healthy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Warning
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Degraded / RCA Root
          </span>
        </div>
        <span className="font-mono text-[10px]">OpenTelemetry Trace Derived</span>
      </div>
    </div>
  );
}
