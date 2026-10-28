/* Local preview: `node dev-server.js`, then open http://localhost:3000 (front desk at /admin).
   Bookings are kept in memory until you stop it. The admin password is ADMIN_PASSWORD, or gilgal-admin. */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const api = require('./api/router');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://local');
  if (pathname === '/api/router') return api(req, res);
  const rel = pathname === '/' || pathname === '/admin' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) || /(^|[\\/])(\.|api[\\/]|dev-server)/.test(rel)) { res.statusCode = 404; return res.end('Not found'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(PORT, () => console.log(`Gilgal Ground Chalets on http://localhost:${PORT}  (front desk: /admin)`));
