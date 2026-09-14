import { VercelRequest, VercelResponse } from "@vercel/node";
import { HolidayFile, loadJson } from "../lib/load";
import { IS_YEAR, isValidDateString, mergedByYear, nextHolidays, todayWIB } from "../lib/holidays";
import { holidaysToICS } from "../lib/ics";
import { errorBody, sendJSON, sendOptions, sendText } from "../lib/respond";

const HOLIDAYS = "libur-nasional.json";
const CUTI = "cuti-bersama.json";

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

  let entries: { date: string; name: string }[];
  let title: string;

  if (req.query.next !== undefined) {
    const from = (req.query.date as string | undefined) ?? todayWIB();
    if (!isValidDateString(from)) {
      return sendJSON(res, 400, errorBody("Parameter 'date' harus YYYY-MM-DD yang valid"));
    }
    const countRaw = req.query.count === undefined ? 1 : Number(req.query.count);
    if (!Number.isInteger(countRaw) || countRaw < 1 || countRaw > 100) {
      return sendJSON(res, 400, errorBody("Parameter 'count' harus bilangan bulat 1-100"));
    }
    entries = [];
    for (const hit of nextHolidays(libur, cuti, from, countRaw)) {
      if (hit.libur_nasional) entries.push({ date: hit.date, name: hit.libur_nasional.name });
      if (hit.cuti_bersama && entries.length < countRaw) {
        entries.push({ date: hit.date, name: hit.cuti_bersama.name });
      }
      if (entries.length >= countRaw) break;
    }
    title = "Hari Libur Indonesia (upcoming)";
  } else {
    const type = ((req.query.type as string | undefined) ?? "all").toLowerCase();
    if (!["all", "libur", "cuti"].includes(type)) {
      return sendJSON(res, 400, errorBody("Parameter 'type' harus 'all', 'libur', atau 'cuti'"));
    }
    const merged = mergedByYear(libur, cuti, year);
    entries = merged
      .flatMap((entry) => {
        const out: { date: string; name: string }[] = [];
        if (type !== "cuti" && entry.libur_nasional) out.push({ date: entry.date, name: entry.libur_nasional.name });
        if (type !== "libur" && entry.cuti_bersama) out.push({ date: entry.date, name: entry.cuti_bersama.name });
        return out;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    title = `Hari Libur Indonesia ${year}`;
  }

  const ics = holidaysToICS(entries, title);
  res.setHeader("Content-Disposition", `attachment; filename="libur-indonesia.ics"`);
  return sendText(res, 200, ics, "text/calendar; charset=utf-8", { maxAge: 300, sMaxAge: 0 });
}
