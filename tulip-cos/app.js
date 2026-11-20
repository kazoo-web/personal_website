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
const r1 = (x) => Math.round(x * 10) / 10;
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

// ---- time model: % per area, split evenly unless items are adjusted -------------
const itemsIn = (area) => active().filter((c) => c.area === area);
const nItem = (id) => (S.natan.items[id] = S.natan.items[id] || {});
function areaAdjusted(area) { return itemsIn(area).some((c) => (S.natan.items[c.id] || {}).time != null); }
function areaTotal(area) {
  if (areaAdjusted(area)) return itemsIn(area).reduce((s, c) => s + (Number((S.natan.items[c.id] || {}).time) || 0), 0);
  return Number((S.natan.areaTime || {})[area]) || 0;
}
function effTime(id) {
  const c = byId(id); if (!c || c.removed) return null;
  if (areaAdjusted(c.area)) { const t = (S.natan.items[id] || {}).time; return t == null ? 0 : Number(t); }
  const at = (S.natan.areaTime || {})[c.area];
  return at == null || at === '' ? null : Number(at) / itemsIn(c.area).length;
}
const grandTotal = () => areas().reduce((s, a) => s + areaTotal(a), 0);
const anyTime = () => areas().some((a) => areaTotal(a) > 0);

// ---- server --------------------------------------------------------------------
async function load() {
  setStatus('Loading…');
  try {
    const r = await fetch(TABLE + '?select=key,data,updated_at', { headers: HEADERS });
    if (!r.ok) throw new Error(r.status);
    const d = Object.fromEntries((await r.json()).map((row) => [row.key, row]));
    const get = (k) => d[k] && d[k].data;
    S.partA = get('partA') || clone(DEFAULT_A);
    S.partB = get('partB') || clone(DEFAULT_B);
    S.natan = Object.assign({ items: {}, areaTime: {}, order: [], ranked: false }, get('natan') || {});
    S.natan.areaTime = S.natan.areaTime || {};
    S.katherine = Object.assign({ a: {}, b: {} }, get('katherine') || {});
    S.updated = Object.fromEntries(['partB', 'natan', 'katherine'].map((k) => [k, d[k] && d[k].updated_at]));
    setStatus('Up to date · ' + timeStr(new Date().toISOString()));
    render();
  } catch (e) { setStatus('Couldn’t load — try Refresh.'); }
}

function save(key) {
  if (key === 'partB') S.partB.forEach((c) => (c.status = statusOf(c)));
  clearTimeout(timers[key]);
  setStatus('Saving…');
  timers[key] = setTimeout(async () => {
    try {
      const now = new Date().toISOString();
      const r = await fetch(TABLE, { method: 'POST', headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ key, data: S[key], updated_at: now }) });
      setStatus(r.ok ? 'Saved · ' + timeStr(now) : 'Save failed (' + r.status + ') — edit again to retry.');
    } catch (e) { setStatus('Save failed — check your connection and edit again.'); }
  }, 700);
}

// ---- tabs ----------------------------------------------------------------------
function tabs() {
  return VIEW === 'natan'
    ? [['edit', '1 · Review the role'], ['time', '2 · Time'], ['bring', '3 · Bring in vs. learn'], ['rank', '4 · Rank']]
    : [['role', 'The role'], ['natan', 'Natan’s input'], ['combined', 'Combined']];
}
function render() {
  $('#titlebar').innerHTML = `<h1>Tulip · Chief of Staff</h1>${VIEW === 'katherine'
    ? `<button class="star ${tab === 'who' ? 'on' : ''}" data-tab="who" title="Who I am — my notes">★</button>` : ''}`;
  $('#subtitle').textContent = VIEW === 'natan' ? 'The role, in its parts. Everything saves as you go.' : 'Katherine’s workspace';
  $('#tabs').innerHTML = tabs().map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('');
  const views = { edit: vEdit, time: vTime, bring: vBring, rank: vRank, who: vWho, role: vRole, natan: vNatanInput, combined: vCombined };
  $('#main').innerHTML = views[tab]();
  document.querySelectorAll('textarea.grow').forEach(autoGrow);
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); window.scrollTo(0, 0); } });
$('#refresh').addEventListener('click', load);
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
  return `<div class="intro">The <b>what you’ll do</b> half of the posting, in parts. Make it match the job as it really is: <b>reword</b>, <b>remove</b>, or <b>add</b>. Changes are tracked.</div>
    ${html}<div class="newarea"><button class="btn" data-newarea="1">+ Add an item in a new area</button></div>`;
}

// ---- Natan 2: time ------------------------------------------------------------------
function vTime() {
  const total = grandTotal();
  const cards = areas().map((area) => {
    const adj = areaAdjusted(area), at = areaTotal(area);
    const items = itemsIn(area).map((c) => {
      const t = effTime(c.id);
      return `<div class="titem"><span>${esc(c.text)}</span><span class="pctwrap"><input class="pct sm" type="number" min="0" max="100" step="1" data-itime="${c.id}" value="${t == null ? '' : r1(t)}"><i>%</i></span></div>`;
    }).join('');
    return `<div class="tcard" style="--c:${areaColor(area)}">
      <div class="thead"><span class="tname"><span class="swatch" style="background:${areaColor(area)}"></span>${esc(area)}</span>
        <span class="pctwrap"><input class="pct" type="number" min="0" max="100" step="1" data-atime="${esc(area)}" value="${adj || (S.natan.areaTime[area] != null && S.natan.areaTime[area] !== '') ? r1(at) : ''}"><i>%</i></span></div>
      <div class="titems">${items}</div>
      <div class="tfoot">${adj ? `Adjusted by item · <button class="linkbtn" data-reeven="${esc(area)}">split evenly again</button>` : 'Split evenly across items — adjust any line to change it'}</div></div>`;
  }).join('');
  const left = r1(100 - total);
  return `<div class="intro">Roughly <b>what share of the job</b> is each area? Each area’s time is split evenly across its items; adjust a line if one item takes more. The total can’t go over 100%.</div>
    <div class="tgrid">${cards}</div>
    <div class="total" id="totalbar"><b id="tot">${r1(total)}%</b> allocated · <span id="left">${left}% left</span></div>`;
}
function clampTo(el, v, max) { if (v > max) { v = Math.max(0, r1(max)); el.value = v; flash(); } return v; }
function flash() { const t = $('#totalbar'); if (t) { t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); } }
function refreshTime(except) {
  // update computed numbers in place without re-rendering the focused input
  areas().forEach((area) => {
    const a = document.querySelector(`input[data-atime="${CSS.escape(area)}"]`);
    if (a && a !== except) a.value = areaTotal(area) ? r1(areaTotal(area)) : (S.natan.areaTime[area] ?? '');
    itemsIn(area).forEach((c) => {
      const i = document.querySelector(`input[data-itime="${c.id}"]`); const t = effTime(c.id);
      if (i && i !== except) i.value = t == null ? '' : r1(t);
    });
  });
  const total = grandTotal();
  $('#tot').textContent = r1(total) + '%'; $('#left').textContent = r1(100 - total) + '% left';
}

// ---- Natan 3: bring in vs. learn --------------------------------------------------------
function vBring() {
  const body = grouped(active(), (c) => {
    const r = S.natan.items[c.id] || {};
    return `<div class="item row2" style="--c:${areaColor(c.area)}"><div class="text">${esc(c.text)}</div>
      ${seg(`natan.items.${c.id}.dayone`, r.dayone, [['day1', 'Must bring in'], ['learn', 'Can learn']])}</div>`;
  });
  return `<div class="intro">For each part: does the person need to <b>bring it in</b> on arrival, or is it something they <b>can learn</b> in the role?</div>${body}`;
}

// ---- Natan 4: rank -----------------------------------------------------------------------
function vRank() {
  const ord = rankOrder();
  const cards = ord.map((id, i) => {
    const c = byId(id), t = effTime(id), dn = (S.natan.items[id] || {}).dayone;
    const meta = [t != null ? `~${r1(t)}% of time` : null, dn === 'day1' ? 'must bring in' : dn === 'learn' ? 'can learn' : null].filter(Boolean).join(' · ');
    return `<div class="rcard" draggable="true" data-rid="${id}" style="--c:${areaColor(c.area)}">
      <div class="rtop"><span class="rnum">${i + 1}</span><span class="rbtns">
        <button class="mini" data-mv="${id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} title="Move earlier">←</button>
        <button class="mini" data-mv="${id}" data-dir="1" ${i === ord.length - 1 ? 'disabled' : ''} title="Move later">→</button></span></div>
      <div class="rtext">${esc(c.text)}</div>
      <div class="rarea">${esc(c.area)}</div>${meta ? `<div class="rmeta">${meta}</div>` : ''}</div>`;
  }).join('');
  const legend = areas().map((a) => `<span class="leg"><span class="swatch" style="background:${areaColor(a)}"></span>${esc(a)}</span>`).join('');
  return `<div class="intro">Put these in order from <b>most</b> to <b>least important</b> to get right — drag a card, or use the arrows. Reads left to right, top to bottom. No ties.</div>
    <div class="legend">${legend}</div><div class="rgrid">${cards}</div>`;
}
function moveRank(id, toIndex) {
  const ord = rankOrder(), from = ord.indexOf(id);
  if (from < 0 || toIndex === from) return;
  ord.splice(from, 1); ord.splice(Math.max(0, Math.min(ord.length, toIndex)), 0, id);
  S.natan.order = ord; S.natan.ranked = true; save('natan'); render();
}
document.addEventListener('dragstart', (e) => { const c = e.target.closest('.rcard'); if (c) { dragId = c.dataset.rid; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); } });
document.addEventListener('dragend', () => { dragId = null; document.querySelectorAll('.rcard').forEach((c) => c.classList.remove('dragging', 'before', 'after')); });
document.addEventListener('dragover', (e) => {
  const c = e.target.closest('.rcard'); if (!c || !dragId) return; e.preventDefault();
  const r = c.getBoundingClientRect(), after = e.clientX > r.left + r.width / 2;
  document.querySelectorAll('.rcard').forEach((x) => x.classList.remove('before', 'after'));
  if (c.dataset.rid !== dragId) c.classList.add(after ? 'after' : 'before');
});
document.addEventListener('drop', (e) => {
  const c = e.target.closest('.rcard'); if (!c || !dragId) return; e.preventDefault();
  const ord = rankOrder(), r = c.getBoundingClientRect(), after = e.clientX > r.left + r.width / 2;
  let to = ord.indexOf(c.dataset.rid) + (after ? 1 : 0);
  if (ord.indexOf(dragId) < to) to -= 1;
  moveRank(dragId, to);
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

// ---- Katherine: the role -------------------------------------------------------------------
function vRole() {
  const body = grouped(active(), (c) => {
    const r = S.katherine.b[c.id] || {}, st = statusOf(c);
    return `<div class="item" style="--c:${areaColor(c.area)}"><div class="text">${esc(c.text)}${st ? `<span class="badge">${st === 'edited' ? 'Natan edited' : 'Natan added'}</span>` : ''}</div><div class="controls">
      <span class="ctl"><span class="lbl">Can do</span>${seg(`katherine.b.${c.id}.can`, r.can, ONE_FIVE)}</span>
      <span class="ctl"><span class="lbl">Want to do</span>${seg(`katherine.b.${c.id}.want`, r.want, ONE_FIVE)}</span>
    </div>${note(`katherine.b.${c.id}.note`, r.note, 'Add a note')}</div>`;
  });
  return `<div class="intro">The <b>what you’ll do</b> half, as Natan left it. How well I <b>can do</b> each today, and how much I <b>want to</b> (1–5).</div>${body}`;
}

// ---- Katherine: Natan's input ----------------------------------------------------------------
function changesHtml() {
  const ch = S.partB.map((c) => ({ c, st: statusOf(c) })).filter((x) => x.st);
  if (!ch.length) return '<p class="sub">No changes to the posting.</p>';
  return ch.map(({ c, st }) => `<div class="flag"><span class="t">${esc(c.text)}</span><span class="pill ${st === 'removed' ? 'neutral' : 'ok'}">${st[0].toUpperCase() + st.slice(1)}</span>
    ${st === 'edited' ? `<div class="why">Posting said: “${esc(DEFAULT_B_TEXT[c.id])}”</div>` : ''}</div>`).join('');
}
const bringLabel = (d) => d === 'day1' ? 'Bring in' : d === 'learn' ? 'Learn' : '–';
function vNatanInput() {
  const rows = rankOrder().map((id, i) => {
    const c = byId(id), r = S.natan.items[id] || {}, t = effTime(id);
    return `<tr><td class="n">${i + 1}</td><td><span class="swatch" style="background:${areaColor(c.area)}"></span>${esc(c.text)}</td><td class="n">${t == null ? '–' : r1(t)}</td><td class="n">${bringLabel(r.dayone)}</td></tr>`;
  }).join('');
  const at = areas().map((a) => `<div class="abar"><span><span class="swatch" style="background:${areaColor(a)}"></span>${esc(a)}</span><b>${r1(areaTotal(a))}%</b></div>`).join('');
  return `<div class="intro">${S.updated.natan ? 'Last saved ' + timeStr(S.updated.natan) + '.' : 'Nothing entered yet.'}${S.natan.ranked ? '' : ' The ranking hasn’t been adjusted yet — it’s still in the posting’s order.'}</div>
    <div class="card"><h3>Changes to the posting</h3>${changesHtml()}</div>
    <div class="card"><h3>Time by area</h3>${at}<p class="sub" style="margin-top:8px">Total ${r1(grandTotal())}%.</p></div>
    <div class="card"><h3>Priorities</h3><table><thead><tr><th class="n">Rank</th><th>Item</th><th class="n">% time</th><th class="n">Bring in / learn</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ---- Katherine: combined ---------------------------------------------------------------------
function analyze() {
  const ord = rankOrder(), n = ord.length, useTime = anyTime();
  return ord.map((id, i) => {
    const c = byId(id), nt = S.natan.items[id] || {}, k = S.katherine.b[id] || {}, t = effTime(id);
    const imp = n > 1 ? 1 - i / (n - 1) : 1;
    const w = useTime ? Math.min(3, Math.max(0.25, (t || 0) / (100 / n))) : 1;
    const base = { c, nt, k, t, rank: i + 1, imp, w, n };
    if (!(k.can && k.want)) return { ...base, complete: false };
    const learn = nt.dayone === 'learn' ? 0.5 : 1;
    const canGap = ((5 - k.can) / 4) * learn, wantGap = (5 - k.want) / 4;
    return { ...base, complete: true, canGap, wantGap, score: imp * Math.max(canGap, wantGap) * w };
  });
}
function concernType(a) {
  const s = a.canGap >= 0.5, w = a.wantGap >= 0.5;
  if (s && w) return 'Can-do + want gap';
  if (s) return a.nt.dayone === 'day1' ? 'Can-do gap, must bring in' : 'Can-do gap';
  if (w) return 'Low want';
  return 'Moderate gap';
}
function natanLine(a) {
  return `Natan: #${a.rank} of ${a.n}${a.t != null ? `, ~${r1(a.t)}% of time` : ''}${a.nt.dayone === 'day1' ? ', must bring in' : a.nt.dayone === 'learn' ? ', can learn' : ''}.`;
}
function vCombined() {
  const rows = analyze(), done = rows.filter((r) => r.complete);
  if (!done.length) return `<p class="empty">Rate the role (can do / want to do) to see the combined view.</p>`;
  const concerns = done.filter((r) => r.score > 0.08).sort((a, b) => b.score - a.score).slice(0, 7);
  const max = Math.max(...concerns.map((r) => r.score), 0.01);
  const concernHtml = concerns.length ? concerns.map((a) => `<div class="flag"><span class="t"><span class="swatch" style="background:${areaColor(a.c.area)}"></span>${esc(a.c.text)}</span><span class="pill warn">${concernType(a)}</span>
      <div class="meter"><i style="width:${Math.round((a.score / max) * 100)}%"></i></div>
      <div class="why">${natanLine(a)} Katherine: can do ${a.k.can}/5, want ${a.k.want}/5.${a.k.note ? ` Note: “${esc(a.k.note)}”` : ''}</div></div>`).join('')
    : '<p class="sub">No meaningful tensions on what’s rated so far.</p>';

  const third = Math.ceil(rows.length / 3);
  const under = done.filter((a) => a.k.can >= 4 && a.k.want >= 4 && a.rank > rows.length - third);
  const underHtml = under.length ? under.map((a) => `<div class="flag"><span class="t">${esc(a.c.text)}</span><span class="pill ok">Strength, low priority</span>
      <div class="why">${natanLine(a)} Katherine: can do ${a.k.can}/5, want ${a.k.want}/5.</div></div>`).join('') : '<p class="sub">None.</p>';

  const eq = 100 / rows.length;
  const lever = rows.filter((a) => a.rank <= third && a.t != null && a.t < eq);
  const drag = rows.filter((a) => a.rank > rows.length - third && a.t != null && a.t > eq);
  const li = (l) => l.length ? `<ul>${l.map((a) => `<li>${esc(a.c.text)} — #${a.rank}, ~${r1(a.t)}%</li>`).join('')}</ul>` : '<p class="sub">None.</p>';
  const shapeHtml = anyTime() ? `<div class="lev"><div><h4>High priority, small share of time</h4>${li(lever)}</div><div><h4>Low priority, large share of time</h4>${li(drag)}</div></div>` : '<p class="sub">Needs time estimates.</p>';

  const cell = (v) => !v ? '<span class="dot mid">–</span>' : `<span class="dot ${v >= 4 ? 'hi' : v <= 2 ? 'lo' : 'mid'}">${v}</span>`;
  const table = `<table><thead><tr><th class="n">Rank</th><th>Item</th><th class="n">% time</th><th class="n">Bring in / learn</th><th class="n">Can do</th><th class="n">Want</th></tr></thead><tbody>${
    rows.map((a) => `<tr><td class="n">${a.rank}</td><td><span class="swatch" style="background:${areaColor(a.c.area)}"></span>${esc(a.c.text)}</td><td class="n">${a.t == null ? '–' : r1(a.t)}</td>
      <td class="n">${bringLabel(a.nt.dayone)}</td><td class="n">${cell(a.k.can)}</td><td class="n">${cell(a.k.want)}</td></tr>`).join('')}</tbody></table>`;

  return `<div class="intro">Not a verdict — where the role as Natan sees it and Katherine pull in different directions. ${done.length} of ${rows.length} items rated by both.</div>
    <div class="card"><h3>Biggest areas of concern</h3><p class="sub">High in Natan’s ranking, and either a can-do gap (counted at half if it can be learned) or low want — scaled by share of time.</p>${concernHtml}</div>
    <div class="card"><h3>Changes to the posting</h3>${changesHtml()}</div>
    <div class="card"><h3>Shape of the job</h3><p class="sub">Where priority and time diverge (top/bottom third of the ranking vs. an equal share, ~${Math.round(eq)}%).</p>${shapeHtml}</div>
    <div class="card"><h3>Strengths the role doesn’t lean on</h3><p class="sub">Can do and want to do (4+), but in the bottom third of Natan’s ranking.</p>${underHtml}</div>
    <div class="card"><h3>Side by side, in Natan’s order</h3>${table}</div>
    <details class="method"><summary>How the concern score works</summary>
      <p>score = importance × max(can-do gap, want gap) × time weight. Importance comes from rank: #1 = 1, last = 0, evenly spaced. Can-do gap = (5 − can do) / 4, halved if marked “can learn”. Want gap = (5 − want) / 4. Time weight = the item’s % ÷ an equal share (100 / ${rows.length}), capped at 0.25×–3×; 1× for everything if no times are entered. Items under 0.08 aren’t flagged.</p></details>`;
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
  else if (d.reeven) { itemsIn(d.reeven).forEach((c) => { delete nItem(c.id).time; }); save('natan'); render(); }
  else if (d.mv) { const ord = rankOrder(); moveRank(d.mv, ord.indexOf(d.mv) + Number(d.dir)); }
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
    let v = el.value === '' ? null : Math.max(0, Number(el.value));
    if (v != null) v = clampTo(el, v, 100 - (grandTotal() - areaTotal(area)));
    itemsIn(area).forEach((c) => { delete nItem(c.id).time; });
    if (v == null) delete S.natan.areaTime[area]; else S.natan.areaTime[area] = v;
    save('natan'); refreshTime(el);
    const foot = el.closest('.tcard').querySelector('.tfoot'); if (foot) foot.textContent = 'Split evenly across items — adjust any line to change it';
  }
  else if (d.itime) {
    const c = byId(d.itime), area = c.area;
    if (!areaAdjusted(area)) { const ev = itemsIn(area).map((x) => [x.id, r1(effTime(x.id) || 0)]); ev.forEach(([id, t]) => { nItem(id).time = t; }); }
    const others = grandTotal() - (Number(nItem(c.id).time) || 0);
    let v = el.value === '' ? 0 : Math.max(0, Number(el.value));
    v = clampTo(el, v, 100 - others);
    nItem(c.id).time = v; S.natan.areaTime[area] = areaTotal(area);
    save('natan'); refreshTime(el);
    const foot = el.closest('.tcard').querySelector('.tfoot');
    if (foot) foot.innerHTML = `Adjusted by item · <button class="linkbtn" data-reeven="${esc(area)}">split evenly again</button>`;
  }
  else if (d.atext !== undefined) { S.partA[Number(d.atext)].text = el.value; save('partA'); }
});

tab = tabs()[0][0];
load();
