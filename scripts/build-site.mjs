#!/usr/bin/env node
/**
 * Orkestrasi build halaman statis: baca data/ → render via scripts/site/template.mjs
 * → tulis public/index.html + salin aset (styles.css, app.js) + openapi.json +
 * manifest + sitemap.xml.
 *
 * Jalankan: npm run build:site
 */
import { readFileSync, writeFileSync, readdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  esc,
  calendarStrip,
  endpointList,
  holidayGroups,
  monthPills,
  imsakTables,
  imsakCards,
  longDateId,
} from "./site/template.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const PUB = join(ROOT, "public");
const SITE = join(ROOT, "scripts", "site");
const SITE_URL = (process.env.SITE_URL ?? "https://data-libur-nasional-indonesia.vercel.app").replace(/\/$/, "");
const VERSION = "0.2.0";

function readJson(rel) {
  return JSON.parse(readFileSync(join(DATA, rel), "utf-8"));
}

const libur = readJson("libur-nasional.json");
const cuti = readJson("cuti-bersama.json");

const YEARS = Object.keys(libur.years).sort();
const YEAR = YEARS.pop();
const liburYear = libur.years[YEAR]?.holidays ?? [];
const cutiYear = cuti.years[YEAR]?.holidays ?? [];

const merged = new Map();
for (const e of liburYear) merged.set(e.date, { date: e.date, name: e.name, jenis: ["libur_nasional"] });
for (const e of cutiYear) {
  const hit = merged.get(e.date);
  if (hit) {
    hit.name = `${hit.name} • ${e.name}`;
    hit.jenis.push("cuti_bersama");
  } else {
    merged.set(e.date, { date: e.date, name: e.name, jenis: ["cuti_bersama"] });
  }
}
const allEntries = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));

const imsakCities = readdirSync(join(DATA, "imsak"))
  .filter((f) => /\.json$/.test(f))
  .map((f) => ({ slug: f.replace(/\.json$/, "").replace(/-\d{4}$/, ""), payload: readJson(`imsak/${f}`) }))
  .sort((a, b) => a.payload.city.localeCompare(b.payload.city));

if (!imsakCities.length) throw new Error("Tidak ada data imsakiyah untuk disuntikkan.");

const snapshot = {
  year: YEAR,
  years: YEARS.concat([YEAR]).sort(),
  version: VERSION,
  updated_at: libur.updated_at,
  entries: allEntries,
  imsak: imsakCities.map((c) => ({
    slug: c.slug,
    city: c.payload.city,
    province: c.payload.province,
    timezone: c.payload.timezone,
    hijri: c.payload.hijri,
    year: c.payload.year,
  })),
};

const updatedDay = String(libur.updated_at).slice(0, 10);
const c1 = imsakCities[0].payload;
const sources = [...libur.sources, ...cuti.sources];
const seenSrc = new Map();
for (const s of sources) if (!seenSrc.has(s.name)) seenSrc.set(s.name, s);

const html = `<!doctype html>
<html lang="id" data-theme="light">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>libur.id — API Hari Libur Nasional, Cuti Bersama & Imsakiyah Indonesia</title>
<meta name="description" content="REST API gratis hari libur nasional, cuti bersama, dan jadwal imsakiyah Indonesia. Data resmi SKB 3 Menteri dan Bimas Islam Kemenag. JSON murni, tanpa kunci API." />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="${SITE_URL}/" />
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#fafaf9" />
<meta property="og:title" content="libur.id — API hari libur, cuti bersama & imsakiyah Indonesia" />
<meta property="og:description" content="Data resmi ${YEAR} dalam satu API. JSON murni, gratis, tanpa kunci." />
<meta property="og:type" content="website" />
<meta property="og:url" content="${SITE_URL}/" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='5' fill='%23be123c'/%3E%3Crect x='5' y='7' width='14' height='3' rx='1' fill='white'/%3E%3Crect x='5' y='14' width='14' height='3' rx='1' fill='white'/%3E%3C/svg%3E" />
<link rel="preload" href="/fonts/plus-jakarta-sans-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/jetbrains-mono-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="/styles.css" />
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Dataset","name":"Data libur nasional, cuti bersama, dan imsakiyah Indonesia","description":"Hari libur nasional, cuti bersama, dan jadwal imsakiyah Indonesia","url":"${SITE_URL}/","version":"${VERSION}","license":"https://opensource.org/licenses/MIT","includedInDataCatalog":{"@type":"DataCatalog","name":"SKB 3 Menteri & Bimas Islam Kemenag"}}
</script>
<script>
window.__DATA__ = ${JSON.stringify(snapshot).replace(/</g, "\\u003c")};
</script>
<script src="/app.js" defer></script>
</head>
<body>
<a class="skip" href="#main">Langsung ke konten</a>
<div class="wrap">

<header class="top">
  <a class="brand" href="/" aria-label="Beranda libur.id">libur<b>.id</b></a>
  <nav class="nav" aria-label="Navigasi utama">
    <a href="#api">API</a>
    <a href="#data">Data ${YEAR}</a>
    <a href="#imsak">Imsakiyah</a>
    <span class="ver">v${VERSION}</span>
    <button class="theme-btn" id="themeBtn" type="button" aria-label="Ganti tema">Sun</button>
  </nav>
</header>

<main id="main">

<div class="hero">
  <div>
    <p class="status"><i></i>Data resmi · SKB 3 Menteri &amp; Kemenag · diperbarui ${esc(updatedDay)}</p>
    <h1>Hari libur Indonesia, satu API.</h1>
    <p class="sub">Libur nasional, cuti bersama, dan imsakiyah dalam JSON murni. Gratis, tanpa kunci, untuk bahasa apa pun.</p>
    <div class="cta">
      <a class="btn btn-p" href="#play">Coba langsung</a>
      <a class="btn btn-g" href="/openapi.json">Spesifikasi</a>
    </div>
  </div>
  ${calendarStrip(allEntries, YEAR)}
</div>

<div class="stats" aria-label="Ringkasan data">
  <div class="stat"><b>${liburYear.length}</b><span>libur nasional ${YEAR}</span></div>
  <div class="stat"><b>${cutiYear.length}</b><span>cuti bersama</span></div>
  <div class="stat"><b>${imsakCities.length}</b><span>kota imsakiyah</span></div>
  <div class="stat"><b>${allEntries.length}</b><span>total tanggal</span></div>
</div>

<section class="block" id="api">
  <h2>Endpoint</h2>
  <p class="sec-sub">Lima endpoint, semua GET dengan cache publik. Klik contoh untuk mengisinya ke playground.</p>
  ${endpointList(YEAR)}
</section>

<section class="block" id="play">
  <h2>Playground</h2>
  <p class="sec-sub">Memanggil API sungguhan dari browser. Tautan hasil bisa dibagikan.</p>
  <div class="term">
    <div class="term-bar">
      <div class="tabs" role="tablist" aria-label="Mode playground">
        <button class="tab" role="tab" aria-selected="true" data-tab="libur-pane" type="button">Libur</button>
        <button class="tab" role="tab" aria-selected="false" data-tab="range-pane" type="button">Rentang</button>
        <button class="tab" role="tab" aria-selected="false" data-tab="imsak-pane" type="button">Imsakiyah</button>
        <button class="tab" role="tab" aria-selected="false" data-tab="ics-pane" type="button">Kalender</button>
      </div>
      <span class="req-status" id="reqStatus" aria-live="polite"></span>
    </div>
    <div class="term-body">
      <div data-pane="libur-pane">
        <div class="ctl">
          <div class="field"><span>Tanggal</span><input id="dateInput" type="date" value="${YEAR}-08-17" /></div>
          <div class="field"><span>Mode</span><select id="liburMode">
            <option value="date">Satu tanggal</option>
            <option value="year">Setahun</option>
            <option value="month">Satu bulan</option>
            <option value="next">Berikutnya</option>
          </select></div>
          <div class="field" id="monthWrap" hidden><span>Bulan</span><select id="monthInput">
            ${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => `<option value="${i + 1}">${m}</option>`).join("")}
          </select></div>
          <div class="field" id="countWrap" hidden><span>Jumlah 1–30</span><input id="countInput" type="number" min="1" max="30" value="3" /></div>
          <div class="field"><span>Jenis</span><select id="liburType">
            <option value="all">Semua</option><option value="libur">Nasional</option><option value="cuti">Cuti</option>
          </select></div>
          <button class="btn btn-p" id="liburGo" type="button">Kirim</button>
        </div>
        <div class="out"><pre id="liburPre">Tekan Kirim untuk memanggil API.</pre></div>
        <div class="term-actions">
          <button class="mini-btn" id="copyOut" type="button">Salin respons</button>
          <button class="mini-btn" id="copyCurl" type="button">Salin cURL</button>
        </div>
      </div>
      <div data-pane="range-pane" hidden>
        <div class="ctl">
          <div class="field"><span>Dari</span><input id="fromInput" type="date" value="${YEAR}-03-20" /></div>
          <div class="field"><span>Sampai</span><input id="toInput" type="date" value="${YEAR}-03-24" /></div>
          <button class="btn btn-p" id="rangeGo" type="button">Kirim</button>
        </div>
        <div class="out"><pre id="rangePre">Isi rentang lalu tekan Kirim.</pre></div>
      </div>
      <div data-pane="imsak-pane" hidden>
        <div class="ctl">
          <div class="field"><span>Kota</span><select id="imsakCity">
            ${imsakCities.map((c) => `<option value="${esc(c.slug)}">${esc(c.payload.city)}</option>`).join("")}
          </select></div>
          <div class="field"><span>Tahun</span><select id="imsakYear">
            ${YEARS.concat([YEAR]).sort().map((y) => `<option${y === YEAR ? " selected" : ""}>${y}</option>`).join("")}
          </select></div>
          <button class="btn btn-p" id="imsakGo" type="button">Kirim</button>
        </div>
        <div class="out"><pre id="imsakPre">Pilih kota lalu tekan Kirim.</pre></div>
      </div>
      <div data-pane="ics-pane" hidden>
        <div class="ctl">
          <div class="field"><span>Isi</span><select id="icsType">
            <option value="all">Libur + cuti</option><option value="libur">Nasional saja</option><option value="cuti">Cuti saja</option>
          </select></div>
          <div class="field"><span>Tahun</span><select id="icsYear">
            ${YEARS.concat([YEAR]).sort().map((y) => `<option${y === YEAR ? " selected" : ""}>${y}</option>`).join("")}
          </select></div>
          <button class="btn btn-p" id="icsGo" type="button">Unduh .ics</button>
        </div>
        <div class="out"><pre>File dibuka di Google Calendar (Settings → Import) atau Apple Calendar. URL langganan: <span id="icsUrl"></span></pre></div>
      </div>
    </div>
  </div>
</section>

<section class="block" id="data">
  <h2>Data ${YEAR}</h2>
  <p class="sec-sub" id="dataMeta">${allEntries.length} tanggal ditampilkan</p>
  <div class="data-tools">
    <input id="searchInput" type="search" placeholder="Cari nama atau tanggal…" aria-label="Cari libur" />
    <select id="jenisFilter" aria-label="Filter jenis">
      <option value="all">Semua jenis</option>
      <option value="libur_nasional">Nasional saja</option>
      <option value="cuti_bersama">Cuti saja</option>
    </select>
  </div>
  <div class="month-pills" id="monthFilter" role="group" aria-label="Filter bulan">
    ${monthPills(allEntries, YEAR)}
  </div>
  <div id="liburList">
${holidayGroups(allEntries, YEAR)}
  </div>
  <div class="empty" id="emptyState" hidden>Tidak ada yang cocok. <button class="mini-btn" id="resetFilter" type="button">Atur ulang</button></div>
</section>

<section class="block" id="imsak">
  <h2>Imsakiyah ${YEAR}</h2>
  <p class="sec-sub">30 hari Ramadan dari Bimas Islam Kemenag, zona waktu lokal tiap kota.</p>
  <div class="imtabs" role="group" aria-label="Pilih kota">
    ${imsakCities.map((c, i) => `<button class="imtab" data-city="${esc(c.slug)}" aria-pressed="${i === 0}" type="button">${esc(c.payload.city)}</button>`).join("\n    ")}
  </div>
  <p class="immeta" id="imMeta">${esc(c1.city)} · ${esc(c1.province)} · ${esc(c1.timezone)} · ${esc(c1.hijri)}</p>
  <div class="imtable-wrap">${imsakTables(imsakCities)}</div>
  <div class="imcards">${imsakCards(imsakCities)}</div>
</section>

<section class="block" id="pakai">
  <h2>Pakai di proyekmu</h2>
  <p class="sec-sub">Tiga bahasa, satu pola: fetch, parse, selesai.</p>
  <div>
    <div class="usetabs" role="tablist" aria-label="Contoh kode">
      <button class="usetab" role="tab" aria-selected="true" data-tab="use-curl" type="button">cURL</button>
      <button class="usetab" role="tab" aria-selected="false" data-tab="use-py" type="button">Python</button>
      <button class="usetab" role="tab" aria-selected="false" data-tab="use-js" type="button">JavaScript</button>
    </div>
    <div class="codebox" data-pane="use-curl"><pre>curl "${SITE_URL}/api/libur?date=${YEAR}-08-17" | python3 -m json.tool</pre><button type="button" data-copy="curl ${SITE_URL}/api/libur?date=${YEAR}-08-17">Salin</button></div>
    <div class="codebox" data-pane="use-py" hidden><pre>from hapilibur import is_libur, upcoming
is_libur("${YEAR}-08-17")  # True
upcoming()  # libur terdekat</pre><button type="button" data-copy="from hapilibur import is_libur, upcoming">Salin</button></div>
    <div class="codebox" data-pane="use-js" hidden><pre>const r = await fetch("/api/libur?date=${YEAR}-08-17");
const data = await r.json(); // { is_holiday: true, … }</pre><button type="button" data-copy="const r = await fetch('${SITE_URL}/api/libur?date=${YEAR}-08-17'); const data = await r.json();">Salin</button></div>
  </div>
  <div class="icsline">
    <div><code>${SITE_URL}/api/libur.ics?year=${YEAR}</code><p>Tempel ke Google / Apple Calendar untuk berlangganan.</p></div>
    <button class="mini-btn" type="button" data-copy="${SITE_URL}/api/libur.ics?year=${YEAR}">Salin</button>
  </div>
</section>

</main>

<footer>
  <div class="foot">
    <b>libur.id</b>
    <span>Sumber: ${[...seenSrc.values()].map((s) => `<a href="${esc(s.url)}" rel="noopener">${esc(s.title ?? s.name)}</a>`).join(" · ")}</span>
    <a href="/openapi.json">OpenAPI</a>
    <a href="/api/health">Health</a>
    <a href="https://github.com/kiraadityaa/data-libur-nasional-indonesia" rel="noopener">GitHub</a>
  </div>
  <p class="license">MIT · Data publik instansi pemerintah, atribusi dicantumkan. Halaman statis, data dibundel sebagai JSON.</p>
</footer>

</div>
</body>
</html>
`;

writeFileSync(join(PUB, "index.html"), html, "utf-8");
console.log(`build-site: ${YEAR} · ${liburYear.length} libur · ${cutiYear.length} cuti · ${imsakCities.length} kota`);
console.log(`wrote public/index.html (${(html.length / 1024).toFixed(1)} KiB)`);

copyFileSync(join(SITE, "styles.css"), join(PUB, "styles.css"));
copyFileSync(join(SITE, "app.js"), join(PUB, "app.js"));
console.log("copied public/styles.css + public/app.js");

const openapi = JSON.stringify(buildOpenApi(), null, 2) + "\n";
writeFileSync(join(PUB, "openapi.json"), openapi, "utf-8");
console.log(`wrote public/openapi.json (${(openapi.length / 1024).toFixed(1)} KiB)`);

const manifest = JSON.stringify(
  {
    name: "libur.id — API hari libur, cuti bersama & imsakiyah Indonesia",
    short_name: "libur.id",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#be123c",
    description: "Hari libur, cuti bersama, dan jadwal imsakiyah Indonesia — JSON murni, gratis.",
    icons: [],
  },
  null,
  2
) + "\n";
writeFileSync(join(PUB, "manifest.webmanifest"), manifest, "utf-8");
console.log("wrote public/manifest.webmanifest");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `  <url><loc>${SITE_URL}/</loc><lastmod>${updatedDay}</lastmod></url>\n` +
  [`api/libur`, `api/imsak`, `api/kota`, `api/libur.ics`, `api/health`, `openapi.json`, `styles.css`, `app.js`]
    .map((p) => `  <url><loc>${SITE_URL}/${p}</loc><lastmod>${updatedDay}</lastmod></url>`)
    .join("\n") +
  `\n</urlset>\n`;
writeFileSync(join(PUB, "sitemap.xml"), sitemap, "utf-8");
console.log("wrote public/sitemap.xml");

function buildOpenApi() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Data Libur Nasional Indonesia",
      version: VERSION,
      description:
        "REST API hari libur nasional, cuti bersama, dan jadwal imsakiyah Indonesia. JSON murni, gratis, tanpa kunci API. Sumber: SKB 3 Menteri & Bimas Islam Kemenag.",
      license: { name: "MIT" },
    },
    servers: [{ url: SITE_URL }],
    paths: {
      "/api/libur": {
        get: {
          summary: "Cek libur / rekap tahunan / bulanan / berikutnya / rentang",
          parameters: [
            { name: "date", in: "query", schema: { type: "string", format: "date", example: "2026-08-17" } },
            { name: "year", in: "query", schema: { type: "string", example: "2026" } },
            { name: "month", in: "query", schema: { type: "string", example: "3" } },
            { name: "next", in: "query", schema: { type: "string", example: "1" } },
            { name: "count", in: "query", description: "Jumlah libur berikutnya (1-30)", schema: { type: "integer", minimum: 1, maximum: 30 } },
            { name: "type", in: "query", schema: { type: "string", enum: ["all", "libur", "cuti"], default: "all" } },
            { name: "from", in: "query", schema: { type: "string", format: "date" } },
            { name: "to", in: "query", schema: { type: "string", format: "date" } },
            { name: "format", in: "query", schema: { type: "string", enum: ["csv"] } },
          ],
          responses: { 200: { description: "OK" }, 400: { description: "Parameter salah" }, 404: { description: "Tahun belum tersedia" } },
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
          responses: { 200: { description: "OK" }, 404: { description: "Kota/tahun belum tersedia" } },
        },
      },
      "/api/kota": { get: { summary: "Daftar kota imsakiyah", responses: { 200: { description: "OK" } } } },
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
          responses: { 200: { description: "File .ics" } },
        },
      },
      "/api/health": { get: { summary: "Health check", responses: { 200: { description: "OK" } } } },
    },
  };
}
