# Infrastructure

Local development infrastructure for Tunas Workflow.

## Services

| Service   | Port(s)      | Purpose                          |
|-----------|--------------|----------------------------------|
| PostgreSQL| 5436         | Primary database (Prisma) — port 5436 avoids conflict with local Postgres on 5432 |
| Redis     | 6379         | Cache                            |
| RabbitMQ  | 5672, 15672  | Message queue (+ management UI)  |
| MinIO     | 9000, 9001   | Object storage for attachments   |

## Usage

From the repository root:

```bash
# Start all services
npm run infra:up

# Stop all services
npm run infra:down
```

Or directly:

```bash
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml down
```

## Credentials

Default credentials match `.env.example` at the repository root.

**Change these in production.**

## RabbitMQ Management UI

http://localhost:15672 — user `tunas`, password `tunas_secret`

## MinIO Console

http://localhost:9001 — user `tunas`, password `tunas_secret`
