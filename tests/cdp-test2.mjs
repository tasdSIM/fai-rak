// Music + hot massage walkthrough in headless Edge over CDP.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = process.argv[2], URL = process.argv[3];
mkdirSync(OUT, { recursive: true });
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=9334', `--user-data-dir=${OUT}/prof`, '--autoplay-policy=no-user-gesture-required', '--window-size=420,900', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40; i++) { try { const l = await (await fetch('http://127.0.0.1:9334/json')).json(); const p = l.find(t => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(250); }
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; const errors = [];
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) errors.push(expr.slice(0, 80) + ' => ' + r.result.exceptionDetails.exception?.description); return r.result?.result?.value; };
let n = 0;
const shot = async name => { await sleep(500); const r = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${String(++n).padStart(2, '0')}-${name}.png`, Buffer.from(r.result.data, 'base64')); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw new Error('missing');e.click();return 1})()`);
await cmd('Runtime.enable'); await cmd('Page.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await cmd('Page.navigate', { url: URL }); await sleep(1500);
await ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));location.reload()`); await sleep(2500);
// first tap anywhere starts music
await click('#n0'); await sleep(7000);
console.log('after first tap:', await ev(`JSON.stringify({ready:typeof YT!=='undefined', state: (()=>{try{return document.querySelector('#ytp')&&window.YT&&YT.get?1:0}catch(e){return -1}})(), title: document.getElementById('mTitle').textContent, sub: document.getElementById('mSub').textContent, eq: document.getElementById('mEq').className})`));
await shot('setup-bar');
await click('#mOpen'); await sleep(1500); await shot('music-sheet');
// add a custom link and a playlist link
await ev(`document.getElementById('mUrl').value='https://youtu.be/0V9A8Lfslnc?si=abc';document.getElementById('mAdd').click()`); await sleep(6000);
await ev(`document.getElementById('mUrl').value='not a link';document.getElementById('mAdd').click()`);
console.log('bad link msg:', await ev(`document.getElementById('mErr').textContent`));
console.log('after add:', await ev(`JSON.stringify({title: document.getElementById('mTitle').textContent, sub: document.getElementById('mSub').textContent, n: JSON.parse(localStorage.getItem('frm-music')).list.length, idx: JSON.parse(localStorage.getItem('frm-music')).idx})`));
await shot('music-added');
await click('#mNext'); await sleep(5000);
console.log('after next:', await ev(`JSON.stringify({title: document.getElementById('mTitle').textContent, idx: JSON.parse(localStorage.getItem('frm-music')).idx})`));
await click('#mClose'); await sleep(400);
// hot massage
await click('#toBonus'); await sleep(800); await click('[data-h=massage]'); await sleep(300);
await click('[data-b=mhot]'); await click('[data-b=l30]'); await shot('massage-hot-setup');
await click('[data-b=go]'); await shot('massage-hot-step1');
for (let i = 0; i < 4; i++) await click('[data-b=next]');
await shot('massage-hot-step5');
console.log('errors:', errors.length ? errors : 'none');
ws.close(); edge.kill(); process.exit(0);
