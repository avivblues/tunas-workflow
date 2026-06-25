# API Conventions

All APIs follow REST patterns with a consistent response envelope.

## Response Format

### Success

```json
{
  "success": true,
  "data": {},
  "message": ""
}
```

### Error

```json
{
  "success": false,
  "errorCode": "",
  "message": ""
}
```

## Resource Pattern

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/{resource}` | List |
| POST | `/api/{resource}` | Create |
| PATCH | `/api/{resource}/{id}` | Update |
| PUT | `/api/{resource}` | Upsert / replace config |
| DELETE | `/api/{resource}` | Remove |

## Auth

```
POST /api/auth/login     { tenantCode, username, password }
GET  /api/auth/me        Authorization: Bearer <token>
```

## Transaction API

All work items are transactions. Use `app_code` to distinguish applications.

```
POST   /api/transaction
GET    /api/transaction
GET    /api/transaction/:id
PATCH  /api/transaction/:id/action
POST   /api/transaction/:id/log
```

```json
{
  "app_code": "IT_SUPPORT",
  "data": {}
}
```

## Dashboard API

Dashboards are application-specific but use the same transaction data source.

```
GET /api/dashboard/:appCode
```

Response includes:

- `summary` — open/closed, SLA breach, MTTR
- `technicianKpi` — completed count & avg resolution per teknisi
- `appMetrics` — metrik khusus per `app_code` (IT top problems, ISP area, Engineering PM compliance, dll.)

## Report API

```
GET /api/report/:appCode?type=complaint|sla|asset_usage&period=month|year&year=&month=
```

| type | Output |
|------|--------|
| `aging` | Open items + aging buckets (0–3d, 4–7d, …) |
| `sla` | SLA breach / at-risk summary |
| `technician` | KPI per teknisi (completed, avg/fastest/slowest hours) |
| `sparepart` | Sparepart usage dari work log metadata |

## Menu API

```
GET    /api/menu?platform=web|mobile
POST   /api/menu
PATCH  /api/menu/:id
DELETE /api/menu/:id
POST   /api/menu/reorder
POST   /api/menu/reset-defaults
```

## AI API

```
GET    /api/ai/status
POST   /api/ai/chat
POST   /api/ai/report
GET    /api/ai/llm-config
PUT    /api/ai/llm-config
DELETE /api/ai/llm-config
POST   /api/ai/llm-config/test
```

## Apps API

```
GET /api/apps
```

Returns available apps for the current tenant.

## Asset & PM

```
GET/POST/PATCH  /api/asset
GET/POST/PATCH  /api/pm-schedule
GET             /api/pm-schedule/calendar
GET             /api/pm-schedule/compliance
```

## Connector & Integration

```
GET  /api/connector/marketplace
GET  /api/connector
POST /api/connector
POST /api/connector/:id/test
POST /api/integration/isp/{tenantCode}/webhook          # ISP push: create ticket
GET  /api/integration/isp/{tenantCode}/tickets        # ISP pull: list
GET  /api/integration/isp/{tenantCode}/tickets/{trxNo}
PATCH /api/integration/isp/{tenantCode}/tickets/{trxNo}  # ISP push: update process
POST /api/integration/isp/{tenantCode}/tickets/{trxNo}/logs
GET  /api/integration/isp/{tenantCode}/report
GET  /api/integration/isp/{tenantCode}/processes
POST /api/integration/iot/{tenantCode}/work-order
```

ISP Partner API auth: header `X-Api-Key` atau `X-Webhook-Secret` (dari connector ISP).

## Rules

- Do **not** create `/api/it-ticket`, `/api/ga-request`, etc.
- Always pass `app_code` for application context
- Never hardcode routing — read from `app_routing` configuration
- Every transactional query MUST filter by `tenant_id` from JWT
