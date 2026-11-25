const A = await browser('A', 9521), Bx = await browser('B', 9522);
const prep = async (X, names, lang) => { await X.cmd('Page.navigate', { url: URL }); await sleep(1000); await X.ev(`localStorage.clear();localStorage.setItem('frm-age','1');localStorage.setItem('frm-howskip','1');${names ? `localStorage.setItem('frm-names',JSON.stringify(['เอ','บี']));` : ''}localStorage.setItem('frm-music',JSON.stringify({on:false}));${lang ? `localStorage.setItem('frm-blang','"${lang}"');` : ''}`); };
const v = X => X.ev(`JSON.stringify({scr:document.querySelector('.scr.on')?.id,tag:document.getElementById('bxtag').textContent,title:document.getElementById('bxt').textContent,lang:(document.getElementById('langB')||{}).textContent,first:(document.querySelector('#bxc')?.innerText||'').slice(0,70).replace(/\\n/g,' / ')})`);
await prep(A, true); await A.cmd('Page.navigate', { url: URL }); await sleep(1500);
await A.click('#toBonus'); await sleep(800);
console.log('hub TH:', await A.ev(`document.getElementById('b-t').textContent+' | '+document.querySelector('#hub .tile b').textContent+' | btn '+document.getElementById('langA').textContent`));
await A.click('#langA'); await sleep(900);
console.log('hub EN:', await A.ev(`document.getElementById('b-t').textContent+' | '+[...document.querySelectorAll('#hub .tile b')].map(b=>b.textContent).join(', ')+' | btn '+document.getElementById('langA').textContent`)); await A.shot('hub-en');
// massage: setup, run, switch mid-run, timer keeps going
await A.click('[data-h=massage]'); await sleep(300); console.log('massage EN:', await v(A));
await A.click('[data-b=l10]'); await A.click('[data-b=go]'); await sleep(2300);
const c1 = await A.ev(`document.getElementById('mclock').textContent`); await A.shot('massage-run-en');
await A.click('#langB'); await sleep(400); const c2 = await A.ev(`document.getElementById('mclock').textContent`);
console.log('massage run switched to TH:', await v(A), '| clock before', c1, 'after', c2);
await A.click('[data-b=next]'); await sleep(200); await A.click('#langB'); await sleep(300); console.log('step 2 EN:', await v(A));
await A.click('#bxBack'); await sleep(200); await A.click('#bxBack'); await sleep(400);
// nights
await A.click('[data-h=nights]'); await sleep(300); console.log('nights EN:', await v(A));
await A.click('[data-b=n0]'); await sleep(200); await A.click('[data-b=t0]'); await A.click('#langB'); await sleep(300);
console.log('night1 switched TH, tick kept:', await A.ev(`document.querySelector('[data-b=t0]').getAttribute('aria-pressed')`), await v(A));
await A.click('#langB'); await sleep(300); await A.click('#bxBack'); await sleep(200); await A.click('#bxBack'); await sleep(400);
// dates
await A.click('[data-h=dates]'); await sleep(300); await A.click('[data-b=d0]'); await sleep(200); console.log('date EN:', await v(A), '| massage btn', await A.ev(`!!document.querySelector('[data-b=massage]')`)); await A.shot('date-en');
await A.click('#bxBack'); await sleep(200); await A.click('#bxBack'); await sleep(400);
// cases single device: switch mid-answer keeps state
await A.click('[data-h=cases]'); await sleep(300); await A.click('[data-b=c0]'); await sleep(200); await A.click('[data-b=go]');
for (let i = 0; i < 3; i++) await A.click('[data-b=clue]'); await A.click('[data-b=ask]'); await A.click('[data-b=w3]'); await sleep(200);
await A.click('#langB'); await sleep(300);
console.log('case switched TH, answer kept:', await A.ev(`document.querySelector('[data-b=w3]').getAttribute('aria-pressed')+' | '+document.querySelector('[data-b=w3]').textContent`), await v(A));
await A.click('#langB'); await sleep(300); await A.shot('case-en');
await A.click('#bxBack'); await sleep(200); await A.click('#bonusBack'); await sleep(300);
// two devices: host Thai, guest English
await A.click('#bonusBack').catch(()=>{});
await A.ev(`localStorage.setItem('frm-blang','"th"')`);
await A.cmd('Page.navigate', { url: URL }); await sleep(1500);
await A.click('#toRoom'); await sleep(300); await A.click('[data-r=create]'); await sleep(1500);
const code = await A.ev(`document.querySelector('.rcode')?.textContent.replace(/[^0-9]/g,'')`);
await prep(Bx, false, 'en'); await Bx.cmd('Page.navigate', { url: 'about:blank' }); await sleep(200); await Bx.cmd('Page.navigate', { url: URL + '#join=' + code }); await sleep(2500);
await A.click('[data-r=setup]'); await sleep(300); await A.click('#toBonus'); await sleep(800); await A.click('[data-h=cases]'); await sleep(300); await A.click('[data-b=c4]'); await sleep(1500);
console.log('duo host:', await v(A)); console.log('duo guest:', await v(Bx));
await Bx.click('[data-b=go]'); await sleep(800);
console.log('guest secret heading:', await Bx.ev(`document.querySelector('#bxc .secret h3')?.textContent`), '| host:', await A.ev(`document.querySelector('#bxc .secret h3')?.textContent`));
await Bx.click('#langB'); await sleep(400); console.log('guest switched to TH, host still:', await A.ev(`document.getElementById('langB').textContent`), '| guest title', (JSON.parse(await v(Bx))).title);
await Bx.click('#langB'); await sleep(400); await Bx.shot('duo-guest-en'); await A.shot('duo-host-th');
console.log('errors:', errors.length ? errors : 'none');
A.edge.kill(); Bx.edge.kill(); process.exit(0);
