#!/usr/bin/env python3
"""Generator bantu: salin data JSON kanonik dari ``data/`` ke dalam package ``hapilibur/data``.

Jalankan setelah menambah/mengubah data agar copy di package selalu sinkron.
"""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "src" / "hapilibur" / "data"


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    copied: list[str] = []
    for raw in sorted((ROOT / "data").rglob("*.json")):
        dest = DEST / raw.relative_to(ROOT / "data")
        destination = DEST / raw.name
        shutil.copy2(raw, destination)
        copied.append(str(destination.relative_to(ROOT)))
    print("Sinkron selesai:")
    for path in copied:
        print(f"  - {path}")


if __name__ == "__main__":
    main()