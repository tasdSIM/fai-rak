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
// two-phone room screen in English: the host in EN, the guest in ไทย (each phone picks its own)
const A = await browser('A', 9561), B = await browser('B', 9562);
const prep = async (X, lang) => { await X.cmd('Page.navigate', { url: URL }); await sleep(1000);
  await X.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-howskip','1');localStorage.setItem('frm-blang',JSON.stringify('${lang}'));localStorage.setItem('frm-names',JSON.stringify(['Ae','Bee']));localStorage.setItem('frm-music',JSON.stringify({on:false}))`);
  await X.cmd('Page.navigate', { url: URL }); await sleep(1500); };
const lead = (X, sel) => X.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return 'missing';const k=[...e.querySelectorAll('.th,.en')][0];return k?k.className+': '+k.textContent:'(no pair) '+e.textContent})()`);
await prep(A, 'en'); await prep(B, 'th');
await A.click('#toRoom'); await sleep(300);
console.log('A room title:', await lead(A, '#r-t'), '| create:', await lead(A, '[data-r=create]'), '| lang btn:', await A.ev(`document.getElementById('langR').textContent`));
await A.ev(`document.getElementById('rcode').value='12'`); await A.click('[data-r=join]'); await sleep(200);
console.log('A bad code error:', await lead(A, '#roomc .err')); await A.shot('room-en-error');
await A.click('[data-r=create]'); await sleep(1500);
const code = await A.ev(`document.querySelector('.rcode')?.textContent.replace(/[^0-9]/g,'')`);
console.log('A host:', await lead(A, '.rstat'), '| share:', await lead(A, '[data-r=share]'), '| code', code);
await B.cmd('Page.navigate', { url: 'about:blank' }); await sleep(200); await B.cmd('Page.navigate', { url: URL + '#join=' + code }); await sleep(2500);
console.log('B guest (ไทย):', await B.ev(`document.querySelector('.scr.on').id`), '|', await lead(B, '.rstat'), '|', await lead(B, '#roomc .soft'));
await sleep(500); console.log('A after join:', await lead(A, '.rstat'), '| setup btn:', await lead(A, '[data-r=setup]')); await A.shot('room-en-host');
await B.click('#langR'); await sleep(300); console.log('B switched to EN:', await lead(B, '.rstat')); await B.shot('room-guest-en'); await B.click('#langR'); await sleep(200);
await A.click('[data-r=setup]'); await sleep(400);
console.log('A banner (EN):', await A.ev(`document.getElementById('rbanT').textContent`));
await A.click('#start'); await sleep(1200);
console.log('B banner (ไทย):', await B.ev(`document.getElementById('rbanT').textContent`), '| B screen', await B.ev(`document.querySelector('.scr.on').id`));
console.log('same card both:', await A.ev(`document.querySelector('#card .chead span:nth-child(2)').textContent`) === await B.ev(`document.querySelector('#card .chead span:nth-child(2)').textContent`));
console.log('A card lead:', (await A.ev(`document.querySelector('#card .ctext').textContent`)).slice(0, 30), '| B card lead:', (await B.ev(`document.querySelector('#card .ctext').textContent`)).slice(0, 30));
console.log('errors:', errors.length ? errors.join('\n') : 'none');
A.ws.close(); B.ws.close(); A.edge.kill(); B.edge.kill(); process.exit(0);
