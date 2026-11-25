import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = process.argv[2], URL = process.argv[3];
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
async function browser(name, port) {
  const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${OUT}/prof-${name}`, '--window-size=420,900', 'about:blank'], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 40; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = l.find(t => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(250); }
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {};
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') errors.push(name + ': ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text)); };
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) errors.push(name + ' eval ' + expr.slice(0, 60) + ' => ' + r.result.exceptionDetails.exception?.description); return r.result?.result?.value; };
  let n = 0;
  const shot = async label => { await sleep(500); const r = await cmd('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}-${String(++n).padStart(2, '0')}-${label}.png`, Buffer.from(r.result.data, 'base64')); };
  const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw new Error('missing ${sel.replace(/'/g,'')}');e.click();return 1})()`);
  await cmd('Runtime.enable'); await cmd('Page.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  return { edge, ws, ev, shot, click, cmd };
}
const cs = b => b.ev(`JSON.stringify({scr:document.querySelector('.scr.on')?.id,t:document.getElementById('bxt')?.textContent,secret:[...document.querySelectorAll('#bxc .secret h3')].map(h=>h.textContent),env:document.querySelectorAll('#bxc .env').length,pub:document.querySelectorAll('#bxc [id^=pub]').length,btns:[...document.querySelectorAll('#bxc [data-b]')].filter(x=>!x.disabled).map(x=>x.dataset.b).join(','),stamp:document.querySelector('#done .stamp')?.textContent||null,rstat:document.querySelector('.rstat')?.textContent||null})`);
const A = await browser('A', 9541), B = await browser('B', 9542);
const prep = async (X, names) => { await X.cmd('Page.navigate', { url: URL }); await sleep(1000); await X.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-howskip','1');${names?`localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));`:''}localStorage.setItem('frm-music',JSON.stringify({on:false}))`); };
await prep(A, true); await A.cmd('Page.navigate', { url: URL }); await sleep(1500);
// --- single device: every case renders, and a full run of case 1 ---
await A.click('#toBonus'); await sleep(800); await A.click('[data-h=cases]'); await sleep(300);
console.log('list items', await A.ev(`document.querySelectorAll('#bxc [data-b^=c]').length`), '| hub title', await A.ev(`document.getElementById('bxt').textContent`));
await A.shot('list');
const all = await A.ev(`(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));const out=[];for(let k=0;k<20;k++){
 document.querySelector('[data-b=c'+k+']').click();await s(10);document.querySelector('[data-b=go]').click();for(let i=0;i<3;i++){document.querySelector('[data-b=clue]').click();await s(5)}
 document.querySelector('[data-b=ask]').click();await s(5);out.push(document.querySelectorAll('#bxc .opt').length);document.getElementById('bxBack').click();await s(10)}return out.join(',')})()`);
console.log('opts per case (4+4+4=12 expected):', all);
await A.click('[data-b=c0]'); await sleep(200); await A.shot('brief'); await A.click('[data-b=go]'); await sleep(200);
await A.click('[data-b=sv0]'); await sleep(200); await A.shot('envelope-open'); console.log('single intel', await cs(A));
await A.click('[data-b=sv0]'); for (let i = 0; i < 3; i++) await A.click('[data-b=clue]'); await A.click('[data-b=ask]'); await sleep(200);
await A.click('[data-b=w3]'); await A.click('[data-b=h0]'); await A.click('[data-b=y1]'); await A.click('[data-b=ok0]'); await A.click('[data-b=ok1]'); await A.shot('answer');
await A.click('[data-b=reveal]'); await sleep(300); console.log('single done', (await cs(A))); await A.shot('done');
// --- two devices ---
await A.click('#bxBack'); await sleep(200); await A.click('#bonusBack'); await sleep(300);
await A.click('#toRoom'); await sleep(300); await A.click('[data-r=create]'); await sleep(1500);
const code = await A.ev(`document.querySelector('.rcode')?.textContent.replace(/[^0-9]/g,'')`);
await prep(B, false); await B.cmd('Page.navigate', { url: 'about:blank' }); await sleep(200); await B.cmd('Page.navigate', { url: URL + '#join=' + code }); await sleep(2500);
console.log('room', code, '| B', await B.ev(`document.querySelector('.rstat')?.textContent`));
await A.click('[data-r=setup]'); await sleep(300); await A.click('#toBonus'); await sleep(800); await A.click('[data-h=cases]'); await sleep(300);
console.log('B while host on list', await cs(B));
await A.click('[data-b=c4]'); await sleep(1200);
console.log('B after host opens case 5', await cs(B)); await B.shot('duo-brief');
await B.click('[data-b=go]'); await sleep(800);
console.log('A intel', await cs(A)); console.log('B intel', await cs(B)); await B.shot('duo-intel-B'); await A.shot('duo-intel-A');
for (let i = 0; i < 3; i++) { await B.click('[data-b=clue]'); await sleep(400); }
await B.click('[data-b=ask]'); await sleep(600);
await A.click('[data-b=w2]'); await sleep(300); await B.click('[data-b=h1]'); await sleep(300); await A.click('[data-b=y0]'); await sleep(400);
await A.click('[data-b=ok]'); await sleep(400); await B.click('[data-b=ok]'); await sleep(500);
console.log('A ans', await cs(A)); console.log('B ans', await cs(B)); await B.shot('duo-answer-B');
await B.click('[data-b=y1]'); await sleep(500); console.log('after B changes answer, ok reset?', await A.ev(`document.querySelector('[data-b=reveal]').disabled`));
await B.click('[data-b=y0]'); await sleep(400); await A.click('[data-b=ok]'); await sleep(400); await B.click('[data-b=ok]'); await sleep(400);
await B.click('[data-b=reveal]'); await sleep(800);
console.log('A done', await cs(A)); console.log('B done', await cs(B)); await B.shot('duo-done-B');
await A.click('[data-b=list]'); await sleep(800); console.log('B after host back to list', await cs(B));
console.log('errors:', errors.length ? errors : 'none');
A.edge.kill(); B.edge.kill(); process.exit(0);
