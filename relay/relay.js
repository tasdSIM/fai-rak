'use strict';
// Two-device room relay for ไฟรักไม่มอด. No dependencies: a minimal WebSocket server (RFC 6455,
// text frames only) that pairs two sockets under a 6-digit room code and forwards their messages.
// It keeps nothing on disk and logs no message contents; a room disappears once both sides
// have been gone for ROOM_IDLE_MS.
const http = require('http');
const crypto = require('crypto');

const PORT = +process.env.PORT || 8080;
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://fairuk.cpxsim.online').split(',').map(s => s.trim()).filter(Boolean);
const MAX_MSG = 32 * 1024;          // largest frame accepted
const ROOM_IDLE_MS = 10 * 60e3;     // both members gone this long: room is dropped
const ROOM_MAX_MS = 12 * 3600e3;    // hard cap on a room's life
const MAX_ROOMS = 2000;
const PING_MS = 25e3;               // keeps Cloudflare (100 s idle) from cutting the socket
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const rooms = new Map();            // code -> { born, idle, m: [{ tok, role, sock }] }
const hits = new Map();             // ip -> { n, reset } for create/join attempts

function limited(ip, max) {
  const now = Date.now();
  let h = hits.get(ip);
  if (!h || h.reset < now) { h = { n: 0, reset: now + 10 * 60e3 }; hits.set(ip, h); }
  return ++h.n > max;
}

function frame(op, payload) {
  const len = payload.length;
  let head;
  if (len < 126) head = Buffer.from([0x80 | op, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([head, payload]);
}
function send(sock, obj) {
  if (sock && !sock.destroyed && sock.writable) sock.write(frame(1, Buffer.from(JSON.stringify(obj))));
}
function closeSock(sock, code) {
  if (sock.destroyed) return;
  const b = Buffer.alloc(2); b.writeUInt16BE(code || 1000, 0);
  try { sock.end(frame(8, b)); } catch (e) { sock.destroy(); }
  setTimeout(() => sock.destroy(), 1000).unref();
}

function newCode() {
  for (let i = 0; i < 50; i++) {
    const c = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
    if (!rooms.has(c)) return c;
  }
  return null;
}
const other = (room, me) => room.m.find(x => x !== me);

function detach(sock, leaving) {
  const ref = sock.ref;
  if (!ref) return;
  sock.ref = null;
  const { room, member } = ref;
  if (member.sock === sock) member.sock = null;
  const o = other(room, member);
  if (leaving) {
    room.m = room.m.filter(x => x !== member);
    if (!room.m.length) { rooms.delete(ref.code); return; }
  }
  if (o && o.sock) send(o.sock, { t: 'peer', on: false, left: !!leaving });
  if (!room.m.some(x => x.sock)) room.idle = Date.now();
}

function attach(sock, code, room, member) {
  if (member.sock && member.sock !== sock) { member.sock.ref = null; closeSock(member.sock, 4000); }
  member.sock = sock;
  sock.ref = { code, room, member };
  room.idle = 0;
  const o = other(room, member);
  send(sock, { t: 'room', code, tok: member.tok, role: member.role, peer: !!(o && o.sock) });
  if (o && o.sock) send(o.sock, { t: 'peer', on: true });
}

function onMessage(sock, text) {
  let msg;
  try { msg = JSON.parse(text); } catch (e) { return; }
  if (!msg || typeof msg !== 'object') return;
  const ip = sock.ip;

  if (msg.t === 'msg') {
    const ref = sock.ref; if (!ref) return;
    const o = other(ref.room, ref.member);
    if (o && o.sock) send(o.sock, { t: 'msg', d: msg.d });
    return;
  }
  if (msg.t === 'leave') { detach(sock, true); return; }

  if (msg.t === 'create') {
    if (limited(ip, 40)) return send(sock, { t: 'err', e: 'rate' });
    if (rooms.size >= MAX_ROOMS) return send(sock, { t: 'err', e: 'busy' });
    const code = newCode(); if (!code) return send(sock, { t: 'err', e: 'busy' });
    detach(sock, true);
    const member = { tok: crypto.randomBytes(16).toString('hex'), role: 'host', sock: null };
    const room = { born: Date.now(), idle: 0, m: [member] };
    rooms.set(code, room);
    attach(sock, code, room, member);
    return;
  }
  if (msg.t === 'join' || msg.t === 'resume') {
    const code = String(msg.code || '');
    const room = /^\d{6}$/.test(code) && rooms.get(code);
    if (msg.t === 'resume') {
      const member = room && room.m.find(x => x.tok === msg.tok);
      if (!member) return send(sock, { t: 'err', e: 'gone' });
      if (sock.ref && sock.ref.member !== member) detach(sock, false);
      return attach(sock, code, room, member);
    }
    if (limited(ip, 60)) return send(sock, { t: 'err', e: 'rate' });
    if (!room) return send(sock, { t: 'err', e: 'nf' });
    if (room.m.length >= 2) return send(sock, { t: 'err', e: 'full' });
    detach(sock, true);
    const member = { tok: crypto.randomBytes(16).toString('hex'), role: 'guest', sock: null };
    room.m.push(member);
    attach(sock, code, room, member);
  }
}

function onData(sock, chunk) {
  sock.alive = true;
  sock.buf = sock.buf.length ? Buffer.concat([sock.buf, chunk]) : chunk;
  while (sock.buf.length >= 2) {
    const b = sock.buf, fin = b[0] & 0x80, op = b[0] & 0x0f, masked = b[1] & 0x80;
    let len = b[1] & 0x7f, off = 2;
    if (!masked) return closeSock(sock, 1002);
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) return closeSock(sock, 1009);
    if (len > MAX_MSG) return closeSock(sock, 1009);
    if (b.length < off + 4 + len) return;
    const mask = b.subarray(off, off + 4), data = Buffer.from(b.subarray(off + 4, off + 4 + len));
    for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
    sock.buf = b.subarray(off + 4 + len);
    if (!fin && op !== 0) return closeSock(sock, 1003);   // fragmented messages are never needed here
    if (op === 1) onMessage(sock, data.toString('utf8'));
    else if (op === 8) { detach(sock, false); return closeSock(sock, 1000); }
    else if (op === 9) sock.write(frame(10, data));
    else if (op === 10) sock.alive = true;
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/ws/health') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok ' + rooms.size); }
  res.writeHead(404); res.end();
});

server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key'];
  const origin = req.headers.origin || '';
  const okOrigin = ORIGINS.includes(origin) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
  if (req.url.split('?')[0] !== '/ws' || !key || String(req.headers.upgrade).toLowerCase() !== 'websocket' || !okOrigin) {
    sock.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return;
  }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  sock.setNoDelay(true);
  sock.ip = String(req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.socket.remoteAddress);
  sock.buf = Buffer.alloc(0); sock.alive = true; sock.ref = null;
  sock.on('data', c => { try { onData(sock, c); } catch (e) { sock.destroy(); } });
  sock.on('close', () => detach(sock, false));
  sock.on('error', () => sock.destroy());
  socks.add(sock); sock.on('close', () => socks.delete(sock));
});

const socks = new Set();
setInterval(() => {
  for (const s of socks) {
    if (!s.alive) { s.destroy(); continue; }
    s.alive = false;
    try { s.write(frame(9, Buffer.alloc(0))); } catch (e) { s.destroy(); }
  }
  const now = Date.now();
  for (const [code, r] of rooms) {
    if ((r.idle && now - r.idle > ROOM_IDLE_MS) || now - r.born > ROOM_MAX_MS) {
      for (const m of r.m) if (m.sock) closeSock(m.sock, 4001);
      rooms.delete(code);
    }
  }
  for (const [ip, h] of hits) if (h.reset < now) hits.delete(ip);
}, PING_MS).unref();

server.listen(PORT, () => console.log('relay listening on', PORT, 'origins', ORIGINS.join(' ')));
