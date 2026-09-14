/* libur.id — fungsi render per seksi. Murni presentasi; data masuk via argumen. */

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function dayNameId(iso) {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" }).format(
    new Date(iso + "T00:00:00Z")
  );
}

export function longDateId(iso) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(iso + "T00:00:00Z"));
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/* ---------- hero: kalender 12 bulan dari data ---------- */
export function calendarStrip(entries, year) {
  const cells = MONTHS_SHORT.map((short, i) => {
    const m = String(i + 1).padStart(2, "0");
    const hits = entries.filter((e) => e.date.startsWith(`${year}-${m}-`));
    const dots = hits
      .slice(0, 12)
      .map((e) => `<i class="${e.jenis.includes("libur_nasional") ? "l" : "c"}"></i>`)
      .join("");
    return `<div class="mcell${hits.length ? " has" : ""}"><s>${short}</s><div class="dots">${dots}</div></div>`;
  }).join("");
  const next = entries[0];
  return `<div class="cal" aria-label="Peta libur ${year}">
    <div class="cal-head"><b>Libur berikutnya</b><span id="daysLeft">…</span></div>
    <div class="cal-grid">${cells}</div>
    <div class="cal-foot">Berikutnya: <b>${next ? esc(next.name) : "—"}</b><br><span class="mono">${next ? esc(next.date) : ""}${next ? ` · ${esc(longDateId(next.date))}` : ""}</span></div>
  </div>`;
}

/* ---------- daftar endpoint ---------- */
export function endpointList(year) {
  const rows = [
    {
      path: "/api/libur?date=…", desc: "Cek satu tanggal: libur nasional, cuti bersama, atau bukan.",
      ex: `/api/libur?date=${year}-08-17`, exLabel: `?date=${year}-08-17`,
    },
    {
      path: "/api/libur?year=…", desc: "Rekap setahun. Tambah &format=csv untuk spreadsheet.",
      ex: `/api/libur?year=${year}`, exLabel: `?year=${year}`,
    },
    {
      path: "/api/libur?next=1", desc: "N libur terdekat (&count=1–30, &type=all|libur|cuti, &from/&to).",
      ex: `/api/libur?next=1&date=${year}-06-11&count=3`, exLabel: "?next=1&count=3",
    },
    {
      path: "/api/imsak?city=…", desc: "Imsakiyah 30 hari: imsak, subuh, zuhur, ashar, magrib, isya.",
      ex: null, exLabel: "?city=jakarta",
    },
    {
      path: "/api/libur.ics", desc: "Kalender RFC 5545 untuk Google / Apple Calendar.",
      ex: null, exLabel: `?year=${year}`,
    },
  ];
  return `<div class="eplist">${rows
    .map(
      (r) => `<div class="eprow"${r.ex ? ` data-fill="${esc(r.ex)}" role="button" tabindex="0"` : ""}>` +
        `<span class="verb">GET</span>` +
        `<div><div class="eppath">${esc(r.path)}</div><div class="epdesc">${esc(r.desc)}</div></div>` +
        `<button class="epex" type="button"${r.ex ? ` data-fill="${esc(r.ex)}"` : ""}>${esc(r.exLabel)}</button></div>`
    )
    .join("")}</div>
    <p class="ep-spec">Spesifikasi lengkap: <a href="/openapi.json"><code>/openapi.json</code></a> · Health: <a href="/api/health"><code>/api/health</code></a></p>`;
}

/* ---------- daftar libur per bulan ---------- */
export function holidayGroups(entries, year) {
  const out = [];
  for (let m = 0; m < 12; m++) {
    const prefix = `${year}-${String(m + 1).padStart(2, "0")}-`;
    const list = entries.filter((e) => e.date.startsWith(prefix));
    if (!list.length) continue;
    const rows = list
      .map(
        (e) =>
          `<div class="hrow" data-jenis="${e.jenis.join(" ")}" data-search="${esc(
            (e.date + " " + e.name + " " + dayNameId(e.date)).toLowerCase()
          )}">` +
          `<span class="hdate">${esc(e.date)} · ${esc(dayNameId(e.date))}</span>` +
          `<span class="hname">${esc(e.name)}</span>` +
          `<span>${e.jenis
            .map((j) =>
              j === "libur_nasional"
                ? `<span class="htag l">Libur nasional</span>`
                : `<span class="htag">Cuti bersama</span>`
            )
            .join(" ")}</span></div>`
      )
      .join("");
    out.push(
      `<div class="mgroup" data-month="${m + 1}"><h3>${MONTHS_ID[m]}<span>${list.length} tanggal</span></h3>${rows}</div>`
    );
  }
  return out.join("\n");
}

export function monthPills(entries, year) {
  const seen = new Set(entries.map((e) => Number(e.date.slice(5, 7))));
  const btns = [`<button data-month="0" aria-pressed="true" type="button">Semua</button>`];
  for (let m = 1; m <= 12; m++) {
    if (seen.has(m)) btns.push(`<button data-month="${m}" aria-pressed="false" type="button">${MONTHS_SHORT[m - 1]}</button>`);
  }
  return btns.join("\n");
}

/* ---------- imsak: tabel + kartu ---------- */
export function imsakTables(cities) {
  return cities
    .map(
      (c, i) =>
        `<div class="imtable-wrap" data-imsak-table="${esc(c.slug)}"${i === 0 ? "" : " hidden"}>` +
        `<table class="imtable"><thead><tr><th>Tanggal</th><th>Imsak</th><th>Subuh</th><th>Zuhur</th><th>Ashar</th><th>Magrib</th><th>Isya</th></tr></thead><tbody>` +
        c.payload.schedule
          .map(
            (s) =>
              `<tr><td class="mono">${esc(s.date)}</td><td class="mono">${esc(s.imsak)}</td>` +
              `<td class="mono">${esc(s.subuh)}</td><td class="mono">${esc(s.zuhur)}</td>` +
              `<td class="mono">${esc(s.ashar)}</td><td class="mono">${esc(s.magrib)}</td>` +
              `<td class="mono">${esc(s.isya)}</td></tr>`
          )
          .join("") +
        `</tbody></table></div>`
    )
    .join("\n");
}

export function imsakCards(cities) {
  return cities
    .map(
      (c, i) =>
        `<div data-imsak-cards="${esc(c.slug)}"${i === 0 ? "" : " hidden"}>` +
        c.payload.schedule
          .map(
            (s) =>
              `<div class="imcard"><div class="imcard-head"><b>Hari ${s.day}</b><span>${esc(s.date)}</span></div>` +
              `<div class="big"><small>Imsak</small>${esc(s.imsak)}</div>` +
              `<div class="prayers">` +
              `<div><s>Subuh</s><b>${esc(s.subuh)}</b></div>` +
              `<div><s>Zuhur</s><b>${esc(s.zuhur)}</b></div>` +
              `<div><s>Ashar</s><b>${esc(s.ashar)}</b></div>` +
              `<div><s>Magrib</s><b>${esc(s.magrib)}</b></div>` +
              `<div><s>Isya</s><b>${esc(s.isya)}</b></div>` +
              `</div></div>`
          )
          .join("") +
        `</div>`
    )
    .join("\n");
}
