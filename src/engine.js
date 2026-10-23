// Class-agnostic damage engine.
// Vulnerable and crit formula, user research note 2026-10-22, follow-up the same day.
// [A] d4guides.gg, Chrix1848, 2026-10-05, season 15 / patch 3.2.2 (medium; current-season guide).
//     Same-type gear multipliers add, and aspect/unique/skill [x] crit multiplies separately: medium-high.
//     https://d4guides.gg/en/guides/mechanics/damage-calculation-in-diablo-4-how-your-damage-works
// [B] Blizzard season 2 dev note, quoted in Mobalytics (high for the quoted baseline; 2023):
//     https://mobalytics.gg/diablo-4/guides/damage-buckets-deep-dive
// [C] Wowhead, season 2 change, 2023 (high for the quoted baseline):
//     https://www.wowhead.com/diablo-4/news/breaking-down-the-critical-strike-and-vulnerable-damage-change-diablo-4-335487
// [E] diablo4.cc glossary, datamined tooltip strings, version undated (medium that the sheet crit figure includes the inherent 50%):
//     https://diablo4.cc/us/Glossary
// [F] Blizzard forum, player reply, not staff, date unknown (low on whether every equipped weapon's [x] crit counts):
//     https://us.forums.blizzard.com/en/d4/t/weapon-stats-and-weapons-used/47095
// Base Vulnerable ×1.2: high [B][C][A]. Sheet Vulnerable Damage is additive, and only vs Vulnerable: high [B][C][A].
// Whether a sheet Vulnerable Damage percent includes that 20% is unverified: low.
// [x] Vulnerable Damage Multiplier lines sum, then 1.2 × (1 + sum): medium [A].
// Headline crit: (A + sheet crit damage) / A × (1 + sum of gear [x] crit) × each aspect/unique/skill [x] crit.
// The extra ×1.5 is dropped because the sheet figure already includes the base 50% (medium [E]).
// Whether the sheet also includes gear [x] crit, and whether a weapon [x] crit line applies only while that weapon swings: low [A][F].
// Overpower, patch 3.0 / Season 13, attached research note d4-overpower-formula.md (Research Scout):
// Overpower adds to the additive [+] pool and stacks with crit. Life and Fortify do not scale it.
// The build scorer puts sheet Overpower Damage in that additive pool and passes overpowerPct null, so this multiplier stays 1.
// A direct compute() call can still pass overpowerPct. That path is the pre-3.0 multiplier and the build scorer does not use it.
export const BUCKETS=['additive','multiplicative','mainstat','crit','vuln','overpower'];
export const SEPARATE_CRIT_KINDS=new Set(['aspect','unique','skill']);
const VULN_BASE=1.2;
function percentFactor(list,mode){
  if(mode==='product')return list.reduce((p,m)=>p*(1+m.value/100),1);
  return 1+list.reduce((s,m)=>s+m.value/100,0);
}
export function critMultiplier(mods){
  const gear=mods.filter(m=>!SEPARATE_CRIT_KINDS.has(m.kind));
  const separate=mods.filter(m=>SEPARATE_CRIT_KINDS.has(m.kind));
  const gearX=1+gear.reduce((s,m)=>s+m.value/100,0);
  const separateX=separate.reduce((p,m)=>p*(1+m.value/100),1);
  return {gear,separate,gearX,separateX,factor:gearX*separateX};
}
function activeMods(inp){
  return (inp.modifiers||[]).filter(m=>m.active!==false&&typeof m.value==='number'&&!(inp.isDot&&(m.bucket==='crit-mult'||m.bucket==='crit')));
}
export function compute(inp){
  const mods=activeMods(inp);
  const terms=[],skipped=(inp.modifiers||[]).filter(m=>typeof m.value!=='number').map(m=>m.name);
  const base=(inp.weaponDmg??0)*((inp.coeffPct??0)/100);
  terms.push({label:'Base = weapon × coeff',value:base,expr:`${inp.weaponDmg} × ${(inp.coeffPct??0)/100}`});
  const sheetAdd=typeof inp.additivePct==='number';
  const addMods=mods.filter(m=>m.bucket==='additive'&&(!sheetAdd||m.sheetConditional===true));
  const addSum=addMods.reduce((s,m)=>s+m.value/100,0);
  const add=sheetAdd?1+inp.additivePct/100+addSum:1+addSum;
  const shown=n=>String(Number((n/100).toFixed(4)));
  const addExpr=sheetAdd?`1 + ${shown(inp.additivePct)} (sheet All Damage)${addMods.length?' + '+addMods.map(m=>`${shown(m.value)} (${m.name})`).join(' + '):''}`:'1 + '+addMods.map(m=>`${shown(m.value)} (${m.name})`).join(' + ');
  terms.push({label:'Additive',value:add,expr:addExpr});
  const mm=mods.filter(m=>m.bucket==='multiplicative');
  const mul=mm.reduce((p,m)=>p*(1+m.value/100),1);
  terms.push({label:'Multiplicative',value:mul,expr:mm.map(m=>`(1+${m.value/100}) ${m.name}`).join(' × ')||'1'});
  const ms=1+((inp.mainStat??0)/10)*((inp.mainStatPer10??0)/100);
  terms.push({label:'Main stat',value:ms,expr:`1 + ${inp.mainStat}/10 × ${(inp.mainStatPer10??0)/100}`});
  const csd=(inp.critDmg??0)/100;
  const critMods=mods.filter(m=>m.bucket==='crit-mult');
  const critParts=critMultiplier(critMods);
  const critX=critParts.factor;
  const chance=(inp.critChance??0)/100;
  const A=add>0?add:1;
  const critFull=((A+csd)/A)*critX;
  const crit=inp.isDot||chance<=0?1:(chance>=1?critFull:(1-chance)+chance*critFull);
  const gearText=critParts.gear.length?`${Number(critParts.gearX.toFixed(4))} gear [x] (${critParts.gear.map(m=>`${m.value}%`).join(' + ')})`:'1 gear [x]';
  const separateText=critParts.separate.length?` × ${Number(critParts.separateX.toFixed(4))} separate [x] (${critParts.separate.map(m=>`${m.value}% ${m.name}`).join(', ')})`:'';
  const critExpr=inp.isDot?'damage over time: crit and crit-damage [x] lines are left off':chance<=0?'no crit chance':`(${Number(A.toFixed(4))} + ${Number(csd.toFixed(4))}) / ${Number(A.toFixed(4))} × ${gearText}${separateText}`;
  terms.push({label:'Crit (expected)',value:crit,expr:critExpr});
  const vulnMods=mods.filter(m=>m.bucket==='vuln-mult');
  const vulnX=percentFactor(vulnMods,inp.vulnMultMode);
  const vuln=inp.vulnerable?VULN_BASE*vulnX:1;
  const vulnExpr=inp.vulnerable?`1.2 × ${Number(vulnX.toFixed(4))}${vulnMods.length?' ('+vulnMods.map(m=>`${m.value}% ${m.name}`).join(', ')+')':''}`:'inactive';
  terms.push({label:'Vulnerable',value:vuln,expr:vulnExpr});
  const op=inp.overpower?1+((inp.overpowerPct??0)+mods.filter(m=>m.bucket==='overpower').reduce((s,m)=>s+m.value,0))/100:1;
  terms.push({label:'Overpower',value:op,expr:inp.overpower?`1 + ${(inp.overpowerPct??0)/100}`:'inactive'});
  const total=base*add*mul*ms*crit*vuln*op;
  return {total,terms,skipped,buckets:{additive:add,multiplicative:mul,mainstat:ms,crit,vuln,overpower:op}};
}
// Marginal value: % gain of total from +1 percentage point in a bucket.
export function marginal(inp){
  const t=compute(inp).total;const out={};
  for(const b of ['additive','multiplicative','crit-mult','vuln-mult','overpower']){
    const r=compute({...inp,vulnerable:b==='vuln-mult'?true:inp.vulnerable,overpower:b==='overpower'?true:inp.overpower,
      modifiers:[...(inp.modifiers||[]),{name:'+1',bucket:b,value:1}]}).total;
    out[b]=t?(r/t-1)*100:0;}
  return out;
}
