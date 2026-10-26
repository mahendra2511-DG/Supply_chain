/* ============================================================
   Capstone hub upgrade kit: project schedule & group status (+ live sync).
   Self-contained: does not touch the site's own code.
   ============================================================ */
(function () {
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
try { if (typeof VIEW_LABELS === "object") VIEW_LABELS.schedule = "Project Schedule & Status"; } catch (e) {}
/* ============================================================
   Project Schedule & Group Presentation Status  (multi-batch)
   - Several project codes can run at the same time (e.g. P1427 at 12 PM and P1428 at 9 PM),
     each with its own start date, presentation day, start/end time, groups and statuses.
   - Students: see ONLY their own project (the code they chose at check-in): next meeting,
     time, their group's status. Read-only.
   - Trainer (PIN): project tabs to switch between codes, "+ New project" form, edit everything,
     mark every group's presentation for every code, batch dashboard across all codes.
   - Live sync via this site's /api/schedule (Vercel + Upstash); falls back to project-schedule.js.
   ============================================================ */
const SCH_STAGES = [
  { key: "kickoff", t: "Project Kick-off", d: "Problem statement, KPI document and dataset walkthrough; groups formed.", week: 0, track: false },
  { key: "excel", t: "Excel Dashboard Presentation", d: "KPIs in Excel and the Excel dashboard.", week: 1, track: true },
  { key: "tableau", t: "Tableau Dashboard Presentation", d: "Tableau connected to MySQL. SQL QA can be presented this week or next.", week: 2, track: true, sqlqa: true },
  { key: "powerbi", t: "Power BI Dashboard Presentation", d: "Power BI connected to MySQL. Last chance to present SQL QA.", week: 3, track: true, sqlqa: true },
  { key: "final", t: "Final Presentation", d: "Final project presentation: dashboards, KPI story, SQL QA reconciliation and recommendations.", week: 4, track: true },
];
const SCH_COLS = [["excel", "Excel"], ["tableau", "Tableau"], ["powerbi", "Power BI"], ["sqlqa", "SQL QA"], ["final", "Final"]];
const SCH_ST = { done: ["✅", "Done", "st-done"], pending: ["⏳", "Pending", "st-pending"], absent: ["❌", "Nobody presented", "st-absent"] };
const SCH_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SCH_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SCH_KEY = "scm_hub", SCH_PNAME = "Supply Chain Analytics Capstone";
const SCH_DRAFT = SCH_KEY + "_schedule_draft_v1", SCH_UNLOCK = SCH_KEY + "_schedule_unlocked", SCH_VIEW = SCH_KEY + "_schedule_view", SCH_PIN = SCH_KEY + "_schedule_pin";
let schEditCode = null, schNewOpen = false;
const SCH_CFG = String(window.PROJECT_SCHEDULE_API || "").trim();
const SCH_AUTO = SCH_CFG.toLowerCase() === "auto";
let SCH_API = SCH_AUTO ? "" : SCH_CFG;
let schRemote = null, schSyncMsg = "", schSaveTimer = null, schLoaded = !SCH_API, schDown = "", schOff = false, schLastLoad = 0;
// students read the shared CDN copy (refreshed every few minutes, ~0 database requests); trainers always read fresh data
function schUrl(base) { return schIsTrainer() ? base + (base.includes("?") ? "&" : "?") + "fresh=1&t=" + Date.now() : base; }
function schProbe() {
  if (!SCH_AUTO || !/^https?:$/.test(location.protocol)) return;
  fetch(schUrl("api/schedule"), schIsTrainer() ? { cache: "no-store" } : {}).then(r => r.json().catch(() => null).then(j => [r, j])).then(([r, j]) => {
    if (j && !r.ok && j.error) { schDown = j.error; renderSchedule(); return; }      // database error (e.g. Upstash monthly limit): tell the trainer
    if (j && j.configured === false) { schOff = true; renderSchedule(); return; }      // no Upstash database on this site
    if (!j || !Array.isArray(j.projects)) return;
    SCH_API = "api/schedule";
    if (schIsTrainer()) { try { if (!sessionStorage.getItem(SCH_PIN)) sessionStorage.removeItem(SCH_UNLOCK); } catch (e) {} }   // keep a server-checked login across reloads
    schRemote = j.projects.length ? j : null; schBase = schRemote ? schClone(schRemote) : null; schLoaded = true;
    renderSchedule(); renderHeroSchedule();
    setInterval(() => { if (document.visibilityState === "visible" && (!schIsTrainer() || schIdle())) schLoadRemote(true); }, schIsTrainer() ? 60000 : 120000);   // students see trainer updates within ~2 minutes
  }).catch(() => {});
}
/* 3-way merge so two trainer tabs/devices never overwrite each other's changes */
let schBase = null;
const schJ = (x) => JSON.stringify(x === undefined ? null : x);
const schIsObj = (x) => x && typeof x === "object" && !Array.isArray(x);
function schMerge3(base, mine, theirs) {
  if (schJ(mine) === schJ(base)) return theirs;
  if (schJ(theirs) === schJ(base) || theirs === undefined && base === undefined) return mine;
  if (schIsObj(mine) && schIsObj(theirs)) {
    const out = {}, b = schIsObj(base) ? base : {};
    new Set([...Object.keys(mine), ...Object.keys(theirs)]).forEach(k => { const v = schMerge3(b[k], mine[k], theirs[k]); if (v !== undefined) out[k] = v; });
    return out;
  }
  return mine;
}
function schMergeDocs(base, mine, theirs) {
  const byCode = (d) => { const o = {}; ((d && d.projects) || []).forEach(p => { o[schNorm(p.code)] = p; }); return o; };
  const strip = (d) => { const o = Object.assign({}, d || {}); delete o.projects; delete o.updated; return o; };
  const out = schMerge3(strip(base), strip(mine), strip(theirs)) || {};
  const m = schMerge3(byCode(base), byCode(mine), byCode(theirs)) || {};
  const order = [...((mine && mine.projects) || []), ...((theirs && theirs.projects) || [])].map(p => schNorm(p.code));
  out.projects = [...new Set(order)].filter(c => m[c]).map(c => m[c]);
  out.updated = new Date().toISOString();
  return out;
}
function schIdle() {   // trainer is not in the middle of typing / a form
  const a = document.activeElement; const root = document.getElementById("sch-root");
  if (schNewOpen || document.getElementById("sch-login")) return false;
  return !(a && root && root.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && SCH_API && Date.now() - schLastLoad > 30000 && (!schIsTrainer() || schIdle())) schLoadRemote(true); });
function schApi(payload) { return fetch(SCH_API, { method: "POST", body: JSON.stringify(payload) }).then(r => r.json()); }
function schLoadRemote(silent) {
  if (!SCH_API) return Promise.resolve();
  schLastLoad = Date.now();
  return fetch(schUrl(SCH_API), schIsTrainer() ? { cache: "no-store" } : {}).then(r => r.json()).then(j => {
    if (schIsTrainer() && (schSaveTimer || !schIdle())) return;
    const nx = j && j.projects && j.projects.length ? j : null;
    if (schIsTrainer() && schJ(nx) === schJ(schRemote)) return;          // nothing new: don't re-render under the trainer
    schRemote = nx; schBase = nx ? schClone(nx) : null; schLoaded = true;
    renderSchedule(); renderHeroSchedule();
  }).catch(() => { schLoaded = true; if (!silent) { schSyncMsg = "⚠ Could not load the live schedule. Showing the last published file."; renderSchedule(); } });
}
function schPushRemote(d) {
  schRemote = d; schSyncMsg = "⏳ Saving…"; schShowSync();
  clearTimeout(schSaveTimer);
  schSaveTimer = setTimeout(() => {
    let pin = ""; try { pin = sessionStorage.getItem(SCH_PIN) || ""; } catch (e) {}
    fetch(SCH_API + (SCH_API.includes("?") ? "&" : "?") + "fresh=1&t=" + Date.now(), { cache: "no-store" }).then(r => r.json()).catch(() => null).then(latest => {
      let out = d;
      if (latest && Array.isArray(latest.projects)) {
        out = schMergeDocs(schBase, d, latest);
        if (schJ(out.projects) !== schJ(d.projects)) { schRemote = out; setTimeout(() => { try { renderSchedule(); renderHeroSchedule(); } catch (e) {} }, 0); }
      }
      return schApi({ action: "save", pin, data: out }).then(j => { if (j && j.ok) schBase = schClone(out); return j; });
    }).then(j => {
      schSaveTimer = null;
      schSyncMsg = j.ok ? `✅ Saved ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · students see it now (on refresh)` : "⚠ Not saved: " + (j.error || "error");
      schShowSync();
    }).catch(() => { schSaveTimer = null; schSyncMsg = "⚠ Not saved: no internet or server not ready. Try again."; schShowSync(); });
  }, 700);
}
function schShowSync() { const e = document.getElementById("sch-sync"); if (e) e.textContent = schSyncMsg; }

/* ---------- tiny SHA-256 (works on file:// too) ---------- */
function sha256(str) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const bytes = Array.from(new TextEncoder().encode(str)); const l = bytes.length * 8;
  bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (l >>> (i * 8)) & 255);
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < bytes.length; o += 64) {
    const w = [];
    for (let i = 0; i < 16; i++) w[i] = (bytes[o + 4 * i] << 24) | (bytes[o + 4 * i + 1] << 16) | (bytes[o + 4 * i + 2] << 8) | bytes[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H = H.map((v, i) => (v + [a, b, c, d, e, f, g, h][i]) | 0);
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, "0")).join("");
}
const schHash = (pin) => sha256("scm-hub-trainer|" + pin);   // trainer password hash (same formula as the server)

/* ---------- time helpers ---------- */
const ymd = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const parseYmd = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const fmtD = (s) => { const d = parseYmd(s); return `${SCH_DAYS[d.getDay()].slice(0, 3)}, ${d.getDate()} ${SCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtT = (hm) => { const [h, m] = String(hm).split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const SCH_TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
function schParseClock(s) {            // "9:00 PM" → "21:00"
  const m = String(s || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]?/); if (!m) return null;
  let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12; return `${String(h).padStart(2, "0")}:${m[2] || "00"}`;
}
function schTimes(p) {                 // start/end "HH:MM", migrating old free-text times
  let st = p.start, en = p.end;
  if (!st) { const parts = String(p.time || "").split(/[–\-—to]+/i).map(x => x.trim()).filter(Boolean); st = schParseClock(parts[0]) || "21:00"; en = schParseClock(parts[1]) || null; }
  if (!en) { const [h, m] = st.split(":").map(Number); en = `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }
  return [st, en];
}
const schTimeLabel = (p) => { const [s, e] = schTimes(p); return `${fmtT(s)} – ${fmtT(e)}`; };
function schStageDates(p) {
  const k = parseYmd(p.kickoff); const out = { kickoff: p.kickoff };
  let first = new Date(k); first.setDate(first.getDate() + 6);
  while (first.getDay() !== Number(p.presDay)) first.setDate(first.getDate() + 1);
  SCH_STAGES.filter(s => s.week > 0).forEach(s => { const d = new Date(first); d.setDate(d.getDate() + 7 * (s.week - 1)); out[s.key] = (p.overrides && p.overrides[s.key]) || ymd(d); });
  if (p.overrides && p.overrides.kickoff) out.kickoff = p.overrides.kickoff;
  return out;
}
function schWindow(p, dateStr) {       // [start, end] Date of the meeting on that day
  const [s, e] = schTimes(p); const d = parseYmd(dateStr);
  const at = (hm) => { const [h, m] = hm.split(":").map(Number); const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
  const a = at(s); let b = at(e); if (b <= a) b = new Date(a.getTime() + 3600000); return [a, b];
}
function schPhase(p, dateStr) {
  const now = new Date(); const [a, b] = schWindow(p, dateStr);
  if (now > b) return ["past", "Completed"];
  if (now >= a) return ["today", "Happening now"];
  if (ymd(a) === ymd(now)) return ["today", "Today, " + fmtT(schTimes(p)[0])];
  const tm = new Date(now); tm.setDate(tm.getDate() + 1);
  if (ymd(a) === ymd(tm)) return ["next", "Tomorrow, " + fmtT(schTimes(p)[0])];
  return (a - now) < 7 * 86400000 ? ["next", "This week"] : ["future", "Upcoming"];
}
function schSoon(p, dateStr) {          // meeting is today or tomorrow (and not over yet) → shown in green
  const now = new Date(); const [a, b] = schWindow(p, dateStr); if (now > b) return false;
  const tm = new Date(now); tm.setDate(tm.getDate() + 1); return ymd(a) === ymd(now) || ymd(a) === ymd(tm);
}
function schNext(p) { const ds = schStageDates(p); const now = new Date(); return SCH_STAGES.find(s => schWindow(p, ds[s.key])[1] >= now) || null; }

/* ---------- data ---------- */
const schClone = (o) => JSON.parse(JSON.stringify(o));
function schPublished() { return schClone(window.PROJECT_SCHEDULE || { pinHash: "", active: "", projects: [] }); }
function schFromHash() {
  const m = location.hash.match(/schedule=([A-Za-z0-9_\-]+)/); if (!m) return null;
  try { return JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, "+").replace(/_/g, "/"))))); } catch (e) { return null; }
}
function schIsTrainer() { try { return sessionStorage.getItem(SCH_UNLOCK) === "1"; } catch (e) { return false; } }
function schDraft() { try { const d = JSON.parse(lsGet(SCH_DRAFT)); return d && d.projects ? d : null; } catch (e) { return null; } }
function schData() {
  if (SCH_API) {
    if (schIsTrainer()) { if (!schRemote) schRemote = schPublished(); return schRemote; }
    const base = schRemote ? schClone(schRemote) : schPublished(); const h = schFromHash();
    if (h && h.code) { base.projects = base.projects.filter(x => x.code !== h.code).concat([h]); base.active = h.code; }
    return base;
  }
  if (schIsTrainer()) return schDraft() || schPublished();
  const pub = schPublished(); const h = schFromHash();
  if (h && h.code) { pub.projects = pub.projects.filter(p => p.code !== h.code).concat([h]); pub.active = h.code; }
  return pub;
}
function schSaveDraft(d) { d.updated = new Date().toISOString(); if (SCH_API) { schPushRemote(d); return; } lsSet(SCH_DRAFT, JSON.stringify(d)); }
const schNorm = (c) => String(c || "").trim().toUpperCase().replace(/\s+/g, "");
function schMe() { try { const m = JSON.parse(lsGet(SCH_KEY + "_student_v1")); return m && m.name ? m : null; } catch (e) { return null; } }
function schCurrent(d) {
  const find = (c) => c && d.projects.find(p => schNorm(p.code) === schNorm(c));
  if (schIsTrainer()) return find(schEditCode) || find(d.active) || d.projects[0] || null;
  const h = schFromHash(); if (h && h.code && find(h.code)) return find(h.code);
  const m = schMe(); if (m && find(m.batch)) return find(m.batch);       // student: only their own project
  let v = null; try { v = lsGet(SCH_VIEW); } catch (e) {}
  return find(v) || find(d.active) || d.projects[0] || null;
}
function schGroupStatus(p, g, key) { const s = (p.status && p.status[g.id]) || {}; return s[key] || "pending"; }
function schCounts(p, key) { const c = { done: 0, pending: 0, absent: 0 }; (p.groups || []).forEach(g => c[schGroupStatus(p, g, key)]++); return c; }
function schNewProject(code, o) {
  o = o || {};
  const fri = new Date(); while (fri.getDay() !== 5) fri.setDate(fri.getDate() - 1);
  const n = Math.max(1, Math.min(20, +o.groups || 6));
  const groups = Array.from({ length: n }, (_, i) => ({ id: "g" + (i + 1), name: "Group " + (i + 1), members: "" }));
  const start = o.start || "21:00", end = o.end || "22:00";
  const p = { code, name: SCH_PNAME, kickoff: o.kickoff || ymd(fri), presDay: o.presDay != null ? +o.presDay : 6, start, end, overrides: {}, groups, status: {} };
  p.time = schTimeLabel(p); return p;
}
function schMyGroup(p) { const m = schMe(); if (!m || !p || schNorm(m.batch) !== schNorm(p.code)) return null; const k = String(m.group || "").trim().toLowerCase(); return (p.groups || []).find(g => String(g.name).trim().toLowerCase() === k) || null; }

/* ---------- rendering ---------- */
const stChip = (s, extra) => `<span class="st-chip ${SCH_ST[s][2]}">${SCH_ST[s][0]} ${SCH_ST[s][1]}${extra || ""}</span>`;
function schBatchesHtml(d, cur) {
  if (!d.projects.length) return "";
  const S = window.VK_SUMMARY && window.VK_SUMMARY.byBatch;
  const rows = d.projects.map(p => {
    const ds = schStageDates(p); const nx = schNext(p); const n = (p.groups || []).length;
    const cell = (k) => { const c = schCounts(p, k); return `<td class="sch-bc ${n && c.done === n ? "all" : ""}">${c.done}/${n}${c.absent ? ` <span title="Nobody from the group presented">❌${c.absent}</span>` : ""}</td>`; };
    const st = S ? (S[schNorm(p.code)] || { n: 0, today: 0 }) : null;
    return `<tr class="${cur && p.code === cur.code ? "sch-cur" : ""}" data-bcode="${esc(p.code)}" title="Open ${esc(p.code)}"><td><b>${esc(p.code)}</b>${p.name ? `<div class="sch-mem">${esc(p.name)}</div>` : ""}</td>
      <td>${SCH_DAYS[p.presDay].slice(0, 3)} · ${esc(schTimeLabel(p))}</td><td>${nx ? `<span class="sch-nx ${schSoon(p, ds[nx.key]) ? "sch-soon" : ""}">${esc(nx.t.replace(" Presentation", ""))}</span><div class="sch-mem">${fmtD(ds[nx.key])}</div>` : "Completed 🎉"}</td><td class="n">${n}</td>
      ${st ? `<td class="n">${st.n}</td><td class="n">${st.today}</td>` : ""}${SCH_COLS.map(([k]) => cell(k)).join("")}</tr>`;
  }).join("");
  return `<div class="card sch-batches" id="sch-batches"><div class="sch-bh"><h3>📊 Batch dashboard</h3><span>${d.projects.length} project code${d.projects.length > 1 ? "s" : ""} running · groups presented / all groups. Click a code to open and edit it.</span></div>
    <div class="table-scroll"><table class="dtable"><thead><tr><th>Project code</th><th>Timing</th><th>Next presentation</th><th>Groups</th>${S ? "<th>Students</th><th>Visited today</th>" : ""}${SCH_COLS.map(([, l]) => `<th>${l}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function schMyCardHtml(p) {
  const m = schMe(); if (!m || schIsTrainer() || !p) return "";
  const g = schMyGroup(p);
  if (!g) return m.group
    ? `<div class="card sch-my">👋 <b>${esc(m.name)}</b> · ${esc(p.code)}. Your group (${esc(m.group)}) is not in this project's group list, so your status can't be shown. Click <b>account</b> next to your name in the sidebar and pick your group.</div>`
    : `<div class="card sch-my">👋 <b>${esc(m.name)}</b> · ${esc(p.code)}. Your group is not assigned yet. After the first meeting, pick your group: click <b>account</b> next to your name in the sidebar (the site also asks you when you log in).</div>`;
  const ds = schStageDates(p); const nx = schNext(p); const st = (p.status && p.status[g.id]) || {};
  const pend = SCH_COLS.filter(([k]) => schGroupStatus(p, g, k) !== "done").map(([, l]) => l);
  return `<div class="card sch-my"><div class="sch-my-h">👋 <b>${esc(m.name)}</b> · <b>${esc(g.name)}</b> · ${esc(p.code)} · every ${SCH_DAYS[p.presDay]}, ${esc(schTimeLabel(p))}</div>
    <div class="sch-my-st">${SCH_COLS.map(([k, l]) => `<span><em>${l}</em> ${stChip(schGroupStatus(p, g, k))}</span>`).join("")}</div>
    <p>${pend.length ? `Still pending for your group: <b>${pend.join(", ")}</b>.` : "Your group has presented everything. 🎉"}${nx ? ` Next meeting: <b>${esc(nx.t)}</b> on <b>${fmtD(ds[nx.key])}</b> at <b>${esc(schTimeLabel(p))}</b>${schSoon(p, ds[nx.key]) ? ` <span class="sch-soon-pill">${esc(schPhase(p, ds[nx.key])[1])}</span>` : ""}.` : ""}${st.note ? ` Trainer note: <i>${esc(st.note)}</i>` : ""}</p></div>`;
}
function renderSchedule() {
  const root = document.getElementById("sch-root"); if (!root) return;
  const d = schData(); const p = schCurrent(d); const tr = schIsTrainer(); const me = schMe();
  const mode = document.getElementById("sch-mode");
  if (mode) mode.innerHTML = tr
    ? `<span class="sch-badge tr">🔓 Trainer mode</span><button class="btn-outline" id="sch-lock">Lock</button>`
    : `<span class="sch-badge">👀 Student view (read-only)</span><button class="sch-trainer-link" id="sch-unlock">Trainer login</button>`;
  // students who checked in see only their own project; others can pick
  const picker = !tr && !(me && me.batch && p && schNorm(me.batch) === schNorm(p.code)) && d.projects.length > 1
    ? `<label class="sch-pick">Project code <select id="sch-select">${d.projects.map(x => `<option value="${esc(x.code)}" ${p && x.code === p.code ? "selected" : ""}>${esc(x.code)} · ${esc(schTimeLabel(x))}</option>`).join("")}</select></label>` : "";
  const tabs = tr ? schTabsHtml(d, p) : "";
  const offNote = schIsTrainer() ? " <b>Trainer:</b> your changes are saved only in this browser, so students and your other devices won't see them. Connect Upstash Redis in Vercel → Storage for this project and redeploy (see SETUP-LIVE-SYNC.md)." : "";
  const downBox = schOff && !schDown ? `<div class="card sch-down off" role="status">ℹ️ <b>Live updates are off on this site</b>: its database is not connected, so this is the published schedule.${offNote}</div>` : schDown ? `<div class="card sch-down" role="alert">⚠️ <b>Live sync is not working right now.</b> The site's database answered: <i>${esc(String(schDown).slice(0, 160))}</i>. Student logins, new projects, time and status changes can't be saved until it works again${/max requests limit/i.test(schDown) ? " (the free Upstash monthly request limit is used up: see SETUP-LIVE-SYNC.md)" : ""}.</div>` : "";
  if (!p) { root.innerHTML = `${downBox}${tabs}<div class="card sch-empty">No project has been published yet. ${tr ? "Create one with <b>+ New project</b> above." : "Ask your trainer for the project code."}</div>`; schBind(d, null); return; }
  const ds = schStageDates(p); const nx = schNext(p);
  const timeline = SCH_STAGES.map((s, i) => {
    const [ph, pl] = schPhase(p, ds[s.key]);
    const up = nx && nx.key === s.key; const soon = up && schSoon(p, ds[s.key]);
    const c = s.track ? schCounts(p, s.key) : null;
    const qa = s.sqlqa ? schCounts(p, "sqlqa") : null;
    return `<div class="sch-stage ${ph} ${up ? "sch-upnext" : ""} ${soon ? "sch-soon" : ""}"><div class="sch-dot">${ph === "past" ? "✓" : i}</div><div class="sch-body">
      <div class="sch-when">${fmtD(ds[s.key])} · ${esc(schTimeLabel(p))} <span class="sch-ph ${ph}">${pl}</span>${up ? `<span class="sch-upnext-tag">${soon ? "Up next · get ready" : "Up next"}</span>` : ""}</div>
      <h4>${s.week ? "Week " + s.week + " · " : ""}${esc(s.t)}</h4><p>${esc(s.d)}</p>
      ${c ? `<div class="sch-counts">${stChip("done", ` ${c.done}`)}${stChip("pending", ` ${c.pending}`)}${c.absent ? stChip("absent", ` ${c.absent}`) : ""}</div>` : ""}
      ${s.sqlqa ? `<div class="sch-qa">+ SQL QA (either week): ${qa.done} of ${(p.groups || []).length} groups done</div>` : ""}
    </div></div>`;
  }).join("");
  const mine = schMyGroup(p);
  const rows = (p.groups || []).map(g => {
    const st = (p.status && p.status[g.id]) || {}; const isMine = mine && mine.id === g.id;
    return `<tr class="${isMine ? "sch-mine" : ""}"><td><strong>${esc(g.name)}</strong>${isMine ? ' <span class="sch-you">Your group</span>' : ""}${g.members ? `<div class="sch-mem">${esc(g.members)}</div>` : ""}</td>${SCH_COLS.map(([k]) => `<td>${stChip(schGroupStatus(p, g, k), k === "sqlqa" && st.sqlqaWeek ? ` · ${st.sqlqaWeek === "tableau" ? "Tableau wk" : "Power BI wk"}` : "")}</td>`).join("")}<td class="sch-note">${esc(st.note || "")}</td></tr>`;
  }).join("");
  root.innerHTML = `${downBox}${tr ? `<div id="sch-batches-wrap">${schBatchesHtml(d, p)}</div>` : ""}${tabs}${picker}${schMyCardHtml(p)}
    <div class="sch-head card"><div><div class="sch-code">${esc(p.code)}</div><h3>${esc(p.name || SCH_PNAME)}</h3>
      <p>Kick-off ${fmtD(ds.kickoff)} · weekly presentations every <strong>${SCH_DAYS[p.presDay]}</strong> · <strong>${esc(schTimeLabel(p))}</strong> · ${(p.groups || []).length} groups</p></div>
      ${nx ? `<div class="sch-next ${schSoon(p, ds[nx.key]) ? "sch-soon" : ""}"><span>Next meeting</span><strong>${esc(nx.t)}</strong><em>${fmtD(ds[nx.key])} · ${esc(schTimeLabel(p))}</em></div>` : `<div class="sch-next done"><span>Status</span><strong>Project completed 🎉</strong></div>`}</div>
    <div class="sch-timeline">${timeline}</div>
    <div class="section-head mt-40" style="margin-bottom:12px;"><div class="eyebrow">Group status · ${esc(p.code)}</div><h2>Who has presented what</h2><p>✅ Done · ⏳ Pending · ❌ Nobody from the group presented in the meeting. SQL QA can be presented in the Tableau week or the Power BI week.</p></div>
    <div class="card table-scroll"><table class="dtable sch-table"><thead><tr><th>Group</th>${SCH_COLS.map(([, l]) => `<th>${l}</th>`).join("")}<th>Trainer note</th></tr></thead><tbody>${rows || `<tr><td colspan="7">No groups yet.</td></tr>`}</tbody></table></div>
    <p class="sch-upd">Last updated by trainer: ${p.updated ? new Date(p.updated).toLocaleString("en-IN") : "—"}</p>
    ${tr ? schAdminHtml(d, p) : ""}`;
  schBind(d, p);
}
const schSel = (id, opts, v, attrs) => `<select id="${id}" ${attrs || ""}>${opts.map(([val, lab]) => `<option value="${val}" ${String(val) === String(v) ? "selected" : ""}>${lab}</option>`).join("")}</select>`;
const schTimeOpts = SCH_TIMES.map(t => [t, fmtT(t)]);
function schTabsHtml(d, p) {
  const fri = new Date(); while (fri.getDay() !== 5) fri.setDate(fri.getDate() - 1);
  return `<div class="card sch-ptabs"><div class="sch-ptabs-row"><span class="sch-ptabs-l">Projects</span>
    ${d.projects.map(x => `<button type="button" class="sch-ptab ${p && x.code === p.code ? "on" : ""}" data-bcode="${esc(x.code)}"><b>${esc(x.code)}</b><small>${SCH_DAYS[x.presDay].slice(0, 3)} ${esc(fmtT(schTimes(x)[0]))}</small></button>`).join("")}
    <button type="button" class="sch-ptab add" id="sch-newopen">＋ New project</button></div>
    <div class="sch-newform" id="sch-newform" ${schNewOpen || !d.projects.length ? "" : "hidden"}>
      <h4>Start a new project</h4>
      <div class="sch-grid">
        <label>Project code<input class="search-input" id="sch-n-code" placeholder="e.g. P1428" maxlength="20"></label>
        <label>Kick-off date<input type="date" id="sch-n-kick" value="${ymd(fri)}"></label>
        <label>Presentation day ${schSel("sch-n-day", SCH_DAYS.map((x, i) => [i, x]), 6)}</label>
        <label>Start time ${schSel("sch-n-start", schTimeOpts, "21:00")}</label>
        <label>End time ${schSel("sch-n-end", schTimeOpts, "22:00")}</label>
        <label>Number of groups<input type="number" id="sch-n-groups" min="1" max="20" value="6"></label>
      </div>
      <div class="sch-row"><button class="btn-blue" id="sch-n-create">Create project</button><button class="btn-outline" id="sch-n-cancel">Cancel</button><span class="sch-n-err" id="sch-n-err"></span></div>
    </div></div>`;
}
function schAdminHtml(d, p) {
  const ds = schStageDates(p); const [st0, en0] = schTimes(p);
  const stSel = (gid, key, v) => `<select data-st="${gid}|${key}" class="st-sel ${SCH_ST[v][2]}">${Object.entries(SCH_ST).map(([s, [i, l]]) => `<option value="${s}" ${s === v ? "selected" : ""}>${i} ${l}</option>`).join("")}</select>`;
  const groups = (p.groups || []).map(g => { const st = (p.status && p.status[g.id]) || {};
    return `<tr><td><input data-gname="${g.id}" value="${esc(g.name)}"><input data-gmem="${g.id}" value="${esc(g.members || "")}" placeholder="Members (optional)"></td>
      ${SCH_COLS.map(([key]) => `<td>${stSel(g.id, key, st[key] || "pending")}${key === "sqlqa" ? `<select data-qaw="${g.id}">${[["", "Week?"], ["tableau", "Tableau wk"], ["powerbi", "Power BI wk"]].map(([v, l]) => `<option value="${v}" ${(st.sqlqaWeek || "") === v ? "selected" : ""}>${l}</option>`).join("")}</select>` : ""}</td>`).join("")}
      <td><input data-gnote="${g.id}" value="${esc(st.note || "")}" placeholder="Note"></td><td><button class="sch-del" data-gdel="${g.id}" title="Remove group">✕</button></td></tr>`; }).join("");
  return `<div class="card sch-admin">
    <div class="sch-admin-head"><h3>🔓 Trainer controls · <span class="sch-code">${esc(p.code)}</span></h3>${SCH_API ? `<span class="sch-live">☁ Live sync ON: every change saves automatically and students see it.</span>` : `<span>Changes save on this device. Students see them only after you <strong>Publish</strong> (or set up Live sync).</span>`}</div>
    ${SCH_API ? `<div class="sch-sync" id="sch-sync">${esc(schSyncMsg || "☁ Connected")}</div>` : ""}
    <div class="sch-grid">
      <label>Project code<input class="search-input" id="sch-code" value="${esc(p.code)}"></label>
      <label>Project name<input class="search-input" id="sch-name" value="${esc(p.name || "")}"></label>
      <label>Kick-off date<input type="date" id="sch-kick" value="${esc(ds.kickoff)}"></label>
      <label>Presentation day ${schSel("sch-pd", SCH_DAYS.map((x, i) => [i, x]), p.presDay)}</label>
      <label>Start time ${schSel("sch-start", schTimeOpts, st0)}</label>
      <label>End time ${schSel("sch-end", schTimeOpts, en0)}</label>
    </div>
    <p class="sch-hint">Weekly dates are worked out from the kick-off date and the presentation day. After a meeting's end time has passed, the next one becomes "Up next" automatically.</p>
    <details class="sch-over"><summary>Change a single presentation date (holiday, reschedule)</summary><div class="sch-grid">${SCH_STAGES.filter(s => s.week > 0).map(s => `<label>${s.t}<input type="date" data-over="${s.key}" value="${ds[s.key]}"></label>`).join("")}<button class="btn-outline" id="sch-clearover">Reset to weekly dates</button></div></details>
    <h4 style="margin:16px 0 8px;">Groups & presentation status · ${esc(p.code)}</h4>
    <div class="table-scroll"><table class="dtable sch-edit"><thead><tr><th>Group</th>${SCH_COLS.map(([, l]) => `<th>${l}</th>`).join("")}<th>Note</th><th></th></tr></thead><tbody>${groups}</tbody></table></div>
    <div class="sch-row"><button class="btn-outline" id="sch-addg">+ Add group</button><button class="btn-outline" id="sch-reset">↺ Reset all statuses</button><button class="btn-outline" id="sch-delp">🗑 Delete ${esc(p.code)}</button><button class="btn-outline" id="sch-pin">Change password</button>${SCH_API ? `<button class="btn-outline" id="sch-reload">⟳ Reload from server</button>` : `<button class="btn-outline" id="sch-discard">Load live file (discard draft)</button>`}</div>
    <div class="sch-publish" ${SCH_API ? 'style="display:none"' : ""}>
      <div><strong>Publish to students</strong><p>1) Download <code>project-schedule.js</code> → 2) replace that file in the site folder (GitHub / Vercel / hosting) → students see the update. Or share a link right now (works for the selected project).</p></div>
      <div class="sch-row"><button class="btn-blue" id="sch-download">⬇ Download project-schedule.js</button><button class="btn-dark" id="sch-link">🔗 Copy student link</button></div>
    </div></div>`;
}
/* ---------- trainer login (username + password) ---------- */
const SCH_USER = "mahendra";
function schLoginDialog() {
  if (document.getElementById("sch-login")) return;
  const ov = document.createElement("div"); ov.id = "sch-login"; ov.className = "sch-login-ov";
  ov.innerHTML = `<form class="sch-login" autocomplete="on"><h3>🔐 Trainer login</h3><p>Only the trainer can edit projects, dates and group statuses.</p>
    <label>Username<input id="sch-l-user" name="username" autocomplete="username" required></label>
    <label>Password<input id="sch-l-pass" name="password" type="password" autocomplete="current-password" required></label>
    <div class="sch-l-err" id="sch-l-err"></div>
    <div class="sch-row"><button class="btn-blue" type="submit" id="sch-l-go">Log in</button><button class="btn-outline" type="button" id="sch-l-cancel">Cancel</button></div></form>`;
  document.body.appendChild(ov);
  const q = (id) => ov.querySelector("#" + id); setTimeout(() => q("sch-l-user").focus(), 50);
  const close = () => ov.remove();
  q("sch-l-cancel").onclick = close; ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  const ok = (pass) => {
    try { sessionStorage.setItem(SCH_UNLOCK, "1"); sessionStorage.setItem(SCH_PIN, pass); } catch (e) {}
    close(); if (SCH_API && !schRemote) { schRemote = schDraft() || schPublished(); schSaveDraft(schRemote); }
    if (SCH_API) schSyncMsg = "☁ Connected · changes save automatically";
    renderSchedule(); renderHeroSchedule(); try { window.dispatchEvent(new Event("hub-trainer")); } catch (e) {}
  };
  ov.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault(); const user = q("sch-l-user").value.trim(), pass = q("sch-l-pass").value; const err = (t) => { q("sch-l-err").textContent = t; };
    if (!user || !pass) return err("Enter username and password.");
    if (SCH_API) {
      q("sch-l-go").disabled = true;
      schApi({ action: "check", user, pin: pass }).then(j => { q("sch-l-go").disabled = false; if (!j.ok) return err(j.error || "Wrong username or password."); ok(pass); })
        .catch(() => { q("sch-l-go").disabled = false; err("Could not reach the live sync server. Check your internet and try again."); });
      return;
    }
    if (user.toLowerCase() === SCH_USER && (schHash(pass) === schPublished().pinHash || (schDraft() && schHash(pass) === schDraft().pinHash))) { if (!schDraft()) schSaveDraft(schPublished()); ok(pass); }
    else err("Wrong username or password.");
  });
}
window.schTrainerLogin = schLoginDialog;
function schBind(d, p) {
  const $ = (id) => document.getElementById(id);
  const save = () => { if (p) { p.time = schTimeLabel(p); p.updated = new Date().toISOString(); } schSaveDraft(d); renderSchedule(); renderHeroSchedule(); };
  const selEl = $("sch-select");
  if (selEl) selEl.addEventListener("change", () => { lsSet(SCH_VIEW, selEl.value); renderSchedule(); renderHeroSchedule(); });
  document.querySelectorAll("#sch-root [data-bcode]").forEach(r => r.addEventListener("click", () => {
    const c = r.dataset.bcode; if (schIsTrainer()) { schEditCode = c; d.active = c; } else lsSet(SCH_VIEW, c); renderSchedule(); renderHeroSchedule();
  }));
  const un = $("sch-unlock"); if (un) un.onclick = schLoginDialog;
  const lk = $("sch-lock"); if (lk) lk.onclick = () => { try { sessionStorage.removeItem(SCH_UNLOCK); sessionStorage.removeItem(SCH_PIN); } catch (e) {} schEditCode = null; renderSchedule(); renderHeroSchedule(); };
  if (!schIsTrainer()) return;
  const on = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };
  // new project form
  on("sch-newopen", "click", () => { schNewOpen = true; const f = $("sch-newform"); if (f) { f.hidden = false; $("sch-n-code").focus(); } });
  on("sch-n-cancel", "click", () => { schNewOpen = false; const f = $("sch-newform"); if (f) f.hidden = true; });
  on("sch-n-create", "click", () => {
    const err = (t) => { $("sch-n-err").textContent = t; };
    const code = $("sch-n-code").value.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9-]{2,20}$/.test(code)) return err("Enter a project code like P1428.");
    if (d.projects.some(x => schNorm(x.code) === code)) return err(code + " already exists. Click its tab to open it.");
    const s = $("sch-n-start").value, e = $("sch-n-end").value; if (e <= s) return err("End time must be after the start time.");
    d.projects.push(schNewProject(code, { kickoff: $("sch-n-kick").value, presDay: $("sch-n-day").value, start: s, end: e, groups: $("sch-n-groups").value }));
    d.active = code; schEditCode = code; schNewOpen = false; schSaveDraft(d); renderSchedule(); renderHeroSchedule();
  });
  if (!p) return;
  on("sch-code", "change", (e) => { const v = e.target.value.trim().toUpperCase().replace(/\s+/g, ""); if (!v || d.projects.some(x => x !== p && schNorm(x.code) === v)) { alert("Code must be unique."); renderSchedule(); return; } if (d.active === p.code) d.active = v; p.code = v; schEditCode = v; save(); });
  on("sch-name", "change", (e) => { p.name = e.target.value; save(); });
  on("sch-kick", "change", (e) => { if (e.target.value) { p.kickoff = e.target.value; if (p.overrides) delete p.overrides.kickoff; save(); } });
  on("sch-pd", "change", (e) => { p.presDay = +e.target.value; p.overrides = {}; save(); });
  on("sch-start", "change", (e) => { p.start = e.target.value; const [, en] = schTimes(p); if (!p.end || en <= p.start) { const [h, m] = p.start.split(":").map(Number); p.end = `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`; } save(); });
  on("sch-end", "change", (e) => { p.start = schTimes(p)[0]; p.end = e.target.value; save(); });
  document.querySelectorAll("[data-over]").forEach(i => i.addEventListener("change", () => { p.overrides = p.overrides || {}; p.overrides[i.dataset.over] = i.value; save(); }));
  on("sch-clearover", "click", () => { p.overrides = {}; save(); });
  const gst = (gid) => { p.status = p.status || {}; p.status[gid] = p.status[gid] || {}; return p.status[gid]; };
  document.querySelectorAll("[data-st]").forEach(s => s.addEventListener("change", () => { const [gid, key] = s.dataset.st.split("|"); gst(gid)[key] = s.value; save(); }));
  document.querySelectorAll("[data-qaw]").forEach(s => s.addEventListener("change", () => { gst(s.dataset.qaw).sqlqaWeek = s.value; save(); }));
  document.querySelectorAll("[data-gnote]").forEach(s => s.addEventListener("change", () => { gst(s.dataset.gnote).note = s.value; save(); }));
  document.querySelectorAll("[data-gname]").forEach(s => s.addEventListener("change", () => { p.groups.find(g => g.id === s.dataset.gname).name = s.value; save(); }));
  document.querySelectorAll("[data-gmem]").forEach(s => s.addEventListener("change", () => { p.groups.find(g => g.id === s.dataset.gmem).members = s.value; save(); }));
  document.querySelectorAll("[data-gdel]").forEach(b => b.addEventListener("click", () => { if (!confirm("Remove this group?")) return; p.groups = p.groups.filter(g => g.id !== b.dataset.gdel); if (p.status) delete p.status[b.dataset.gdel]; save(); }));
  on("sch-addg", "click", () => { const n = (p.groups || []).length + 1; let id = "g" + n; while (p.groups.some(g => g.id === id)) id += "x"; p.groups.push({ id, name: "Group " + n, members: "" }); save(); });
  on("sch-reset", "click", () => { if (confirm("Reset every group's status to Pending for " + p.code + "?")) { p.status = {}; save(); } });
  on("sch-delp", "click", () => { if (!confirm("Delete project " + p.code + "? Its groups and statuses are removed.")) return; d.projects = d.projects.filter(x => x !== p); schEditCode = null; d.active = d.projects[0] ? d.projects[0].code : ""; save(); });
  on("sch-pin", "click", () => { const a = prompt("New trainer password (min 6 characters)"); if (!a) return; if (a.length < 6) { alert("Password must be at least 6 characters."); return; } if (prompt("Type the new password again") !== a) { alert("Passwords don't match."); return; }
    if (SCH_API) { let pin = ""; try { pin = sessionStorage.getItem(SCH_PIN) || ""; } catch (e) {} schApi({ action: "setpin", pin, newPin: a }).then(j => { if (j.ok) { try { sessionStorage.setItem(SCH_PIN, a); } catch (e) {} alert("Password changed. Use the new password from now on."); } else alert(j.error || "Could not change the password."); }).catch(() => alert("Could not reach the server.")); return; } d.pinHash = schHash(a); save(); alert("Password changed. Download and upload project-schedule.js so it applies on the live site."); });
  on("sch-reload", "click", () => { schRemote = null; schLoadRemote(); });
  on("sch-discard", "click", () => { if (!confirm("Discard your unpublished changes on this device and load the live project-schedule.js?")) return; lsSet(SCH_DRAFT, JSON.stringify(schPublished())); schEditCode = null; renderSchedule(); renderHeroSchedule(); });
  on("sch-download", "click", () => {
    d.active = p.code; const out = schClone(d); out.updated = new Date().toISOString();
    const js = "/* Project schedule & group status. Edit it from the site (Trainer login), then replace this file. */\nwindow.PROJECT_SCHEDULE = " + JSON.stringify(out, null, 1) + ";\n";
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([js], { type: "text/javascript" })); a.download = "project-schedule.js"; document.body.appendChild(a); a.click(); a.remove();
  });
  on("sch-link", "click", (e) => {
    const one = schClone(p); one.updated = new Date().toISOString();
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(one)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    copyText(location.href.split("#")[0] + "#schedule=" + b64, e.target, "🔗 Copy student link");
  });
}
/* ---------- hero cards (home) ---------- */
function renderHeroSchedule() {
  const d = schData(); const p = schCurrent(d);
  const c1 = document.getElementById("hero-problem-card"), c2 = document.getElementById("hero-streak-card"), c4 = document.getElementById("hero-today-card");
  if (!p) { [c1, c2, c4].forEach(c => { if (c) c.innerHTML = `<div class="hf-lv dark">PROJECT SCHEDULE</div><p style="margin-top:6px;">Your trainer will publish the schedule here.</p>`; }); return; }
  const ds = schStageDates(p); const nx = schNext(p); const go = () => { if (typeof switchView === "function") switchView("schedule"); };
  if (c1) {
    c1.innerHTML = nx ? `<div class="hf-top"><span class="hf-ic">📅</span><span class="hf-lv">${esc(p.code)}</span><span class="hf-day ${schSoon(p, ds[nx.key]) ? "sch-soon" : ""}">${schPhase(p, ds[nx.key])[1]}</span></div><h5>Next: ${esc(nx.t)}</h5><p>${esc(nx.d)}</p>
      <div class="hf-when">${fmtD(ds[nx.key])}<br><small>${esc(schTimeLabel(p))}</small></div>` : `<div class="hf-top"><span class="hf-ic">🎉</span><span class="hf-lv">${esc(p.code)}</span></div><h5>Project completed</h5><p>All presentations are done.</p>`;
    c1.classList.toggle("sch-soon-card", !!(nx && schSoon(p, ds[nx.key])));
    c1.onclick = go;
  }
  if (c2) {
    const now = new Date();
    const stg = nx && nx.track ? nx : SCH_STAGES.filter(s => s.track).reverse().find(s => schWindow(p, ds[s.key])[0] <= now) || SCH_STAGES[1];
    const c = schCounts(p, stg.key); const n = (p.groups || []).length || 1; const mine = schMyGroup(p);
    const list = mine ? [mine, ...(p.groups || []).filter(g => g.id !== mine.id)] : (p.groups || []);
    c2.innerHTML = `<div class="hf-top"><span>👥</span><span class="hf-lv dark">GROUP STATUS</span><span class="hf-fire">${esc(stg.t.split(" ")[0])}</span></div>
      <div class="hf-big">${c.done}<small>of ${n} groups done</small></div><div class="hf-bar"><i style="width:${Math.round(c.done / n * 100)}%"></i></div>
      ${list.slice(0, 4).map(g => { const s = schGroupStatus(p, g, stg.key); return `<div class="hf-row"><span>${esc(g.name)}${mine && g.id === mine.id ? " (you)" : ""}</span><span class="${s === "done" ? "ok" : ""}">${SCH_ST[s][0]}</span></div>`; }).join("")}
      ${list.length > 4 ? `<div class="hf-foot">+${list.length - 4} more groups</div>` : ""}`;
    c2.onclick = go; c2.style.cursor = "pointer";
  }
  if (c4) {
    c4.innerHTML = `<div class="hf-lv dark" style="margin-bottom:8px;">PROJECT TIMELINE · ${esc(p.code)}</div>${SCH_STAGES.map(s => { const [ph] = schPhase(p, ds[s.key]); const up = nx && nx.key === s.key; return `<div class="hf-li ${ph} ${up ? "sch-upnext" : ""} ${up && schSoon(p, ds[s.key]) ? "sch-soon" : ""}" ${up ? 'title="Up next"' : ""}><span>${ph === "past" ? "✓" : ph === "next" || ph === "today" ? "●" : "○"}</span><span>${esc(s.t.replace(" Presentation", ""))}</span><small>${fmtD(ds[s.key]).replace(/, \d{4}$/, "")}</small></div>`; }).join("")}<div class="hf-foot"><i class="dot"></i> Weekly every ${SCH_DAYS[p.presDay]} · ${esc(schTimeLabel(p))}</div>`;
    c4.onclick = go; c4.style.cursor = "pointer";
  }
}
(function () {
  if (document.getElementById("sch-batch-css")) return;
  const s = document.createElement("style"); s.id = "sch-batch-css";
  s.textContent = `.sch-batches{padding:18px 20px;margin-bottom:16px}.sch-bh{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:10px}.sch-bh h3{margin:0;font-size:18px}.sch-bh span{font-size:12.5px;color:var(--ink-muted,#666)}
  .sch-batches tr[data-bcode]{cursor:pointer}.sch-batches tr[data-bcode]:hover td{background:rgba(31,158,139,.06)}.sch-batches tr.sch-cur td{background:rgba(31,158,139,.10)}
  .sch-batches td.n,.sch-bc{font-family:var(--mono,monospace);text-align:center}.sch-bc.all{color:#15803D;font-weight:700}
  .sch-you{display:inline-block;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:20px;background:#DCFCE7;color:#166534;margin-left:4px;vertical-align:middle}
  .sch-my{padding:16px 20px;margin-bottom:16px;border-left:4px solid #1F9E8B!important}
  .sch-my-h{font-size:15px;margin-bottom:10px}.sch-my-st{display:flex;flex-wrap:wrap;gap:8px 16px;margin-bottom:8px}.sch-my-st em{font-style:normal;font-size:12px;color:var(--ink-muted,#666);margin-right:4px}.sch-my p{margin:0;font-size:13.5px}
  tr.sch-mine td{background:rgba(31,158,139,.08)}
  .sch-stage.sch-upnext{background:rgba(250,204,21,.16);border:1px solid rgba(234,179,8,.45);border-radius:14px;padding:12px 14px;margin:4px 0}
  .sch-upnext-tag{display:inline-block;margin-left:6px;font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;background:#FACC15;color:#422006;vertical-align:middle}
  .hf-li.sch-upnext{background:rgba(250,204,21,.22);border-radius:8px;padding-left:6px;padding-right:6px;font-weight:600}
  .sch-stage.sch-upnext.sch-soon{background:rgba(34,197,94,.15);border-color:rgba(22,163,74,.55)}
  .sch-stage.sch-soon .sch-upnext-tag,.sch-soon-pill{background:#16A34A;color:#fff}
  .sch-nx.sch-soon{background:#16A34A;color:#fff;font-weight:700}
  .sch-stage.sch-soon .sch-ph.next,.sch-stage.sch-soon .sch-ph.today{background:#DCFCE7;color:#15803D}
  .hf-li.sch-soon span:first-child{color:#15803D!important}
  .sch-down.off{background:#FFFBEB!important;border-color:#FDE68A!important;color:#78350F}
  .sch-down{padding:12px 16px;margin-bottom:14px;background:#FEF2F2!important;border:1px solid #FECACA!important;color:#7F1D1D;font-size:13.5px;line-height:1.5}
  .sch-soon-pill{display:inline-block;font-size:11.5px;font-weight:700;padding:1px 8px;border-radius:20px;margin-left:4px}
  .hf-li.sch-upnext.sch-soon{background:rgba(34,197,94,.22);color:#14532D}
  .hf-day.sch-soon{background:#16A34A!important;color:#fff!important}
  .sch-soon-card{box-shadow:0 0 0 2px rgba(22,163,74,.55),0 10px 28px rgba(22,163,74,.18)!important}
  .sch-next.sch-soon{background:#15803D!important;color:#fff}
  .sch-nx{display:inline-block;background:rgba(250,204,21,.22);border-radius:6px;padding:1px 6px}
  .sch-ptabs{padding:14px 16px;margin-bottom:16px}.sch-ptabs-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.sch-ptabs-l{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-muted,#666);margin-right:4px}
  .sch-ptab{display:inline-flex;flex-direction:column;align-items:flex-start;gap:1px;padding:7px 12px;border-radius:10px;border:1px solid var(--line,#ddd);background:var(--paper-raised,#fff);color:var(--ink,#111);cursor:pointer;font-size:13px;line-height:1.2}
  .sch-ptab small{font-size:11px;color:var(--ink-muted,#666)}.sch-ptab.on{border-color:#1F9E8B;background:rgba(31,158,139,.12);box-shadow:0 0 0 2px rgba(31,158,139,.25)}
  .sch-ptab.add{border-style:dashed;color:#137A6A;font-weight:700;justify-content:center;min-height:42px}
  .sch-newform{margin-top:14px;padding-top:12px;border-top:1px dashed var(--line,#ddd)}.sch-newform h4{margin:0 0 8px}.sch-n-err{color:#DC2626;font-size:13px;align-self:center}
  .sch-newform input[type=date],.sch-newform input[type=number],.sch-admin input[type=date]{padding:8px 10px;border-radius:8px;border:1px solid var(--line,#ddd);background:var(--paper-raised,#fff);color:var(--ink,#111)}
  .sch-hint{font-size:12.5px;color:var(--ink-muted,#666);margin:8px 0 4px}
  .sch-login-ov{position:fixed;inset:0;background:rgba(10,15,30,.55);backdrop-filter:blur(3px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px}
  .sch-login{background:var(--paper-raised,#fff);color:var(--ink,#111);border-radius:18px;max-width:380px;width:100%;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.25)}
  .sch-login h3{margin:0 0 6px;font-size:21px}.sch-login p{margin:0 0 12px;font-size:13px;color:var(--ink-muted,#666)}
  .sch-login label{display:block;font-size:12.5px;font-weight:600;margin:10px 0 0;color:var(--ink-muted,#555)}
  .sch-login input{display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:11px 12px;border-radius:10px;border:1px solid var(--line,#ddd);background:var(--paper,#fafafa);color:var(--ink,#111);font-size:15px}
  .sch-l-err{color:#DC2626;font-size:12.5px;min-height:16px;margin:8px 0}
  .sch-newform select,.sch-admin .sch-grid select{padding:8px 10px;border-radius:8px;border:1px solid var(--line,#ddd);background:var(--paper-raised,#fff);color:var(--ink,#111);font-size:13.5px;min-height:38px}`;
  document.head.appendChild(s);
})();
window.addEventListener("hub-student", () => { try { renderSchedule(); renderHeroSchedule(); } catch (e) {} });
window.addEventListener("vk-summary", () => { if (!schIsTrainer()) return; const w = document.getElementById("sch-batches-wrap"); if (!w) return; const d = schData(); w.innerHTML = schBatchesHtml(d, schCurrent(d));
  w.querySelectorAll("[data-bcode]").forEach(r => r.addEventListener("click", () => { schEditCode = r.dataset.bcode; d.active = r.dataset.bcode; renderSchedule(); renderHeroSchedule(); })); });
setInterval(() => { try { if (!schIsTrainer()) renderHeroSchedule(); } catch (e) {} }, 300000);   // roll "Up next" forward after a meeting ends
document.addEventListener("DOMContentLoaded", () => {
  renderSchedule(); renderHeroSchedule();
  if (schFromHash()) setTimeout(() => { if (typeof switchView === "function") switchView("schedule"); }, 50);
  if (SCH_API) { schLoadRemote(); setInterval(() => { if (!schIsTrainer() && document.visibilityState === "visible") schLoadRemote(true); }, 120000); }
  else schProbe();
});
/* read-only access for other kits (Dexa Coach certificate check) */
window.__SCH = { data: schData, myGroup: schMyGroup, norm: schNorm, stageDates: schStageDates, status: schGroupStatus };
/* read-only access for other kits (Dexa Coach certificate check) */
window.__SCH = { data: schData, myGroup: schMyGroup, norm: schNorm, stageDates: schStageDates, status: schGroupStatus };
/* read-only access for other kits (Dexa Coach certificate check) */
window.__SCH = { data: schData, myGroup: schMyGroup, norm: schNorm, stageDates: schStageDates, status: schGroupStatus };
/* read-only access for other kits (Dexa Coach certificate check) */
window.__SCH = { data: schData, myGroup: schMyGroup, norm: schNorm, stageDates: schStageDates, status: schGroupStatus };
/* read-only access for other kits (Dexa Coach certificate check) */
window.__SCH = { data: schData, myGroup: schMyGroup, norm: schNorm };

})();
