#!/usr/bin/env bash
# Full UAT smoke test — ISP Partner API (bundle apps + reports + Swagger)
set -euo pipefail

API_ROOT="${API_ROOT:-http://103.94.238.207:3050/api}"
BASE_URL="${BASE_URL:-${API_ROOT}/integration/isp/01}"
API_KEY="${API_KEY:-tunas-demo-webhook-secret-2024}"
TENANT="${TENANT:-01}"

auth_header() {
  echo "X-Api-Key: ${API_KEY}"
}

webhook_header() {
  echo "X-Webhook-Secret: ${API_KEY}"
}

pass() { echo "    OK — $1"; }
fail() { echo "    FAIL — $1"; exit 1; }

echo "=========================================="
echo " Tunas Workflow — ISP Partner API UAT"
echo " API_ROOT: ${API_ROOT}"
echo " TENANT:   ${TENANT}"
echo "=========================================="

echo ""
echo "==> 0. Health & Swagger"
curl -sf "${API_ROOT}/health" | grep -q '"success":true' && pass "health" || fail "health"
if curl -sf "${API_ROOT}/docs/json" 2>/dev/null | grep -q 'Integration API'; then
  pass "swagger openapi"
else
  echo "    SKIP — Swagger belum di-deploy (jalankan deploy terbaru, lalu cek ${API_ROOT}/docs)"
fi

echo ""
echo "==> 1. Process flows (all bundle apps)"
declare -A FIRST_PROCESS=(
  [ISP_TICKET]=REQUEST
  [ENG_PM]=SCHEDULED
  [GA_SUPPORT]=REQUEST
  [VEHICLE_BOOKING]=REQUEST
)
for APP in ISP_TICKET ENG_PM GA_SUPPORT VEHICLE_BOOKING; do
  FIRST="${FIRST_PROCESS[$APP]}"
  curl -sf "${BASE_URL}/processes?app_code=${APP}" -H "$(auth_header)" | grep -q "${FIRST}" && pass "processes ${APP}" || fail "processes ${APP}"
done

echo ""
echo "==> 2. Webhook — ISP_TICKET"
RESP=$(curl -sf -X POST "${BASE_URL}/webhook" \
  -H "Content-Type: application/json" \
  -H "$(webhook_header)" \
  -d "{\"app_code\":\"ISP_TICKET\",\"event\":\"CUSTOMER_COMPLAINT\",\"customer_id\":\"CUST-UAT-$(date +%s)\",\"customer_name\":\"UAT ISP\",\"area\":\"01.ISP01\",\"description\":\"UAT complaint test\",\"priority\":\"HIGH\"}")
TRX_ISP=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['trx_no'])")
pass "created ISP_TICKET ${TRX_ISP}"

echo ""
echo "==> 3. Webhook — ENG_PM"
curl -sf -X POST "${BASE_URL}/webhook" \
  -H "Content-Type: application/json" \
  -H "$(webhook_header)" \
  -d "{\"app_code\":\"ENG_PM\",\"title\":\"UAT PM\",\"description\":\"PM test dari ISP bundle\",\"domain_code\":\"01.L01.Z01\"}" \
  | grep -q '"trx_no"' && pass "ENG_PM webhook" || fail "ENG_PM webhook"

echo ""
echo "==> 4. Webhook — GA_SUPPORT"
curl -sf -X POST "${BASE_URL}/webhook" \
  -H "Content-Type: application/json" \
  -H "$(webhook_header)" \
  -d "{\"app_code\":\"GA_SUPPORT\",\"title\":\"UAT GA\",\"description\":\"Permintaan ATK test\"}" \
  | grep -q '"trx_no"' && pass "GA_SUPPORT webhook" || fail "GA webhook"

echo ""
echo "==> 5. Webhook — VEHICLE_BOOKING"
curl -sf -X POST "${BASE_URL}/webhook" \
  -H "Content-Type: application/json" \
  -H "$(webhook_header)" \
  -d "{\"app_code\":\"VEHICLE_BOOKING\",\"title\":\"UAT Booking\",\"description\":\"Test booking\",\"details\":{\"purpose\":\"UAT\",\"start_date\":\"2026-07-01\"}}" \
  | grep -q '"trx_no"' && pass "VEHICLE_BOOKING webhook" || fail "vehicle webhook"

echo ""
echo "==> 6. Get ticket detail"
curl -sf "${BASE_URL}/tickets/${TRX_ISP}" -H "$(auth_header)" | grep -q '"current_process":"REQUEST"' && pass "get detail" || fail "get detail"

echo ""
echo "==> 7. Advance ISP ticket -> ASSIGN"
curl -sf -X PATCH "${BASE_URL}/tickets/${TRX_ISP}" \
  -H "$(auth_header)" -H "Content-Type: application/json" \
  -d '{"action":"ADVANCE","to_process":"ASSIGN","operator":"uat-test"}' \
  | grep -q '"current_process":"ASSIGN"' && pass "patch advance" || fail "patch"

echo ""
echo "==> 8. Add log"
curl -sf -X POST "${BASE_URL}/tickets/${TRX_ISP}/logs" \
  -H "$(auth_header)" -H "Content-Type: application/json" \
  -d '{"action":"NOTE","description":"UAT field note","operator":"uat-tech"}' \
  | grep -q '"logs"' && pass "add log" || fail "log"

echo ""
echo "==> 9. List tickets (filter ISP)"
curl -sf "${BASE_URL}/tickets?app_code=ISP_TICKET&limit=5" -H "$(auth_header)" | grep -q '"items"' && pass "list" || fail "list"

echo ""
echo "==> 10. Reports"
YEAR=$(date +%Y)
MONTH=$(date +%-m 2>/dev/null || date +%m | sed 's/^0//')
curl -sf "${BASE_URL}/report?app_code=ISP_TICKET&type=complaint&period=month&year=${YEAR}&month=${MONTH}" -H "$(auth_header)" | grep -q '"reportType"' && pass "report complaint" || fail "complaint report"
curl -sf "${BASE_URL}/report?app_code=ISP_TICKET&type=sla&period=year&year=${YEAR}" -H "$(auth_header)" | grep -q '"reportType"' && pass "report sla" || fail "sla report"
curl -sf "${BASE_URL}/reports/bundle?app_code=ISP_TICKET&period=month&year=${YEAR}&month=${MONTH}" -H "$(auth_header)" | grep -q '"complaint"' && pass "report bundle" || fail "bundle"

echo ""
echo "==> 11. IoT MQTT reference (no auth)"
curl -sf "${API_ROOT}/integration/iot/${TENANT}/mqtt" | grep -q 'MQTT' && pass "iot mqtt doc" || fail "mqtt doc"

echo ""
echo "=========================================="
echo " ALL UAT CHECKS PASSED"
echo " Sample ticket: ${TRX_ISP}"
echo " Swagger UI: ${API_ROOT}/docs"
echo "=========================================="
