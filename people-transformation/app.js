/* People Transformation Tracker. Data: data.json, built by site/build_site.py */
(function () {
  "use strict";
  var D, R, S, app = document.getElementById("app");

  var LEVEL = { "None": 0, "Uses AI": 1, "Builds with AI": 2,
    "Leads AI transformation - People/Talent": 3, "Leads AI transformation - company-wide": 4 };
  var COLOR = ["var(--l0)", "var(--l1)", "var(--l2)", "var(--l3)", "var(--l4)"];
  var AI_NAME = ["No AI in the role", "Uses AI", "Builds with AI",
    "Leads AI transformation – People/Talent", "Leads AI transformation – company-wide"];
  var AI_SHORT = ["No AI", "Uses AI", "Builds", "Leads – People", "Leads – company"];
  var AI_DEF = [
    "The posting doesn't ask the role to work with AI.",
    "Expected to use AI tools in its own work.",
    "Builds specific AI tools, agents, workflows or integrations inside the People function.",
    "Changes how the People/Talent function, or a broad part of it such as recruiting, works with AI: through skills and adoption, or by rebuilding its operating model around AI.",
    "Changes how the whole company, or several functions, works with AI: enablement programs, training, champions, redesigning roles."
  ];
  var GROUPS = {
    "Building & automation": ["", "People and Talent practitioners whose main output is something they build: AI agents, automations, workflows and tools that run hiring and People processes. They come from recruiting, People operations or HR tech rather than software engineering, and they usually own the whole thing, from how the process should work to the tool that runs it."],
    "Embedded engineer": ["", "Software, data and AI engineers who sit on the People or Talent team, or on an engineering team that builds for it. They write production code: integrations, internal People apps, data pipelines and AI features for HR and recruiting."],
    "Embedded product & design": ["", "Product managers and designers by profession who build internal People products, such as hiring tools, HR self-service and employee-experience platforms, and own their roadmaps."],
    "People systems": ["", "The people who run the HR stack: Workday, Ashby, Greenhouse, payroll and compensation tools. They configure modules, build integrations and reports, keep employee data clean and move the company from one system to the next. The work happens inside existing systems rather than building new ones."],
    "People analytics & research": ["", "Analysts, data scientists and researchers who study the workforce: attrition, engagement, performance, hiring funnels and whether People programs work. They turn people data into recommendations for People leaders."],
    "Strategic projects & initiatives": ["", "People team members hired to run change with a start and an end: a Workday or ServiceNow rollout, an international expansion, a restructuring, an AI adoption program. The job is the project, not a recurring program."],
    "Core People & Talent": ["", "The core of the function: recruiting, sourcing and coordination, HR business partners, people operations, total rewards, learning and development, employee relations, and recurring People programs like performance cycles and onboarding."]
  };

  var BUILDER_GROUPS = ["Building & automation", "Embedded engineer", "Embedded product & design", "People systems", "People analytics & research", "Strategic projects & initiatives"];

  /* ---------- helpers ---------- */
  function lv(r) { return LEVEL[r.ai] || 0; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function md(d) { if (!d) return ""; var p = d.split("-"); return MON[+p[1] - 1] + " " + (+p[2]); }
  function mdy(d) { var p = d.split("-"); return MON[+p[1] - 1] + " " + (+p[2]) + ", " + p[0]; }
  function n(x) { return Number(x).toLocaleString("en-US"); }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function slug(s) { return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
  function k(v) { return "$" + Math.round(v / 1000) + "k"; }
  function pay(c) { return !c ? "" : (c[1] && c[1] !== c[0] ? k(c[0]) + "–" + k(c[1]) : k(c[0])); }
  function tally(list, f) { var m = {}; list.forEach(function (r) { [].concat(f(r) || []).forEach(function (x) { if (x) m[x] = (m[x] || 0) + 1; }); }); return m; }
  function top(m, n_) { return Object.keys(m).map(function (x) { return [x, m[x]]; }).sort(function (a, b) { return b[1] - a[1] || (a[0] > b[0] ? 1 : -1); }).slice(0, n_); }
  function isNew(r) { return r.first_seen > S.first_day; }
  function src(extra) { return '<p class="src">Source: public job boards of ' + n(S.companies_tracked) + ' US startups and growth companies' + (extra ? ". " + extra : ".") + '</p>'; }
  function posted(d) { var y = S.as_of.slice(0, 4); return d.slice(0, 4) === y ? md(d) : mdy(d); }
  var FWD = function (r) { return lv(r) >= 2; };

  /* ---------- job card (the core visual) ---------- */
  function jobCard(r) {
    var l = lv(r), tags = [];
    tags.push('<span class="dot" style="background:' + COLOR[Math.max(l, 1)] + '"></span><span>' + esc(r.group) + '</span>');
    if (l > 0) tags.push('<span class="sep">·</span><span class="ai">' + esc(AI_NAME[l]) + '</span>');
    if (r.code === "yes") tags.push('<span class="sep">·</span><span class="mono">writes code</span>');
    var rep = r.reports_to || (r.reports_into && r.reports_into !== "Unknown" ? r.reports_into : "");
    var repHtml = rep && r.reports_basis !== "not_stated" ? 'Reports to <span class="' + (r.reports_basis === "inferred" ? "inferred" : "") + '">' + esc(rep) +
      (r.reports_basis === "inferred" ? " inferred" : "") + '</span>' : "";
    var stack = r.langs.map(function (t) { return '<li class="tag lang">' + esc(t) + '</li>'; })
      .concat(r.tools.map(function (t) { var dt = (r.tool_detail || {})[t]; return '<li class="tag">' + esc(t) + (dt && dt.length ? '<span class="sub">: ' + esc(dt.join(", ")) + '</span>' : "") + '</li>'; })).join("");
    return '<article class="card job">' +
      '<h3>' + esc(r.title) + '</h3>' +
      '<div class="co"><b>' + esc(r.company) + '</b>' + (r.location ? ' · ' + esc(r.location) : "") + '</div>' +
      '<div class="tags">' + tags.join("") + '</div>' +
      (r.comp ? '<div class="pay">' + pay(r.comp) + '</div>' : '<div class="pay nopay">Pay not posted</div>') +
      (repHtml ? '<div class="mid"><span>' + repHtml + '</span></div>' : "") +
      (stack ? '<ul class="tags-list" aria-label="Languages and tools">' + stack + '</ul>' : "") +
      '<div class="bottom"><span>' + (r.posted ? "Posted " + posted(r.posted) : "") + '</span>' +
      '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">Original posting ↗</a></div></article>';
  }
  function jobList(el, rows, step) {
    var shown = 0; step = step || 20;
    if (!rows.length) { el.innerHTML = '<p class="muted">No jobs match. Clear a filter to see more.</p>'; return; }
    el.innerHTML = '<div class="grid2 jl"></div><div class="more"></div>';
    function more() {
      el.querySelector(".jl").insertAdjacentHTML("beforeend", rows.slice(shown, shown + step).map(jobCard).join(""));
      shown += step;
      var m = el.querySelector(".more");
      m.innerHTML = shown < rows.length ? '<button class="btn" type="button">Show more jobs (' + n(rows.length - shown) + ' left)</button>' : "";
      if (m.firstChild) m.firstChild.onclick = more;
    }
    more();
  }

  /* ---------- bars ---------- */
  function basisBars(rows, cats, getCat, small) {
    // stated (solid) / inferred (hatched) share of all rows, one bar per category, plus "Not stated"
    var tot = rows.length, out = cats.map(function (c) {
      var st = rows.filter(function (r) { return getCat(r) === c && r._b === "stated"; }).length;
      var inf = rows.filter(function (r) { return getCat(r) === c && r._b === "inferred"; }).length;
      return [c, st, inf]; }).filter(function (x) { return x[1] + x[2] > 0; }).sort(function (a, b) { return (b[1] + b[2]) - (a[1] + a[2]); });
    var ns = rows.filter(function (r) { return r._b === "not_stated"; }).length;
    var max = Math.max.apply(null, out.map(function (x) { return x[1] + x[2]; }).concat([ns, 1]));
    function row(lab, parts, val) {
      return '<div class="hbar' + (small ? " small" : "") + '"><span class="lab">' + esc(lab) + '</span><span class="trk">' + parts + '</span><span class="val">' + val + '%</span></div>'; }
    return '<div class="hbars">' + out.map(function (x) {
      return row(x[0], '<i class="solid" style="width:' + 100 * x[1] / max + '%"></i><i class="hatched" style="width:' + 100 * x[2] / max + '%"></i>', pct(x[1] + x[2], tot)); }).join("") +
      (ns ? row("Not stated", '<i class="none" style="width:' + 100 * ns / max + '%"></i>', pct(ns, tot)) : "") + '</div>';
  }
  var LEGEND = '<ul class="legend"><li><i class="solid"></i>Stated in posting</li><li><i class="hatched"></i>Inferred</li><li><i class="none"></i>Not stated</li></ul>';

  /* ---------- Home ---------- */
  function home() {
    var c = [0, 0, 0, 0, 0]; R.forEach(function (r) { c[lv(r)]++; });
    var ai = R.length - c[0];
    var rows = [[AI_NAME[4], c[4]], [AI_NAME[3], c[3]], [AI_NAME[2], c[2]], [AI_NAME[1], c[1]]];
    var max = Math.max.apply(null, rows.map(function (x) { return x[1]; }));
    app.innerHTML = '<section class="hero"><h1>People work is being <span>rebuilt.</span></h1>' +
      '<p>Builders, automators and AI leads are showing up inside People and Talent teams. This tracks every one, from the job boards of ' + n(S.companies_tracked) + ' startups and growth companies.</p></section>' +
      '<section class="statblock"><div class="bigstat"><b>' + pct(ai, R.length) + '%</b><span>of open People and Talent roles work with AI.</span></div>' +
      '<div class="hbars">' + rows.map(function (x, i) {
        return '<div class="hbar"><span class="lab">' + esc(x[0]) + '</span><span class="trk"><i style="width:' + (100 * x[1] / max) + '%;background:' + COLOR[4 - i] + '"></i></span><span class="val">' + (x[1] && pct(x[1], R.length) < 1 ? "<1" : pct(x[1], R.length)) + '%</span></div>'; }).join("") +
      '</div><div class="foot-row"><span class="src" style="margin:0">' + n(R.length) + ' open roles · US</span><a href="#roles">See the roles ↗</a></div></section>';
  }

  /* ---------- Jobs ---------- */
  var METROS = [["Remote", /remote/i], ["San Francisco Bay Area", /san francisco|\bsf\b|bay area|palo alto|menlo park|mountain view|san mateo|oakland|san jose|sunnyvale|redwood city|south san francisco/i],
    ["New York", /new york|\bnyc\b|brooklyn/i], ["Seattle", /seattle|bellevue|redmond/i], ["Los Angeles", /los angeles|\bla\b|santa monica|el segundo|costa mesa|irvine/i],
    ["Boston", /boston|cambridge/i], ["Austin", /austin/i], ["Washington, DC", /washington|\bdc\b|arlington|reston/i], ["Chicago", /chicago/i], ["Denver", /denver|boulder/i]];
  function toolPicker(counts, st, onChange) {
    var inp = document.getElementById("tp"), list = document.getElementById("tplist"), chips = document.getElementById("tpchips"), act = -1, opts = [];
    function renderChips() {
      chips.innerHTML = st.tools.map(function (t, i) { return '<span class="tchip">' + esc(t) + '<button type="button" data-i="' + i + '" aria-label="Remove ' + esc(t) + '">×</button></span>'; }).join("");
      chips.querySelectorAll("button").forEach(function (b) { b.onclick = function () { st.tools.splice(+b.dataset.i, 1); renderChips(); onChange(); inp.focus(); }; });
      inp.placeholder = st.tools.length ? "Add another" : "Filter by tools and languages, e.g. Workday, SQL, Claude";
    }
    function close() { list.hidden = true; inp.setAttribute("aria-expanded", "false"); act = -1; }
    function open() {
      var q = inp.value.toLowerCase().trim();
      opts = counts.filter(function (x) { return st.tools.indexOf(x[0]) < 0 && (!q || x[0].toLowerCase().indexOf(q) >= 0); })
        .sort(function (a, b) { var as = a[0].toLowerCase().indexOf(q) === 0, bs = b[0].toLowerCase().indexOf(q) === 0; return (bs - as) || (b[1] - a[1]); }).slice(0, 8);
      if (!opts.length) { list.innerHTML = '<li class="none">Nothing matches “' + esc(inp.value) + '”</li>'; }
      else list.innerHTML = opts.map(function (x, i) { return '<li role="option" id="tpo' + i + '" data-i="' + i + '"' + (i === act ? ' aria-selected="true"' : "") + '><span>' + esc(x[0]) + ' <span class="kind">' + x[2].toLowerCase() + '</span></span><span class="mono">' + x[1] + '</span></li>'; }).join("");
      list.hidden = false; inp.setAttribute("aria-expanded", "true");
      if (act >= 0) inp.setAttribute("aria-activedescendant", "tpo" + act); else inp.removeAttribute("aria-activedescendant");
      list.querySelectorAll("li[role=option]").forEach(function (li) { li.onmousedown = function (e) { e.preventDefault(); add(opts[+li.dataset.i][0]); }; });
    }
    function add(t) { if (st.tools.indexOf(t) < 0) st.tools.push(t); inp.value = ""; act = -1; renderChips(); onChange(); open(); }
    inp.oninput = function () { act = -1; open(); };
    inp.onfocus = open;
    inp.onblur = function () { setTimeout(close, 100); };
    inp.onkeydown = function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); act = Math.min(act + 1, opts.length - 1); open(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); act = Math.max(act - 1, 0); open(); }
      else if (e.key === "Enter") { e.preventDefault(); var pick = act >= 0 ? opts[act] : opts[0]; if (pick && inp.value.trim() || act >= 0) add(pick[0]); }
      else if (e.key === "Escape") { close(); }
      else if (e.key === "Backspace" && !inp.value && st.tools.length) { st.tools.pop(); renderChips(); onChange(); }
    };
    renderChips();
  }
  function jobs() {
    var st = { fwd: false, group: "", q: "", metro: "", pay: "", tools: [] };
    var toolCounts = top(tally(R, function (r) { return r.tools; }), 100000).map(function (x) { return [x[0], x[1], "Tool"]; })
      .concat(top(tally(R, function (r) { return r.langs; }), 1000).map(function (x) { return [x[0], x[1], "Language"]; }));
    function sel(id, label, opts) { return '<label for="' + id + '" style="position:absolute;left:-9999px">' + label + '</label><select id="' + id + '"><option value="">' + label + '</option>' +
      opts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join("") + '</select>'; }
    app.innerHTML = '<div class="page-head"><h1>New jobs</h1></div>' +
      '<div class="controls"><label for="jq" style="position:absolute;left:-9999px">Search jobs</label><input id="jq" type="search" placeholder="Search title, company, location, tool">' +
      '<button class="pill" type="button" id="fwd" aria-pressed="false">Builds with AI</button></div>' +
      '<div class="controls filters2">' +
      sel("grp", "Every kind of role", D.group_order.map(function (g) { return [g, g]; })) +
      sel("metro", "Anywhere", METROS.map(function (m) { return [m[0], m[0]]; })) +
      sel("pay", "Any pay", [["posted", "Pay posted"], ["150", "$150k+"], ["200", "$200k+"], ["250", "$250k+"]]) +
      '</div><div class="toolpick"><div class="tp-box"><span id="tpchips"></span>' +
      '<input id="tp" type="text" role="combobox" aria-expanded="false" aria-controls="tplist" aria-autocomplete="list" autocomplete="off" placeholder="Filter by tools and languages, e.g. Workday, SQL, Claude"></div>' +
      '<ul id="tplist" role="listbox" hidden></ul></div>' +
      '<p class="count"></p><div id="jobs"></div>';
    function mid(r) { return r.comp ? (r.comp[0] + (r.comp[1] || r.comp[0])) / 2 : 0; }
    function draw() {
      var q = st.q.toLowerCase().trim(), m = METROS.filter(function (x) { return x[0] === st.metro; })[0];
      var rows = R.filter(function (r) {
        if (st.fwd && lv(r) < 2) return false;
        if (st.group && r.group !== st.group) return false;
        if (m && !m[1].test(r.location || "")) return false;
        if (st.pay === "posted" && !r.comp) return false;
        if (st.pay && st.pay !== "posted" && mid(r) < +st.pay * 1000) return false;
        if (st.tools.length && !st.tools.some(function (t) { return r.tools.indexOf(t) >= 0 || r.langs.indexOf(t) >= 0; })) return false;
        if (q) { var h = (r.title + " " + r.company + " " + (r.location || "") + " " + r.tools.join(" ") + " " + r.langs.join(" ") + " " + r.summary + " " + r.group).toLowerCase();
          if (!q.split(/\s+/).every(function (w) { return h.indexOf(w) >= 0; })) return false; }
        return true; });
      var nw = rows.filter(isNew).length;
      app.querySelector(".count").textContent = n(rows.length) + " open · " + n(nw) + " new since tracking began · newest first";
      jobList(document.getElementById("jobs"), rows);
    }
    document.getElementById("fwd").onclick = function () { st.fwd = !st.fwd; this.setAttribute("aria-pressed", st.fwd); draw(); };
    toolPicker(toolCounts, st, draw);
    [["grp", "group"], ["metro", "metro"], ["pay", "pay"]].forEach(function (p) {
      document.getElementById(p[0]).onchange = function () { st[p[1]] = this.value; draw(); }; });
    var t; document.getElementById("jq").oninput = function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value; draw(); }, 150); };
    draw();
  }

  /* ---------- Roles ---------- */
  var ROLE_ORDER = ["Building & automation", "People systems", "People analytics & research", "Strategic projects & initiatives",
    "Embedded engineer", "Embedded product & design", "Core People & Talent"];
  function realTitles(rows, k_) {
    var seen = {}, out = [];
    top(tally(rows, function (r) { return r.title; }), 40).forEach(function (x) {
      var key = x[0].toLowerCase().replace(/^(senior|sr\.?|staff|lead|principal)\s+/, "").replace(/\s*[\(,\-–|].*$/, "");
      var shown = x[0].replace(/\s*\(.*\)$/, ""); if (!seen[key] && !seen[shown] && out.length < k_) { seen[key] = 1; seen[shown] = 1; out.push(shown); } });
    return out;
  }
  var SHORT = {
    "Building & automation": "People practitioners who build the tools, automations and agents they run.",
    "People systems": "Run and configure the HR stack: Workday, the ATS, payroll and comp tools.",
    "People analytics & research": "Study the workforce with data and turn it into decisions.",
    "Strategic projects & initiatives": "Run change with an end date: rollouts, expansions, restructurings, AI adoption.",
    "Embedded engineer": "Engineers who write production code for People and Talent.",
    "Embedded product & design": "Product managers and designers building internal People products.",
    "Core People & Talent": "Recruiting, HR partners, people ops, total rewards and programs."
  };
  function roles() {
    app.innerHTML = '<h1>Roles</h1><div class="grid2">' + ROLE_ORDER.map(function (g) {
      var rows = R.filter(function (r) { return r.group === g; }), nw = rows.filter(isNew).length;
      return '<a class="card qc" href="#roles/' + slug(g) + '"><div class="num">' + n(rows.length) + '<small>open' + (nw ? ' +' + nw + ' new' : "") + '</small></div>' +
        '<div><h3>' + esc(g) + '</h3><p>' + esc(SHORT[g]) + '</p></div></a>'; }).join("") + '</div>';
  }
  function category(key) {
    var title, def, rows;
    if (key === "all") { title = "Every role"; def = "Every open People and Talent role we track, searchable."; rows = R; }
    else if (key.indexOf("ai-") === 0) { var l = +key.slice(3); title = AI_NAME[l]; def = AI_DEF[l]; rows = R.filter(function (r) { return lv(r) === l; }); }
    else { var g = D.group_order.filter(function (x) { return slug(x) === key; })[0]; if (!g) return roles();
      title = g; def = GROUPS[g][1]; rows = R.filter(function (r) { return r.group === g; }); }
    rows = rows.slice().sort(function (a, b) { return lv(b) - lv(a) || (b.first_seen > a.first_seen ? 1 : -1); });
    var titles = top(tally(rows, function (r) { return r.title; }), 12);
    app.innerHTML = '<a class="back" href="#roles">← All roles</a><div class="cat-head"><h1>' + esc(title) + '</h1><p>' + esc(def) + '</p></div>' +
      '<p class="count">' + n(rows.length) + ' open</p>' +
      (key.indexOf("ai-") ? '<h3 style="margin:32px 0 8px">Titles in this category</h3><p class="titles big">' + titles.map(function (x) { return esc(x[0]) + (x[1] > 1 ? ' <span class="mono muted">×' + x[1] + '</span>' : ""); }).join('<span class="sep"> · </span>') + '</p>' : "") +
      '<div class="controls" style="margin-top:32px"><label for="q" style="position:absolute;left:-9999px">Search</label><input id="q" type="search" placeholder="Search title, company, tool"></div><div id="jobs"></div>';
    function draw(q) {
      q = (q || "").toLowerCase().trim();
      var rs = !q ? rows : rows.filter(function (r) { var h = (r.title + " " + r.company + " " + r.tools.join(" ") + " " + r.langs.join(" ") + " " + r.summary).toLowerCase();
        return q.split(/\s+/).every(function (w) { return h.indexOf(w) >= 0; }); });
      jobList(document.getElementById("jobs"), rs);
    }
    var t; document.getElementById("q").oninput = function (e) { clearTimeout(t); t = setTimeout(function () { draw(e.target.value); }, 150); };
    draw("");
  }

  /* ---------- Insights ---------- */
  function stack(rows) {
    var c = [0, 0, 0, 0, 0]; rows.forEach(function (r) { c[lv(r)]++; });
    return [4, 3, 2, 1, 0].map(function (l) { return '<i style="width:' + (rows.length ? 100 * c[l] / rows.length : 0) + '%;background:' + COLOR[l] + '"></i>'; }).join("");
  }
  var AI_KEY = '<ul class="legend">' + [4, 3, 2, 1, 0].map(function (l) { return '<li><i style="background:' + COLOR[l] + '"></i>' + esc(AI_SHORT[l]) + '</li>'; }).join("") + '</ul>';
  function insights() {
    function byG(g) { return R.filter(function (r) { return r.group === g; }); }
    function anyAI(rows) { return rows.filter(function (r) { return lv(r) > 0; }).length; }
    function hb(items, max, fmt) {
      return '<div class="hbars">' + items.map(function (x) { return '<div class="hbar small"><span class="lab">' + esc(x[0]) + '</span><span class="trk"><i class="solid" style="width:' + (100 * x[1] / max) + '%"></i></span><span class="val">' + (fmt ? fmt(x) : x[1]) + '</span></div>'; }).join("") + '</div>'; }
    // 1. AI mix by kind of role
    var order = ROLE_ORDER.slice().sort(function (a, b) {
      var A = byG(a), B = byG(b); return B.filter(FWD).length / B.length - A.filter(FWD).length / A.length; });
    var ba = byG("Building & automation");
    var mixChart = '<div class="hbars">' + order.map(function (g) { var rs = byG(g);
      return '<div class="hbar small"><span class="lab">' + esc(g) + '</span><span class="trk">' + stack(rs) + '</span><span class="val">' + rs.length + '</span></div>'; }).join("") + '</div>' + AI_KEY;
    // 2. People systems
    var ps = byG("People systems"), psTools = top(tally(ps, function (r) { return r.tools; }), 5);
    var psWd = ps.filter(function (r) { return r.tools.indexOf("Workday") >= 0; }).length;
    var INTEG = ["EIB", "Core Connectors", "Studio", "Extend", "APIs", "Integrations"];
    var psInteg = ps.filter(function (r) { return ((r.tool_detail || {}).Workday || []).some(function (x) { return INTEG.indexOf(x) >= 0; }); }).length;
    var allAI = pct(R.filter(function (r) { return lv(r) > 0; }).length, R.length);
    // 3. People analytics
    var pa = byG("People analytics & research"), paTools = top(tally(pa, function (r) { return r.langs; }), 5);
    // 4. Strategic projects: what the projects are
    var sp = byG("Strategic projects & initiatives");
    var THEMES = [["People systems rollouts", /workday|servicenow|hris|system|platform|tool|implementation|go-live/i],
      ["AI adoption", /\bai\b|claude|automation/i], ["Expansion and org change", /expansion|international|location|restructur|org change|reorg|site/i]];
    var themes = THEMES.map(function (t) { return [t[0], sp.filter(function (r) { return t[1].test(r.title + " " + r.summary); }).length]; });
    // 5. Inside the core
    var core = byG("Core People & Talent"), SUB = { recruiting: "Recruiting", people_operations: "People operations", hrbp: "HR business partners",
      recruiting_coordination: "Recruiting coordination", total_rewards: "Total rewards", sourcing: "Sourcing", recruiting_operations: "Recruiting operations",
      learning_development: "Learning & development", employee_relations: "Employee relations" };
    var subs = Object.keys(SUB).map(function (s) { var rs = core.filter(function (r) { return r.sub === s; }); return [SUB[s], pct(anyAI(rs), rs.length), rs.length]; })
      .filter(function (x) { return x[2] >= 10; }).sort(function (a, b) { return b[1] - a[1]; });
    // 6. Tools in AI-forward roles
    var fwd = R.filter(FWD), tools = top(tally(fwd, function (r) { return r.tools; }), 6);

    var entries = [
      ["People systems work is still Workday work.",
        psWd + " of " + ps.length + " People systems roles name Workday; the next most-named tool, " + (psTools[1] ? psTools[1][0] + ", appears in " + psTools[1][1] : "") + ". " + psInteg + " of the " + psWd + " Workday roles ask for its integration tools (EIB, Core Connectors, Studio): hands-on technical Workday work, not just administration. " + pct(anyAI(ps), ps.length) + "% mention AI, above the " + allAI + "% across all roles.",
        hb(psTools, psTools.length ? psTools[0][1] : 1, function (x) { return x[1] + "/" + ps.length; })],
      ["People analytics runs on R, Python and SQL. Few roles build with AI.",
        paTools.map(function (x) { return x[0]; }).join(", ") + " are the languages People analytics and research roles ask for; " + pct(anyAI(pa), pa.length) + "% of these roles mention AI, and " + pa.filter(FWD).length + " of " + pa.length + " build with it or lead it.",
        hb(paTools, paTools.length ? paTools[0][1] : 1, function (x) { return x[1] + "/" + pa.length; })],
      ["Strategic projects split between systems rollouts and AI adoption.",
        "Read the " + sp.length + " project roles and the projects are a Workday or ServiceNow go-live, a new talent tool, an AI adoption push, or an expansion. A role can cover more than one.",
        hb(themes, sp.length, function (x) { return x[1] + "/" + sp.length; })],
      ["Inside the core, sourcing is where AI shows up most.",
        "Among core People and Talent roles, sourcers are the most likely to be asked to work with AI; HR business partners and coordinators the least.",
        hb(subs, 100, function (x) { return x[1] + "%"; })],
      [esc(tools.length ? tools[0][0] : "") + " is the tool AI-forward roles name most.",
        "The systems of record anchor the AI work: " + tools.slice(0, 3).map(function (x) { return x[0]; }).join(", ") + " lead the tools named in roles that build with AI or lead it.",
        hb(tools, tools.length ? tools[0][1] : 1, function (x) { return pct(x[1], fwd.length) + "%"; })]
    ];
    // When open roles were posted
    var MONS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var lastM = S.as_of.slice(0, 7), months = [];
    for (var i = 5; i >= 0; i--) { var dt = new Date(+lastM.slice(0, 4), +lastM.slice(5, 7) - 1 - i, 1); months.push(dt.getFullYear() + "-" + ("0" + (dt.getMonth() + 1)).slice(-2)); }
    var buckets = [["Earlier", function (m) { return m < months[0]; }]].concat(months.map(function (m) { return [MONS[+m.slice(5) - 1], function (x) { return x === m; }]; }));
    var tb = buckets.map(function (b) { var rs = R.filter(function (r) { return r.posted && b[1](r.posted.slice(0, 7)); });
      return [b[0], rs.length, pct(rs.filter(function (r) { return lv(r) > 0; }).length, rs.length)]; });
    var sortedPosted = R.map(function (r) { return r.posted; }).filter(Boolean).sort(), medPosted = sortedPosted[sortedPosted.length >> 1];
    var medDays = Math.round((new Date(S.as_of) - new Date(medPosted)) / 864e5);
    var tmax = Math.max.apply(null, tb.map(function (x) { return x[1]; }));
    var recent = tb.slice(1).filter(function (x) { return x[1] >= 30; }), aiLo = Math.min.apply(null, recent.map(function (x) { return x[2]; })), aiHi = Math.max.apply(null, recent.map(function (x) { return x[2]; }));
    entries.push(["Half of today's open roles were posted in the last " + (medDays <= 70 ? Math.round(medDays / 7) + " weeks" : Math.round(medDays / 30) + " months") + ".",
      "Each bar counts the roles open now by the month they were first posted; the latest month is still in progress. Older roles have mostly been filled or closed, so the bars rise toward the present whether or not hiring is growing; growth will show once the tracker has months of its own history. What already holds: the share that works with AI stays between " + aiLo + "% and " + aiHi + "% across recent months.",
      '<div class="vbars tall">' + tb.map(function (x, i) { return '<div><span>' + x[1] + '</span><i style="height:' + Math.max(2, 100 * x[1] / tmax) + '%;background:' + (i === tb.length - 1 ? "var(--rust)" : "var(--l1)") + '"></i><span>' + x[0] + '</span><span class="ai-share">' + (x[1] ? x[2] + "% AI" : "") + '</span></div>'; }).join("") + '</div>', true]);
    // Open roles by kind of role, by month posted
    var SIX = ["Building & automation", "People systems", "People analytics & research", "Strategic projects & initiatives", "Embedded engineer", "Embedded product & design"];
    var cutoff = months[months.length - 2];
    var gstats = SIX.map(function (g) {
      var rs = R.filter(function (r) { return r.group === g && r.posted; });
      return { g: g, n: rs.length, recent: rs.filter(function (r) { return r.posted.slice(0, 7) >= cutoff; }).length,
        bars: buckets.map(function (b) { return rs.filter(function (r) { return b[1](r.posted.slice(0, 7)); }).length; }) }; });
    var coreR = R.filter(function (r) { return r.group === "Core People & Talent" && r.posted; }),
        coreRecent = pct(coreR.filter(function (r) { return r.posted.slice(0, 7) >= cutoff; }).length, coreR.length);
    var lead = gstats.slice().sort(function (a, b) { return b.recent / b.n - a.recent / a.n; })[0];
    var gmax = Math.max.apply(null, gstats.map(function (x) { return Math.max.apply(null, x.bars); }));
    entries.push([esc(lead.g) + " roles skew the most recent: " + lead.recent + " of " + lead.n + " were posted in the last two months.",
      "Across core People and Talent roles it's " + coreRecent + "%. Each row counts the roles open now by the month they were posted. The numbers are small, so read the rows as early signals, and the same caveat holds as above: older roles have closed, so every row leans recent.",
      '<div class="multiples">' + gstats.map(function (x) {
        return '<div class="mrow"><span class="mlab">' + esc(x.g) + '</span><span class="mbars">' + x.bars.map(function (v, i) {
          return '<i title="' + buckets[i][0] + ': ' + v + '" style="height:' + (v ? Math.max(8, 100 * v / gmax) : 0) + '%;background:' + (i === x.bars.length - 1 ? "var(--rust)" : "var(--l1)") + '"></i>'; }).join("") +
          '</span><span class="mono mn">' + x.n + '</span></div>'; }).join("") +
        '<div class="mrow mlegend"><span class="mlab"></span><span class="mbars">' + buckets.map(function (b) { return '<em>' + (b[0] === "Earlier" ? "Pre" : b[0]) + '</em>'; }).join("") + '</span><span class="mn"></span></div></div>', true]);
    app.innerHTML = '<h1>Insights</h1>' + entries.map(function (e) {
      return '<article class="entry' + (e[3] ? " wide" : "") + '"><div class="when">First read</div><div><h2>' + e[0] + '</h2><p>' + esc(e[1]) + '</p></div><div class="card">' + e[2] + '</div></article>'; }).join("") +
      src("Week-over-week reports start once there is more history.");
  }

  /* ---------- Data ---------- */
  function data() {
    var BUILDG = ["Embedded engineer", "Embedded product & design", "Building & automation"];
    var TECH = ["IT", "Data/Analytics", "Product", "Security"];
    var recruiting = /recruit|sourcing|coordination/;
    var nAI = R.filter(function (r) { return lv(r) > 0; }).length;
    var nAdopt = R.filter(function (r) { return lv(r) >= 3; }).length;
    var nBuild = R.filter(function (r) { return lv(r) === 2 || BUILDG.indexOf(r.group) >= 0; }).length;
    var nCode = R.filter(function (r) { return r.code === "yes"; }).length;
    var nTech = R.filter(function (r) { return r.works_with.some(function (w) { return TECH.indexOf(w) >= 0 || (w === "Engineering" && !recruiting.test(r.sub)); }); }).length;
    function byG(g) { return R.filter(function (r) { return r.group === g; }); }
    function splitBars(test, title, sub) {
      var rows = ROLE_ORDER.map(function (g) { var rs = byG(g);
        var st = rs.filter(function (r) { return test(r) && r._b(r) === "stated"; }).length, inf = rs.filter(function (r) { return test(r) && r._b(r) !== "stated"; }).length;
        return [g, st, inf, rs.length]; });
      return '<div class="card dcard"><h2>' + title + '</h2><p class="muted">' + sub + '</p><div class="hbars">' + rows.map(function (x) {
        return '<div class="hbar small"><span class="lab">' + esc(x[0]) + '</span><span class="trk"><i class="solid" style="width:' + 100 * x[1] / x[3] + '%"></i><i class="hatched" style="width:' + 100 * x[2] / x[3] + '%"></i></span><span class="val">' + pct(x[1] + x[2], x[3]) + '%</span></div>'; }).join("") + '</div></div>';
    }
    var code = function (r) { return r.code === "yes"; }; code._ = 1;
    R.forEach(function (r) { r._b = function (x) { return x.__b; }; });
    function withBasis(field) { R.forEach(function (r) { r.__b = r[field]; }); }
    withBasis("code_basis");
    var codeCard = splitBars(code, "Who writes code", "Share of each kind of role whose posting has the person writing code.");
    withBasis("reports_basis");
    var outCard = splitBars(function (r) { return ["IT", "Engineering", "Finance", "Operations", "Other"].indexOf(r.reports_into) >= 0; },
      "Who reports outside People", "Share of each kind of role reporting into another function: IT, Engineering, Finance or Operations. Roles that report to the CEO aren't counted.");
    app.innerHTML = '<h1>Data</h1>' +
      '<p class="muted" style="margin:-24px 0 32px;font-size:19px;max-width:60ch">Across ' + n(R.length) + ' open People and Talent roles at US startups and growth companies:</p>' +
      '<div class="stats">' + [[pct(nAI, R.length) + "%", "work with AI"],
        [pct(nAdopt, R.length) + "%", "lead AI adoption, for the People team or the whole company"],
        [pct(nBuild, R.length) + "%", "build: tools, automations, agents or integrations"],
        [pct(nTech, R.length) + "%", "work with IT, data, product or engineering teams"],
        [pct(nCode, R.length) + "%", "write code"]].map(function (s) {
        return '<div><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join("") + '</div>' + LEGEND +
      '<div class="grid2">' + codeCard + outCard + '</div>' + src();
  }

  /* ---------- Appendix ---------- */
  function appendix() {
    app.innerHTML = '<h1>How the tracker works</h1>' +
      '<p>Every day it reads the public job boards of ' + n(S.companies_tracked) + ' US startups and growth companies, keeps the roles that belong to the company\'s own People, HR, Talent or Recruiting function, and reads each posting with Claude against the definitions below. The definitions were calibrated by hand on a labeled review set. Each job links to its original posting.</p>' +
      '<p class="muted">Left out: roles at HR-tech and payroll companies that serve customers, IT and security, workplace and facilities, and roles outside the US. Companies on Workday and other enterprise systems aren\'t included yet.</p>' +
      '<h2 style="margin-top:48px">Kinds of role</h2><dl class="defs">' + ROLE_ORDER.map(function (g) { return '<dt>' + esc(g) + '</dt><dd>' + esc(GROUPS[g][1]) + '</dd>'; }).join("") + '</dl>' +
      '<h2>AI role</h2><p class="muted">One per role; when a role fits more than one, the higher one wins. Company boilerplate about AI and experience asked for in the requirements don\'t count.</p><dl class="defs">' +
      [4, 3, 2, 1, 0].map(function (l) { return '<dt>' + esc(AI_NAME[l]) + '</dt><dd>' + esc(AI_DEF[l]) + '</dd>'; }).join("") + '</dl>' +
      '<table><thead><tr><th>Where the companies come from</th><th class="num">Companies</th></tr></thead><tbody>' +
      Object.keys(S.sources).map(function (k_) { return '<tr><td>' + esc(k_) + '</td><td class="num">' + n(S.sources[k_]) + '</td></tr>'; }).join("") + '</tbody></table>' +
      '<p class="src">A company can be on more than one list. Classifier ' + esc(S.classifier_version) + '.</p>';
  }

  /* ---------- routing ---------- */
  var ROUTES = { home: home, jobs: jobs, roles: roles, insights: insights, data: data, appendix: appendix };
  function route() {
    var h = (location.hash || "#home").slice(1), parts = h.split("/"), r = ROUTES[parts[0]] ? parts[0] : "home";
    document.querySelectorAll("nav a").forEach(function (a) { if (a.dataset.route === r) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    document.title = (r === "home" ? "" : (r === "appendix" ? "How it works" : r.charAt(0).toUpperCase() + r.slice(1)) + " – ") + "People Transformation Tracker";
    if (r === "roles" && parts[1]) category(parts[1]); else ROUTES[r]();
    window.scrollTo(0, 0);
  }
  fetch("data.json").then(function (res) { return res.json(); }).then(function (d) {
    D = d; R = d.roles; S = d.stats;
    var nw = R.filter(isNew).length, b = document.getElementById("newcount");
    if (nw) { b.textContent = nw; b.hidden = false; b.setAttribute("aria-label", nw + " new jobs"); }
    window.addEventListener("hashchange", route); route();
  }).catch(function () { app.innerHTML = '<p class="loading">The role data didn\'t load. Refresh the page to try again.</p>'; });
})();
