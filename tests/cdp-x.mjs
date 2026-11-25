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
const A = await browser('A', 9371), B = await browser('B', 9372);
const prep = async (X, names) => { await X.cmd('Page.navigate', { url: URL }); await sleep(1000); await X.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-howskip','1');${names?`localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));`:''}localStorage.setItem('frm-music',JSON.stringify({on:false}));localStorage.setItem('frm-deck',JSON.stringify({mode:'one',level:4}))`); };
await prep(A, true); await A.cmd('Page.navigate', { url: URL }); await sleep(1500);
console.log('chip hidden at start:', await A.ev(`document.getElementById('xchip').hidden`));
await A.ev(`(()=>{for(let i=0;i<4;i++)document.getElementById('s-t').click()})()`); console.log('4 taps -> dialog?', await A.ev(`document.getElementById('ov').classList.contains('on')`));
await A.click('#s-t'); await sleep(300); console.log('5th tap -> dialog:', await A.ev(`document.getElementById('ov-t')?.textContent`)); await A.shot('dialog');
await A.click('[data-x=on]'); console.log('no consent err:', await A.ev(`document.getElementById('xerr').textContent`));
await A.click('#xok0'); await A.click('#xok1'); await A.click('[data-x=on]'); await sleep(800);
console.log('after on: chip shown', await A.ev(`!document.getElementById('xchip').hidden`), 'stored', await A.ev(`localStorage.getItem('frm-crude')`)); await A.shot('setup-chip');
// find a strong-word card on level 4
const findX = X => X.ev(`(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));const xt=await (await fetch('cards-x.json')).json();
 for(let i=0;i<60;i++){const code=document.querySelector('#card .chead span:nth-child(2)')?.textContent.split(' ')[0];const txt=document.querySelector('#card .ctext')?.textContent;
  if(xt[code])return JSON.stringify({code,shown:txt,match:txt===xt[code]});
  const a=[...document.querySelectorAll('#ctl button')].map(b=>b.dataset.a);if(a.includes('green')){document.querySelector('#ctl [data-a=green]').click();await s(2);document.querySelector('#ctl [data-a=next]').click()}else if(a.includes('sp'))document.querySelector('#ctl [data-a=sp]').click();else return 'stuck '+a;await s(5)}return 'none found'})()`);
await A.click('#start'); await sleep(500); const fx = await findX(A); console.log('single device strong card:', fx); await A.shot('play-strong');
// turn off from the chip -> same card shows normal text
await A.click('#toSetup'); await sleep(200); await A.click('#xchip'); await sleep(200); await A.click('[data-x=off]'); await sleep(200);
console.log('after off: chip hidden', await A.ev(`document.getElementById('xchip').hidden`));
// two devices: host turns it on, guest must show the strong text too
await A.ev(`(()=>{for(let i=0;i<5;i++)document.getElementById('s-t').click()})()`); await sleep(200); await A.click('#xok0'); await A.click('#xok1'); await A.click('[data-x=on]'); await sleep(500);
await A.click('#toRoom'); await sleep(300); await A.click('[data-r=create]'); await sleep(1500);
const code = await A.ev(`document.querySelector('.rcode')?.textContent.replace(/[^0-9]/g,'')`);
await prep(B, false); await B.cmd('Page.navigate', { url: 'about:blank' }); await sleep(200); await B.cmd('Page.navigate', { url: URL + '#join=' + code }); await sleep(2500);
console.log('guest crude stored before (should be null):', await B.ev(`localStorage.getItem('frm-crude')`));
await A.click('[data-r=setup]'); await sleep(300); await A.click('#start'); await sleep(800);
const fa = await findX(A); await sleep(1500);
const gb = await B.ev(`document.querySelector('#card .ctext')?.textContent`);
console.log('host strong card:', fa); console.log('guest shows same text:', gb === JSON.parse(fa).shown, '|', gb); await B.shot('guest-strong');
console.log('errors:', errors.length ? errors : 'none');
A.edge.kill(); B.edge.kill(); process.exit(0);
