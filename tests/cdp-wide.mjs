import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = process.argv[2], URL = process.argv[3];
mkdirSync(OUT, { recursive: true });
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=9335', `--user-data-dir=${OUT}/prof`, '--window-size=1500,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40; i++) { try { const l = await (await fetch('http://127.0.0.1:9335/json')).json(); const p = l.find(t => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(250); }
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; const errors = [];
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) errors.push(expr.slice(0, 80) + ' => ' + r.result.exceptionDetails.exception?.description); return r.result?.result?.value; };
const shot = async name => { await sleep(600); const r = await cmd('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw new Error('missing');e.click();return 1})()`);
await cmd('Runtime.enable'); await cmd('Page.enable');
const sizes = [['desk',1440,900,false],['ipadL',1180,820,true],['ipadP',820,1180,true],['phoneL',844,390,true],['phone',390,844,true]];
for (const [nm,w,h,mob] of sizes) {
  await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: mob, screenOrientation: { type: w>h?'landscapePrimary':'portraitPrimary', angle: w>h?90:0 } });
  await cmd('Page.navigate', { url: URL }); await sleep(1200);
  await ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));localStorage.setItem('frm-music',JSON.stringify({on:false,vol:60,shuf:false,idx:0,list:[{id:'x',t:'Sweet Night R&B 💕 Romantic Bedroom Vibes | Smooth Deep Bass Playlist 04 very long title here'}]}));location.reload()`); await sleep(1500);
  await ev(`document.getElementById('mTitle').textContent='Sweet Night R&B 💕 Romantic Bedroom Vibes | Smooth Deep Bass Playlist 04';document.getElementById('mbar').hidden=false`);
  await shot(nm+'-1setup');
  const ov = await ev(`(()=>{const b=document.getElementById('mTitle').getBoundingClientRect(),p=document.getElementById('mPlay2').getBoundingClientRect();return {titleRight:Math.round(b.right),playLeft:Math.round(p.left),hscroll:document.documentElement.scrollWidth>innerWidth}})()`);
  console.log(nm, JSON.stringify(ov));
  await click('#start'); await sleep(900); await shot(nm+'-2play');
  await click('#toSetup'); await sleep(300); await click('#toBonus'); await sleep(900); await shot(nm+'-3hub');
}
console.log('errors:', errors.length ? errors : 'none');
ws.close(); edge.kill(); process.exit(0);
