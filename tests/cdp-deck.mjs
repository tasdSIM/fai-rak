import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = process.argv[2], URL = process.argv[3];
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9431', `--user-data-dir=${OUT}/prof`, '--window-size=420,900', 'about:blank'], { stdio: 'ignore' });
let ws; for (let i = 0; i < 40; i++) { try { const l = await (await fetch('http://127.0.0.1:9431/json')).json(); const p = l.find(t => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(250); }
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}, errors = [];
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) errors.push(expr.slice(0, 60) + ' => ' + r.result.exceptionDetails.exception?.description); return r.result?.result?.value; };
let n = 0; const shot = async l => { await sleep(400); const r = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync(`${OUT}/${String(++n).padStart(2, '0')}-${l}.png`, Buffer.from(r.result.data, 'base64')); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw new Error('missing ${sel.replace(/'/g,'')}');e.click();return 1})()`);
await cmd('Runtime.enable'); await cmd('Page.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await cmd('Page.navigate', { url: URL }); await sleep(1200);
await ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));localStorage.setItem('frm-music',JSON.stringify({on:false}));location.reload()`); await sleep(1500);
// play the whole deck; returns {codes, levels, ups, end}
const run = () => ev(`(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));const codes=[],ups=[];let guard=0;
while(guard++<400){const ov=document.getElementById('ov').classList.contains('on');
 if(ov){ups.push(document.getElementById('ov-t').textContent);const st=document.querySelector('#ovbody [data-o=stay],#ovbody [data-o=skip]');if(st){st.click();await s(5);continue}break}
 const a=[...document.querySelectorAll('#ctl button')].map(b=>b.dataset.a);
 if(a.includes('reshuffle'))return {codes,ups,end:document.querySelector('#card .ctext').textContent,chip:document.getElementById('lvname').textContent};
 const code=document.querySelector('#card .chead span:nth-child(2)').textContent.split(' ')[0];
 if(a.includes('green')){codes.push(code);document.querySelector('#ctl [data-a=green]').click();await s(2);document.querySelector('#ctl [data-a=next]').click()}
 else if(a.includes('sp'))document.querySelector('#ctl [data-a=sp]').click();
 else return {codes,ups,stuck:a.join(',')};
 await s(2)}return {codes,ups,guard}})()`);
const report = (name, r) => { const lv = r.codes.map(c => c.split('-')[0]); const uniq = new Set(r.codes).size;
  console.log(name, '| drawn', r.codes.length, 'unique', uniq, '| levels', [...new Set(lv)].join(','), '| overlays', JSON.stringify(r.ups), '| end:', r.end, '| chip:', r.chip, r.stuck ? 'STUCK ' + r.stuck : ''); };
const counts = await ev(`JSON.stringify([...document.querySelectorAll('#levels .note')].map(e=>e.textContent))`); console.log('notes', counts);
// 1) one level only
await click('[data-dm=one]'); await click('#levels [data-l="2"]'); await shot('setup-one');
await click('#start'); await sleep(500); report('ONE L2', await run()); await shot('one-empty');
await click('#ctl [data-a=reshuffle]'); await sleep(300); console.log('after reshuffle chip/card:', await ev(`document.getElementById('lvname').textContent+' | '+document.querySelector('#card .chead span:nth-child(2)')?.textContent`));
await click('#toSetup'); await sleep(300);
// 2) mix 1-3
await click('[data-dm=mix]'); await sleep(100);
await ev(`(()=>{const p=l=>document.querySelector('#levels [data-l="'+l+'"]').getAttribute('aria-pressed')==='true';for(const l of [1,2,3]){if(!p(l))document.querySelector('#levels [data-l="'+l+'"]').click()}for(const l of [4,5]){if(p(l))document.querySelector('#levels [data-l="'+l+'"]').click()}})()`);
await shot('setup-mix');
await click('#start'); await sleep(500); console.log('mix chip', await ev(`document.getElementById('lvname').textContent`)); await shot('mix-play');
await click('#lvchip'); await sleep(200); await shot('mix-menu'); await click('#ovbody [data-o=stay]');
report('MIX 1-3', await run()); await click('#toSetup'); await sleep(300);
// 3) progressive from 1
await click('[data-dm=prog]'); await click('#levels [data-l="1"]'); await click('#start'); await sleep(400);
report('PROG L1 (stay each time)', await run());
// 4) all without consent -> error
await click('#toSetup'); await sleep(300); await click('[data-dm=all]'); await click('#start'); await sleep(200);
console.log('all no consent err:', await ev(`document.getElementById('serr').textContent`)); await shot('setup-all');
console.log('errors:', errors.length ? errors : 'none');
edge.kill(); process.exit(0);
