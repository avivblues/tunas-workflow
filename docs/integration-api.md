# Tunas Workflow — Integration API

Dokumen ini untuk tim **ISP Billing** dan **Tunas IoT** agar bisa terhubung ke Tunas Workflow.

> **Tim ISP:** gunakan panduan lengkap step-by-step → **[ISP-INTEGRATION-GUIDE.md](./ISP-INTEGRATION-GUIDE.md)**

Base URL production: `http://103.94.238.207:3050/api`  
Base URL lokal: `http://localhost:3000/api`

---

## Autentikasi Webhook

Semua endpoint integrasi eksternal memakai header:

| Header | Nilai |
|--------|--------|
| `Content-Type` | `application/json` |
| `X-Webhook-Secret` | Secret dari connector (lihat Marketplace → Installed Connectors) |

Tenant diidentifikasi lewat path URL: `/{tenantCode}/...`  
Contoh tenant demo: `01`

Secret demo (setelah seed): `tunas-demo-webhook-secret-2024`

---

## 6b — ISP Billing → Auto Ticket

**Flow:** Billing system kirim webhook → Tunas buat `ISP_TICKET` otomatis.

### Endpoint

```
POST /api/integration/isp/{tenantCode}/webhook
```

### Request body

```json
{
  "event": "CUSTOMER_COMPLAINT",
  "customer_id": "CUST-1001",
  "customer_name": "Budi Santoso",
  "area": "Cluster A",
  "device_serial": "ONT-8821",
  "description": "Internet putus sejak pagi, lampu LOS merah",
  "priority": "HIGH",
  "title": "Optional custom title"
}
```

### Field

| Field | Wajib | Keterangan |
|-------|-------|------------|
| `event` | Ya | `CUSTOMER_COMPLAINT` \| `DEVICE_OFFLINE` \| `PACKAGE_ISSUE` |
| `customer_name` | Ya | Nama pelanggan |
| `area` | Ya | Area/cluster — dicocokkan ke `domain_node` jika ada |
| `description` | Ya | Detail keluhan |
| `customer_id` | Tidak | ID pelanggan di billing |
| `device_serial` | Tidak | Serial ONT/CPE — dicocokkan ke `asset` |
| `priority` | Tidak | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` (default: MEDIUM) |
| `title` | Tidak | Judul tiket custom |

### Response sukses (201)

```json
{
  "success": true,
  "data": {
    "event_id": "uuid-event-queue",
    "transaction_id": "uuid",
    "trx_no": "TW00042",
    "app_code": "ISP_TICKET"
  },
  "message": "ISP ticket created"
}
```

### Contoh cURL

```bash
curl -X POST "http://103.94.238.207:3050/api/integration/isp/01/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: tunas-demo-webhook-secret-2024" \
  -d '{
    "event": "DEVICE_OFFLINE",
    "customer_name": "Budi Santoso",
    "area": "Cluster A",
    "device_serial": "ONT-8821",
    "description": "ONT offline terdeteksi billing",
    "priority": "HIGH"
  }'
```

---

## 6b-2 — ISP Partner API (Pull + Push)

**Bundle aplikasi ISP:** `ISP_TICKET`, `ENG_PM` (PM), `GA_SUPPORT`, `VEHICLE_BOOKING`.

**Autentikasi:** header `X-Api-Key` atau `X-Webhook-Secret` (nilai dari connector ISP).

**Base path:** `/api/integration/isp/{tenantCode}`

### Pull — baca data dari Tunas

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/tickets` | List transaksi (semua app bundle, atau filter `?app_code=`) |
| `GET` | `/tickets/{trxNo}` | Detail + logs + available transitions |
| `GET` | `/report?app_code=ISP_TICKET&type=aging\|sla\|technician&days=30` | Reporting per app |
| `GET` | `/processes` | Flow semua app bundle (`?app_code=` untuk satu modul) |

**Query list tickets:** `app_code`, `status`, `process`, `area`, `customer_id`, `since` (ISO datetime), `page`, `limit`

```bash
curl "http://103.94.238.207:3050/api/integration/isp/01/tickets?status=OPEN&process=WORKING" \
  -H "X-Api-Key: tunas-demo-webhook-secret-2024"
```

### Push — update status dari aplikasi ISP

```
PATCH /api/integration/isp/{tenantCode}/tickets/{trxNo}
```

```json
{
  "action": "ADVANCE",
  "to_process": "DISPATCH",
  "comment": "Dispatched to field team",
  "operator": "ISP-NOC-01"
}
```

| action | Keterangan |
|--------|------------|
| `ADVANCE` | Pindah ke proses berikutnya (`to_process` wajib jika ada banyak routing) |
| `ASSIGN` | Assign teknisi (`assign_to` = user UUID) |
| `CLOSE` | Tutup tiket |
| `REJECT` | Tolak tiket |

**Flow proses per app** — lihat `GET /processes`. Contoh `ISP_TICKET`:

`REQUEST` → `ASSIGN` → `DISPATCH` → `WORKING` → `RESOLVED` → `CLOSE`

**Webhook create** — tambahkan `app_code` untuk PM / GA / Vehicle:

```json
{
  "app_code": "GA_SUPPORT",
  "title": "Permintaan ATK",
  "description": "Stok kertas A4 habis di lantai 3"
}
```

Untuk `ISP_TICKET`, field `customer_name` dan `area` tetap wajib (backward compatible).

### Push — tambah log/catatan teknisi

```
POST /api/integration/isp/{tenantCode}/tickets/{trxNo}/logs
```

```json
{
  "action": "FIELD_NOTE",
  "description": "ONT diganti, sinyal normal",
  "operator": "tech-ahmad"
}
```

### Outbound callback (Tunas → ISP)

Set **Callback URL** di Integration Marketplace → ISP connector.

Tunas akan `POST` ke URL ISP saat:

| Event | Trigger |
|-------|---------|
| `TICKET_CREATED` | Webhook create / tiket baru |
| `TICKET_STATUS_CHANGED` | Proses berubah |
| `TICKET_CLOSED` | Tiket ditutup |
| `TICKET_LOG_ADDED` | Log baru ditambahkan |

**Header callback:** `X-Callback-Secret` (jika dikonfigurasi)

**Payload contoh:**

```json
{
  "event": "TICKET_STATUS_CHANGED",
  "trx_no": "TW00042",
  "transaction_id": "uuid",
  "app_code": "ISP_TICKET",
  "status": "OPEN",
  "current_process": "WORKING",
  "from_process": "DISPATCH",
  "to_process": "WORKING",
  "customer_id": "CUST-1001",
  "customer_name": "Budi Santoso",
  "area": "Cluster A",
  "priority": "HIGH",
  "sla_status": "ON_TRACK",
  "updated_at": "2026-06-25T12:00:00.000Z",
  "operator": "ISP-NOC-01",
  "comment": "Teknisi sudah di lapangan"
}
```

---

## 6c — Tunas IoT → Engineering Work Order

**Flow yang disarankan:**

1. Alert muncul di dashboard Tunas IoT
2. Operator pilih **Create Work Order** atau **Dismiss**
3. Jika create → Tunas IoT panggil API ini
4. Tunas Workflow buat `ENG_WO` + link asset

> IoT **tidak** auto-create WO tanpa konfirmasi operator.

### Endpoint

```
POST /api/integration/iot/{tenantCode}/work-order
```

### Request body

```json
{
  "event_id": "iot-alert-20240624-001",
  "asset_code": "CNC-ALPHA-01",
  "title": "Spindle temperature high",
  "description": "Sensor S-12 membaca 85°C, threshold 75°C",
  "severity": "HIGH",
  "domain_code": "01.L01.Z01",
  "operator": "andi.tech",
  "metadata": {
    "sensor_id": "S-12",
    "value": 85,
    "unit": "C",
    "threshold": 75
  }
}
```

### Field

| Field | Wajib | Keterangan |
|-------|-------|------------|
| `event_id` | Ya | ID unik alert — untuk idempotency (panggil ulang = tidak duplikat) |
| `asset_code` | Ya | Harus sudah ada di master `asset` Tunas Workflow |
| `title` | Ya | Judul work order |
| `description` | Ya | Detail masalah |
| `severity` | Tidak | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` → priority WO |
| `domain_code` | Tidak | Lokasi; fallback ke `asset.locationCode` |
| `operator` | Tidak | Username operator yang konfirmasi |
| `metadata` | Tidak | Data sensor mentah (disimpan di transaction detail) |

### Response sukses — WO baru (201)

```json
{
  "success": true,
  "data": {
    "duplicate": false,
    "transaction_id": "uuid",
    "trx_no": "TW00043",
    "app_code": "ENG_WO",
    "domain_code": "01.L01.Z01"
  },
  "message": "Work order created"
}
```

### Response duplikat (200)

Jika `event_id` sama sudah pernah diproses:

```json
{
  "success": true,
  "data": {
    "duplicate": true,
    "transaction_id": "uuid-existing",
    "trx_no": "TW00043",
    "app_code": "ENG_WO"
  },
  "message": "Work order already exists"
}
```

### Error umum

| HTTP | errorCode | Penyebab |
|------|-----------|----------|
| 401 | WEBHOOK_UNAUTHORIZED | Secret salah |
| 404 | ASSET_NOT_FOUND | `asset_code` belum ada di Tunas |
| 404 | CONNECTOR_NOT_INSTALLED | Connector IoT belum di-install di Marketplace |

### Contoh cURL

```bash
curl -X POST "http://103.94.238.207:3050/api/integration/iot/01/work-order" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: tunas-demo-webhook-secret-2024" \
  -d '{
    "event_id": "iot-alert-20240624-001",
    "asset_code": "CNC-ALPHA-01",
    "title": "Spindle temperature high",
    "description": "Sensor S-12 membaca 85°C",
    "severity": "HIGH",
    "operator": "andi.tech"
  }'
```

---

## 6c-2 — MQTT Telemetry (auto WO dari threshold)

Selain HTTP webhook, Tunas Workflow subscribe MQTT broker Tunas IoT. Satu **device** bisa mengirim **banyak sensor** dalam satu payload JSON (field bernomor: `temperature_1`, `voltage_5`, dll).

### Topic pattern

```
tunas/{tenantCode}/telemetry
tunas/{tenantCode}/{location}/{zone}/telemetry
tunas/{tenantCode}/iot/alert
```

Contoh tenant `01`, zone `01.L01.Z01`:

```
tunas/01/L01/Z01/telemetry
```

### Payload contoh (multi-sensor)

```json
{
  "device_id": "TUNAS-POWER",
  "hierarchy_code": "01.L01.Z01",
  "temperature_1": 32.7,
  "humidity_1": 61.2,
  "temperature_2": 32.9,
  "voltage_1": 221.8,
  "current_1": 0,
  "power_1": 0,
  "frequency_1": 50
}
```

| Field | Keterangan |
|-------|------------|
| `device_id` | Di-mapping ke `asset_code` — harus ada di master asset Workflow |
| `hierarchy_code` | Opsional jika topic sudah spesifik zone; override lokasi WO |
| `temperature_N` / `humidity_N` / `voltage_N` | Nilai numerik per sensor — dipakai threshold rule |

### Threshold rule

Atur di **Integrations → Tunas IoT → Threshold rules**. Nama field rule harus **persis** sama dengan key di payload, misal:

| Field rule | Operator | Value | Arti |
|------------|----------|-------|------|
| `temperature_1` | `gt` | `45` | WO jika suhu sensor 1 > 45°C |
| `voltage_1` | `lt` | `200` | WO jika tegangan phase 1 < 200V |

> **Gauge & add device** dikelola di aplikasi **Tunas IoT** (dashboard). Tunas Workflow hanya menerima telemetry/alert dan membuat `ENG_WO` saat threshold terpenuhi atau operator konfirmasi via HTTP API.

---

## 6a — Odoo Asset Sync (internal)

Odoo disinkronkan dari admin UI, bukan webhook eksternal.

1. Install connector **Odoo ERP** di Marketplace
2. Isi URL, database, username, API key
3. Klik **Test Connection** lalu **Sync Assets**

Asset dari Odoo di-upsert ke tabel `asset` berdasarkan `asset_code` (default: field `serial_no`).

---

## Marketplace & Connector Admin

| Endpoint | Auth | Fungsi |
|----------|------|--------|
| `GET /api/connector/marketplace` | JWT | Katalog apps |
| `GET /api/connector` | JWT | Connector terinstall |
| `POST /api/connector` | JWT | Install connector |
| `PATCH /api/connector/:id` | JWT | Update config / enable-disable |
| `POST /api/connector/:id/test` | JWT | Test koneksi Odoo / Slack / Teams |
| `POST /api/connector/:id/sync-assets` | JWT | Sync asset dari Odoo |

UI: **Integrations** di sidebar admin.

---

## Slack — Outbound Notifications

Slack adalah connector **outbound**: Tunas Workflow mengirim pesan ke Slack Incoming Webhook Anda.

### Setup

1. Di Slack: **Apps → Incoming Webhooks** → buat webhook untuk channel (mis. `#it-support`)
2. Di Tunas: **Integrations → Slack → Install**
3. Paste **Incoming Webhook URL**
4. Klik **Test Connection** — pesan test akan muncul di channel

### Event yang dikirim otomatis

| Event | Trigger |
|-------|---------|
| `TRANSACTION_CREATED` | Ticket/WO baru (web, ISP webhook, Tunas IoT) |
| `TRANSACTION_ASSIGNED` | Teknisi di-assign |
| `TRANSACTION_CLOSED` | Ticket/WO di-close |
| `SLA_BREACHED` | Close dengan status SLA breached |

Tidak perlu endpoint webhook masuk ke Tunas untuk Slack.

---

## Microsoft Teams — Outbound Notifications

Teams menggunakan pola yang sama dengan Slack: Tunas kirim **MessageCard** ke Incoming Webhook Teams.

### Setup

1. Di Teams: buka channel → **Connectors → Incoming Webhook**
2. Di Tunas: **Integrations → Microsoft Teams → Install**
3. Paste **Webhook URL**
4. Klik **Test Connection**

Event yang dikirim sama dengan Slack. Jika Slack dan Teams keduanya terinstall, notifikasi dikirim ke keduanya.

---

## Google Calendar — PM Schedule Sync

Sinkronkan jadwal **Preventive Maintenance** ke Google Calendar menggunakan Service Account.

### Setup Google Cloud

1. Buat project di [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google Calendar API**
3. Buat **Service Account** → download JSON key
4. Di Google Calendar: **Share calendar** ke email service account (`client_email` dari JSON) dengan permission **Make changes to events**
5. Di Tunas: **Integrations → Google Calendar → Install**
6. Isi **Calendar ID** (email calendar atau `primary`)
7. Paste **Service Account JSON** lengkap
8. Klik **Test Connection** lalu **Sync PM Calendar**

### Perilaku sync

| Aksi | Hasil |
|------|--------|
| Buat/edit PM Schedule | Event Google Calendar di-update otomatis |
| PM Schedule nonaktif | Event dihapus dari calendar |
| Sync PM Calendar (manual) | Sync semua jadwal sekaligus |

Event title format: `[PM] {judul schedule}` — waktu mengikuti `nextRunAt`.

### API

```
POST /api/connector/:id/sync-calendar   (JWT)
POST /api/connector/:id/test              (JWT, type GOOGLE_CALENDAR)
```

---

## AnyDesk — Remote Support

Tampilkan ID AnyDesk di halaman ticket dan sertakan di notifikasi **assignment** (Slack/Teams).

### Setup

1. **Integrations → AnyDesk → Install**
2. Isi **Support Team AnyDesk ID** (ID tim IT/support Anda)
3. Opsional: Technician ID default, custom message
4. Buka ticket mana saja → card **Remote Support (AnyDesk)** muncul
5. Saat assign ticket → notifikasi Slack/Teams menyertakan AnyDesk ID

AnyDesk tidak punya API publik untuk remote control — integrasi ini fokus pada **menampilkan ID** dan link download agar teknisi/customer bisa connect.

---

### ISP Billing / Partner API
- [ ] Install connector ISP di Marketplace
- [ ] Simpan `X-Webhook-Secret` / `X-Api-Key` di aplikasi ISP
- [ ] Import Postman collection: `docs/postman/ISP-Partner-API.postman_collection.json`
- [ ] Jalankan smoke test: `bash scripts/isp-partner-api-test.sh`
- [ ] Set **Callback URL** di Marketplace (untuk push status Tunas → ISP)
- [ ] Trigger webhook saat: complaint baru, device offline, package issue
- [ ] Sync status via `PATCH /tickets/{trxNo}` atau terima callback outbound
- [ ] Poll `GET /tickets?since=...` untuk sinkronisasi berkala
- [ ] Reporting: `GET /report?type=sla|aging|technician`
- [ ] Simpan `trx_no` dari response untuk referensi di billing

### Tunas IoT
- [ ] Install connector Tunas IoT di Marketplace
- [ ] Pastikan `asset_code` di IoT = `asset_code` di Tunas Workflow
- [ ] UI konfirmasi operator sebelum POST work-order
- [ ] Kirim `event_id` unik per alert (UUID atau `{device}-{timestamp}`)
- [ ] Simpan `trx_no` dari response untuk deep-link ke WO
