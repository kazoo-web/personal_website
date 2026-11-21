// Tulip CoS fit tool. Two pages share this file: /natan/ and /katherine/ (VIEW is set by each page).
// Supabase: project URL + anon/publishable key (public by design; access is limited by the table's policies).
const SUPABASE_URL = 'https://ntedswmmxnltkyewxchf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qSqfsAReeBUL66ZrqqXGyQ_RJw0beg5';
const TABLE = SUPABASE_URL + '/rest/v1/tulip_cos_store';
const HEADERS = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };

// ---- default content (from the posting; every item is editable) ------------
const DEFAULT_A = [
  ['About you', 'Track record of designing, implementing, and scaling operational frameworks in fast-paced, high-growth environments'],
  ['About you', 'Passionate about strategy, learning how to run a company, process improvement, operational rigor, and driving meaningful change across organizations'],
  ['About you', 'Adept at transforming complexity into clarity and building systems that foster efficiency and accountability'],
  ['About you', 'Data-driven, leveraging analytics to fuel continuous improvement and inform operational decisions'],
  ['About you', 'Collaborative and influential, naturally building strong partnerships across functions and driving cross-team alignment'],
  ['About you', 'Strong communicator with the ability to engage, motivate, and align diverse stakeholders'],
  ['About you', 'Enjoy serving as a force multiplier for operational excellence and effectiveness, working closely alongside executive leadership and the CEO'],
  ['Skills & qualifications', '7+ years of progressive experience in business operations, operational excellence, program management, strategy, Chief of Staff, or process optimization, ideally at a tech or high-growth company'],
  ['Skills & qualifications', 'Demonstrated ability to build, scale, and continuously improve core business processes across multiple functions (GTM, R&D, G&A)'],
  ['Skills & qualifications', 'Proven success leading complex, cross-functional initiatives and implementing change management in dynamic environments'],
  ['Skills & qualifications', 'Advanced organizational skills with expertise in operational planning, resource allocation, and process design'],
  ['Skills & qualifications', 'Strong analytical chops, including data interpretation and business analytics to identify performance gaps and recommend solutions'],
  ['Skills & qualifications', 'Excellent written and verbal communication, including executive-level deliverables and influencing stakeholders at all levels'],
  ['Skills & qualifications', 'Expert with MS Office and Google Suite; comfortable with business systems and reporting tools'],
  ['Skills & qualifications', 'Efficiency-focused problem solver with a strong interest in AI and technology'],
  ['Skills & qualifications', 'Experience as a direct people manager'],
  ['Skills & qualifications', 'MBA or top-tier consulting experience (a plus)'],
].map(([group, text], i) => ({ id: 'a' + (i + 1), group, text }));

const DEFAULT_B = [
  ['Strategic planning & operating rhythm', 'Lead annual and quarterly planning with Finance and functional leaders, driving goal-setting and accountability'],
  ['Strategic planning & operating rhythm', 'Design frameworks that align teams around priorities, resource allocation, and outcomes'],
  ['Strategic planning & operating rhythm', 'Manage company-wide communication rhythms, leadership team meetings, and presentations'],
  ['Business process design & improvement', 'Analyze and optimize core business processes across GTM, R&D, and G&A'],
  ['Business process design & improvement', 'Partner with Systems and Analytics to automate workflows, improve data access, and ensure accurate reporting'],
  ['Business process design & improvement', 'Establish SOPs and drive adoption through change management'],
  ['Cross-functional strategy & program management', 'Lead high-priority initiatives such as pricing changes, new market entry, and onboarding redesign'],
  ['Cross-functional strategy & program management', 'Act as connective tissue across departments to keep execution clear and aligned'],
  ['Cross-functional strategy & program management', 'Drive strategic initiatives for the CEO, COO, and executive team, from planning through performance tracking'],
  ['Executive operations & decision support', 'Build and manage the CEO Office'],
  ['Executive operations & decision support', 'Prepare analysis, dashboards, and recommendations for leadership and the Board'],
  ['Executive operations & decision support', 'Lead Board and investor relations rhythms'],
  ['Executive operations & decision support', 'Run diagnostics to identify performance gaps and improvement opportunities'],
  ['Executive operations & decision support', 'Coordinate offsites, onsites, and company-wide events, including logistics and executive communications'],
].map(([area, text], i) => ({ id: 'b' + (i + 1), area, text }));
const DEFAULT_B_TEXT = Object.fromEntries(DEFAULT_B.map((c) => [c.id, c.text]));
const DEFAULT_AREAS = [...new Set(DEFAULT_B.map((c) => c.area))];
const AREA_COLORS = ['#8A3820', '#5C6B3A', '#3F5A6E', '#A86F2A', '#6E3F5C', '#7A6A5A'];

// ---- state ---------------------------------------------------------------------
let S = { partA: clone(DEFAULT_A), partB: clone(DEFAULT_B), natan: { items: {}, areaTime: {}, order: [], ranked: false }, katherine: { a: {}, b: {} }, updated: {} };
let tab = null, editA = false, dragId = null;
const openNotes = new Set();
const timers = {};

function clone(x) { return JSON.parse(JSON.stringify(x)); }
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const setStatus = (t) => ($('#status').textContent = t);
const timeStr = (iso) => iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const r1 = (x) => Math.round(x); // time is shown and entered in whole percents
const active = () => S.partB.filter((c) => !c.removed && c.text.trim());
const byId = (id) => S.partB.find((c) => c.id === id);
const areas = () => [...new Set(active().map((c) => c.area))];
const allAreas = () => [...new Set(S.partB.map((c) => c.area))];
function areaColor(area) {
  const i = DEFAULT_AREAS.indexOf(area);
  if (i >= 0) return AREA_COLORS[i];
  const extra = allAreas().filter((a) => !DEFAULT_AREAS.includes(a));
  return AREA_COLORS[4 + (extra.indexOf(area) % 2)];
}

function statusOf(c) {
  if (c.removed) return 'removed';
  if (!(c.id in DEFAULT_B_TEXT)) return 'added';
  if (c.text.trim() !== DEFAULT_B_TEXT[c.id]) return 'edited';
  return '';
}
function rankOrder() {
  const ids = active().map((c) => c.id);
  const ord = (S.natan.order || []).filter((id) => ids.includes(id));
  ids.forEach((id) => { if (!ord.includes(id)) ord.push(id); });
  return ord;
}
function splitWhole(total, n) {
  const t = Math.round(total), base = Math.floor(t / n), extra = t - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}
function baselineNatan() {
  const all = DEFAULT_B, areaTime = {};
  // whole percents per section, largest remainders first, so sections add up to exactly 100
  const raw = DEFAULT_AREAS.map((a) => (all.filter((c) => c.area === a).length * 100) / all.length);
  const fl = raw.map(Math.floor); let left = 100 - fl.reduce((x, y) => x + y, 0);
  raw.map((v, i) => [v - fl[i], i]).sort((x, y) => y[0] - x[0]).forEach(([, i]) => { if (left > 0) { fl[i]++; left--; } });
  DEFAULT_AREAS.forEach((a, i) => { areaTime[a] = fl[i]; });
  return { items: {}, areaTime, order: [], catOrder: [], ranked: false };
}

// ---- time model ------------------------------------------------------------------
// A section's % (typed, or assumed when it's the only one left blank) is split evenly
// across its items that haven't been set individually. Set items are kept as typed.
// A section's total is the larger of its target and its items' sum, so going over is allowed and flagged.
const itemsIn = (area) => active().filter((c) => c.area === area);
const nItem = (id) => (S.natan.items[id] = S.natan.items[id] || {});
const typedArea = (area) => { const v = (S.natan.areaTime || {})[area]; return v == null || v === '' ? null : Number(v); };
const itemSet = (id) => (S.natan.items[id] || {}).time != null;
const explicitSum = (area) => itemsIn(area).reduce((s, c) => s + (itemSet(c.id) ? Number(S.natan.items[c.id].time) : 0), 0);
const unsetCount = (area) => itemsIn(area).filter((c) => !itemSet(c.id)).length;
const sectionStarted = (area) => typedArea(area) != null || unsetCount(area) < itemsIn(area).length;
function assumedArea(area) {
  // only one section left blank → it gets whatever is left of 100%
  const blank = areas().filter((a) => !sectionStarted(a));
  if (blank.length !== 1 || blank[0] !== area || areas().length < 2) return null;
  const others = areas().filter((a) => a !== area).reduce((s, a) => s + areaTotalRaw(a, typedArea(a)), 0);
  return Math.max(0, 100 - others);
}
function areaTarget(area) { const t = typedArea(area); return t != null ? t : assumedArea(area); }
function areaTotalRaw(area, target) {
  const E = explicitSum(area), U = unsetCount(area);
  if (U === 0) return E;
  return target == null ? E : Math.max(target, E);
}
const areaTotal = (area) => areaTotalRaw(area, areaTarget(area));
function effTime(id) {
  const c = byId(id); if (!c || c.removed || !c.text.trim()) return null;
  if (itemSet(id)) return Number(S.natan.items[id].time);
  const T = areaTarget(c.area); if (T == null) return null;
  const unset = itemsIn(c.area).filter((x) => !itemSet(x.id));
  return splitWhole(Math.max(0, T - explicitSum(c.area)), unset.length)[unset.findIndex((x) => x.id === id)];
}
function areaAlert(area) {
  const T = typedArea(area), E = explicitSum(area), U = unsetCount(area);
  if (T != null && E > T) return `Items add up to ${r1(E)}% — over the ${r1(T)}% set for this section, so the section now counts as ${r1(E)}%.`;
  if (T != null && U === 0 && E < T) return `Items add up to ${r1(E)}% — under the ${r1(T)}% set for this section.`;
  return '';
}
const grandTotal = () => areas().reduce((s, a) => s + areaTotal(a), 0);
const anyTime = () => areas().some((a) => areaTotal(a) > 0);

// ---- server --------------------------------------------------------------------
async function load() {
  await flushSaves();
  setStatus('Loading…');
  try {
    const r = await fetch(TABLE + '?select=key,data,updated_at', { headers: HEADERS });
    if (!r.ok) throw new Error(r.status);
    const d = Object.fromEntries((await r.json()).map((row) => [row.key, row]));
    const get = (k) => d[k] && d[k].data;
    S.partA = get('partA') || clone(DEFAULT_A);
    S.partB = get('partB') || clone(DEFAULT_B);
    S.natan = Object.assign({ items: {}, areaTime: {}, order: [], catOrder: [], ranked: false }, get('natan') || baselineNatan());
    S.natan.areaTime = S.natan.areaTime || {};
    S.katherine = Object.assign({ a: {}, b: {} }, get('katherine') || {});
    S.updated = Object.fromEntries(['partB', 'natan', 'katherine'].map((k) => [k, d[k] && d[k].updated_at]));
    setStatus('Up to date · ' + timeStr(new Date().toISOString()));
    render();
  } catch (e) { setStatus('Couldn’t load — try Refresh.'); }
}

const pending = {};
async function post(key) {
  const now = new Date().toISOString();
  try {
    const r = await fetch(TABLE, { method: 'POST', headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ key, data: S[key], updated_at: now }) });
    setStatus(r.ok ? 'Saved · ' + timeStr(now) : 'Save failed (' + r.status + ') — edit again to retry.');
  } catch (e) { setStatus('Save failed — check your connection and edit again.'); }
}
function save(key) {
  if (key === 'partB') S.partB.forEach((c) => (c.status = statusOf(c)));
  clearTimeout(timers[key]); pending[key] = true;
  setStatus('Saving…');
  timers[key] = setTimeout(() => { delete pending[key]; post(key); }, 700);
}
// send anything still waiting before reloading, so a reload never overwrites fresh edits
function flushSaves() {
  return Promise.all(Object.keys(pending).map((k) => { clearTimeout(timers[k]); delete pending[k]; return post(k); }));
}

// ---- tabs ----------------------------------------------------------------------
function tabs() {
  return VIEW === 'natan'
    ? [['edit', '1 · Review'], ['rank', '2 · Prioritization'], ['bring', '3 · Day-1 readiness'], ['time', '4 · Time allocation']]
    : [['role', 'Can do / want to'], ['combined', 'Combined']];
}
function render() {
  $('#titlebar').innerHTML = `<h1>Tulip · Chief of Staff</h1>${VIEW === 'katherine'
    ? `<button class="star ${tab === 'who' ? 'on' : ''}" data-tab="who" title="Who I am — my notes">★</button><a class="star n" href="../natan/" title="Natan’s view">N</a>`
    : `<a class="star n" href="../katherine/" title="Katherine’s view">K</a>`}`;
  $('#subtitle').textContent = VIEW === 'natan' ? '' : 'Katherine’s workspace';
  $('#tabs').innerHTML = tabs().map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('');
  const views = { edit: vEdit, time: vTime, bring: vBring, rank: vRank, who: vWho, role: vRole, combined: vCombined };
  $('#main').innerHTML = views[tab]();
  document.querySelectorAll('textarea.grow').forEach(autoGrow);
  syncResetButton();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.dataset.tab;
  if (tab === 'combined') load(); else render(); // combined always pulls the latest from both pages
  window.scrollTo(0, 0);
});
let resetArmed = null;
const RESET_LABELS = { edit: 'Reset review', rank: 'Reset prioritization', bring: 'Reset day-1 readiness', time: 'Reset time allocation', role: 'Reset board' };
const resetLabel = () => RESET_LABELS[tab] || '';
function syncResetButton() {
  const b = $('#refresh'), label = resetLabel();
  b.style.visibility = label ? 'visible' : 'hidden';
  if (!resetArmed) { b.textContent = label; b.classList.remove('armed'); }
}
$('#refresh').addEventListener('click', () => {
  const b = $('#refresh');
  if (!resetArmed) {
    b.textContent = 'Click again to reset'; b.classList.add('armed');
    resetArmed = setTimeout(() => { resetArmed = null; syncResetButton(); }, 4000);
    return;
  }
  clearTimeout(resetArmed); resetArmed = null;
  if (tab === 'edit') { S.partB = clone(DEFAULT_B); save('partB'); }
  else if (tab === 'rank') { S.natan.order = []; S.natan.secOrder = []; S.natan.ranked = false; save('natan'); }
  else if (tab === 'bring') { Object.values(S.natan.items).forEach((r) => delete r.dayone); save('natan'); }
  else if (tab === 'time') { Object.values(S.natan.items).forEach((r) => delete r.time); S.natan.areaTime = baselineNatan().areaTime; save('natan'); }
  else if (tab === 'role') { S.katherine.b = {}; save('katherine'); }
  render();
});
function autoGrow(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

// ---- widgets -------------------------------------------------------------------
const ONE_FIVE = [1, 2, 3, 4, 5].map((n) => [n, n]);
function seg(path, val, opts) {
  return `<span class="seg">${opts.map(([v, l]) => `<button data-set="${path}" data-val="${v}" class="${String(val) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</span>`;
}
function note(path, val, prompt) {
  if (!openNotes.has(path) && !val) return `<button class="notebtn" data-opennote="${path}">${prompt}</button>`;
  return `<textarea class="grow note" data-text="${path}" placeholder="${esc(prompt)}">${esc(val)}</textarea>`;
}
const areaHead = (area) => `<h2 class="area"><span class="swatch" style="background:${areaColor(area)}"></span>${esc(area)}</h2>`;
function grouped(list, fn) {
  let html = '', g = null;
  list.forEach((c, i) => { if (c.area !== g) { g = c.area; html += areaHead(g); } html += fn(c, i); });
  return html;
}
function setPath(path, v) {
  const parts = path.split('.'); let o = S;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]] = o[parts[i]] || {};
  o[parts[parts.length - 1]] = v;
}
function getPath(path) { return path.split('.').reduce((o, k) => (o ? o[k] : undefined), S); }

// ---- Natan 1: review the role ------------------------------------------------------
function vEdit() {
  let html = '';
  allAreas().forEach((area) => {
    const custom = !DEFAULT_AREAS.includes(area);
    html += custom
      ? `<h2 class="area"><span class="swatch" style="background:${areaColor(area)}"></span><input class="areaname" data-areaname="${esc(area)}" value="${esc(area)}" placeholder="Name this area"></h2>`
      : areaHead(area);
    S.partB.filter((c) => c.area === area).forEach((c) => {
      const st = statusOf(c);
      const badge = st ? `<span class="badge ${st === 'removed' ? 'rm' : ''}">${st[0].toUpperCase() + st.slice(1)}</span>` : '';
      html += `<div class="item editrow ${c.removed ? 'removed' : ''}" style="--c:${areaColor(area)}">
        <textarea class="grow edit" rows="1" data-btext="${c.id}" ${c.removed ? 'disabled' : ''} placeholder="Describe this part of the role">${esc(c.text)}</textarea>
        <div class="actions">${badge}
          ${st === 'edited' ? `<button class="small" data-revert="${c.id}">Undo edit</button>` : ''}
          ${c.removed ? `<button class="small" data-restore="${c.id}">Restore</button>` : `<button class="small" data-remove="${c.id}">Remove</button>`}</div></div>`;
    });
    html += `<button class="addlink" data-addto="${esc(area)}">+ Add to this area</button>`;
  });
  return `${html}<div class="newarea"><button class="btn" data-newarea="1">+ Add an item in a new area</button></div>`;
}

// ---- Natan 2: time ------------------------------------------------------------------
function vTime() {
  const cards = areas().map((area) => timeCard(area)).join('');
  return `<div class="tgrid" id="tgrid">${cards}</div><div class="total" id="totalbar">${totalHtml()}</div>`;
}
function timeCard(area) {
  const T = typedArea(area), assumed = T == null ? assumedArea(area) : null, total = areaTotal(area), alert = areaAlert(area);
  const anySet = unsetCount(area) < itemsIn(area).length;
  const items = itemsIn(area).map((c) => {
    const set = itemSet(c.id), t = effTime(c.id);
    return `<div class="titem"><span>${esc(c.text)}</span><span class="pctwrap"><input class="pct sm ${set ? '' : 'auto'}" type="number" min="0" step="1" data-itime="${c.id}" value="${t == null ? '' : r1(t)}"><i>%</i></span></div>`;
  }).join('');
  const shown = T != null ? r1(Math.max(T, total)) : assumed != null ? r1(Math.max(assumed, total)) : anySet ? r1(total) : '';
  const foot = assumed != null && T == null ? 'Assumed from what’s left of 100% — type to change it'
    : anySet ? `Some lines set by hand · <button class="linkbtn" data-reeven="${esc(area)}">split evenly again</button>` : 'Split evenly across items';
  return `<div class="tcard ${alert ? 'warn' : ''}" data-area="${esc(area)}" style="--c:${areaColor(area)}">
    <div class="thead"><span class="tname"><span class="swatch" style="background:${areaColor(area)}"></span>${esc(area)}</span>
      <span class="pctwrap"><input class="pct ${T == null ? 'auto' : ''}" type="number" min="0" step="1" data-atime="${esc(area)}" value="${shown}"><i>%</i></span></div>
    ${alert ? `<div class="talert">${alert}</div>` : ''}
    <div class="titems">${items}</div><div class="tfoot">${foot}</div></div>`;
}
function totalHtml() {
  const t = r1(grandTotal());
  if (t > 100) return `<span class="over"><b>${t}%</b> — over 100% by ${r1(t - 100)}%</span>`;
  if (t === 100) return `<b>100%</b> allocated ✓`;
  return `<b>${t}%</b> allocated · <span class="left">${r1(100 - t)}% left</span>`;
}
function refreshTime(except) {
  // re-render every card except the input being typed in, so the cursor stays put
  areas().forEach((area) => {
    const card = document.querySelector(`.tcard[data-area="${CSS.escape(area)}"]`); if (!card) return;
    const tmp = document.createElement('div'); tmp.innerHTML = timeCard(area); const fresh = tmp.firstElementChild;
    if (except && card.contains(except)) {
      card.className = fresh.className;
      card.querySelectorAll('input').forEach((inp) => {
        if (inp === except) return;
        const sel = inp.dataset.atime !== undefined ? `input[data-atime="${CSS.escape(inp.dataset.atime)}"]` : `input[data-itime="${inp.dataset.itime}"]`;
        const f = fresh.querySelector(sel); if (f) { inp.value = f.value; inp.className = f.className; }
      });
      const oldAlert = card.querySelector('.talert'), newAlert = fresh.querySelector('.talert');
      if (oldAlert) oldAlert.remove(); if (newAlert) card.querySelector('.thead').after(newAlert);
      card.querySelector('.tfoot').innerHTML = fresh.querySelector('.tfoot').innerHTML;
    } else card.replaceWith(fresh);
  });
  $('#totalbar').innerHTML = totalHtml();
  $('#totalbar').classList.toggle('over', grandTotal() > 100.05);
}

// ---- Natan 3: day-1 readiness (sections or single items) -----------------------------------
function vBring() {
  const colItems = (key) => active().filter((c) => ((S.natan.items[c.id] || {}).dayone || '') === key);
  const groups = (list) => areas().map((a) => {
    const its = list.filter((c) => c.area === a); if (!its.length) return '';
    return `<div class="dgroup" style="--c:${areaColor(a)}"><div class="dghead" draggable="true" data-dcat="${esc(a)}" title="Drag to move the whole section">${esc(a)}<span>${its.length}</span></div>
      ${its.map((c) => `<div class="dcard" draggable="true" data-did="${c.id}" style="--c:${areaColor(c.area)}">${esc(c.text)}</div>`).join('')}</div>`;
  }).join('');
  const col = (key, title) => { const list = colItems(key);
    return `<div class="dcol ${key ? '' : 'pool'}" data-col="${key}"><div class="dhead"><b>${title}</b><span class="dcount">${list.length}</span></div>
      <div class="dlist">${groups(list) || '<div class="dempty">Drag a section or an item here</div>'}</div></div>`; };
  const unsorted = colItems('');
  return `<div class="dboard ${unsorted.length ? 'three' : ''}">${unsorted.length ? col('', 'Not sorted yet') : ''}${col('day1', 'Needed on day 1')}${col('learn', 'Can learn in the role')}</div>`;
}

// ---- Natan 4 (shown second): prioritization — rank sections on the left, fine-tune items on the right ----
const SHORT = { 'Strategic planning & operating rhythm': 'Planning', 'Business process design & improvement': 'Process',
  'Cross-functional strategy & program management': 'Cross-functional', 'Executive operations & decision support': 'Exec ops' };
const shortName = (a) => SHORT[a] || (a.length > 18 ? a.slice(0, 17) + '…' : a);
function secOrder() {
  const as = areas(), ord = (S.natan.secOrder || []).filter((a) => as.includes(a));
  as.forEach((a) => { if (!ord.includes(a)) ord.push(a); });
  return ord;
}
let pdrag = null; // { kind: 'sec'|'item', id, target }
function vRank() {
  const secs = secOrder().filter((a) => !(pdrag && pdrag.kind === 'sec' && pdrag.id === a));
  const ord = rankOrder().filter((id) => !(pdrag && pdrag.kind === 'item' && pdrag.id === id));
  const ph = '<div class="ph"></div>', st = pdrag && pdrag.target;
  let left = '', right = '';
  secs.forEach((a, i) => {
    if (st && st.c === 'sec' && st.i === i) left += ph;
    left += `<div class="prow" data-psec="${esc(a)}" style="--c:${areaColor(a)}"><span class="pn">${i + 1}</span><span class="pt">${esc(a)}</span></div>`;
  });
  if (st && st.c === 'sec' && st.i === secs.length) left += ph;
  ord.forEach((id, i) => {
    if (st && st.c === 'list' && st.i === i) right += ph;
    const c = byId(id);
    right += `<div class="prow" data-pid="${id}" style="--c:${areaColor(c.area)}"><span class="pn">${i + 1}</span><span class="pt">${esc(c.text)}</span><span class="ptag">${esc(shortName(c.area))}</span></div>`;
  });
  if (st && st.c === 'list' && st.i === ord.length) right += ph;
  return `<div class="pboard"><div class="pcol" data-pc="sec"><h3>Sections</h3>${left}</div><div class="pcol" data-pc="list"><h3>Overall order</h3>${right}</div></div>`;
}
let pghost = null, plastY = 0;
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.prow'); if (!el || tab !== 'rank') return;
  e.preventDefault();
  pdrag = el.dataset.psec ? { kind: 'sec', id: el.dataset.psec } : { kind: 'item', id: el.dataset.pid };
  pdrag.target = { c: pdrag.kind === 'sec' ? 'sec' : 'list', i: pdrag.kind === 'sec' ? secOrder().indexOf(pdrag.id) : rankOrder().indexOf(pdrag.id) };
  const r = el.getBoundingClientRect();
  pghost = el.cloneNode(true); pghost.classList.add('pghost'); pghost.style.width = r.width + 'px';
  document.body.appendChild(pghost); pmove(e); render();
});
function pmove(e) {
  if (!pdrag) return;
  plastY = e.clientY;
  pghost.style.left = e.clientX + 'px'; pghost.style.top = e.clientY + 'px';
  const under = document.elementFromPoint(e.clientX, e.clientY), col = under && under.closest('.pcol');
  const want = pdrag.kind === 'sec' ? 'sec' : 'list';
  if (!col || col.dataset.pc !== want) return;
  const rows = [...col.querySelectorAll('.prow')];
  let i = rows.length;
  for (let k = 0; k < rows.length; k++) { const r = rows[k].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { i = k; break; } }
  if (!pdrag.target || pdrag.target.i !== i) { pdrag.target = { c: want, i }; render(); }
}
document.addEventListener('pointermove', pmove);
setInterval(() => { if (!pdrag) return; if (plastY < 70) scrollBy(0, -14); else if (plastY > innerHeight - 70) scrollBy(0, 14); }, 16);
document.addEventListener('pointerup', () => {
  if (!pdrag) return;
  const { kind, id, target } = pdrag; pdrag = null; pghost.remove(); pghost = null;
  if (kind === 'sec') {
    const secs = secOrder().filter((a) => a !== id); secs.splice(target.i, 0, id); S.natan.secOrder = secs;
    // re-sort the overall list by section rank, keeping each section's internal order
    const rank = Object.fromEntries(secs.map((a, i) => [a, i])), cur = rankOrder();
    S.natan.order = cur.map((x, i) => [x, i]).sort((x, y) => rank[byId(x[0]).area] - rank[byId(y[0]).area] || x[1] - y[1]).map((x) => x[0]);
  } else {
    const ord = rankOrder().filter((x) => x !== id); ord.splice(target.i, 0, id); S.natan.order = ord;
  }
  S.natan.ranked = true; save('natan'); render();
});

// ---- drag and drop (HTML5) for day-1 readiness and prioritization --------------------------------
let dragKind = null;
const clearMarks = () => document.querySelectorAll('.dragging, .before, .after, .hover').forEach((c) => c.classList.remove('dragging', 'before', 'after', 'hover'));
document.addEventListener('dragstart', (e) => {
  const t = e.target.closest('[data-did], [data-dcat]'); if (!t) return;
  e.stopPropagation();
  if (t.dataset.did) { dragKind = 'ditem'; dragId = t.dataset.did; }
  else if (t.dataset.dcat !== undefined) { dragKind = 'dcat'; dragId = t.dataset.dcat; }
  (dragKind === 'dcat' ? t.parentElement : t).classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId);
});
document.addEventListener('dragend', () => { dragId = null; dragKind = null; clearMarks(); });
function dropTarget(e) {
  if (dragKind === 'ditem' || dragKind === 'dcat') { const col = e.target.closest('.dcol'); return col && { el: col }; }
  return null;
}
document.addEventListener('dragover', (e) => {
  if (!dragKind) return;
  const t = dropTarget(e);
  document.querySelectorAll('.before, .after, .hover').forEach((x) => x.classList.remove('before', 'after', 'hover'));
  if (!t) return; e.preventDefault();
  t.el.classList.add(dragKind.startsWith('d') || t.end ? 'hover' : t.after ? 'after' : 'before');
});
document.addEventListener('drop', (e) => {
  if (!dragKind) return;
  const t = dropTarget(e); if (!t) return; e.preventDefault();
  if (dragKind === 'ditem' || dragKind === 'dcat') {
    const key = t.el.dataset.col;
    const from = dragKind === 'dcat' ? e.dataTransfer && document.querySelector(`.dragging`)?.closest('.dcol')?.dataset.col : null;
    const ids = dragKind === 'ditem' ? [dragId] : itemsIn(dragId).filter((c) => from == null || ((S.natan.items[c.id] || {}).dayone || '') === from).map((c) => c.id);
    ids.forEach((id) => { if (key) nItem(id).dayone = key; else delete nItem(id).dayone; });
    save('natan'); render(); return;
  }

});

// ---- Katherine: who I am (behind the star) ----------------------------------------------
function vWho() {
  let html = '', g = null;
  S.partA.forEach((c, i) => {
    if (c.group !== g) { g = c.group; html += `<h2 class="area">${esc(g)}</h2>`; }
    const r = S.katherine.a[c.id] || {};
    const text = editA
      ? `<div class="row"><textarea class="grow edit grow1" rows="1" data-atext="${i}">${esc(c.text)}</textarea><button class="small" data-adel="${i}">Remove</button></div>`
      : `<div class="text">${esc(c.text)}</div>`;
    html += `<div class="item">${text}<div class="controls"><span class="ctl"><span class="lbl">How strong is this in me</span>${seg(`katherine.a.${c.id}.strength`, r.strength, ONE_FIVE)}</span></div>
      <textarea class="grow note" data-text="katherine.a.${c.id}.note" placeholder="Evidence — the example I’d point to">${esc(r.note)}</textarea></div>`;
  });
  return `<div class="intro">★ <b>Who I am</b> — the “about you” half of the posting. How strong each is in me, and the proof point I’d use. My reference only; it doesn’t feed the fit analysis.</div>
    <div class="toolbar"><button class="small" data-toggleedita="1">${editA ? 'Done editing wording' : 'Edit wording (paste exact JD text)'}</button>${editA ? '<button class="small" data-aadd="1">+ Add item</button>' : ''}</div>${html}`;
}

// ---- Katherine: the role, as a 2×2 (x = can do, y = want to do; both stored on a 1–5 scale) ----
const placed = (id) => { const r = S.katherine.b[id] || {}; return r.can != null && r.want != null; };
const short = (t, n = 60) => t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
let roleMode = 'dots';
const itemNum = (id) => active().findIndex((c) => c.id === id) + 1;
function chip(c, where) {
  const st = statusOf(c), n = itemNum(c.id), mark = st ? '<span class="chipmark">N</span>' : '';
  if (roleMode === 'dots' && where === 'cell') return `<div class="chip dotc" data-chip="${c.id}" title="${n}. ${esc(c.text)}" style="--c:${areaColor(c.area)}">${n}</div>`;
  if (roleMode === 'dots' && where === 'list') {
    const r = S.katherine.b[c.id] || {}, pl = placed(c.id);
    return `<div class="chip listrow ${pl ? 'isplaced' : ''}" data-chip="${c.id}" title="${esc(c.text)}" style="--c:${areaColor(c.area)}"><span class="num" style="background:${areaColor(c.area)}">${n}</span><span class="lt">${esc(c.text)}${mark}</span>${pl ? `<span class="pos">${snap(r.can)}·${snap(r.want)}</span>` : ''}</div>`;
  }
  return `<div class="chip" data-chip="${c.id}" title="${esc(c.text)}" style="--c:${areaColor(c.area)}">${esc(short(c.text, 48))}${mark}</div>`;
}
const snap = (v) => Math.min(5, Math.max(1, Math.round(v)));
function vRole() {
  const items = active(), off = items.filter((c) => !placed(c.id));
  let cells = '';
  for (let want = 5; want >= 1; want--) {
    for (let can = 1; can <= 5; can++) {
      const here = items.filter((c) => placed(c.id) && snap(S.katherine.b[c.id].can) === can && snap(S.katherine.b[c.id].want) === want);
      cells += `<div class="cell ${roleMode}" data-can="${can}" data-want="${want}">${here.map((c) => chip(c, 'cell')).join('')}</div>`;
    }
  }
  const ticks = [1, 2, 3, 4, 5];
  return `<div class="toolbar quadbar legendbar"><div class="legend">${areas().map((a) => `<span class="leg"><span class="swatch" style="background:${areaColor(a)}"></span>${esc(a)}</span>`).join('')}</div>${seg('_mode', roleMode, [['dots', 'Dots'], ['cards', 'Cards']]).replace(/data-set="_mode"/g, 'data-mode="1"')}</div>
    <div class="quad-wrap">
      <div class="quad-side">${roleMode === 'dots'
        ? `<div class="dhead"><b>All parts</b><span>${off.length} to place</span></div><div class="tray" id="tray">${items.map((c) => chip(c, 'list')).join('')}</div>`
        : `<div class="dhead"><b>To place</b><span class="dcount">${off.length}</span></div><div class="tray" id="tray">${off.map((c) => chip(c, 'list')).join('') || '<div class="dempty">All placed</div>'}</div>`}</div>
      <div class="quad-main">
        <div class="yaxis"><span>Want to do →</span></div>
        <div class="yticks">${ticks.slice().reverse().map((t) => `<span>${t}</span>`).join('')}</div>
        <div class="plot" id="plot">
          ${cells}
        </div>
        <div></div><div></div><div class="xticks">${ticks.map((t) => `<span>${t}</span>`).join('')}</div>
        <div></div><div></div><div class="xaxis">Can do →</div>
      </div>
    </div>`;
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (b) { roleMode = b.dataset.val; render(); } });
document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-chip]'); const id = el && el.dataset.chip;
  document.querySelectorAll('.hl').forEach((x) => x.dataset.chip !== id && x.classList.remove('hl'));
  if (id && !drag) document.querySelectorAll(`[data-chip="${id}"]`).forEach((x) => x.classList.add('hl'));
  // hovering a dot on the grid brings its row in the list into view
  if (id && !drag && el.classList.contains('dotc')) {
    const box = document.querySelector('.quad-side'), row = box && box.querySelector(`.listrow[data-chip="${id}"]`);
    if (row) {
      // only the part of the list that's actually on screen counts as visible
      const b = box.getBoundingClientRect(), r = row.getBoundingClientRect();
      const visTop = Math.max(b.top, 0), visBottom = Math.min(b.bottom, innerHeight);
      if (r.top < visTop || r.bottom > visBottom) box.scrollBy({ top: r.top + r.height / 2 - (visTop + visBottom) / 2, behavior: 'smooth' });
    }
  }
});
// pointer-based dragging; drops snap to the 1–5 cell under the pointer
let drag = null;
const cellAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('.cell'); };
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.chip'); if (!el) return;
  e.preventDefault();
  const r = el.getBoundingClientRect();
  const ghost = el.cloneNode(true); ghost.classList.add('ghost'); ghost.classList.remove('hl');
  ghost.style.cssText = `--c:${el.style.getPropertyValue('--c')};width:${r.width}px;left:${e.clientX}px;top:${e.clientY}px;`;
  ghost.insertAdjacentHTML('beforeend', '<div class="readout"></div>');
  document.body.appendChild(ghost); el.classList.add('lifted');
  drag = { id: el.dataset.chip, ghost };
});
document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
  const cell = cellAt(e.clientX, e.clientY);
  document.querySelectorAll('.cell.hover').forEach((c) => c !== cell && c.classList.remove('hover'));
  if (cell) cell.classList.add('hover');
  drag.ghost.querySelector('.readout').textContent = cell ? `Can ${cell.dataset.can} · Want ${cell.dataset.want}` : 'Drop on the grid, or here to clear';
});
document.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const { id, ghost } = drag; drag = null; ghost.remove();
  const cell = cellAt(e.clientX, e.clientY), rec = (S.katherine.b[id] = S.katherine.b[id] || {});
  if (cell) { rec.can = Number(cell.dataset.can); rec.want = Number(cell.dataset.want); }
  else if ($('#plot')) { delete rec.can; delete rec.want; }
  save('katherine'); render();
});

// ---- Katherine: Natan's input ----------------------------------------------------------------
function changesHtml() {
  const ch = S.partB.map((c) => ({ c, st: statusOf(c) })).filter((x) => x.st);
  if (!ch.length) return '<p class="sub">No changes to the posting.</p>';
  return ch.map(({ c, st }) => `<div class="flag"><span class="t">${esc(c.text)}</span><span class="pill ${st === 'removed' ? 'neutral' : 'ok'}">${st[0].toUpperCase() + st.slice(1)}</span>
    ${st === 'edited' ? `<div class="why">Posting said: “${esc(DEFAULT_B_TEXT[c.id])}”</div>` : ''}</div>`).join('');
}
const bringLabel = (d) => d === 'day1' ? 'Day 1' : d === 'learn' ? 'Can learn' : '–';

// ---- Katherine: combined ---------------------------------------------------------------------
function analyze() {
  const ord = rankOrder(), n = ord.length, useTime = anyTime();
  return ord.map((id, i) => {
    const c = byId(id), nt = S.natan.items[id] || {}, k = S.katherine.b[id] || {}, t = effTime(id);
    const imp = n > 1 ? 1 - i / (n - 1) : 1;
    const w = useTime ? Math.min(3, Math.max(0.25, (t || 0) / (100 / n))) : 1;
    const base = { c, nt, k, t, rank: i + 1, imp, w, n };
    if (k.can == null || k.want == null) return { ...base, complete: false };
    const learn = nt.dayone === 'learn' ? 0.5 : 1;
    const canGap = ((5 - k.can) / 4) * learn, wantGap = (5 - k.want) / 4;
    return { ...base, complete: true, canGap, wantGap, score: imp * Math.max(canGap, wantGap) * w };
  });
}
function concernType(a) {
  const s = a.canGap >= 0.5, w = a.wantGap >= 0.5;
  if (s && w) return 'Can-do + want gap';
  if (s) return a.nt.dayone === 'day1' ? 'Can-do gap, needed day 1' : 'Can-do gap';
  if (w) return 'Low want';
  return 'Moderate gap';
}
function natanLine(a) {
  return `Natan: #${a.rank} of ${a.n}${a.t != null ? `, ~${r1(a.t)}% of time` : ''}${a.nt.dayone === 'day1' ? ', needed day 1' : a.nt.dayone === 'learn' ? ', can learn' : ''}.`;
}
function vCombined() {
  const rows = analyze(), done = rows.filter((r) => r.complete);
  const cell = (v) => v == null ? '<span class="dot mid">–</span>' : `<span class="dot ${v >= 4 ? 'hi' : v <= 2 ? 'lo' : 'mid'}">${snap(v)}</span>`;
  const table = `<table><thead><tr><th>Item</th><th class="n">Rank</th><th class="n">% time</th><th class="n">Day 1 / learn</th><th class="n">Can do</th><th class="n">Want</th></tr></thead><tbody>${
    rows.map((a) => `<tr><td><span class="swatch" style="background:${areaColor(a.c.area)}"></span>${esc(a.c.text)}</td><td class="n">${a.rank}</td><td class="n">${a.t == null ? '–' : r1(a.t)}</td>
      <td class="n">${bringLabel(a.nt.dayone)}</td><td class="n">${cell(a.k.can)}</td><td class="n">${cell(a.k.want)}</td></tr>`).join('')}</tbody></table>`;
  const top = done.filter((r) => r.score > 0.08).sort((a, b) => b.score - a.score).slice(0, 3);
  const flagged = !done.length ? '<p class="sub">Place items on the 2×2 to see these.</p>'
    : top.length ? `<ul class="flags">${top.map((a) => `<li><b>${esc(a.c.text)}</b> — ${concernType(a).toLowerCase()}. ${natanLine(a)} Katherine: can do ${snap(a.k.can)}, want ${snap(a.k.want)}.</li>`).join('')}</ul>`
    : '<p class="sub">Nothing stands out.</p>';
  return `<div class="card"><h3>Side by side, in Natan’s order</h3>${table}</div>
    <div class="card quiet"><h3>Top misalignments <span class="auto-tag">auto-flagged</span></h3>${flagged}
      <details class="method"><summary>How these are picked</summary><p>A formula, not judgment: items high in Natan’s order where Katherine’s can-do (counted at half if it can be learned) or want is low, weighted by share of time.</p></details></div>`;
}

// ---- events ----------------------------------------------------------------------------------
const ownerKey = (path) => path.split('.')[0];
document.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.set) { const cur = getPath(d.set); const v = isNaN(Number(d.val)) ? d.val : Number(d.val); setPath(d.set, cur === v ? undefined : v); save(ownerKey(d.set)); render(); }
  else if (d.opennote) { openNotes.add(d.opennote); render(); const ta = document.querySelector(`textarea[data-text="${d.opennote}"]`); ta && ta.focus(); }
  else if (d.remove) { byId(d.remove).removed = true; save('partB'); render(); }
  else if (d.restore) { byId(d.restore).removed = false; save('partB'); render(); }
  else if (d.revert) { byId(d.revert).text = DEFAULT_B_TEXT[d.revert]; save('partB'); render(); }
  else if (d.addto !== undefined || d.newarea) {
    const ids = S.partB.map((c) => parseInt(c.id.replace(/\D/g, '')) || 0);
    const item = { id: 'n' + (Math.max(0, ...ids) + 1), area: d.newarea ? newAreaName() : d.addto, text: '' };
    if (d.newarea) S.partB.push(item);
    else { let at = -1; S.partB.forEach((c, i) => { if (c.area === d.addto) at = i; }); S.partB.splice(at + 1, 0, item); }
    save('partB'); render();
    const inp = document.querySelector(d.newarea ? `input[data-areaname="${CSS.escape(item.area)}"]` : `textarea[data-btext="${item.id}"]`); inp && (inp.focus(), inp.select && d.newarea && inp.select());
  }
  else if (d.reeven) { itemsIn(d.reeven).forEach((c) => { delete nItem(c.id).time; }); save('natan'); refreshTime(null); }
  else if (d.toggleedita) { editA = !editA; render(); }
  else if (d.aadd) { const ids = S.partA.map((c) => parseInt(c.id.replace(/\D/g, '')) || 0); S.partA.push({ id: 'a' + (Math.max(0, ...ids) + 1), group: S.partA.length ? S.partA[S.partA.length - 1].group : 'About you', text: '' }); save('partA'); render(); }
  else if (d.adel !== undefined) { S.partA.splice(Number(d.adel), 1); save('partA'); render(); }
});
function newAreaName() { let n = 'New area', i = 2; while (allAreas().includes(n)) n = 'New area ' + i++; return n; }

document.addEventListener('input', (e) => {
  const el = e.target, d = el.dataset;
  if (el.classList.contains('grow')) autoGrow(el);
  if (d.text) { setPath(d.text, el.value); save(ownerKey(d.text)); }
  else if (d.btext) {
    const c = byId(d.btext); c.text = el.value; save('partB');
    const actions = el.parentElement.querySelector('.actions'); const st = statusOf(c);
    actions.querySelectorAll('.badge').forEach((b) => b.remove());
    if (st) actions.insertAdjacentHTML('afterbegin', `<span class="badge">${st[0].toUpperCase() + st.slice(1)}</span>`);
  }
  else if (d.areaname !== undefined) {
    const old = d.areaname, nv = el.value;
    S.partB.forEach((c) => { if (c.area === old) c.area = nv; });
    if (S.natan.areaTime[old] != null) { S.natan.areaTime[nv] = S.natan.areaTime[old]; delete S.natan.areaTime[old]; save('natan'); }
    d.areaname = nv; el.parentElement.parentElement.querySelectorAll(`[data-addto]`).forEach((b) => { if (b.dataset.addto === old) b.dataset.addto = nv; });
    save('partB');
  }
  else if (d.atime !== undefined) {
    const area = d.atime;
    if (el.value === '') delete S.natan.areaTime[area]; else S.natan.areaTime[area] = Math.max(0, Math.round(Number(el.value)));
    save('natan'); refreshTime(el);
  }
  else if (d.itime) {
    if (el.value === '') delete nItem(d.itime).time; else nItem(d.itime).time = Math.max(0, Math.round(Number(el.value)));
    el.classList.toggle('auto', el.value === '');
    save('natan'); refreshTime(el);
  }
  else if (d.atext !== undefined) { S.partA[Number(d.atext)].text = el.value; save('partA'); }
});

tab = tabs()[0][0];
load();
// whole percents only: tidy a typed decimal once the field is left
document.addEventListener('change', (e) => { const el = e.target; if ((el.dataset.itime || el.dataset.atime !== undefined) && el.value !== '') el.value = Math.round(Number(el.value)); });
// keep the 2×2's list panel inside the visible window, so scrolling it can always reach any row
function fitSide() {
  const b = document.querySelector('.quad-side'); if (!b || innerWidth <= 760) return;
  const top = Math.max(16, b.getBoundingClientRect().top);
  b.style.maxHeight = Math.max(240, innerHeight - top - 16) + 'px';
}
addEventListener('scroll', fitSide, { passive: true });
addEventListener('resize', fitSide);
new MutationObserver(fitSide).observe(document.getElementById('main'), { childList: true });
