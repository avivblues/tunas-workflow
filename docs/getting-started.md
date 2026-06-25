# Getting Started

Panduan setup lokal dan orientasi awal untuk **Tunas Workflow**.

> Ringkasan produk & status fitur: [README.md](../README.md)  
> Roadmap lengkap: [PANDUAN_PEMBANGUNAN.md](./PANDUAN_PEMBANGUNAN.md)

---

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 10+

---

## Setup Lokal

```bash
# 1. Clone dan install dependencies
npm install

# 2. Environment variables (Prisma membaca dari backend/.env)
cp .env.example .env
cp .env backend/.env

# 3. Jalankan Docker Desktop, lalu infra
npm run infra:up

# 4. Prisma client + migrasi + data demo
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Development servers (backend + web)
npm run dev
```

> **Catatan:** PostgreSQL berjalan di port **5436** (bukan 5432) agar tidak bentrok dengan Postgres lokal. Pastikan Docker Desktop aktif sebelum `infra:up`.

---

## URL Development

| Service | URL |
|---------|-----|
| Web | http://localhost:5173 |
| API | http://localhost:3000 |
| API Health | http://localhost:3000/api/health |
| RabbitMQ UI | http://localhost:15672 (guest/guest) |
| MinIO Console | http://localhost:9001 |

---

## Kredensial Demo

Setelah `npm run db:seed`:

| Field | Value |
|-------|-------|
| Tenant Code | `01` |
| Admin | `admin` / `admin123` |
| Manager | `manager` / `manager123` |
| Technician | `tech` / `tech123` |

---

## Workspace Commands

```bash
npm run dev              # Backend + web bersamaan
npm run dev:backend      # Backend saja
npm run dev:web          # Web saja
npm run lint             # Lint semua workspace
npm run typecheck        # Type-check semua workspace
npm run db:studio        # Prisma Studio
npm run infra:up         # Start Docker infra
npm run infra:down       # Stop Docker infra
```

### Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

Default API mobile mengarah ke production (`http://103.94.238.207:3050/api`). Untuk lokal, sesuaikan di `mobile/src/services/api-client.ts` atau env Expo.

---

## Struktur Proyek

```
tunas-workflow/
├── backend/              # Node.js + Fastify + Prisma
│   ├── prisma/           # Schema, migrations, seed, menu-defaults.json
│   └── src/
│       ├── core/         # transaction, routing, sla, notification, scheduler
│       ├── master/       # tenant, user, asset, menu
│       ├── integration/  # odoo, google, isp, tunas-iot, ai, connector
│       └── api/routes/   # REST endpoints
├── web/                  # React 19 + TypeScript + Vite
│   └── src/
│       ├── components/   # atoms, molecules, organisms, templates
│       ├── pages/        # Per aplikasi + admin + AI
│       └── services/     # API clients
├── mobile/               # React Native (Expo) shell app
├── infra/                # Docker Compose (dev + prod)
├── deploy/               # deploy.sh untuk VPS
└── docs/                 # Dokumentasi
```

---

## Apa yang Bisa Dicoba Setelah Login

### Aplikasi operasional (sidebar)

| Menu | Path | app_code |
|------|------|----------|
| IT Support | `/it-support/tickets` | `IT_SUPPORT` |
| ISP Ticket | `/isp/tickets` | `ISP_TICKET` |
| ISP Map | `/isp/map` | `ISP_TICKET` |
| Engineering WO | `/engineering/work-orders` | `ENG_WO` |
| PM Tasks / Calendar | `/engineering/pm` | `ENG_PM` |
| GA Support | `/ga/requests` | `GA_SUPPORT` |
| Building | `/building/issues` | `BUILDING_MGMT` |
| Vehicle Booking | `/vehicle/bookings` | `VEHICLE_BOOKING` |
| Approvals | `/approvals` | — |

### Admin (role `TENANT_ADMIN`)

| Menu | Path |
|------|------|
| App Config | `/admin/apps` |
| Menu Config | `/admin/menu` |
| Users / Domains | `/admin/users`, `/admin/domains` |
| Integrations | `/admin/integrations` |

### AI

| Menu | Path | Fungsi |
|------|------|--------|
| AI Assistant | `/ai-assistant` | Q&A maintenance, laporan harian/mingguan/bulanan |
| Koneksi AI | `/ai-settings` | Hubungkan API key ChatGPT atau Gemini (per user) |

Tanpa API key LLM, AI Assistant tetap jalan dalam mode **Smart Analytics** (data dari transaksi & work log).

---

## Deploy Production

Demo live: **http://103.94.238.207:3050**

```bash
# Siapkan SSH key (contoh: /tmp/ispkita_key)
bash deploy/deploy.sh
```

Container backend otomatis menjalankan `prisma migrate deploy` dan `db:seed` saat start.

Setelah deploy pertama atau penambahan menu baru:

```bash
# Di VPS, jika perlu seed ulang menu
sudo docker compose -f infra/docker-compose.prod.yml exec backend npm run db:seed
```

Atau dari admin web: **Menu Config → Reset Defaults**.

---

## Environment Variables Penting

Lihat [`.env.example`](../.env.example) untuk daftar lengkap.

```env
DATABASE_URL=postgresql://tunas:tunas_secret@localhost:5436/tunas_workflow
JWT_SECRET=change-me-in-production
VITE_API_BASE_URL=http://localhost:3000/api

# AI (opsional — fallback platform)
AI_ENABLED=true
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

API key LLM **per user** dikonfigurasi lewat halaman **Koneksi AI**, disimpan terenkripsi di database — tidak perlu satu key untuk semua user di `.env`.

---

## Status Phase (Ringkas)

| Phase | Fokus | Status |
|-------|-------|--------|
| 0–3 | Foundation, transaction, technician work | ✅ |
| 4 | SLA & dashboard + reports | ✅ |
| 5 | Engineering & PM | ✅ |
| 6 | Integrasi (Odoo, IoT, ISP, Google) | 🟡 Kode ada, perlu setup tenant |
| 7 | Semua app + mobile | 🟡 Web lengkap, mobile partial |
| 8 | AI & scale | 🟡 AI Assistant ada, RCA belum |

---

## Dokumentasi Lanjutan

- [architecture.md](./architecture.md) — konsep arsitektur
- [api-conventions.md](./api-conventions.md) — format API & error codes
- [PANDUAN_PEMBANGUNAN.md](./PANDUAN_PEMBANGUNAN.md) — visi, fitur inti, roadmap 8 phase
