/* ============================================================
   Progress kit for the older capstone sites.
   Adds the Marketing-hub functions: "My Progress" page, overall
   project % in the sidebar, journey steps (auto-ticked when a student
   opens a section) and the data the Welcome-back banner + trainer
   report read (window.trackScores / JOURNEY / loadState).
   Config: window.PROG_CFG = { key }
   ============================================================ */
(function () {
  const CFG = window.PROG_CFG || {};
  const KEY = (CFG.key || "hub") + "_journey_v1";
  const SIM_KEY = (CFG.key || "hub") + "_sim_v1";
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const has = (v) => !!document.getElementById("view-" + v);
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };

  const ALL = [
    { id: "rules", t: "Read the Rules & Regulations", go: "rules", track: "start", auto: true },
    { id: "kpis", t: "Study the KPI list", go: "kpis", track: "start", auto: true },
    { id: "model", t: "Understand the Data Model", go: "model", track: "data", auto: true },
    { id: "dict", t: "Go through the Data Dictionary", go: has("datadict") ? "datadict" : "tablemeta", track: "data", auto: true },
    { id: "dash", t: "Study the sample dashboards", go: "dashboards", track: "build", auto: true },
    { id: "sql", t: "Work through the SQL & QA Lab", go: "sql", track: "build", auto: true },
    { id: "editor", t: "Practise queries in the SQL Practice Editor", go: "editor", track: "build", auto: true },
    { id: "excel", t: "Excel dashboard presented", go: "progress", track: "deliver" },
    { id: "tableau", t: "Tableau dashboard presented", go: "progress", track: "deliver" },
    { id: "pbi", t: "Power BI dashboard presented", go: "progress", track: "deliver" },
    { id: "final", t: "Final presentation done", go: "progress", track: "deliver" },
  ];
  const TRACKS = [
    { id: "start", t: "Understand the project" }, { id: "data", t: "Data & model" }, { id: "build", t: "Build & QA" },
    { id: "deliver", t: "Weekly deliverables" }, { id: "sim", t: "Job Simulator" }, { id: "interview", t: "Interview prep" },
  ];
  let STEPS = [];

  function state() { const s = read(KEY); return s && typeof s === "object" && s.journey ? s : { journey: {} }; }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} try { window.dispatchEvent(new Event("hub-progress")); } catch (e) {} }
  function mark(view) {
    const st = STEPS.find(x => x.auto && x.go === view); if (!st) return;
    const s = state(); if (s.journey[st.id]) return; s.journey[st.id] = Date.now(); save(s); refresh();
  }

  function qaStats() {
    try { const p = getProgress(); const done = QA.filter(i => p[i.cat + "::" + i.q]).length; return { done, total: QA.length }; } catch (e) { return { done: 0, total: 0 }; }
  }
  function simPct() {
    const s = read(SIM_KEY) || {}; const C = window.SIM_CONTENT || {};
    const avg = (o, list) => { if (!list || !list.length) return null; const v = list.map(i => (o && o[i.id] && o[i.id].best) || 0); return v.reduce((a, b) => a + b, 0) / v.length; };
    const parts = [avg(s.inc, C.incidents), (s.brk && s.brk.best) || 0, avg(s.stk, C.stakeholders)].filter(x => x != null);
    return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
  }
  function trackScores() {
    const s = state(); const sc = {};
    TRACKS.forEach(t => sc[t.id] = [0, 0]);
    STEPS.forEach(st => { sc[st.track][1]++; if (s.journey[st.id]) sc[st.track][0]++; });
    const q = qaStats();
    const tracks = TRACKS.map(t => {
      let pct;
      if (t.id === "sim") pct = simPct();
      else if (t.id === "interview") pct = q.total ? Math.round(q.done / q.total * 100) : 0;
      else pct = sc[t.id][1] ? Math.round(sc[t.id][0] / sc[t.id][1] * 100) : 0;
      return Object.assign({}, t, { pct });
    });
    const overall = Math.round(tracks.reduce((a, t) => a + t.pct, 0) / tracks.length);
    return { tracks, overall, qaDone: q.done, qaTotal: q.total };
  }

  function refresh() {
    const r = trackScores();
    const fill = document.getElementById("sidebar-progress-fill"), cap = document.getElementById("sidebar-progress-caption");
    if (fill) fill.style.width = r.overall + "%";
    if (cap) cap.textContent = `${r.overall}% project complete · ${r.qaDone}/${r.qaTotal} interview Qs`;
    const ov = document.getElementById("progress-overall");
    if (ov) ov.innerHTML = `<div class="pk-big">${r.overall}%</div><div class="pk-sub">overall project completion</div>`;
    const tl = document.getElementById("track-list");
    if (tl) tl.innerHTML = r.tracks.map(t => `<div class="pk-track"><div class="pk-tr-h"><span>${esc(t.t)}</span><b>${t.pct}%</b></div><div class="pk-bar"><i style="width:${t.pct}%"></i></div></div>`).join("");
    const s = state(); const todo = document.getElementById("progress-todo");
    if (todo) {
      todo.innerHTML = STEPS.map(st => {
        const done = !!s.journey[st.id];
        return `<label class="pk-step${done ? " done" : ""}"><input type="checkbox" data-step="${st.id}"${done ? " checked" : ""}><span>${esc(st.t)}</span>${st.auto && st.go !== "progress" ? `<button type="button" class="pk-open" data-go="${st.go}">Open →</button>` : ""}</label>`;
      }).join("") + `<p class="pk-note">Section steps tick themselves when you open that page. Tick the weekly deliverables after your group presents.</p>`;
      todo.querySelectorAll("[data-step]").forEach(cb => cb.addEventListener("change", () => { const x = state(); if (cb.checked) x.journey[cb.dataset.step] = Date.now(); else delete x.journey[cb.dataset.step]; save(x); refresh(); }));
      todo.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", (e) => { e.preventDefault(); if (typeof window.switchView === "function") window.switchView(b.dataset.go); }));
    }
  }

  function init() {
    STEPS = ALL.filter(st => st.go === "progress" || has(st.go));
    try { if (typeof VIEW_LABELS === "object") VIEW_LABELS.progress = "My Progress"; } catch (e) {}
    // expose for the Welcome-back banner and the trainer report
    window.trackScores = trackScores;
    window.JOURNEY = STEPS.map(st => ({ id: st.id, t: st.t, go: st.go }));
    window.loadState = state;
    // keep the sidebar showing overall project % (the site's own function only counts interview questions)
    const orig = window.updateProgressBar;
    if (typeof orig === "function" && !orig._pk) { const w = function () { const r = orig.apply(this, arguments); refresh(); return r; }; w._pk = true; window.updateProgressBar = w; }
    // auto-tick a step whenever its section is opened
    const sv = window.switchView;
    if (typeof sv === "function" && !sv._pk) { const w = function (v) { const r = sv.apply(this, arguments); mark(v); return r; }; w._pk = true; Object.keys(sv).forEach(k => w[k] = sv[k]); window.switchView = w; }
    document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("#nav [data-view]"); if (b) setTimeout(() => mark(b.dataset.view), 60); });
    const rs = document.getElementById("reset-progress");
    if (rs) rs.addEventListener("click", () => {
      if (!confirm("Reset your journey steps and deliverable ticks on this device?")) return;
      save({ journey: {} }); refresh();
    });
    window.addEventListener("hub-progress", () => setTimeout(refresh, 30));
    window.addEventListener("storage", refresh);
    refresh(); setTimeout(refresh, 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
