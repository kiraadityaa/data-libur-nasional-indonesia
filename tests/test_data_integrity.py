import datetime
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"


def load(rel):
    return json.loads((DATA / rel).read_text(encoding="utf-8"))


def test_libur_dates_sorted_unique():
    data = load("libur-nasional.json")
    for year, container in data["years"].items():
        dates = [e["date"] for e in container["holidays"]]
        assert len(dates) == len(set(dates)), f"{year}: tanggal ganda"
        assert dates == sorted(dates), f"{year}: tidak terurut"
        assert container["count"] == len(dates), f"{year}: count tidak sinkron"


def test_cuti_dates_do_not_overlap_libur():
    libur = {y: {e["date"] for e in c["holidays"]} for y, c in load("libur-nasional.json")["years"].items()}
    cuti = {y: {e["date"] for e in c["holidays"]} for y, c in load("cuti-bersama.json")["years"].items()}
    shared = set(libur) & set(cuti)
    for year in shared:
        assert not (libur[year] & cuti[year]), f"{year}: tanggal tumpang-tindih libur & cuti"


def test_imsak_schedule_integrity():
    for path in sorted((DATA / "imsak").glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        assert len(data["schedule"]) == 30
        prev = None
        for day, item in enumerate(data["schedule"], start=1):
            assert item["day"] == day
            current = datetime.date.fromisoformat(item["date"])
            if prev is not None:
                assert current == prev + datetime.timedelta(days=1)
            prev = current
            for key in ("imsak", "subuh", "zuhur", "ashar", "magrib", "isya"):
                assert len(item[key]) == 5 and item[key][2] == ":"


def test_metadata_present():
    for rel in ("libur-nasional.json", "cuti-bersama.json"):
        data = load(rel)
        for key in ("schema_version", "title", "country", "country_code", "updated_at", "sources", "years"):
            assert key in data, f"{rel}: field {key} hilang"
        assert data["sources"], f"{rel}: sources kosong"