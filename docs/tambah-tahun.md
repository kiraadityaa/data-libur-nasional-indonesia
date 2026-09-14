# Menambah data tahun baru

Checklist ini memungkinkan siapa pun menambah tahun baru tanpa bantuan maintainer.
Jangan tambah tahun yang SKB 3 Menterinya belum terbit — data prediksi dilarang masuk repo.

## 1. Tunggu SKB resmi

- Sumber yang sah: SKB 3 Menteri (Menag, Menaker, MenPAN-RB), biasanya PDF di
  `kemenkopmk.go.id` atau `setneg.go.id` sekitar September–Oktober tahun sebelumnya.
- Status terakhir: **SKB 2027 belum terbit** (per 14 Sep 2026). Jangan tambah 2027 sampai PDF resmi ada.

## 2. Tambah tanggal

1. Tambahkan blok `"2027": { "count": N, "holidays": [...] }` ke `data/libur-nasional.json`
   dan `data/cuti-bersama.json`, tanggal terurut menaik.
2. Perbarui `updated_at` kedua file ke tanggal hari ini (format `YYYY-MM-DDT00:00:00Z`).
3. Tambahkan sumber SKB ke array `sources` bila nomor SKB-nya baru.

## 3. Verifikasi (wajib lolos semua)

```bash
npm run validate          # format tanggal, anti-duplikat, count sinkron
npm test                  # pytest
npm run test:api          # kontrak API (termasuk tahun baru)
npm run build:site        # regenerasi halaman + sitemap
```

Khusus tahun baru, pastikan juga:

- `python3 -m pytest -q -k 2027` bila ada test spesifik tahun (tambahkan bila perlu).
- Landing menampilkan tahun baru (build-site otomatis memakai tahun terakhir).
- `GET /api/libur?year=2027` dan `GET /api/health` (cek `tahun_tersedia`) mengembalikan data.

## 4. Sinkronisasi package Python

```bash
python3 scripts/generate.py   # salin data/ → src/hapilibur/data/
```

## 5. Pull request

Sertakan tautan PDF SKB di deskripsi PR. CI akan menolak bila validasi gagal
atau file hasil generate belum ter-commit.
