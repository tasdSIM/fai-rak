const A = await browser('A', 9441);
const spRow = async () => { for(let i=0;i<40;i++){ await play(); } };
const st = () => A.ev(`JSON.stringify({card:__T.S.card&&__T.S.card.code,lv:__T.S.card&&__T.S.card.l,turn:__T.S.turn,passes:__T.S.passes.join('/'),left:__T.S.left,note:document.getElementById('cnote').hidden?null:document.getElementById('cnote').textContent,deck:__T.S.deck.length,ctl:[...document.querySelectorAll('#ctl button')].map(b=>b.dataset.a).join(',')})`);
await A.cmd('Page.navigate', { url: URL }); await sleep(1000);
await A.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-howskip','1');localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));localStorage.setItem('frm-music',JSON.stringify({on:false}));localStorage.setItem('frm-deck',JSON.stringify({mode:'one',level:2}))`);
await A.cmd('Page.navigate', { url: URL }); await sleep(1500);
await A.click('#start'); await sleep(300);
const play = async () => { await A.ev(`(()=>{const g=document.querySelector('#ctl [data-a=green]');if(g){g.click();document.querySelector('#ctl [data-a=next]')?.click()}else document.querySelector('#ctl [data-a=sp]')?.click()})()`); await sleep(60); };
await play(); await play();
const sp = async (code, label) => { const b = JSON.parse(await st()); await A.ev(`__T.force('${code}')`); await sleep(50); await A.click('#ctl [data-a=sp]'); await sleep(120); const a = JSON.parse(await st()); console.log(code, label, '| before', JSON.stringify({turn:b.turn,passes:b.passes,deck:b.deck}), '| after', JSON.stringify(a)); return { b, a }; };
await sp('SP-11', 'both');
await play();
await sp('SP-12', 'gift: listener +1 pass');
await play();
await sp('SP-13', 'steal');
await play();
await sp('SP-14', 'up one level from 2 -> 3');
await play();
await sp('SP-15', 'down one level -> 1');
await play();
await sp('SP-16', 'no hands'); await play();
await sp('SP-17', 'blind'); await play();
await sp('SP-18', 'quiet'); await play();
// half time: force a timed card next
await A.ev(`__T.force('SP-19')`); await A.click('#ctl [data-a=sp]'); await sleep(100);
for(let i=0;i<8;i++){const s=JSON.parse(await st());console.log('  after SP-19:',s.card,'left',s.left,'note',s.note);if(s.left)break;await play();}
await play();
await sp('SP-20', 'random reader');
await play();
const last = await A.ev(`__T.S.lastPlay&&__T.S.lastPlay.code`), lr = await A.ev(`__T.S.lastReader`);
const r21 = await sp('SP-21', 'replay last swapped'); console.log('   last was', last, 'read by', lr, '-> now card', r21.a.card, 'turn', r21.a.turn);
await play();
await sp('SP-22', 'burn top card (deck -2: burn + draw)');
await play();
for (const c of ['SP-23', 'SP-27', 'SP-29']) { await A.ev(`__T.force('${c}')`); await sleep(50); const s = JSON.parse(await st()); console.log(c, 'timed special buttons', s.ctl, 'left', s.left); await A.click('#ctl [data-a=time]'); await sleep(100); console.log('   after start', JSON.parse(await st()).ctl); await A.click('#ctl [data-a=next]'); await sleep(100); }
for (const c of ['SP-24', 'SP-25', 'SP-26', 'SP-28', 'SP-30']) { await sp(c, 'plain'); await play(); }
console.log('errors:', errors.length ? errors : 'none');
A.edge.kill(); process.exit(0);
