import datetime

import pytest

import hapilibur as h


def test_is_libur_true_false():
    assert h.is_libur("2026-08-17") is True
    assert h.is_libur("2026-03-23") is True          # cuti bersama
    assert h.is_libur("2026-06-11") is False
    assert h.is_libur(datetime.date(2026, 8, 17)) is True
    assert h.is_libur(datetime.datetime(2026, 8, 17, 9, 0)) is True


def test_is_holiday_alias():
    assert h.is_holiday("2026-01-01") is True
    assert h.is_holiday("2026-02-02") is False


def test_check():
    assert h.check("2026-08-17") == "Hari Proklamasi Kemerdekaan RI"
    assert h.check("2026-03-23") == "Cuti Bersama Hari Raya Idul Fitri 1447 H"
    assert h.check("2026-06-11") is None


def test_libur_and_cuti_year():
    year = 2026
    libur = h.libur(year)
    cuti = h.cuti(year)
    assert len(libur) == 17
    assert len(cuti) == 8
    assert libur[0] == {"date": "2026-01-01", "name": "Tahun Baru 2026 Masehi"}
    assert between_dates(libur), "tanggal libur harus terurut"


def between_dates(entries):
    return [e["date"] for e in entries] == sorted(e["date"] for e in entries)


def test_month():
    march = h.month(2026, 3)
    assert len(march) == 7
    assert march[0]["date"] == "2026-03-18"
    assert march[-1]["date"] == "2026-03-24"
    with pytest.raises(ValueError):
        h.month(2026, 13)


def test_between_and_holiday_range():
    full = h.between("2026-01-01", "2026-12-31")
    assert len(full) == 25
    august = h.holiday_range("2026-08-01", "2026-08-31")
    assert [e["date"] for e in august] == ["2026-08-17", "2026-08-25"]
    assert h.between("2026-08-01", "2026-06-01")  # rentang dibalik tidak error


def test_upcoming():
    nxt = h.upcoming("2026-06-11")
    assert nxt == {"date": "2026-06-16", "name": "Tahun Baru Islam 1448 H (1 Muharam)"}
    assert h.upcoming("2026-09-12")["date"] == "2026-12-24"
    three = h.upcoming("2026-06-11", n=3)
    assert [e["date"] for e in three] == ["2026-06-16", "2026-08-17", "2026-08-25"]
    still_one = h.upcoming(n=1)
    assert isinstance(still_one, dict)
    with pytest.raises(ValueError):
        h.upcoming(n=0)


def test_imsak():
    jakarta = h.imsak("jakarta", 2026)
    assert jakarta["city"] == "Jakarta"
    assert len(jakarta["schedule"]) == 30
    assert jakarta["schedule"][0]["date"] == "2026-02-19"
    surabaya = h.imsak("Surabaya", 2026)
    assert surabaya["province"] == "Jawa Timur"
    with pytest.raises(ValueError):
        h.imsak("solo", 2026)


def test_available_cities():
    cities = h.available_cities()
    assert "Jakarta" in cities
    assert "Surabaya" in cities
    assert h.imsak_cities_available() == cities


def test_core_files_exposed():
    assert h.LIBUR_FILE == "libur-nasional.json"
    assert h.CUTI_FILE == "cuti-bersama.json"


def test_is_libur_include_cuti_flag():
    # 2026-03-23 adalah cuti bersama, bukan libur nasional
    assert h.is_libur("2026-03-23") is True
    assert h.is_libur("2026-03-23", include_cuti=False) is False
    assert h.is_libur("2026-08-17", include_cuti=False) is True


def test_check_detail():
    d = h.check_detail("2026-08-17")
    assert d == {
        "date": "2026-08-17",
        "name": "Hari Proklamasi Kemerdekaan RI",
        "jenis": ["libur_nasional"],
    }
    assert h.check_detail("2026-06-11") is None


def test_month_include_cuti_flag():
    assert len(h.month(2026, 3)) == 7
    assert len(h.month(2026, 3, include_cuti=False)) == 3


def test_to_csv():
    csv = h.to_csv([{"date": "2026-08-17", "name": 'Hari "Merdeka"'}])
    assert csv.splitlines()[0] == "tanggal,nama"
    assert '2026-08-17,"Hari ""Merdeka"""' in csv


def test_invalid_date_message():
    import pytest as _pytest

    with _pytest.raises(ValueError, match="YYYY-MM-DD"):
        h.is_libur("tanggal-salah")