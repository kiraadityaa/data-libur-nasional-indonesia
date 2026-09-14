"""CLI hapilibur: cek hari libur, cuti bersama, dan jadwal imsakiyah dari terminal."""
from __future__ import annotations

import argparse
import datetime
import json
import sys

from . import __version__, core


def _emit(entries: list[dict] | dict, as_json: bool, as_csv: bool) -> None:
    if as_json:
        print(json.dumps(entries, ensure_ascii=False, indent=2))
        return
    if as_csv:
        items = entries if isinstance(entries, list) else [entries]
        print(core.to_csv([e for e in items if e.get("date")]), end="")
        return
    if isinstance(entries, dict):
        print(f"{entries.get('date')}  {entries.get('name')}")
        return
    for entry in entries:
        print(f"{entry['date']}  {entry['name']}")


def _fmt_date(value: str, as_json: bool) -> None:
    detail = core.check_detail(value)
    if as_json:
        print(json.dumps(detail or {"date": value, "is_holiday": False}, ensure_ascii=False, indent=2))
        return
    print(f"{value}: {detail['name'] if detail else 'Bukan hari libur nasional / cuti bersama'}")


def _print_holidays(entries: list[dict], year: int | None, as_json: bool, as_csv: bool) -> None:
    if not entries:
        label = f"tahun {year}" if year else "rentang tersebut"
        if as_json:
            print("[]")
        elif not as_csv:
            print(f"Tidak ada data untuk {label}.")
        else:
            print("tanggal,nama")
        return
    _emit(entries, as_json, as_csv)


def _print_imsak(payload: dict, as_json: bool) -> None:
    if as_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return
    print(f"{payload['title']} ({payload['timezone']})")
    print(f"{'Hari':<5}{'Tanggal':<12}{'Imsak':<7}{'Subuh':<7}{'Zuhur':<7}{'Ashar':<7}{'Magrib':<7}{'Isya':<7}")
    for item in payload["schedule"]:
        print(
            f"{item['day']:<5}{item['date']:<12}{item['imsak']:<7}{item['subuh']:<7}"
            f"{item['zuhur']:<7}{item['ashar']:<7}{item['magrib']:<7}{item['isya']:<7}"
        )


def _add_output_flags(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--json", action="store_true", help="keluarkan sebagai JSON")
    parser.add_argument("--csv", action="store_true", help="keluarkan sebagai CSV")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="hapilibur",
        description="Cek hari libur nasional, cuti bersama, dan jadwal imsakiyah Indonesia.",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)

    p_check = sub.add_parser("check", help="cek apakah suatu tanggal hari libur")
    p_check.add_argument("tanggal", help="tanggal dalam format YYYY-MM-DD, misal 2026-08-17")
    p_check.add_argument("--json", action="store_true", help="keluarkan sebagai JSON")

    p_tahun = sub.add_parser("tahun", help="daftar hari libur nasional satu tahun")
    p_tahun.add_argument("tahun", nargs="?", type=int, help="tahun (default: tahun berjalan)")
    _add_output_flags(p_tahun)

    p_cuti = sub.add_parser("cuti", help="daftar cuti bersama satu tahun")
    p_cuti.add_argument("tahun", nargs="?", type=int, help="tahun (default: tahun berjalan)")
    _add_output_flags(p_cuti)

    p_bulan = sub.add_parser("bulan", help="daftar tanggal libur satu bulan")
    p_bulan.add_argument("tahun", type=int, help="tahun, misal 2026")
    p_bulan.add_argument("bulan", type=int, help="bulan 1-12, misal 3")
    p_bulan.add_argument("--tanpa-cuti", action="store_true", help="kecualikan cuti bersama")
    _add_output_flags(p_bulan)

    p_selang = sub.add_parser("selang", help="daftar tanggal libur dalam rentang tanggal", aliases=["range"])
    p_selang.add_argument("dari", help="tanggal awal YYYY-MM-DD")
    p_selang.add_argument("sampai", help="tanggal akhir YYYY-MM-DD")
    _add_output_flags(p_selang)

    p_next = sub.add_parser("upcoming", help="hari libur berikutnya", aliases=["next"])
    p_next.add_argument("tanggal", nargs="?", help="awal pencarian (default: hari ini)")
    p_next.add_argument("-n", "--count", type=int, default=1, help="jumlah hari libur (default: 1)")
    p_next.add_argument("--json", action="store_true", help="keluarkan sebagai JSON")

    p_imsak = sub.add_parser("imsak", help="jadwal imsakiyah sebuah kota")
    p_imsak.add_argument("kota", help="nama kota, misal jakarta atau surabaya")
    p_imsak.add_argument("tahun", nargs="?", type=int, help="tahun (default: tahun berjalan)")
    p_imsak.add_argument("--json", action="store_true", help="keluarkan sebagai JSON")

    sub.add_parser("kota", help="daftar kota yang tersedia")

    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

    try:
        if args.command == "check":
            _fmt_date(args.tanggal, as_json=args.json)
        elif args.command == "tahun":
            year = args.tahun or datetime.date.today().year
            _print_holidays(core.libur(year), year, args.json, args.csv)
        elif args.command == "cuti":
            year = args.tahun or datetime.date.today().year
            _print_holidays(core.cuti(year), year, args.json, args.csv)
        elif args.command == "bulan":
            entries = core.month(args.tahun, args.bulan, include_cuti=not args.tanpa_cuti)
            _print_holidays(entries, args.tahun, args.json, args.csv)
        elif args.command in ("selang", "range"):
            _print_holidays(core.between(args.dari, args.sampai), None, args.json, args.csv)
        elif args.command in ("upcoming", "next"):
            result = core.upcoming(args.tanggal, n=args.count)
            if args.json:
                print(json.dumps(result, ensure_ascii=False, indent=2))
            elif args.count == 1:
                assert isinstance(result, dict)
                print(f"{result['date']}  {result['name']}")
            else:
                assert isinstance(result, list)
                for item in result:
                    print(f"{item['date']}  {item['name']}")
        elif args.command == "imsak":
            _print_imsak(core.imsak(args.kota, args.tahun), as_json=args.json)
        elif args.command == "kota":
            print(", ".join(core.available_cities()))
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
