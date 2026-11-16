# API Contract - AIOps Sentinel REST API v1

Base URL: `/api/v1`

## Response Envelope
Every response adheres to the standardized envelope:
```json
{
  "data": { ... },
  "meta": {
    "request_id": "req_123456789abc",
    "page": 1,
    "page_size": 20,
    "total": 100
  },
  "error": null
}
```

Error responses:
```json
{
  "data": null,
  "meta": { "request_id": "req_123456789abc" },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable summary",
    "details": []
  }
}
```

## Route Map Summary
- `GET /health/live`: Liveness check
- `GET /health/ready`: Readiness check (database + telemetry backends)
- `GET /meta`: Version and supported capabilities
- `POST /auth/login`: Authenticate and obtain session cookie / JWT
- `POST /auth/logout`: Revoke session
- `GET /auth/me`: Current user profile
- `GET /overview/summary`: System health and active incidents
- `GET /services`: Search/filter/paginate services
- `GET /services/{id}`: Service detail
- `GET /services/{id}/metrics`: Time series metrics
- `GET /services/{id}/logs`: Log entries
- `GET /services/{id}/traces`: Distributed traces
- `GET /topology`: Nodes and directed edges
- `GET /incidents`: Incidents list
- `POST /incidents`: Create incident
- `GET /incidents/{id}`: Incident detail, timeline, and evidence
- `PATCH /incidents/{id}`: State transitions (`open`, `acknowledged`, `investigating`, `resolved`, `closed`)
- `POST /incidents/{id}/notes`: Add analyst finding
- `POST /incidents/{id}/investigations`: Trigger RCA background job (202 Accepted)
- `GET /investigations/{id}`: Investigation job status and candidates
- `GET /deployments`: Deployment history
- `GET /experiments`: ML benchmark runs
- `GET /datasets`: Registered datasets
- `POST /datasets`: Register dataset with license validation
- `GET /alert-rules`: List alert policies
- `POST /alert-rules`: Create alert policy
- `PATCH /alert-rules/{id}`: Update / toggle enabled
- `DELETE /alert-rules/{id}`: Delete rule
- `GET /settings/sources`: Masked data source statuses
- `GET /profile` & `PATCH /profile`: Operator profile & timezone preferences
