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
const A = await browser('A', 9541);
await A.cmd('Page.navigate', { url: URL }); await sleep(1000);
await A.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-names',JSON.stringify(['Ae','Bee']));localStorage.setItem('frm-music',JSON.stringify({on:false}));localStorage.setItem('frm-deck',JSON.stringify({mode:'one',level:2}))`);
await A.cmd('Page.navigate', { url: URL }); await sleep(1800);
const scr = () => A.ev(`document.querySelector('.scr.on').id`);
const fullShot = async label => { const h = await A.ev(`document.documentElement.scrollHeight`); await A.cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 1, mobile: true }); await A.shot(label); await A.cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); };
await A.click('#start'); await sleep(400);
console.log('1 start (first time) ->', await scr(), '| skip shown:', await A.ev(`!document.getElementById('howSkip').hidden`), '| go:', await A.ev(`document.getElementById('howGo').textContent`));
await fullShot('how-th');
await A.click('#langH'); await sleep(300); await fullShot('how-en'); await A.click('#langH'); await sleep(200);
await A.click('#howSkip'); await sleep(400);
console.log('2 skip ->', await scr());
await A.click('#toSetup'); await sleep(300); await A.click('#start'); await sleep(400);
console.log('3 start again (not ticked) ->', await scr());
await A.click('#howNo'); await A.click('#howGo'); await sleep(400);
console.log('4 tick + go ->', await scr(), '| stored:', await A.ev(`localStorage.getItem('frm-howskip')`));
await A.click('#toSetup'); await sleep(300); await A.click('#start'); await sleep(400);
console.log('5 start after ticking ->', await scr());
await A.click('#toSetup'); await sleep(300); await A.click('#toHow'); await sleep(300);
console.log('6 setup button ->', await scr(), '| skip hidden:', await A.ev(`document.getElementById('howSkip').hidden`), '| go:', await A.ev(`document.getElementById('howGo').textContent`), '| ticked:', await A.ev(`document.getElementById('howNo').checked`));
await A.click('#howNo'); await A.click('#howGo'); await sleep(300);
console.log('7 untick + back ->', await scr());
await A.click('#start'); await sleep(400);
console.log('8 start after unticking ->', await scr());
await A.click('#howBack'); await sleep(300);
console.log('9 back arrow ->', await scr());
console.log('errors:', errors.length ? errors.join('\n') : 'none');
A.ws.close(); A.edge.kill(); process.exit(0);
