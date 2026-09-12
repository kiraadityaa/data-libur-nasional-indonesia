#!/usr/bin/env python3
"""Validasi seluruh data JSON di repo.

Cek:
  1. Semua file JSON ter-parse dengan benar.
  2. Format tanggal YYYY-MM-DD, tanggal valid.
  3. Tidak ada tanggal ganda dalam satu tahun (libur / cuti).
  4. File imsakiyah: 30 hari, tanggal berurutan, jam berformat HH:MM.

Exit code bukan 0 bila ada error.
"""
from __future__ import annotations

import datetime
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^\d{2}:\d{2}$")

errors: list[str] = []


def check(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


def load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        check(False, f"{path}: JSON tidak valid — {exc}")
        return None


def validate_dates(path: Path, holidays: list[dict]) -> None:
    seen: set[str] = set()
    for entry in holidays:
        date = entry.get("date", "")
        check(DATE_RE.match(date or ""), f"{path}: tanggal tidak valid format: {date!r}")
        if DATE_RE.match(date or ""):
            try:
                datetime.date.fromisoformat(date)
            except ValueError as exc:
                check(False, f"{path}: tanggal tidak nyata {date!r} — {exc}")
            check(date not in seen, f"{path}: tanggal ganda {date}")
            seen.add(date)


def main() -> int:
    for raw in sorted((ROOT / "data").rglob("*.json")):
        raw = Path(raw)
        rel = raw.relative_to(ROOT)
        data = load(raw)
        if data is None:
            continue
        years = data.get("years")
        if years is not None:
            for year, container in years.items():
                check(str(year).isdigit(), f"{rel}: kunci tahun bukan angka {year!r}")
                holidays = container.get("holidays", [])
                validate_dates(rel, holidays)
        elif rel.parts[0] == "data" and rel.parts[1] == "imsak":
            schedule = data.get("schedule", [])
            check(
                len(schedule) == 30,
                f"{rel}: jumlah jadwal harus 30 hari (sekarang {len(schedule)})",
            )
            prev: datetime.date | None = None
            for day, item in enumerate(schedule, start=1):
                check(item.get("day") == day, f"{rel}: urutan day salah di {day}")
                date = item.get("date", "")
                check(DATE_RE.match(date), f"{rel}: date tidak valid {date!r}")
                for key in ("imsak", "subuh", "zuhur", "ashar", "magrib", "isya"):
                    check(TIME_RE.match(item.get(key, "")), f"{rel}: jam {key!r} tidak valid: {item.get(key)!r}")
                current = datetime.date.fromisoformat(date)
                if prev is not None:
                    check(current == prev + datetime.timedelta(days=1), f"{rel}: tanggal tidak berurutan di hari {day}")
                prev = current

    if errors:
        print(f"{len(errors)} masalah ditemukan:")
        for err in errors:
            print(f"  - {err}")
        return 1
    print("OK: semua data valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())