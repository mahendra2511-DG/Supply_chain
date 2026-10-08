/* ============================================================
   Progress kit for the older capstone sites: the Marketing-hub functions.
   - Home: "Your Progress" card, 10-step journey (Mark done / Start →),
     Project Deliverables checklist, Before vs After
   - My Progress page with track bars and the open checklist
   - Sidebar shows overall project %, Welcome-back banner gets "Next step"
   Content: window.HOME_CONTENT (home-content.js). Config: window.PROG_CFG = { key }
   ============================================================ */
(function () {
  const CFG = window.PROG_CFG || {};
  const HC = window.HOME_CONTENT || { journey: [], deliverables: [], before: [], after: [] };
  const KEY = (CFG.key || "hub") + "_journey_v1";
  const SIM_KEY = (CFG.key || "hub") + "_sim_v1";
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const has = (v) => !!document.getElementById("view-" + v);
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const go = (v) => { if (typeof window.switchView === "function") window.switchView(v); };

  const TRACKS = [
    { id: "start", name: "Business Understanding" }, { id: "data", name: "Data Model & Quality" }, { id: "build", name: "SQL & KPIs" },
    { id: "dash", name: "Dashboards" }, { id: "qa", name: "QA" }, { id: "deliver", name: "Deliverables" },
    { id: "sim", name: "Job Simulator" }, { id: "interview", name: "Interview Prep" },
  ];
  let JOUR = [];

  function state() {
    const s = read(KEY) || {};
    return { journey: (s && typeof s.journey === "object" && s.journey) || {}, deliv: (s && typeof s.deliv === "object" && s.deliv) || {} };
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} try { window.dispatchEvent(new Event("hub-progress")); } catch (e) {} }

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
    const s = state(); const sc = {}; TRACKS.forEach(t => sc[t.id] = [0, 0]);
    JOUR.forEach(j => { const t = j.track === "present" ? "interview" : j.track; if (!sc[t]) return; sc[t][1]++; if (s.journey[j.id]) sc[t][0]++; });
    (HC.deliverables || []).forEach(d => { sc.deliver[1]++; if (s.deliv[d.id]) sc.deliver[0]++; });
    const q = qaStats();
    sc.interview[1] += 4; sc.interview[0] += q.total ? 4 * q.done / q.total : 0;
    const tracks = TRACKS.map(t => {
      const pct = t.id === "sim" ? simPct() : (sc[t.id][1] ? Math.round(sc[t.id][0] / sc[t.id][1] * 100) : 0);
      return Object.assign({}, t, { t: t.name, pct });
    });
    const overall = Math.round(tracks.reduce((a, t) => a + t.pct, 0) / tracks.length);
    return { tracks, overall, qaDone: q.done, qaTotal: q.total };
  }

  const trackRow = (t) => `<div class="track-row ${t.pct >= 100 ? "complete" : ""}"><div class="tl">${esc(t.name)}</div><div class="tb"><div class="tf" style="width:${t.pct}%"></div></div><div class="tv">${t.pct}%</div></div>`;

  function renderJourney() {
    const wrap = document.getElementById("journey"); if (!wrap) return; const s = state();
    wrap.innerHTML = JOUR.map((j, i) => `
      ${i ? '<div class="journey-arrow">↓</div>' : ""}
      <div class="journey-step ${s.journey[j.id] ? "done" : ""}">
        <div class="jn">${String(i + 1).padStart(2, "0")}</div>
        <div><h4>${esc(j.t)}</h4><p>${esc(j.d)}</p></div>
        <div class="journey-actions">
          <button type="button" class="check-pill ${s.journey[j.id] ? "on" : ""}" data-j="${j.id}">${s.journey[j.id] ? "✓ Done" : "Mark done"}</button>
          <button type="button" class="start-btn" data-go="${j.go}">Start →</button>
        </div>
      </div>`).join("");
    wrap.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
    wrap.querySelectorAll("[data-j]").forEach(b => b.addEventListener("click", () => {
      const st = state(); if (st.journey[b.dataset.j]) delete st.journey[b.dataset.j]; else st.journey[b.dataset.j] = Date.now(); save(st); renderAll();
    }));
  }
  function renderDeliv() {
    const wrap = document.getElementById("deliv-grid"); if (!wrap) return; const s = state();
    wrap.innerHTML = (HC.deliverables || []).map(d => `
      <div class="deliv-item ${s.deliv[d.id] ? "on" : ""}" data-id="${d.id}" role="checkbox" aria-checked="${!!s.deliv[d.id]}" tabindex="0">
        <div class="box">${s.deliv[d.id] ? "✓" : ""}</div>
        <div><h4>${esc(d.t)}</h4><p>${esc(d.d)}</p>${d.where ? `<div class="where">→ ${esc(d.where)}</div>` : ""}</div>
      </div>`).join("");
    wrap.querySelectorAll(".deliv-item").forEach(it => {
      const t = () => { const st = state(); if (st.deliv[it.dataset.id]) delete st.deliv[it.dataset.id]; else st.deliv[it.dataset.id] = Date.now(); save(st); renderAll(); };
      it.addEventListener("click", t);
      it.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); t(); } });
    });
  }
  function renderBA() {
    const w = document.getElementById("before-after"); if (!w) return;
    w.innerHTML = `<div class="ba-col ba-before"><h4>❌ Before analytics</h4><ul>${(HC.before || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="ba-mid">→</div>
      <div class="ba-col ba-after"><h4>✅ After analytics</h4><div class="ba-flow">${(HC.after || []).map((x, i) => `${i ? '<div class="dn">↓</div>' : ""}<div class="node">${esc(x)}</div>`).join("")}</div></div>`;
  }

  function refresh() {
    const r = trackScores(); const s = state();
    const fill = document.getElementById("sidebar-progress-fill"), cap = document.getElementById("sidebar-progress-caption");
    if (fill) fill.style.width = r.overall + "%";
    if (cap) cap.textContent = `${r.overall}% project complete · ${r.qaDone}/${r.qaTotal} interview Qs`;
    const hp = document.getElementById("home-progress");
    if (hp) {
      hp.innerHTML = `<h4>Your Progress</h4><div class="big">${r.overall}%</div><div class="sub">overall project completion</div>
        <div class="track-list">${r.tracks.slice(0, 5).map(trackRow).join("")}</div>
        <button type="button" class="pk-btn-outline" data-goto-progress>See full progress →</button>`;
      hp.querySelector("[data-goto-progress]").addEventListener("click", () => go("progress"));
    }
    const ov = document.getElementById("progress-overall");
    if (ov) ov.innerHTML = `<h4>Overall Progress</h4><div class="pk-big">${r.overall}%</div><div class="pk-sub">Average of the ${r.tracks.length} tracks below</div>`;
    const tl = document.getElementById("track-list");
    if (tl) tl.innerHTML = r.tracks.map(trackRow).join("");
    const todo = document.getElementById("progress-todo");
    if (todo) {
      const openJ = JOUR.filter(j => !s.journey[j.id]), openD = (HC.deliverables || []).filter(d => !s.deliv[d.id]);
      const li = (arr, f) => arr.length ? arr.map(f).join("") : `<div style="padding:4px 0;">✓ All done</div>`;
      todo.innerHTML = `<h5 class="pk-h5">Journey steps (${openJ.length} open)</h5>${li(openJ.slice(0, 6), j => `<div class="pk-li">• <a href="#" data-go="${j.go}">${esc(j.t)}</a></div>`)}
        <h5 class="pk-h5">Deliverables (${openD.length} open)</h5>${li(openD, d => `<div class="pk-li">• ${esc(d.t)}</div>`)}
        <p class="pk-note">Mark journey steps done on the Home page, and tick each deliverable once your group has it.</p>`;
      todo.querySelectorAll("[data-go]").forEach(a => a.addEventListener("click", (e) => { e.preventDefault(); go(a.dataset.go); }));
    }
  }
  function renderAll() {
    renderJourney(); renderDeliv(); refresh();
    try { const ov = document.getElementById("view-overview"); const b = document.getElementById("continue-banner"); if (ov && ov.classList.contains("active") && b && b.style.display !== "none" && typeof window.renderContinueBanner === "function") window.renderContinueBanner(); } catch (e) {}
  }

  function init() {
    JOUR = (HC.journey || []).map(j => Object.assign({}, j, { go: has(j.go) ? j.go : (has("sql") ? "sql" : "overview") }));
    try { if (typeof VIEW_LABELS === "object") VIEW_LABELS.progress = "My Progress"; } catch (e) {}
    window.trackScores = trackScores;
    window.JOURNEY = JOUR.map(j => ({ id: j.id, t: j.t, go: j.go }));
    window.loadState = state;
    const orig = window.updateProgressBar;
    if (typeof orig === "function" && !orig._pk) { const w = function () { const r = orig.apply(this, arguments); refresh(); return r; }; w._pk = true; window.updateProgressBar = w; }
    const rs = document.getElementById("reset-progress");
    if (rs) rs.addEventListener("click", () => { if (!confirm("Reset your journey steps and deliverable ticks on this device?")) return; save({ journey: {}, deliv: {} }); renderAll(); });
    window.addEventListener("hub-progress", () => setTimeout(refresh, 30));
    window.addEventListener("storage", renderAll);
    renderBA(); renderAll(); setTimeout(refresh, 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
