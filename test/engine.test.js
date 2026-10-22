import {test} from 'node:test';import assert from 'node:assert/strict';
import {compute,marginal} from '../src/engine.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a}!=${b}`);
// Placeholder numbers from plan §4.2 (not game data)
const ex={weaponDmg:120,coeffPct:185,critChance:50,critDmg:60,vulnerable:true,vulnPct:20,
 modifiers:[{name:'a',bucket:'additive',value:40},{name:'b',bucket:'additive',value:25},{name:'c',bucket:'additive',value:30},
 {name:'AspA',bucket:'multiplicative',value:25},{name:'Leg',bucket:'multiplicative',value:15}]};
test('plan 4.2 example',()=>{
  const A=1.95,csd=0.6,critFull=((A+csd)/A)*1.5,crit=0.5+0.5*critFull;
  near(compute(ex).total,120*1.85*A*1.25*1.15*crit*1.2);
});
test('additive sums, multiplicative multiplies',()=>{const r=compute(ex);near(r.buckets.additive,1.95);near(r.buckets.multiplicative,1.4375);});
test('a sheet All Damage percent replaces additive modifiers',()=>{const r=compute({...ex,additivePct:606.7});near(r.buckets.additive,7.067);assert.equal(r.terms.find(t=>t.label==='Additive').expr.includes('sheet All Damage'),true);});
test('sheet conditional rows join All Damage in one sum',()=>{const r=compute({...ex,additivePct:606.7,vulnerableDamageInAdditive:true,vulnerable:true,modifiers:[...ex.modifiers,{name:'Vulnerable Damage',bucket:'additive',value:208.8,sheetConditional:true},{name:'while Fortified',bucket:'additive',value:35,sheetConditional:true}]});near(r.buckets.additive,1+(606.7+208.8+35)/100);near(r.buckets.vuln,1.2);});
test('vulnerable base and summed crit multipliers',()=>{
  const r=compute({weaponDmg:100,coeffPct:100,additivePct:100,critChance:100,critDmg:100,vulnerable:true,modifiers:[{name:'Melted Heart',bucket:'vuln-mult',value:35},{name:'weapon',bucket:'crit-mult',value:50}]});
  near(r.buckets.additive,2);
  near(r.buckets.crit,((2+1)/2)*1.5*1.5);
  near(r.buckets.vuln,1.2*1.35);
  const product=compute({weaponDmg:100,coeffPct:100,critChance:0,vulnerable:true,vulnMultMode:'product',modifiers:[{name:'a',bucket:'vuln-mult',value:35},{name:'b',bucket:'vuln-mult',value:10}]});
  near(product.buckets.vuln,1.2*1.35*1.1);
});
test('null values skipped and reported',()=>{const r=compute({weaponDmg:100,coeffPct:100,modifiers:[{name:'x',bucket:'multiplicative',value:null}]});near(r.total,100);assert.deepEqual(r.skipped,['x']);});
test('mainstat 0.8 per 10',()=>near(compute({weaponDmg:100,coeffPct:100,mainStat:1000,mainStatPer10:0.8}).total,180));
test('dot no crit',()=>near(compute({weaponDmg:100,coeffPct:100,critChance:100,critDmg:100,isDot:true}).total,100));
test('inactive modifier ignored',()=>near(compute({weaponDmg:1,coeffPct:100,modifiers:[{name:'x',bucket:'multiplicative',value:50,active:false}]}).total,1));
test('additive dilution: marginal additive < multiplicative',()=>{const m=marginal(ex);assert.ok(m.additive<m.multiplicative);});
