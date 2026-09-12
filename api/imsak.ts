import { VercelRequest, VercelResponse } from "@vercel/node";
import { ImsakFile, loadJson } from "../lib/load";

const IS_YEAR = /^\d{4}$/;

function send(res: VercelResponse, status: number, body: unknown) {
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  return res.status(status).json(body);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return send(res, 405, { error: "Method Not Allowed", hint: "Gunakan GET" });
  }

  const cityRaw = req.query.city as string | undefined;
  const yearRaw = (req.query.year as string | undefined) ?? new Date().getFullYear().toString();

  if (!IS_YEAR.test(yearRaw)) {
    return send(res, 400, { error: "Parameter 'year' harus 4 digit (contoh: 2026)" });
  }
  if (!cityRaw) {
    return send(res, 400, { error: "Parameter 'city' wajib diisi (misal: jakarta, surabaya)" });
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
    return send(res, 404, {
      error: `Belum ada jadwal imsakiyah untuk kota '${city}' tahun ${yearRaw}`,
      kota_tersedia: cities,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = payload.schedule.find((s) => s.date === today) ?? null;

  return send(res, 200, { ...payload, hari_ini: todayEntry });
}