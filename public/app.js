/* libur.id — interaksi. Tanpa interval, tanpa scroll listener. */
(function () {
  "use strict";
  var D = window.__DATA__ || { entries: [], imsak: [], year: "" };
  var BASE = "";
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* ---------- tema (default terang, hormati simpanan) ---------- */
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  if (saved === "light" || saved === "dark") {
    root.setAttribute("data-theme", saved);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  }
  function syncGlyph() {
    var b = $("#themeBtn");
    if (b) b.textContent = root.getAttribute("data-theme") === "dark" ? "Moon" : "Sun";
  }
  var themeBtn = $("#themeBtn");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    syncGlyph();
  });
  syncGlyph();

  /* ---------- sisa hari statis (tanpa interval) ---------- */
  function todayWIB() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
  }
  (function () {
    var el = $("#daysLeft");
    if (!el) return;
    var t = todayWIB();
    for (var i = 0; i < D.entries.length; i++) {
      if (D.entries[i].date >= t) {
        var ms = new Date(D.entries[i].date + "T00:00:00Z").getTime() - Date.now();
        var days = Math.max(0, Math.round(ms / 864e5));
        el.textContent = days === 0 ? "hari ini" : days + " hari lagi";
        return;
      }
    }
    el.textContent = "di luar jangkauan data";
  })();

  /* ---------- tab generik (scope = leluhur terdekat yang memuat pane) ---------- */
  function wireTabs(tabSel, attr) {
    var tabs = $$(tabSel);
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var scope = tab.parentElement;
        while (scope && !scope.querySelector("[data-pane]")) scope = scope.parentElement;
        scope = scope || document;
        var peers = Array.prototype.slice.call(scope.querySelectorAll(tabSel));
        peers.forEach(function (t) { t.setAttribute("aria-selected", "false"); });
        tab.setAttribute("aria-selected", "true");
        Array.prototype.slice.call(scope.querySelectorAll("[data-pane]")).forEach(function (p) {
          p.hidden = p.getAttribute("data-pane") !== tab.getAttribute(attr);
        });
      });
    });
  }
  wireTabs(".tab", "data-tab");
  wireTabs(".usetab", "data-tab");

  /* ---------- endpoint: klik contoh -> isi playground ---------- */
  $$(".eprow").forEach(function (row) {
    row.addEventListener("click", function () {
      var path = row.getAttribute("data-fill");
      if (!path) return;
      var m = /\/api\/libur\?date=([\d-]+)/.exec(path);
      var dateInput = $("#dateInput");
      if (m && dateInput) {
        activatePlayTab("date-pane");
        dateInput.value = m[1];
        runLibur();
      } else {
        activatePlayTab("date-pane");
        runLiburPath(path);
      }
      document.getElementById("play").scrollIntoView({ behavior: "auto", block: "start" });
    });
  });
  function activatePlayTab(pane) {
    $$(".tab").forEach(function (t) {
      t.setAttribute("aria-selected", t.getAttribute("data-tab") === pane ? "true" : "false");
    });
    $$("#play [data-pane]").forEach(function (p) { p.hidden = p.getAttribute("data-pane") !== pane; });
  }

  /* ---------- playground ---------- */
  var lastOut = "";
  var lastUrl = "";
  function setStatus(txt, cls) {
    var el = $("#reqStatus");
    if (!el) return;
    el.textContent = txt;
    el.className = "req-status" + (cls ? " " + cls : "");
  }
  function skeleton(pre) {
    pre.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "skel";
    [90, 70, 80].forEach(function (w) {
      var i = document.createElement("i");
      i.style.width = w + "%";
      wrap.appendChild(i);
    });
    pre.appendChild(wrap);
  }
  function fetchShow(path, preId) {
    var pre = document.getElementById(preId);
    var url = BASE + path;
    lastUrl = url;
    setStatus("GET " + path, "");
    skeleton(pre);
    var t0 = performance.now();
    fetch(url).then(function (r) {
      var ms = Math.round(performance.now() - t0);
      return r.json().then(function (b) { return { s: r.status, ok: r.ok, ms: ms, b: b }; });
    }).then(function (x) {
      pre.textContent = JSON.stringify(x.b, null, 2);
      lastOut = pre.textContent;
      setStatus(x.s + " · " + x.ms + " ms", x.ok ? "ok" : "err");
      try {
        var u = new URL(url, location.origin);
        history.replaceState(null, "", "#" + u.pathname.replace(/^\//, "") + u.search);
      } catch (e) {}
    }).catch(function () {
      pre.textContent = "Gagal menghubungi API. Periksa koneksi lalu coba lagi.";
      lastOut = pre.textContent;
      setStatus("network error", "err");
    });
  }
  function runLiburPath(path) { fetchShow(path, "liburPre"); }
  function runLibur() {
    var mode = $("#liburMode").value;
    var date = $("#dateInput").value || todayWIB();
    var type = $("#liburType").value || "all";
    var tq = type !== "all" ? "&type=" + type : "";
    if (mode === "year") return fetchShow("/api/libur?year=" + D.year + tq, "liburPre");
    if (mode === "month") {
      return fetchShow("/api/libur?year=" + D.year + "&month=" + $("#monthInput").value + tq, "liburPre");
    }
    if (mode === "next") {
      var c = Math.min(30, Math.max(1, Number($("#countInput").value) || 1));
      return fetchShow("/api/libur?next=1&date=" + date + "&count=" + c + tq, "liburPre");
    }
    fetchShow("/api/libur?date=" + date, "liburPre");
  }
  var liburGo = $("#liburGo");
  if (liburGo) liburGo.addEventListener("click", runLibur);
  var dateInput = $("#dateInput");
  if (dateInput) dateInput.addEventListener("keydown", function (ev) { if (ev.key === "Enter") runLibur(); });
  var liburMode = $("#liburMode");
  if (liburMode) liburMode.addEventListener("change", function () {
    var m = liburMode.value;
    $("#dateInput").style.display = m === "year" ? "none" : "";
    $("#monthWrap").hidden = m !== "month";
    $("#countWrap").hidden = m !== "next";
  });
  var rangeGo = $("#rangeGo");
  if (rangeGo) rangeGo.addEventListener("click", function () {
    fetchShow("/api/libur?from=" + $("#fromInput").value + "&to=" + $("#toInput").value, "rangePre");
  });
  var imsakGo = $("#imsakGo");
  if (imsakGo) imsakGo.addEventListener("click", function () {
    var city = $("#imsakCity").value, year = $("#imsakYear").value;
    var pre = $("#imsakPre");
    var url = BASE + "/api/imsak?city=" + city + "&year=" + year;
    lastUrl = url;
    setStatus("GET /api/imsak?city=" + city + "&year=" + year, "");
    skeleton(pre);
    var t0 = performance.now();
    fetch(url).then(function (r) {
      return r.json().then(function (b) { return { s: r.status, ok: r.ok, b: b }; });
    }).then(function (x) {
      var ms = Math.round(performance.now() - t0);
      if (!x.ok) {
        pre.textContent = JSON.stringify(x.b, null, 2);
      } else {
        var head = x.b.city + " · " + x.b.province + " (" + x.b.hijri + "), " + x.b.schedule.length + " hari\n";
        pre.textContent = head + x.b.schedule.map(function (s) {
          return s.date + "  " + s.imsak + " " + s.subuh + " " + s.zuhur + " " + s.ashar + " " + s.magrib + " " + s.isya;
        }).join("\n");
      }
      lastOut = pre.textContent;
      setStatus(x.s + " · " + ms + " ms", x.ok ? "ok" : "err");
    }).catch(function () {
      pre.textContent = "Gagal menghubungi API. Periksa koneksi lalu coba lagi.";
      lastOut = pre.textContent;
      setStatus("network error", "err");
    });
  });
  var icsGo = $("#icsGo");
  if (icsGo) icsGo.addEventListener("click", function () {
    var type = $("#icsType").value, year = $("#icsYear").value;
    window.location.href = BASE + "/api/libur.ics?year=" + year + (type !== "all" ? "&type=" + type : "");
  });
  var icsUrl = $("#icsUrl");
  if (icsUrl) icsUrl.textContent = location.origin + "/api/libur.ics?year=" + D.year;

  /* deep-link hash -> playground */
  try {
    var h = (location.hash || "").replace(/^#\/?/, "");
    if (h.indexOf("api/libur") === 0 && h.indexOf("city=") < 0 && h.indexOf("from=") < 0) {
      activatePlayTab("date-pane");
      fetchShow("/" + h, "liburPre");
    }
  } catch (e) {}

  /* salin */
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res) {
      var ta = document.createElement("textarea");
      ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); res();
    });
  }
  function flash(btn, idle) {
    btn.textContent = "Tersalin";
    setTimeout(function () { btn.textContent = idle; }, 1600);
  }
  var copyOut = $("#copyOut");
  if (copyOut) copyOut.addEventListener("click", function () {
    copyText(lastOut || "Tekan Kirim dulu — respons akan muncul di sini.");
    flash(copyOut, "Salin respons");
  });
  var copyCurl = $("#copyCurl");
  if (copyCurl) copyCurl.addEventListener("click", function () {
    var u = lastUrl || (location.origin + "/api/libur?year=" + D.year);
    var abs = u.indexOf("http") === 0 ? u : location.origin + u;
    copyText("curl '" + abs + "'");
    flash(copyCurl, "Salin cURL");
  });
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      copyText(b.getAttribute("data-copy"));
      flash(b, "Salin");
    });
  });

  /* ---------- filter data ---------- */
  var q = $("#searchInput"), jf = $("#jenisFilter");
  function monthVal() {
    var b = document.querySelector("#monthFilter button[aria-pressed='true']");
    return b ? b.getAttribute("data-month") : "0";
  }
  function applyFilters(push) {
    var term = ((q && q.value) || "").trim().toLowerCase();
    var jenis = jf ? jf.value : "all";
    var m = monthVal();
    var n = 0;
    $$(".mgroup").forEach(function (sec) {
      var mok = m === "0" || sec.getAttribute("data-month") === m;
      var vis = 0;
      Array.prototype.slice.call(sec.querySelectorAll(".hrow")).forEach(function (li) {
        var okJ = jenis === "all" || (li.getAttribute("data-jenis") || "").indexOf(jenis) >= 0;
        var okS = !term || (li.getAttribute("data-search") || "").indexOf(term) >= 0;
        var show = mok && okJ && okS;
        li.hidden = !show;
        if (show) { vis++; n++; }
      });
      sec.hidden = vis === 0;
    });
    var empty = $("#emptyState");
    if (empty) empty.hidden = n !== 0;
    var meta = $("#dataMeta");
    if (meta) meta.textContent = n + " tanggal ditampilkan";
    if (push !== false) {
      try {
        var p = new URLSearchParams();
        if (term) p.set("q", term);
        if (jenis !== "all") p.set("jenis", jenis);
        if (m !== "0") p.set("month", m);
        history.replaceState(null, "", p.toString() ? "#data?" + p.toString() : "#data");
      } catch (e) {}
    }
  }
  if (q) q.addEventListener("input", function () { applyFilters(true); });
  if (jf) jf.addEventListener("change", function () { applyFilters(true); });
  $$("#monthFilter button").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("#monthFilter button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true");
      applyFilters(true);
    });
  });
  var reset = $("#resetFilter");
  if (reset) reset.addEventListener("click", function () {
    q.value = ""; jf.value = "all";
    $$("#monthFilter button").forEach(function (x) {
      x.setAttribute("aria-pressed", x.getAttribute("data-month") === "0" ? "true" : "false");
    });
    applyFilters(true);
  });
  try {
    if ((location.hash || "").indexOf("#data?") === 0) {
      var p = new URLSearchParams(location.hash.slice(6));
      if (p.get("q") && q) q.value = p.get("q");
      if (p.get("jenis") && jf) jf.value = p.get("jenis");
      var mo = p.get("month") || "0";
      $$("#monthFilter button").forEach(function (x) {
        x.setAttribute("aria-pressed", x.getAttribute("data-month") === mo ? "true" : "false");
      });
      applyFilters(false);
    } else {
      applyFilters(false);
    }
  } catch (e) {}

  /* ---------- tab imsak ---------- */
  $$(".imtab").forEach(function (b) {
    b.addEventListener("click", function () {
      var slug = b.getAttribute("data-city");
      $$(".imtab").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true");
      $$("[data-imsak-table]").forEach(function (t) { t.hidden = t.getAttribute("data-imsak-table") !== slug; });
      $$("[data-imsak-cards]").forEach(function (t) { t.hidden = t.getAttribute("data-imsak-cards") !== slug; });
      var meta = $("#imMeta");
      for (var i = 0; i < D.imsak.length; i++) {
        var c = D.imsak[i];
        if (c.slug === slug && meta) meta.textContent = c.city + " · " + c.province + " · " + c.timezone + " · " + c.hijri;
      }
    });
  });
})();
