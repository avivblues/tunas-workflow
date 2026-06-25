# ISP Partner API — UAT Checklist

Gunakan sebelum go-live integrasi ISP Billing ↔ Tunas Workflow.

**Environment demo:** http://103.94.238.207:3050  
**Swagger:** http://103.94.238.207:3050/api/docs  
**Tenant:** `01` · **API Key demo:** `tunas-demo-webhook-secret-2024`

---

## Otomatis (smoke test)

```bash
bash scripts/isp-partner-api-test.sh
```

Atau dengan key production:

```bash
API_KEY=your-production-key \
API_ROOT=https://your-domain/api \
BASE_URL=https://your-domain/api/integration/isp/01 \
bash scripts/isp-partner-api-test.sh
```

---

## Manual — Webhook inbound

| # | Skenario | Expected | ✓ |
|---|----------|----------|---|
| 1 | POST webhook `ISP_TICKET` + `customer_name` + `area` | 201, `trx_no` baru | |
| 2 | POST webhook tanpa `app_code` | Default `ISP_TICKET` | |
| 3 | POST `ENG_PM` / `GA_SUPPORT` / `VEHICLE_BOOKING` | 201, `app_code` sesuai | |
| 4 | Secret salah | 401 `WEBHOOK_UNAUTHORIZED` | |
| 5 | Duplicate `event_id` (jika dikirim) | Idempotent / tidak duplikat | |

---

## Manual — Partner API (pull)

| # | Skenario | Expected | ✓ |
|---|----------|----------|---|
| 6 | GET `/tickets?app_code=ISP_TICKET` | List + pagination | |
| 7 | GET `/tickets/{trxNo}` | Detail + logs + transitions | |
| 8 | Filter `status=OPEN`, `area=`, `since=` | Hasil terfilter | |
| 9 | GET `/processes` dan `?app_code=ENG_PM` | Flow proses | |

---

## Manual — Partner API (push update)

| # | Skenario | Expected | ✓ |
|---|----------|----------|---|
| 10 | PATCH ADVANCE ke proses berikutnya | `current_process` berubah | |
| 11 | PATCH ASSIGN + `assign_to` | Assignee terisi | |
| 12 | POST `/logs` catatan teknisi | Log muncul di detail | |
| 13 | PATCH CLOSE | Status closed | |

---

## Manual — Laporan

| # | Skenario | Expected | ✓ |
|---|----------|----------|---|
| 14 | GET `report?type=complaint&period=month` | Ringkasan komplain | |
| 15 | GET `report?type=sla&period=year` | Metrik SLA | |
| 16 | GET `reports/bundle` | complaint + sla + asset_usage | |
| 17 | Export CSV dari web `/isp/reports` | File terunduh | |

---

## Manual — Web UI Tunas

| # | Skenario | Expected | ✓ |
|---|----------|----------|---|
| 18 | Login tenant `01` / admin | Dashboard ISP tampil | |
| 19 | Dashboard ISP: komplain bulan ini, area, repeat customer | Metrik terisi | |
| 20 | Integration Marketplace → ISP → Configure | Panel API + Swagger link | |
| 21 | Detail tiket → tab AI Insights | RCA / kasus serupa (jika ada historis) | |

---

## Callback outbound (opsional — belum production)

| # | Skenario | Expected | ✓ |
|---|----------|----------|---|
| 22 | Isi Callback URL di Marketplace | Status ISP "Terhubung" | |
| 23 | Update status tiket | POST ke URL ISP dengan `X-Callback-Secret` | |

> Saat development: integrasi **pull-only** (ISP memanggil Tunas) sudah cukup.

---

## Sign-off

| Role | Nama | Tanggal | Tanda |
|------|------|---------|-------|
| Tim ISP Billing | | | |
| Tim Tunas Workflow | | | |
