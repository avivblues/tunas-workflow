# Production Checklist — Tunas Workflow

Gunakan sebelum go-live production (bukan environment demo).

---

## 1. Keamanan & autentikasi

| Item | Demo | Production |
|------|------|------------|
| `JWT_SECRET` | default | **Ganti** string panjang acak |
| ISP webhook / API key | `tunas-demo-webhook-secret-2024` | **Key unik per tenant** |
| IoT webhook secret | sama dengan demo | **Key terpisah** |
| Password admin default | `admin123` | **Ganti** semua user demo |
| HTTPS | HTTP :3050 | **TLS** (reverse proxy / cert) |

---

## 2. Database & deploy

- [ ] `bash deploy/deploy.sh` sukses tanpa error migrate
- [ ] Seed otomatis: **matikan** atau gunakan seed production terpisah (jangan timpa data live)
- [ ] Backup PostgreSQL terjadwal
- [ ] `.env` production **tidak** di-commit ke git

---

## 3. Integrasi ISP

- [ ] Connector **ISP Billing** ter-install di Marketplace tenant production
- [ ] Tim ISP punya: tenant code, API key, Swagger URL
- [ ] UAT lulus: `bash scripts/isp-partner-api-test.sh` (dengan `API_KEY` production)
- [ ] Checklist manual: [ISP-UAT-CHECKLIST.md](./ISP-UAT-CHECKLIST.md)
- [ ] Callback URL ISP (jika dipakai) diisi + diuji
- [ ] Panduan tim ISP: [ISP-INTEGRATION-GUIDE.md](./ISP-INTEGRATION-GUIDE.md)

---

## 4. Integrasi IoT (jika aktif)

- [ ] `MQTT_ENABLED=true` + `MQTT_BROKER_URL` benar
- [ ] Domain links di Marketplace → enable zone yang dipakai
- [ ] `min_severity=CRITICAL` untuk auto-WO MQTT
- [ ] Asset `device_id` sudah ada di master asset (**setelah link asset**)

---

## 5. Aplikasi & konfigurasi tenant

- [ ] `app_process` / `app_routing` disesuaikan per PT
- [ ] Menu navigasi (`/admin/applications`) sesuai divisi
- [ ] Domain hierarchy (`domain_node`) lengkap untuk lokasi operasional
- [ ] User & role: admin, manager, teknisi, requester

---

## 6. Monitoring

| URL | Fungsi |
|-----|--------|
| `/api/health` | API hidup |
| `/api/docs` | Dokumentasi integrasi |
| `/api/integration/status` | Status connector + MQTT (login admin) |

---

## 7. Post go-live

- [ ] Monitor SLA breach di dashboard per app
- [ ] Review laporan bulanan (`/isp/reports`, export CSV)
- [ ] Dokumentasikan work log teknisi (untuk AI Insights / kasus serupa)
- [ ] Rencanakan link asset ONT/modem (**fase berikutnya**)

---

## Referensi cepat

| Dokumen | Untuk siapa |
|---------|-------------|
| [ISP-INTEGRATION-GUIDE.md](./ISP-INTEGRATION-GUIDE.md) | Tim development ISP |
| [integration-api.md](./integration-api.md) | Ringkasan API integrasi |
| [ISP-UAT-CHECKLIST.md](./ISP-UAT-CHECKLIST.md) | QA sebelum go-live |
| [getting-started.md](./getting-started.md) | Developer lokal |
