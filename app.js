/* Gilgal Ground Chalets — guest booking (/) and front desk (/admin).
   No build step: state lives in `state`, every change re-renders the current screen.
   Booking rules come from lib/core.js (window.GG), shared with the API. */
(() => {
  'use strict';

  const { BUILDINGS, META, ALL, TOTAL } = GG;
  const IS_ADMIN = /\/admin\/?$/.test(location.pathname) || location.hash.startsWith('#/admin');

  // ── State ───────────────────────────────────────────────────────────────
  const GUEST = ['welcome', 'rules', 'type', 'days', 'rooms', 'details', 'confirmed'];
  const DESK = ['calendar', 'dayview', 'checkin', 'checkout'];
  const TODAY = GG.today();
  const firstDay = GG.nextOpen(TODAY);

  let state = {
    screen: IS_ADMIN ? 'loading' : 'welcome', rulesNext: 'type',
    // guest
    gs: firstDay, ge: GG.sundayOf(firstDay), gMonth: firstDay.slice(0, 7),
    sel: null, tab: 'b1', btype: 'ind', gender: 'F', size: 4, agree: false,
    name: '', church: '', email: '', phone: '',
    avail: [], availAt: 0, confirmed: null, busy: false, error: '',
    // front desk
    bookings: [], aDay: firstDay, aMonth: firstDay.slice(0, 7), inIdx: 0, outIdx: 0, keyDraft: {},
    username: '', password: '', loginErr: ''
  };

  function setState(patch) {
    const next = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...next };
    render();
  }

  const hashOf = screen => IS_ADMIN && location.pathname.endsWith('/admin') ? '#/' + screen : (IS_ADMIN ? '#/admin/' : '#/') + screen;
  function go(screen, extra) {
    if (location.hash !== hashOf(screen)) history.pushState(null, '', hashOf(screen));
    setState({ screen, error: '', ...extra });
    const main = document.querySelector('.main');
    if (main) main.scrollTop = 0;
    if (screen === 'days' || screen === 'rooms') loadAvail();
  }
  window.addEventListener('popstate', () => {
    const s = location.hash.replace(/^#\/(admin\/)?/, '');
    if (IS_ADMIN) { if (state.screen !== 'login') setState({ screen: DESK.includes(s) ? s : 'calendar' }); }
    else setState({ screen: GUEST.includes(s) && s !== 'confirmed' ? s : 'welcome' });
  });

  // ── API ─────────────────────────────────────────────────────────────────
  async function api(route, { method = 'GET', body, id } = {}) {
    let r;
    try {
      r = await fetch(`/api/router?route=${route}${id ? '&id=' + encodeURIComponent(id) : ''}`, {
        method, credentials: 'same-origin',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (_) {
      throw Object.assign(new Error('Can’t reach the booking service. Check your connection.'), { status: 0 });
    }
    let data = null;
    try { data = await r.json(); } catch (_) { /* not JSON */ }
    if (!r.ok) throw Object.assign(new Error((data && data.error) || `Something went wrong (${r.status}).`), { status: r.status });
    return data;
  }

  async function loadAvail(force) {
    if (!force && Date.now() - state.availAt < 15000) return;
    try {
      const d = await api('availability');
      setState({ avail: d.bookings, availAt: Date.now() });
    } catch (e) { setState({ error: e.message }); }
  }

  async function loadDesk() {
    try {
      const d = await api('bookings');
      setState({ bookings: d.bookings });
    } catch (e) {
      if (e.status === 401) setState({ screen: 'login' });
      else setState({ error: e.message });
    }
  }

  async function patchBooking(id, patch) {
    // Optimistic: show the change now, then sync with the server's copy.
    setState(s => ({ bookings: s.bookings.map(b => (b.id === id ? { ...b, ...patch, ...(patch.keyDone ? { keyDone: new Date().toISOString() } : {}), ...(patch.returned ? { returned: new Date().toISOString() } : {}) } : b)), error: '' }));
    try {
      const b = await api('bookings', { method: 'PATCH', id, body: patch });
      setState(s => ({ bookings: s.bookings.map(x => (x.id === id ? b : x)) }));
    } catch (e) {
      if (e.status === 401) return setState({ screen: 'login' });
      setState({ error: e.message });
      loadDesk();
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let handlers = [];
  const on = fn => (fn ? `data-on="${handlers.push(fn) - 1}"` : '');
  const onInput = fn => `data-in="${handlers.push(fn) - 1}"`;
  const onChange = fn => `data-change="${handlers.push(fn) - 1}"`;
  const onSubmit = fn => `data-submit="${handlers.push(fn) - 1}"`;

  const ICON = {
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    fwd: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    prev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    checkLg: (stroke = 'currentColor') => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><path d="M20 6 9 17l-5-5"/></svg>`,
    cal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4"/><path d="M3 10h18"/></svg>',
    key: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/></svg>'
  };

  const INK = '#231815', OR = '#E0571F', ORD = '#B8441A', ORT = '#FDE9DD', AMB = '#F9A935', SURF = '#F7F4F0', MUTE = 'rgba(35,24,21,.28)';
  const HATCH = 'repeating-linear-gradient(135deg, rgba(35,24,21,.10) 0 1.5px, transparent 1.5px 7px), #F7F4F0';

  const fmt = (s, o) => GG.toDate(s).toLocaleDateString('en-GB', { timeZone: 'UTC', ...o }).replace(',', '');
  const fmtD = s => fmt(s, { weekday: 'short', day: 'numeric', month: 'short' });
  const longD = s => fmt(s, { weekday: 'long', day: 'numeric', month: 'short' });
  const monthLabel = ym => fmt(ym + '-01', { month: 'long', year: 'numeric' });
  const rangeTxt = (s, e) => s === e ? fmtD(s) : `${fmtD(s).replace(/ \w+$/, '')} – ${fmtD(e)}`;
  const timeOf = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: GG.TIME_ZONE });
  const matWord = n => `${n} mattress${n > 1 ? 'es' : ''}`;
  const addMonths = (ym, n) => { const d = GG.toDate(ym + '-15'); d.setUTCMonth(d.getUTCMonth() + n); return GG.iso(d).slice(0, 7); };
  // Monday-first grid for a month: whole weeks, blanks outside the month.
  function monthCells(ym) {
    const first = ym + '-01', lead = (GG.dow(first) + 6) % 7;
    const start = GG.addDays(first, -lead), cells = [];
    for (let d = start; ; d = GG.addDays(d, 1)) {
      if (d.slice(0, 7) > ym && cells.length % 7 === 0) break;
      cells.push({ d, inMonth: d.slice(0, 7) === ym });
    }
    return cells;
  }
  const errorLine = () => state.error ? `<div class="error" role="alert">${esc(state.error)}</div>` : '';

  // ── Guest values ────────────────────────────────────────────────────────
  function guestVals() {
    const st = state, isFam = st.btype === 'fam';
    const gs = st.gs, gEnd = st.ge ?? st.gs, days = GG.daysIn(gs, gEnd).length;
    const opt = { type: st.btype, gender: st.gender, size: st.size };
    const RS = {};
    ALL.forEach(n => (RS[n] = GG.roomState(n, gs, gEnd, opt, st.avail)));
    const sel = st.sel && RS[st.sel].ok ? st.sel : (ALL.find(n => RS[n].ok) ?? null);
    const okOf = nums => nums.filter(n => RS[n].ok).length;
    const bedsOf = nums => nums.reduce((a, n) => a + (RS[n].ok ? RS[n].cap - RS[n].used : 0), 0);
    const m = sel ? META[sel] : { b: '', f: '', cap: 0 };
    const myBed = sel ? (GG.assignBed(sel, gs, gEnd, st.avail) || RS[sel].used + 1) : 0;
    return {
      isFam, gs, gEnd, days, RS, sel, okOf, bedsOf, m, myBed,
      whoTxt: isFam ? `Family of ${st.size}` : `Individual · ${st.gender === 'F' ? 'Female' : 'Male'}`,
      rangeTxt: rangeTxt(gs, gEnd),
      selWhat: sel ? (isFam ? `Whole room · ${m.cap} beds` : `Bed ${myBed} of ${m.cap} · ${RS[sel].lock || (st.gender === 'F' ? 'Women' : 'Men')} only`) : 'No room available'
    };
  }

  function pickDay(d) {
    let { gs, ge } = state;
    if (ge != null || gs == null) { gs = d; ge = null; }
    else if (GG.weekendOf(d) === GG.weekendOf(gs) && d > gs) ge = d;
    else { gs = d; ge = null; }
    setState({ gs, ge });
  }

  // ── Screens: guest ──────────────────────────────────────────────────────
  const backBar = (title, step, back) => `
    <header class="bar">
      <button class="btn btn-icon" ${on(back)} aria-label="Back">${ICON.back}</button>
      <span class="bar-title">${esc(title)}</span>
      ${step ? `<span class="bar-step">${step} / 5</span>` : ''}
    </header>`;
  const cta = (label, fn, disabled, icon = ICON.arrow) =>
    `<button class="btn btn-primary cta" ${on(fn)} ${disabled ? 'disabled' : ''}><span>${label}</span>${icon}</button>`;
  const RULES = [
    ['Clean up your room', 'Leave it as you found it before you check out.'],
    ['Return your mattress', 'Bring it back to the front desk with your key.'],
    ['No noise', 'Keep it quiet for everyone on the grounds.']
  ];

  function welcome() {
    return `
      <div class="main welcome-top">
        <img src="/assets/gilgal-logo.png" alt="Gilgal Ground Chalets" style="width:112px;height:auto">
        <h1>Gilgal Ground Chalets</h1>
        <p>Book a whole room for your family, or a bed space for yourself.</p>
        <div class="grid3 rule-y stats">
          <div><b>26</b><span>rooms, 2 buildings</span></div>
          <div><b>4–5</b><span>beds per room</span></div>
          <div><b>Fri–Sun</b><span>open days</span></div>
        </div>
      </div>
      <div class="welcome-cta">
        <div class="welcome-steps">
          <div><b>01</b><span>Choose family or individual</span></div>
          <div><b>02</b><span>Pick your days and room</span></div>
          <div><b>03</b><span>Collect your key and mattress on arrival</span></div>
        </div>
        <button class="btn btn-white cta" ${on(() => go('rules', { rulesNext: 'type' }))}>Book a stay${ICON.arrow}</button>
        <button class="btn link-btn" ${on(() => go('rules', { rulesNext: 'welcome' }))}>Read the Gilgal Ground Rules</button>
      </div>`;
  }

  function rules() {
    const st = state;
    return `
      ${backBar('Gilgal Ground Rules', null, () => go('welcome'))}
      <div class="main pad" style="gap:24px">
        <h1 style="font-size:32px">Before you book</h1>
        <div class="rule-top rules">
          ${RULES.map(([t, d], i) => `<div><span class="n">0${i + 1}</span><div><div class="t">${t}</div><div class="d">${d}</div></div></div>`).join('')}
        </div>
        <div class="note">
          <div class="note-h">Good to know</div>
          <div>One bed space comes with one mattress.</div>
          <div>Shared rooms are for women only or men only.</div>
        </div>
      </div>
      <div class="foot">
        <button class="check" role="checkbox" aria-checked="${st.agree}" ${on(() => setState(s => ({ agree: !s.agree })))}>
          <span class="box ${st.agree ? 'on' : ''}">${st.agree ? ICON.check : ''}</span>
          <span style="font-size:15px">I agree to the Gilgal Ground Rules</span>
        </button>
        ${cta(st.rulesNext === 'type' ? 'Continue' : 'Book a stay', () => go('type'), !st.agree)}
      </div>`;
  }

  function type() {
    const st = state, isFam = st.btype === 'fam';
    const opts = [
      { id: 'fam', title: 'Family', body: 'The whole room for 4 or 5 people. One mattress for each person.' },
      { id: 'ind', title: 'Individual', body: 'One bed space and one mattress in a shared room.' }
    ];
    return `
      ${backBar('New booking', 1, () => go('rules', { rulesNext: 'type' }))}
      <div class="main pad">
        <h1 style="font-size:32px">Who’s coming?</h1>
        <div class="opts rule-top">
          ${opts.map(o => `
            <button class="opt" aria-pressed="${st.btype === o.id}" ${on(() => setState({ btype: o.id }))}>
              <span class="radio"><i></i></span>
              <span><span class="opt-t">${o.title}</span><span class="opt-b">${o.body}</span></span>
            </button>`).join('')}
        </div>
        ${isFam ? `
          <div style="display:flex;flex-direction:column;gap:8px">
            <span class="field-label">How many people?</span>
            <div class="seg">
              ${[4, 5].map(v => `
                <button aria-pressed="${st.size === v}" ${on(() => setState({ size: v }))}>
                  <div class="l">${v} people</div><div class="s">${v === 5 ? 'Building Two only' : 'Any room'}</div>
                </button>`).join('')}
            </div>
          </div>` : `
          <div style="display:flex;flex-direction:column;gap:8px">
            <span class="field-label">Gender</span>
            <div class="seg big">
              ${[['F', 'Female'], ['M', 'Male']].map(([v, l]) => `
                <button aria-pressed="${st.gender === v}" ${on(() => setState({ gender: v }))}>${l}</button>`).join('')}
            </div>
            <span class="hint">Shared rooms are single-gender, so you’ll only see rooms that are open to you.</span>
          </div>`}
      </div>
      <div class="foot">${cta('Choose days', () => go('days'))}</div>`;
  }

  function days() {
    const v = guestVals(), st = state, max = GG.addDays(TODAY, GG.MAX_DAYS_AHEAD);
    const cells = monthCells(st.gMonth).map(({ d, inMonth }) => {
      if (!inMonth) return '<span></span>';
      const ok = GG.isOpen(d) && d >= TODAY && d <= max;
      const inR = d >= v.gs && d <= v.gEnd, edge = d === v.gs || d === v.gEnd;
      const style = `font-weight:${ok ? 700 : 400};background:${edge ? OR : inR ? ORT : '#fff'};color:${edge ? '#fff' : ok ? INK : MUTE};cursor:${ok ? 'pointer' : 'default'};box-shadow:${ok && !inR ? 'inset 0 0 0 1px rgba(224,87,31,.4)' : 'none'}`;
      const day = Number(d.slice(8));
      return ok
        ? `<button style="${style}" aria-pressed="${inR}" aria-label="${esc(fmtD(d))}" ${on(() => pickDay(d))}>${day}</button>`
        : `<button style="${style}" disabled tabindex="-1">${day}</button>`;
    }).join('');
    const minM = TODAY.slice(0, 7), maxM = max.slice(0, 7);
    const count = v.isFam ? v.okOf(ALL) : v.bedsOf(ALL);
    return `
      ${backBar(v.whoTxt, 2, () => go('type'))}
      <div class="main pad" style="padding-top:24px;gap:18px">
        <div>
          <h1 style="font-size:30px">Which days?</h1>
          <p class="lede">We’re open for bookings Friday to Sunday. Tap your first day, then your last.</p>
        </div>
        <div class="range rule-y">
          <div><div class="cap-up">From</div><div class="v">${fmtD(v.gs)}</div></div>
          <div><div class="cap-up">To</div><div class="v">${fmtD(v.gEnd)}</div></div>
          <div class="days"><div class="cap-up">Days</div><div class="v">${v.days}</div></div>
        </div>
        <div>
          <div class="month-head">
            <span class="m">${monthLabel(st.gMonth)}</span>
            <div class="nav">
              <button class="btn btn-secondary btn-icon" ${st.gMonth > minM ? on(() => setState(s => ({ gMonth: addMonths(s.gMonth, -1) }))) : 'disabled'} aria-label="Previous month">${ICON.prev}</button>
              <button class="btn btn-secondary btn-icon" ${st.gMonth < maxM ? on(() => setState(s => ({ gMonth: addMonths(s.gMonth, 1) }))) : 'disabled'} aria-label="Next month">${ICON.next}</button>
            </div>
          </div>
          <div class="dow"><span>M</span><span>T</span><span>W</span><span>T</span><span class="open">F</span><span class="open">S</span><span class="open">S</span></div>
          <div class="gcal">${cells}</div>
        </div>
        <div class="avail"><b>${count}</b><span>${v.isFam ? `of 26 rooms available for a family of ${st.size}` : `bed spaces available to ${st.gender === 'F' ? 'women' : 'men'} on these days`}</span></div>
        ${errorLine()}
      </div>
      <div class="foot">${cta('See available rooms', () => go('rooms'))}</div>`;
  }

  function rooms() {
    const v = guestVals(), st = state, isFam = v.isFam;
    const tile = n => {
      const r = v.RS[n], isS = n === v.sel;
      const dots = Array.from({ length: r.cap }, (_, i) => {
        const taken = i < r.used, mine = isS && (isFam ? i < st.size : i === r.used);
        const bg = mine ? '#fff' : taken ? (isS ? 'rgba(255,255,255,.5)' : 'rgba(35,24,21,.5)') : 'transparent';
        const ring = taken || mine ? 'none' : `inset 0 0 0 1.5px ${isS ? '#fff' : r.ok ? 'rgba(35,24,21,.4)' : 'rgba(35,24,21,.25)'}`;
        return `<i style="background:${bg};box-shadow:${ring}"></i>`;
      }).join('');
      const bg = isS ? OR : r.ok ? '#fff' : HATCH, fg = isS ? '#fff' : r.ok ? INK : 'rgba(35,24,21,.45)';
      const sub = isS ? '#fff' : r.ok ? ORD : 'rgba(35,24,21,.5)';
      const status = isS ? (isFam ? 'Your room' : 'Your bed') : r.label;
      return `
        <button class="tile" style="background:${bg};color:${fg};cursor:${r.ok ? 'pointer' : 'not-allowed'}"
          ${r.ok ? on(() => setState({ sel: n })) : 'disabled'} aria-pressed="${isS}" aria-label="Room ${n}, ${esc(status)}">
          <div class="tile-h"><span class="tile-n">${n}</span><span class="tile-lock">${r.lock}</span></div>
          <div class="dots">${dots}</div>
          <span class="tile-s" style="color:${sub}">${esc(status)}</span>
        </button>`;
    };
    const tabB = BUILDINGS.find(b => b.id === st.tab);
    const btabs = BUILDINGS.map(b => {
      const nums = b.floors.flatMap(f => f.nums);
      return `<button aria-pressed="${b.id === st.tab}" ${on(() => setState({ tab: b.id }))}>
        <div class="n">${b.name}</div><div class="s">${b.floors[0].cap} beds/room · ${isFam ? v.okOf(nums) + ' rooms' : v.bedsOf(nums) + ' beds'} available</div>
      </button>`;
    }).join('');
    const floors = tabB.floors.map(f => {
      const h = f.nums.length / 2, cols = `grid-template-columns:repeat(${h},minmax(0,1fr))`;
      const avail = isFam ? `${v.okOf(f.nums)} of ${f.nums.length} rooms available` : `${v.bedsOf(f.nums)} beds available`;
      return `
        <div class="floor">
          <div class="floor-h"><b>${f.name}</b><span>${avail}</span></div>
          <div class="plan">
            <div class="plan-row" style="${cols}">${f.nums.slice(0, h).map(tile).join('')}</div>
            <div class="corridor"><span>Corridor</span><span>${f.note}</span></div>
            <div class="plan-row" style="${cols}">${f.nums.slice(h).map(tile).join('')}</div>
          </div>
        </div>`;
    }).join('');
    return `
      ${backBar('Choose a room', 3, () => go('days'))}
      <div class="strip"><b>${esc(v.whoTxt)}</b><span>${v.rangeTxt}</span></div>
      <div class="btabs">${btabs}</div>
      <div class="main pad" style="padding:18px 20px;gap:18px">
        ${errorLine()}
        ${floors}
        <div class="legend">
          <span><i style="box-shadow:inset 0 0 0 1.5px rgba(35,24,21,.4)"></i>Bed available</span>
          <span><i style="background:rgba(35,24,21,.5)"></i>Bed taken</span>
          <span><i style="width:10px;height:10px;background:repeating-linear-gradient(135deg, rgba(35,24,21,.3) 0 1.5px, transparent 1.5px 4px), #F7F4F0"></i>Not open to you</span>
        </div>
      </div>
      <div class="foot" style="padding-top:14px">
        <div class="sel-line"><b>Room ${v.sel ?? '—'}</b><span>${esc(v.selWhat)}</span></div>
        ${cta('Continue', () => go('details', { sel: v.sel }), !v.sel)}
      </div>`;
  }

  async function confirmBooking() {
    const v = guestVals(), st = state;
    setState({ busy: true, error: '' });
    try {
      const b = await api('bookings', { method: 'POST', body: {
        type: st.btype, size: st.size, gender: st.gender, room: v.sel, start: v.gs, end: v.gEnd,
        name: st.name, church: st.church, email: st.email, phone: st.phone
      } });
      go('confirmed', { confirmed: b, busy: false, availAt: 0 });
    } catch (e) {
      setState({ busy: false });
      if (e.status === 409) { await loadAvail(true); go('rooms', { sel: null }); setState({ error: e.message }); }
      else setState({ error: e.message });
    }
  }

  function details() {
    const v = guestVals(), st = state, isFam = v.isFam;
    const field = (id, label, key, typeAttr, extra = '') => `
      <div class="field"><label for="f-${id}">${label}</label>
        <input class="input" id="f-${id}" type="${typeAttr}" value="${esc(st[key])}" ${extra}
          ${onInput(e => setState({ [key]: e.target.value }))}></div>`;
    const complete = ['name', 'church', 'email', 'phone'].every(k => st[k].trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(st.email.trim());
    return `
      ${backBar('Your details', 4, () => go('rooms'))}
      <div class="summary">
        <div><div class="cap">Room</div><div style="font-size:22px;font-weight:700;color:${ORD}">${v.sel ?? '—'}</div></div>
        <div><div style="font-size:14px;font-weight:700">${esc(v.selWhat)}</div><div style="font-size:13px;color:rgba(35,24,21,.65);margin-top:2px">${v.rangeTxt} · ${v.days} day${v.days > 1 ? 's' : ''}</div></div>
      </div>
      <form class="main pad" style="padding-top:26px;gap:20px" onsubmit="return false">
        <div>
          <h1 style="font-size:30px">${isFam ? 'Who’s the lead guest?' : 'Who’s staying?'}</h1>
          <p class="lede" style="margin-top:8px">We’ll send your booking reference here. Give it at the front desk to collect your key.</p>
        </div>
        ${field('name', isFam ? 'Lead guest’s full name' : 'Full name', 'name', 'text', 'autocomplete="name"')}
        ${field('church', 'Church name', 'church', 'text', 'placeholder="The Ecclesia Embassy"')}
        ${field('email', 'Email', 'email', 'email', 'autocomplete="email" inputmode="email"')}
        ${field('phone', 'Phone number', 'phone', 'tel', 'autocomplete="tel"')}
        ${errorLine()}
      </form>
      <div class="foot">${cta(st.busy ? 'Booking…' : 'Confirm booking', confirmBooking, !complete || !v.sel || st.busy)}</div>`;
  }

  function downloadIcs(g) {
    const end = GG.addDays(g.end, 1).replace(/-/g, '');
    const what = g.type === 'fam' ? `whole room, ${g.size} people` : `bed ${g.bed}`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gilgal Ground Chalets//Booking//EN', 'BEGIN:VEVENT',
      `UID:${g.ref}@gilgal-chalets`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
      `DTSTART;VALUE=DATE:${g.start.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:Gilgal Ground Chalets — Room ${g.room}`,
      `DESCRIPTION:Booking ${g.ref} · ${what}. Collect your key and mattress at the front desk.`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = `gilgal-${g.ref}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function confirmed() {
    const g = state.confirmed;
    if (!g) return welcome();
    const m = META[g.room], isFam = g.type === 'fam';
    const first = (g.lead || 'there').split(/\s+/)[0];
    return `
      <header class="brand-bar">
        <img src="/assets/gilgal-logo.png" alt="Gilgal">
        <span class="bar-title" style="letter-spacing:-.01em">Gilgal Ground Chalets</span>
        <span class="bar-step">5 / 5</span>
      </header>
      <div class="main pad" style="padding-top:24px;gap:20px">
        <div class="done-line"><span class="box on">${ICON.check}</span>Booking confirmed, ${esc(first)}</div>
        <div class="rule-y">
          <div style="display:flex;align-items:flex-end;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--line-soft)">
            <div><div style="font-size:12px;color:var(--muted)">Room</div><div class="big-room">${g.room}</div></div>
            <div style="text-align:right;font-size:13px;line-height:1.4">${m.b}<br>${m.f}</div>
          </div>
          <div class="grid2" style="border-bottom:1px solid var(--line-soft)">
            <div class="cell"><div class="cap">You booked</div><div class="val">${isFam ? `Whole room, ${g.size} people` : `Bed ${g.bed} of ${m.cap}`}</div></div>
            <div class="cell"><div class="cap">Mattresses</div><div class="val">${isFam ? `${g.size} — one each` : '1'}</div></div>
          </div>
          <div class="grid2" style="border-bottom:1px solid var(--line-soft)">
            <div class="cell"><div class="cap">From</div><div class="val">${fmtD(g.start)}</div></div>
            <div class="cell"><div class="cap">To</div><div class="val">${fmtD(g.end)}</div></div>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:14px"><span style="color:rgba(35,24,21,.65)">Reference</span><span style="font-weight:700;letter-spacing:.04em">${esc(g.ref)}</span></div>
        </div>
        <div class="note" style="gap:0;padding:14px 16px">
          <div class="note-h" style="margin-bottom:6px">Gilgal Ground Rules</div>
          <div class="rules-mini">
            <div><b>01</b><span>Clean up your room</span></div>
            <div><b>02</b><span>Return your mattress with your key</span></div>
            <div><b>03</b><span>No noise</span></div>
          </div>
        </div>
        <p class="hint">Need to change or cancel? Call the front desk with your reference.</p>
      </div>
      <div class="foot foot-2">
        <button class="btn btn-secondary" ${on(() => downloadIcs(g))}>${ICON.cal}Add to calendar</button>
        <button class="btn btn-secondary" ${on(() => go('welcome', { confirmed: null, agree: false, sel: null }))}>Done</button>
      </div>`;
  }

  // ── Screens: front desk ─────────────────────────────────────────────────
  const live = () => state.bookings;
  const bedsOn = d => ALL.reduce((a, n) => {
    const here = live().filter(b => b.room === n && GG.covers(b, d));
    return a + (here.some(b => b.type === 'fam') ? META[n].cap : here.length);
  }, 0);
  const TAG = {
    'Arriving': [OR, '#fff', 'none'], 'Key out': [AMB, INK, 'none'], 'Leaving': ['#fff', ORD, `inset 0 0 0 1.5px ${OR}`],
    'Checked out': [SURF, 'rgba(35,24,21,.6)', 'none'], 'Booked': [ORT, '#8A3212', 'none'],
    'Arrives': [ORT, '#8A3212', `inset 0 0 0 1.5px ${OR}`], 'No show': [SURF, 'rgba(35,24,21,.6)', 'inset 0 0 0 1px rgba(35,24,21,.3)']
  };
  function statusOf(b, d) {
    if (b.returned) return 'Checked out';
    if (b.keyDone) return b.end === d ? 'Leaving' : 'Key out';
    if (d < TODAY) return 'No show';
    if (b.start === d) return d === TODAY ? 'Arriving' : 'Arrives';
    return 'Booked';
  }
  const dayStats = d => {
    const beds = bedsOn(d);
    return { beds, avail: TOTAL - beds, arr: live().filter(b => b.start === d).length };
  };
  const dayWord = d => d === TODAY ? 'today' : fmtD(d);

  const deskBar = () => `
    <header class="desk-bar">
      <img src="/assets/gilgal-logo.png" alt="Gilgal">
      <span class="label">Front desk</span>
      <span class="date">${fmtD(TODAY)}</span>
      <button class="exit" ${on(logout)}>Log out</button>
    </header>`;
  const deskTabs = cur => `
    <nav class="tabs" aria-label="Front desk">
      ${[['calendar', 'Calendar'], ['dayview', 'Days'], ['checkin', 'Check in'], ['checkout', 'Check out']].map(([id, l]) =>
        `<button ${id === cur ? 'aria-current="page"' : ''} ${on(() => { go(id); loadDesk(); })}>${l}</button>`).join('')}
    </nav>`;

  function login() {
    const submit = async () => {
      setState({ busy: true, loginErr: '' });
      try {
        await api('login', { method: 'POST', body: { username: state.username, password: state.password } });
        go('calendar', { busy: false, password: '' });
        loadDesk();
      } catch (e) { setState({ busy: false, loginErr: e.message }); }
    };
    return `
      <header class="desk-bar">
        <img src="/assets/gilgal-logo.png" alt="Gilgal">
        <span class="label">Front desk</span>
      </header>
      <form class="main pad" style="padding-top:40px;gap:20px" ${onSubmit(submit)}>
        <div>
          <h1 style="font-size:32px">Front desk login</h1>
          <p class="lede">For Gilgal staff. Guests can book at <a href="/">the booking page</a>.</p>
        </div>
        <div class="field"><label for="f-user">Username</label>
          <input class="input" id="f-user" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(state.username)}"
            ${onInput(e => setState({ username: e.target.value, loginErr: '' }))}></div>
        <div class="field"><label for="f-pw">Password</label>
          <input class="input" id="f-pw" type="password" autocomplete="current-password" value="${esc(state.password)}"
            ${onInput(e => setState({ password: e.target.value, loginErr: '' }))}></div>
        ${state.loginErr ? `<div class="error" role="alert">${esc(state.loginErr)}</div>` : ''}
        <button class="btn btn-primary cta" type="submit" ${!state.username.trim() || !state.password || state.busy ? 'disabled' : ''}><span>${state.busy ? 'Logging in…' : 'Log in'}</span>${ICON.arrow}</button>
      </form>`;
  }

  async function logout() {
    try { await api('logout', { method: 'POST' }); } catch (_) { /* already logged out */ }
    history.replaceState(null, '', hashOf('calendar'));
    setState({ screen: 'login', bookings: [] });
  }

  function calendar() {
    const st = state, s = dayStats(st.aDay);
    const cells = monthCells(st.aMonth).map(({ d, inMonth }) => {
      const n = Number(d.slice(8));
      if (!inMonth) return '<div style="background:#fff"></div>';
      if (!GG.isOpen(d)) return `<div style="background:${SURF};color:${MUTE}"><div class="top"><span style="font-size:14px;font-weight:400">${n}</span></div></div>`;
      const cnt = bedsOn(d), sel = d === st.aDay;
      const bar = d < TODAY ? 'rgba(35,24,21,.35)' : cnt / TOTAL > 0.8 ? OR : AMB;
      return `
        <button style="background:${sel ? ORT : '#fff'};color:${d < TODAY ? 'rgba(35,24,21,.5)' : INK};cursor:pointer;box-shadow:${sel ? `inset 0 0 0 2px ${OR}` : 'none'}"
          aria-pressed="${sel}" aria-label="${esc(fmtD(d))}, ${cnt} of ${TOTAL} beds" ${on(() => setState({ aDay: d }))}>
          <div class="top"><span style="font-size:14px;font-weight:700">${n}</span><span class="tag">${d === TODAY ? 'Today' : ''}</span></div>
          <span class="cnt">${cnt}<span>/${TOTAL}</span></span>
          <div class="bar-track"><i style="width:${Math.round(cnt / TOTAL * 100)}%;background:${bar}"></i></div>
        </button>`;
    }).join('');
    return `
      ${deskBar()}
      <div class="main" style="padding:20px 16px 20px;gap:14px">
        ${errorLine()}
        <div class="month-head" style="padding:0 4px;margin:0">
          <h2 style="font-size:24px;letter-spacing:-.02em">${monthLabel(st.aMonth)}</h2>
          <div class="nav">
            <button class="btn btn-secondary btn-icon" ${on(() => setState(s => ({ aMonth: addMonths(s.aMonth, -1) })))} aria-label="Previous month">${ICON.prev}</button>
            <button class="btn btn-secondary btn-icon" ${on(() => setState(s => ({ aMonth: addMonths(s.aMonth, 1) })))} aria-label="Next month">${ICON.next}</button>
          </div>
        </div>
        <div>
          <div class="acal-head"><span>M</span><span>T</span><span>W</span><span>T</span><span class="open">Fri</span><span class="open">Sat</span><span class="open">Sun</span></div>
          <div class="acal">${cells}</div>
          <div style="padding:6px 4px 0;font-size:11px;color:rgba(35,24,21,.55)">Bed spaces booked of ${TOTAL}. A family booking counts every bed in its room.</div>
        </div>
        <div class="grid3 rule-y kpis">
          <div><div class="cap">${fmtD(st.aDay)}</div><b>${s.beds} <span style="font-size:12px;font-weight:400;opacity:.6">beds</span></b></div>
          <div><div class="cap">Available</div><b>${s.avail}</b></div>
          <div><div class="cap">Arriving</div><b style="color:${ORD}">${s.arr}</b></div>
        </div>
        <button class="btn btn-primary cta" style="padding:14px 16px;font-size:15px;flex:none" ${on(() => go('dayview'))}><span>Open ${fmtD(st.aDay)} in days view</span>${ICON.arrow}</button>
      </div>
      ${deskTabs('calendar')}`;
  }

  const stepDay = dir => setState(s => {
    const d = GG.nextOpen(GG.addDays(s.aDay, dir), dir);
    return { aDay: d, aMonth: d.slice(0, 7), inIdx: 0, outIdx: 0 };
  });

  function dayview() {
    const k = state.aDay, s = dayStats(k);
    const onDay = live().filter(b => GG.covers(b, k));
    const person = (b, label) => {
      const sx = statusOf(b, k), t = TAG[sx];
      return `<div class="person"><span>${esc(label)}</span><span class="pill" style="background:${t[0]};color:${t[1]};box-shadow:${t[2]}">${sx}</span></div>`;
    };
    const groups = BUILDINGS.flatMap(b => b.floors.map(f => {
      const rows = f.nums.map(n => {
        const here = onDay.filter(x => x.room === n), fam = here.find(x => x.type === 'fam'), cap = f.cap;
        let kind, kindColor, occ, numColor = INK, people = '';
        if (fam) { kind = 'Family'; kindColor = ORD; occ = `${fam.size} people`; people = person(fam, fam.name); }
        else if (here.length) {
          kind = here[0].g === 'F' ? 'Women' : 'Men'; kindColor = INK; occ = `${here.length}/${cap} beds`;
          people = [...here].sort((a, c) => a.bed - c.bed).map(x => person(x, x.name)).join('');
        } else { kind = 'Available'; kindColor = 'rgba(35,24,21,.45)'; occ = `${cap} beds`; numColor = 'rgba(35,24,21,.45)'; }
        return `
          <div class="room-row">
            <div><span class="num" style="color:${numColor}">${n}</span><span class="capn">${cap} beds</span></div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <div class="kind"><b style="color:${kindColor}">${kind}</b><span>${occ}</span></div>
              ${people}
            </div>
          </div>`;
      }).join('');
      return `<div class="group-h">${b.floors.length > 1 ? `${b.name} — ${f.name}` : b.name}</div>${rows}`;
    })).join('');
    const rel = k === TODAY ? 'Today' : k < TODAY ? 'Past' : k === GG.addDays(TODAY, 1) ? 'Tomorrow' : 'Upcoming';
    return `
      ${deskBar()}
      <div class="day-nav">
        <button class="btn btn-icon" ${on(() => stepDay(-1))} aria-label="Previous open day">${ICON.back}</button>
        <div class="d"><b>${longD(k)}</b><span>${rel}</span></div>
        <button class="btn btn-icon" ${on(() => stepDay(1))} aria-label="Next open day">${ICON.fwd}</button>
      </div>
      <div class="grid3 day-kpis">
        <div><b>${s.beds}</b><div class="cap">Beds booked</div></div>
        <div><b>${s.avail}</b><div class="cap">Beds available</div></div>
        <div class="arr"><b>${s.arr}</b><div class="cap">Arriving</div></div>
      </div>
      <div class="main">${errorLine()}${groups}</div>
      ${deskTabs('dayview')}`;
  }

  // Booking detail shared by check in / out.
  const surname = b => b.type === 'fam' ? b.name.replace(' family', '') : b.name.split(' ').pop();
  const typeTxt = b => b.type === 'fam' ? `Family of ${b.size} · whole room` : `Individual · ${b.g === 'F' ? 'Female' : 'Male'}`;
  const mats = b => b.type === 'fam' ? b.size : 1;
  const keyOf = b => b.keyNo ?? (b.type === 'fam' ? `K-${b.room}` : `K-${b.room}-${b.bed}`);
  const dayNav = () => `
    <div class="day-nav" style="padding:8px">
      <button class="btn btn-icon" ${on(() => stepDay(-1))} aria-label="Previous open day">${ICON.back}</button>
      <div class="d"><b style="font-size:16px">${longD(state.aDay)}</b></div>
      <button class="btn btn-icon" ${on(() => stepDay(1))} aria-label="Next open day">${ICON.fwd}</button>
    </div>`;
  const chips = (list, idx, isDone, setIdx) => list.map((b, i) => {
    const sel = i === idx, done = isDone(b);
    return `<button style="background:${sel ? INK : done ? AMB : '#fff'};color:${sel ? '#fff' : INK};box-shadow:${sel ? 'none' : 'inset 0 0 0 1px rgba(35,24,21,.3)'}"
      aria-pressed="${sel}" ${on(() => setIdx(i))}>${b.room} · ${esc(surname(b))}</button>`;
  }).join('');
  const whoBlock = b => `
    <div class="who">
      <div><div style="font-size:12px;color:var(--muted)">${esc(b.ref)}</div><h2>${esc(b.lead || b.name)}</h2><div class="type">${typeTxt(b)}</div></div>
      <div class="room">${b.room}</div>
    </div>`;

  function checkin() {
    const st = state, d = st.aDay;
    const arrs = live().filter(b => b.start === d).sort((a, c) => a.room - c.room || (a.bed || 0) - (c.bed || 0));
    const head = `<div class="desk-h"><b>Arriving ${dayWord(d)}</b><span>${arrs.length} booking${arrs.length === 1 ? '' : 's'} · ${arrs.filter(b => !b.keyDone).length} still to collect a key</span></div>`;
    if (!arrs.length) return `${deskBar()}${dayNav()}${head}<div class="main empty">${errorLine()}No arrivals on ${longD(d)}.</div>${deskTabs('checkin')}`;
    const ii = Math.min(st.inIdx, arrs.length - 1), a = arrs[ii], aid = a.id;
    const kNo = st.keyDraft[aid] ?? keyOf(a);
    const matOk = !!a.matOk, done = a.keyDone;
    const cancel = async () => {
      if (!confirm(`Cancel ${a.ref} for ${a.lead || a.name}? This frees room ${a.room}.`)) return;
      try { await api('bookings', { method: 'DELETE', id: aid }); loadDesk(); } catch (e) { setState({ error: e.message }); }
    };
    return `
      ${deskBar()}
      ${dayNav()}
      ${head}
      <div class="chips">${chips(arrs, ii, b => !!b.keyDone, i => setState({ inIdx: i }))}</div>
      <div class="main pad" style="padding:18px 20px;gap:16px">
        ${errorLine()}
        ${whoBlock(a)}
        <div class="grid2 rule-y facts">
          <div class="row1"><div class="cap">Stay</div><div class="v">${rangeTxt(a.start, a.end)}</div></div>
          <div class="row1"><div class="cap">Bed space</div><div class="v">${a.type === 'fam' ? `Whole room · ${META[a.room].cap} beds` : `Bed ${a.bed} of ${META[a.room].cap}`}</div></div>
          <div><div class="cap">Phone</div><div class="v sm"><a href="tel:${esc(a.phone.replace(/[^\d+]/g, ''))}">${esc(a.phone)}</a></div></div>
          <div><div class="cap">Email</div><div class="v sm">${esc(a.email)}</div></div>
          <div class="wide"><div class="cap">Church</div><div class="v">${esc(a.church)}</div></div>
        </div>
        <div>
          <button class="step" role="checkbox" aria-checked="${matOk}" ${done ? 'disabled' : on(() => patchBooking(aid, { matOk: !matOk }))} style="min-height:50px">
            <span class="box ${matOk ? 'on' : ''}">${matOk ? ICON.check : ''}</span>
            <span class="lbl">Give ${matWord(mats(a))}</span>
            <span class="state">${matOk ? 'Given' : 'Tap'}</span>
          </button>
          <div class="step key">
            <span class="box">2</span>
            <label for="f-key" class="lbl">Key tag</label>
            <input class="input" id="f-key" value="${esc(kNo)}" ${done ? 'disabled' : ''}
              ${onInput(e => { const v = e.target.value; setState(s => ({ keyDraft: { ...s.keyDraft, [aid]: v } })); })}
              ${onChange(e => patchBooking(aid, { keyNo: e.target.value }))}>
          </div>
        </div>
        ${done ? '' : `<button class="btn link-cancel" ${on(cancel)}>Cancel this booking</button>`}
      </div>
      <div class="foot">
        ${done
          ? `<div class="done-bar amber">${ICON.checkLg()}<div>Key ${esc(kNo)} + ${matWord(mats(a))} given · ${timeOf(done)}</div>
               <button class="btn" ${on(() => patchBooking(aid, { keyDone: false }))}>Undo</button></div>`
          : cta(`Hand over key ${esc(kNo)}`, () => patchBooking(aid, { keyNo: kNo, keyDone: true }), !matOk || !kNo.trim(), ICON.key)}
      </div>
      ${deskTabs('checkin')}`;
  }

  function checkout() {
    const st = state, d = st.aDay;
    const deps = live().filter(b => b.end === d).sort((x, y) => x.room - y.room || (x.bed || 0) - (y.bed || 0));
    const head = `<div class="desk-h"><b>Leaving ${dayWord(d)}</b><span>${deps.length} booking${deps.length === 1 ? '' : 's'} · ${deps.filter(b => !b.returned).length} still to check out</span></div>`;
    if (!deps.length) return `${deskBar()}${dayNav()}${head}<div class="main empty">${errorLine()}No departures on ${longD(d)}.</div>${deskTabs('checkout')}`;
    const oi = Math.min(st.outIdx, deps.length - 1), o = deps[oi], oid = o.id, done = o.returned;
    const steps = [
      ['retKey', `Key ${keyOf(o)} returned`, ''],
      ['retMat', `${matWord(mats(o))} returned`, 'Gilgal Ground Rule 02'],
      ['retClean', o.type === 'fam' ? 'Room cleaned up' : 'Bed space cleaned up', 'Gilgal Ground Rule 01']
    ].map(([k, label, rule]) => ({ k, label, rule, ok: !!o[k] }));
    const short = o.type === 'fam' ? `room ${o.room}` : `bed ${o.bed}, room ${o.room}`;
    return `
      ${deskBar()}
      ${dayNav()}
      ${head}
      <div class="chips">${chips(deps, oi, b => !!b.returned, i => setState({ outIdx: i }))}</div>
      <div class="main pad" style="padding:18px 20px;gap:16px">
        ${errorLine()}
        ${whoBlock(o)}
        <div class="grid2 rule-y facts">
          <div><div class="cap">Stayed</div><div class="v">${rangeTxt(o.start, o.end)}</div></div>
          <div><div class="cap">To collect</div><div class="v">1 key · ${matWord(mats(o))}</div></div>
        </div>
        <div style="border-top:2px solid var(--line)">
          ${steps.map(s => `
            <button class="step" role="checkbox" aria-checked="${s.ok}" ${done ? 'disabled' : on(() => patchBooking(oid, { [s.k]: !s.ok }))}>
              <span class="box ${s.ok ? 'on' : ''}">${s.ok ? ICON.check : ''}</span>
              <span class="lbl"><span>${s.label}</span>${s.rule ? `<span class="rule">${s.rule}</span>` : ''}</span>
              <span class="state">${s.ok ? 'Done' : 'Tap'}</span>
            </button>`).join('')}
        </div>
      </div>
      <div class="foot">
        ${done
          ? `<div class="done-bar ink">${ICON.checkLg(AMB)}<div>Checked out ${short} · ${timeOf(done)}</div>
               <button class="btn" style="border-color:rgba(255,255,255,.5)" ${on(() => patchBooking(oid, { returned: false }))}>Undo</button></div>`
          : cta(`Check out ${short}`, () => patchBooking(oid, { returned: true }), !steps.every(s => s.ok))}
      </div>
      ${deskTabs('checkout')}`;
  }

  const loading = () => `<div class="main empty">Loading…</div>`;

  // ── Render loop ─────────────────────────────────────────────────────────
  const SCREENS = { welcome, rules, type, days, rooms, details, confirmed, login, calendar, dayview, checkin, checkout, loading };
  const TITLES = { welcome: 'Gilgal Ground Chalets', login: 'Front desk login', calendar: 'Front desk', dayview: 'Front desk · Days', checkin: 'Front desk · Check in', checkout: 'Front desk · Check out' };
  const app = document.getElementById('app');
  let lastScreen = null;

  function render() {
    // Keep focus, caret and scroll across re-renders of the same screen.
    const active = document.activeElement;
    const focusId = active && active.id, caret = focusId && active.selectionStart != null ? [active.selectionStart, active.selectionEnd] : null;
    const scrolls = [...app.querySelectorAll('.main, .chips')].map(el => [el.scrollTop, el.scrollLeft]);
    const same = lastScreen === state.screen;

    handlers = [];
    app.innerHTML = SCREENS[state.screen]();
    document.title = TITLES[state.screen] || 'Book a stay · Gilgal Ground Chalets';
    lastScreen = state.screen;

    if (same) {
      app.querySelectorAll('.main, .chips').forEach((el, i) => { if (scrolls[i]) [el.scrollTop, el.scrollLeft] = scrolls[i]; });
      if (focusId) {
        const el = document.getElementById(focusId);
        if (el) { el.focus(); if (caret) try { el.setSelectionRange(...caret); } catch (_) { /* email/tel inputs */ } }
      }
    }
  }

  app.addEventListener('click', e => {
    const el = e.target.closest('[data-on]');
    if (!el || el.disabled) return;
    handlers[+el.dataset.on]?.(e);
  });
  app.addEventListener('input', e => {
    const el = e.target.closest('[data-in]');
    if (el) handlers[+el.dataset.in]?.(e);
  });
  app.addEventListener('change', e => {
    const el = e.target.closest('[data-change]');
    if (el && el === e.target) handlers[+el.dataset.change]?.(e);
  });
  app.addEventListener('submit', e => {
    e.preventDefault();
    const el = e.target.closest('[data-submit]');
    if (el) handlers[+el.dataset.submit]?.(e);
  });

  // ── Start ───────────────────────────────────────────────────────────────
  if (IS_ADMIN) {
    render();
    api('session').then(s => {
      const want = location.hash.replace(/^#\/(admin\/)?/, '');
      if (!s.admin) return setState({ screen: 'login' });
      setState({ screen: DESK.includes(want) ? want : 'calendar' });
      loadDesk();
      setInterval(() => { if (DESK.includes(state.screen) && document.visibilityState === 'visible') loadDesk(); }, 30000);
    }).catch(e => setState({ screen: 'login', loginErr: e.message }));
  } else {
    const initial = location.hash.replace(/^#\/?/, '');
    if (initial === 'rules') state.screen = 'rules';
    history.replaceState(null, '', '#/' + state.screen);
    render();
    loadAvail();
  }
})();
