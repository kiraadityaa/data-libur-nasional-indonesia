/** Spesifikasi OpenAPI 3.1 tunggal untuk seluruh REST API. Dipakai oleh
 *  GET /api/openapi.json (live) dan scripts/build-site.mjs (static copy).
 */
export function buildOpenApiSpec(siteUrl: string) {
  const url = siteUrl.replace(/\/$/, "");
  return {
    openapi: "3.1.0",
    info: {
      title: "Data Libur Nasional Indonesia",
      version: "0.2.0",
      description:
        "REST API hari libur nasional, cuti bersama, dan jadwal imsakiyah Indonesia. JSON murni, gratis, tanpa kunci API. Sumber: SKB 3 Menteri & Bimas Islam Kemenag.",
      license: { name: "MIT" },
    },
    servers: [{ url }],
    paths: {
      "/api/libur": {
        get: {
          summary: "Cek libur / rekap tahunan / bulanan / berikutnya / rentang",
          parameters: [
            { name: "date", in: "query", schema: { type: "string", format: "date", example: "2026-08-17" } },
            { name: "year", in: "query", schema: { type: "string", example: "2026" } },
            { name: "month", in: "query", schema: { type: "string", example: "3" } },
            { name: "next", in: "query", schema: { type: "string", example: "1" } },
            { name: "count", in: "query", description: "Jumlah libur berikutnya (1-30, default 1)", schema: { type: "integer", minimum: 1, maximum: 30 } },
            { name: "type", in: "query", schema: { type: "string", enum: ["all", "libur", "cuti"], default: "all" } },
            { name: "from", in: "query", schema: { type: "string", format: "date" } },
            { name: "to", in: "query", schema: { type: "string", format: "date" } },
            { name: "format", in: "query", schema: { type: "string", enum: ["csv"] } },
          ],
          responses: { "200": { description: "OK" }, "400": { description: "Parameter salah" }, "404": { description: "Tahun belum tersedia" } },
        },
      },
      "/api/imsak": {
        get: {
          summary: "Jadwal imsakiyah 30 hari Ramadan per kota",
          parameters: [
            { name: "city", in: "query", required: true, schema: { type: "string", example: "jakarta" } },
            { name: "year", in: "query", schema: { type: "string", example: "2026" } },
            { name: "date", in: "query", schema: { type: "string", format: "date" } },
            { name: "format", in: "query", schema: { type: "string", enum: ["csv"] } },
          ],
          responses: { "200": { description: "OK" }, "404": { description: "Kota/tahun belum tersedia" } },
        },
      },
      "/api/kota": {
        get: { summary: "Daftar kota imsakiyah", responses: { "200": { description: "OK" } } },
      },
      "/api/libur.ics": {
        get: {
          summary: "Kalender iCalendar (RFC 5545)",
          parameters: [
            { name: "year", in: "query", schema: { type: "string", example: "2026" } },
            { name: "type", in: "query", schema: { type: "string", enum: ["all", "libur", "cuti"] } },
            { name: "next", in: "query", schema: { type: "string" } },
            { name: "count", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
            { name: "date", in: "query", schema: { type: "string", format: "date" } },
          ],
          responses: { "200": { description: "File .ics" } },
        },
      },
      "/api/health": {
        get: { summary: "Health check", responses: { "200": { description: "OK" } } },
      },
    },
  };
}
