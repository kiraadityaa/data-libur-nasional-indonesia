"""Fungsi inti hapilibur: cek hari libur nasional, cuti bersama, dan imsakiyah.

Semua data diambil dari file JSON yang dibundel dalam package
(lihat folder ``hapilibur/data``) — data bisa dipakai lintas bahasa.
"""
from __future__ import annotations

import datetime as _dt
import functools
import json
from importlib.resources import files

LIBUR_FILE = "libur-nasional.json"
CUTI_FILE = "cuti-bersama.json"

__all__ = [
    "LIBUR_FILE",
    "CUTI_FILE",
    "available_cities",
    "between",
    "check",
    "check_detail",
    "cuti",
    "holiday_range",
    "imsak",
    "imsak_cities_available",
    "is_holiday",
    "is_libur",
    "libur",
    "month",
    "to_csv",
    "upcoming",
]

_DATE_FMT = "%Y-%m-%d"


@functools.lru_cache(maxsize=64)
def _load(name: str) -> dict:
    try:
        data = files("hapilibur").joinpath("data").joinpath(name).read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"File data '{name}' tidak ditemukan di package hapilibur.") from exc
    try:
        return json.loads(data)
    except json.JSONDecodeError as exc:
        raise ValueError(f"File data '{name}' rusak (JSON tidak valid): {exc}") from exc


def _parse_date(value: str | _dt.date | _dt.datetime) -> _dt.date:
    if isinstance(value, _dt.datetime):
        return value.date()
    if isinstance(value, _dt.date):
        return value
    if not isinstance(value, str):
        raise TypeError(f"Tanggal harus str/YYYY-MM-DD, date, atau datetime — dapat {type(value).__name__}")
    text = value.strip()
    try:
        return _dt.datetime.strptime(text, _DATE_FMT).date()
    except ValueError as exc:
        raise ValueError(f"Tanggal '{value}' tidak valid — gunakan format YYYY-MM-DD (contoh: 2026-08-17).") from exc


def _year_entries(name: str, year: int) -> list[dict]:
    """Ambil daftar {date, name} untuk satu tahun dari file JSON dataset."""
    if not isinstance(year, int) or year < 1 or year > 9999:
        raise ValueError(f"Tahun '{year}' tidak valid — harus bilangan 1-9999.")
    payload = _load(name)
    return list(payload.get("years", {}).get(str(year), {}).get("holidays", []))


def _dates(name: str, year: int) -> dict[_dt.date, str]:
    return {_parse_date(entry["date"]): entry["name"] for entry in _year_entries(name, year)}


def _all_dates(year: int | None = None, include_cuti: bool = True) -> dict[_dt.date, str]:
    """Gabungan hari libur nasional + (opsional) cuti bersama."""
    year = year or _dt.date.today().year
    merged: dict[_dt.date, str] = {}
    merged.update(_dates(LIBUR_FILE, year))
    if include_cuti:
        for d, name in _dates(CUTI_FILE, year).items():
            if d in merged:
                merged[d] = f"{merged[d]} • {name}"
            else:
                merged[d] = name
    return merged


def _kinds(year: int) -> dict[_dt.date, set[str]]:
    """Petakan tanggal -> {'libur_nasional', 'cuti_bersama'}."""
    kinds: dict[_dt.date, set[str]] = {}
    for entry in _year_entries(LIBUR_FILE, year):
        kinds.setdefault(_parse_date(entry["date"]), set()).add("libur_nasional")
    for entry in _year_entries(CUTI_FILE, year):
        kinds.setdefault(_parse_date(entry["date"]), set()).add("cuti_bersama")
    return kinds


def libur(year: int | None = None) -> list[dict]:
    """Daftar hari libur nasional (lengkap dengan tanggal) dalam satu tahun.

    >>> libur(2026)[0]  # doctest: +SKIP
    {'date': '2026-01-01', 'name': 'Tahun Baru 2026 Masehi'}
    """
    year = year or _dt.date.today().year
    return list(_year_entries(LIBUR_FILE, year))


def cuti(year: int | None = None) -> list[dict]:
    """Daftar cuti bersama nasional dalam satu tahun."""
    year = year or _dt.date.today().year
    return list(_year_entries(CUTI_FILE, year))


def month(year: int, month_number: int, include_cuti: bool = True) -> list[dict]:
    """Daftar tanggal libur (nasional + cuti bersama) dalam satu bulan sebuah tahun.

    ``month_number`` 1-12 (Januari-Desember).

    >>> month(2026, 3)[:1]  # doctest: +SKIP
    [{'date': '2026-03-18', 'name': 'Cuti Bersama Hari Suci Nyepi'}]
    """
    if not 1 <= month_number <= 12:
        raise ValueError("month_number harus 1-12")
    return [
        {"date": date.isoformat(), "name": name}
        for date, name in sorted(_all_dates(year, include_cuti=include_cuti).items())
        if date.year == year and date.month == month_number
    ]


def between(
    start: str | _dt.date | _dt.datetime,
    end: str | _dt.date | _dt.datetime,
    include_cuti: bool = True,
) -> list[dict]:
    """Daftar tanggal libur (nasional + cuti bersama) dalam rentang tanggal inklusif.

    >>> len(between("2026-08-01", "2026-08-31"))  # doctest: +SKIP
    1
    """
    start_date = _parse_date(start)
    end_date = _parse_date(end)
    if end_date < start_date:
        start_date, end_date = end_date, start_date
    result: list[dict] = []
    for year in range(start_date.year, end_date.year + 1):
        for date, name in sorted(_all_dates(year, include_cuti=include_cuti).items()):
            if start_date <= date <= end_date:
                result.append({"date": date.isoformat(), "name": name})
    return result


def holiday_range(
    start: str | _dt.date | _dt.datetime, end: str | _dt.date | _dt.datetime
) -> list[dict]:
    """Alias bahasa Inggris dari :func:`between`."""
    return between(start, end)


def is_libur(value: str | _dt.date | _dt.datetime, include_cuti: bool = True) -> bool:
    """True bila ``value`` adalah hari libur (nasional + opsional cuti bersama).

    .. versionchanged:: 0.2.0
        Parameter ``include_cuti`` kini benar-benar dihormati
        (sebelumnya selalu True).
    """
    tanggal = _parse_date(value)
    if include_cuti:
        return tanggal in _all_dates(tanggal.year, include_cuti=True)
    return tanggal in _dates(LIBUR_FILE, tanggal.year)


def is_holiday(value: str | _dt.date | _dt.datetime) -> bool:
    """Alias bahasa Inggris dari :func:`is_libur` (termasuk cuti bersama)."""
    return is_libur(value, include_cuti=True)


def check(value: str | _dt.date | _dt.datetime) -> str | None:
    """Nama hari libur untuk tanggal tertentu, atau ``None`` bila bukan."""
    tanggal = _parse_date(value)
    return _all_dates(tanggal.year).get(tanggal)


def check_detail(value: str | _dt.date | _dt.datetime) -> dict | None:
    """Detail hari libur: ``{date, name, jenis[]}`` atau ``None``.

    ``jenis`` berisi kombinasi ``libur_nasional`` / ``cuti_bersama``.
    Baru di 0.2.0.
    """
    tanggal = _parse_date(value)
    name = _all_dates(tanggal.year).get(tanggal)
    if name is None:
        return None
    kinds = sorted(_kinds(tanggal.year).get(tanggal, set()))
    return {"date": tanggal.isoformat(), "name": name, "jenis": kinds}


def upcoming(value: str | _dt.date | _dt.datetime | None = None, n: int = 1) -> dict | list[dict]:
    """Satu atau beberapa hari libur berikutnya (>= tanggal yang diberikan).

    ``n=1`` mengembalikan dict; ``n>1`` mengembalikan list dict ber-urutan tanggal.
    Bila tidak ada data, ``n=1`` mengembalikan ``{"date": None, "name": None}``
    dan ``n>1`` mengembalikan list kosong.
    """
    if n < 1:
        raise ValueError("n harus >= 1")
    start = _parse_date(value) if value else _dt.date.today()
    found: list[dict] = []
    for year in range(start.year, start.year + 5):
        if len(found) >= n:
            break
        for date, name in sorted(_all_dates(year).items()):
            if date < start:
                continue
            found.append({"date": date.isoformat(), "name": name})
            if len(found) >= n:
                break
    if n == 1:
        return found[0] if found else {"date": None, "name": None}
    return found


def to_csv(entries: list[dict], jenis_default: str = "libur") -> str:
    """Ubah daftar ``{date, name}`` menjadi string CSV ``tanggal,nama``.

    Baru di 0.2.0 — untuk CLI ``--csv`` dan analisis cepat.
    """
    lines = ["tanggal,nama"]
    for entry in entries:
        name = str(entry.get("name", "")).replace('"', '""')
        lines.append(f"{entry.get('date', '')},\"{name}\"")
    return "\n".join(lines) + ("\n" if entries else "")


def imsak(city: str, year: int | None = None) -> dict:
    """Jadwal imsakiyah (imsak, subuh, zuhur, ashar, magrib, isya) untuk sebuah kota.

    ``city`` tidak case-sensitive dan boleh tanpa spasi, contoh: ``"jakarta"``, ``"Surabaya"``.
    """
    year = year or _dt.date.today().year
    if not isinstance(year, int) or year < 1 or year > 9999:
        raise ValueError(f"Tahun '{year}' tidak valid — harus bilangan 1-9999.")
    slug = "".join(ch for ch in city.strip().lower() if ch.isalnum())
    if not slug:
        raise ValueError("Nama kota tidak boleh kosong.")
    try:
        return _load(f"{slug}-{year}.json")
    except FileNotFoundError as exc:
        raise ValueError(
            f"Belum ada jadwal imsakiyah untuk kota {city!r} tahun {year}. "
            f"Kota tersedia: {', '.join(available_cities())}."
        ) from exc


def available_cities() -> list[str]:
    """Daftar kota yang tersedia pada data imsakiyah."""
    excluded = {LIBUR_FILE[:-5], CUTI_FILE[:-5]}
    cities = set()
    try:
        members = list(files("hapilibur").joinpath("data").iterdir())
    except FileNotFoundError:
        return []
    for member in members:
        if member.suffix != ".json":
            continue
        stem = member.stem
        if stem in excluded:
            continue
        city, sep, year = stem.rpartition("-")
        if sep and city and year.isdigit():
            cities.add(city.title())
    return sorted(cities)


def imsak_cities_available() -> list[str]:
    """Alias dari :func:`available_cities`."""
    return available_cities()
