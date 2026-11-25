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
const A = await browser('A', 9531);
await A.cmd('Page.navigate', { url: URL }); await sleep(1000);
await A.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-howskip','1');localStorage.setItem('frm-names',JSON.stringify(['Ae','Bee']));localStorage.setItem('frm-music',JSON.stringify({on:false}));localStorage.setItem('frm-deck',JSON.stringify({mode:'one',level:3}))`);
await A.cmd('Page.navigate', { url: URL }); await sleep(1800);
await A.click('#start'); await sleep(400);
await A.ev(`__T.force('L3-01')`); await sleep(200);
const look = () => A.ev(`(()=>{const q=s=>document.querySelector(s);const big=q('#card .ctext').textContent,small=(q('#card .cen')||{}).textContent;
const btn=q('#ctl button');const kids=[...btn.childNodes].map(n=>n.nodeType===3?'text':n.className);
const fs=e=>e?getComputedStyle(e).fontSize:'-';
return JSON.stringify({body:document.body.className,lang:q('#langP').textContent,big:big.slice(0,40),small:(small||'').slice(0,40),btn:kids,btnTh:fs(btn.querySelector('.th')),btnEn:fs(btn.querySelector('.en')),who:[...q('#who').childNodes].map(n=>n.className||'text')})})()`);
console.log('TH :', await look()); await A.shot('th');
await A.click('#langP'); await sleep(300);
console.log('EN :', await look()); await A.shot('en');
await A.click('#ctl [data-a=red]'); await sleep(200); await A.shot('en-red'); await A.click('#ovbody [data-o=cont]'); await sleep(200);
await A.ev(`__T.force('L2-03')`); await sleep(200); console.log('EN next card:', await look());
await A.click('#langP'); await sleep(300);
console.log('TH again:', await look());
// bonus buttons still work in English (data-b clicks)
await A.click('#langP'); await sleep(200); await A.click('#toSetup'); await sleep(300); await A.click('#toBonus'); await sleep(800);
console.log('bonus title:', await A.ev(`document.getElementById('b-t').textContent`), '| lang btn:', await A.ev(`document.getElementById('langA').textContent`));
await A.click('#hub [data-h=massage]'); await sleep(500); await A.shot('bonus-en');
const b = await A.ev(`(()=>{const x=document.querySelector('#bxc [data-b]');if(!x)return 'no data-b button';const before=document.getElementById('bxc').innerHTML.length;const inner=x.querySelector('[data-bl]')||x;inner.click();return 'clicked '+x.dataset.b})()`); console.log('bonus button:', b); await sleep(400); await A.shot('bonus-after');
console.log('errors:', errors.length ? errors.join('\n') : 'none');
A.ws.close(); A.edge.kill(); process.exit(0);
