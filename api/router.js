/* Gilgal Ground Chalets API — one Vercel function, routed by ?route=.

   Public:  GET  availability          bookings without guest details, for the room picker
            POST bookings              create a booking (re-checks the room is still free)
   Admin:   POST login / POST logout / GET session
            GET  bookings              every booking with guest details
            PATCH bookings&id=…        check-in / check-out progress
            DELETE bookings&id=…       cancel a booking

   Storage: Upstash Redis over REST (add it from Vercel → Storage; it sets the env vars).
   Without it, local runs fall back to memory; hosted deploys refuse to run. */
'use strict';

const crypto = require('crypto');
const GG = require('../lib/core');

const HOSTED = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';
// Vercel's Upstash integration names these KV_REST_API_*, or <PREFIX>_KV_REST_API_* when a
// custom prefix was chosen while connecting; Upstash's own console uses UPSTASH_REDIS_REST_*.
const envEnding = suffix => {
  const exact = ['KV_' + suffix, 'UPSTASH_REDIS_' + suffix].find(k => process.env[k]);
  if (exact) return process.env[exact];
  const k = Object.keys(process.env).find(n => n.endsWith('_' + suffix) && !n.includes('READ_ONLY') && process.env[n]);
  return k ? process.env[k] : '';
};
const REDIS_URL = envEnding('REST_API_URL') || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = envEnding('REST_API_TOKEN') || process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'Admin').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (HOSTED ? '' : 'gilgal-admin');
const COOKIE = 'gg_admin';
const SESSION_HOURS = 12;

// ── Storage ───────────────────────────────────────────────────────────────
const memory = { hash: new Map(), kv: new Map() };

async function redis(...cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const data = await r.json();
  if (!r.ok || data.error) throw new Error('Database error: ' + (data.error || r.status));
  return data.result;
}

const store = REDIS_URL && REDIS_TOKEN ? {
  async all() {
    const flat = (await redis('HGETALL', 'gg:bookings')) || [];
    const out = [];
    for (let i = 1; i < flat.length; i += 2) out.push(JSON.parse(flat[i]));
    return out;
  },
  async get(id) { const v = await redis('HGET', 'gg:bookings', id); return v ? JSON.parse(v) : null; },
  async put(b) { await redis('HSET', 'gg:bookings', b.id, JSON.stringify(b)); },
  async del(id) { await redis('HDEL', 'gg:bookings', id); },
  async seq() { return redis('INCR', 'gg:seq'); },
  async lock() { return (await redis('SET', 'gg:lock', '1', 'NX', 'PX', '5000')) === 'OK'; },
  async unlock() { await redis('DEL', 'gg:lock'); },
  async hit(key, ttl) { const n = await redis('INCR', key); if (n === 1) await redis('EXPIRE', key, String(ttl)); return n; }
} : HOSTED ? null : {
  async all() { return [...memory.hash.values()].map(v => JSON.parse(v)); },
  async get(id) { const v = memory.hash.get(id); return v ? JSON.parse(v) : null; },
  async put(b) { memory.hash.set(b.id, JSON.stringify(b)); },
  async del(id) { memory.hash.delete(id); },
  async seq() { const n = (memory.kv.get('seq') || 0) + 1; memory.kv.set('seq', n); return n; },
  async lock() { if (memory.kv.get('lock')) return false; memory.kv.set('lock', 1); return true; },
  async unlock() { memory.kv.delete('lock'); },
  async hit(key) { const n = (memory.kv.get(key) || 0) + 1; memory.kv.set(key, n); return n; }
};

// ── Admin session: HMAC-signed expiry in an HttpOnly cookie ───────────────
const sessionKey = () => crypto.createHash('sha256').update('gilgal-session:' + (process.env.ADMIN_SESSION_SECRET || '') + ADMIN_PASSWORD).digest();
const sign = v => crypto.createHmac('sha256', sessionKey()).update(v).digest('base64url');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
function isAdmin(req) {
  if (!ADMIN_PASSWORD) return false;
  const m = /(?:^|;\s*)gg_admin=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const [exp, sig] = decodeURIComponent(m[1]).split('.');
  return Number(exp) > Date.now() && safeEqual(sig, sign(exp));
}
function setSession(res, on) {
  const secure = HOSTED ? '; Secure' : '';
  if (!on) return res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
  const exp = String(Date.now() + SESSION_HOURS * 3600e3);
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(exp + '.' + sign(exp))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}${secure}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 1e5) throw new Error('Body too large'); }
  return raw ? JSON.parse(raw) : {};
}
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const PUBLIC_FIELDS = ['id', 'room', 'start', 'end', 'type', 'g', 'size', 'bed'];
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, o[k]]));

// ── Routes ────────────────────────────────────────────────────────────────
async function createBooking(body) {
  const type = body.type === 'fam' ? 'fam' : body.type === 'ind' ? 'ind' : null;
  const room = Number(body.room), start = body.start, end = body.end;
  const name = text(body.name, 80), church = text(body.church, 80), email = text(body.email, 120), phone = text(body.phone, 30);
  const size = Number(body.size), g = body.gender;
  const bad = msg => ({ status: 400, data: { error: msg } });
  if (!type) return bad('Choose family or individual.');
  if (type === 'fam' && ![4, 5].includes(size)) return bad('A family booking is for 4 or 5 people.');
  if (type === 'ind' && !['F', 'M'].includes(g)) return bad('Choose female or male.');
  if (!GG.META[room]) return bad('Choose a room.');
  const stayErr = GG.checkStay(start, end);
  if (stayErr) return bad(stayErr);
  if (!name || !church || !email || !phone) return bad('Fill in your name, church, email and phone number.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Check your email address.');

  if (!(await store.lock())) return { status: 409, data: { error: 'Someone else is booking right now. Try again in a moment.' } };
  try {
    const all = await store.all();
    const rs = GG.roomState(room, start, end, { type, size, gender: g }, all);
    if (!rs.ok) return { status: 409, data: { error: `Room ${room} isn’t available for this booking any more. Pick another room.` } };
    const n = await store.seq();
    const b = {
      id: crypto.randomUUID(), ref: `GGC-${start.slice(2, 4)}-${String(n).padStart(4, '0')}`,
      room, start, end, type, name: type === 'fam' ? `${name.split(/\s+/).pop()} family` : name, lead: name,
      church, email, phone, createdAt: new Date().toISOString()
    };
    if (type === 'fam') b.size = size;
    else { b.g = g; b.bed = GG.assignBed(room, start, end, all); }
    await store.put(b);
    return { status: 201, data: b };
  } finally {
    await store.unlock();
  }
}

async function updateBooking(id, body) {
  const b = await store.get(id);
  if (!b) return { status: 404, data: { error: 'Booking not found.' } };
  for (const k of ['matOk', 'retKey', 'retMat', 'retClean']) if (typeof body[k] === 'boolean') b[k] = body[k];
  if (typeof body.keyNo === 'string') b.keyNo = text(body.keyNo, 20);
  if (typeof body.keyDone === 'boolean') {
    if (body.keyDone && !b.matOk) return { status: 400, data: { error: 'Give the mattress first.' } };
    b.keyDone = body.keyDone ? new Date().toISOString() : null;
  }
  if (typeof body.returned === 'boolean') {
    if (body.returned && !(b.retKey && b.retMat && b.retClean)) return { status: 400, data: { error: 'Tick every check-out step first.' } };
    b.returned = body.returned ? new Date().toISOString() : null;
  }
  await store.put(b);
  return { status: 200, data: b };
}

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://local');
    const route = url.searchParams.get('route') || '';
    const id = url.searchParams.get('id') || '';
    const method = req.method;

    if (route === 'session' && method === 'GET') return send(res, 200, { admin: isAdmin(req), today: GG.today() });

    // Setup check: which settings this deploy can see (names only, never values).
    if (route === 'health' && method === 'GET') {
      let database = REDIS_URL && REDIS_TOKEN ? 'connected' : HOSTED ? 'missing' : 'memory (local preview)';
      if (REDIS_URL && REDIS_TOKEN) {
        try { await redis('PING'); } catch (e) { database = 'found but not reachable: ' + e.message; }
      }
      return send(res, 200, {
        deployment: process.env.VERCEL_ENV || 'local', database,
        adminPassword: ADMIN_PASSWORD ? 'set' : 'missing',
        storageSettingsSeen: Object.keys(process.env).filter(n => /KV|REDIS|UPSTASH/i.test(n)).sort()
      });
    }

    if (!store) return send(res, 503, { error: 'The booking database isn’t connected to this deployment yet. Open /api/router?route=health to see what’s missing.' });

    if (route === 'login' && method === 'POST') {
      if (!ADMIN_PASSWORD) return send(res, 503, { error: 'Set ADMIN_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.' });
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
      if ((await store.hit(`gg:login:${ip}`, 900)) > 10) return send(res, 429, { error: 'Too many tries. Wait 15 minutes.' });
      const { username, password } = await readBody(req);
      // Username ignores case; the password must match exactly.
      const userOk = safeEqual(String(username || '').trim().toLowerCase(), ADMIN_USERNAME.toLowerCase());
      const passOk = safeEqual(password || '', ADMIN_PASSWORD);
      if (!userOk || !passOk) return send(res, 401, { error: 'Wrong username or password.' });
      setSession(res, true);
      return send(res, 200, { admin: true });
    }
    if (route === 'logout' && method === 'POST') { setSession(res, false); return send(res, 200, { admin: false }); }

    if (route === 'availability' && method === 'GET') {
      const from = GG.addDays(GG.today(), -3);
      return send(res, 200, { today: GG.today(), bookings: (await store.all()).filter(b => b.end >= from).map(b => pick(b, PUBLIC_FIELDS)) });
    }
    if (route === 'bookings' && method === 'POST') {
      const r = await createBooking(await readBody(req));
      return send(res, r.status, r.data);
    }

    if (!isAdmin(req)) return send(res, 401, { error: 'Log in to the front desk.' });
    if (route === 'bookings' && method === 'GET') return send(res, 200, { today: GG.today(), bookings: await store.all() });
    if (route === 'bookings' && method === 'PATCH') { const r = await updateBooking(id, await readBody(req)); return send(res, r.status, r.data); }
    if (route === 'bookings' && method === 'DELETE') { await store.del(id); return send(res, 200, { ok: true }); }

    return send(res, 404, { error: 'Not found.' });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'Something went wrong. Try again.' });
  }
};
