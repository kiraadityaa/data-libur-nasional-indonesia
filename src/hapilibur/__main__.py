"""CLI hapilibur: cek hari libur, cuti bersama, dan jadwal imsakiyah dari terminal."""
from __future__ import annotations

import argparse
import sys

from . import core


def _fmt_date(value: str) -> None:
    print(f"{value}: {core.check(value) or 'Bukan hari libur nasional / cuti bersama'}")


def _print_holidays(entries: list[dict], year: int) -> None:
    if not entries:
        print(f"Tidak ada data untuk tahun {year}.")
        return
    for entry in entries:
        print(f"{entry['date']}  {entry['name']}")


def _print_imsak(payload: dict) -> None:
    print(f"{payload['title']} ({payload['timezone']})")
    print(f"{'Hari':<5}{'Tanggal':<12}{'Imsak':<7}{'Subuh':<7}{'Zuhur':<7}{'Ashar':<7}{'Magrib':<7}{'Isya':<7}")
    for item in payload["schedule"]:
        print(
            f"{item['day']:<5}{item['date']:<12}{item['imsak']:<7}{item['subuh']:<7}"
            f"{item['zuhur']:<7}{item['ashar']:<7}{item['magrib']:<7}{item['isya']:<7}"
        )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="hapilibur",
        description="Cek hari libur nasional, cuti bersama, dan jadwal imsakiyah Indonesia.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_check = sub.add_parser("check", help="cek apakah suatu tanggal hari libur")
    p_check.add_argument("tanggal", help="tanggal dalam format YYYY-MM-DD, misal 2026-08-17")

    p_tahun = sub.add_parser("tahun", help="daftar hari libur nasional satu tahun")
    p_tahun.add_argument("tahun", nargs="?", type=int, help="tahun (default: tahun berjalan)")

    p_next = sub.add_parser("upcoming", help="hari libur berikutnya")
    p_next.add_argument("tanggal", nargs="?", help="awal pencarian (default: hari ini)")

    p_imsak = sub.add_parser("imsak", help="jadwal imsakiyah sebuah kota")
    p_imsak.add_argument("kota", help="nama kota, misal jakarta atau surabaya")
    p_imsak.add_argument("tahun", nargs="?", type=int, help="tahun (default: tahun berjalan)")

    p_kota = sub.add_parser("kota", help="daftar kota yang tersedia")

    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

    if args.command == "check":
        _fmt_date(args.tanggal)
    elif args.command == "tahun":
        _print_holidays(core.libur(args.tahun), args.tahun or 0)
    elif args.command == "upcoming":
        result = core.upcoming(args.tanggal)
        print(f"{result['date']}  {result['name']}")
    elif args.command == "imsak":
        _print_imsak(core.imsak(args.kota, args.tahun))
    elif args.command == "kota":
        print(", ".join(core.available_cities()))
    return 0


if __name__ == "__main__":
    sys.exit(main())