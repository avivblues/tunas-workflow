#!/usr/bin/env bash
# End-to-end smoke test for ISP Partner API
set -euo pipefail

BASE_URL="${BASE_URL:-http://103.94.238.207:3050/api/integration/isp/01}"
API_KEY="${API_KEY:-tunas-demo-webhook-secret-2024}"

auth_header() {
  echo "X-Api-Key: ${API_KEY}"
}

echo "==> ISP Partner API smoke test"
echo "    Base: ${BASE_URL}"

echo "==> 1. Process flow"
curl -sf "${BASE_URL}/processes" -H "$(auth_header)" | grep -q REQUEST && echo "    OK"

echo "==> 2. Create ticket (webhook)"
RESP=$(curl -sf -X POST "${BASE_URL}/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: ${API_KEY}" \
  -d "{\"event\":\"CUSTOMER_COMPLAINT\",\"customer_id\":\"CUST-SMOKE-$(date +%s)\",\"customer_name\":\"Smoke Test\",\"area\":\"01.ISP01\",\"description\":\"ISP Partner API smoke test\",\"priority\":\"MEDIUM\"}")
TRX=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['trx_no'])")
echo "    Created: ${TRX}"

echo "==> 3. Get detail"
curl -sf "${BASE_URL}/tickets/${TRX}" -H "$(auth_header)" | grep -q '"current_process":"REQUEST"' && echo "    OK (REQUEST)"

echo "==> 4. Advance -> ASSIGN"
curl -sf -X PATCH "${BASE_URL}/tickets/${TRX}" \
  -H "$(auth_header)" -H "Content-Type: application/json" \
  -d '{"action":"ADVANCE","to_process":"ASSIGN","operator":"smoke-test"}' | grep -q '"current_process":"ASSIGN"' && echo "    OK"

echo "==> 5. Add log"
curl -sf -X POST "${BASE_URL}/tickets/${TRX}/logs" \
  -H "$(auth_header)" -H "Content-Type: application/json" \
  -d '{"action":"NOTE","description":"Smoke test log","operator":"smoke-test"}' | grep -q '"logs"' && echo "    OK"

echo "==> 6. List tickets"
curl -sf "${BASE_URL}/tickets?limit=5" -H "$(auth_header)" | grep -q '"items"' && echo "    OK"

echo "==> 7. Report complaint (month)"
curl -sf "${BASE_URL}/report?type=complaint&period=month&app_code=ISP_TICKET" -H "$(auth_header)" | grep -q '"reportType"' && echo "    OK"

echo ""
echo "All checks passed. Ticket: ${TRX}"
