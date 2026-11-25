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
// EN / ไทย on the age gate, setup and after-game screens
const A = await browser('A', 9551);
await A.cmd('Page.navigate', { url: URL }); await sleep(1000);
await A.ev(`localStorage.clear();localStorage.setItem('frm-music',JSON.stringify({on:false}));localStorage.setItem('frm-deck',JSON.stringify({mode:'one',level:2}))`);
await A.cmd('Page.navigate', { url: URL }); await sleep(1800);
const scr = () => A.ev(`document.querySelector('.scr.on').id`);
const fullShot = async label => { const h = await A.ev(`document.documentElement.scrollHeight`); await A.cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 1, mobile: true }); await A.shot(label); await A.cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); };
const lead = sel => A.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});const k=[...e.querySelectorAll('.th,.en')][0];return k?k.className+': '+k.textContent:'(no pair) '+e.textContent})()`);
console.log('gate:', await scr(), '| button', await lead('#gform .btn'));
await A.click('#langG'); await sleep(300); console.log('gate EN: button', await lead('#gform .btn')); await fullShot('gate-en');
await A.ev(`document.getElementById('by').value='2016'`); await A.click('#agree'); await A.click('#gform .btn'); await sleep(200);
console.log('too young (Western year 2016):', await A.ev(`document.getElementById('gerr').textContent`), '| still', await scr());
await A.ev(`document.getElementById('by').value='1992'`); await A.click('#gform .btn'); await sleep(500);
console.log('Western year 1992 ->', await scr());
console.log('setup EN: title', await lead('#s-t'), '| level note', await A.ev(`document.querySelector('#levels .note').textContent`), '| chip', await lead('#ex .chip'));
await A.click('#start'); await sleep(200); console.log('setup error EN:', await lead('#serr'));
await fullShot('setup-en');
await A.click('#langS'); await sleep(300);
console.log('setup TH: title', await lead('#s-t'), '| level note', await A.ev(`document.querySelector('#levels .note').textContent`)); await fullShot('setup-th');
await A.ev(`document.getElementById('n0').value='Ae';document.getElementById('n1').value='Bee';document.getElementById('n0').dispatchEvent(new Event('input'))`);
console.log('consent label:', await A.ev(`document.getElementById('ok0t').textContent`));
await A.click('#langS'); await sleep(200);
await A.click('#start'); await sleep(300); if (await scr() === 'howto') await A.click('#howSkip'); await sleep(300);
await A.click('#ctl [data-a=green]'); await sleep(100); await A.click('#toEnd'); await sleep(400);
console.log('end EN:', await scr(), '| title', await lead('#e-t'), '| sum', await lead('#sum'), '| hug', await lead('#hugbtn'));
await A.click('#hugbtn'); await sleep(200); console.log('hug running:', await lead('#hugbtn')); await A.click('#hugbtn');
await fullShot('end-en');
console.log('errors:', errors.length ? errors.join('\n') : 'none');
A.ws.close(); A.edge.kill(); process.exit(0);
