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
const A = await browser('A', 9501);
await A.cmd('Page.navigate', { url: URL }); await sleep(1000);
await A.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));localStorage.setItem('frm-music',JSON.stringify({on:false}));localStorage.setItem('frm-deck',JSON.stringify({mode:'one',level:3}))`);
await A.cmd('Page.navigate', { url: URL }); await sleep(1800);
await A.shot('setup');
await A.click('#start'); await sleep(400);
// every card shows its English line
const all = await A.ev(`(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));const codes=(await (await fetch('cards.json')).json()).map(r=>r[0]);const miss=[];
for(const k of codes){__T.force(k);await s(1);const en=document.querySelector('#card .cen');if(!en||!en.textContent.trim())miss.push(k)}return JSON.stringify({checked:codes.length,missing:miss})})()`);
console.log('English line on every card:', all);
await A.ev(`__T.force('L3-01')`); await sleep(200); await A.shot('card-normal');
console.log('who/whoto:', await A.ev(`document.getElementById('who').textContent+' | '+document.getElementById('whoto').textContent`));
console.log('signal buttons:', await A.ev(`[...document.querySelectorAll('#ctl button')].map(b=>b.textContent).join(' | ')`));
await A.ev(`__T.force('SP-17')`); await A.click('#ctl [data-a=sp]'); await sleep(200);
console.log('note:', await A.ev(`document.getElementById('cnote').textContent`)); await A.shot('note');
await A.click('#ctl [data-a=red]'); await sleep(200); await A.shot('red'); console.log('red overlay:', await A.ev(`document.getElementById('ov-t').textContent`)); await A.click('#ovbody [data-o=cont]'); await sleep(200);
// strong-word mode: Thai and English both switch, incl. a special card
await A.click('#toSetup'); await sleep(200);
await A.ev(`(()=>{const t=document.getElementById('s-t');for(let i=0;i<5;i++)t.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))})()`); await sleep(200);
await A.click('#xok0'); await A.click('#xok1'); await A.click('[data-x=on]'); await sleep(800);
await A.click('#start'); await sleep(300);
for (const k of ['L3-01', 'X-36', 'SP-25']) { await A.ev(`__T.force('${k}')`); await sleep(150); console.log('strong', k, '|', await A.ev(`document.querySelector('#card .ctext').textContent+' || '+document.querySelector('#card .cen').textContent`)); }
await A.shot('strong-special');
console.log('errors:', errors.length ? errors : 'none');
A.edge.kill(); process.exit(0);
