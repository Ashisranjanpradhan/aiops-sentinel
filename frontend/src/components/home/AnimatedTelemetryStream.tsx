"use client";

import React, { useState } from "react";
import { Activity, AlertTriangle, TrendingUp, Zap } from "lucide-react";

type MetricTab = "latency" | "throughput" | "errors";

export default function AnimatedTelemetryStream() {
  const [tab, setTab] = useState<MetricTab>("latency");

  // Synthetic sample time series coordinates (15 data points over 5 minutes)
  const latencyPoints = [
    { time: "18:25", val: 42 },
    { time: "18:26", val: 45 },
    { time: "18:27", val: 44 },
    { time: "18:28", val: 48 },
    { time: "18:29", val: 46 },
    { time: "18:30", val: 180 },
    { time: "18:31", val: 620 },
    { time: "18:32", val: 850 },
    { time: "18:33", val: 790 },
    { time: "18:34", val: 320 },
    { time: "18:35", val: 95 },
    { time: "18:36", val: 48 },
    { time: "18:37", val: 43 },
    { time: "18:38", val: 44 },
    { time: "18:39", val: 41 },
  ];

  const throughputPoints = [
    { time: "18:25", val: 240 },
    { time: "18:26", val: 245 },
    { time: "18:27", val: 255 },
    { time: "18:28", val: 250 },
    { time: "18:29", val: 260 },
    { time: "18:30", val: 230 },
    { time: "18:31", val: 190 },
    { time: "18:32", val: 140 },
    { time: "18:33", val: 160 },
    { time: "18:34", val: 210 },
    { time: "18:35", val: 235 },
    { time: "18:36", val: 245 },
    { time: "18:37", val: 250 },
    { time: "18:38", val: 248 },
    { time: "18:39", val: 252 },
  ];

  const errorPoints = [
    { time: "18:25", val: 0.1 },
    { time: "18:26", val: 0.1 },
    { time: "18:27", val: 0.2 },
    { time: "18:28", val: 0.1 },
    { time: "18:29", val: 0.1 },
    { time: "18:30", val: 1.8 },
    { time: "18:31", val: 8.4 },
    { time: "18:32", val: 15.2 },
    { time: "18:33", val: 12.1 },
    { time: "18:34", val: 4.5 },
    { time: "18:35", val: 1.2 },
    { time: "18:36", val: 0.3 },
    { time: "18:37", val: 0.1 },
    { time: "18:38", val: 0.1 },
    { time: "18:39", val: 0.1 },
  ];

  const activeData =
    tab === "latency" ? latencyPoints : tab === "throughput" ? throughputPoints : errorPoints;
  const maxVal = Math.max(...activeData.map((d) => d.val)) * 1.15;
  const unit = tab === "latency" ? "ms" : tab === "throughput" ? "req/s" : "%";
  const strokeColor = tab === "latency" ? "#f43f5e" : tab === "throughput" ? "#6366f1" : "#e11d48";

  // Build SVG path
  const width = 600;
  const height = 180;
  const padX = 40;
  const padY = 20;

  const points = activeData.map((d, i) => {
    const x = padX + (i / (activeData.length - 1)) * (width - padX * 2);
    const y = height - padY - (d.val / maxVal) * (height - padY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ""
  );

  const fillD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${
    height - padY
  } Z`;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Multivariate Telemetry Ingestion Stream
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Synchronized Prometheus metrics, Loki log traces, and Tempo span timings.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("latency")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              tab === "latency"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            p95 Latency
          </button>
          <button
            type="button"
            onClick={() => setTab("throughput")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              tab === "throughput"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Throughput
          </button>
          <button
            type="button"
            onClick={() => setTab("errors")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              tab === "errors"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            5xx Error Rate
          </button>
        </div>
      </div>

      {/* Mandatory Accuracy Disclaimer Banner */}
      <div className="mb-3 px-3 py-1.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <strong>Demonstration Data:</strong> Illustrative time-series telemetry curve — not live production metrics.
        </span>
        <span className="font-mono text-[10px] hidden sm:inline">MAD Z-Score = 4.8</span>
      </div>

      {/* SVG Time Series Curve */}
      <div className="w-full h-[200px] bg-slate-50/50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800/80 p-2 relative overflow-hidden">
        <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="curveFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padX}
            y1={padY}
            x2={width - padX}
            y2={padY}
            stroke="#e2e8f0"
            className="dark:stroke-slate-800"
            strokeDasharray="3 3"
          />
          <line
            x1={padX}
            y1={height / 2}
            x2={width - padX}
            y2={height / 2}
            stroke="#e2e8f0"
            className="dark:stroke-slate-800"
            strokeDasharray="3 3"
          />
          <line
            x1={padX}
            y1={height - padY}
            x2={width - padX}
            y2={height - padY}
            stroke="#cbd5e1"
            className="dark:stroke-slate-700"
          />

          {/* Area fill */}
          <path d={fillD} fill="url(#curveFill)" />

          {/* Trend line */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Markers */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.val > 200 || p.val > 5 ? 4 : 2.5}
              fill={strokeColor}
              className="transition-all hover:r-5"
            >
              <title>{`${p.time} — ${p.val} ${unit}`}</title>
            </circle>
          ))}

          {/* X axis labels */}
          <text
            x={points[0].x}
            y={height - 4}
            className="text-[9px] fill-slate-400 font-mono"
            textAnchor="start"
          >
            {points[0].time}
          </text>
          <text
            x={points[Math.floor(points.length / 2)].x}
            y={height - 4}
            className="text-[9px] fill-slate-400 font-mono"
            textAnchor="middle"
          >
            {points[Math.floor(points.length / 2)].time}
          </text>
          <text
            x={points[points.length - 1].x}
            y={height - 4}
            className="text-[9px] fill-slate-400 font-mono"
            textAnchor="end"
          >
            {points[points.length - 1].time}
          </text>
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="font-mono">Window: 15-minute sliding / 30s bucket</span>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Peak Value: <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{Math.max(...activeData.map((d) => d.val))} {unit}</span>
        </span>
      </div>
    </div>
  );
}
