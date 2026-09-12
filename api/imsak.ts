import { VercelRequest, VercelResponse } from "@vercel/node";
import { ImsakFile, loadJson } from "../lib/load";
import { IS_YEAR, isValidDateString } from "../lib/holidays";
import { sendJSON, sendText } from "../lib/respond";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return sendJSON(res, 405, { error: "Method Not Allowed", hint: "Gunakan GET" });
  }

  const cityRaw = req.query.city as string | undefined;
  const yearRaw = (req.query.year as string | undefined) ?? new Date().getFullYear().toString();

  if (!IS_YEAR.test(yearRaw)) {
    return sendJSON(res, 400, { error: "Parameter 'year' harus 4 digit (contoh: 2026)" });
  }
  if (!cityRaw) {
    return sendJSON(res, 400, { error: "Parameter 'city' wajib diisi (misal: jakarta, surabaya)" });
  }

  const city = cityRaw.trim().toLowerCase().replace(/ /g, "");
  let payload: ImsakFile;
  try {
    payload = loadJson<ImsakFile>(`imsak/${city}-${yearRaw}.json`);
  } catch {
    const cities = ["jakarta", "surabaya"].filter((c) => {
      try {
        loadJson<ImsakFile>(`imsak/${c}-${yearRaw}.json`);
        return true;
      } catch {
        return false;
      }
    });
    return sendJSON(res, 404, {
      error: `Belum ada jadwal imsakiyah untuk kota '${city}' tahun ${yearRaw}`,
      kota_tersedia: cities,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = payload.schedule.find((s) => s.date === today) ?? null;

  if (req.query.date !== undefined) {
    const date = String(req.query.date);
    if (!isValidDateString(date)) {
      return sendJSON(res, 400, { error: "Parameter 'date' harus YYYY-MM-DD yang valid" });
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