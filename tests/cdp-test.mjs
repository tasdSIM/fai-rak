// Drives headless Edge over CDP through the bonus games and saves screenshots.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = process.argv[2], URL = process.argv[3];
mkdirSync(OUT, { recursive: true });
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=9333', `--user-data-dir=${OUT}/prof`, '--window-size=420,900', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40; i++) { try { const l = await (await fetch('http://127.0.0.1:9333/json')).json(); const p = l.find(t => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(250); }
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; const errors = [];
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map(a => a.value).join(' ')); };
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) errors.push(expr + ' => ' + r.result.exceptionDetails.exception?.description); return r.result?.result?.value; };
let n = 0;
const shot = async name => { await sleep(500); const r = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: undefined });
  writeFileSync(`${OUT}/${String(++n).padStart(2, '0')}-${name}.png`, Buffer.from(r.result.data, 'base64')); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw new Error('missing ${sel.replace(/'/g, '')}');e.click();return 1})()`);
await cmd('Runtime.enable'); await cmd('Page.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await cmd('Page.navigate', { url: URL }); await sleep(1500);
await ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));location.reload()`); await sleep(1500);
await shot('setup');
await click('#toBonus'); await sleep(600); await shot('hub');
// 1 massage
await click('[data-h=massage]'); await shot('massage-setup');
await click('[data-b=l10]'); await click('[data-b=go]'); await shot('massage-step1');
for (let i = 0; i < 4; i++) await click('[data-b=next]');
await click('[data-b=next]'); await shot('massage-done');
await click('[data-b=menu]');
// 2 nights
await click('[data-h=nights]'); await shot('nights-list');
await click('[data-b=n0]'); for (let j = 0; j < 3; j++) await click(`[data-b=t${j}]`); await shot('night1');
await click('[data-b=done]'); await click('[data-b=list]'); await shot('nights-after');
await click('#bxBack');
// 3 cases
await click('[data-h=cases]'); await shot('cases-list');
await click('[data-b=c0]'); for (let j = 0; j < 6; j++) await click('[data-b=clue]'); await shot('case-clues');
await click('[data-b=p01]'); await click('[data-b=p12]'); await shot('case-guess');
await click('[data-b=reveal]'); await shot('case-reveal');
await click('[data-b=list]'); await click('#bxBack');
// 4 dates
await click('[data-h=dates]'); await shot('dates-list');
await click('[data-b=d5]'); await shot('date-casino');
await click('[data-b=play]'); await sleep(400);
const lvl = await ev(`document.querySelector('.lv[aria-pressed=true]')?.dataset.l`);
await shot('setup-after-theme');
console.log('level after theme:', lvl);
console.log('errors:', errors.length ? errors : 'none');
ws.close(); edge.kill();
process.exit(0);
