/* Gilgal Ground Chalets — mobile booking + front desk.
   No build step: state lives in `state`, every change re-renders the current screen. */
(() => {
  'use strict';

  // ── Data ────────────────────────────────────────────────────────────────
  const D = (() => {
    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    const B = [
      { id: 'b1', name: 'Building One', floors: [
        { name: 'Ground floor', nums: range(101, 108), note: 'Entrance · Stairs', cap: 4 },
        { name: 'Upper floor', nums: range(111, 118), note: 'Stairs', cap: 4 } ] },
      { id: 'b2', name: 'Building Two', floors: [
        { name: 'Single floor', nums: range(201, 210), note: 'Entrance', cap: 5 } ] }
    ];
    const META = {};
    B.forEach(b => b.floors.forEach(f => f.nums.forEach(n => (META[n] = { b: b.name, f: f.name, cap: f.cap }))));
    const ALL = B.flatMap(b => b.floors.flatMap(f => f.nums));
    // Open days: Fri–Sun for five weekends from Fri 2 Oct 2026. Index k = week * 3 + day.
    const OPEN = [];
    for (let w = 0; w < 5; w++) for (let p = 0; p < 3; p++) OPEN.push(new Date(2026, 9, 2 + 7 * w + p));
    const MALE = ['Chinedu Okafor','Adebayo Ogunleye','Emeka Nwosu','Ibrahim Musa','Tunde Bakare','Obinna Chukwu','Segun Adeleke','Uche Nnamdi','Femi Ajayi','Yusuf Danjuma','Babatunde Coker','Kelechi Ibe','Musa Garba','Olumide Ayodele','Chukwuma Obi'];
    const FEMALE = ['Ngozi Eze','Funmilayo Adeyemi','Aisha Bello','Chiamaka Nwankwo','Yetunde Alabi','Halima Abubakar','Kemi Oladipo','Zainab Lawal','Amaka Igwe','Nkechi Okonkwo','Ifeoma Onyeka','Hauwa Sani','Folake Ogun','Temitope Ojo','Bisola Adewale'];
    const FAM = ['Okonkwo','Adeyemi','Bello','Eze','Nwosu','Lawal','Ogunleye','Danjuma','Ojo','Igwe','Abubakar','Bakare','Nnamdi','Oladipo'];
    // The current weekend (week 3) is fixed so the front desk always has arrivals and departures.
    const FIX = [
      [101,'fam',0,2,'Okonkwo family',4],[103,'fam',1,2,'Adeyemi family',4],[106,'fam',0,1,'Bello family',4],[111,'fam',0,2,'Eze family',4],[117,'fam',1,1,'Nwosu family',4],
      [201,'fam',0,2,'Lawal family',5],[204,'fam',1,2,'Ogunleye family',5],[209,'fam',0,1,'Danjuma family',5],
      [102,'ind',0,2,'Ngozi Eze','F'],[102,'ind',0,1,'Aisha Bello','F'],[102,'ind',1,2,'Kemi Oladipo','F'],
      [104,'ind',0,2,'Emeka Nwosu','M'],[104,'ind',1,2,'Tunde Bakare','M'],[104,'ind',0,1,'Segun Adeleke','M'],[104,'ind',0,2,'Femi Ajayi','M'],
      [107,'ind',1,2,'Halima Abubakar','F'],[112,'ind',0,1,'Ibrahim Musa','M'],[112,'ind',1,2,'Yusuf Danjuma','M'],
      [115,'ind',0,2,'Zainab Lawal','F'],[115,'ind',0,2,'Amaka Igwe','F'],
      [202,'ind',0,2,'Obinna Chukwu','M'],[202,'ind',1,2,'Uche Nnamdi','M'],[202,'ind',0,2,'Kelechi Ibe','M'],
      [205,'ind',0,1,'Nkechi Okonkwo','F'],[205,'ind',0,2,'Folake Ogun','F'],[205,'ind',1,2,'Hauwa Sani','F'],[205,'ind',1,2,'Ifeoma Onyeka','F'],[205,'ind',0,2,'Temitope Ojo','F'],
      [207,'ind',1,1,'Musa Garba','M']
    ];
    const rng = seed => { let s = seed % 2147483647; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
    const BK = []; let id = 0;
    ALL.forEach(n => {
      const r = rng(n * 131 + 7), cap = META[n].cap;
      for (let w = 0; w < 5; w++) {
        if (w === 3) continue;
        const x = r();
        if (x < 0.25) {
          const s = r() < 0.6 ? 0 : 1, e = s + Math.floor(r() * (3 - s));
          BK.push({ id: id++, room: n, w, s, e, type: 'fam', size: r() < 0.5 ? 4 : cap, name: FAM[Math.floor(r() * FAM.length)] + ' family' });
        } else if (x < 0.7) {
          const g = r() < 0.5 ? 'F' : 'M', list = g === 'F' ? FEMALE : MALE, cnt = 1 + Math.floor(r() * (cap - 1));
          for (let i = 0; i < cnt; i++) { const s = Math.floor(r() * 3), e = s + Math.floor(r() * (3 - s)); BK.push({ id: id++, room: n, w, s, e, type: 'ind', g, name: list[Math.floor(r() * list.length)] }); }
        }
      }
    });
    FIX.forEach(([room, type, s, e, name, x]) => BK.push(type === 'fam' ? { id: id++, room, w: 3, s, e, type, name, size: x } : { id: id++, room, w: 3, s, e, type, name, g: x }));
    const bedCount = {};
    BK.filter(b => b.type === 'ind').forEach(b => { const k = b.room + '-' + b.w; bedCount[k] = (bedCount[k] || 0) + 1; b.bed = bedCount[k]; });
    BK.forEach(b => (b.church = 'The Ecclesia Embassy'));
    const PHONES = ['+234 803 412 0318', '+234 806 551 0527', '+234 810 316 0164', '+234 902 870 0772', '+234 705 190 0455'];
    // TODAY = index of Sat 24 Oct in OPEN.
    return { B, META, ALL, OPEN, BK, PHONES, TODAY: 10, TOTAL: ALL.reduce((a, n) => a + META[n].cap, 0) };
  })();

  const REF = 'GGC-26-0142';

  // ── State ───────────────────────────────────────────────────────────────
  const GUEST = ['welcome', 'rules', 'type', 'days', 'rooms', 'details', 'confirmed'];
  const DESK = ['calendar', 'dayview', 'checkin', 'checkout'];

  let state = {
    screen: 'welcome', rulesNext: 'type',
    gs: 12, ge: 14, sel: null, tab: 'b1', btype: 'ind', gender: 'F', size: 4, agree: false,
    name: 'Chiamaka Obi', church: 'The Ecclesia Embassy', email: 'chiamaka.obi@mail.com', phone: '+234 803 555 0142',
    confirmed: null,
    aDay: D.TODAY, inIdx: 0, outIdx: 0,
    matOk: {}, keyDone: {}, keyNo: {}, retKey: {}, retMat: {}, retClean: {}, returned: {}
  };

  function setState(patch) {
    const next = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...next };
    render();
  }

  function go(screen, extra) {
    const hash = '#/' + screen;
    if (location.hash !== hash) history.pushState(null, '', hash);
    setState({ screen, ...extra });
    const main = document.querySelector('.main');
    if (main) main.scrollTop = 0;
  }

  window.addEventListener('popstate', () => {
    const s = location.hash.replace(/^#\/?/, '');
    setState({ screen: GUEST.includes(s) || DESK.includes(s) ? s : 'welcome' });
  });

  // ── Helpers ─────────────────────────────────────────────────────────────
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let handlers = [];
  const on = fn => (fn ? `data-on="${handlers.push(fn) - 1}"` : '');
  const onInput = fn => `data-in="${handlers.push(fn) - 1}"`;

  const ICON = {
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    prev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    checkLg: (stroke = 'currentColor') => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><path d="M20 6 9 17l-5-5"/></svg>`,
    cal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4"/><path d="M3 10h18"/></svg>',
    key: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/></svg>'
  };

  const INK = '#231815', OR = '#E0571F', ORD = '#B8441A', ORT = '#FDE9DD', AMB = '#F9A935', SURF = '#F7F4F0', MUTE = 'rgba(35,24,21,.28)';
  const HATCH = 'repeating-linear-gradient(135deg, rgba(35,24,21,.10) 0 1.5px, transparent 1.5px 7px), #F7F4F0';

  const fmt = (d, o) => d.toLocaleDateString('en-GB', o).replace(',', '');
  const fmtK = k => fmt(D.OPEN[k], { weekday: 'short', day: 'numeric', month: 'short' });
  const longK = k => fmt(D.OPEN[k], { weekday: 'long', day: 'numeric', month: 'short' });
  const sK = b => b.w * 3 + b.s, eK = b => b.w * 3 + b.e;
  const rangeTxt = (s, e) => s === e ? fmtK(s) : `${fmtK(s).replace(/ \w+$/, '')} – ${fmtK(e)}`;
  const matWord = n => `${n} mattress${n > 1 ? 'es' : ''}`;
  // 35 cells of the Mon-first October 2026 grid, starting Mon 28 Sep.
  const monthCells = () => Array.from({ length: 35 }, (_, i) => {
    const d = new Date(2026, 8, 28 + i);
    const inMonth = d.getMonth() === 9 || (d.getMonth() === 10 && d.getDate() === 1);
    const k = D.OPEN.findIndex(o => o.getTime() === d.getTime());
    return { d, inMonth, k };
  });

  // ── Availability ────────────────────────────────────────────────────────
  // Who can use room n over open days gs..gEnd (same weekend)?
  function roomState(n, gs, gEnd, btype, gender, size, extra) {
    const cap = D.META[n].cap, w = Math.floor(gs / 3), s = gs % 3, e = gEnd % 3;
    const ov = bookings(extra).filter(b => b.room === n && b.w === w && b.s <= e && b.e >= s);
    const inds = ov.filter(b => b.type === 'ind'), lockG = inds[0]?.g || null;
    let used = 0;
    for (let p = s; p <= e; p++) used = Math.max(used, inds.filter(b => b.s <= p && p <= b.e).length);
    const lockTxt = lockG ? (lockG === 'F' ? 'Women' : 'Men') : '';
    if (ov.some(b => b.type === 'fam')) return { ok: false, used: cap, cap, label: 'Family', lock: '' };
    if (btype === 'fam') {
      if (ov.length) return { ok: false, used, cap, label: 'Shared', lock: lockTxt };
      if (cap < size) return { ok: false, used: 0, cap, label: `Only ${cap} beds`, lock: '' };
      return { ok: true, used: 0, cap, label: 'Available', lock: '' };
    }
    if (lockG && lockG !== gender) return { ok: false, used, cap, label: lockG === 'F' ? 'Women only' : 'Men only', lock: lockTxt };
    if (used >= cap) return { ok: false, used, cap, label: 'Full', lock: lockTxt };
    return { ok: true, used, cap, label: `${cap - used} available`, lock: lockTxt };
  }

  // All bookings, plus the guest's own once confirmed (excluded while they're re-picking).
  function bookings(excludeGuest) {
    const g = state.confirmed;
    return g && !excludeGuest ? [...D.BK, g] : D.BK;
  }

  function pickDay(k) {
    let { gs, ge } = state;
    if (ge != null || gs == null) { gs = k; ge = null; }
    else if (Math.floor(k / 3) === Math.floor(gs / 3) && k > gs) ge = k;
    else { gs = k; ge = null; }
    setState({ gs, ge });
  }

  // ── Guest values ────────────────────────────────────────────────────────
  function guestVals() {
    const st = state, T = D.TODAY, isFam = st.btype === 'fam';
    const gs = st.gs, gEnd = st.ge ?? st.gs, days = gEnd - gs + 1;
    const RS = {};
    D.ALL.forEach(n => (RS[n] = roomState(n, gs, gEnd, st.btype, st.gender, st.size, true)));
    const sel = st.sel && RS[st.sel].ok ? st.sel : (D.ALL.find(n => RS[n].ok) ?? null);
    const okOf = nums => nums.filter(n => RS[n].ok).length;
    const bedsOf = nums => nums.reduce((a, n) => a + (RS[n].ok ? RS[n].cap - RS[n].used : 0), 0);
    const m = sel ? D.META[sel] : { b: '', f: '', cap: 0 };
    const myBed = sel ? RS[sel].used + 1 : 0;
    return {
      st, T, isFam, gs, gEnd, days, RS, sel, okOf, bedsOf, m, myBed,
      whoTxt: isFam ? `Family of ${st.size}` : `Individual · ${st.gender === 'F' ? 'Female' : 'Male'}`,
      rangeTxt: rangeTxt(gs, gEnd),
      selWhat: sel ? (isFam ? `Whole room · ${m.cap} beds` : `Bed ${myBed} of ${m.cap} · ${RS[sel].lock || (st.gender === 'F' ? 'Women' : 'Men')} only`) : 'No room available'
    };
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

  function welcome() {
    return `
      <div class="main welcome-top">
        <img src="assets/gilgal-logo.png" alt="Gilgal Ground Chalets" style="width:112px;height:auto">
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
        <div class="welcome-links">
          <button class="btn link-btn" ${on(() => go('rules', { rulesNext: 'welcome' }))}>Read the house rules</button>
          <button class="btn link-btn dim" ${on(() => go('calendar'))}>Front desk</button>
        </div>
      </div>`;
  }

  function rules() {
    const st = state, booking = st.rulesNext === 'type';
    return `
      ${backBar('House rules', null, () => go('welcome'))}
      <div class="main pad" style="gap:24px">
        <h1 style="font-size:32px">Before you book</h1>
        <div class="rule-top rules">
          <div><span class="n">01</span><div><div class="t">Clean up your room</div><div class="d">Leave it as you found it before you check out.</div></div></div>
          <div><span class="n">02</span><div><div class="t">Return your mattress</div><div class="d">Bring it back to the front desk with your key.</div></div></div>
          <div><span class="n">03</span><div><div class="t">No noise</div><div class="d">Keep it quiet for everyone on the grounds.</div></div></div>
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
          <span style="font-size:15px">I agree to the house rules</span>
        </button>
        ${booking ? cta('Continue', () => go('type'), !st.agree)
          : cta('Book a stay', () => go('type'), !st.agree)}
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
    const v = guestVals(), st = state, all = D.ALL;
    const cells = monthCells().map(({ d, inMonth, k }) => {
      const ok = k >= v.T, inR = k >= 0 && k >= v.gs && k <= v.gEnd, edge = k === v.gs || k === v.gEnd;
      const style = `font-weight:${ok ? 700 : 400};background:${edge ? OR : inR ? ORT : '#fff'};color:${edge ? '#fff' : ok ? INK : MUTE};cursor:${ok ? 'pointer' : 'default'};box-shadow:${ok && !inR ? 'inset 0 0 0 1px rgba(224,87,31,.4)' : 'none'}`;
      const label = inMonth ? d.getDate() : '';
      return ok
        ? `<button style="${style}" aria-pressed="${inR}" aria-label="${esc(fmtK(k))}" ${on(() => pickDay(k))}>${label}</button>`
        : `<button style="${style}" disabled tabindex="-1" aria-hidden="${!label}">${label}</button>`;
    }).join('');
    const count = v.isFam ? v.okOf(all) : v.bedsOf(all);
    return `
      ${backBar(v.whoTxt, 2, () => go('type'))}
      <div class="main pad" style="padding-top:24px;gap:18px">
        <div>
          <h1 style="font-size:30px">Which days?</h1>
          <p class="lede">We’re open for bookings Friday to Sunday. Tap your first day, then your last.</p>
        </div>
        <div class="range rule-y">
          <div><div class="cap-up">From</div><div class="v">${fmtK(v.gs)}</div></div>
          <div><div class="cap-up">To</div><div class="v">${fmtK(v.gEnd)}</div></div>
          <div class="days"><div class="cap-up">Days</div><div class="v">${v.days}</div></div>
        </div>
        <div>
          <div class="month-head">
            <span class="m">October 2026</span>
            <div class="nav">
              <button class="btn btn-secondary btn-icon" disabled aria-label="Previous month">${ICON.prev}</button>
              <button class="btn btn-secondary btn-icon" disabled aria-label="Next month">${ICON.next}</button>
            </div>
          </div>
          <div class="dow"><span>M</span><span>T</span><span>W</span><span>T</span><span class="open">F</span><span class="open">S</span><span class="open">S</span></div>
          <div class="gcal">${cells}</div>
        </div>
        <div class="avail"><b>${count}</b><span>${v.isFam ? `of 26 rooms available for a family of ${st.size}` : `bed spaces available to ${st.gender === 'F' ? 'women' : 'men'} on these days`}</span></div>
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
    const tabB = D.B.find(b => b.id === st.tab);
    const btabs = D.B.map(b => {
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

  function details() {
    const v = guestVals(), st = state, isFam = v.isFam;
    const field = (id, label, key, typeAttr = 'text', extra = '') => `
      <div class="field"><label for="f-${id}">${label}</label>
        <input class="input" id="f-${id}" type="${typeAttr}" value="${esc(st[key])}" ${extra}
          aria-invalid="${!String(st[key]).trim()}" ${onInput(e => setState({ [key]: e.target.value }))}></div>`;
    const complete = ['name', 'church', 'email', 'phone'].every(k => String(st[k]).trim());
    const confirm = () => {
      const w = Math.floor(v.gs / 3), s = v.gs % 3, e = v.gEnd % 3;
      const g = isFam
        ? { id: 'g', room: v.sel, w, s, e, type: 'fam', size: st.size, name: `${st.name.trim().split(/\s+/).pop()} family` }
        : { id: 'g', room: v.sel, w, s, e, type: 'ind', g: st.gender, name: st.name.trim(), bed: v.myBed };
      g.church = st.church.trim();
      g.email = st.email.trim();
      g.phone = st.phone.trim();
      g.ref = REF;
      go('confirmed', { confirmed: g, sel: v.sel });
    };
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
      </form>
      <div class="foot">${cta('Confirm booking', confirm, !complete || !v.sel)}</div>`;
  }

  function downloadIcs(g) {
    const ymd = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const start = D.OPEN[sK(g)], end = new Date(D.OPEN[eK(g)]); end.setDate(end.getDate() + 1);
    const what = g.type === 'fam' ? `whole room, ${g.size} people` : `bed ${g.bed}`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gilgal Ground Chalets//Booking//EN', 'BEGIN:VEVENT',
      `UID:${g.ref}@gilgal-chalets`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
      `DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(end)}`,
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
    if (!g) return details();
    const m = D.META[g.room], isFam = g.type === 'fam';
    const first = (state.name || 'there').trim().split(/\s+/)[0];
    return `
      <header class="brand-bar">
        <img src="assets/gilgal-logo.png" alt="Gilgal">
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
            <div class="cell"><div class="cap">From</div><div class="val">${fmtK(sK(g))}</div></div>
            <div class="cell"><div class="cap">To</div><div class="val">${fmtK(eK(g))}</div></div>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:14px"><span style="color:rgba(35,24,21,.65)">Reference</span><span style="font-weight:700;letter-spacing:.04em">${g.ref}</span></div>
        </div>
        <div class="note" style="gap:0;padding:14px 16px">
          <div class="note-h" style="margin-bottom:6px">House rules</div>
          <div class="rules-mini">
            <div><b>01</b><span>Clean up your room</span></div>
            <div><b>02</b><span>Return your mattress with your key</span></div>
            <div><b>03</b><span>No noise</span></div>
          </div>
        </div>
      </div>
      <div class="foot foot-2">
        <button class="btn btn-secondary" ${on(() => downloadIcs(g))}>${ICON.cal}Add to calendar</button>
        <button class="btn btn-secondary" ${on(() => go('type', { confirmed: null }))}>Change booking</button>
      </div>`;
  }

  // ── Screens: front desk ─────────────────────────────────────────────────
  const T = D.TODAY;
  const covers = (b, k) => sK(b) <= k && k <= eK(b);
  const bedsOn = (all, k) => D.ALL.reduce((a, n) => {
    const here = all.filter(b => b.room === n && covers(b, k));
    return a + (here.some(b => b.type === 'fam') ? D.META[n].cap : here.length);
  }, 0);
  const TAG = {
    'Arriving': [OR, '#fff', 'none'], 'Key out': [AMB, INK, 'none'], 'Leaving': ['#fff', ORD, `inset 0 0 0 1.5px ${OR}`],
    'Checked out': [SURF, 'rgba(35,24,21,.6)', 'none'], 'Booked': [ORT, '#8A3212', 'none'],
    'Arrives': [ORT, '#8A3212', `inset 0 0 0 1.5px ${OR}`], 'Stayed': [SURF, 'rgba(35,24,21,.6)', 'none']
  };
  function statusOf(b, k) {
    if (k < T) return 'Stayed';
    if (k > T) return sK(b) === k ? 'Arrives' : 'Booked';
    if (sK(b) === T) return state.keyDone[b.id] ? 'Key out' : 'Arriving';
    if (eK(b) === T) return state.returned[b.id] ? 'Checked out' : 'Leaving';
    return 'Key out';
  }
  const dayStats = k => {
    const all = bookings(), beds = bedsOn(all, k);
    return { beds, avail: D.TOTAL - beds, arr: all.filter(b => covers(b, k) && sK(b) === k).length };
  };

  const deskBar = () => `
    <header class="desk-bar">
      <img src="assets/gilgal-logo.png" alt="Gilgal">
      <span class="label">Front desk</span>
      <span class="date">${fmtK(T)}</span>
      <button class="exit" ${on(() => go('welcome'))}>Exit</button>
    </header>`;
  const deskTabs = cur => `
    <nav class="tabs" aria-label="Front desk">
      ${[['calendar', 'Calendar'], ['dayview', 'Days'], ['checkin', 'Check in'], ['checkout', 'Check out']].map(([id, l]) =>
        `<button ${id === cur ? 'aria-current="page"' : ''} ${on(() => go(id))}>${l}</button>`).join('')}
    </nav>`;

  function calendar() {
    const st = state, all = bookings(), s = dayStats(st.aDay);
    const cells = monthCells().map(({ d, inMonth, k }) => {
      if (k < 0) return `<div style="background:${SURF};color:${MUTE}"><div class="top"><span style="font-size:14px;font-weight:400">${inMonth ? d.getDate() : ''}</span></div></div>`;
      const cnt = bedsOn(all, k), sel = k === st.aDay;
      const bar = k < T ? 'rgba(35,24,21,.35)' : cnt / D.TOTAL > 0.8 ? OR : AMB;
      return `
        <button style="background:${sel ? ORT : '#fff'};color:${k < T ? 'rgba(35,24,21,.5)' : INK};cursor:pointer;box-shadow:${sel ? `inset 0 0 0 2px ${OR}` : 'none'}"
          aria-pressed="${sel}" aria-label="${esc(fmtK(k))}, ${cnt} of ${D.TOTAL} beds" ${on(() => setState({ aDay: k }))}>
          <div class="top"><span style="font-size:14px;font-weight:700">${d.getDate()}</span><span class="tag">${k === T ? 'Today' : ''}</span></div>
          <span class="cnt">${cnt}<span>/${D.TOTAL}</span></span>
          <div class="bar-track"><i style="width:${Math.round(cnt / D.TOTAL * 100)}%;background:${bar}"></i></div>
        </button>`;
    }).join('');
    return `
      ${deskBar()}
      <div class="main" style="padding:20px 16px 20px;gap:14px">
        <div class="month-head" style="padding:0 4px;margin:0">
          <h2 style="font-size:24px;letter-spacing:-.02em">October 2026</h2>
          <div class="nav">
            <button class="btn btn-secondary btn-icon" disabled aria-label="Previous month">${ICON.prev}</button>
            <button class="btn btn-secondary btn-icon" disabled aria-label="Next month">${ICON.next}</button>
          </div>
        </div>
        <div>
          <div class="acal-head"><span>M</span><span>T</span><span>W</span><span>T</span><span class="open">Fri</span><span class="open">Sat</span><span class="open">Sun</span></div>
          <div class="acal">${cells}</div>
          <div style="padding:6px 4px 0;font-size:11px;color:rgba(35,24,21,.55)">Bed spaces booked of ${D.TOTAL}. A family booking counts every bed in its room.</div>
        </div>
        <div class="grid3 rule-y kpis">
          <div><div class="cap">${fmtK(st.aDay)}</div><b>${s.beds} <span style="font-size:12px;font-weight:400;opacity:.6">beds</span></b></div>
          <div><div class="cap">Available</div><b>${s.avail}</b></div>
          <div><div class="cap">Arriving</div><b style="color:${ORD}">${s.arr}</b></div>
        </div>
        <button class="btn btn-primary cta" style="padding:14px 16px;font-size:15px;flex:none" ${on(() => go('dayview'))}><span>Open ${fmtK(st.aDay)} in days view</span>${ICON.arrow}</button>
      </div>
      ${deskTabs('calendar')}`;
  }

  function dayview() {
    const st = state, k = st.aDay, s = dayStats(k);
    const onDay = bookings().filter(b => covers(b, k));
    const person = (b, label) => {
      const sx = statusOf(b, k), t = TAG[sx];
      return `<div class="person"><span>${esc(label)}</span><span class="pill" style="background:${t[0]};color:${t[1]};box-shadow:${t[2]}">${sx}</span></div>`;
    };
    const groups = D.B.flatMap(b => b.floors.map(f => {
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
    const rel = k === T ? 'Today' : k < T ? 'Past' : k - T === 1 ? 'Tomorrow' : 'Upcoming';
    return `
      ${deskBar()}
      <div class="day-nav">
        <button class="btn btn-icon" ${k > 0 ? on(() => setState(s => ({ aDay: s.aDay - 1 }))) : 'disabled'} aria-label="Previous day">${ICON.back}</button>
        <div class="d"><b>${longK(k)}</b><span>${rel}</span></div>
        <button class="btn btn-icon" ${k < D.OPEN.length - 1 ? on(() => setState(s => ({ aDay: s.aDay + 1 }))) : 'disabled'} aria-label="Next day">${ICON.next.replace(/18/g, '20')}</button>
      </div>
      <div class="grid3 day-kpis">
        <div><b>${s.beds}</b><div class="cap">Beds booked</div></div>
        <div><b>${s.avail}</b><div class="cap">Beds available</div></div>
        <div class="arr"><b>${s.arr}</b><div class="cap">Arriving</div></div>
      </div>
      <div class="main">${groups}</div>
      ${deskTabs('dayview')}`;
  }

  // Booking detail shared by check in / out.
  const mkRef = b => b.ref || `GGC-26-0${100 + (b.room % 100) * 3 + (b.bed || 0)}`;
  const surname = b => b.type === 'fam' ? b.name.replace(' family', '') : b.name.split(' ').pop();
  const typeTxt = b => b.type === 'fam' ? `Family of ${b.size} · whole room` : `Individual · ${b.g === 'F' ? 'Female' : 'Male'}`;
  const mats = b => b.type === 'fam' ? b.size : 1;
  const now = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const toggle = (key, id) => () => setState(s => ({ [key]: { ...s[key], [id]: !s[key][id] } }));
  const chips = (list, idx, isDone, setIdx) => list.map((b, i) => {
    const sel = i === idx, done = isDone(b);
    return `<button style="background:${sel ? INK : done ? AMB : '#fff'};color:${sel ? '#fff' : INK};box-shadow:${sel ? 'none' : 'inset 0 0 0 1px rgba(35,24,21,.3)'}"
      aria-pressed="${sel}" ${on(() => setIdx(i))}>${b.room} · ${esc(surname(b))}</button>`;
  }).join('');
  const whoBlock = b => `
    <div class="who">
      <div><div style="font-size:12px;color:var(--muted)">${mkRef(b)}</div><h2>${esc(b.name)}</h2><div class="type">${typeTxt(b)}</div></div>
      <div class="room">${b.room}</div>
    </div>`;

  function checkin() {
    const st = state;
    const arrs = bookings().filter(b => sK(b) === T).sort((a, c) => a.room - c.room || (a.bed || 0) - (c.bed || 0));
    const head = `<div class="desk-h"><b>Arriving today</b><span>${arrs.length} bookings · ${arrs.filter(b => !st.keyDone[b.id]).length} still to collect a key</span></div>`;
    if (!arrs.length) return `${deskBar()}${head}<div class="main empty">No arrivals today.</div>${deskTabs('checkin')}`;
    const ii = Math.min(st.inIdx, arrs.length - 1), a = arrs[ii], aid = a.id;
    const kNo = st.keyNo[aid] ?? (a.type === 'fam' ? `K-${a.room}` : `K-${a.room}-${a.bed}`);
    const matOk = !!st.matOk[aid], done = st.keyDone[aid];
    const email = a.email || (a.type === 'fam' ? surname(a) + ' family' : a.name).toLowerCase().replace(/\s+/g, '.') + '@mail.com';
    return `
      ${deskBar()}
      ${head}
      <div class="chips">${chips(arrs, ii, b => !!st.keyDone[b.id], i => setState({ inIdx: i }))}</div>
      <div class="main pad" style="padding:18px 20px;gap:16px">
        ${whoBlock(a)}
        <div class="grid2 rule-y facts">
          <div class="row1"><div class="cap">Stay</div><div class="v">${rangeTxt(sK(a), eK(a))}</div></div>
          <div class="row1"><div class="cap">Bed space</div><div class="v">${a.type === 'fam' ? `Whole room · ${D.META[a.room].cap} beds` : `Bed ${a.bed} of ${D.META[a.room].cap}`}</div></div>
          <div><div class="cap">Phone</div><div class="v sm">${esc(a.phone || D.PHONES[ii % D.PHONES.length])}</div></div>
          <div><div class="cap">Email</div><div class="v sm">${esc(email)}</div></div>
          <div class="wide"><div class="cap">Church</div><div class="v">${esc(a.church || '—')}</div></div>
        </div>
        <div>
          <button class="step" role="checkbox" aria-checked="${matOk}" ${done ? 'disabled' : on(toggle('matOk', aid))} style="min-height:50px">
            <span class="box ${matOk ? 'on' : ''}">${matOk ? ICON.check : ''}</span>
            <span class="lbl">Give ${matWord(mats(a))}</span>
            <span class="state">${matOk ? 'Given' : 'Tap'}</span>
          </button>
          <div class="step key">
            <span class="box">2</span>
            <label for="f-key" class="lbl">Key tag</label>
            <input class="input" id="f-key" value="${esc(kNo)}" ${done ? 'disabled' : ''} ${onInput(e => { const v = e.target.value; setState(s => ({ keyNo: { ...s.keyNo, [aid]: v } })); })}>
          </div>
        </div>
      </div>
      <div class="foot">
        ${done
          ? `<div class="done-bar amber">${ICON.checkLg()}<div>Key ${esc(kNo)} + ${matWord(mats(a))} given · ${done}</div>
               <button class="btn" ${on(() => setState(s => { const k = { ...s.keyDone }; delete k[aid]; return { keyDone: k }; }))}>Undo</button></div>`
          : cta(`Hand over key ${esc(kNo)}`, () => setState(s => ({ keyDone: { ...s.keyDone, [aid]: now() } })), !matOk || !kNo.trim(), ICON.key)}
      </div>
      ${deskTabs('checkin')}`;
  }

  function checkout() {
    const st = state;
    const deps = bookings().filter(b => eK(b) === T && sK(b) < T).sort((x, y) => x.room - y.room || (x.bed || 0) - (y.bed || 0));
    const head = `<div class="desk-h"><b>Leaving today</b><span>${deps.length} bookings · ${deps.filter(b => !st.returned[b.id]).length} still to check out</span></div>`;
    if (!deps.length) return `${deskBar()}${head}<div class="main empty">No departures today.</div>${deskTabs('checkout')}`;
    const oi = Math.min(st.outIdx, deps.length - 1), o = deps[oi], oid = o.id;
    const oKey = o.type === 'fam' ? `K-${o.room}` : `K-${o.room}-${o.bed}`, done = st.returned[oid];
    const steps = [
      ['retKey', `Key ${oKey} returned`, ''],
      ['retMat', `${matWord(mats(o))} returned`, 'House rule 02'],
      ['retClean', o.type === 'fam' ? 'Room cleaned up' : 'Bed space cleaned up', 'House rule 01']
    ].map(([k, label, rule]) => ({ k, label, rule, ok: !!st[k][oid] }));
    const short = o.type === 'fam' ? `room ${o.room}` : `bed ${o.bed}, room ${o.room}`;
    return `
      ${deskBar()}
      ${head}
      <div class="chips">${chips(deps, oi, b => !!st.returned[b.id], i => setState({ outIdx: i }))}</div>
      <div class="main pad" style="padding:18px 20px;gap:16px">
        ${whoBlock(o)}
        <div class="grid2 rule-y facts">
          <div><div class="cap">Stayed</div><div class="v">${rangeTxt(sK(o), eK(o))}</div></div>
          <div><div class="cap">To collect</div><div class="v">1 key · ${matWord(mats(o))}</div></div>
        </div>
        <div style="border-top:2px solid var(--line)">
          ${steps.map(s => `
            <button class="step" role="checkbox" aria-checked="${s.ok}" ${done ? 'disabled' : on(toggle(s.k, oid))}>
              <span class="box ${s.ok ? 'on' : ''}">${s.ok ? ICON.check : ''}</span>
              <span class="lbl"><span>${s.label}</span>${s.rule ? `<span class="rule">${s.rule}</span>` : ''}</span>
              <span class="state">${s.ok ? 'Done' : 'Tap'}</span>
            </button>`).join('')}
        </div>
      </div>
      <div class="foot">
        ${done
          ? `<div class="done-bar ink">${ICON.checkLg(AMB)}<div>${o.type === 'fam' ? 'Room ' + o.room : 'Bed ' + o.bed + ' in ' + o.room} is available again · ${done}</div>
               <button class="btn" style="border-color:rgba(255,255,255,.5)" ${on(() => setState(s => { const k = { ...s.returned }; delete k[oid]; return { returned: k }; }))}>Undo</button></div>`
          : cta(`Check out ${short}`, () => setState(s => ({ returned: { ...s.returned, [oid]: now() } })), !steps.every(s => s.ok))}
      </div>
      ${deskTabs('checkout')}`;
  }

  // ── Render loop ─────────────────────────────────────────────────────────
  const SCREENS = { welcome, rules, type, days, rooms, details, confirmed, calendar, dayview, checkin, checkout };
  const TITLES = { welcome: 'Gilgal Ground Chalets', calendar: 'Front desk', dayview: 'Front desk · Days', checkin: 'Front desk · Check in', checkout: 'Front desk · Check out' };
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

  const initial = location.hash.replace(/^#\/?/, '');
  // Deep links into the guest flow past the rules start over; front desk screens open directly.
  if (DESK.includes(initial) || initial === 'rules') state.screen = initial;
  history.replaceState(null, '', '#/' + state.screen);
  render();
})();
