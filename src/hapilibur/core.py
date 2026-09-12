"""Fungsi inti hapilibur: cek hari libur nasional, cuti bersama, dan imsakiyah.

Semua data diambil dari file JSON yang dibundel dalam package
(lihat folder ``hapilibur/data``) — data bisa dipakai lintas bahasa.
"""
from __future__ import annotations

import datetime as _dt
import json
from importlib.resources import files

LIBUR_FILE = "libur-nasional.json"
CUTI_FILE = "cuti-bersama.json"

_DATE_FMT = "%Y-%m-%d"


def _load(name: str) -> dict:
    data = files("hapilibur").joinpath("data").joinpath(name).read_text(encoding="utf-8")
    return json.loads(data)


def _parse_date(value: str | _dt.date | _dt.datetime) -> _dt.date:
    if isinstance(value, _dt.datetime):
        return value.date()
    if isinstance(value, _dt.date):
        return value
    return _dt.datetime.strptime(value, _DATE_FMT).date()


def _year_entries(name: str, year: int) -> list[dict]:
    """Ambil daftar {date, name} untuk satu tahun dari file JSON dataset."""
    payload = _load(name)
    return payload["years"].get(str(year), {}).get("holidays", [])


def _dates(name: str, year: int) -> dict[_dt.date, str]:
    return {_parse_date(entry["date"]): entry["name"] for entry in _year_entries(name, year)}


def _all_dates(year: int | None = None) -> dict[_dt.date, str]:
    """Gabungan hari libur nasional + cuti bersama (label tanggal sama ditimpa cuti? tidak — digabung)."""
    year = year or _dt.date.today().year
    merged: dict[_dt.date, str] = {}
    merged.update(_dates(LIBUR_FILE, year))
    for d, name in _dates(CUTI_FILE, year).items():
        if d in merged:
            merged[d] = f"{merged[d]} • {name}"
        else:
            merged[d] = name
    return merged


def libur(year: int | None = None) -> list[dict]:
    """Daftar hari libur nasional (lengkap dengan tanggal) dalam satu tahun.

    >>> libur(2026)[0]  # doctest: +SKIP
    {'date': '2026-01-01', 'name': 'Tahun Baru 2026 Masehi'}
    """
    year = year or _dt.date.today().year
    return list(_year_entries(LIBUR_FILE, year))


def is_libur(value: str | _dt.date | _dt.datetime, include_cuti: bool = True) -> bool:
    """True bila ``value`` adalah hari libur nasional (dan opsional cuti bersama)."""
    tanggal = _parse_date(value)
    return tanggal in _all_dates(tanggal.year)


def is_holiday(value: str | _dt.date | _dt.datetime) -> bool:
    """Alias bahasa Inggris dari :func:`is_libur`."""
    return is_libur(value)


def check(value: str | _dt.date | _dt.datetime) -> str | None:
    """Nama hari libur untuk tanggal tertentu, atau ``None`` bila bukan."""
    tanggal = _parse_date(value)
    return _all_dates(tanggal.year).get(tanggal)


def upcoming(value: str | _dt.date | _dt.datetime | None = None) -> dict:
    """Hari libur berikutnya (>= tanggal yang diberikan)."""
    start = _parse_date(value) if value else _dt.date.today()
    all_entries = sorted(_all_dates(start.year).items())
    for date, name in all_entries:
        if date >= start:
            return {"date": date.isoformat(), "name": name}
    for next_year in range(start.year + 1, start.year + 5):
        entries = sorted(_all_dates(next_year).items())
        if entries:
            return {"date": entries[0][0].isoformat(), "name": entries[0][1]}
    return {"date": None, "name": None}


def imsak(city: str, year: int | None = None) -> dict:
    """Jadwal imsakiyah (imsak, subuh, zuhur, ashar, magrib, isya) untuk sebuah kota.

    ``city`` tidak case-sensitive dan boleh tanpa spasi, contoh: ``"jakarta"``, ``"Surabaya"``.
    """
    year = year or _dt.date.today().year
    slug = city.strip().lower().replace(" ", "")
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
    for name in files("hapilibur").joinpath("data").iterdir():
        if name.suffix != ".json":
            continue
        stem = name.stem
        if stem in excluded:
            continue
        city, _, year = stem.rpartition("-")
        if city and year.isdigit():
            cities.add(city.title())
    return sorted(cities)


def imsak_cities_available() -> list[str]:
    """Alias dari :func:`available_cities`."""
    return available_cities()