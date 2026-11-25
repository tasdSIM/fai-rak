const A = await browser('A', 9451);
await A.cmd('Page.navigate', { url: URL }); await sleep(1000);
await A.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-howskip','1');localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));localStorage.setItem('frm-music',JSON.stringify({on:false}));localStorage.setItem('frm-deck',JSON.stringify({mode:'mix',lvls:[1,2,3,4]}))`);
await A.cmd('Page.navigate', { url: URL }); await sleep(1500);
let res='';for(let gg=0;gg<4;gg++){ res = await A.ev(`(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));let back2back=0,specials=0,notesOnSpecial=0,games=0,seen={};
for(let g=0;g<1;g++){document.getElementById('start').click();await s(20);games++;let prev=null;
 for(let i=0;i<200;i++){if(document.getElementById('ov').classList.contains('on')){const b=document.querySelector('#ovbody [data-o=skip],#ovbody [data-o=stay],#ovbody [data-o=K1]');if(b){b.click();await s(3);continue}break}
  const c=__T.S.card;if(!c)break;if(c.l===0){specials++;seen[c.code]=1;if(prev&&prev.l===0)back2back++;if(!document.getElementById('cnote').hidden)notesOnSpecial++}prev=c;
  const a=[...document.querySelectorAll('#ctl button')].map(b=>b.dataset.a);
  if(a.includes('green')){document.querySelector('#ctl [data-a=green]').click();await s(1);const n=document.querySelector('#ctl [data-a=next]');if(n)n.click()}
  else if(a.includes('sp'))document.querySelector('#ctl [data-a=sp]').click();else if(a.includes('next'))document.querySelector('#ctl [data-a=next]').click();else break;await s(2)}
 document.getElementById('toSetup').click();await s(20)}
return JSON.stringify({games,specials,distinct:Object.keys(seen).length,back2back,notesOnSpecial})})()`);
console.log('game',gg+1, res);}
console.log('errors:', errors.length ? errors : 'none');
A.edge.kill(); process.exit(0);
