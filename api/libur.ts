import { VercelRequest, VercelResponse } from "@vercel/node";
import { HolidayEntry, HolidayFile, loadJson } from "../lib/load";

const IS_DATE = /^\d{4}-\d{2}-\d{2}$/;
const IS_YEAR = /^\d{4}$/;

function send(res: VercelResponse, status: number, body: unknown) {
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  return res.status(status).json(body);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return send(res, 405, { error: "Method Not Allowed", hint: "Gunakan GET" });
  }

  const libur = loadJson<HolidayFile>("libur-nasional.json");
  const cuti = loadJson<HolidayFile>("cuti-bersama.json");
  const date = req.query.date as string | undefined;
  const yearRaw = (req.query.year as string | undefined) ?? new Date().getFullYear().toString();

  if (!IS_YEAR.test(yearRaw)) {
    return send(res, 400, { error: "Parameter 'year' harus 4 digit (contoh: 2026)" });
  }
  const year = Number(yearRaw);

  const libur2026 = libur.years[String(year)]?.holidays ?? [];
  const cuti2026 = cuti.years[String(year)]?.holidays ?? [];

  if (date) {
    if (!IS_DATE.test(date)) {
      return send(res, 400, { error: "Parameter 'date' harus YYYY-MM-DD (contoh: 2026-08-17)" });
    }
    const liburMatch = libur2026.find((h: HolidayEntry) => h.date === date);
    const cutiMatch = cuti2026.find((h: HolidayEntry) => h.date === date);
    if (!liburMatch && !cutiMatch) {
      return send(res, 200, { date, is_holiday: false, message: "Bukan hari libur nasional / cuti bersama" });
    }
    return send(res, 200, {
      date,
      is_holiday: true,
      libur_nasional: liburMatch ?? null,
      cuti_bersama: cutiMatch ?? null,
    });
  }

  if (libur2026.length === 0) {
    return send(res, 404, { error: `Belum ada data libur nasional untuk tahun ${year}` });
  }

  return send(res, 200, {
    year,
    sumber: libur.sources,
    total_libur_nasional: libur2026.length,
    total_cuti_bersama: cuti2026.length,
    libur_nasional: libur2026,
    cuti_bersama: cuti2026,
  });
}