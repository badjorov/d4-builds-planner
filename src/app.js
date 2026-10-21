import {compute,marginal} from './engine.js';
import {legacyEntity} from './catalog.js';
const D=await (await fetch('data/barbarian.json')).json();
const $=id=>document.getElementById(id);const KEY='d4bb.builds',VK='d4bb.votes';
const groups=[['expertise','expertise'],['aspects','aspects'],['uniques','uniques'],['paragonNodes','paragon'],['glyphs','glyphs']];
const all=groups.flatMap(([key,group])=>(D[key]||[]).map(e=>legacyEntity(e,group)));
let builds=JSON.parse(localStorage[KEY]||'{}');let votes=JSON.parse(localStorage[VK]||'{}');
const blank=()=>({name:'New build',skill:D.skills[0].id,coeff:D.skills[0].coeffPct,weapon:null,str:null,cc:null,cd:null,vuln:false,vulnPct:null,op:false,opPct:null,dot:false,addx:null,mods:{}});
let cur=Object.keys(builds)[0];if(!cur){cur='b'+Date.now();builds[cur]=blank();}
const save=()=>{localStorage[KEY]=JSON.stringify(builds);localStorage[VK]=JSON.stringify(votes);};
const num=v=>v===''||v==null?null:Number(v);
$('skill').innerHTML=D.skills.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
const F=['coeff','weapon','str','cc','cd','vulnPct','opPct','addx'],C=['vuln','op','dot'];
function renderSel(){$('buildSel').innerHTML=Object.entries(builds).map(([k,b])=>`<option value="${k}" ${k==cur?'selected':''}>${b.name}</option>`).join('');}
function load(){const b=builds[cur];$('bname').value=b.name;$('skill').value=b.skill;F.forEach(f=>$(f).value=b[f]??'');C.forEach(c=>$(c).checked=!!b[c]);
 $('mods').innerHTML=['expertise','aspects','uniques','paragon','glyphs'].map(g=>`<b>${g}</b><br>`+all.filter(e=>e.group===g).map(e=>{const m=b.mods[e.id]||{};const v=m.value??e.value??'';
  return `<label><input type="checkbox" data-on="${e.id}" ${m.on?'checked':''}> <span class="${e.verified?'ver':'unv'}">${e.verified?'✔':'?'}</span> ${e.name}</label>
  val <input type="number" data-val="${e.id}" value="${v}" placeholder="${e.min!=null?e.min+'-'+e.max:'null'}"> [${e.bucket??'?'}] <a href="${e.source.startsWith('http')?e.source:'#'}" target="_blank">src</a> <small>${e.note||''}</small><br>`}).join('')).join('');
 calc();}
function read(){const b=builds[cur];b.name=$('bname').value;b.skill=$('skill').value;F.forEach(f=>b[f]=num($(f).value));C.forEach(c=>b[c]=$(c).checked);
 document.querySelectorAll('[data-on]').forEach(x=>{const id=x.dataset.on;b.mods[id]={on:x.checked,value:num(document.querySelector(`[data-val="${id}"]`).value)}});save();renderSel();calc();}
function input(){const b=builds[cur];const bk=x=>({'additive?':'additive','vuln?':'vuln'}[x]||x);
 const mods=all.filter(e=>b.mods[e.id]?.on&&['additive','multiplicative','crit','vuln','overpower'].includes(bk(e.bucket))).map(e=>({name:e.name+(e.verified?'':' (unverified)'),bucket:bk(e.bucket),value:b.mods[e.id].value}));
 if(b.addx!=null)mods.push({name:'Extra additive (manual)',bucket:'additive',value:b.addx});
 return {weaponDmg:b.weapon,coeffPct:b.coeff,mainStat:b.str,mainStatPer10:D.mainstat.percentPer10,critChance:b.cc,critDmg:b.cd,vulnerable:b.vuln,vulnPct:b.vulnPct,overpower:b.op,overpowerPct:b.opPct,isDot:b.dot,modifiers:mods};}
function calc(){const i=input(),r=compute(i);$('total').textContent=r.total.toFixed(1);
 $('whyv').textContent=r.terms.map(t=>`${t.label.padEnd(18)} = ${t.value.toFixed(4)}   ← ${t.expr}`).join('\n')+`\nTOTAL = ${r.total.toFixed(2)}`+(r.skipped.length?`\nSkipped (null value — enter in game): ${r.skipped.join(', ')}`:'')+`\nMain stat ${D.mainstat.percentPer10}%/10 Str — ${D.mainstat.source}`;
 const m=marginal(i);$('marg').innerHTML='<b>Marginal value of +1%:</b> '+Object.entries(m).map(([k,v])=>`${k}: +${v.toFixed(3)}%`).join(' | ');renderVotes();}
function renderVotes(){const ids=[...all,D.mainstat,...D.skills].map(e=>e.id);const claims=['build:'+cur,...ids];
 $('votes').innerHTML=claims.map(c=>{const v=votes[c]||{up:0,down:0,notes:''};const dis=v.up&&v.down?' ⚠ disputed':'';
  return `<div>${c}${dis} <button data-up="${c}">👍 ${v.up}</button><button data-down="${c}">👎 ${v.down}</button> <input data-note="${c}" value="${(v.notes||'').replace(/"/g,'&quot;')}" placeholder="notes / evidence link" size="50"></div>`}).join('');}
document.addEventListener('click',e=>{const t=e.target,c=t.dataset.up||t.dataset.down;if(!c)return;const v=votes[c]||={up:0,down:0,notes:''};t.dataset.up?v.up++:v.down++;save();renderVotes();});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.note){(votes[t.dataset.note]||={up:0,down:0}).notes=t.value;save();return;}if(t.id==='imp'||t.id==='buildSel')return;
 if(t.id==='skill'){const s=D.skills.find(s=>s.id===t.value);$('coeff').value=s.coeffPct??'';$('dot').checked=!!s.dot;}read();});
$('buildSel').onchange=e=>{cur=e.target.value;load();};
$('new').onclick=()=>{cur='b'+Date.now();builds[cur]=blank();save();renderSel();load();};
$('del').onclick=()=>{delete builds[cur];cur=Object.keys(builds)[0]||('b'+Date.now());builds[cur]??=blank();save();renderSel();load();};
$('why').onclick=()=>$('whyv').hidden=!$('whyv').hidden;
$('exp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({build:builds[cur],votes},null,2)],{type:'application/json'}));a.download=builds[cur].name+'.json';a.click();};
$('imp').onchange=async e=>{const j=JSON.parse(await e.target.files[0].text());cur='b'+Date.now();builds[cur]=j.build||j;if(j.votes)Object.assign(votes,j.votes);save();renderSel();load();};
renderSel();load();
