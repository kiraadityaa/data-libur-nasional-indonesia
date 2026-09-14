import { VercelRequest, VercelResponse } from "@vercel/node";
import { HolidayEntry, HolidayFile, loadJson } from "../lib/load";
import {
  IS_YEAR,
  MergedHoliday,
  holidaysBetween,
  isValidDateString,
  listYearsHolidays,
  mergedByYear,
  monthHolidays,
  nextHolidays,
  todayWIB,
} from "../lib/holidays";
import { errorBody, sendJSON, sendOptions, sendText } from "../lib/respond";

const HOLIDAYS = "libur-nasional.json";
const CUTI = "cuti-bersama.json";

type LiburType = "all" | "libur" | "cuti";

function parseType(raw: unknown): LiburType | null {
  const t = String(raw ?? "all").toLowerCase();
  if (t === "all" || t === "libur" || t === "cuti") return t;
  return null;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return sendOptions(res);
  if (req.method !== "GET") {
    return sendJSON(res, 405, errorBody("Method Not Allowed", "Gunakan GET"));
  }

  const libur = loadJson<HolidayFile>(HOLIDAYS);
  const cuti = loadJson<HolidayFile>(CUTI);

  const yearRaw = (req.query.year as string | undefined) ?? new Date().getFullYear().toString();
  if (!IS_YEAR.test(yearRaw)) {
    return sendJSON(res, 400, errorBody("Parameter 'year' harus 4 digit (contoh: 2026)"));
  }
  const year = Number(yearRaw);

  const type = parseType(req.query.type);
  if (!type) {
    return sendJSON(res, 400, errorBody("Parameter 'type' harus 'all', 'libur', atau 'cuti'"));
  }

  const csv = (req.query.format as string | undefined)?.toLowerCase() === "csv";
  const followNext = req.query.next !== undefined || req.query.upcoming !== undefined;

  if (followNext) {
    const from = (req.query.date as string | undefined) ?? todayWIB();
    if (!isValidDateString(from)) {
      return sendJSON(res, 400, errorBody("Parameter 'date' harus YYYY-MM-DD yang valid"));
    }
    const countRaw = req.query.count === undefined ? 1 : Number(req.query.count);
    if (!Number.isInteger(countRaw) || countRaw < 1 || countRaw > 30) {
      return sendJSON(res, 400, errorBody("Parameter 'count' harus bilangan bulat 1-30"));
    }
    const hits = nextHolidays(libur, cuti, from, countRaw).map((h) => filterType(h, type));
    const compact = hits.filter((h) => h.libur_nasional || h.cuti_bersama);
    if (compact.length === 0) {
      return sendJSON(res, 200, { from, message: "Tidak ada libur berikutnya dalam jangkauan data" });
    }
    if (countRaw === 1) {
      const one = compact[0];
      return sendJSON(res, 200, { from, date: one.date, name: holidayLabel(one), detail: one });
    }
    return sendJSON(res, 200, {
      from,
      count: compact.length,
      libur_berikutnya: compact.map((h) => ({ date: h.date, name: holidayLabel(h), detail: h })),
    });
  }

  // Rentang tanggal: ?from=YYYY-MM-DD&to=YYYY-MM-DD (atau from/to). Baru di 0.2.0.
  const fromRaw = (req.query.from as string | undefined) ?? (req.query.start as string | undefined);
  const toRaw = (req.query.to as string | undefined) ?? (req.query.end as string | undefined);
  if (fromRaw !== undefined || toRaw !== undefined) {
    if (!fromRaw || !toRaw || !isValidDateString(fromRaw) || !isValidDateString(toRaw)) {
      return sendJSON(res, 400, errorBody("Parameter 'from' dan 'to' harus YYYY-MM-DD yang valid"));
    }
    const entries = holidaysBetween(libur, cuti, fromRaw, toRaw).map((h) => filterType(h, type));
    const kept = entries.filter((h) => h.libur_nasional || h.cuti_bersama);
    if (csv) return sendRangeCSV(res, fromRaw, toRaw, kept);
    return sendJSON(res, 200, {
      from: fromRaw <= toRaw ? fromRaw : toRaw,
      to: fromRaw <= toRaw ? toRaw : fromRaw,
      type,
      total: kept.length,
      libur: kept,
    });
  }

  if (req.query.month !== undefined) {
    const monthRaw = String(req.query.month);
    if (!/^\d{1,2}$/.test(monthRaw) || Number(monthRaw) < 1 || Number(monthRaw) > 12) {
      return sendJSON(res, 400, errorBody("Parameter 'month' harus 1-12"));
    }
    const monthEntries = monthHolidays(libur, cuti, year, Number(monthRaw)).map((h) =>
      filterType(h, type)
    );
    return sendYear(res, year, monthRaw.padStart(2, "0"), monthEntries, libur, cuti, csv, type);
  }

  if (req.query.date !== undefined) {
    const date = String(req.query.date);
    if (!isValidDateString(date)) {
      return sendJSON(res, 400, errorBody("Parameter 'date' harus YYYY-MM-DD yang valid (contoh: 2026-08-17)"));
    }
    const merged = mergedByYear(libur, cuti, year).find((entry) => entry.date === date);
    const match = merged ? filterType(merged, type) : null;
    if (!match || (!match.libur_nasional && !match.cuti_bersama)) {
      return sendJSON(res, 200, { date, is_holiday: false, message: "Bukan hari libur nasional / cuti bersama" });
    }
    return sendJSON(res, 200, {
      date,
      is_holiday: true,
      libur_nasional: match.libur_nasional,
      cuti_bersama: match.cuti_bersama,
    });
  }

  const merged = mergedByYear(libur, cuti, year).map((h) => filterType(h, type));
  if (merged.filter((h) => h.libur_nasional || h.cuti_bersama).length === 0) {
    return sendJSON(res, 404, errorBody(`Belum ada data libur untuk tahun ${year}`, undefined, { tahun_tersedia: listYearsHolidays(libur) }));
  }

  return sendYear(res, year, undefined, merged, libur, cuti, csv, type);
}

function filterType(entry: MergedHoliday, type: LiburType): MergedHoliday {
  if (type === "all") return entry;
  if (type === "libur") return { ...entry, cuti_bersama: null };
  return { ...entry, libur_nasional: null };
}

function holidayLabel(entry: { libur_nasional: { name: string } | null; cuti_bersama: { name: string } | null }): string {
  const parts: string[] = [];
  if (entry.libur_nasional) parts.push(entry.libur_nasional.name);
  if (entry.cuti_bersama) parts.push(entry.cuti_bersama.name);
  return parts.join(" • ");
}

function sendRangeCSV(res: VercelResponse, from: string, to: string, merged: MergedHoliday[]) {
  const rows = merged
    .map((entry) => entry.libur_nasional ?? (entry.cuti_bersama as HolidayEntry))
    .sort((a, b) => a.date.localeCompare(b.date));
  const body = [
    "tanggal,nama,jenis",
    ...rows.map((entry) => `${entry.date},"${entry.name.replace(/"/g, '""')}",${"campuran"}`),
  ].join("\n");
  res.setHeader("Content-Disposition", `attachment; filename="libur-${from}_${to}.csv"`);
  return sendText(res, 200, body, "text/csv; charset=utf-8");
}

function sendYear(
  res: VercelResponse,
  year: number,
  month: string | undefined,
  merged: MergedHoliday[],
  libur: HolidayFile,
  cuti: HolidayFile,
  csv: boolean,
  type: LiburType
) {
  const liburEntries = merged.filter((entry) => entry.libur_nasional).map((entry) => entry.libur_nasional as HolidayEntry);
  const cutiEntries = merged.filter((entry) => entry.cuti_bersama).map((entry) => entry.cuti_bersama as HolidayEntry);

  if (csv) {
    const rows = merged
      .map((entry) => entry.libur_nasional ?? (entry.cuti_bersama as HolidayEntry))
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date));
    const body = [
      "tanggal,nama,jenis",
      ...rows.map((entry) => {
        const jenis = liburEntries.some((l) => l.date === entry.date && l.name === entry.name)
          ? "libur_nasional"
          : "cuti_bersama";
        return `${entry.date},"${entry.name.replace(/"/g, '""')}",${jenis}`;
      }),
    ].join("\n");
    res.setHeader("Content-Disposition", `attachment; filename="libur-${year}${month ? "-" + month : ""}.csv"`);
    return sendText(res, 200, body, "text/csv; charset=utf-8");
  }

  return sendJSON(res, 200, {
    year,
    month: month ?? null,
    type,
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
