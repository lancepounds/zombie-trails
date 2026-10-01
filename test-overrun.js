const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const box={console};vm.createContext(box);
for(const f of fs.readdirSync(__dirname).filter(f=>/^[0-7]\d_.*\.js$/.test(f)).sort()) vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),box,{filename:f});
const Z=box.ZT;
function make(from,to,n=5) {
  const s=Z.State.newGame({seed:17,partySize:n});s.at=from;s.path=['omaha',from];s.seen[from]=true;s.day=20;s.miles=355;s.stats.travelDays=10;
  Object.assign(s.inv,{food:300,fuel:30,ammo:40,medicine:0,parts:2});Z.Travel.takeLeg(s,to);return s;
}
let tested=0;
for(const from of ['ogallala','granger','forthall']) for(const road of Z.legsFrom(from)) for(const n of [1,5]) for(const choice of [0,1,2,3]) {
  let s=make(from,road.to,n);const before={miles:s.miles,day:s.day,rng:s.rng,fuel:s.inv.fuel};
  const interrupt=Z.Travel.step(s);assert.equal(interrupt.kind,'event');assert.equal(interrupt.event.id,'story_wagon_overrun');
  assert.equal(s.miles,before.miles);assert.equal(s.day,before.day);assert.equal(s.rng,before.rng);assert.equal(s.inv.fuel,before.fuel);
  assert(interrupt.event.text.includes(Z.NODES[road.to].name));
  const original=s.legTo,alternate=Z.Overrun.alternative(s).to;
  const out=Z.Events.resolve(s,interrupt.event,choice);
  assert.equal(s.legTo,choice<2?original:alternate);assert.equal(s.legMiles,0);assert.equal(s.miles,before.miles);
  assert.equal(s.vehicle.has,choice!==3);assert.equal(s.inv.fuel,choice===0?28:choice===1?27:choice===2?29:Math.min(30,Z.ITEMS.fuel.cap*Z.X.footCap('fuel')));
  assert.equal(s.day,before.day+(choice>=2?1:0));
  assert.equal(s.inv.ammo,choice===0?24:40);assert.equal(s.stats.shots,choice===0?16:0);
  assert.equal(s.flags.overrun.original,original);assert.equal(s.flags.overrun.to,s.legTo);
  assert.equal(out.animation,choice===3?'overrun_abandon':choice===2?'overrun_detour':'overrun_escape');
  assert(s.flags.roadMemories.some(m=>m.text===out.text));assert(!Z.Overrun.due(s));
  s=Z.State.deserialize(Z.State.serialize(s));assert.equal(s.flags.overrun.to,s.legTo);assert(!Z.Overrun.due(s));
  const next=Z.Travel.step(s);assert(!next||next.kind!=='event'||next.event.id!=='story_wagon_overrun');assert(s.legMiles>0);
  s.stats.travelDays=s.flags.overrun.travelDay+3;s.day+=3;s.lastEventDay=s.day-3;
  assert.equal(Z.Story.due(s,'travel'),'story_overrun_echo');
  const echo=Z.Events.begin(s,'story_overrun_echo');assert(echo.text.includes(Z.NODES[s.flags.overrun.to].name));
  Z.Events.resolve(s,echo,0);assert.equal(s.flags.overrunEcho,true);
  assert.notEqual(Z.Story.due(s,'travel'),'story_overrun_echo');
  assert.equal(Z.State.deserialize(Z.State.serialize(s)).flags.overrunEcho,true);tested++;
}
const poor=make('ogallala','chimney',1);poor.inv.fuel=0;poor.inv.ammo=0;poor.inv.food=0;
const forced=Z.Travel.step(poor);assert.equal(forced.kind,'event');assert.equal(forced.event.choices.length,1,'a supply-free escape must always exist');
Z.Events.resolve(poor,forced.event,0);assert.equal(poor.vehicle.has,false);assert.equal(poor.legTo,'cheyenne');
for(const fuel of [0.9,1,1.9,2,2.9,3]) for(const ammo of [15,16]) {
  const s=make('ogallala','chimney');s.inv.fuel=fuel;s.inv.ammo=ammo;
  const e=Z.Events.begin(s,'story_wagon_overrun');
  assert.equal(e.choices.length,1+(fuel>=2&&ammo>=16?1:0)+(fuel>=1?1:0)+(fuel>=3?1:0));
}
for(const tweak of [s=>{s.vehicle.has=false;},s=>{s.legMiles=10;},s=>{s.vehicle.broken='engine';},s=>{s.once.story_wagon_overrun=true;},s=>{s.at='kearney';s.legTo='ogallala';}]) {
  const s=make('ogallala','chimney');tweak(s);assert(!Z.Overrun.due(s));
}
const dying=make('ogallala','chimney',1);dying.party[0].health=5;
const out=Z.Events.resolve(dying,Z.Events.begin(dying,'story_wagon_overrun'),1);assert.equal(out.deaths.length,1);assert(dying.over);
const decline=make('ogallala','chimney');decline.flags.overrun={choice:'detoured',from:'ogallala',to:'cheyenne',travelDay:1};
const inv=JSON.stringify(decline.inv);Z.Events.resolve(decline,Z.Events.begin(decline,'story_overrun_echo'),1);assert.equal(JSON.stringify(decline.inv),inv);assert(decline.flags.overrunEcho);
assert(!Z.Events.eligible(make('ogallala','chimney'),'travel').some(e=>e.id==='story_wagon_overrun'||e.id==='story_overrun_echo'),'scripted scenes must stay out of the random pool');
console.log(`Overrun checks passed: ${tested} fork/road/party/choice paths, supply gates, guaranteed escape, save/load, no teleport or replay, delayed memories, and death handling.`);
