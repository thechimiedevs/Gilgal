/* Gilgal Ground Chalets — rooms, open days and booking rules.
   Shared by the browser (window.GG) and the API (require('../lib/core')),
   so the room picker and the server always agree on what can be booked. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GG = factory();
})(this, function () {
  'use strict';

  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const BUILDINGS = [
    { id: 'b1', name: 'Building One', floors: [
      { name: 'Ground floor', nums: range(101, 108), note: 'Entrance · Stairs', cap: 4 },
      { name: 'Upper floor', nums: range(111, 118), note: 'Stairs', cap: 4 } ] },
    { id: 'b2', name: 'Building Two', floors: [
      { name: 'Single floor', nums: range(201, 210), note: 'Entrance', cap: 5 } ] }
  ];
  const META = {};
  BUILDINGS.forEach(b => b.floors.forEach(f => f.nums.forEach(n => (META[n] = { b: b.name, f: f.name, cap: f.cap }))));
  const ALL = BUILDINGS.flatMap(b => b.floors.flatMap(f => f.nums));
  const TOTAL = ALL.reduce((a, n) => a + META[n].cap, 0);
  const TIME_ZONE = 'Africa/Lagos';
  const MAX_DAYS_AHEAD = 190;

  // ── Dates are 'YYYY-MM-DD' strings in Lagos time ──────────────────────
  const toDate = iso => new Date(iso + 'T12:00:00Z');
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const dow = s => toDate(s).getUTCDay(); // 0 Sun … 6 Sat
  const isOpen = s => [5, 6, 0].includes(dow(s)); // Fri, Sat, Sun
  const weekendOf = s => addDays(s, -({ 5: 0, 6: 1, 0: 2 }[dow(s)] ?? 99)); // that weekend's Friday
  const isISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(toDate(s)) === s;
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const daysIn = (s, e) => { const out = []; for (let d = s; d <= e; d = addDays(d, 1)) out.push(d); return out; };
  const nextOpen = (s, step = 1) => { let d = s; while (!isOpen(d)) d = addDays(d, step); return d; };
  const sundayOf = s => addDays(weekendOf(s), 2);

  const covers = (b, d) => b.start <= d && d <= b.end;
  const overlaps = (b, s, e) => b.start <= e && b.end >= s;

  // Who can use room n from s to e? Mirrors the rules guests see on the room picker.
  function roomState(n, s, e, opt, bookings) {
    const cap = META[n].cap;
    const ov = bookings.filter(b => b.room === n && overlaps(b, s, e));
    const inds = ov.filter(b => b.type === 'ind'), lockG = inds[0] ? inds[0].g : null;
    let used = 0;
    for (const d of daysIn(s, e)) used = Math.max(used, inds.filter(b => covers(b, d)).length);
    const lock = lockG ? (lockG === 'F' ? 'Women' : 'Men') : '';
    if (ov.some(b => b.type === 'fam')) return { ok: false, used: cap, cap, label: 'Family', lock: '' };
    if (opt.type === 'fam') {
      if (ov.length) return { ok: false, used, cap, label: 'Shared', lock };
      if (cap < opt.size) return { ok: false, used: 0, cap, label: `Only ${cap} beds`, lock: '' };
      return { ok: true, used: 0, cap, label: 'Available', lock: '' };
    }
    if (lockG && lockG !== opt.gender) return { ok: false, used, cap, label: lockG === 'F' ? 'Women only' : 'Men only', lock };
    if (used >= cap) return { ok: false, used, cap, label: 'Full', lock };
    return { ok: true, used, cap, label: `${cap - used} available`, lock };
  }

  // Lowest bed number not held by an overlapping individual booking.
  function assignBed(n, s, e, bookings) {
    const taken = new Set(bookings.filter(b => b.room === n && b.type === 'ind' && overlaps(b, s, e)).map(b => b.bed));
    for (let i = 1; i <= META[n].cap; i++) if (!taken.has(i)) return i;
    return null;
  }

  // Returns an error message, or '' when the stay is bookable.
  function checkStay(s, e, now = today()) {
    if (!isISO(s) || !isISO(e)) return 'Choose your days.';
    if (!isOpen(s) || !isOpen(e)) return 'We’re only open Friday to Sunday.';
    if (e < s) return 'Your last day is before your first day.';
    if (weekendOf(s) !== weekendOf(e)) return 'A stay has to be within one weekend.';
    if (s < now) return 'That day has already passed.';
    if (s > addDays(now, MAX_DAYS_AHEAD)) return 'That’s too far ahead to book yet.';
    return '';
  }

  return {
    BUILDINGS, META, ALL, TOTAL, TIME_ZONE, MAX_DAYS_AHEAD,
    toDate, iso, addDays, dow, isOpen, weekendOf, isISO, today, daysIn, nextOpen, sundayOf,
    covers, overlaps, roomState, assignBed, checkStay
  };
});
