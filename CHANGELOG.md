# Changelog

## 0.2.0 — Pembaruan besar (Frontend + API + Python)

### Breaking
- `hapilibur.is_libur(..., include_cuti=False)` kini benar-benar mengecualikan cuti bersama (sebelumnya selalu True).
- Versi package Python & npm naik ke `0.2.0`.

### Ditambahkan
- `hapilibur.check_detail(date)` → `{date, name, jenis[]}`.
- `hapilibur.to_csv(entries)` + flag CLI `--json/--csv`.
- `GET /api/libur`: `count` (untuk `next`), `type=all|libur|cuti`, `from/to` (rentang).
- `GET /api/health`, `GET /api/openapi.json` (spesifikasi OpenAPI 3.1).
- Landing page baru: search, filter jenis, deep-link `?date=&month=`, playground dengan status HTTP + salin cURL, PWA manifest, sitemap dinamis.
- `public/openapi.json` + `public/manifest.webmanifest` hasil generate.

### Diperbaiki
- `lib/load.ts`: path absolut via file URL + cache di memori.
- `api/imsak.ts`: daftar kota fallback dinamis (tidak hardcode).
- `api/kota.ts`: regex dukung slug `a-z0-9-`, kapitalisasi tiap kata.
- `lib/ics.ts`: UID unik per event, `DESCRIPTION`, escape nama kalender.
- `scripts/generate.py`: log sumber → tujuan yang jelas.
- Security & cache headers: `OPTIONS` 204, `stale-while-revalidate`, `X-Content-Type-Options`.

## 0.1.0 — Rilis awal
- Dataset 2026 (17 libur + 8 cuti), imsakiyah Jakarta & Surabaya.
- REST API Vercel (`/api/libur`, `/api/imsak`, `/api/kota`, `/api/libur.ics`).
- Library & CLI Python `hapilibur`, landing statis, CI validasi.
