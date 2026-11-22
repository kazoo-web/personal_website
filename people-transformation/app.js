/* People Transformation Tracker — static site. Data: data.json (built by site/build_site.py). */
(function () {
  "use strict";
  var D, ROLES, app = document.getElementById("app");

  var LEVEL = { "None": 0, "Uses AI": 1, "Builds with AI": 2,
    "Leads AI transformation - People/Talent": 3, "Leads AI transformation - company-wide": 4 };
  var COLOR = ["var(--l0)", "var(--l1)", "var(--l2)", "var(--l3)", "var(--l4)"];
  var LABEL = ["No AI in the role", "Uses AI", "Builds with AI",
    "Leads AI transformation – People/Talent", "Leads AI transformation – company-wide"];
  var LEVEL_DEF = [
    "The posting does not ask the role to work with AI.",
    "Expected to use AI tools in its own work.",
    "Builds specific AI tools, agents, workflows or integrations inside the People function.",
    "Changes how the People/Talent function, or a broad part of it such as recruiting, works with AI: through skills and adoption, or by rebuilding its operating model around AI.",
    "Changes how the whole company, or several functions, works with AI: enablement programs, training, champions, redesigning roles."
  ];
  var GROUP_DEF = {
    "Embedded engineer": "Software, data or AI engineers who sit in or build for People/Talent.",
    "Embedded product & design": "Hired as product managers or designers to build internal People products.",
    "Building & automation": "People-native builders: they design and build People capabilities, the process together with the tools, automations or AI agents that run it, and come from People or talent backgrounds rather than engineering.",
    "People systems": "Work within existing People systems (HRIS, ATS, payroll and comp tools): administer, configure, integrate, migrate.",
    "People analytics & research": "Analysts, data scientists and researchers working on people data across the function.",
    "Strategic projects & initiatives": "Time-bound, cross-functional initiatives: restructuring, change and AI-adoption initiatives, People-technology rollouts.",
    "Core People & Talent": "Recruiting, sourcing, coordination, HR business partners, total rewards, people operations, L&D, employee relations and recurring People programs."
  };
  var SENIORITY = ["intern", "entry", "mid", "senior", "staff_principal", "manager", "director", "vp_plus", "unclear"];
  var SEN_LABEL = { intern: "Intern", entry: "Entry", mid: "Mid", senior: "Senior", staff_principal: "Staff / principal",
    manager: "Manager", director: "Director", vp_plus: "VP and above", unclear: "Unclear" };

  function lv(r) { return LEVEL[r.ai] || 0; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtDate(d) { if (!d) return ""; var p = d.split("-");
    return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+p[1] - 1] + " " + (+p[2]); }
  function n(x) { return Number(x).toLocaleString("en-US"); }
  function pct(a, b) { return b ? Math.round(100 * a / b) + "%" : "0%"; }
  function ladder(l) { return '<span class="ladder" data-l="' + l + '" role="img" aria-label="' + esc(LABEL[l]) + '"><i></i><i></i><i></i><i></i><i></i></span>'; }
  function money(c) { if (!c) return ""; var f = function (v) { return "$" + Math.round(v / 1000) + "k"; };
    return c[1] && c[1] !== c[0] ? f(c[0]) + "–" + f(c[1]) : f(c[0]); }
  function words(s) { return (s || "").replace(/_/g, " "); }
  function count(list, key) { var m = {}; list.forEach(function (r) { var k = key(r); if (k) m[k] = (m[k] || 0) + 1; }); return m; }
  function top(m, k) { return Object.keys(m).map(function (x) { return [x, m[x]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, k); }
  function median(a) { if (!a.length) return null; a = a.slice().sort(function (x, y) { return x - y; }); var m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }

  /* ---------- shared pieces ---------- */
  function roleItem(r) {
    var l = lv(r);
    var dl = [];
    if (r.group) dl.push(["Kind of role", r.group]);
    if (r.sub) dl.push(["Area", words(r.sub)]);
    if (r.seniority) dl.push(["Seniority", (SEN_LABEL[r.seniority] || r.seniority) + (r.seniority_basis === "inferred" ? " (inferred)" : "")]);
    if (r.reports_to || r.reports_into) dl.push(["Reports into", esc(r.reports_to || r.reports_into)]);
    if (r.works_with.length) dl.push(["Works with", r.works_with.join(", ")]);
    if (r.tools.length) dl.push(["Tools named", r.tools.join(", ")]);
    if (r.comp) dl.push(["Posted pay", money(r.comp)]);
    if (r.department) dl.push(["Listed under", r.department]);
    return '<li class="role"><details><summary>' + ladder(l) +
      '<span><span class="t">' + esc(r.title) + '</span> <span class="co">at ' + esc(r.company) + '</span></span>' +
      '<span class="when">' + fmtDate(r.first_seen) + '</span>' +
      '<span class="meta">' + esc([LABEL[l] === LABEL[0] ? "" : LABEL[l], r.group, r.location].filter(Boolean).join(" / ")) + '</span>' +
      '</summary><div class="detail"><div>' +
      (r.summary ? '<p>' + esc(r.summary) + '</p>' : "") +
      (r.ai_evidence && l > 0 ? '<blockquote class="quote" style="border-color:' + COLOR[l] + '">“' + esc(r.ai_evidence) + '”</blockquote>' : "") +
      '<p><a class="open-link" href="' + esc(r.url) + '" target="_blank" rel="noopener">Open the posting</a></p></div>' +
      '<dl>' + dl.map(function (x) { return "<dt>" + x[0] + "</dt><dd>" + esc(x[1]) + "</dd>"; }).join("") + '</dl></div></details></li>';
  }

  function list(el, rows, step) {
    var shown = 0; step = step || 40;
    function more() {
      var ul = el.querySelector(".roles");
      ul.insertAdjacentHTML("beforeend", rows.slice(shown, shown + step).map(roleItem).join(""));
      shown += step;
      var b = el.querySelector(".more");
      b.innerHTML = shown < rows.length ? '<button class="btn" type="button">Show ' + Math.min(step, rows.length - shown) + ' more of ' + n(rows.length - shown) + '</button>' : "";
      var btn = b.querySelector("button"); if (btn) btn.onclick = more;
    }
    el.innerHTML = '<ul class="roles"></ul><div class="more"></div>';
    if (!rows.length) { el.innerHTML = '<p class="muted">No roles match. Clear a filter to see more.</p>'; return; }
    more();
  }

  function spectrum(rows) {
    var c = [0, 0, 0, 0, 0]; rows.forEach(function (r) { c[lv(r)]++; });
    var order = [4, 3, 2, 1, 0];
    return '<div class="spectrum" role="img" aria-label="Roles by AI role">' + order.map(function (l) {
      return '<span style="flex-grow:' + c[l] + ';background:' + COLOR[l] + '" title="' + esc(LABEL[l]) + ': ' + c[l] + '"></span>'; }).join("") +
      '</div><ul class="key">' + order.map(function (l) {
      return '<li><span class="sw" style="background:' + COLOR[l] + '"></span>' + esc(LABEL[l]) + ' <b>' + n(c[l]) + '</b></li>'; }).join("") + '</ul>';
  }

  /* ---------- Jobs ---------- */
  function jobs() {
    var R = ROLES, s = D.stats, forward = R.filter(function (r) { return lv(r) >= 2; });
    var filter = -1;
    app.innerHTML =
      '<h1>' + n(R.length) + ' People and Talent roles are open at ' + n(s.companies_with_roles) + ' US startups and growth companies.</h1>' +
      '<p class="lede">' + n(forward.length) + ' of them build with AI or lead AI transformation. Every role is sorted by how it works with AI, from no AI at all to leading company-wide change.</p>' +
      spectrum(R) +
      '<h2>Newest roles</h2><p class="muted small">Tracking began ' + fmtDate(s.first_day) + ', so roles already open then are dated ' + fmtDate(s.first_day) + '. Open a role for its details.</p>' +
      '<div class="chips" role="group" aria-label="Filter by AI role"></div><p class="count"></p><div id="jl"></div>';
    var chips = app.querySelector(".chips");
    var opts = [[-1, "All roles"], [5, "Builds with AI or leads"], [4, LABEL[4]], [3, LABEL[3]], [2, LABEL[2]], [1, LABEL[1]]];
    function draw() {
      chips.innerHTML = opts.map(function (o) { return '<button class="chip" type="button" data-f="' + o[0] + '" aria-pressed="' + (filter === o[0]) + '">' +
        (o[0] >= 1 && o[0] <= 4 ? ladder(o[0]) : "") + esc(o[1]) + '</button>'; }).join("");
      var rows = R.filter(function (r) { return filter === -1 || (filter === 5 ? lv(r) >= 2 : lv(r) === filter); });
      app.querySelector(".count").textContent = n(rows.length) + " roles, newest first";
      list(document.getElementById("jl"), rows);
      chips.querySelectorAll("button").forEach(function (b) { b.onclick = function () { filter = +b.dataset.f; draw(); }; });
    }
    draw();
  }

  /* ---------- Roles ---------- */
  function rolesPage() {
    var st = { q: "", group: "", ai: "", sen: "", sub: "" };
    var subs = top(count(ROLES, function (r) { return r.sub; }), 40).map(function (x) { return x[0]; }).sort();
    function sel(id, label, options) {
      return '<label class="sr" for="' + id + '" style="position:absolute;left:-9999px">' + label + '</label><select id="' + id + '"><option value="">' + label + '</option>' +
        options.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join("") + '</select>';
    }
    app.innerHTML = '<h1>Every open role, searchable.</h1>' +
      '<p class="lede">Search titles, companies, tools and summaries, or narrow by kind of role, AI role, seniority or area.</p>' +
      '<div class="filters"><label for="q" style="position:absolute;left:-9999px">Search roles</label><input id="q" type="search" placeholder="Search, e.g. Workday, talent engineer, Claude">' +
      sel("fg", "Any kind of role", D.group_order.map(function (g) { return [g, g]; })) +
      sel("fa", "Any AI role", [4, 3, 2, 1, 0].map(function (l) { return [l, LABEL[l]]; })) +
      sel("fs", "Any seniority", SENIORITY.map(function (s) { return [s, SEN_LABEL[s]]; })) +
      sel("fu", "Any area", subs.map(function (s) { return [s, words(s)]; })) + '</div>' +
      '<p class="count"></p><div id="rl"></div>';
    function draw() {
      var q = st.q.toLowerCase().trim();
      var rows = ROLES.filter(function (r) {
        if (st.group && r.group !== st.group) return false;
        if (st.ai !== "" && lv(r) !== +st.ai) return false;
        if (st.sen && r.seniority !== st.sen) return false;
        if (st.sub && r.sub !== st.sub) return false;
        if (q) { var hay = (r.title + " " + r.company + " " + r.tools.join(" ") + " " + r.summary + " " + r.location).toLowerCase();
          if (q.split(/\s+/).some(function (w) { return hay.indexOf(w) < 0; })) return false; }
        return true;
      }).sort(function (a, b) { return lv(b) - lv(a) || (a.company > b.company ? 1 : -1); });
      app.querySelector(".count").textContent = n(rows.length) + " of " + n(ROLES.length) + " roles, most AI-forward first";
      list(document.getElementById("rl"), rows, 50);
    }
    var t; document.getElementById("q").oninput = function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value; draw(); }, 150); };
    [["fg", "group"], ["fa", "ai"], ["fs", "sen"], ["fu", "sub"]].forEach(function (p) {
      document.getElementById(p[0]).onchange = function (e) { st[p[1]] = e.target.value; draw(); }; });
    draw();
  }

  /* ---------- Insights ---------- */
  function insights() {
    var R = ROLES, fwd = R.filter(function (r) { return lv(r) >= 2; });
    var nonCore = R.filter(function (r) { return r.group !== "Core People & Talent"; });
    // 1. AI role by kind of role
    var g = D.group_order.map(function (name) {
      var rows = R.filter(function (r) { return r.group === name; }), c = [0, 0, 0, 0, 0];
      rows.forEach(function (r) { c[lv(r)]++; }); return { name: name, rows: rows, c: c, fwd: c[2] + c[3] + c[4] }; });
    var core = g[g.length - 1];
    var groupBars = g.map(function (x) {
      return '<div class="bar-row"><span>' + esc(x.name) + '</span><span class="track" role="img" aria-label="' + esc(x.name) + ': ' + pct(x.fwd, x.rows.length) + ' build with AI or lead">' +
        [4, 3, 2, 1, 0].map(function (l) { return '<span style="width:' + (x.rows.length ? 100 * x.c[l] / x.rows.length : 0) + '%;background:' + COLOR[l] + '"></span>'; }).join("") +
        '</span><span class="n">' + n(x.rows.length) + '</span></div>'; }).join("");
    // 2. companies
    var comp = top(count(fwd, function (r) { return r.company; }), 12);
    // 3. tools
    var tools = {}; fwd.forEach(function (r) { r.tools.forEach(function (t) { tools[t] = (tools[t] || 0) + 1; }); });
    var tt = top(tools, 12), tmax = tt.length ? tt[0][1] : 1;
    // 4. pay
    var pay = [[0, "No AI in the role"], [1, "Uses AI"], [2, "Builds with AI"], [3, "Leads AI transformation (either)"]].map(function (p) {
      var rows = R.filter(function (r) { return r.comp && r.seniority === "senior" && (p[0] === 3 ? lv(r) >= 3 : lv(r) === p[0]); });
      return [p[1], median(rows.map(function (r) { return (r.comp[0] + (r.comp[1] || r.comp[0])) / 2; })), rows.length]; });
    // 5. works with
    var ww = {}; fwd.forEach(function (r) { r.works_with.forEach(function (t) { ww[t] = (ww[t] || 0) + 1; }); });
    var wt = top(ww, 8), wmax = wt.length ? wt[0][1] : 1;
    function simpleBars(rows, max, total) {
      return '<div class="bars">' + rows.map(function (x) { return '<div class="bar-row"><span>' + esc(x[0]) + '</span><span class="track"><span class="solo" style="width:' +
        (100 * x[1] / max) + '%"></span></span><span class="n">' + (total ? pct(x[1], total) : n(x[1])) + '</span></div>'; }).join("") + '</div>'; }

    app.innerHTML = '<h1>Where AI is showing up in People work.</h1>' +
      '<p class="lede">A first read from ' + n(R.length) + ' open roles as of ' + fmtDate(D.stats.as_of) + '. Tracking started ' + fmtDate(D.stats.first_day) + ', so these are levels, not trends yet.</p>' +
      '<h2>Builder roles are rare, and almost all of them work with AI</h2>' +
      '<p>' + pct(core.rows.length, R.length) + ' of open roles are core People and Talent work, and ' + pct(core.fwd, core.rows.length) +
      ' of those build with AI or lead AI change. Across the other ' + n(nonCore.length) + ' roles it is ' +
      pct(nonCore.filter(function (r) { return lv(r) >= 2; }).length, nonCore.length) + '.</p>' +
      '<div class="bars">' + groupBars + '</div>' + spectrum([]).replace(/<div class="spectrum[\s\S]*?<\/div>/, "").replace(/ <b>0<\/b>/g, "") +
      '<div class="cols"><div><h2>Companies hiring the most AI-forward People roles</h2>' +
      '<p class="muted small">Roles that build with AI or lead AI transformation.</p>' +
      '<table><thead><tr><th>Company</th><th class="num">Roles</th></tr></thead><tbody>' +
      comp.map(function (c) { return '<tr><td>' + esc(c[0]) + '</td><td class="num">' + c[1] + '</td></tr>'; }).join("") + '</tbody></table></div>' +
      '<div><h2>Tools named in those roles</h2><p class="muted small">Share of the ' + n(fwd.length) + ' AI-forward roles that name each tool.</p>' +
      simpleBars(tt, tmax, fwd.length) + '</div></div>' +
      '<div class="cols"><div><h2>Who they work with</h2><p class="muted small">Teams named as partners in AI-forward roles.</p>' + simpleBars(wt, wmax, fwd.length) + '</div>' +
      '<div><h2>Posted pay for senior roles</h2><p class="muted small">Median midpoint of the posted US pay range, senior-level roles only.</p>' +
      '<table><thead><tr><th>AI role</th><th class="num">Median</th><th class="num">Roles</th></tr></thead><tbody>' +
      pay.map(function (p) { return '<tr><td>' + esc(p[0]) + '</td><td class="num">' + (p[1] ? "$" + Math.round(p[1] / 1000) + "k" : "–") + '</td><td class="num">' + p[2] + '</td></tr>'; }).join("") +
      '</tbody></table><p class="muted small">Small samples: read as a direction, not a benchmark.</p></div></div>';
  }

  /* ---------- Data ---------- */
  function data() {
    var s = D.stats;
    app.innerHTML = '<h1>How the tracker works.</h1>' +
      '<p class="lede">Every day it reads the public job boards of US startups and growth companies, keeps the People and Talent roles, and sorts each one by the kind of work it is and how it works with AI.</p>' +
      '<div class="facts">' +
      [[n(s.companies_tracked), "companies tracked"], [n(s.open_postings), "open postings read"], [n(s.us_people_candidates), "US People and Talent candidates"],
       [n(s.in_scope), "roles published"], [fmtDate(s.as_of), "last updated"]].map(function (f) {
        return '<div class="fact"><b>' + f[0] + '</b><span>' + f[1] + '</span></div>'; }).join("") + '</div>' +
      '<h2>Which companies</h2><p>Companies come from public lists of startups and growth companies, kept only if their job board can be read directly. ' +
      'Enterprise companies are not included yet.</p>' +
      '<table><thead><tr><th>Source list</th><th class="num">Companies</th></tr></thead><tbody>' +
      Object.keys(s.sources).map(function (k) { return '<tr><td>' + esc(k) + '</td><td class="num">' + n(s.sources[k]) + '</td></tr>'; }).join("") + '</tbody></table>' +
      '<p class="muted small">A company can appear on more than one list. Job boards read: ' + Object.keys(s.by_ats).map(function (k) { return k + " (" + s.by_ats[k] + ")"; }).join(", ") + '.</p>' +
      '<h2>Which roles</h2><p>A role is kept when it belongs to the company\'s own People, HR, Talent or Recruiting function, or builds tools, data or AI for it. ' +
      'Left out: roles at HR-tech and payroll companies that serve customers, IT and security roles, workplace and facilities, early-career recruiting funnels for other teams, and roles outside the US.</p>' +
      '<h2>Kinds of role</h2><dl class="defs">' + D.group_order.map(function (g) { return '<dt>' + esc(g) + '</dt><dd>' + esc(GROUP_DEF[g]) + '</dd>'; }).join("") + '</dl>' +
      '<h2>AI role</h2><p>Each role gets one AI role. When a role fits more than one, the higher step wins. Company boilerplate about AI and experience asked for in the requirements do not count.</p>' +
      '<dl class="defs">' + [4, 3, 2, 1, 0].map(function (l) { return '<dt>' + ladder(l) + ' ' + esc(LABEL[l]) + '</dt><dd>' + esc(LEVEL_DEF[l]) + '</dd>'; }).join("") + '</dl>' +
      '<h2>How roles are classified</h2><p>Each posting is read by Claude (Anthropic\'s model) against these definitions, which were calibrated by hand on a labeled review set. ' +
      'Details such as tools, reporting line and seniority are taken from the posting; when the posting does not say, the field is left blank or marked inferred. ' +
      'Classifications can be wrong. Each role links to the original posting.</p>' +
      '<h2>Known gaps</h2><p>Tracking started ' + fmtDate(s.first_day) + ', so there is no trend history yet. Some boards only show part of their roles to a direct read. ' +
      'Companies on Workday and other enterprise systems are not included.</p>' +
      '<p class="muted small">Classifier ' + esc(s.classifier_version) + '.</p>';
  }

  /* ---------- routing ---------- */
  var ROUTES = { jobs: jobs, roles: rolesPage, insights: insights, data: data };
  function route() {
    var r = (location.hash || "#jobs").slice(1); if (!ROUTES[r]) r = "jobs";
    document.querySelectorAll("nav a").forEach(function (a) { a.toggleAttribute("aria-current", a.dataset.route === r); if (a.dataset.route === r) a.setAttribute("aria-current", "page"); });
    document.title = (r === "jobs" ? "" : r.charAt(0).toUpperCase() + r.slice(1) + " – ") + "People Transformation Tracker";
    ROUTES[r](); window.scrollTo(0, 0);
  }
  fetch("data.json").then(function (res) { return res.json(); }).then(function (d) {
    D = d; ROLES = d.roles; window.addEventListener("hashchange", route); route();
  }).catch(function () { app.innerHTML = '<p class="loading">The role data did not load. Refresh the page to try again.</p>'; });
})();
