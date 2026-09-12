# 🇮🇩 data-libur-nasional-indonesia

**Dataset & REST API hari libur nasional, cuti bersama, dan jadwal imsakiyah Indonesia (2026).**
Data murni JSON — bisa langsung dipakai di bahasa apa pun, plus pustaka dan CLI Python, plus API gratis.

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue)](#library--cli-python)
[![API](https://img.shields.io/badge/API-Vercel-000?logo=vercel)](#rest-api)
[![CI](https://img.shields.io/github/actions/workflow/status/kiraadityaa/data-libur-nasional-indonesia/ci.yml?label=CI)](https://github.com/kiraadityaa/data-libur-nasional-indonesia/actions)
[![License](https://img.shields.io/badge/License-MIT-green)](#lisensi)
![Cuti Bersama 2026](https://img.shields.io/badge/Cuti%20Bersama%202026-8%20hari-9ca3af)
![Libur Nasional 2026](https://img.shields.io/badge/Libur%20Nasional%202026-17%20hari-38bdf8)

---

## Isi

- 17 **hari libur nasional 2026** (SKB 3 Menteri No. 1497, 2, 5 Tahun 2025)
- 8 **cuti bersama 2026**
- Jadwal **imsakiyah Ramadan 1447 H / 2026 M** kota **Jakarta** & **Surabaya** (Bimas Islam Kemenag)
- Library & CLI **Python** (`hapilibur`)
- **REST API** gratis (Vercel): JSON, CSV, dan iCalendar (.ics)

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

Base URL: `https://data-libur-nasional-indonesia.vercel.app` (dokumentasi interaktif di **`/`**)

### 1. Cek satu tanggal — `GET /api/libur?date=YYYY-MM-DD`

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

### 2. Seluruh libur setahun — `GET /api/libur?year=2026`

Response memuat `libur_nasional`, `cuti_bersama`, dan total keduanya. Tambahkan `&format=csv` untuk output CSV (Excel-friendly).

### 3. Libur satu bulan — `GET /api/libur?year=2026&month=3`

Semua tanggal libur (nasional + cuti bersama) pada bulan Maret 2026.

### 4. Libur berikutnya — `GET /api/libur?next=1&date=YYYY-MM-DD`

Libur terdekat sejak tanggal yang diberikan (default: hari ini, zona Asia/Jakarta).

### 5. Jadwal imsakiyah — `GET /api/imsak?city=jakarta&year=2026`

| Parameter | Contoh |
|-----------|--------|
| `city` | `jakarta`, `surabaya` (wajib) |
| `year` | `2026` |
| `date` | `2026-03-01` — tampilkan satu hari saja |
| `format` | `csv` — output CSV |

Setiap item memuat `imsak, subuh, zuhur, ashar, magrib, isya`.

### 6. Daftar kota — `GET /api/kota`

Semua kota beserta provinsi, zona waktu, dan tahun yang tersedia.

### 7. Kalender (.ics) — `GET /api/libur.ics?year=2026`

iCalendar (RFC 5545). Subscribe ke Google / Apple Calendar, atau import file-nya.

```bash
# import sekali (Google Calendar → Settings → Import & export)
curl -o libur-indonesia.ics "https://data-libur-nasional-indonesia.vercel.app/api/libur.ics?year=2026"

# unduh N libur terdekat sebagai kalender satu kali
curl "https://data-libur-nasional-indonesia.vercel.app/api/libur.ics?next=1&count=5&date=2026-06-01"
```

## Library & CLI Python

Instal dari source:

```bash
pip install .
```

```python
from hapilibur import is_libur, libur, cuti, month, between, imsak, upcoming

is_libur("2026-08-17")      # True
libur(2026)[:2]             # daftar libur nasional
cuti(2026)                  # daftar cuti bersama
month(2026, 3)              # semua tanggal libur pada Maret 2026
between("2026-01-01", "2026-12-31")  # rentang tanggal inklusif

jadwal = imsak("jakarta", 2026)
jadwal["schedule"][0]
# {'day': 1, 'date': '2026-02-19', 'imsak': '04:31', 'subuh': '04:41', ...}

upcoming()                  # libur terdekat sejak hari ini (dict)
upcoming("2026-06-11", n=3) # 3 libur terdekat (list)
```

CLI:

```bash
hapilibur check 2026-08-17          # 2026-08-17: Hari Proklamasi Kemerdekaan RI
hapilibur tahun 2026                # daftar libur nasional 2026
hapilibur cuti 2026                 # daftar cuti bersama 2026
hapilibur bulan 2026 3              # semua tanggal libur bulan Maret
hapilibur selang 2026-01-01 2026-12-31
hapilibur upcoming 2026-06-11 -n 3  # 3 libur terdekat
hapilibur imsak jakarta 2026        # jadwal imsakiyah Jakarta
hapilibur kota                      # daftar kota yang tersedia
```

## Pengembangan

```bash
npm run typecheck   # tipe API TypeScript
npm run build:site  # generate public/index.html dari data/ (wajib setelah ubah data)
npm run validate    # python3 scripts/validate.py
npm test            # pytest (tests/)
```

Atau sekali jalan: `npm run verify` (typecheck + build:site + validate).

Repro pipeline terotomasi di GitHub Actions: validasi data → pytest → CLI smoke → typecheck → build:site → cek halaman hasil generate sudah ter-commit.

## Kontribusi data tahun baru

1. Tambahkan data ke [`data/libur-nasional.json`](data/libur-nasional.json) & [`data/cuti-bersama.json`](data/cuti-bersama.json).
2. Jalankan `npm run validate` — wajib lolos.
3. Jalankan `npm run build:site` agar halaman statis ikut tersinkron.
4. Jalankan `python3 -m pytest -q` dan `python3 scripts/generate.py` agar copy di package ikut tersinkron.
5. Buat pull request. ✨

## Keterbatasan & sumber data

- Data libur mengikuti **SKB 3 Menteri** yang bisa direvisi pemerintah (misal penambahan cuti bersama).
- Jadwal imsakiyah memakai data **Bimas Islam Kemenag**; Rukyatul Hilal bisa menggeser awal Ramadan, jadi beda ±1 hari dimungkinkan untuk tahun berikutnya.
- Data **2027** (SKB tahun 2027) akan ditambahkan begitu SKB resmi diumumkan (± September–Oktober 2026).

## Sumber resmi

- [SKB 3 Menteri — Hari Libur Nasional & Cuti Bersama 2026 (PDF)](https://www.kemenkopmk.go.id/sites/default/files/pengumuman/2025-09/SKB%20Libur%20Nasional%20dan%20Cuti%20Bersama%20Tahun%202026.pdf)
- [Bimas Islam Kementerian Agama RI — jadwal imsakiyah](https://bimasislam.kemenag.go.id)

## Lisensi

MIT — lihat [LICENSE](LICENSE). Data publik bersumber dari instansi pemerintah; atribusi tetap dicantumkan.