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
    "Building & automation": ["People-native builders", "People and Talent practitioners who design and build the process together with the tools, automations or AI agents that run it. Hired from People or talent backgrounds, not as engineers."],
    "Embedded engineer": ["Engineers in People", "Software, data and AI engineers who sit in People/Talent or build for it."],
    "Embedded product & design": ["Product and design in People", "Hired as product managers or designers to build internal People products."],
    "People systems": ["Inside the HR stack", "Work within existing People systems (HRIS, ATS, payroll and comp tools): administer, configure, integrate, migrate."],
    "People analytics & research": ["Data on people", "Analysts, data scientists and researchers working on people data across the function."],
    "Strategic projects & initiatives": ["Time-bound change", "Cross-functional initiatives: restructuring, change and AI adoption, People-technology rollouts."],
    "Core People & Talent": ["The core of the function", "Recruiting, sourcing, coordination, HR business partners, total rewards, people operations, L&D, employee relations and recurring People programs."]
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
  function src(extra) { return '<p class="src">Source: public job boards of ' + n(S.companies_tracked) + ' US startups and growth companies, as of ' + md(S.as_of) + (extra ? ". " + extra : "") + '</p>'; }
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
    var tools = r.tools.slice(0, 4).join(" · ");
    return '<article class="card job">' +
      '<h3>' + esc(r.title) + '</h3>' +
      '<div class="co"><b>' + esc(r.company) + '</b>' + (r.location ? ' · ' + esc(r.location) : "") + '</div>' +
      '<div class="tags">' + tags.join("") + '</div>' +
      (r.comp ? '<div class="pay">' + pay(r.comp) + '</div>' : '<div class="pay nopay">Pay not posted</div>') +
      '<div class="mid"><span>' + repHtml + '</span><span class="tools">' + esc(tools) + '</span></div>' +
      (l >= 2 && r.ai_evidence ? '<div class="why">“' + esc(r.ai_evidence) + '”</div>' : "") +
      '<div class="bottom"><span>' + (isNew(r) ? "Posted " + md(r.first_seen) : "Open since tracking began") + '</span>' +
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
      '</div><div class="foot-row"><span class="src" style="margin:0">' + n(R.length) + ' open roles · US · as of ' + md(S.as_of) + '</span><a href="#roles">See the roles ↗</a></div></section>';
  }

  /* ---------- Jobs ---------- */
  function jobs() {
    var st = { fwd: false, group: "" };
    app.innerHTML = '<div class="page-head"><h1>New jobs</h1></div>' +
      '<div class="controls"><button class="pill" type="button" id="fwd" aria-pressed="false">Builds with AI or leads</button>' +
      '<label for="grp" style="position:absolute;left:-9999px">Kind of role</label><select id="grp"><option value="">Every kind of role</option>' +
      D.group_order.map(function (g) { return '<option>' + esc(g) + '</option>'; }).join("") + '</select></div>' +
      '<p class="count"></p><div id="jobs"></div>';
    function draw() {
      var rows = R.filter(function (r) { return (!st.fwd || lv(r) >= 2) && (!st.group || r.group === st.group); });
      var nw = rows.filter(isNew).length;
      app.querySelector(".count").textContent = n(rows.length) + " open · " + n(nw) + " posted since " + md(S.first_day) + " · newest first";
      jobList(document.getElementById("jobs"), rows);
    }
    document.getElementById("fwd").onclick = function () { st.fwd = !st.fwd; this.setAttribute("aria-pressed", st.fwd); draw(); };
    document.getElementById("grp").onchange = function () { st.group = this.value; draw(); };
    draw();
  }

  /* ---------- Roles ---------- */
  function mix(rows) {
    var c = [0, 0, 0, 0, 0]; rows.forEach(function (r) { c[lv(r)]++; });
    var m = Math.max.apply(null, c.concat([1]));
    return '<span class="mix" role="img" aria-label="AI role mix: ' + [4, 3, 2, 1, 0].map(function (l) { return AI_SHORT[l] + " " + c[l]; }).join(", ") + '">' +
      [0, 1, 2, 3, 4].map(function (l) { return '<i style="height:' + Math.max(4, 100 * c[l] / m) + '%;background:' + COLOR[l] + '"></i>'; }).join("") + '</span>';
  }
  function glyph(l) { return '<span class="mix" aria-hidden="true">' + [1, 2, 3, 4].map(function (i) { return '<i style="height:' + (i * 25) + '%;background:' + (i <= l ? COLOR[l] : "var(--l0)") + '"></i>'; }).join("") + '</span>'; }
  function catCard(name, rows, href, l) {
    var nw = rows.filter(isNew).length;
    return '<a class="card cat" href="' + href + '"><h3>' + esc(name) + '</h3>' + (l ? glyph(l) : mix(rows)) +
      '<span class="open"><span class="dot"></span>' + n(rows.length) + ' open' + (nw ? ' <span class="mono">+' + nw + ' new</span>' : "") + '</span></a>';
  }
  function roles() {
    var order = BUILDER_GROUPS.slice().sort(function (a, b) { return byG(b).length - byG(a).length; });
    function byG(g) { return R.filter(function (r) { return r.group === g; }); }
    app.innerHTML = '<h1>Roles</h1>' +
      '<div class="grid2">' + order.map(function (g) { return catCard(g, byG(g), "#roles/" + slug(g)); }).join("") + '</div>' +
      '<h2 class="section-title">By AI role</h2><p class="section-sub">The same roles, sorted by how they work with AI. In the cards above, the bars show the mix for each kind of role, from no AI (left) to leading company-wide change (right).</p>' +
      '<div class="grid2">' + [4, 3, 2, 1].map(function (l) {
        return catCard(AI_NAME[l], R.filter(function (r) { return lv(r) === l; }), "#roles/ai-" + l, l); }).join("") + '</div>' +
      '<h2 class="section-title">The core of the function</h2><p class="section-sub">Recruiting, HR business partners, people ops, total rewards and programs: most of the market, and the baseline everything else is measured against.</p>' +
      '<div class="grid2">' + catCard("Core People & Talent", byG("Core People & Talent"), "#roles/" + slug("Core People & Talent")) +
      catCard("Every role", R, "#roles/all") + '</div>';
  }
  function category(key) {
    var title, def, rows;
    if (key === "all") { title = "Every role"; def = "Every open People and Talent role we track, searchable."; rows = R; }
    else if (key.indexOf("ai-") === 0) { var l = +key.slice(3); title = AI_NAME[l]; def = AI_DEF[l]; rows = R.filter(function (r) { return lv(r) === l; }); }
    else { var g = D.group_order.filter(function (x) { return slug(x) === key; })[0]; if (!g) return roles();
      title = g; def = GROUPS[g][1]; rows = R.filter(function (r) { return r.group === g; }); }
    rows = rows.slice().sort(function (a, b) { return lv(b) - lv(a) || (b.first_seen > a.first_seen ? 1 : -1); });
    var tools = top(tally(rows, function (r) { return r.tools; }), 5).map(function (x) { return x[0]; });
    app.innerHTML = '<a class="back" href="#roles">← All roles</a><div class="cat-head"><h1>' + esc(title) + '</h1><p>' + esc(def) + '</p></div>' +
      '<p class="count">' + n(rows.length) + ' open' + (tools.length ? ' · most-named tools: ' + esc(tools.join(", ")) : "") + '</p>' +
      '<div class="controls" style="margin-top:16px"><label for="q" style="position:absolute;left:-9999px">Search</label><input id="q" type="search" placeholder="Search title, company, tool"></div><div id="jobs"></div>';
    function draw(q) {
      q = (q || "").toLowerCase().trim();
      var rs = !q ? rows : rows.filter(function (r) { var h = (r.title + " " + r.company + " " + r.tools.join(" ") + " " + r.summary).toLowerCase();
        return q.split(/\s+/).every(function (w) { return h.indexOf(w) >= 0; }); });
      jobList(document.getElementById("jobs"), rs);
    }
    var t; document.getElementById("q").oninput = function (e) { clearTimeout(t); t = setTimeout(function () { draw(e.target.value); }, 150); };
    draw("");
  }

  /* ---------- Insights ---------- */
  function insights() {
    var c = [0, 0, 0, 0, 0]; R.forEach(function (r) { c[lv(r)]++; });
    var fwd = R.filter(FWD), builders = R.filter(function (r) { return r.group !== "Core People & Talent"; }),
        core = R.filter(function (r) { return r.group === "Core People & Talent"; });
    var bF = pct(builders.filter(FWD).length, builders.length), cF = pct(core.filter(FWD).length, core.length);
    var tools = top(tally(fwd, function (r) { return r.tools; }), 5);
    var cos = top(tally(fwd, function (r) { return r.company; }), 5);
    var cw = R.filter(function (r) { return lv(r) === 4; });
    function vb(items, maxv, hi) {
      return '<div class="vbars">' + items.map(function (x, i) {
        return '<div><span>' + (x[3] || n(x[1])) + '</span><i style="height:' + Math.max(3, 100 * x[1] / maxv) + '%;background:' + (x[2] || (i === hi ? "var(--rust)" : "var(--l1)")) + '"></i><span>' + esc(x[0]) + '</span></div>'; }).join("") + '</div>'; }
    var entries = [
      [n(fwd.length) + " roles build with AI or lead AI transformation.",
        "That's " + pct(fwd.length, R.length) + "% of open People and Talent roles. Another " + n(c[1]) + " expect the person to use AI tools day to day.",
        vb([4, 3, 2, 1, 0].map(function (l) { return [AI_SHORT[l], c[l], COLOR[l]]; }), Math.max.apply(null, c))],
      ["Outside the core, " + bF + "% of roles are AI-forward. Inside it, " + cF + "%.",
        "Builder, systems, analytics and project roles are " + pct(builders.length, R.length) + "% of open roles but " + pct(builders.filter(FWD).length, fwd.length) + "% of the AI-forward ones. Most core recruiting and HR postings don't mention AI at all.",
        vb([["Outside the core", bF, null, bF + "%"], ["Core People & Talent", cF, null, cF + "%"]], 100, 0)],
      [esc(tools.length ? tools[0][0] : "") + " is the tool AI-forward roles name most.",
        "The systems of record still anchor the work: " + tools.slice(0, 3).map(function (x) { return x[0]; }).join(", ") + " lead the list of tools named in roles that build with AI or lead it.",
        vb(tools.map(function (x) { return [x[0], x[1]]; }), tools.length ? tools[0][1] : 1, 0)],
      [esc(cos.length ? cos[0][0] : "") + " is hiring the most AI-forward People roles.",
        cos.map(function (x) { return x[0] + " (" + x[1] + ")"; }).join(", ") + ". It's spread thin: " + n(Object.keys(tally(fwd, function (r) { return r.company; })).length) + " of the " + n(S.companies_with_roles) + " companies hiring People roles have at least one.",
        vb(cos.map(function (x) { return [x[0], x[1]]; }), cos.length ? cos[0][1] : 1, 0)],
      ["Only " + n(cw.length) + " role" + (cw.length === 1 ? "" : "s") + " lead AI transformation for the whole company.",
        "Company-wide AI enablement rarely sits in a People role yet: " + cw.map(function (r) { return r.title + " at " + r.company; }).join("; ") + ".",
        '<div class="dots" role="img" aria-label="' + fwd.length + ' AI-forward roles, ' + cw.length + ' company-wide">' +
          fwd.slice().sort(function (a, b) { return lv(a) - lv(b); }).map(function (r) { return '<i class="' + (lv(r) === 4 ? "on" : lv(r) === 3 ? "mid" : "") + '"></i>'; }).join("") + '</div>']
    ];
    app.innerHTML = '<h1>Insights</h1>' + entries.map(function (e) {
      return '<article class="entry"><div class="when">First read<br>' + mdy(S.as_of) + '</div><div><h2>' + e[0] + '</h2><p>' + esc(e[1]) + '</p></div><div class="card">' + e[2] + '</div></article>'; }).join("") +
      src("Tracking began " + md(S.first_day) + "; week-over-week reports start once there is history.");
  }

  /* ---------- Data ---------- */
  function data() {
    var outside = R.filter(function (r) { return r.reports_into && ["People/HR", "Talent/Recruiting", "Unknown"].indexOf(r.reports_into) < 0; });
    var known = R.filter(function (r) { return r.reports_into && r.reports_into !== "Unknown"; });
    var ai = R.filter(function (r) { return lv(r) > 0; }), code = R.filter(function (r) { return r.code === "yes"; });
    var rep = R.map(function (r) { return Object.assign({}, r, { _b: r.reports_into === "Unknown" ? "not_stated" : r.reports_basis }); });
    var cats = ["People/HR", "Talent/Recruiting", "Finance", "IT", "Operations", "CEO/Executive", "Engineering", "Other"];
    var byGroup = D.group_order.map(function (g) {
      var rows = R.filter(function (r) { return r.group === g; });
      var st = rows.filter(function (r) { return r.code === "yes" && r.code_basis === "stated"; }).length;
      var inf = rows.filter(function (r) { return r.code === "yes" && r.code_basis !== "stated"; }).length;
      return [g, st, inf, rows.length]; }).sort(function (a, b) { return (b[1] + b[2]) / b[3] - (a[1] + a[2]) / a[3]; });
    app.innerHTML = '<h1>Data</h1>' +
      '<div class="stats">' +
      [[pct(ai.length, R.length) + "%", "work with AI"], [pct(outside.length, known.length) + "%", "report outside People"], [pct(code.length, R.length) + "%", "write code"], [n(R.length), "roles tracked"]].map(function (s) {
        return '<div><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join("") + '</div>' + LEGEND +
      '<div class="grid2"><div class="card"><h2>Who they report to</h2><p class="muted">Share of all roles, by the team named as the reporting line.</p>' +
      basisBars(rep, cats, function (r) { return r.reports_into; }, true) + '</div>' +
      '<div class="card"><h2>Who writes code, by kind of role</h2><p class="muted">Share of each kind of role whose posting has the person writing code.</p><div class="hbars">' +
      byGroup.map(function (x) { var m = 100;
        return '<div class="hbar small"><span class="lab">' + esc(x[0]) + '</span><span class="trk"><i class="solid" style="width:' + 100 * x[1] / x[3] + '%"></i><i class="hatched" style="width:' + 100 * x[2] / x[3] + '%"></i></span><span class="val">' + pct(x[1] + x[2], x[3]) + '%</span></div>'; }).join("") +
      '</div></div></div>' + src() +
      '<section class="method"><h2>How the tracker works</h2>' +
      '<p>Every day it reads the public job boards of ' + n(S.companies_tracked) + ' US startups and growth companies, keeps the roles that belong to the company\'s own People, HR, Talent or Recruiting function, and reads each posting with Claude against the definitions below. The definitions were calibrated by hand on a labeled review set. Each job links to its original posting.</p>' +
      '<p class="muted">Left out: roles at HR-tech and payroll companies that serve customers, IT and security, workplace and facilities, and roles outside the US. Companies on Workday and other enterprise systems aren\'t included yet.</p>' +
      '<h3 style="margin-top:40px">Kinds of role</h3><dl class="defs">' + D.group_order.map(function (g) { return '<dt>' + esc(g) + '</dt><dd>' + esc(GROUPS[g][1]) + '</dd>'; }).join("") + '</dl>' +
      '<h3>AI role</h3><p class="muted">One per role; when a role fits more than one, the higher one wins. Company boilerplate about AI and experience asked for in the requirements don\'t count.</p><dl class="defs">' +
      [4, 3, 2, 1, 0].map(function (l) { return '<dt>' + esc(AI_NAME[l]) + '</dt><dd>' + esc(AI_DEF[l]) + '</dd>'; }).join("") + '</dl>' +
      '<table><thead><tr><th>Where the companies come from</th><th class="num">Companies</th></tr></thead><tbody>' +
      Object.keys(S.sources).map(function (k_) { return '<tr><td>' + esc(k_) + '</td><td class="num">' + n(S.sources[k_]) + '</td></tr>'; }).join("") + '</tbody></table>' +
      '<p class="src">A company can be on more than one list. Classifier ' + esc(S.classifier_version) + '.</p></section>';
  }

  /* ---------- routing ---------- */
  var ROUTES = { home: home, jobs: jobs, roles: roles, insights: insights, data: data };
  function route() {
    var h = (location.hash || "#home").slice(1), parts = h.split("/"), r = ROUTES[parts[0]] ? parts[0] : "home";
    document.querySelectorAll("nav a").forEach(function (a) { if (a.dataset.route === r) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    document.title = (r === "home" ? "" : r.charAt(0).toUpperCase() + r.slice(1) + " – ") + "People Transformation Tracker";
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
