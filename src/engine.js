// Class-agnostic damage engine. Buckets per d4-v1-plan.md section 4 (community model, VERIFY per patch).
export const BUCKETS=['additive','multiplicative','mainstat','crit','vuln','overpower'];
export function compute(inp){
  const mods=(inp.modifiers||[]).filter(m=>m.active!==false&&typeof m.value==='number');
  const terms=[],skipped=(inp.modifiers||[]).filter(m=>typeof m.value!=='number').map(m=>m.name);
  const base=(inp.weaponDmg??0)*((inp.coeffPct??0)/100);
  terms.push({label:'Base = weapon × coeff',value:base,expr:`${inp.weaponDmg} × ${(inp.coeffPct??0)/100}`});
  const add=1+mods.filter(m=>m.bucket==='additive').reduce((s,m)=>s+m.value/100,0);
  terms.push({label:'Additive',value:add,expr:'1 + '+mods.filter(m=>m.bucket==='additive').map(m=>`${m.value/100} (${m.name})`).join(' + ')});
  const mm=mods.filter(m=>m.bucket==='multiplicative');
  const mul=mm.reduce((p,m)=>p*(1+m.value/100),1);
  terms.push({label:'Multiplicative',value:mul,expr:mm.map(m=>`(1+${m.value/100}) ${m.name}`).join(' × ')||'1'});
  const ms=1+((inp.mainStat??0)/10)*((inp.mainStatPer10??0)/100);
  terms.push({label:'Main stat',value:ms,expr:`1 + ${inp.mainStat}/10 × ${(inp.mainStatPer10??0)/100}`});
  const cd=(inp.critDmg??0)+mods.filter(m=>m.bucket==='crit').reduce((s,m)=>s+m.value,0);
  const crit=inp.isDot?1:1+(inp.critChance??0)/100*cd/100;
  terms.push({label:'Crit (expected)',value:crit,expr:inp.isDot?'DoT: no crit [VERIFY]':`1 + ${(inp.critChance??0)/100} × ${cd/100}`});
  const vp=(inp.vulnPct??0)+mods.filter(m=>m.bucket==='vuln').reduce((s,m)=>s+m.value,0);
  const vuln=inp.vulnerable?1+vp/100:1;
  terms.push({label:'Vulnerable',value:vuln,expr:inp.vulnerable?`1 + ${vp/100}`:'inactive'});
  const op=inp.overpower?1+((inp.overpowerPct??0)+mods.filter(m=>m.bucket==='overpower').reduce((s,m)=>s+m.value,0))/100:1;
  terms.push({label:'Overpower',value:op,expr:inp.overpower?`1 + ${(inp.overpowerPct??0)/100}`:'inactive'});
  const total=base*add*mul*ms*crit*vuln*op;
  return {total,terms,skipped,buckets:{additive:add,multiplicative:mul,mainstat:ms,crit,vuln,overpower:op}};
}
// Marginal value: % gain of total from +1 percentage point in a bucket.
export function marginal(inp){
  const t=compute(inp).total;const out={};
  for(const b of ['additive','multiplicative','crit','vuln','overpower']){
    const r=compute({...inp,vulnerable:b==='vuln'?true:inp.vulnerable,overpower:b==='overpower'?true:inp.overpower,
      modifiers:[...(inp.modifiers||[]),{name:'+1',bucket:b,value:1}]}).total;
    out[b]=t?(r/t-1)*100:0;}
  return out;
}
