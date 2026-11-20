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

// ---- state -------------------------------------------------------------------
let S = { partA: clone(DEFAULT_A), partB: clone(DEFAULT_B), natan: { items: {}, order: [], ranked: false }, katherine: { a: {}, b: {} }, updated: {} };
let tab = null, editA = false;
const openNotes = new Set();
const timers = {};

function clone(x) { return JSON.parse(JSON.stringify(x)); }
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const setStatus = (t) => ($('#status').textContent = t);
const timeStr = (iso) => iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const active = () => S.partB.filter((c) => !c.removed);
const byId = (id) => S.partB.find((c) => c.id === id);

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

// ---- server ------------------------------------------------------------------
async function load() {
  setStatus('Loading…');
  try {
    const r = await fetch(TABLE + '?select=key,data,updated_at', { headers: HEADERS });
    if (!r.ok) throw new Error(r.status);
    const d = Object.fromEntries((await r.json()).map((row) => [row.key, row]));
    const get = (k) => d[k] && d[k].data;
    S.partA = get('partA') || clone(DEFAULT_A);
    S.partB = get('partB') || clone(DEFAULT_B);
    S.natan = Object.assign({ items: {}, order: [], ranked: false }, get('natan') || {});
    S.katherine = Object.assign({ a: {}, b: {} }, get('katherine') || {});
    S.updated = Object.fromEntries(['partB', 'natan', 'katherine'].map((k) => [k, d[k] && d[k].updated_at]));
    setStatus('Loaded ' + timeStr(new Date().toISOString()));
    if (!tab || !tabs().some(([k]) => k === tab)) tab = tabs()[0][0];
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
      setStatus(r.ok ? 'Saved ' + timeStr(now) : 'Save failed (' + r.status + ') — edit again to retry.');
    } catch (e) { setStatus('Save failed — check your connection and edit again.'); }
  }, 900);
}

// ---- tabs --------------------------------------------------------------------
function tabs() {
  return VIEW === 'natan'
    ? [['edit', '1 · Review the role'], ['time', '2 · Time & bring in vs. learn'], ['rank', '3 · Rank by importance']]
    : [['who', 'Who I am'], ['role', 'The role'], ['natan', 'Natan’s input'], ['combined', 'Combined']];
}
function render() {
  $('#subtitle').textContent = VIEW === 'natan'
    ? 'Three short steps. Everything saves automatically.'
    : 'Katherine’s workspace';
  $('#tabs').innerHTML = tabs().map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('');
  const views = { edit: vEdit, time: vTime, rank: vRank, who: vWho, role: vRole, natan: vNatanInput, combined: vCombined };
  $('#main').innerHTML = views[tab]();
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { tab = b.dataset.tab; render(); window.scrollTo(0, 0); } });
$('#refresh').addEventListener('click', load);

// ---- widgets -----------------------------------------------------------------
const ONE_FIVE = [1, 2, 3, 4, 5].map((n) => [n, n]);
function seg(path, val, opts, editable = true) {
  return `<span class="seg" aria-disabled="${!editable}">${opts.map(([v, l]) =>
    `<button ${editable ? `data-set="${path}" data-val="${v}"` : 'disabled'} class="${String(val) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</span>`;
}
function note(path, val, prompt) {
  if (!openNotes.has(path) && !val) return `<div style="margin-top:8px"><button class="notebtn" data-opennote="${path}">${prompt}</button></div>`;
  return `<textarea data-text="${path}" placeholder="${esc(prompt)}">${esc(val)}</textarea>`;
}
function grouped(list, key, fn) {
  let html = '', g = null;
  list.forEach((c, i) => {
    if (c[key] !== g) { g = c[key]; html += `<h2 class="area">${esc(g)}</h2>`; }
    html += fn(c, i);
  });
  return html;
}
// paths look like "natan.items.b3.time" or "katherine.b.b3.can"
function setPath(path, v) {
  const parts = path.split('.'); let o = S;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]] = o[parts[i]] || {};
  o[parts[parts.length - 1]] = v;
}
function getPath(path) { return path.split('.').reduce((o, k) => (o ? o[k] : undefined), S); }

// ---- Natan: 1 review the role -------------------------------------------------
function vEdit() {
  const body = grouped(S.partB, 'area', (c, i) => {
    const st = statusOf(c);
    const badge = st === 'edited' ? '<span class="badge">Edited</span>' : st === 'added' ? '<span class="badge">Added</span>' : st === 'removed' ? '<span class="badge rm">Removed</span>' : '';
    const next = S.partB[i + 1];
    const addHere = !next || next.area !== c.area ? `<button class="small" data-addto="${esc(c.area)}" style="margin:2px 0 6px">+ Add to this area</button>` : '';
    return `<div class="item ${c.removed ? 'removed' : ''}"><div class="row">
        <input class="edit grow" data-btext="${c.id}" value="${esc(c.text)}" ${c.removed ? 'disabled' : ''}>${badge}
        ${c.removed ? `<button class="small" data-restore="${c.id}">Restore</button>` : `<button class="small" data-remove="${c.id}">Remove</button>`}
        ${st === 'edited' ? `<button class="small" data-revert="${c.id}">Undo edit</button>` : ''}
      </div></div>${addHere}`;
  });
  return `<div class="intro">This is the <b>what you’ll do</b> part of the Chief of Staff posting, broken into pieces. Before rating anything, make it match the job as you actually see it: <b>reword</b> anything, <b>remove</b> what doesn’t belong, <b>add</b> what’s missing. Changes are tracked so Katherine can see what moved.</div>
    ${body}<button class="btn" data-newarea="1" style="margin-top:12px">+ Add an item in a new area</button>
    <div class="done"><button class="btn" data-goto="time">Next: time & bring in vs. learn →</button></div>`;
}

// ---- Natan: 2 time & day one --------------------------------------------------
function vTime() {
  const list = active();
  const body = grouped(list, 'area', (c) => {
    const r = S.natan.items[c.id] || {};
    return `<div class="item"><div class="text">${esc(c.text)}</div><div class="controls">
      <span class="ctl"><span class="lbl">% of time</span><input class="pct" type="number" min="0" max="100" data-num="natan.items.${c.id}.time" value="${r.time ?? ''}"></span>
      <span class="ctl">${seg(`natan.items.${c.id}.dayone`, r.dayone, [['day1', 'Must bring in'], ['learn', 'Can learn']])}</span>
    </div>${note(`natan.items.${c.id}.note`, r.note, 'Add a note — what does this look like in practice?')}</div>`;
  });
  return `<div class="intro">For each item: roughly <b>what share of the job</b> it is (aim for ~100% total), and whether the person <b>must bring it in</b> on arrival or <b>can learn</b> it in the role.</div>
    ${body}<div class="total">Time adds up to <span id="tot">${timeTotal()}</span>%</div>
    <div class="done"><button class="btn" data-goto="rank">Next: rank →</button></div>`;
}
function timeTotal() { return active().reduce((s, c) => s + (Number((S.natan.items[c.id] || {}).time) || 0), 0); }

// ---- Natan: 3 rank ------------------------------------------------------------
function vRank() {
  const ord = rankOrder();
  const rows = ord.map((id, i) => {
    const c = byId(id), r = S.natan.items[id] || {};
    const meta = [r.time != null ? `~${r.time}% of time` : null, r.dayone === 'day1' ? 'must bring in' : r.dayone === 'learn' ? 'can learn' : null].filter(Boolean).join(' · ');
    return `<div class="rank"><span class="num">${i + 1}</span><span><div>${esc(c.text)}</div>${meta ? `<div class="meta">${meta}</div>` : ''}</span>
      <span class="btns"><button class="small" data-mv="${id}" data-dir="-1" ${i === 0 ? 'disabled' : ''}>↑</button><button class="small" data-mv="${id}" data-dir="1" ${i === ord.length - 1 ? 'disabled' : ''}>↓</button></span></div>`;
  }).join('');
  return `<div class="intro">Order these from <b>most important</b> to <b>least important</b> for this role to get right. No ties — the forced choice is the useful part. This is separate from time: something can matter a lot and take little time, or the reverse.</div>
    ${rows}<div class="done"><button class="btn" data-ranked="1">${S.natan.ranked ? '✓ Ranking saved' : 'This order is right'}</button>${S.natan.ranked ? '<span>Thanks — you can keep adjusting; changes save automatically.</span>' : ''}</div>`;
}

// ---- Katherine: who I am -------------------------------------------------------
function vWho() {
  const body = grouped(S.partA, 'group', (c, i) => {
    const r = S.katherine.a[c.id] || {};
    const text = editA
      ? `<div class="row" style="margin-bottom:10px"><input class="edit grow" data-atext="${i}" value="${esc(c.text)}"><button class="small" data-adel="${i}">Remove</button></div>`
      : `<div class="text">${esc(c.text)}</div>`;
    return `<div class="item">${text}<div class="controls"><span class="ctl"><span class="lbl">How strong is this in me</span>${seg(`katherine.a.${c.id}.strength`, r.strength, ONE_FIVE)}</span></div>
      <textarea class="evidence" data-text="katherine.a.${c.id}.note" placeholder="Evidence — the example I’d point to">${esc(r.note)}</textarea></div>`;
  });
  return `<div class="intro">The <b>who you are</b> half of the posting. For each: how strong it is in me (1–5) and the proof point I’d use. This is my reference for Monday — it doesn’t feed the fit analysis.</div>
    <div class="done" style="margin:0 0 8px"><button class="small" data-toggleedita="1">${editA ? 'Done editing wording' : 'Edit wording (paste exact JD text)'}</button>${editA ? '<button class="small" data-aadd="1">+ Add item</button>' : ''}</div>${body}`;
}

// ---- Katherine: the role -------------------------------------------------------
function vRole() {
  const waiting = !S.natan.ranked ? `<div class="intro"><b>Heads up:</b> Natan hasn’t finished his ranking yet. If he rewords or removes items, ratings on those items stay attached but may need a second look.</div>` : '';
  const body = grouped(active(), 'area', (c) => {
    const r = S.katherine.b[c.id] || {}, st = statusOf(c);
    return `<div class="item"><div class="text">${esc(c.text)}${st ? `<span class="badge">${st === 'edited' ? 'Natan edited' : 'Natan added'}</span>` : ''}</div><div class="controls">
      <span class="ctl"><span class="lbl">Can do</span>${seg(`katherine.b.${c.id}.can`, r.can, ONE_FIVE)}</span>
      <span class="ctl"><span class="lbl">Want to do</span>${seg(`katherine.b.${c.id}.want`, r.want, ONE_FIVE)}</span>
    </div>${note(`katherine.b.${c.id}.note`, r.note, 'Add a note')}</div>`;
  });
  return `<div class="intro">The <b>what you’ll do</b> half, as Natan left it. For each: how well I <b>can do</b> it today and how much I <b>want to do</b> it (1–5).</div>${waiting}${body}`;
}

// ---- Katherine: Natan's input --------------------------------------------------
function changesHtml() {
  const ch = S.partB.map((c) => ({ c, st: statusOf(c) })).filter((x) => x.st);
  if (!ch.length) return '<p class="sub">No changes to the posting.</p>';
  return ch.map(({ c, st }) => `<div class="flag"><span class="t">${esc(c.text)}</span><span class="pill ${st === 'removed' ? 'neutral' : 'ok'}">${st[0].toUpperCase() + st.slice(1)}</span>
    ${st === 'edited' ? `<div class="why">Posting said: “${esc(DEFAULT_B_TEXT[c.id])}”</div>` : ''}</div>`).join('');
}
function vNatanInput() {
  const ord = rankOrder();
  const rows = ord.map((id, i) => {
    const c = byId(id), r = S.natan.items[id] || {};
    return `<tr><td class="n">${S.natan.ranked ? i + 1 : '–'}</td><td>${esc(c.text)}${r.note ? `<div class="meta" style="color:var(--muted);margin-top:4px">“${esc(r.note)}”</div>` : ''}</td><td class="n">${r.time ?? '–'}</td><td class="n">${r.dayone === 'day1' ? 'Bring in' : r.dayone === 'learn' ? 'Learn' : '–'}</td></tr>`;
  }).join('');
  return `<div class="intro">${S.updated.natan ? 'Natan last saved ' + timeStr(S.updated.natan) + '.' : 'Natan hasn’t started yet.'} ${S.natan.ranked ? '' : 'Ranking not confirmed yet.'}</div>
    <div class="card"><h3>What he changed in the posting</h3>${changesHtml()}</div>
    <div class="card"><h3>His priorities</h3><table><thead><tr><th class="n">Rank</th><th>Item</th><th class="n">% time</th><th class="n">Bring in / learn</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="sub" style="margin-top:10px">Time adds up to ${timeTotal()}%.</p></div>`;
}

// ---- Katherine: combined ---------------------------------------------------------
function analyze() {
  const ord = rankOrder(), n = ord.length;
  const anyTime = ord.some((id) => (S.natan.items[id] || {}).time != null);
  return ord.map((id, i) => {
    const c = byId(id), nt = S.natan.items[id] || {}, k = S.katherine.b[id] || {};
    const imp = n > 1 ? 1 - i / (n - 1) : 1;
    let w = 1;
    if (anyTime) w = Math.min(3, Math.max(0.25, (Number(nt.time) || 0) / (100 / n)));
    const base = { c, nt, k, rank: i + 1, imp, w, n };
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
  return `Natan: #${a.rank} of ${a.n}${a.nt.time != null ? `, ~${a.nt.time}% of time` : ''}${a.nt.dayone === 'day1' ? ', must bring in' : a.nt.dayone === 'learn' ? ', can learn' : ''}.`;
}
function vCombined() {
  if (!S.natan.ranked) return `<p class="empty">The combined view needs Natan’s ranking. He hasn’t confirmed it yet.</p>`;
  const rows = analyze(), done = rows.filter((r) => r.complete);
  if (!done.length) return `<p class="empty">Rate the role (can do / want to do) to see the combined view.</p>`;

  const concerns = done.filter((r) => r.score > 0.08).sort((a, b) => b.score - a.score).slice(0, 7);
  const max = Math.max(...concerns.map((r) => r.score), 0.01);
  const concernHtml = concerns.length ? concerns.map((a) => `<div class="flag"><span class="t">${esc(a.c.text)}</span><span class="pill warn">${concernType(a)}</span>
      <div class="meter"><i style="width:${Math.round((a.score / max) * 100)}%"></i></div>
      <div class="why">${natanLine(a)} Katherine: can do ${a.k.can}/5, want ${a.k.want}/5.${a.nt.note ? ` Natan’s note: “${esc(a.nt.note)}”` : ''}${a.k.note ? ` Katherine’s note: “${esc(a.k.note)}”` : ''}</div></div>`).join('')
    : '<p class="sub">No meaningful tensions on what’s rated so far.</p>';

  const third = Math.ceil(rows.length / 3);
  const under = done.filter((a) => a.k.can >= 4 && a.k.want >= 4 && a.rank > rows.length - third);
  const underHtml = under.length ? under.map((a) => `<div class="flag"><span class="t">${esc(a.c.text)}</span><span class="pill ok">Strength, low priority</span>
      <div class="why">${natanLine(a)} Katherine: can do ${a.k.can}/5, want ${a.k.want}/5.</div></div>`).join('') : '<p class="sub">None.</p>';

  const eq = 100 / rows.length;
  const hasTime = rows.some((a) => a.nt.time != null);
  const lever = rows.filter((a) => a.rank <= third && a.nt.time != null && a.nt.time < eq);
  const drag = rows.filter((a) => a.rank > rows.length - third && a.nt.time != null && a.nt.time > eq);
  const li = (l) => l.length ? `<ul>${l.map((a) => `<li>${esc(a.c.text)} — #${a.rank}, ~${a.nt.time}%</li>`).join('')}</ul>` : '<p class="sub">None.</p>';
  const shapeHtml = hasTime ? `<div class="lev"><div><h4>High priority, small share of time</h4>${li(lever)}</div><div><h4>Low priority, large share of time</h4>${li(drag)}</div></div>` : '<p class="sub">Needs Natan’s time estimates.</p>';

  const cell = (v) => !v ? '<span class="dot mid">–</span>' : `<span class="dot ${v >= 4 ? 'hi' : v <= 2 ? 'lo' : 'mid'}">${v}</span>`;
  const table = `<table><thead><tr><th class="n">Rank</th><th>Item</th><th class="n">% time</th><th class="n">Bring in / learn</th><th class="n">Can do</th><th class="n">Want</th></tr></thead><tbody>${
    rows.map((a) => `<tr><td class="n">${a.rank}</td><td>${esc(a.c.text)}</td><td class="n">${a.nt.time ?? '–'}</td>
      <td class="n">${a.nt.dayone === 'day1' ? 'Bring in' : a.nt.dayone === 'learn' ? 'Learn' : '–'}</td><td class="n">${cell(a.k.can)}</td><td class="n">${cell(a.k.want)}</td></tr>`).join('')}</tbody></table>`;

  return `<div class="intro">Not a verdict — where the role as Natan sees it and Katherine pull in different directions. ${done.length} of ${rows.length} items rated by both.</div>
    <div class="card"><h3>Biggest areas of concern</h3><p class="sub">High in Natan’s ranking, and either a can-do gap (counted at half if it can be learned in the role) or low want — scaled by share of time.</p>${concernHtml}</div>
    <div class="card"><h3>What Natan changed in the posting</h3>${changesHtml()}</div>
    <div class="card"><h3>Shape of the job</h3><p class="sub">Where priority and time diverge (top/bottom third of the ranking vs. an equal share of time, ~${Math.round(eq)}%).</p>${shapeHtml}</div>
    <div class="card"><h3>Strengths the role doesn’t lean on</h3><p class="sub">Katherine can do and wants to do (4+), but it’s in the bottom third of Natan’s ranking.</p>${underHtml}</div>
    <div class="card"><h3>Side by side, in Natan’s order</h3>${table}</div>
    <details class="method"><summary>How the concern score works</summary>
      <p>score = importance × max(can-do gap, want gap) × time weight. Importance comes from rank: #1 = 1, last = 0, evenly spaced. Can-do gap = (5 − can do) / 4, halved if Natan marked it “can learn”. Want gap = (5 − want) / 4. Time weight = Natan’s % ÷ an equal share (100 / ${rows.length}), capped at 0.25×–3×; 1× for everything if he entered no times. Items under 0.08 aren’t flagged.</p></details>`;
}

// ---- events ----------------------------------------------------------------------
const ownerKey = (path) => path.split('.')[0];
document.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.set) { const cur = getPath(d.set); const v = isNaN(Number(d.val)) ? d.val : Number(d.val); setPath(d.set, cur === v ? undefined : v); save(ownerKey(d.set)); render(); }
  else if (d.opennote) { openNotes.add(d.opennote); render(); const ta = document.querySelector(`textarea[data-text="${d.opennote}"]`); ta && ta.focus(); }
  else if (d.goto) { tab = d.goto; render(); window.scrollTo(0, 0); }
  else if (d.remove) { byId(d.remove).removed = true; save('partB'); render(); }
  else if (d.restore) { byId(d.restore).removed = false; save('partB'); render(); }
  else if (d.revert) { byId(d.revert).text = DEFAULT_B_TEXT[d.revert]; save('partB'); render(); }
  else if (d.addto !== undefined || d.newarea) {
    const ids = S.partB.map((c) => parseInt(c.id.replace(/\D/g, '')) || 0);
    const item = { id: 'n' + (Math.max(0, ...ids) + 1), area: d.newarea ? 'Other' : d.addto, text: '' };
    if (d.newarea) S.partB.push(item);
    else { let at = -1; S.partB.forEach((c, i) => { if (c.area === d.addto) at = i; }); S.partB.splice(at + 1, 0, item); }
    save('partB'); render();
    const inp = document.querySelector(`input[data-btext="${item.id}"]`); inp && inp.focus();
  }
  else if (d.mv) {
    const ord = rankOrder(), i = ord.indexOf(d.mv), j = i + Number(d.dir);
    if (j >= 0 && j < ord.length) { [ord[i], ord[j]] = [ord[j], ord[i]]; S.natan.order = ord; S.natan.ranked = true; save('natan'); render(); }
  }
  else if (d.ranked) { S.natan.order = rankOrder(); S.natan.ranked = true; save('natan'); render(); }
  else if (d.toggleedita) { editA = !editA; render(); }
  else if (d.aadd) { const ids = S.partA.map((c) => parseInt(c.id.replace(/\D/g, '')) || 0); S.partA.push({ id: 'a' + (Math.max(0, ...ids) + 1), group: S.partA.length ? S.partA[S.partA.length - 1].group : 'About you', text: '' }); save('partA'); render(); }
  else if (d.adel !== undefined) { S.partA.splice(Number(d.adel), 1); save('partA'); render(); }
});
document.addEventListener('input', (e) => {
  const el = e.target, d = el.dataset;
  if (d.text) { setPath(d.text, el.value); save(ownerKey(d.text)); }
  else if (d.num) { setPath(d.num, el.value === '' ? undefined : Number(el.value)); save(ownerKey(d.num)); const t = $('#tot'); if (t) t.textContent = timeTotal(); }
  else if (d.btext) {
    const c = byId(d.btext); c.text = el.value; save('partB');
    // update the badge without re-rendering (keeps cursor position)
    const row = el.closest('.row'); const st = statusOf(c);
    row.querySelectorAll('.badge').forEach((b) => b.remove());
    if (st === 'edited' || st === 'added') el.insertAdjacentHTML('afterend', `<span class="badge">${st === 'edited' ? 'Edited' : 'Added'}</span>`);
  }
  else if (d.atext !== undefined) { S.partA[Number(d.atext)].text = el.value; save('partA'); }
});

tab = tabs()[0][0];
load();
