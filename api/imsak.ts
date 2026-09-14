import { VercelRequest, VercelResponse } from "@vercel/node";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, ImsakFile, loadJson } from "../lib/load";
import { IS_YEAR, isValidDateString, normalizeCity } from "../lib/holidays";
import { errorBody, sendJSON, sendOptions, sendText } from "../lib/respond";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return sendOptions(res);
  if (req.method !== "GET") {
    return sendJSON(res, 405, errorBody("Method Not Allowed", "Gunakan GET"));
  }

  const cityRaw = req.query.city as string | undefined;
  const yearRaw = (req.query.year as string | undefined) ?? new Date().getFullYear().toString();

  if (!IS_YEAR.test(yearRaw)) {
    return sendJSON(res, 400, errorBody("Parameter 'year' harus 4 digit (contoh: 2026)"));
  }
  if (!cityRaw) {
    return sendJSON(res, 400, errorBody("Parameter 'city' wajib diisi (misal: jakarta, surabaya)"));
  }

  const city = normalizeCity(cityRaw);
  if (!city) {
    return sendJSON(res, 400, errorBody("Parameter 'city' tidak valid"));
  }
  let payload: ImsakFile;
  try {
    payload = loadJson<ImsakFile>(`imsak/${city}-${yearRaw}.json`);
  } catch {
    return sendJSON(
      res,
      404,
      errorBody(`Belum ada jadwal imsakiyah untuk kota '${city}' tahun ${yearRaw}`, undefined, {
        kota_tersedia: discoverCities(yearRaw),
      })
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = payload.schedule.find((s) => s.date === today) ?? null;

  if (req.query.date !== undefined) {
    const date = String(req.query.date);
    if (!isValidDateString(date)) {
      return sendJSON(res, 400, errorBody("Parameter 'date' harus YYYY-MM-DD yang valid"));
    }
    const target = payload.schedule.find((s) => s.date === date) ?? null;
    return sendJSON(res, 200, {
      city: payload.city,
      province: payload.province,
      year: payload.year,
      hijri: payload.hijri,
      date,
      jadwal: target,
      message: target ? undefined : "Tanggal di luar jadwal imsakiyah ini",
    });
  }

  if (req.query.format !== undefined && String(req.query.format).toLowerCase() === "csv") {
    const rows = [
      "day,date,imsak,subuh,zuhur,ashar,magrib,isya",
      ...payload.schedule.map((s) =>
        `${s.day},${s.date},${s.imsak},${s.subuh},${s.zuhur},${s.ashar},${s.magrib},${s.isya}`
      ),
    ].join("\n");
    res.setHeader("Content-Disposition", `attachment; filename="imsak-${city}-${yearRaw}.csv"`);
    return sendText(res, 200, rows, "text/csv; charset=utf-8");
  }

  return sendJSON(res, 200, { ...payload, hari_ini: todayEntry });
}

function discoverCities(year: string): string[] {
  try {
    const out: string[] = [];
    for (const file of readdirSync(join(DATA_DIR, "imsak"))) {
      const m = /^([a-z0-9-]+)-(\d{4})\.json$/.exec(file);
      if (m && m[2] === year) out.push(m[1]);
    }
    return out.sort();
  } catch {
    return [];
  }
}
