import { VercelRequest, VercelResponse } from "@vercel/node";
import { HolidayEntry, HolidayFile, loadJson } from "../lib/load";
import {
  IS_YEAR,
  MergedHoliday,
  isValidDateString,
  listYearsHolidays,
  mergedByYear,
  monthHolidays,
  nextHoliday,
  todayWIB,
} from "../lib/holidays";
import { sendJSON, sendText } from "../lib/respond";

const HOLIDAYS = "libur-nasional.json";
const CUTI = "cuti-bersama.json";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return sendJSON(res, 405, { error: "Method Not Allowed", hint: "Gunakan GET" });
  }

  const libur = loadJson<HolidayFile>(HOLIDAYS);
  const cuti = loadJson<HolidayFile>(CUTI);

  const yearRaw = (req.query.year as string | undefined) ?? new Date().getFullYear().toString();
  if (!IS_YEAR.test(yearRaw)) {
    return sendJSON(res, 400, { error: "Parameter 'year' harus 4 digit (contoh: 2026)" });
  }
  const year = Number(yearRaw);

  const merged = mergedByYear(libur, cuti, year);
  const csv = (req.query.format as string | undefined)?.toLowerCase() === "csv";
  const followNext = req.query.next !== undefined || req.query.upcoming !== undefined;

  if (followNext) {
    const from = (req.query.date as string | undefined) ?? todayWIB();
    if (!isValidDateString(from)) {
      return sendJSON(res, 400, { error: "Parameter 'date' harus YYYY-MM-DD yang valid" });
    }
    const upcoming = nextHoliday(libur, cuti, from);
    if (!upcoming) {
      return sendJSON(res, 200, { from, message: "Tidak ada libur berikutnya dalam jangkauan data" });
    }
    return sendJSON(res, 200, { from, date: upcoming.date, name: holidayLabel(upcoming) });
  }

  if (req.query.month !== undefined) {
    const monthRaw = String(req.query.month);
    if (!/^\d{1,2}$/.test(monthRaw) || Number(monthRaw) < 1 || Number(monthRaw) > 12) {
      return sendJSON(res, 400, { error: "Parameter 'month' harus 1-12" });
    }
    const monthEntries = monthHolidays(libur, cuti, year, Number(monthRaw));
    return sendYear(res, year, monthRaw.padStart(2, "0"), monthEntries, libur, cuti, csv);
  }

  if (req.query.date !== undefined) {
    const date = String(req.query.date);
    if (!isValidDateString(date)) {
      return sendJSON(res, 400, { error: "Parameter 'date' harus YYYY-MM-DD yang valid (contoh: 2026-08-17)" });
    }
    const match = merged.find((entry) => entry.date === date);
    if (!match) {
      return sendJSON(res, 200, { date, is_holiday: false, message: "Bukan hari libur nasional / cuti bersama" });
    }
    return sendJSON(res, 200, {
      date,
      is_holiday: true,
      libur_nasional: match.libur_nasional,
      cuti_bersama: match.cuti_bersama,
    });
  }

  if (merged.length === 0) {
    return sendJSON(res, 404, { error: `Belum ada data libur untuk tahun ${year}`, tahun_tersedia: listYearsHolidays(libur) });
  }

  return sendYear(res, year, undefined, merged, libur, cuti, csv);
}

function holidayLabel(entry: { libur_nasional: { name: string } | null; cuti_bersama: { name: string } | null }): string {
  const parts: string[] = [];
  if (entry.libur_nasional) parts.push(entry.libur_nasional.name);
  if (entry.cuti_bersama) parts.push(entry.cuti_bersama.name);
  return parts.join(" • ");
}

function sendYear(
  res: VercelResponse,
  year: number,
  month: string | undefined,
  merged: MergedHoliday[],
  libur: HolidayFile,
  cuti: HolidayFile,
  csv: boolean
) {
  const liburEntries = merged.filter((entry) => entry.libur_nasional).map((entry) => entry.libur_nasional as HolidayEntry);
  const cutiEntries = merged.filter((entry) => entry.cuti_bersama).map((entry) => entry.cuti_bersama as HolidayEntry);

  if (csv) {
    const rows = merged
      .map((entry) => entry.libur_nasional ?? (entry.cuti_bersama as HolidayEntry))
      .sort((a, b) => a.date.localeCompare(b.date));
    const body = [
      "tanggal,nama,jenis",
      ...rows.map((entry) => {
        const jenis = liburEntries.some((l) => l.date === entry.date && l.name === entry.name)
          ? "libur_nasional"
          : "cuti_bersama";
        return `${entry.date},"${entry.name}",${jenis}`;
      }),
    ].join("\n");
    res.setHeader("Content-Disposition", `attachment; filename="libur-${year}${month ? "-" + month : ""}.csv"`);
    return sendText(res, 200, body, "text/csv; charset=utf-8");
  }

  return sendJSON(res, 200, {
    year,
    month: month ?? null,
    sumber: dedupe([...libur.sources, ...cuti.sources]),
    total_libur_nasional: liburEntries.length,
    total_cuti_bersama: cutiEntries.length,
    libur_nasional: liburEntries,
    cuti_bersama: cutiEntries,
  });
}

function dedupe<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!seen.has(item.name)) {
      seen.add(item.name);
      out.push(item);
    }
  }
  return out;
}