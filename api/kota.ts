import { VercelRequest, VercelResponse } from "@vercel/node";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, ImsakFile, loadJson } from "../lib/load";
import { sendJSON } from "../lib/respond";

const IMSAK_RE = /^([a-z]+)-(\d{4})\.json$/;

interface CityInfo {
  city: string;
  province: string | null;
  timezone: string | null;
  years: number[];
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return sendJSON(res, 405, { error: "Method Not Allowed", hint: "Gunakan GET" });
  }

  const cities = availableCities();

  return sendJSON(res, 200, {
    kota_tersedia: cities.map((c) => c.city),
    jumlah_kota: cities.length,
    total_jadwal: cities.reduce((sum, c) => sum + c.years.length, 0),
    kota: cities,
    contoh: "/api/imsak?city=jakarta&year=2026",
  });
}

function availableCities(): CityInfo[] {
  const dir = join(DATA_DIR, "imsak");
  const byCity = new Map<string, CityInfo>();

  for (const file of readdirSync(dir)) {
    const match = IMSAK_RE.exec(file);
    if (!match) continue;
    const slug = match[1];
    const year = Number(match[2]);
    const info: CityInfo = byCity.get(slug) ?? { city: slug, province: null, timezone: null, years: [] };
    try {
      const payload = loadJson<ImsakFile>(`imsak/${file}`);
      info.province = payload.province;
      info.timezone = payload.timezone;
    } catch {
      // metadata opsional; jangan gagalkan daftar
    }
    if (!info.years.includes(year)) info.years.push(year);
    byCity.set(slug, info);
  }

  return [...byCity.values()]
    .map((info) => ({
      ...info,
      city: info.city.charAt(0).toUpperCase() + info.city.slice(1),
      years: info.years.sort((a, b) => a - b),
    }))
    .sort((a, b) => a.city.localeCompare(b.city));
}