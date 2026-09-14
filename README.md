# data-libur-nasional-indonesia

Dataset dan REST API hari libur nasional, cuti bersama, dan jadwal imsakiyah Indonesia — 17 libur, 8 cuti bersama, 2 kota (2026). JSON murni, gratis, tanpa kunci API.

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue)](#pustaka-python)
[![CI](https://img.shields.io/github/actions/workflow/status/kiraadityaa/data-libur-nasional-indonesia/ci.yml?label=CI)](https://github.com/kiraadityaa/data-libur-nasional-indonesia/actions)
[![License](https://img.shields.io/badge/License-MIT-green)](#lisensi)

Live demo dan playground: <https://data-libur-nasional-indonesia.vercel.app> · Spesifikasi mesin-terbaca: [`/openapi.json`](https://data-libur-nasional-indonesia.vercel.app/openapi.json) · Contoh mentah: [`data/libur-nasional.json`](data/libur-nasional.json)

## Mulai dalam 30 detik

```bash
# 1. Cek satu tanggal via API
curl "https://data-libur-nasional-indonesia.vercel.app/api/libur?date=2026-08-17"

# 2. Sama via pustaka Python (dari source repo ini)
pip install .
python -c "from hapilibur import is_libur; print(is_libur('2026-08-17'))"  # True

# 3. Subscribe kalender tim ke Google/Apple Calendar
# https://data-libur-nasional-indonesia.vercel.app/api/libur.ics?year=2026
```

## Data mentah

Semua data adalah JSON statis tanpa framework — unduh dan parse dari bahasa apa pun.

<details>
<summary>Daftar file dataset</summary>

| File | Isi |
|------|-----|
| [`data/libur-nasional.json`](data/libur-nasional.json) | Hari libur nasional per tahun |
| [`data/cuti-bersama.json`](data/cuti-bersama.json) | Cuti bersama per tahun |
| [`data/imsak/jakarta-2026.json`](data/imsak/jakarta-2026.json) | Imsakiyah Jakarta (30 hari Ramadan 1447 H) |
| [`data/imsak/surabaya-2026.json`](data/imsak/surabaya-2026.json) | Imsakiyah Surabaya (30 hari Ramadan 1447 H) |

```bash
curl https://raw.githubusercontent.com/kiraadityaa/data-libur-nasional-indonesia/main/data/libur-nasional.json
```

</details>

## REST API

Base URL: `https://data-libur-nasional-indonesia.vercel.app`. Semua endpoint `GET`, cache publik, mendukung preflight `OPTIONS`, dan mengembalikan error terstandar `{error, hint}`.

| Endpoint | Guna | Contoh |
|----------|------|--------|
| `/api/libur?date=YYYY-MM-DD` | Cek satu tanggal | `?date=2026-08-17` |
| `/api/libur?year=YYYY` | Rekap setahun (`libur_nasional`, `cuti_bersama`, total) | `?year=2026`, `&format=csv` untuk CSV |
| `/api/libur?year=YYYY&month=M` | Libur satu bulan | `?year=2026&month=3` |
| `/api/libur?next=1` | N libur berikutnya (`count` 1–30, default hari ini WIB) | `?next=1&date=2026-06-11&count=3` |
| `/api/libur?from=&to=` | Rentang tanggal inklusif | `?from=2026-03-20&to=2026-03-24` |
| `/api/imsak?city=` | Imsakiyah 30 hari (`imsak, subuh, zuhur, ashar, magrib, isya`) | `?city=jakarta&year=2026`, `&date=2026-03-01`, `&format=csv` |
| `/api/kota` | Daftar kota, provinsi, zona waktu, tahun tersedia | — |
| `/api/libur.ics` | Kalender iCalendar RFC 5545 | `?year=2026`, `?type=libur`, `?next=1&count=5` |
| `/api/health` | Health check | — |

Parameter `type=all|libur|cuti` berlaku untuk `/api/libur` dan `/api/libur.ics`. Dokumentasi lengkap ada di [`/openapi.json`](https://data-libur-nasional-indonesia.vercel.app/openapi.json) (live: `/api/openapi.json`).

Contoh respons:

```json
// GET /api/libur?date=2026-08-17
{
  "date": "2026-08-17",
  "is_holiday": true,
  "libur_nasional": { "date": "2026-08-17", "name": "Hari Proklamasi Kemerdekaan RI" },
  "cuti_bersama": null
}
```

```bash
# Google Calendar → Settings → Import & export
curl -o libur-indonesia.ics "https://data-libur-nasional-indonesia.vercel.app/api/libur.ics?year=2026"
```

## Pustaka Python

```bash
pip install .
```

```python
from hapilibur import check_detail, imsak, is_libur, month, upcoming

is_libur("2026-08-17")                     # True
is_libur("2026-03-23", include_cuti=False) # False — itu cuti bersama
check_detail("2026-08-17")
# {'date': '2026-08-17', 'name': 'Hari Proklamasi Kemerdekaan RI', 'jenis': ['libur_nasional']}
month(2026, 3)                             # 7 tanggal (libur + cuti)
upcoming("2026-06-11", n=3)                # 3 libur terdekat
imsak("jakarta", 2026)["schedule"][0]
# {'day': 1, 'date': '2026-02-19', 'imsak': '04:31', 'subuh': '04:41', ...}
```

<details>
<summary>Referensi CLI lengkap</summary>

```bash
hapilibur check 2026-08-17            # cek satu tanggal (tambah --json untuk detail)
hapilibur tahun 2026 [--json|--csv]   # libur nasional setahun
hapilibur cuti 2026 [--json|--csv]    # cuti bersama setahun
hapilibur bulan 2026 3 [--tanpa-cuti] # libur satu bulan
hapilibur selang 2026-01-01 2026-12-31  # rentang inklusif (alias: range)
hapilibur upcoming 2026-06-11 -n 3    # libur berikutnya (alias: next)
hapilibur imsak jakarta 2026 [--json] # imsakiyah satu kota
hapilibur kota                        # kota yang tersedia
hapilibur --version
```

Error input (tanggal salah, kota tak dikenal) keluar sebagai satu baris `Error: ...` dengan exit code 2.

</details>

## English summary

Static JSON dataset and free REST API for Indonesian national holidays, collective leave (*cuti bersama*), and Ramadan prayer times (*imsakiyah*) for Jakarta and Surabaya. Sources: the tri-ministerial decree (SKB 3 Menteri) and the Ministry of Religious Affairs. No API key. Endpoints return JSON, CSV, or iCalendar; a Python library and CLI (`hapilibur`) ship in the same repo. See [Quickstart](#mulai-dalam-30-detik) for copy-paste examples and [`/openapi.json`](https://data-libur-nasional-indonesia.vercel.app/openapi.json) for the full spec.

## Pengembangan dan kontribusi

```bash
npm run typecheck   # tipe API TypeScript
npm run build:site  # generate public/index.html + openapi.json + sitemap.xml + manifest
npm run validate    # validasi data JSON
npm test            # pytest
npm run verify      # semua di atas, sekali jalan
```

Menambah tahun baru:

1. Tambahkan data ke [`data/libur-nasional.json`](data/libur-nasional.json) dan [`data/cuti-bersama.json`](data/cuti-bersama.json).
2. `npm run validate` — wajib lolos.
3. `npm run build:site` agar halaman statis tersinkron.
4. `python3 -m pytest -q` dan `python3 scripts/generate.py` agar salinan di package tersinkron.
5. Buat pull request.

Sumber resmi: [SKB 3 Menteri 2026 (PDF)](https://www.kemenkopmk.go.id/sites/default/files/pengumuman/2025-09/SKB%20Libur%20Nasional%20dan%20Cuti%20Bersama%20Tahun%202026.pdf) · [Bimas Islam Kemenag](https://bimasislam.kemenag.go.id). Data mengikuti penetapan pemerintah dan bisa direvisi; awal Ramadan bisa bergeser ±1 hari karena Rukyatul Hilal; data 2027 ditambahkan setelah SKB resmi terbit.

## Lisensi

MIT — lihat [LICENSE](LICENSE). Data publik bersumber dari instansi pemerintah; atribusi tetap dicantumkan.
