#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://127.0.0.1:8000/api/v1"

echo "=== Running AIOps Sentinel Smoke Tests ==="

echo -n "Checking API Liveness... "
curl -sf "${BASE_URL}/health/live" > /dev/null
echo "OK"

echo -n "Checking API Readiness... "
curl -sf "${BASE_URL}/health/ready" > /dev/null
echo "OK"

echo -n "Checking Platform Metadata... "
curl -sf "${BASE_URL}/meta" > /dev/null
echo "OK"

echo -n "Verifying Authentication & Session... "
TOKEN=$(curl -sf -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiops.sentinel","password":"sentinel-admin-1234"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")

if [ -n "$TOKEN" ]; then
  echo "OK (Token acquired)"
else
  echo "FAILED"
  exit 1
fi

echo -n "Checking Authenticated /services... "
curl -sf -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/services" > /dev/null
echo "OK"

echo -n "Checking Authenticated /incidents... "
curl -sf -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/incidents" > /dev/null
echo "OK"

echo -n "Checking Authenticated /topology... "
curl -sf -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/topology" > /dev/null
echo "OK"

echo "=== All Smoke Tests Passed Successfully ==="
