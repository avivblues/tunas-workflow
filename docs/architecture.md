# Architecture

Tunas Workflow adalah **configuration-driven transaction platform**. Berbagai aplikasi (IT Support, ISP, Engineering, GA, Building, Vehicle) berbagi **satu universal transaction engine**, dibedakan oleh `app_code`, `app_process`, dan `app_routing`.

> Setup lokal: [getting-started.md](./getting-started.md)  
> Ringkasan produk & status: [README.md](../README.md)

---

## Prinsip Inti

```
Different App (app_code)
        │
        ▼
Universal Transaction Engine
        │
        ├── App Configuration (process, routing, menu)
        ├── SLA · Notification · Attachment · Scheduler
        └── Integration Connectors (Odoo, IoT, ISP, AI, …)
        │
        ▼
Shared Database Tables (PostgreSQL)
```

### Yang TIDAK dibangun

- Engine terpisah per app (`ITTicketEngine`, `WorkflowEngine`, …)
- Tabel terpisah per app (`it_ticket`, `isp_ticket`, `ga_request`, …)
- Approval hardcoded (`if (role == "manager") approve()`)
- Endpoint per app (`/api/it-ticket`, `/api/ga-request`)

### Yang dibangun

| Layer | Tanggung jawab | Lokasi kode |
|-------|----------------|-------------|
| **API** | REST endpoints, auth JWT, validasi | `backend/src/api/routes/` |
| **Transaction Engine** | Create, list, detail, action, log | `backend/src/core/transaction/` |
| **Routing** | Baca `app_routing` untuk transisi proses | `backend/src/core/routing/` |
| **SLA** | Hitung status SLA & resolution time | `backend/src/core/sla/` |
| **Notification** | In-app notification | `backend/src/core/notification/` |
| **Attachment** | Upload file ke MinIO | `backend/src/core/attachment/` |
| **Scheduler** | PM schedule & compliance | `backend/src/core/scheduler/` |
| **Dashboard** | Agregasi KPI per `app_code` | `backend/src/core/dashboard/` |
| **Master Data** | Tenant, user, role, domain, asset, menu | `backend/src/master/` |
| **Integration** | Connector eksternal + AI | `backend/src/integration/` |

---

## Diagram Layer

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  Web (React 19 + Vite)     Mobile Shell (Expo)              │
│  Atomic Design             Dynamic menu dari /api/menu        │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / REST
┌──────────────────────────▼──────────────────────────────────┐
│                     API LAYER (Fastify)                       │
│  /api/transaction   /api/dashboard/:app_code                  │
│  /api/menu          /api/asset        /api/connector          │
│  /api/ai/*          /api/auth         /api/notification       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     CORE LAYER                                │
│  transaction · routing · sla · notification                 │
│  attachment · scheduler (PM) · dashboard                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              MASTER + INTEGRATION LAYER                       │
│  tenant · user · asset · app config · menu                    │
│  odoo · google · isp · tunas-iot · slack · teams · ai         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              INFRASTRUCTURE                                   │
│  PostgreSQL   Redis*   RabbitMQ*   MinIO                      │
│  * tersedia di Docker; belum dipakai runtime di kode aplikasi │
└─────────────────────────────────────────────────────────────┘
```

---

## Transaction Model

Semua pekerjaan (ticket, work order, PM task, booking, dll.) adalah **transaction**.

| Tabel | Fungsi |
|-------|--------|
| `transaction_header` | Identitas: `trx_no`, `app_code`, `status`, `current_process`, SLA, assignee |
| `transaction_detail` | Data dinamis per app (`field_code` + `value` JSON) |
| `transaction_log` | Riwayat aksi teknisi, foto, deskripsi, `metadata` (sparepart/alat/workers) |
| `transaction_asset` | Link aset: `AFFECTED` · `SPAREPART` · `TOOL` |

Contoh alur data:

```
POST /api/transaction { app_code: "IT_SUPPORT", data: {...} }
        │
        ▼
Routing engine baca app_routing → tentukan approver / assignee
        │
        ▼
PATCH /api/transaction/:id/action  → pindah proses
POST  /api/transaction/:id/log     → catat pekerjaan + foto + sparepart
        │
        ▼
CLOSE → SLA dihitung → notifikasi in-app ke requester
```

---

## Application Configuration

Konfigurasi per tenant — manager bisa ubah tanpa ubah kode.

| Tabel | Fungsi |
|-------|--------|
| `app_master` | Daftar aplikasi (`app_code`, nama, aktif/nonaktif) |
| `app_process` | Tahapan proses (REQUEST → ASSIGN → WORKING → CLOSE, dll.) |
| `app_routing` | Aturan transisi antar proses berdasarkan role/kondisi |
| `app_menu` | Item navigasi sidebar (web/mobile) per app & role |

Admin UI: `/admin/apps` (proses & routing) · `/admin/menu` (navigasi)

Default menu & proses: `backend/prisma/menu-defaults.json` + seed.

---

## Aplikasi (`app_code`)

| app_code | Domain |
|----------|--------|
| `IT_SUPPORT` | IT ticketing |
| `ISP_TICKET` | ISP / field dispatch |
| `ENG_WO` | Engineering corrective maintenance |
| `ENG_PM` | Preventive maintenance |
| `GA_SUPPORT` | General affairs |
| `BUILDING_MGMT` | Building & facility issues |
| `VEHICLE_BOOKING` | Reservasi kendaraan |

Semua konsumsi API yang sama — halaman web/mobile boleh berbeda, engine tidak.

---

## Multi-Tenant & Domain

Setiap query transaksional **wajib** filter `tenant_id` (dari JWT).

Hierarki lokasi memakai `domain_code`:

```
01                 ← Tenant
01.L01             ← Location (Factory)
01.L01.Z01         ← Zone (Production Line)
```

Tabel: `tenant`, `domain_node` (parent/child, optional `latitude`/`longitude` untuk map ISP).

---

## Database Groups

### 01 — Platform

| Model | Catatan |
|-------|---------|
| `tenant` | Satu baris per PT/customer SaaS |
| `domain_node` | Hierarki LOCATION / ZONE |
| `user` | User per tenant |
| `role` | Role + permissions JSON |
| `user_llm_config` | API key LLM per user (AES-GCM encrypted) |

### 02 — App Configuration

| Model |
|-------|
| `app_master` |
| `app_process` |
| `app_routing` |
| `app_menu` |

### 03 — Transaction

| Model |
|-------|
| `transaction_header` |
| `transaction_detail` |
| `transaction_log` |
| `transaction_asset` |

### 04 — Asset & Scheduling

| Model | Catatan |
|-------|---------|
| `asset` | Kategori via field `category` (bukan tabel terpisah) |
| `pm_schedule` | Jadwal preventive maintenance |

### 05 — Integration & Events

| Model | Catatan |
|-------|---------|
| `connector` | Konfigurasi integrasi per tenant (Odoo, IoT, dll.) |
| `event_queue` | Antrian event inbound (webhook, MQTT) — diproses connector |

### 06 — Notification

| Model | Catatan |
|-------|---------|
| `notification` | In-app notification per user |

Schema lengkap: `backend/prisma/schema.prisma`

---

## Integration Pattern

Logic eksternal **tidak** masuk ke transaction engine.

```
External System
      │
      ▼
Connector Service (backend/src/integration/{vendor}/)
      │
      ├── Mapping (config + mapping JSON di tabel connector)
      │
      ▼
Transaction / Asset / event_queue
```

| Connector | Trigger | Output |
|-----------|---------|--------|
| Odoo | Manual sync / scheduled | `asset` sync |
| ISP webhook | HTTP POST | `ISP_TICKET` transaction |
| Tunas IoT | MQTT | `ENG_WO` transaction via `event_queue` |
| Google Calendar | PM / Vehicle approve | Calendar event |
| Slack / Teams | Transaction event | Outbound message |

Marketplace UI: `/admin/integrations`

---

## AI Module

Lokasi: `backend/src/integration/ai/`

```
ai-context.service   → agregasi transaksi, log, aset per tenant
ai-report.service    → laporan harian / mingguan / bulanan
ai-chat.service      → Q&A + intent detection
user-llm.service     → simpan/test API key user
llm.client           → OpenAI + Gemini completion
```

| Endpoint | Fungsi |
|----------|--------|
| `POST /api/ai/chat` | Tanya riwayat maintenance, SLA, sparepart |
| `POST /api/ai/report` | Laporan operasional terstruktur |
| `PUT /api/ai/llm-config` | User hubungkan ChatGPT / Gemini |

Prioritas LLM: **user key** → platform `OPENAI_API_KEY` → Smart Analytics (rule-based).

---

## Dashboard Engine

`GET /api/dashboard/:app_code` — agregasi dari `transaction_header` + `transaction_log`.

Output umum (semua app):

- Open / closed / rejected counts
- SLA at risk & breach
- MTTR (average resolution hours)
- KPI per teknisi
- Breakdown by process & priority

Metrik **khusus per app** (MTBF, downtime, top problems, repeated complaint) — target roadmap, belum terpisah per service.

---

## Frontend Architecture (Web)

**React 19 + TypeScript + Vite** — Atomic Design.

```
components/
  atoms/        Button, Input, Badge, Card
  molecules/    AssetSelector, SLABadge, PhotoUpload, DomainPicker, …
  organisms/    TransactionDetailPage, AppDashboardPage, …
  templates/    AppLayout
pages/          Spesifik per app_code + admin + AI
services/       API client (transaction, dashboard, ai, menu, …)
```

**Aturan:** komponen `atoms`/`molecules` reusable; halaman `pages` boleh spesifik app tetapi wajib pakai Transaction API.

Role-based UI contoh: `TransactionDetailPage` — client vs teknisi vs manager (tab berbeda).

---

## Mobile Architecture (Expo Shell)

Konsep: **satu shell app** + menu dinamis — minim upload Play Store.

```
mobile/src/screens/
  Common/     Login, AppMenu, TransactionList, TransactionDetail
  ISP/        MapScreen (spesifik app)
```

Menu dari `GET /api/menu?platform=mobile` — sama sumber dengan web.

**Belum:** WorkExecution screen, Approval, AI screens, offline cache, FCM push.

---

## Auth & Request Context

- Login: `POST /api/auth/login` → JWT
- Middleware: `auth.plugin.ts` — verifikasi JWT, load `authUser` + `tenantId`
- Setiap route protected memakai `request.tenantId` dan `request.authUser`

```typescript
// FastifyRequest setelah authenticate
request.authUser  // { id, tenantId, roleCode, … }
request.tenantId  // untuk filter query
```

---

## Infrastructure

| Service | Port (dev) | Penggunaan saat ini |
|---------|------------|---------------------|
| PostgreSQL | 5436 | ✅ Prisma ORM |
| MinIO | 9000/9001 | ✅ Attachment upload |
| Redis | 6379 | 🔲 Belum di kode aplikasi |
| RabbitMQ | 5672/15672 | 🔲 Belum di kode aplikasi |

Production: `infra/docker-compose.prod.yml` — nginx web + backend container, migrate + seed on start.

---

## Monorepo Layout

```
tunas-workflow/
├── backend/     Fastify API, Prisma, core + integration
├── web/         React web app
├── mobile/      Expo shell app
├── infra/       Docker Compose (dev + prod)
├── deploy/      deploy.sh (rsync + VPS build)
└── docs/        Dokumentasi
```

---

## API Conventions

Format response, pola endpoint, dan aturan `app_code`: [api-conventions.md](./api-conventions.md)

---

## Kompatibilitas REDI-OS

Pola yang dipertahankan untuk integrasi masa depan:

- `tenant` + `domain_code` hierarchy
- `transaction` + `app_routing`
- Connector pattern untuk sistem eksternal

Tidak ada coupling langsung ke engine per-divisi.
