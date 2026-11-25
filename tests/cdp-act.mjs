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
const st = b => b.ev(`JSON.stringify({card:document.querySelector('#card .chead span:nth-child(2)')?.textContent,text:document.querySelector('#card .ctext')?.textContent?.slice(0,30),who:document.getElementById('who').textContent,note:document.getElementById('cnote').hidden?null:document.getElementById('cnote').textContent,rules:document.getElementById('rules').hidden?null:document.getElementById('rules').textContent,ov:document.getElementById('ov').classList.contains('on')?document.getElementById('ov-t')?.textContent:null,opts:[...document.querySelectorAll('#ovbody [data-o]')].map(b=>b.dataset.o+(b.disabled?'(x)':'')).join(','),ctl:[...document.querySelectorAll('#ctl button')].map(b=>b.dataset.a).join(','),clock:document.getElementById('clock')?.textContent||null})`);
const A = await browser('A', 9531), B = await browser('B', 9532);
const prep = async (X, names) => { await X.cmd('Page.navigate', { url: URL }); await sleep(1000); await X.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-howskip','1');${names ? `localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));` : ''}localStorage.setItem('frm-music',JSON.stringify({on:false}));localStorage.setItem('frm-deck',JSON.stringify({mode:'one',level:4}))`); };
const step = X => X.ev(`(()=>{const g=document.querySelector('#ctl [data-a=green]');if(g){g.click();document.querySelector('#ctl [data-a=next]')?.click()}else document.querySelector('#ctl [data-a=sp]')?.click()})()`);
await prep(A, true); await A.cmd('Page.navigate', { url: URL }); await sleep(1500);
await A.click('#start'); await sleep(300);
for (let i = 0; i < 3; i++) { await step(A); await sleep(50); }
// 1 L4-15 replay
await A.ev(`__T.force('L4-15')`); await A.click('#ctl [data-a=green]'); await sleep(200);
const r1 = JSON.parse(await st(A)); console.log('L4-15 green ->', r1.ov, '| options', r1.opts); await A.shot('replay-menu');
const firstP = r1.opts.split(',').find(o => o[0] === 'P'); await A.click(`#ovbody [data-o=${firstP}]`); await sleep(300);
console.log('after pick ->', await st(A)); await A.shot('replayed');
await A.click('#ctl [data-a=next]'); await sleep(100);
// 2 SP-05 swap
const t0 = await A.ev(`__T.S.turn`); await A.ev(`__T.force('SP-05')`); await A.click('#ctl [data-a=sp]'); await sleep(100);
console.log('SP-05 turn before', t0, 'after', await A.ev(`__T.S.turn`), '|', await st(A));
// 3 SP-06 pick a pile
const t1 = await A.ev(`__T.S.turn`); await A.ev(`__T.force('SP-06')`); await A.click('#ctl [data-a=sp]'); await sleep(200);
console.log('SP-06 ->', await st(A)); await A.shot('pick-menu');
await A.click('#ovbody [data-o=K2]'); await sleep(200); console.log('picked pile 2 -> turn kept', (await A.ev(`__T.S.turn`)) === t1, '|', await st(A));
await A.click('#ctl [data-a=green]'); await sleep(50); await A.click('#ctl [data-a=next]'); await sleep(100);
// 4 SP-08 rule
await A.ev(`__T.force('SP-08')`); await A.click('#ctl [data-a=sp]'); await sleep(200);
await A.click('#ovbody [data-o=rok]'); console.log('empty rule stays open ->', JSON.parse(await st(A)).ov);
await A.ev(`document.getElementById('ruleIn').value='ห้ามจูบปากจนจบเกม'`); await A.click('#ovbody [data-o=rok]'); await sleep(200);
console.log('rule saved ->', JSON.parse(await st(A)).rules); await A.shot('rules');
// 5 SP-09 level button
await A.ev(`__T.force('SP-09')`); console.log('SP-09 buttons', JSON.parse(await st(A)).ctl); await A.click('#ctl [data-a=lvl]'); await sleep(200); console.log('SP-09 lvl ->', JSON.parse(await st(A)).ov); await A.click('#ovbody [data-o=stay]'); await sleep(100);
// 6 L4-34 carry note
await A.ev(`__T.force('L4-34')`); await A.click('#ctl [data-a=green]'); await sleep(50); await A.click('#ctl [data-a=next]'); await sleep(200);
console.log('after L4-34 next card note ->', JSON.parse(await st(A)).note);
await step(A); await sleep(200);
console.log('one card later note gone ->', JSON.parse(await st(A)).note);
// --- two devices ---
await A.click('#toSetup'); await sleep(200); await A.click('#toRoom'); await sleep(300); await A.click('[data-r=create]'); await sleep(1500);
const code = await A.ev(`document.querySelector('.rcode')?.textContent.replace(/[^0-9]/g,'')`);
await prep(B, false); await B.cmd('Page.navigate', { url: 'about:blank' }); await sleep(200); await B.cmd('Page.navigate', { url: URL + '#join=' + code }); await sleep(2500);
await A.click('[data-r=setup]'); await sleep(300); await A.click('#start'); await sleep(600);
for (let i = 0; i < 2; i++) { await step(A); await sleep(300); }
await A.ev(`__T.force('SP-06')`); await sleep(500); await B.click('#ctl [data-a=sp]'); await sleep(800);
console.log('duo SP-06 guest sees ->', await st(B)); await B.shot('duo-pick');
await B.click('#ovbody [data-o=K3]'); await sleep(800);
const a6 = JSON.parse(await st(A)), b6 = JSON.parse(await st(B)); console.log('duo after guest picks pile 3: same card', a6.card === b6.card, a6.card, '| guest note', b6.note);
await B.click('#ctl [data-a=green]'); await sleep(500); await B.click('#ctl [data-a=next]'); await sleep(600);
await A.ev(`__T.force('L4-15')`); await sleep(500); await B.click('#ctl [data-a=green]'); await sleep(800);
const b7 = JSON.parse(await st(B)); console.log('duo L4-15 guest menu ->', b7.ov, b7.opts);
const p7 = b7.opts.split(',').find(o => o[0] === 'P'); if (p7) { await B.click(`#ovbody [data-o=${p7}]`); await sleep(800); }
const a8 = JSON.parse(await st(A)), b8 = JSON.parse(await st(B)); console.log('duo replay same card', a8.card === b8.card, a8.card, '| guest note', b8.note); await B.shot('duo-replay');
await A.ev(`__T.force('SP-08')`); await sleep(500); await A.click('#ctl [data-a=sp]'); await sleep(600);
console.log('duo SP-08 guest ->', JSON.parse(await st(B)).ov); await A.ev(`document.getElementById('ruleIn').value='ทุกใบต้องจ้องตากัน'`); await B.click('#ovbody [data-o=rok]'); await sleep(800);
console.log('duo rule on guest ->', JSON.parse(await st(B)).rules);
console.log('errors:', errors.length ? errors : 'none');
A.edge.kill(); B.edge.kill(); process.exit(0);
