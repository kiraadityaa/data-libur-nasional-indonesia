#!/usr/bin/env node
/**
 * Test kontrak REST API tanpa dependensi tambahan.
 *
 * - Kompilasi api/*.ts + lib/*.ts ke direktori sementara (tsc sudah ada).
 * - Panggil setiap handler dengan req/res mock, asersi via node:test + node:assert.
 *
 * Jalankan: npm run test:api
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
process.env.LIBUR_DATA_DIR = join(ROOT, "data");

const OUT = mkdtempSync(join(tmpdir(), "libur-api-"));
execFileSync(
  join(ROOT, "node_modules", ".bin", "tsc"),
  [
    "--outDir", OUT,
    "--module", "commonjs",
    "--target", "es2020",
    "--moduleResolution", "node",
    "--esModuleInterop",
    "--skipLibCheck",
    join(ROOT, "api", "libur.ts"),
    join(ROOT, "api", "imsak.ts"),
    join(ROOT, "api", "kota.ts"),
    join(ROOT, "api", "libur.ics.ts"),
    join(ROOT, "api", "health.ts"),
    join(ROOT, "api", "openapi.json.ts"),
    join(ROOT, "lib", "load.ts"),
    join(ROOT, "lib", "holidays.ts"),
    join(ROOT, "lib", "ics.ts"),
    join(ROOT, "lib", "respond.ts"),
    join(ROOT, "lib", "openapi.ts"),
  ],
  { stdio: "pipe" }
);

async function load(name) {
  const mod = await import(pathToFileURL(join(OUT, "api", name)).href);
  // Kompilasi CJS dari `export default` menghasilkan { default: fn }
  const exp = mod.default ?? mod;
  return exp.default ?? exp;
}

function req(method = "GET", query = {}, headers = {}) {
  return { method, query, headers };
}

function res() {
  const headers = {};
  const r = {
    statusCode: 200,
    body: undefined,
    headers,
    status(code) { r.statusCode = code; return r; },
    json(b) { r.body = b; return r; },
    send(b) { r.body = b; return r; },
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    getHeader(k) { return headers[k.toLowerCase()]; },
  };
  return r;
}

async function call(handler, method, query, headers) {
  const response = res();
  await handler(req(method, query, headers), response);
  return response;
}

const handlers = {};
for (const f of ["libur.js", "imsak.js", "kota.js", "libur.ics.js", "health.js", "openapi.json.js"]) {
  handlers[f] = await load(f);
}
const libur = handlers["libur.js"];
const imsak = handlers["imsak.js"];
const kota = handlers["kota.js"];
const ics = handlers["libur.ics.js"];
const health = handlers["health.js"];
const openapi = handlers["openapi.json.js"];

// ---------- /api/libur ----------
await test("libur: cek tanggal libur", async () => {
  const r = await call(libur, "GET", { date: "2026-08-17" });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.is_holiday, true);
  assert.equal(r.body.libur_nasional.name, "Hari Proklamasi Kemerdekaan RI");
});

await test("libur: bukan tanggal libur", async () => {
  const r = await call(libur, "GET", { date: "2026-06-11" });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.is_holiday, false);
});

await test("libur: tanggal invalid → 400", async () => {
  const r = await call(libur, "GET", { date: "2026-13-99" });
  assert.equal(r.statusCode, 400);
  assert.match(r.body.error, /date/);
});

await test("libur: rekap setahun", async () => {
  const r = await call(libur, "GET", { year: "2026" });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.total_libur_nasional, 17);
  assert.equal(r.body.total_cuti_bersama, 8);
});

await test("libur: tahun tak dikenal → 404", async () => {
  const r = await call(libur, "GET", { year: "1999" });
  assert.equal(r.statusCode, 404);
  assert.ok(Array.isArray(r.body.tahun_tersedia));
});

await test("libur: filter type=libur menyembunyikan cuti", async () => {
  const r = await call(libur, "GET", { date: "2026-03-23", type: "cuti" });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.is_holiday, true);
  assert.equal(r.body.libur_nasional, null);
  const r2 = await call(libur, "GET", { date: "2026-03-23", type: "libur" });
  assert.equal(r2.body.is_holiday, false);
});

await test("libur: type invalid → 400", async () => {
  const r = await call(libur, "GET", { year: "2026", type: "ngawur" });
  assert.equal(r.statusCode, 400);
});

await test("libur: next count=3", async () => {
  const r = await call(libur, "GET", { next: "1", date: "2026-06-11", count: "3" });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.count, 3);
  assert.deepEqual(
    r.body.libur_berikutnya.map((x) => x.date),
    ["2026-06-16", "2026-08-17", "2026-08-25"]
  );
});

await test("libur: next count di luar 1-30 → 400", async () => {
  const r = await call(libur, "GET", { next: "1", count: "99" });
  assert.equal(r.statusCode, 400);
});

await test("libur: rentang from/to", async () => {
  const r = await call(libur, "GET", { from: "2026-03-20", to: "2026-03-24" });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.total, 5);
});

await test("libur: bulan + csv", async () => {
  const r = await call(libur, "GET", { year: "2026", month: "3", format: "csv" });
  assert.equal(r.statusCode, 200);
  assert.match(r.headers["content-type"], /text\/csv/);
  assert.ok(r.body.split("\n").length >= 8);
});

await test("libur: POST → 405, OPTIONS → 204", async () => {
  assert.equal((await call(libur, "POST", {})).statusCode, 405);
  assert.equal((await call(libur, "OPTIONS", {})).statusCode, 204);
});

// ---------- /api/imsak ----------
await test("imsak: tanpa city → 400", async () => {
  const r = await call(imsak, "GET", { year: "2026" });
  assert.equal(r.statusCode, 400);
});

await test("imsak: kota tak dikenal → 404 + kota_tersedia", async () => {
  const r = await call(imsak, "GET", { city: "atlantis", year: "2026" });
  assert.equal(r.statusCode, 404);
  assert.ok(r.body.kota_tersedia.includes("jakarta"));
});

await test("imsak: jakarta 30 hari + satu tanggal", async () => {
  const r = await call(imsak, "GET", { city: "Jakarta", year: "2026" });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.schedule.length, 30);
  const d = await call(imsak, "GET", { city: "jakarta", year: "2026", date: "2026-03-01" });
  assert.equal(d.body.jadwal.imsak, "04:33");
});

// ---------- /api/kota, /api/health, /api/openapi.json ----------
await test("kota: daftar 2 kota", async () => {
  const r = await call(kota, "GET", {});
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.jumlah_kota, 2);
  assert.ok(r.body.kota_tersedia.includes("Jakarta"));
});

await test("health: umur data + tahun", async () => {
  const r = await call(health, "GET", {});
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.ok, true);
  assert.ok(r.body.tahun_tersedia.includes("2026"));
  assert.equal(typeof r.body.data_age_days, "number");
  assert.ok(r.body.data_age_days >= 0);
});

await test("openapi: spec 3.1 valid bentuk", async () => {
  const r = await call(openapi, "GET", {}, { host: "example.test" });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.openapi, "3.1.0");
  assert.ok(r.body.paths["/api/libur"]);
});

// ---------- /api/libur.ics ----------
await test("ics: kalender valid + type filter", async () => {
  const r = await call(ics, "GET", { year: "2026" });
  assert.equal(r.statusCode, 200);
  assert.match(r.headers["content-type"], /text\/calendar/);
  assert.ok(r.body.includes("BEGIN:VCALENDAR"));
  assert.ok(r.body.includes("SUMMARY:Hari Proklamasi Kemerdekaan RI"));
  const cutiOnly = await call(ics, "GET", { year: "2026", type: "cuti" });
  assert.ok(!cutiOnly.body.includes("Proklamasi"));
  const bad = await call(ics, "GET", { year: "2026", type: "ngawur" });
  assert.equal(bad.statusCode, 400);
});

// Test di atas berjalan otomatis via TAP runner bawaan node:test
// (exit code bukan 0 bila ada yang gagal). Bersihkan kompilasi sementara.
rmSync(OUT, { recursive: true, force: true });
