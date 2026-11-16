// High-fidelity fallback data for standalone static deployment (e.g. GitHub Pages)

export const DEMO_SERVICES = [
  {
    id: "srv_frontend",
    name: "frontend",
    environment: "production",
    namespace: "demo",
    health_status: "healthy",
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    metadata_json: {},
    active_incidents_count: 0,
    request_rate: 240.5,
    error_rate: 0.002,
    p95_latency_ms: 38.0,
  },
  {
    id: "srv_checkout",
    name: "checkout",
    environment: "production",
    namespace: "demo",
    health_status: "critical",
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    metadata_json: {},
    active_incidents_count: 1,
    request_rate: 185.0,
    error_rate: 0.125,
    p95_latency_ms: 450.0,
  },
  {
    id: "srv_payment",
    name: "payment",
    environment: "production",
    namespace: "demo",
    health_status: "critical",
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    metadata_json: {},
    active_incidents_count: 1,
    request_rate: 145.0,
    error_rate: 0.182,
    p95_latency_ms: 620.0,
  },
  {
    id: "srv_shipping",
    name: "shipping",
    environment: "production",
    namespace: "demo",
    health_status: "warning",
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    metadata_json: {},
    active_incidents_count: 0,
    request_rate: 90.0,
    error_rate: 0.04,
    p95_latency_ms: 180.0,
  },
  {
    id: "srv_auth",
    name: "auth",
    environment: "production",
    namespace: "demo",
    health_status: "healthy",
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    metadata_json: {},
    active_incidents_count: 0,
    request_rate: 110.0,
    error_rate: 0.001,
    p95_latency_ms: 24.0,
  },
  {
    id: "srv_cart",
    name: "cart",
    environment: "production",
    namespace: "demo",
    health_status: "healthy",
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    metadata_json: {},
    active_incidents_count: 0,
    request_rate: 130.0,
    error_rate: 0.003,
    p95_latency_ms: 31.0,
  },
];

export const DEMO_INCIDENTS = [
  {
    id: "inc_d9b401",
    title: "Payment processing timeout causing cascading checkout failures",
    description: "Elevated error rates and latency spike in checkout service following downstream payment timeouts.",
    severity: "critical",
    status: "open",
    primary_service_id: "srv_checkout",
    primary_service_name: "checkout",
    detected_at: new Date(Date.now() - 45 * 60000).toISOString(),
    last_seen_at: new Date().toISOString(),
    resolved_at: null,
    detector_name: "robust_zscore",
    detector_version: "1.0.0",
    confidence: 0.88,
    assigned_to_user_id: "u_admin",
    assigned_user_name: "Lead SRE Engineer",
    source: "demo",
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    updated_at: new Date().toISOString(),
    evidence: [
      {
        id: "ev_1",
        evidence_type: "metric",
        service_id: "srv_checkout",
        service_name: "checkout",
        source_reference: "prometheus:rate(http_requests_total{status=~'5..'}[5m])",
        time_start: new Date(Date.now() - 45 * 60000).toISOString(),
        time_end: new Date().toISOString(),
        summary_json: { metric_name: "error_rate", observed_value: 0.125, z_score: 4.8 },
        created_at: new Date().toISOString(),
      },
      {
        id: "ev_2",
        evidence_type: "log",
        service_id: "srv_payment",
        service_name: "payment",
        source_reference: "loki:{service='payment'} |= 'timeout'",
        time_start: new Date(Date.now() - 40 * 60000).toISOString(),
        time_end: new Date().toISOString(),
        summary_json: { severity: "CRITICAL", message: "Downstream connection timed out to postgres-primary:5432 after 5000ms" },
        created_at: new Date().toISOString(),
      },
      {
        id: "ev_3",
        evidence_type: "trace",
        service_id: "srv_payment",
        service_name: "payment",
        source_reference: "tempo:trace_d9b40001",
        time_start: new Date(Date.now() - 35 * 60000).toISOString(),
        time_end: new Date().toISOString(),
        summary_json: { trace_id: "trace_d9b40001", status: "ERROR", duration_ms: 680.0, failing_span: "payment:charge" },
        created_at: new Date().toISOString(),
      },
    ],
    events: [
      {
        id: "evnt_1",
        event_type: "created",
        actor_name: "System",
        reason: "Anomaly threshold breached in checkout error rate",
        created_at: new Date(Date.now() - 45 * 60000).toISOString(),
      },
    ],
    latest_investigation: {
      id: "job_01",
      incident_id: "inc_d9b401",
      status: "succeeded",
      progress: 100,
      model_version: "rca-baseline-v1",
      candidates: [
        {
          id: "cand_1",
          service_id: "srv_payment",
          service_name: "payment",
          rank: 1,
          score: 0.94,
          calibrated_confidence: 0.92,
          candidate_indicator: "trace_error_or_timeout",
          explanation: "Candidate ranked #1 because of strong multi-source indicators: Severe log messages recorded, DB timeout. Correlated with topology calls from checkout.",
          evidence_ids: ["ev_2", "ev_3"],
        },
        {
          id: "cand_2",
          service_id: "srv_checkout",
          service_name: "checkout",
          rank: 2,
          score: 0.68,
          calibrated_confidence: 0.62,
          candidate_indicator: "error_rate",
          explanation: "Candidate ranked #2 due to elevated error rates caused by downstream backpressure.",
          evidence_ids: ["ev_1"],
        },
      ],
    },
  },
];

export function getDemoFallback(endpoint: string, options: RequestInit = {}): any {
  if (endpoint.startsWith("/auth/login")) {
    return {
      data: {
        access_token: "demo_standalone_token",
        user: {
          id: "u_admin",
          email: "admin@aiops.sentinel",
          display_name: "Lead SRE Engineer",
          role: "admin",
          is_active: true,
          created_at: new Date().toISOString(),
        },
      },
      meta: { request_id: "req_demo" },
      error: null,
    };
  }

  if (endpoint.startsWith("/auth/login") || endpoint.startsWith("/auth/register")) {
    let email = "admin@aiops.sentinel";
    let displayName = "Lead SRE Engineer";
    try {
      if (options.body) {
        const parsed = JSON.parse(options.body as string);
        if (parsed.email) email = parsed.email;
        if (parsed.display_name) displayName = parsed.display_name;
      }
    } catch {
      // ignore
    }
    return {
      data: {
        access_token: "demo-jwt-token-sentinel-fallback",
        token_type: "bearer",
        user: {
          id: "u_demo_" + Math.random().toString(36).substring(2, 9),
          email,
          display_name: displayName,
          role: "analyst",
          is_active: true,
          created_at: new Date().toISOString(),
        },
      },
      meta: { request_id: "req_demo" },
      error: null,
    };
  }

  if (endpoint.startsWith("/auth/me")) {
    return {
      data: {
        id: "u_admin",
        email: "admin@aiops.sentinel",
        display_name: "Lead SRE Engineer",
        role: "admin",
        is_active: true,
        created_at: new Date().toISOString(),
      },
      meta: { request_id: "req_demo" },
      error: null,
    };
  }

  if (endpoint.startsWith("/health/ready")) {
    return {
      data: {
        status: "ready",
        database: { ok: true, message: "Demo mode active" },
        telemetry_backends: { Prometheus: "healthy", Loki: "healthy", Tempo: "healthy" },
      },
      meta: { request_id: "req_demo" },
      error: null,
    };
  }

  if (endpoint.startsWith("/meta")) {
    return {
      data: {
        app_name: "AIOps Sentinel",
        app_env: "demo-static",
        api_version: "v1.0.0",
        demo_mode: true,
        supported_features: ["anomaly_detection", "rca_localization", "service_topology"],
      },
      meta: { request_id: "req_demo" },
      error: null,
    };
  }

  if (endpoint.startsWith("/overview/summary")) {
    return {
      data: {
        total_services: 10,
        healthy_services: 7,
        warning_services: 1,
        critical_services: 2,
        active_incidents_count: 1,
        critical_incidents_count: 1,
        high_incidents_count: 0,
        medium_incidents_count: 0,
        recent_incidents: DEMO_INCIDENTS,
        service_health_summary: DEMO_SERVICES,
        telemetry_sources: [
          { name: "Prometheus", type: "metrics", status: "healthy", latency_ms: 3.8, message: "Scraping active" },
          { name: "Loki", type: "logs", status: "healthy", latency_ms: 4.2, message: "Log distributor ready" },
          { name: "Tempo", type: "traces", status: "healthy", latency_ms: 5.1, message: "Trace engine ready" },
        ],
        anomaly_trend: [
          { time: "00:00", anomalies: 0, incidents: 0 },
          { time: "04:00", anomalies: 1, incidents: 0 },
          { time: "08:00", anomalies: 0, incidents: 0 },
          { time: "12:00", anomalies: 2, incidents: 1 },
          { time: "16:00", anomalies: 3, incidents: 1 },
          { time: "20:00", anomalies: 1, incidents: 0 },
        ],
        last_ingestion_time: new Date().toISOString(),
        is_demo_mode: true,
      },
      meta: { request_id: "req_demo" },
      error: null,
    };
  }

  if (endpoint.startsWith("/services/")) {
    const srv = DEMO_SERVICES[1]; // checkout
    if (endpoint.includes("/metrics")) {
      const now = Date.now();
      const points = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(now - (30 - i) * 60000).toISOString(),
        value: 120 + Math.sin(i) * 20 + (i > 22 ? 80 : 0),
      }));
      return {
        data: {
          service_id: srv.id,
          service_name: srv.name,
          metrics: {
            request_rate: { points },
            error_rate: { points: points.map((p) => ({ ...p, value: p.value > 150 ? 0.12 : 0.005 })) },
            p95_latency: { points: points.map((p) => ({ ...p, value: p.value * 2.5 })) },
          },
        },
        meta: { request_id: "req_demo" },
        error: null,
      };
    }
    if (endpoint.includes("/logs")) {
      return {
        data: {
          service_id: srv.id,
          logs: [
            { id: "log_1", timestamp: new Date().toISOString(), severity: "ERROR", message: "Downstream payment gateway connection timeout" },
            { id: "log_2", timestamp: new Date().toISOString(), severity: "WARN", message: "Thread pool utilization reached 88%" },
            { id: "log_3", timestamp: new Date().toISOString(), severity: "INFO", message: "HTTP 200 GET /checkout processed in 45ms" },
          ],
        },
        meta: { request_id: "req_demo" },
        error: null,
      };
    }
    if (endpoint.includes("/traces")) {
      return {
        data: {
          service_id: srv.id,
          traces: [
            { trace_id: "trace_d9b40001", root_operation: "/api/v1/checkout", duration_ms: 680.0, status: "ERROR", start_time: new Date().toISOString() },
            { trace_id: "trace_d9b40002", root_operation: "/api/v1/checkout", duration_ms: 45.0, status: "OK", start_time: new Date().toISOString() },
          ],
        },
        meta: { request_id: "req_demo" },
        error: null,
      };
    }
    return { data: srv, meta: { request_id: "req_demo" }, error: null };
  }

  if (endpoint.startsWith("/services")) {
    return { data: DEMO_SERVICES, meta: { total: DEMO_SERVICES.length }, error: null };
  }

  if (endpoint.startsWith("/incidents/")) {
    return { data: DEMO_INCIDENTS[0], meta: { request_id: "req_demo" }, error: null };
  }

  if (endpoint.startsWith("/incidents")) {
    return { data: DEMO_INCIDENTS, meta: { total: DEMO_INCIDENTS.length }, error: null };
  }

  if (endpoint.startsWith("/topology")) {
    return {
      data: {
        nodes: DEMO_SERVICES.map((s) => ({
          id: s.id,
          name: s.name,
          environment: s.environment,
          health_status: s.health_status,
          request_rate: s.request_rate,
          error_rate: s.error_rate,
          p95_latency_ms: s.p95_latency_ms,
          active_incidents: s.active_incidents_count,
        })),
        edges: [
          { id: "e1", source: "frontend", target: "checkout", relationship: "calls", call_volume: 18500, error_rate: 0.08, latency_ms: 120.0 },
          { id: "e2", source: "checkout", target: "payment", relationship: "calls", call_volume: 14500, error_rate: 0.18, latency_ms: 550.0 },
          { id: "e3", source: "checkout", target: "shipping", relationship: "calls", call_volume: 9000, error_rate: 0.04, latency_ms: 180.0 },
          { id: "e4", source: "frontend", target: "cart", relationship: "calls", call_volume: 16000, error_rate: 0.002, latency_ms: 30.0 },
          { id: "e5", source: "cart", target: "auth", relationship: "calls", call_volume: 9500, error_rate: 0.001, latency_ms: 22.0 },
        ],
      },
      meta: { request_id: "req_demo" },
      error: null,
    };
  }

  if (endpoint.startsWith("/deployments")) {
    return {
      data: [
        {
          id: "dep_1",
          deployment_id: "deploy-v2.1.4",
          service_id: "srv_payment",
          service_name: "payment",
          environment: "production",
          status: "success",
          commit_id: "git-8a12c3f",
          started_at: new Date(Date.now() - 60 * 60000).toISOString(),
          details_json: {},
          correlated_incidents_count: 1,
        },
      ],
      meta: { total: 1 },
      error: null,
    };
  }

  if (endpoint.startsWith("/experiments")) {
    return {
      data: [
        {
          id: "exp_1",
          experiment_name: "Robust-ZScore-RCAEval-RE1",
          model_name: "robust_zscore",
          model_version: "1.0.0",
          seed: 42,
          status: "completed",
          metrics_json: { top_1_accuracy: 0.612, top_3_accuracy: 0.785, mrr: 0.694, f1: 0.762 },
          artifact_uri: "artifacts/runs/robust_zscore_seed42.tar.gz",
        },
      ],
      meta: { total: 1 },
      error: null,
    };
  }

  if (endpoint.startsWith("/datasets")) {
    return {
      data: [
        {
          id: "ds_1",
          name: "RCAEval",
          version: "1.0.0",
          source_url: "https://github.com/phamquiluan/RCAEval",
          license_note: "Research benchmark dataset. Attribution required.",
          modalities_json: ["metrics", "logs", "traces"],
          status: "ready",
          manifest_path: "manifests/rcaeval_manifest.json",
        },
      ],
      meta: { total: 1 },
      error: null,
    };
  }

  if (endpoint.startsWith("/alert-rules")) {
    return {
      data: [
        {
          id: "ar_1",
          name: "Checkout Service Error Rate High",
          description: "Triggers when HTTP 5xx error rate exceeds 5%",
          service_scope_json: ["checkout"],
          condition_json: { metric: "error_rate", operator: ">", threshold: 0.05 },
          severity: "critical",
          evaluation_interval_seconds: 60,
          is_enabled: true,
        },
      ],
      meta: { total: 1 },
      error: null,
    };
  }

  if (endpoint.startsWith("/profile")) {
    return {
      data: {
        id: "u_admin",
        email: "admin@aiops.sentinel",
        display_name: "Lead SRE Engineer",
        role: "admin",
        time_zone: "Asia/Kolkata",
        is_active: true,
        created_at: new Date().toISOString(),
      },
      meta: { request_id: "req_demo" },
      error: null,
    };
  }

  return { data: null, meta: { request_id: "req_demo" }, error: null };
}
