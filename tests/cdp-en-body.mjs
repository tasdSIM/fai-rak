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
