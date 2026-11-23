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
const st = b => b.ev(`JSON.stringify({scr:document.querySelector('.scr.on')?.id,card:document.querySelector('#card .ctext')?.textContent?.slice(0,40),who:document.getElementById('who').textContent,ctl:[...document.querySelectorAll('#ctl button')].map(b=>b.dataset.a).join(','),ov:document.getElementById('ov').classList.contains('on')?document.getElementById('ov-t')?.textContent:null,clock:document.getElementById('clock')?.textContent||null,ban:document.getElementById('rban').hidden?null:document.getElementById('rbanT').textContent})`);
const A = await browser('A', 9421), B = await browser('B', 9422);
await A.cmd('Page.navigate', { url: URL }); await sleep(1200);
await A.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));localStorage.setItem('frm-music',JSON.stringify({on:false}));location.reload()`); await sleep(1500);
await A.click('#toRoom'); await sleep(300); await A.shot('room-start');
await A.click('[data-r=create]'); await sleep(1500);
const code = await A.ev(`document.querySelector('.rcode')?.textContent.replace(/[^0-9]/g,'')`);
console.log('room code', code); await A.shot('room-created');
await B.cmd('Page.navigate', { url: URL }); await sleep(1000);
await B.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-music',JSON.stringify({on:false}))`);
await B.cmd('Page.navigate', { url: 'about:blank' }); await sleep(300); await B.cmd('Page.navigate', { url: URL + '#join=' + code }); await sleep(2500);
await B.shot('joined'); await A.shot('peer-joined');
console.log('A after join', await A.ev(`document.querySelector('.rstat')?.textContent`));
console.log('B after join', await B.ev(`document.querySelector('.rstat')?.textContent+' | '+document.querySelector('#roomc .soft')?.textContent`));
await A.click('[data-r=setup]'); await sleep(500); await A.shot('setup-banner');
await A.click('#start'); await sleep(1200);
console.log('A play', await st(A)); console.log('B play', await st(B));
await B.shot('play'); await A.shot('play');
await B.click('#ctl [data-a=green]'); await sleep(2500);
console.log('after B green  A', await st(A)); console.log('after B green  B', await st(B));
await B.shot('doing');
await B.click('#ctl [data-a=next]'); await sleep(800);
console.log('after B next   A', await st(A)); console.log('after B next   B', await st(B));
await A.click('#ctl [data-a=red]'); await sleep(800);
console.log('after A red    B', await st(B)); await B.shot('red-overlay');
await B.click('#ovbody [data-o=cont]'); await sleep(800);
console.log('after B cont   A', await st(A)); console.log('after B cont   B', await st(B));
await B.click('#lvchip'); await sleep(600); console.log('B lvchip -> A', await st(A));
await B.click('#ovbody [data-o=L3]'); await sleep(600); console.log('B L3 -> A', await st(A)); console.log('B L3 -> B', await st(B)); await B.shot('levelup');
await B.click('#ovbody [data-o=r0]'); await B.click('#ovbody [data-o=r1]'); await sleep(600); await B.click('#ovbody [data-o=go]'); await sleep(800);
console.log('after go A', await st(A)); console.log('after go B', await st(B));
// guest drops and comes back
await B.ev(`__R.ws.close()`).catch(()=>{});
await B.ev(`(()=>{const w=window;return 1})()`);
await sleep(300); console.log('B during drop', await st(B));
await sleep(2500); console.log('B after resume', await st(B));
await B.click('#toEnd'); await sleep(800);
console.log('after B end A', await st(A)); console.log('after B end B', await st(B)); await B.shot('end');
await B.click('#again'); await sleep(800); console.log('after B again A', await st(A)); console.log('after B again B', await st(B)); await B.shot('waiting');
await A.click('#rbanB'); await sleep(300); await A.ev(`window.confirm=()=>true`); await A.click('[data-r=leave]'); await sleep(800);
console.log('after host leave B', await st(B), await B.ev(`document.querySelector('#roomc .err')?.textContent`));
console.log('errors:', errors.length ? errors : 'none');
A.edge.kill(); B.edge.kill(); process.exit(0);
