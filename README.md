# 🇮🇩 data-libur-nasional-indonesia

**Dataset & REST API hari libur nasional, cuti bersama, dan jadwal imsakiyah Indonesia (2026).**
Data murni JSON — bisa langsung dipakai di bahasa apa pun, plus pustaka dan CLI Python, plus API gratis.

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue)](#library--cli-python)
[![API](https://img.shields.io/badge/API-Vercel-000?logo=vercel)](#rest-api)
[![License](https://img.shields.io/badge/License-MIT-green)](#lisensi)
![Cuti Bersama 2026](https://img.shields.io/badge/Cuti%20Bersama%202026-8%20hari-9ca3af)
![Libur Nasional 2026](https://img.shields.io/badge/Libur%20Nasional%202026-17%20hari-38bdf8)

---

## Isi

- 17 **hari libur nasional 2026** (SKB 3 Menteri No. 1497, 2, 5 Tahun 2025)
- 8 **cuti bersama 2026**
- Jadwal **imsakiyah Ramadan 1447 H / 2026 M** kota **Jakarta** & **Surabaya** (Bimas Islam Kemenag)
- Library & CLI **Python** (`hapilibur`)
- **REST API** gratis (Vercel)

## Cara pakai data JSON

Semua data ada tanpa framework — tinggal unduh dan parse:

| File | Isi |
|------|-----|
| [`data/libur-nasional.json`](data/libur-nasional.json) | Hari libur nasional per tahun |
| [`data/cuti-bersama.json`](data/cuti-bersama.json) | Cuti bersama per tahun |
| [`data/imsak/jakarta-2026.json`](data/imsak/jakarta-2026.json) | Imsakiyah Jakarta |
| [`data/imsak/surabaya-2026.json`](data/imsak/surabaya-2026.json) | Imsakiyah Surabaya |

```bash
curl https://raw.githubusercontent.com/kiraadityaa/data-libur-nasional-indonesia/main/data/libur-nasional.json
```

## REST API

Base URL: `https://data-libur-nasional-indonesia.vercel.app` (dokumentasi di **`/`**)

### Cek satu tanggal

```http
GET /api/libur?date=2026-08-17
```

```json
{
  "date": "2026-08-17",
  "is_holiday": true,
  "libur_nasional": { "date": "2026-08-17", "name": "Hari Proklamasi Kemerdekaan RI" },
  "cuti_bersama": null
}
```

### Seluruh libur setahun

```http
GET /api/libur?year=2026
```

### Jadwal imsakiyah

```http
GET /api/imsak?city=jakarta&year=2026
```

Kota tersedia saat ini: `jakarta`, `surabaya`. Setiap item memuat `imsak, subuh, zuhur, ashar, magrib, isya`.

## Library & CLI Python

Instal dari source:

```bash
pip install .
```

```python
from hapilibur import is_libur, libur, imsak, upcoming

is_libur("2026-08-17")      # True
libur(2026)[:2]
# [{'date': '2026-01-01', 'name': 'Tahun Baru 2026 Masehi'}, ...]

jadwal = imsak("jakarta", 2026)
jadwal["schedule"][0]
# {'day': 1, 'date': '2026-02-19', 'imsak': '04:31', 'subuh': '04:41', ...}

upcoming()                  # libur terdekat sejak hari ini
```

CLI:

```bash
hapilibur check 2026-08-17   # 2026-08-17: Hari Proklamasi Kemerdekaan RI
hapilibur tahun 2026         # daftar libur nasional 2026
hapilibur imsak jakarta 2026 # jadwal imsakiyah Jakarta
hapilibur kota               # daftar kota yang tersedia
```

## Kontribusi data tahun baru

1. Tambahkan data ke [`data/libur-nasional.json`](data/libur-nasional.json) & [`data/cuti-bersama.json`](data/cuti-bersama.json).
2. Jalankan `python3 scripts/validate.py` — wajib lolos.
3. Jalankan `python3 scripts/generate.py` agar copy di package ikut tersinkron.
4. Buat pull request. ✨

## Keterbatasan & sumber data

- Data libur mengikuti **SKB 3 Menteri** yang bisa direvisi pemerintah (misal penambahan cuti bersama).
- Jadwal imsakiyah memakai data **Bimas Islam Kemenag**; Rukyatul Hilal bisa menggeser awal Ramadan, jadi beda ±1 hari dimungkinkan untuk tahun berikutnya.
- Data **2027** (SKB tahun 2027) akan ditambahkan begitu SKB resmi diumumkan (± September–Oktober 2026).

## Sumber resmi

- [SKB 3 Menteri — Hari Libur Nasional & Cuti Bersama 2026 (PDF)](https://www.kemenkopmk.go.id/sites/default/files/pengumuman/2025-09/SKB%20Libur%20Nasional%20dan%20Cuti%20Bersama%20Tahun%202026.pdf)
- [Bimas Islam Kementerian Agama RI — jadwal imsakiyah](https://bimasislam.kemenag.go.id)

## Lisensi

MIT — lihat [LICENSE](LICENSE). Data publik bersumber dari instansi pemerintah; atribusi tetap dicantumkan.