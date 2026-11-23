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
const A = await browser('A', 9481);
await A.cmd('Page.navigate', { url: URL }); await sleep(1000);
await A.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));localStorage.setItem('frm-music',JSON.stringify({on:false}));localStorage.setItem('frm-deck',JSON.stringify({mode:'mix',lvls:[1,2,3,4]}))`);
await A.cmd('Page.navigate', { url: URL }); await sleep(1500);
let res='';for(let gg=0;gg<6;gg++){ res = await A.ev(`(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));let back2back=0,specials=0,notesOnSpecial=0,games=0,seen={};
for(let g=0;g<1;g++){document.getElementById('start').click();await s(20);games++;let prev=null;
 for(let i=0;i<200;i++){if(document.getElementById('ov').classList.contains('on')){const b=document.querySelector('#ovbody [data-o=skip]')||document.querySelector('#ovbody [data-o=stay]');if(b){b.click();await s(3);continue}break}
  const c=__T.S.card;if(!c)break;if(c.l===0){specials++;seen[c.code]=1;if(prev&&prev.l===0)back2back++;if(!document.getElementById('cnote').hidden)notesOnSpecial++}prev=c;
  const a=[...document.querySelectorAll('#ctl button')].map(b=>b.dataset.a);
  if(a.includes('green')){document.querySelector('#ctl [data-a=green]').click();await s(1);const n=document.querySelector('#ctl [data-a=next]');if(n)n.click()}
  else if(a.includes('sp'))document.querySelector('#ctl [data-a=sp]').click();else if(a.includes('next'))document.querySelector('#ctl [data-a=next]').click();else break;await s(2)}
 document.getElementById('toSetup').click();await s(20)}
return JSON.stringify({games,specials,distinct:Object.keys(seen).length,back2back,notesOnSpecial})})()`);
console.log('game',gg+1, res);}
console.log('errors:', errors.length ? errors : 'none');
A.edge.kill(); process.exit(0);
