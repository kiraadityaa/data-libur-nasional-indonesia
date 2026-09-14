import { VercelRequest, VercelResponse } from "@vercel/node";
import { HolidayFile, loadJson } from "../lib/load";
import { listYearsHolidays } from "../lib/holidays";
import { sendJSON, sendOptions } from "../lib/respond";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return sendOptions(res);
  if (req.method !== "GET") {
    return sendJSON(res, 405, { error: "Method Not Allowed", hint: "Gunakan GET" });
  }
  const libur = loadJson<HolidayFile>("libur-nasional.json");
  return sendJSON(
    res,
    200,
    {
      ok: true,
      version: "0.2.0",
      tahun_tersedia: listYearsHolidays(libur),
      waktu_wib: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    },
    { maxAge: 60, sMaxAge: 300 }
  );
}
