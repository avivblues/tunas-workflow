#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

VPS_HOST="${VPS_HOST:-103.94.238.207}"
VPS_USER="${VPS_USER:-ispkita}"
SSH_KEY="${SSH_KEY:-/tmp/ispkita_key}"
REMOTE_DIR="${REMOTE_DIR:-/home/ispkita/tunas-workflow}"

echo "==> Deploying Tunas Workflow to ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}"
echo "==> Source: ${ROOT_DIR}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found at $SSH_KEY"
  echo "Convert: puttygen ispkita.ppk.pem -O private-openssh -o /tmp/ispkita_key"
  exit 1
fi

if [[ ! -f "${ROOT_DIR}/infra/docker-compose.prod.yml" ]]; then
  echo "ERROR: infra/docker-compose.prod.yml not found. Run deploy from monorepo root."
  exit 1
fi

echo "==> Syncing files..."
rsync -avz --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .git \
  --exclude '*.ppk*' \
  --exclude .env \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "${ROOT_DIR}/" "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

echo "==> Building and starting containers on VPS..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}

if [[ ! -f infra/.env ]]; then
  JWT_SECRET=\$(openssl rand -hex 32)
  PG_PASS=\$(openssl rand -hex 16)
  MINIO_PASS=\$(openssl rand -hex 16)
  cat > infra/.env <<ENV
POSTGRES_USER=tunas
POSTGRES_PASSWORD=\${PG_PASS}
POSTGRES_DB=tunas_workflow
JWT_SECRET=\${JWT_SECRET}
CORS_ORIGIN=http://${VPS_HOST}:3050
WEB_PORT=3050
MINIO_ACCESS_KEY=tunas
MINIO_SECRET_KEY=\${MINIO_PASS}
MINIO_BUCKET=tunas-attachments
ENV
  echo "Created infra/.env with generated secrets"
fi

if [[ -f infra/.env ]] && ! grep -q '^MINIO_ACCESS_KEY=' infra/.env; then
  MINIO_PASS=\$(openssl rand -hex 16)
  cat >> infra/.env <<ENV
MINIO_ACCESS_KEY=tunas
MINIO_SECRET_KEY=\${MINIO_PASS}
MINIO_BUCKET=tunas-attachments
ENV
  echo "Added MinIO credentials to infra/.env"
fi

if [[ -f infra/.env ]] && ! grep -q '^MQTT_ENABLED=' infra/.env; then
  cat >> infra/.env <<ENV
MQTT_ENABLED=true
MQTT_BROKER_URL=mqtt://103.94.238.207:1883
MQTT_TOPIC_PATTERNS=tunas/+/+/+/telemetry,tunas/+/+/telemetry,tunas/+/iot/alert,tunas/+/+/+/iot/alert
ENV
  echo "Added MQTT bridge settings to infra/.env"
fi

cd infra
sudo docker compose -f docker-compose.prod.yml down 2>/dev/null || true
sudo docker compose -f docker-compose.prod.yml build
sudo docker compose -f docker-compose.prod.yml up -d

echo "==> Waiting for services..."
sleep 15
sudo docker compose -f docker-compose.prod.yml ps
curl -sf http://localhost:3050/api/health && echo " API OK" || echo " API not ready yet"
REMOTE

echo ""
echo "Deploy complete!"
echo "  Web: http://${VPS_HOST}:3050"
echo "  API: http://${VPS_HOST}:3050/api/health"
echo "  Login: tenant 01 / admin / admin123"
