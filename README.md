# 🌱 Tunas Workflow

Platform Manajemen Pekerjaan Universal — **Configuration Driven Transaction Engine**

**Version:** 1.0.0

> **📖 [Panduan Pembangunan Lengkap (API · Web · Android · Roadmap)](./docs/PANDUAN_PEMBANGUNAN.md)**

---

## Status Implementasi (Juni 2026)

| Area | Status | Catatan |
|------|--------|---------|
| Transaction Engine | ✅ | Create, list, detail, action, log, routing |
| 7 Aplikasi (web) | ✅ | IT, ISP, Engineering WO/PM, GA, Building, Vehicle |
| Multi-tenant + domain | ✅ | `tenant_id`, `domain_code` hierarchy |
| App Config (process/routing/menu) | ✅ | Admin UI + menu dinamis per tenant |
| SLA & Dashboard dasar | ✅ | Open/closed, SLA breach, MTTR, KPI teknisi |
| Work log + sparepart/alat | ✅ | Role-based tabs, `transaction_asset` |
| Attachment (MinIO) | ✅ | Upload foto di work log |
| Connector marketplace | ✅ | Odoo, IoT, ISP webhook, Slack, Teams, Google Calendar, dll. |
| ISP Map View | ✅ | Web + mobile |
| AI Assistant | ✅ | Q&A maintenance, laporan harian/mingguan/bulanan |
| Koneksi LLM per user | ✅ | ChatGPT (OpenAI) & Gemini — API key per user |
| Mobile shell (Expo) | ✅ | Create, work execution, approval, AI, offline list cache |
| Reporting engine (per app) | ✅ | `/api/report` + halaman Reports per app (complaint, SLA, asset_usage) |
| ISP Partner API (bundle) | ✅ | 4 modul, webhook + pull/push + report eksternal |
| Swagger Integration API | ✅ | `/api/docs` — ISP & IoT |
| Cross-app Analytics | ✅ | `/analytics` + `GET /api/report/cross-app` |
| Dashboard metrik khusus per app | 🟡 | Dasar + App Insights; metrik mendalam per ISP/IT/ENG masih bertahap |
| RabbitMQ / Redis (runtime) | 🔲 | Ada di Docker, belum dipakai di kode |
| Email / push notification | 🔲 | In-app notification saja |
| AI Root Cause & histori teknisi | 🟡 | Tab **AI Insights** di detail tiket — kasus serupa, langkah teknisi, aset terkait; tren aset sering rusak masih perlu data historis lebih banyak |

---

## Demo Production

| | |
|---|---|
| **Web** | http://103.94.238.207:3050 |
| **API Health** | http://103.94.238.207:3050/api/health |
| **Swagger (Integration API)** | http://103.94.238.207:3050/api/docs |
| **UAT checklist ISP** | [docs/ISP-UAT-CHECKLIST.md](./docs/ISP-UAT-CHECKLIST.md) |
| **Production checklist** | [docs/PRODUCTION-CHECKLIST.md](./docs/PRODUCTION-CHECKLIST.md) |
| **ISP Integration Guide** | [docs/ISP-INTEGRATION-GUIDE.md](./docs/ISP-INTEGRATION-GUIDE.md) |
| **Integration API (ringkas)** | [docs/integration-api.md](./docs/integration-api.md) |
| **Webhook / API Key (demo)** | `tunas-demo-webhook-secret-2024` |
| **Tenant** | `01` |
| **Admin** | `admin` / `admin123` |
| **Manager** | `manager` / `manager123` |
| **Technician** | `tech` / `tech123` |

### Deploy ke VPS

```bash
# Siapkan SSH key di /tmp/ispkita_key, lalu:
bash deploy/deploy.sh
```

Deploy script: sync rsync → `docker compose` build → migrate + seed otomatis di container backend.

---

## Monorepo

| Package | Stack | Description |
|---------|-------|-------------|
| [`backend/`](./backend) | Node.js, Fastify, Prisma | API — transaction engine, dashboard, AI, connector |
| [`web/`](./web) | React 19, TypeScript, Vite | Web apps — Atomic Design |
| [`mobile/`](./mobile) | React Native (Expo) | Android shell — dynamic menu |
| [`infra/`](./infra) | Docker Compose | PostgreSQL, Redis, RabbitMQ, MinIO |
| [`docs/`](./docs) | — | Dokumentasi & panduan pembangunan |

### Quick Start (Lokal)

```bash
npm install
cp .env.example .env
cp .env backend/.env
npm run infra:up
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:5173 |
| API | http://localhost:3000/api/health |
| RabbitMQ UI | http://localhost:15672 |
| MinIO Console | http://localhost:9001 |

Lihat juga: [getting-started.md](./docs/getting-started.md) · [architecture.md](./docs/architecture.md) · [api-conventions.md](./docs/api-conventions.md) · [integration-api.md](./docs/integration-api.md) · [ISP-INTEGRATION-GUIDE.md](./docs/ISP-INTEGRATION-GUIDE.md) · Swagger lokal: http://localhost:3000/api/docs

---

## Visi Produk

Tunas Workflow **bukan** sistem ticketing terpisah per divisi.

Satu platform untuk mengatur:

| Domain | Contoh |
|--------|--------|
| **People** | Requester, approver, teknisi |
| **Asset** | Fixed asset, sparepart, alat kerja |
| **Task** | Ticket, work order, PM schedule |
| **Approval** | Custom per aplikasi & divisi |
| **SLA & KPI** | Performa teknisi, waktu resolusi |
| **Knowledge** | Riwayat dari `transaction_log` |

Semua aplikasi memakai **satu engine**, dibedakan oleh `app_code`, `app_process`, dan `app_routing`.

---

## Aplikasi yang Didukung

| app_code | Aplikasi | Web | Mobile |
|----------|----------|-----|--------|
| `IT_SUPPORT` | IT Support Ticketing | ✅ | ✅ |
| `ISP_TICKET` | ISP Ticketing | ✅ | ✅ |
| `ENG_WO` | Engineering Work Order | ✅ | ✅ |
| `ENG_PM` | Preventive Maintenance | ✅ | — |
| `GA_SUPPORT` | GA Support | ✅ | ✅ |
| `BUILDING_MGMT` | Building Management | ✅ | ✅ |
| `VEHICLE_BOOKING` | Pemesanan Mobil | ✅ | ✅ |

**Aturan:** Jangan buat engine/tabel per aplikasi. Semua lewat `/api/transaction` dengan `app_code`.

---

## Arsitektur

```
Web / Mobile Shell
        │  REST API
        ▼
┌───────────────────────────────────────┐
│  Fastify API                          │
│  /transaction  /dashboard  /ai  /menu │
└───────────────────────────────────────┘
        │
┌───────▼───────────────────────────────┐
│  Core: transaction · routing · sla    │
│        notification · attachment      │
│        scheduler (PM)                 │
└───────────────────────────────────────┘
        │
┌───────▼───────────────────────────────┐
│  Master: tenant · user · asset        │
│  Integration: odoo · iot · isp · ai   │
└───────────────────────────────────────┘
        │
   PostgreSQL · Redis · RabbitMQ · MinIO
```

### Prinsip

| ✅ Benar | ❌ Salah |
|----------|----------|
| Transaction Engine + App Config | `ITTicketEngine`, `WorkflowEngine` |
| `transaction_header/detail/log` | Tabel `it_ticket`, `isp_ticket` |
| Baca `app_routing` | `if (role == "manager") approve()` |
| `/api/transaction` + `app_code` | `/api/it-ticket` |
| Connector pattern di `integration/` | Logic eksternal di dalam transaction |

---

## Database

**Tidak ada tabel terpisah per aplikasi.**

```
transaction_header   ← app_code, status, process, SLA, assignee
transaction_detail   ← field dinamis (field_code + value JSON)
transaction_log      ← aktivitas teknisi, foto, metadata sparepart/alat
transaction_asset    ← link aset (affected / sparepart / tool)
```

Kategori aset disimpan di field `asset.category` (`FIXED_ASSET` | `SPAREPART` | `TOOL`), bukan tabel `asset_category` terpisah.

### Struktur Database

```
01_PLATFORM
 ├ tenant
 ├ domain_node
 ├ user
 ├ role
 └ user_llm_config        ← API key LLM per user (terenkripsi)

02_APP_CONFIG
 ├ app_master
 ├ app_process
 ├ app_routing
 └ app_menu               ← menu navigasi per tenant/app

03_TRANSACTION
 ├ transaction_header
 ├ transaction_detail
 ├ transaction_log
 └ transaction_asset

04_ASSET
 ├ asset
 └ pm_schedule

05_INTEGRATION
 ├ connector
 └ event_queue

06_NOTIFICATION
 └ notification
```

---

## API Utama

Semua response mengikuti format:

```json
{ "success": true, "data": {}, "message": "" }
{ "success": false, "errorCode": "...", "message": "..." }
```

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/health` | Health check |
| GET | `/api/docs` | Swagger UI — Integration API (ISP & IoT) |
| POST | `/api/auth/login` | Login JWT |
| GET | `/api/apps` | Daftar aplikasi tenant |
| POST/GET | `/api/transaction` | Buat / list transaksi |
| GET | `/api/transaction/:id` | Detail + log + asset |
| PATCH | `/api/transaction/:id/action` | Pindah proses / assign / close |
| POST | `/api/transaction/:id/log` | Catat pekerjaan teknisi |
| POST | `/api/attachment` | Upload foto / file (MinIO) |
| GET | `/api/dashboard/:app_code` | Dashboard per aplikasi |
| GET | `/api/report/:appCode` | Laporan internal per app |
| GET | `/api/report/cross-app` | Analytics lintas aplikasi |
| GET/POST | `/api/pm-schedule` | Jadwal preventive maintenance |
| GET | `/api/notification` | Notifikasi in-app |
| GET/PUT | `/api/menu` | Menu navigasi (admin) |
| GET | `/api/ai/status` | Status AI assistant |
| POST | `/api/ai/chat` | Tanya riwayat maintenance, SLA, aset, dll. |
| POST | `/api/ai/report` | Laporan harian / mingguan / bulanan |
| POST | `/api/ai/rca/:transactionId` | RCA + kasus serupa + saran teknisi |
| GET | `/api/ai/similar/:transactionId` | Kasus serupa saja |
| GET | `/api/ai/suggestions/:transactionId` | Saran langkah teknisi dari historis |
| GET/PUT/DELETE | `/api/ai/llm-config` | Koneksi ChatGPT / Gemini per user |
| GET/POST | `/api/connector` | Integrasi eksternal (marketplace) |
| GET | `/api/integration/status` | Status connector + MQTT (auth) |
| POST | `/api/integration/isp/:tenant/webhook` | Inbound ISP — create ticket (multi `app_code`) |
| GET/PATCH | `/api/integration/isp/:tenant/tickets/...` | ISP Partner API pull/push |
| GET | `/api/integration/isp/:tenant/report` | Laporan untuk sistem ISP eksternal |
| GET | `/api/integration/isp/:tenant/reports/bundle` | Ketiga laporan ISP sekaligus |
| POST | `/api/integration/iot/:tenant/work-order` | WO manual dari Tunas IoT (operator) |
| GET | `/api/integration/iot/:tenant/mqtt` | Referensi payload MQTT multi-sensor |
| GET/POST | `/api/asset` | CRUD asset |

---

## Dashboard & Reporting

**Prinsip:** Setiap aplikasi (`ISP_TICKET`, `IT_SUPPORT`, `ENG_WO`, dll.) punya **dashboard** dan **laporan** sendiri. Metrik dan kolom laporan **bervariasi per app** — dikonfigurasi lewat `app_code` dan kebutuhan divisi (misal ISP: komplain & SLA; Engineering: sparepart & PM).

### Dashboard (saat ini)

`GET /api/dashboard/:app_code` mengembalikan metrik umum per aplikasi:

- Open / closed / rejected
- SLA at risk & breach
- MTTR (avg resolution hours)
- KPI per teknisi
- Breakdown by process & priority

Web menampilkan **App Dashboard** per modul (`/isp`, `/it-support`, `/engineering`, …) dengan App Insights. Metrik mendalam per divisi (lihat tabel target) masih dilengkapi bertahap.

### Target Dashboard per Aplikasi

| App | Target | Status |
|-----|--------|--------|
| IT Support | Top Problem, Asset Failure Trend, Critical Ticket | 🔲 |
| ISP | Technician Position, Repeated Complaint, Customer Down | 🟡 Map ada, GPS belum |
| Engineering | Downtime, MTBF, PM Compliance, Sparepart Cost | 🟡 PM compliance di backend |
| GA / Vehicle / Building | Cost, Utilization, Availability | 🔲 |

### Reporting

| Jenis | Status | Catatan |
|-------|--------|---------|
| Laporan operasional via AI (harian/mingguan/bulanan) | ✅ | `POST /api/ai/report` |
| Halaman report per app (web) | ✅ | complaint, SLA, asset_usage — period bulan/tahun |
| Report untuk sistem ISP eksternal | ✅ | `GET /api/integration/isp/{tenant}/report` |
| Cross-app analytics | ✅ | `/analytics` |
| Kolom & metrik report khusus per tenant/app | 🟡 | Variable — disesuaikan kebutuhan ISP / divisi |
| Export PDF / Excel | 🔲 | — |

---

## AI Assistant

Modul AI di `backend/src/integration/ai/` — halaman web `/ai-assistant`, `/ai-settings`, dan tab **AI Insights** di setiap detail transaksi.

### Yang bisa dilakukan sekarang (penting untuk teknisi & ISP support)

| Kebutuhan | Cara di Tunas Workflow | Status |
|-----------|------------------------|--------|
| **Aset / alat apa yang sering bermasalah?** | `POST /api/ai/chat` — tanya riwayat transaksi + `transaction_asset`; RCA menampilkan `assetCodes` dari kasus serupa | 🟡 Akurat jika work log & link aset terisi konsisten |
| **Bagaimana teknisi menangani kasus serupa sebelumnya?** | Tab **AI Insights** → *Similar Cases* + *Technician Suggestions* — langkah dari `transaction_log` kasus closed | ✅ |
| **Root cause & rekomendasi perbaikan** | Rule-based (keyword: network, power, bearing, ONT, dll.) + optional LLM | ✅ |
| **Estimasi waktu penyelesaian** | Rata-rata jam resolusi dari kasus serupa | ✅ |
| **Laporan cepat NOC/manager** | `POST /api/ai/report` — harian / mingguan / bulanan | ✅ |

**Cara pakai (teknisi / ISP support):** Buka detail tiket → tab **AI Insights** → sistem mencari kasus serupa (skor berdasarkan aset sama + kata kunci masalah) → tampilkan langkah yang pernah ditulis teknisi di work log sebelumnya.

### Fitur pendukung

| Fitur | Deskripsi |
|-------|-----------|
| **AI Assistant (chat)** | Q&A riwayat maintenance, tiket open, SLA, sparepart |
| **Koneksi LLM per user** | API key ChatGPT atau Gemini — analisis RCA lebih kaya |
| **Smart Analytics** | Fallback tanpa API key — rule-based dari data transaksi |

### Mode LLM

1. **User LLM** — API key milik user (prioritas utama)
2. **Platform LLM** — `OPENAI_API_KEY` di server (opsional)
3. **Smart Analytics** — fallback tanpa API key

### Roadmap AI (berikutnya)

- **Ranking aset paling sering rusak** per lokasi / periode (dashboard trend, bukan hanya per-tiket)
- Rekomendasi sparepart otomatis dari frekuensi `transaction_asset`
- AI proaktif saat create ticket (suggest sebelum teknisi buka detail)
- Mobile: panel AI Insights penuh (saat ini hints terbatas)

---

## Frontend (Web)

| Komponen | Teknologi |
|----------|-----------|
| Framework | React 19 + TypeScript + Vite |
| Arsitektur UI | Atomic Design |

```
web/src/components/
  atoms/       Button, Input, Badge, Card
  molecules/   AssetSelector, SLABadge, PhotoUpload, DomainPicker, ...
  organisms/   TransactionDetailPage, AppDashboardPage, ...
  templates/   AppLayout
web/src/pages/
  ITSupport/   Engineering/   ISP/   GA/   Vehicle/   Building/
  admin/       AI/              (ApplicationSettings, MenuConfig, Integrations)
```

**Aturan:** Komponen di `atoms/` & `molecules/` harus reusable. Halaman di `pages/` boleh spesifik per `app_code`, tetapi wajib konsumsi Transaction API.

---

## Mobile (Android Shell)

Konsep: **satu shell app** + menu dinamis dari `/api/menu` — minim upload Play Store.

| Screen | Status |
|--------|--------|
| Login + tenant picker | ✅ |
| Dynamic menu per app | ✅ |
| Transaction list & detail | ✅ |
| Create transaction (GA, Building, Vehicle, ISP, IT, ENG) | ✅ |
| Work execution (log + advance/close) | ✅ |
| Approval queue | ✅ |
| AI Assistant | ✅ |
| ISP Map (lazy load) | ✅ |
| Vehicle calendar | ✅ |
| Offline list cache + action queue | ✅ |
| Push notification (FCM) | 🔲 |

---

## Integrasi

Semua integrasi memakai **Connector Pattern** — tidak ada logic eksternal di dalam transaction engine.

```
External System → Connector → Mapping → Transaction / Asset
```

| Integrasi | Kode | Produksi |
|-----------|------|----------|
| Odoo (asset sync + scheduled worker) | ✅ | Perlu konfigurasi tenant |
| Custom API (REST asset pull) | ✅ | Perlu base URL + token |
| Google Calendar (PM, Vehicle) | ✅ | Perlu service account |
| ISP Billing webhook + Partner API | ✅ | [ISP-INTEGRATION-GUIDE.md](./docs/ISP-INTEGRATION-GUIDE.md) · Swagger `/api/docs` |
| Tunas IoT (HTTP webhook + MQTT bridge) | ✅ | Demo secret di seed tenant `01` |
| Integration worker + event queue | ✅ | `INTEGRATION_WORKER_ENABLED=true` |
| Slack / Teams | ✅ | Perlu webhook URL |
| AnyDesk | ✅ | — |

```
backend/src/integration/
  odoo/   google/   isp/   tunas-iot/   custom-api/   slack/   teams/   ai/
```

---

## Konfigurasi Environment

Variabel penting (lihat [`.env.example`](./.env.example)):

```env
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=...

# AI Assistant (opsional)
AI_ENABLED=true
OPENAI_API_KEY=          # platform fallback
OPENAI_MODEL=gpt-4o-mini

# MinIO
MINIO_ENDPOINT=...
MINIO_BUCKET=tunas-attachments
```

API key LLM **per user** disimpan terenkripsi di `user_llm_config` — tidak perlu di `.env` untuk setiap user.

---

## Development dengan Cursor AI

Jangan minta AI membuat aplikasi terpisah:

```
❌ "Create IT Ticket Application"
❌ "Create ISPTicketEngine"
```

Gunakan prompt yang mengikuti arsitektur:

```
✅ "Create ITSupport Dashboard Page
    using Transaction API
    using Atomic Component
    follow Tunas Workflow Architecture"
```

Contoh requirement yang benar:

- Use React + Atomic Design
- Consume `/api/transaction` dengan `app_code`
- Reuse `AssetSelector`, `PhotoUpload`, `SLABadge`
- Follow `app_routing` — jangan hardcode approval

---

## Roadmap

Ringkasan phase — detail lengkap di [PANDUAN_PEMBANGUNAN.md](./docs/PANDUAN_PEMBANGUNAN.md#12-roadmap-per-phase).

```
Phase 0  Foundation              ✅
Phase 1  Core Platform             ✅
Phase 2  Transaction Engine        ✅
Phase 3  Technician Work & Asset   ✅
Phase 4  SLA & Dashboard           🟡 (dasar per app ada; metrik mendalam ISP/IT/ENG bertahap)
Phase 5  Engineering & PM          ✅
Phase 6  Integrasi                 ✅ (ISP bundle, Partner API, Swagger, IoT MQTT multi-sensor, Odoo sync)
Phase 7  All Apps + Mobile        ✅ (web lengkap, mobile shell + work/approval/AI)
Phase 8  AI & Scale                🟡 (RCA + kasus serupa ✅; tren aset sering rusak & AI proaktif 🔲)
```

### Masih terbuka (prioritas berikutnya)

| Item | Status |
|------|--------|
| Email / FCM push notification | 🔲 |
| RabbitMQ / Redis aktif di runtime | 🔲 |
| Export PDF / Excel report | 🔲 (CSV ✅ di web Reports) |
| ISP UAT script + checklist | ✅ | `scripts/isp-partner-api-test.sh` + `docs/ISP-UAT-CHECKLIST.md` |
| Production checklist | ✅ | `docs/PRODUCTION-CHECKLIST.md` |
| ISP callback outbound production | 🔲 | Pull-only untuk development |
| GPS teknisi di ISP Map | 🟡 |
| Dashboard ranking aset sering rusak | 🔲 |

---

## Lisensi & Kompatibilitas

Arsitektur dirancang kompatibel dengan **REDI-OS** di masa depan: `tenant`, `domain_code`, `transaction`, `routing`, `connector`.
