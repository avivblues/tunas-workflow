# Panduan Pembangunan Tunas Workflow

> Dokumen ini adalah titik awal untuk membangun **Tunas Workflow** — platform manajemen pekerjaan universal berbasis **Configuration Driven Transaction Engine**.

**Target platform:** API (Backend) · Web Apps · Android (React Native Shell)

---

## Daftar Isi

1. [Visi Produk](#1-visi-produk)
2. [Aplikasi yang Didukung](#2-aplikasi-yang-didukung)
3. [Fitur Inti](#3-fitur-inti)
4. [Multi-Tenant & Domain Code](#4-multi-tenant--domain-code)
5. [Prinsip Arsitektur](#5-prinsip-arsitektur)
6. [Alur Kerja End-to-End](#6-alur-kerja-end-to-end)
7. [Struktur Monorepo](#7-struktur-monorepo)
8. [Membangun API (Backend)](#8-membangun-api-backend)
9. [Membangun Web Apps](#9-membangun-web-apps)
10. [Membangun Android (Shell App)](#10-membangun-android-shell-app)
11. [Integrasi Eksternal](#11-integrasi-eksternal)
12. [Roadmap Per Phase](#12-roadmap-per-phase)
13. [Quick Start Development](#13-quick-start-development)

---

## 1. Visi Produk

Tunas Workflow **bukan** sistem ticketing tradisional yang terpisah per divisi.

Tunas Workflow adalah **satu platform SaaS multi-tenant** untuk mengatur:

| Domain | Contoh |
|--------|--------|
| **People** | Requester, approver, teknisi |
| **Asset** | Fixed asset, sparepart, alat kerja |
| **Task** | Ticket, work order, PM schedule |
| **Approval** | Custom per aplikasi & divisi |
| **SLA & KPI** | Performa teknisi, waktu resolusi |
| **Knowledge** | Riwayat pekerjaan dari `transaction_log` |

Semua aplikasi (IT Support, ISP, Engineering, GA, Building, Vehicle) menggunakan **engine yang sama**, dibedakan hanya oleh konfigurasi `app_code`, `app_process`, dan `app_routing`.

---

## 2. Aplikasi yang Didukung

| app_code | Nama | Contoh Use Case |
|----------|------|-----------------|
| `IT_SUPPORT` | IT Support Ticketing | Server down, ganti HDD, network issue |
| `ISP_TICKET` | ISP Ticketing | Komplain pelanggan, OLT/ONT, dispatch teknisi lapangan |
| `ENG_WO` | Engineering Work Order | Corrective maintenance, breakdown mesin |
| `ENG_PM` | Preventive Maintenance | Jadwal PM mesin, compliance checklist |
| `GA_SUPPORT` | GA Support | Fasilitas kantor, permintaan umum |
| `BUILDING_MGMT` | Building Management | AC rusak, lift, utilitas gedung |
| `VEHICLE_BOOKING` | Pemesanan Mobil Karyawan | Reservasi kendaraan, driver assignment |

> **Aturan:** Jangan buat modul/engine terpisah per aplikasi. Semua lewat `/api/transaction` dengan parameter `app_code`.

---

## 3. Fitur Inti

### 3.1 Asset Management

Mengelola tiga kategori aset dalam satu tabel `asset`:

| Kategori | Contoh |
|----------|--------|
| **Fixed Asset** | Server, mesin produksi, kendaraan |
| **Sparepart** | HDD, modem, bearing, filter |
| **Tools** | Multimeter, tang, alat ukur |

**Kemampuan:**

- Link aset ke transaksi via `transaction_asset` (affected / sparepart / tool)
- Sync dari **Odoo**, **ERP**, atau sistem asset lain via **Connector API**
- Metadata fleksibel (`metadata Json`) untuk field khusus per integrasi
- Trigger otomatis dari **Tunas IoT** saat sensor mendeteksi anomaly

```
Odoo / ERP ──► Connector ──► asset (sync)
Tunas IoT  ──► MQTT Event ──► transaction_header (auto-create ENG_WO)
```

### 3.2 Pembuatan Pekerjaan (Ticket / WO / PM)

Semua jenis pekerjaan adalah **transaction**:

| Sumber | Cara Masuk |
|--------|------------|
| Form manual (web/mobile) | `POST /api/transaction` + `app_code` |
| Jadwal PM | Scheduler → create transaction `ENG_PM` |
| Sensor IoT | MQTT → `event_queue` → create transaction `ENG_WO` |
| ISP Billing (PC24) | Webhook/API → create transaction `ISP_TICKET` |

Data dinamis per aplikasi disimpan di `transaction_detail` (field_code + value Json), **bukan** tabel terpisah.

### 3.3 Custom Approval & Routing

Approval **tidak di-hardcode**. Manager tiap PT mengkonfigurasi:

- `app_process` — tahapan proses (REQUEST → APPROVAL → ASSIGN → WORKING → DONE → CLOSE)
- `app_routing` — aturan transisi antar proses berdasarkan role, kondisi, divisi

```
Contoh IT Support:
  REQUEST → (role: MANAGER) → ASSIGN → WORKING → DONE → CLOSE

Contoh Engineering:
  REQUEST → APPROVAL → SCHEDULE → EXECUTE → VERIFY → CLOSE
```

Konfigurasi ini per-tenant, sehingga PT A dan PT B bisa punya alur berbeda untuk `app_code` yang sama.

### 3.4 Proses Pengerjaan Teknisi

Seluruh aktivitas teknisi dicatat di `transaction_log`:

| Field | Isi |
|-------|-----|
| `process` | Tahap saat ini (WORKING, EXECUTE, dll.) |
| `userId` | Teknisi yang bertindak |
| `action` | CHECK, REPAIR, REPLACE, WAIT_PART, dll. |
| `description` | Narasi pekerjaan |
| `attachments` | Foto bukti (disimpan di MinIO) |

**Pengelompokan pekerjaan & material:**

Via `transaction_asset`:

```
ISP Ticket:
  - Modem (sparepart, qty: 1)
  - Pathcore tool (tool)

IT Support:
  - SERVER-01 (affected asset)
  - HDD 2TB (sparepart, qty: 1)
```

### 3.5 Handover Antar Teknisi

Jika pekerjaan belum selesai:

1. Teknisi A mencatat progress di `transaction_log` (status: partial)
2. `assignTo` di-update ke Teknisi B
3. Teknisi B membaca seluruh log sebelumnya → **knowledge transfer otomatis**
4. Semua log tersimpan untuk **AI learning** di masa depan

```
08:00  Budi    — Checking server, HDD Error detected
13:00  Anton   — Replace HDD, testing in progress
16:00  Anton   — Partial: OS reinstall needed, handover to Citra
09:00  Citra   — Continue OS reinstall from Anton's notes
11:00  Citra   — DONE
```

### 3.6 SLA & KPI Teknisi

Setelah transaksi `CLOSE`:

| Output | Sumber Data |
|--------|-------------|
| SLA status (met / breached) | `transaction_header.slaStatus` + modul SLA |
| Daftar teknisi terlibat | Agregasi `transaction_log.userId` |
| KPI per teknisi | Dashboard `/api/dashboard/:app_code` |
| MTTR, resolution time | Query `createdAt` vs `closedAt` |

### 3.7 Notifikasi

Setelah pekerjaan selesai, requester menerima notifikasi via:

- In-app notification (web & mobile)
- Email (Google Workspace / SMTP)
- Push notification (Android FCM)

Diproses oleh modul `core/notification` via RabbitMQ queue.

---

## 4. Multi-Tenant & Domain Code

Tunas Workflow adalah **SaaS multi-tenant**. Setiap PT (tenant) memiliki hierarki lokasi sendiri menggunakan `domain_code`.

### Hierarki Node

```
Konsep          hierarchy_code       Node
─────────────────────────────────────────────────────────
1               —                    Platform Administrator (bukan Domain)
└─ 1.1          01                   Tenant — PT Contoh Industries
   ├─ 1.1.1      01.L01              Factory Jababeka (Location)
   │  ├─ 1.1.1.1 01.L01.Z01          Production Line Alpha (Zone)
   │  └─ 1.1.1.2 01.L01.Z02          Production Line Beta (Zone)
   └─ 1.1.2      01.L02              Factory B / Warehouse (Location)
      └─ 1.1.2.1 01.L02.Z01          Zone di Factory B
```

### Mapping ke Database

| Konsep | Tabel / Field |
|--------|---------------|
| Platform Admin | User dengan role `PLATFORM_ADMIN` (di luar tenant scope) |
| Tenant | `tenant` (code: `01`) |
| Location | `domain_node` (type: `LOCATION`, domainCode: `01.L01`) |
| Zone | `domain_node` (type: `ZONE`, domainCode: `01.L01.Z01`) |

### Aturan Query

```sql
-- WAJIB di setiap query transaksional
WHERE tenant_id = :currentTenant

-- Filter lokasi (opsional)
AND domain_code LIKE '01.L01%'
```

Manager tiap tenant mengkonfigurasi `app_routing` dan `app_process` sesuai kebutuhan PT masing-masing.

---

## 5. Prinsip Arsitektur

### Yang BENAR ✅

```
Transaction Engine     ← satu engine untuk semua app
App Configuration      ← app_master, app_process, app_routing
App Routing            ← baca config, jangan hardcode
Connector Pattern      ← integrasi eksternal terisolasi
```

### Yang SALAH ❌

```
ITTicketEngine, ISPTicketEngine, WorkflowEngine
Tabel it_ticket, isp_ticket, ga_request
if (role == "manager") approve()
Endpoint /api/it-ticket, /api/ga-request
```

### Diagram Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  Web (React)          Android Shell (React Native)          │
│  Atomic Design        Dynamic Menu + Common Screens         │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────┐
│                     API LAYER (Fastify)                     │
│  /api/transaction   /api/apps   /api/dashboard/:app_code    │
│  /api/asset         /api/connector                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     CORE LAYER                              │
│  transaction/  routing/  sla/  notification/  attachment/   │
│  scheduler/                                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              MASTER + INTEGRATION LAYER                     │
│  tenant/  user/  asset/  organization/                      │
│  google/  odoo/  isp/  tunas-iot/                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              INFRASTRUCTURE                                   │
│  PostgreSQL  Redis  RabbitMQ  MinIO                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Alur Kerja End-to-End

```
[Trigger]
  Form User / IoT Sensor / PM Scheduler / ISP Billing
       │
       ▼
[Create Transaction]
  POST /api/transaction { app_code, data, asset_ids }
       │
       ▼
[Routing Engine]
  Baca app_routing → tentukan approver / assignee
       │
       ▼
[Approval] (jika diperlukan oleh config)
  Manager approve → pindah ke process berikutnya
       │
       ▼
[Assignment]
  Assign ke teknisi berdasarkan assignRule di app_routing
       │
       ▼
[Technician Work]
  Upload foto, catat pekerjaan, pakai sparepart/alat
  → transaction_log + transaction_asset
       │
       ├── Belum selesai? → Handover ke teknisi lain
       │
       ▼
[Close]
  SLA dihitung → KPI teknisi → Notifikasi ke requester
```

---

## 7. Struktur Monorepo

```
tunas-workflow/
├── backend/                 # API — Node.js + Fastify + Prisma
│   ├── prisma/schema.prisma
│   └── src/
│       ├── core/            # transaction, routing, sla, notification, ...
│       ├── master/          # tenant, user, asset, organization
│       ├── integration/     # google, odoo, isp, tunas-iot
│       └── api/routes/      # REST endpoints
│
├── web/                     # Web Apps — React + TypeScript + Vite
│   └── src/
│       ├── components/      # Atomic Design
│       │   ├── atoms/
│       │   ├── molecules/
│       │   ├── organisms/
│       │   └── templates/
│       ├── pages/           # Halaman per aplikasi
│       └── services/        # API client
│
├── mobile/                  # Android — React Native Shell
│   └── src/
│       ├── screens/Common/  # Layar reusable
│       ├── screens/         # Layar spesifik per app (opsional)
│       ├── components/      # Atomic Design (sama konsep web)
│       └── services/
│
├── infra/                   # Docker Compose
└── docs/                    # Dokumentasi
```

---

## 8. Membangun API (Backend)

### Stack

| Komponen | Teknologi |
|----------|-----------|
| Runtime | Node.js 20+ |
| Framework | Fastify |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Cache | Redis |
| Queue | RabbitMQ |
| Storage | MinIO |

### Endpoint yang Akan Dibangun

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/health` | Health check ✅ (sudah ada) |
| GET | `/api/apps` | Daftar app aktif per tenant |
| POST | `/api/transaction` | Buat ticket/WO/PM |
| GET | `/api/transaction` | List transaksi (filter app_code, status) |
| GET | `/api/transaction/:id` | Detail + log + asset |
| PATCH | `/api/transaction/:id/action` | Pindah process / assign / close |
| POST | `/api/transaction/:id/log` | Catat pekerjaan teknisi |
| GET | `/api/dashboard/:app_code` | Data dashboard per aplikasi |
| GET/POST | `/api/asset` | CRUD asset |
| GET/POST | `/api/connector` | Konfigurasi integrasi |

### Response Format (Wajib)

```json
// Success
{ "success": true, "data": {}, "message": "" }

// Error
{ "success": false, "errorCode": "TRANSACTION_NOT_FOUND", "message": "" }
```

### Urutan Implementasi API

```
1. Prisma client + koneksi DB
2. Middleware tenant context (extract tenant_id dari JWT/header)
3. Master: tenant, user, role, domain_node
4. App config: app_master, app_process, app_routing (CRUD untuk manager)
5. Transaction engine: create, list, detail, action (routing)
6. Transaction log: catat pekerjaan teknisi
7. Asset module + transaction_asset link
8. Attachment upload (MinIO)
9. SLA calculation
10. Notification queue (RabbitMQ)
11. Dashboard aggregations per app_code
12. Connector framework + integrasi per phase
```

### Lokasi Kode

```
backend/src/core/transaction/     ← engine utama
backend/src/core/routing/         ← baca app_routing
backend/src/core/sla/             ← hitung SLA
backend/src/core/notification/    ← kirim notifikasi
backend/src/core/attachment/      ← upload foto ke MinIO
backend/src/core/scheduler/       ← PM schedule trigger
backend/src/integration/          ← connector eksternal
```

---

## 9. Membangun Web Apps

### Stack

| Komponen | Teknologi |
|----------|-----------|
| Framework | React 19 |
| Language | TypeScript |
| Build | Vite |
| Arsitektur UI | Atomic Design |

### Atomic Design — Komponen Reusable

```
atoms/          molecules/           organisms/              templates/
─────────       ──────────────       ─────────────────       ──────────────
Button          TicketCard           WorkOrderTable          DashboardLayout
Input           AssetSelector        TechnicianPanel         WorkOrderLayout
Badge           SLAIndicator         ApprovalTimeline        FormLayout
Status          UserPicker           TransactionTimeline
Upload          PrioritySelect       AssetUsagePanel
SLABadge        DomainSelector
```

**Aturan:** Komponen di `atoms/` dan `molecules/` **harus reusable** di semua aplikasi. Halaman di `pages/` boleh spesifik per `app_code`.

### Halaman per Aplikasi

```
pages/
├── ITSupport/       Dashboard, CreateTicket, TicketDetail, Report
├── ISP/             Dashboard, CreateTicket, MapView, Report
├── Engineering/     Dashboard, CreateWO, PMCalendar, Report
├── GA/              Dashboard, CreateRequest, Report
├── Building/        Dashboard, CreateIssue, Report
└── Vehicle/         Dashboard, BookingForm, Schedule
```

Semua halaman consume **Transaction API** — tidak ada API khusus per halaman.

### Urutan Implementasi Web

```
1. Design system: atoms (Button, Input, Badge, Status)
2. molecules (TicketCard, AssetSelector, SLAIndicator)
3. templates (DashboardLayout, FormLayout)
4. Services: transaction.service.ts, asset.service.ts
5. Auth & tenant context (login, pilih tenant/domain)
6. Halaman IT Support (sebagai referensi pertama)
7. Dashboard IT Support (consume /api/dashboard/IT_SUPPORT)
8. Halaman aplikasi lain secara bertahap
9. Admin panel: konfigurasi app_process & app_routing
```

---

## 10. Membangun Android (Shell App)

### Konsep: Satu App di Play Store

Alih-alih upload app terpisah per divisi (IT App, Engineering App, ISP App), gunakan **Shell App** dengan menu dinamis:

```
┌─────────────────────────────┐
│  Tunas Workflow             │
│  ─────────────────────────  │
│  📋 IT Support        →     │  ← dari app_master tenant
│  🌐 ISP Ticket        →     │
│  🔧 Engineering WO    →     │
│  🏢 GA Support        →     │
│  🚗 Vehicle Booking   →     │
│  ─────────────────────────  │
│  ✅ Approval (3)      →     │  ← Common screen
│  👤 Profile           →     │
└─────────────────────────────┘
```

**Keuntungan:** Update fitur baru = update backend config + OTA bundle, **bukan** upload Play Store berulang.

### Atomic Design di Mobile

Struktur komponen mobile **mirror** web:

```
mobile/src/components/
├── atoms/       Button, Input, Badge, Avatar
├── molecules/   TicketCard, AssetChip, SLABadge, PhotoUpload
└── organisms/   TransactionList, WorkLogForm, ApprovalCard
```

### Layar Common (Reusable — tidak perlu upload ulang)

| Screen | Fungsi |
|--------|--------|
| `TransactionList` | List semua transaksi (filter by app_code) |
| `TransactionDetail` | Detail + timeline log |
| `WorkExecution` | Form teknisi: foto, deskripsi, sparepart |
| `Approval` | Daftar pending approval |
| `Profile` | Profil user & notifikasi |

### Layar Spesifik (Opsional, lazy-loaded)

```
screens/ITSupport/     TicketDetail khusus ISP field
screens/Engineering/   WorkExecution + checklist PM
screens/ISP/           Map view teknisi lapangan
```

Layar spesifik di-load via **dynamic import** berdasarkan `app_code` dari config — sehingga penambahan layar baru tidak wajib update binary di Play Store.

### Stack Mobile

| Komponen | Teknologi |
|----------|-----------|
| Framework | React Native (Expo) |
| Navigation | React Navigation |
| State | React Query / Zustand |
| Push | Expo Notifications (FCM) |
| Camera | Expo Camera / ImagePicker |

### Bootstrap Android

```bash
cd mobile
npx create-expo-app@latest . --template blank-typescript
npm install @react-navigation/native react-query
```

Set `EXPO_PUBLIC_API_BASE_URL` di `.env` → consume Transaction API.

### Urutan Implementasi Android

```
1. Bootstrap Expo + navigation shell
2. Auth screen + tenant/domain picker
3. Dynamic menu dari GET /api/apps
4. Common: TransactionList, TransactionDetail
5. Common: WorkExecution (foto + log + sparepart)
6. Common: Approval screen
7. Push notification (FCM)
8. Layar spesifik ISP (map) — phase lanjutan
9. Offline cache untuk teknisi lapangan — phase lanjutan
```

---

## 11. Integrasi Eksternal

Semua integrasi menggunakan **Connector Pattern** — tidak ada logic eksternal di dalam transaction engine.

```
External System → Connector Service → Mapping → Transaction / Asset
```

Tabel `connector` menyimpan konfigurasi per tenant:

```json
{
  "type": "ODOO",
  "config": { "url": "...", "apiKey": "..." },
  "mapping": { "assetCode": "default_code", "name": "name" }
}
```

### 11.1 Google Workspace

| Fitur | Integrasi |
|-------|-----------|
| PM Schedule | Sync jadwal PM ke Google Calendar |
| Vehicle Booking | Buat event calendar saat booking disetujui |
| User Sync | Import user dari Google Directory |
| Notifikasi | Email via Gmail API |

```
backend/src/integration/google/
├── calendar.connector.ts
├── directory.connector.ts
└── gmail.connector.ts
```

### 11.2 Odoo / ERP

| Data | Arah Sync |
|------|-----------|
| Fixed Asset | Odoo → Tunas `asset` |
| Sparepart / Inventory | Odoo → Tunas `asset` (category: SPAREPART) |
| Employee | Odoo → Tunas `user` |
| Cost Center | Odoo → `domain_node` metadata |

Trigger: scheduled sync (RabbitMQ job) atau webhook dari Odoo.

### 11.3 PC24 / ISP Billing

| Event | Aksi di Tunas |
|-------|---------------|
| Customer complaint | Create `ISP_TICKET` transaction |
| Device offline | Create ticket + link ONT asset |
| Package issue | Create ticket dengan detail customer |

```
ISP Billing ──webhook──► event_queue ──► ISP Connector ──► transaction
```

### 11.4 Tunas IoT

| Event MQTT | Aksi di Tunas |
|------------|---------------|
| Sensor alarm / threshold breach | Auto-create `ENG_WO` |
| Machine status: breakdown | Auto-create `ENG_WO` + link asset |
| PM due reminder | Trigger `ENG_PM` dari scheduler |
| Asset telemetry update | Update `asset.metadata` |

```
MQTT Broker ──► tunas-iot connector ──► event_queue ──► transaction engine
```

### 11.5 Aplikasi Asset Lain (Generic API)

Connector generik untuk sistem asset pihak ketiga:

```json
{
  "type": "CUSTOM_API",
  "config": {
    "baseUrl": "https://asset-system.example.com/api",
    "authType": "bearer",
    "token": "..."
  },
  "mapping": {
    "assetCode": "code",
    "name": "asset_name",
    "category": "type"
  }
}
```

---

## 12. Roadmap Per Phase

### Phase 0 — Foundation (Minggu 1–3) ✅ Scaffold selesai

| Task | Status |
|------|--------|
| Monorepo structure (backend, web, mobile, infra) | ✅ |
| Docker Compose (PostgreSQL, Redis, RabbitMQ, MinIO) | ✅ |
| Prisma schema (semua tabel inti) | ✅ |
| Health endpoint API | ✅ |
| Web & mobile scaffold | ✅ |

**Deliverable:** Developer bisa `npm run dev` dan infra jalan.

---

### Phase 1 — Core Platform (Minggu 4–8)

**Fokus:** Tenant, user, auth, app configuration

| Backend | Web | Android |
|---------|-----|---------|
| Prisma client + migrations | Login page | Bootstrap Expo |
| Auth JWT + tenant middleware | Auth context | Login screen |
| CRUD tenant, domain_node | Tenant/domain picker | Tenant picker |
| CRUD user, role | User management page | — |
| CRUD app_master, app_process, app_routing | Admin config UI | Dynamic menu dari `/api/apps` |
| Seed data: 1 tenant demo + IT_SUPPORT config | — | — |

**Deliverable:** Manager bisa login, setup tenant, konfigurasi proses IT Support.

---

### Phase 2 — Transaction Engine (Minggu 9–14)

**Fokus:** Create, routing, approval, assignment

| Backend | Web | Android |
|---------|-----|---------|
| POST /api/transaction | CreateTicket page (IT Support) | CreateTicket screen |
| GET /api/transaction (list + filter) | TicketList page | TransactionList screen |
| GET /api/transaction/:id | TicketDetail + timeline | TransactionDetail screen |
| PATCH /api/transaction/:id/action | Approval UI | Approval screen |
| Routing engine (baca app_routing) | — | — |
| transaction_log (catat aksi) | — | — |

**Deliverable:** User bisa buat ticket IT Support, manager approve, assign ke teknisi.

---

### Phase 3 — Technician Work & Asset (Minggu 15–20)

**Fokus:** Pengerjaan teknisi, asset link, foto, handover

| Backend | Web | Android |
|---------|-----|---------|
| POST /api/transaction/:id/log | WorkLog form | WorkExecution screen |
| Attachment upload (MinIO) | PhotoUpload component | Camera + upload |
| CRUD /api/asset | AssetSelector, AssetList | AssetChip component |
| transaction_asset link | Asset usage panel | Sparepart picker |
| Handover (update assignTo) | Handover UI | Handover action |
| Notifikasi dasar (in-app) | Notification bell | Push notification setup |

**Deliverable:** Teknisi bisa kerja, upload foto, pakai sparepart, handover ke teknisi lain.

---

### Phase 4 — SLA, KPI & Dashboard (Minggu 21–25) ✅ Selesai (dasar)

**Fokus:** Pengukuran performa

| Backend | Web | Status |
|---------|-----|--------|
| SLA calculation module | SLABadge, SLAIndicator | ✅ |
| GET /api/dashboard/:app_code + appMetrics | Dashboard per app + App Insights | ✅ |
| KPI agregasi per teknisi | Technician KPI table | ✅ |
| GET /api/report/:app_code | AppReportPage (aging, SLA, technician, sparepart) | ✅ |
| Notifikasi selesai (email) | — | 🔲 Phase lanjutan |

**Deliverable:** Dashboard & report IT Support, Engineering, ISP, GA, Vehicle, Building dengan SLA breach, MTTR, KPI teknisi, metrik khusus app.

---

### Phase 5 — Engineering & PM (Minggu 26–32)

**Fokus:** Work Order, Preventive Maintenance, scheduling

| Backend | Web | Android |
|---------|-----|---------|
| ENG_WO + ENG_PM app config | Engineering pages | WorkExecution + checklist |
| Scheduler module (PM trigger) | PM Calendar page | PM notification |
| PM compliance tracking | PM Dashboard | — |
| Sparepart usage report | Report page | — |

**Deliverable:** Engineering bisa buat WO, PM terjadwal otomatis, track compliance.

---

### Phase 6 — Integrasi (Minggu 33–40) ✅

**Fokus:** Koneksi ke sistem eksternal

| Integrasi | Status |
|-----------|--------|
| Tunas IoT (HTTP webhook + MQTT bridge) | ✅ |
| Odoo asset sync (manual + scheduled worker) | ✅ |
| Google Calendar (PM + Vehicle booking) | ✅ |
| PC24 / ISP Billing webhook | ✅ |
| Generic Custom API connector | ✅ |
| Integration worker + event queue | ✅ |
| Google Directory user sync | 🔲 |

**Deliverable:** Sensor IoT otomatis buat WO, asset sync dari Odoo/Custom API, PM & vehicle booking ke Google Calendar, panel status di Integration Marketplace.

**API baru:** `GET /api/integration/status`, `POST /api/integration/worker/run`, `POST /api/integration/events/process`, `POST /api/connector/:id/sync-custom`

---

### Phase 7 — Aplikasi Lain & Mobile Lengkap (Minggu 41–48) ✅

**Fokus:** ISP, GA, Building, Vehicle + mobile polish

| Aplikasi | Web | Android |
|----------|-----|---------|
| ISP_TICKET | Dashboard + MapView | Map (lazy) + list/create |
| GA_SUPPORT | Request form + dashboard | Create + list + dashboard |
| BUILDING_MGMT | Issue form + dashboard | Create + list + dashboard |
| VEHICLE_BOOKING | Booking form + calendar grid | Calendar + create |
| Mobile work execution | — | Log + advance/close + offline queue |
| Mobile approval & AI | — | Pending approval + AI chat |

**Deliverable:** Semua 7 aplikasi aktif di web & android shell dengan create, work execution, approval, dan AI assistant.

---

### Phase 8 — Intelligence & Scale (Minggu 49+) ✅

| Fitur | Status |
|-------|--------|
| AI Root Cause Analysis | ✅ `POST /api/ai/rca/:transactionId` |
| AI Technician Assistant | ✅ `GET /api/ai/suggestions/:transactionId` |
| Advanced reporting | ✅ `GET /api/report/cross-app` |
| REDI-OS compatibility | ✅ Connector stub + health test |
| Multi-region deployment | 🟡 `DEPLOYMENT_REGION` env (infra manual) |

**Deliverable:** RCA dari historis `transaction_log`, saran teknisi dari kasus serupa, dashboard cross-app analytics, kompatibilitas REDI-OS.

---

### Ringkasan Timeline

```
Phase 0  ████░░░░░░░░░░░░░░░░  Foundation        (selesai)
Phase 1  ░░░░████░░░░░░░░░░░░  Core Platform     (minggu 4-8)
Phase 2  ░░░░░░░░████░░░░░░░░  Transaction       (minggu 9-14)
Phase 3  ░░░░░░░░░░░░████░░░░  Technician Work   (minggu 15-20)
Phase 4  ████████████████████  SLA & KPI         ✅
Phase 5  ████████████████████  Engineering & PM  ✅
Phase 6  ████████████████████  Integrasi         ✅ (minggu 33-40)
Phase 7  ████████████████████  All Apps + Mobile ✅ (minggu 41-48)
Phase 8  ████████████████████  AI & Scale        ✅ (minggu 49+)
```

---

## 13. Quick Start Development

### Prasyarat

- Node.js 20+
- Docker & Docker Compose
- Android Studio (untuk emulator, phase mobile)

### Setup

```bash
# Clone & install
git clone <repo-url> tunas-workflow
cd tunas-workflow
npm install

# Environment
cp .env.example .env

# Infrastructure
npm run infra:up

# Database
npm run db:generate
npm run db:migrate

# Development
npm run dev          # Backend (port 3000) + Web (port 5173)
npm run dev:backend  # Backend saja
npm run dev:web      # Web saja
```

### URL Development

| Service | URL |
|---------|-----|
| Web App | http://localhost:5173 |
| API | http://localhost:3000 |
| API Health | http://localhost:3000/api/health |
| Prisma Studio | `npm run db:studio` |
| RabbitMQ UI | http://localhost:15672 |
| MinIO Console | http://localhost:9001 |

### Mulai dari Phase Berapa?

| Jika Anda ingin... | Mulai dari |
|--------------------|------------|
| Setup environment | [getting-started.md](./getting-started.md) |
| Memahami arsitektur | [architecture.md](./architecture.md) |
| Implementasi API | Phase 1 → `backend/src/core/transaction/` |
| Implementasi UI | Phase 2 → `web/src/components/atoms/` |
| Setup Android | Phase 1 → `mobile/README.md` |
| Konfigurasi integrasi | Phase 6 → `backend/src/integration/` |

---

## Dokumen Terkait

| Dokumen | Isi |
|---------|-----|
| [architecture.md](./architecture.md) | Arsitektur teknis (English) |
| [api-conventions.md](./api-conventions.md) | Konvensi REST API |
| [getting-started.md](./getting-started.md) | Setup environment |
| [../backend/README.md](../backend/README.md) | Struktur backend |
| [../web/README.md](../web/README.md) | Struktur web + Atomic Design |
| [../mobile/README.md](../mobile/README.md) | Konsep Android shell |
| [../.cursorrules](../.cursorrules) | Aturan development untuk AI assistant |

---

*Terakhir diperbarui: Juni 2026 · Tunas Workflow v1.0.0*
