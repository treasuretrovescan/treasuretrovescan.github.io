// Treasure Trove Scan — screens, tools, $0 local accounts.
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const store = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem('gdr_'+k)) ?? d }catch(e){ return d } },
  set(k, v){ localStorage.setItem('gdr_'+k, JSON.stringify(v)) }
};
function hash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0 } return 'h'+Math.abs(h) }
let me = store.get('session', null);
const DEFAULT_KW = ['WTB','ISO','looking for','anyone selling','anyone have','recommendations','in search of','need a','want to buy'];

function go(name){
  if(name==='login' && me) name='app';
  $$('.screen').forEach(s=>s.classList.add('hidden'));
  const el = $('#screen-'+name); if(el) el.classList.remove('hidden');
  window.scrollTo({top:0});
}
$$('[data-go]').forEach(b=>b.addEventListener('click', ()=>go(b.dataset.go)));
$$('[data-tool]').forEach(b=>b.addEventListener('click', ()=>{
  $$('.toolpanel').forEach(p=>p.classList.add('hidden'));
  $('#tool-'+b.dataset.tool).classList.remove('hidden');
  window.scrollTo({top:0});
}));
$$('.gtab').forEach(b=>b.addEventListener('click', ()=>{
  $$('.gtab').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  $$('.gpanel').forEach(p=>p.classList.add('hidden')); $('#'+b.dataset.guide).classList.remove('hidden');
}));

function myData(){
  const all = store.get('data', {});
  if(me && !all[me]) all[me] = { groups:[], keywords:DEFAULT_KW.slice(), posts:[], settings:{} };
  return all;
}
function saveData(all){ store.set('data', all) }
function showApp(){
  $('#loginNavBtn').textContent = me ? 'My App' : 'Log In';
  $('#loginNavBtn').dataset.go = me ? 'app' : 'login';
  if(me){ $('#whoami').textContent = 'Hi, ' + me + ' — pick a tool:'; render(); go('app'); }
  else go('home');
}
$('#showLogin').onclick = ()=>{ $('#loginForm').classList.remove('hidden'); $('#signupForm').classList.add('hidden'); $('#showLogin').classList.add('active'); $('#showSignup').classList.remove('active'); $('#authTitle').textContent='Welcome back' };
$('#showSignup').onclick = ()=>{ $('#signupForm').classList.remove('hidden'); $('#loginForm').classList.add('hidden'); $('#showSignup').classList.add('active'); $('#showLogin').classList.remove('active'); $('#authTitle').textContent='Join free' };

$('#signupForm').onsubmit = e=>{
  e.preventDefault(); const f = new FormData(e.target);
  const users = store.get('users', {}); const u = String(f.get('username')).trim();
  if(users[u]){ $('#authMsg').textContent = 'That name is taken. Try a new one, or log in.'; return }
  users[u] = { pw: hash(String(f.get('password'))), business: f.get('business'), niche: f.get('niche') };
  store.set('users', users);
  const all = store.get('data', {}); all[u] = { groups:[], keywords:DEFAULT_KW.slice(), posts:[], settings:{ business:f.get('business'), niche:f.get('niche') } };
  store.set('data', all); me = u; store.set('session', u); showApp();
};
$('#loginForm').onsubmit = e=>{
  e.preventDefault(); const f = new FormData(e.target);
  const users = store.get('users', {}); const u = String(f.get('username')).trim();
  if(!users[u] || users[u].pw !== hash(String(f.get('password')))){ $('#authMsg').textContent = 'Name or password did not match.'; return }
  me = u; store.set('session', u); showApp();
};
$('#logoutBtn').onclick = ()=>{ me=null; store.set('session', null); $('#loginNavBtn').textContent='Log In'; go('home') };

function scorePost(text, comments, reactions, keywords){
  const t = ' ' + text.toLowerCase() + ' ';
  let score = 0; const hits = [];
  const intent = [['wtb',30],['iso',25],['in search of',25],['looking for',22],['want to buy',22],['anyone selling',20],['anyone have',15],['need a',12],['recommendations',10],['where can i',10]];
  for(const [w,p] of intent){ if(t.includes(w)){ score += p; hits.push(w) } }
  for(const k of keywords){ const kw = k.trim().toLowerCase(); if(kw && !intent.some(([w])=>w===kw) && t.includes(kw)){ score += 8; hits.push(k.trim()) } }
  score += Math.min(25, (comments||0)*2) + Math.min(15, Math.floor((reactions||0)/3));
  if(/\bprice\b|\bhow much\b|\bcash\b|\bpay\b/.test(t)) score += 8;
  return { score: Math.min(100, score), hits: [...new Set(hits)] };
}
const esc = s => String(s||'').replace(/</g,'&lt;');

function render(){
  if(!me) return;
  const all = myData(); const d = all[me];
  $('#groupList').innerHTML = d.groups.map((g,i)=>`<li><span>${esc(g.platform)}: <strong>${esc(g.name)}</strong></span><button data-del="${i}" class="mini">Remove</button></li>`).join('') || '<li>No groups yet. Add your first group up top.</li>';
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ d.groups.splice(+b.dataset.del,1); saveData(all); render() });
  $('#postSource').innerHTML = d.groups.map(g=>`<option>${esc(g.name)}</option>`).join('') || '<option>(add a group first)</option>';
  $('#keywords').value = d.keywords.join('\n');
  const s = d.settings || {};
  $('#setBusiness').value = s.business||''; $('#setNiche').value = s.niche||''; $('#setEmail').value = s.email||''; $('#setWebhook').value = s.webhook||''; $('#setShip').value = s.shipLine||''; $('#setPay').value = s.payLine||'';
  $('#alertWebhook').checked = !!s.alertWebhook;
  $('#adCopy').textContent = `Tired of selling below melt?\nSell to people who are already looking.\n${s.business||'Your business'} + Treasure Trove Scan: fair price for them, above melt for you.\nSell it while it's hot.`;
  const posts = [...d.posts].sort((a,b)=>b.score-a.score);
  $('#hotList').innerHTML = posts.map(p=>`<div class="post"><span class="score ${p.score>=60?'hot':''}">${p.score}/100 ${p.score>=60?'🔥 HOT':p.score>=35?'— Warm':'— Low'}</span> <span>${esc(p.source)} · ${esc(p.date)}</span><br>${esc(p.text).slice(0,300)}<br><span>Clues: ${esc(p.hits.join(', '))||'none'} · ${p.comments} comments · ${p.reactions} likes</span></div>`).join('') || '<p>No posts scored yet.</p>';
  const counts = {};
  for(const p of d.posts) for(const h of p.hits) counts[h]=(counts[h]||0)+1;
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if(top.length){ const max = top[0][1]; $('#topics').innerHTML = top.map(([k,v])=>`<p>${esc(k)} — ${v} hot post${v>1?'s':''}</p><div class="bar"><i style="width:${Math.round(v/max*100)}%"></i></div>`).join('') }
}

$('#groupForm').onsubmit = e=>{
  e.preventDefault(); const f = new FormData(e.target);
  const all = myData(); all[me].groups.push({ name:String(f.get('name')).trim(), platform:f.get('platform') });
  saveData(all); e.target.reset(); render();
};
$('#saveKeywords').onclick = ()=>{
  const all = myData(); all[me].keywords = $('#keywords').value.split('\n').map(x=>x.trim()).filter(Boolean); saveData(all); render();
};
$('#postForm').onsubmit = e=>{
  e.preventDefault(); const f = new FormData(e.target);
  const all = myData(); const d = all[me];
  const text = String(f.get('text')); const comments = +f.get('comments')||0; const reactions = +f.get('reactions')||0;
  const {score, hits} = scorePost(text, comments, reactions, d.keywords);
  d.posts.unshift({ source: f.get('source'), text, comments, reactions, score, hits, date: new Date().toLocaleString() });
  saveData(all); e.target.reset(); render();
  if(score>=60 && d.settings.webhook && d.settings.alertWebhook){
    fetch(d.settings.webhook, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text:`Hot buyer (${score}/100) in ${f.get('source')}: ${text.slice(0,200)}` }) }).catch(()=>{});
  }
};
$('#saveSettings').onclick = ()=>{
  const all = myData(); all[me].settings = { business:$('#setBusiness').value, niche:$('#setNiche').value, email:$('#setEmail').value, webhook:$('#setWebhook').value, alertWebhook:$('#alertWebhook').checked, shipLine:$('#setShip').value, payLine:$('#setPay').value };
  saveData(all); $('#settingsMsg').textContent = 'Saved.'; render();
};
$('#copyAd').onclick = ()=>{ navigator.clipboard && navigator.clipboard.writeText($('#adCopy').textContent) };
$('#exportBtn').onclick = ()=>{
  const d = myData()[me]; const csv = 'score,source,comments,likes,clues,text\n' + d.posts.map(p=>[p.score, '"'+(p.source||'').replace(/"/g,'""')+'"', p.comments, p.reactions, '"'+p.hits.join('; ')+'"', '"'+p.text.replace(/"/g,'""').replace(/\n/g,' ')+'"'].join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download = 'treasure-trove-scan-posts.csv'; a.click();
};
$('#seedBtn').onclick = ()=>{
  const all = myData(); const d = all[me];
  if(!d.groups.length) d.groups.push({name:'My Coin Group (demo)', platform:'Facebook Group'});
  const samples = [
    ['WTB Morgan dollars, looking for 2-3 raw ones, cash ready, how much shipped?', 14, 22],
    ['ISO a 10 oz silver bar, anyone selling below spot? Paying fast.', 9, 11],
    ['Just showing off my collection, no sales today', 3, 40],
    ['Anyone have a Libertad for sale? In search of a 2023, want to buy this week', 18, 15]
  ];
  for(const [text,c,r] of samples){ const {score,hits}=scorePost(text,c,r,d.keywords); d.posts.unshift({source:d.groups[0].name, text, comments:c, reactions:r, score, hits, date:new Date().toLocaleString()}) }
  saveData(all); render();
};
// Live spot lookup for the Price Tool (same free gold-api.com feed as the ticker)
async function loadCalcSpot(){
  const spotEl = $('#calcSpot'), st = $('#spotStatus'); if(!spotEl) return;
  const sym = ($('#calcMetal') && $('#calcMetal').value) || 'XAG';
  st.textContent = 'Getting the live spot price…';
  try{
    const r = await fetch('https://api.gold-api.com/price/' + sym);
    const d = await r.json();
    const p = Number(d.price);
    if(!p) throw new Error('no price');
    spotEl.value = p.toFixed(2);
    spotEl.readOnly = true;
    st.textContent = `Live spot: $${p.toFixed(2)} per ounce • updated ${new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}`;
  }catch(e){
    spotEl.readOnly = false;
    spotEl.placeholder = 'Like: 53.50';
    st.textContent = 'Live lookup did not work just now — type the spot price in the box.';
  }
}
const cm = $('#calcMetal'); if(cm) cm.onchange = loadCalcSpot;
const sr = $('#spotRefresh'); if(sr) sr.onclick = loadCalcSpot;
loadCalcSpot();

$('#calcBtn').onclick = ()=>{
  const oz=parseFloat($('#calcOz').value)||0, spot=parseFloat($('#calcSpot').value)||0;
  const prem=parseFloat($('#calcPrem').value)||0, fee=parseFloat($('#calcFee').value)||0, ship=parseFloat($('#calcShip').value)||0;
  const melt = oz*spot; const target = melt*(1+prem/100);
  const list = Math.ceil((target/(1-fee/100))*2)/2;
  $('#calcOut').textContent = `Spot used: $${spot.toFixed(2)} per ounce${$('#calcSpot').readOnly ? ' (live)' : ''}\nMelt price: $${melt.toFixed(2)}\nYou want (melt + ${prem}%): $${target.toFixed(2)}\nList it at: $${list.toFixed(2)} plus $${ship.toFixed(2)} shipping\nAfter the ${fee}% fee you keep about $${(list*(1-fee/100)).toFixed(2)}. That is above melt. Fair for them. Fair for you.`;
};

function makeTags(item){
  const base = ['coinsforsale','silvercoins','bullion','coincollecting','silverstacker'];
  const words = String(item||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3 && !/^(with|ounce|silver|dollar)$/.test(w));
  const tags = [...new Set([...words.slice(0,3), ...base])].slice(0,8);
  if(/silver/.test(String(item||'').toLowerCase()) && !tags.includes('silver')) tags.unshift('silver');
  return tags.map(t=>'#'+t).join(' ');
}
$('#buildListing').onclick = ()=>{
  const price=$('#bPrice').value; const st=(myData()[me].settings)||{};
  $('#listingOut').textContent = `🔥 ${($('#bItem').value||'For sale')}\n\nPrice: $${price||'—'}\n${$('#bTerms').value||''}\nShipping: ${st.shipLine||'$8 padded mailer / $13 small box'} — I combine shipping, so if you win more than one, they ship together and you save.\nPay: ${st.payLine||'PayPal Goods & Services, Venmo, CashApp'}\n\nFair deal both ways. Questions? Ask below.\n\n${makeTags($('#bItem').value)}`;
};
$('#copyListing').onclick = ()=>{ navigator.clipboard && navigator.clipboard.writeText($('#listingOut').textContent) };
$('#buildWinner').onclick = ()=>{
  const price=parseFloat($('#bPrice').value)||0; const ship=parseFloat($('#bShipTier').value)||8;
  const total=price+ship; const pp=(total*1.035).toFixed(2);
  $('#winnerOut').textContent = `You won the ${$('#bItem').value||'item'} at $${price.toFixed(2)}!\n\nYour total:\nCashApp / Venmo: $${total.toFixed(2)} ($${price.toFixed(2)} + $${ship.toFixed(2)} shipping)\nPayPal Goods & Services: $${pp} (fee added)\n\nSend pay and your mailing address. I will pack it well and send tracking. Thank you!`;
};
$('#copyWinner').onclick = ()=>{ navigator.clipboard && navigator.clipboard.writeText($('#winnerOut').textContent) };
// Form-to-email delivery (Web3Forms, free plan). The access key is public by
// design — it is an alias for the team mailbox, not a password.
const W3F_KEY = 'a55133f6-5ab6-41f9-bb5b-322086300e54';
async function sendToTeam(payload){
  try{
    const r = await fetch('https://api.web3forms.com/submit', {method:'POST', headers:{'Content-Type':'application/json', 'Accept':'application/json'}, body: JSON.stringify(Object.assign({access_key: W3F_KEY}, payload))});
    const d = await r.json().catch(()=>({}));
    return !!(d && (d.success === true || d.success === 'true'));
  }catch(e){ return false; }
}
const sf = $('#setupForm');
if(sf) sf.onsubmit = async e=>{
  e.preventDefault(); const f=new FormData(e.target);
  const btn = e.target.querySelector('button[type="submit"]');
  if(btn){ btn.disabled = true; btn.textContent = 'Sending…'; }
  $('#setupMsg').textContent = 'Sending your answers to our team…';
  const lines = ['SETUP FORM — Treasure Trove Scan','',
    'Name: '+f.get('name'),'Email: '+f.get('email'),'Business: '+f.get('business'),
    'What they sell: '+f.get('niche'),'','Groups:',''+f.get('groups'),'',
    'Pay apps: '+f.get('payapps'),'Shipping: '+f.get('shipping'),'','Group rules notes:',''+(f.get('grouprules')||''),'',
    'Main items:',''+f.get('items'),'','Alerts: '+f.get('alerts')];
  const ok = await sendToTeam({
    subject: 'SETUP FORM — '+f.get('business'), from_name: 'TreasureTroveScan Website',
    name: f.get('name'), email: f.get('email'), business: f.get('business'),
    what_they_sell: f.get('niche'), groups: f.get('groups'), pay_apps: f.get('payapps'),
    shipping: f.get('shipping'), group_rules_notes: f.get('grouprules')||'',
    main_items: f.get('items')||'', alerts: f.get('alerts'), message: lines.join('\n')
  });
  if(btn){ btn.disabled = false; btn.textContent = 'Send My Answers'; }
  if(ok){ e.target.reset(); $('#setupMsg').textContent = 'Got it! Your answers are with our team. Watch your email — your pack comes from treasuretrovescan.noreply@gmail.com. Now do Step 2: email us your coin photos.'; }
  else { $('#setupMsg').textContent = 'That did not send. Please try once more — or email your answers to treasuretrovescan.noreply@gmail.com yourself. That works too.'; }
};
$('#importPack').onclick = ()=>{
  const file = $('#packFile').files[0];
  if(!file){ $('#packMsg').textContent = 'Pick your pack file first.'; return }
  file.text().then(txt=>{
    try{
      const p = JSON.parse(txt); const all = myData(); const d = all[me];
      if(Array.isArray(p.groups)) for(const g of p.groups) d.groups.push(typeof g==='string' ? {name:g, platform:'Facebook Group'} : g);
      if(Array.isArray(p.keywords) && p.keywords.length) d.keywords = p.keywords;
      if(p.settings) d.settings = Object.assign({}, d.settings, p.settings);
      saveData(all); render(); $('#packMsg').textContent = 'Pack loaded. Your groups, words and info are in.';
    }catch(err){ $('#packMsg').textContent = 'That file did not work. Make sure it is the pack we sent you.' }
  });
};
$('#exportPack').onclick = ()=>{
  const d = myData()[me];
  const pack = { app:'Treasure Trove Scan', version:1, groups:d.groups, keywords:d.keywords, settings:d.settings };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(pack,null,2)],{type:'application/json'})); a.download = 'my-setup-pack.json'; a.click();
};
const cf = $('#contactForm');
if(cf) cf.onsubmit = async e=>{
  e.preventDefault(); const f=new FormData(e.target);
  const btn = e.target.querySelector('button[type="submit"]');
  if(btn){ btn.disabled = true; btn.textContent = 'Sending…'; }
  $('#contactMsg').textContent = 'Sending your note to our team…';
  const ok = await sendToTeam({
    subject: 'Treasure Trove Scan — contact', from_name: 'TreasureTroveScan Website',
    name: f.get('name'), email: f.get('email'), message: f.get('message')
  });
  if(btn){ btn.disabled = false; btn.textContent = 'Send'; }
  if(ok){ e.target.reset(); $('#contactMsg').textContent = 'Got it! Our team reads these and will write back to your email.'; }
  else { $('#contactMsg').textContent = 'That did not send. Please try once more — or email us at treasuretrovescan.noreply@gmail.com yourself.'; }
};
if(me){ $('#loginNavBtn').textContent='My App'; render(); go('app'); } else { go('home'); }

// Live spot ticker (free gold-api.com spot feed, CORS open)
async function loadTicker(){
  const track = document.getElementById('tickerTrack'); if(!track) return;
  const syms = [['XAU','GOLD'],['XAG','SILVER'],['XPT','PLATINUM'],['XPD','PALLADIUM']];
  try{
    const parts = [];
    for(const [s,name] of syms){
      const r = await fetch('https://api.gold-api.com/price/' + s);
      const d = await r.json();
      parts.push(`<span class="tick">${name} <b>$${Number(d.price).toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2})}</b></span>`);
    }
    const html = parts.join('<span class="tick">•</span>');
    track.innerHTML = html + '<span class="tick">•</span>' + html + '<span class="tick">•</span>';
  }catch(e){ track.innerHTML = '<span class="tick">Spot prices will show here</span>'; }
}
loadTicker(); setInterval(loadTicker, 60000);

const bp = document.getElementById('bPhoto');
if(bp) bp.onchange = ()=>{ const f = bp.files[0]; if(!f) return; const img = document.getElementById('bPhotoPreview'); img.src = URL.createObjectURL(f); img.classList.remove('hidden');
  // If the photo's file name says what it is (like "2023-silver-libertad.jpg"), start the "What are you selling?" box with it.
  const itemEl = document.getElementById('bItem');
  if(itemEl && !itemEl.value){
    const junk = /^(img|pxl|dsc|screenshot|whatsapp|image|photo|pxl|mvimg|received|fb|mmexport)/i;
    const words = f.name.replace(/\.[a-z0-9]+$/i,'').split(/[-_\s]+/).filter(w=>w && !junk.test(w) && !/^\d+$/.test(w));
    const guess = words.map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ').trim();
    if(guess.length >= 5) itemEl.value = guess;
  }
};

// Tap-to-fill item chips (no typing needed)
document.querySelectorAll('#itemChips .chip').forEach(ch=>{
  ch.onclick = ()=>{ const el = document.getElementById('bItem'); if(el){ el.value = ch.dataset.item; el.focus(); } };
});
