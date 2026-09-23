/* Native pixel-art QA. Optional dev dependency: @napi-rs/canvas.
   node test-render.js [--previews docs/previews]
   The playable game and npm test remain dependency-free. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const { createCanvas } = require('@napi-rs/canvas');
const errors = [];
const box = { console, document: { createElement(tag) { assert.equal(tag, 'canvas'); return createCanvas(320,160); } } };
vm.createContext(box);
for(const f of fs.readdirSync(__dirname).filter(f => /^\d+_.*\.js$/.test(f) && Number(f.slice(0,2)) <= 80).sort()) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),box,{filename:f});
}
const Z = box.ZT;
for(const [key,fn] of Object.entries(Z.R.scenes)) {
  Z.R.scenes[key] = (...args) => { try { return fn(...args); } catch(e) { errors.push(key+': '+e.message); throw e; } };
}
function state(region='platte',partySize=5,vehicle=true) {
  const s=Z.State.newGame({seed:173,partySize}); const leg=Z.LEGS.find(l=>l.region===region);
  s.at=leg.from;s.legTo=leg.to;s.legMiles=24;s.vehicle.has=vehicle;s.day=12;
  return s;
}
function freeze(o) { Object.freeze(o); for(const v of Object.values(o)) if(v&&typeof v==='object'&&!Object.isFrozen(v)) freeze(v); return o; }
const cv=createCanvas(320,160);
let renders=0;
function draw(key,s,t,opt={}) {
  const before=JSON.stringify(s);
  Z.R.draw(cv,key,s,t,{dist:t*30,elapsed:t,reduce:true,...opt});renders++;
  assert.equal(JSON.stringify(s),before,key+' rendering altered the journey');
  return Buffer.from(cv.getContext('2d').getImageData(0,0,320,160).data);
}
const keys=Object.keys(Z.R.scenes);
for(const theme of ['light','dark']) {
  Z.Display.setTheme(theme);Z.R.setScanlines(false);
  for(const key of keys) for(const wx of Object.keys(Z.WEATHER)) {
    for(const variant of [0,1]) {
      const s=state(variant?'bear':'platte',variant?1:5,!variant);s.weather=wx;
      if(variant) {s.vehicle.engine=15;s.vehicle.body=20;s.vehicle.broken='engine';}
      freeze(s);
      const first=draw(key,s,0.7,{motion:false});
      assert.deepEqual(draw(key,s,9.2,{motion:false}),first,key+' must freeze with motion off');
      draw(key,s,2.4,{motion:true,settled:true});
    }
  }
  // Every travel region and destination; every party size in the hand-drawn scenes.
  for(const region of Object.keys(Z.REGIONS)) draw('travel',freeze(state(region)),3,{motion:true});
  for(const n of [1,2,3,4,5]) for(const vehicle of [false,true]) {
    for(const key of ['camp','summer_flat','cold_drinks','ice_freezer','beer_tent','sprinkler','hood','sick']) draw(key,freeze(state('platte',n,vehicle)),2.4,{motion:true,settled:true});
  }
  // Animation must move the intended props while a settled car stays parked.
  for(const key of ['camp','summer_flat','cold_drinks','beer_tent','sprinkler']) {
    const s=freeze(state());
    assert.notDeepEqual(draw(key,s,0.3,{motion:true,settled:true}),draw(key,s,2.7,{motion:true,settled:true}),key+' animation must be visible');
  }
  const s=freeze(state());
  const parkedA=draw('cold_drinks',s,0.4,{motion:true,settled:true});
  const parkedB=draw('cold_drinks',s,2.7,{motion:true,settled:true});
  for(let y=120;y<147;y++) for(let x=108;x<166;x++) {
    const p=(y*320+x)*4;
    assert(parkedA.subarray(p,p+4).equals(parkedB.subarray(p,p+4)),'the settled wagon must not replay its arrival or wheel spin');
  }
  assert.notDeepEqual(draw('cold_drinks',s,0,{motion:true}),draw('cold_drinks',s,3.1,{motion:true}),'arrival should move the wagon');
  // A spare-tire choice plays once, holds its finish, and skips motion accessibly.
  for(const key of ['tire','summer_flat']) {
    const opts={motion:true,settled:true,animation:'tire_change'};
    const phases=[0,2.8,4.5,6.1,7.5,8].map(age=>draw(key,s,age,opts));
    for(let i=1;i<phases.length;i++) assert.notDeepEqual(phases[i],phases[i-1],key+' must visibly advance the repair');
    assert.deepEqual(draw(key,s,30,opts),phases[5],key+' must hold the completed repair instead of looping');
    assert.deepEqual(draw(key,s,0.1,{...opts,motion:false}),phases[5],key+' reduced motion must show the finished repair');
    assert.notDeepEqual(draw(key,s,8,{motion:true,settled:true}),phases[5],key+' must not fit a spare before a repair choice');
    assert.deepEqual(draw(key,s,99,{...opts,elapsed:2.8}),phases[1],key+' must use time since this outcome, not total play time');
    for(const pixels of phases) for(let p=0;p<pixels.length;p+=4) {
      assert(['24,24,24,255','232,232,232,255'].includes(Array.from(pixels.subarray(p,p+4)).join(',')),key+' repair must stay pixel monochrome');
    }
  }
  // Palette is exact ink/paper at native resolution for the new illustrations.
  const fuelOpts={motion:true,settled:true,animation:'refuel'};
  const fuelPhases=[0.3,2,3.2,5.2,6.5,7.5,8].map(age=>draw('station',s,age,fuelOpts));
  for(let i=1;i<fuelPhases.length;i++) assert.notDeepEqual(fuelPhases[i],fuelPhases[i-1],'refueling must visibly advance');
  assert.deepEqual(draw('station',s,35,fuelOpts),fuelPhases[6],'refueling must not loop');
  assert.deepEqual(draw('station',s,0,{...fuelOpts,motion:false}),fuelPhases[6],'reduced motion shows fuel secured');
  assert.deepEqual(draw('station',s,99,{...fuelOpts,elapsed:3.2}),fuelPhases[2],'refueling uses scene age');
  assert.notDeepEqual(draw('station',s,8,{motion:true,settled:true}),fuelPhases[6],'no refueling before a successful choice');
  const foot=freeze(state('platte',1,false));
  assert.deepEqual(draw('station',foot,3,fuelOpts),draw('station',foot,3,{motion:true,settled:true}),'no phantom refueling wagon on foot');
  for(const n of [1,2,3,4,5]) draw('station',freeze(state('platte',n)),4,fuelOpts);
  const allowed=new Set(['24,24,24,255','232,232,232,255']);
  for(const pixels of fuelPhases) for(let p=0;p<pixels.length;p+=4) assert(allowed.has(Array.from(pixels.subarray(p,p+4)).join(',')),'refueling must stay pixel monochrome');
  for(const key of ['travel','summer_flat','cold_drinks','beer_tent','sprinkler','camp','title']) {
    const pixels=draw(key,s,2.4,{motion:true,settled:true});
    for(let p=0;p<pixels.length;p+=4) assert(allowed.has(Array.from(pixels.subarray(p,p+4)).join(',')),key+' introduced an antialiased or off-palette pixel');
  }
  Z.R.setScanlines(true);draw('summer_flat',s,1,{reduce:false});Z.R.setScanlines(false);
  console.log(`${theme} graphics passed (${renders} renders so far).`);
}
assert.deepEqual(errors,[],'scene exceptions are not allowed even though the UI catches them');

const at=process.argv.indexOf('--previews');
if(at>=0) {
  const out=path.resolve(process.argv[at+1]||'docs/previews');fs.mkdirSync(out,{recursive:true});
  const shots=[
    ['travel','platte','clear','THE PLATTE ROAD'],['travel','bear','clear','MOUNTAIN COUNTRY'],
    ['summer_flat','platte','heat','ONE OF THOSE DAYS'],['cold_drinks','platte','heat','SOMETHING COLD'],
    ['beer_tent','platte','heat','COUNTY FAIR'],['camp','bear','clear','CAMP FOR THE NIGHT'],
  ];
  for(const theme of ['light','dark']) {
    Z.Display.setTheme(theme);
    const sheet=createCanvas(1280,1098), c=sheet.getContext('2d');const palette=Z.Display.palette();
    c.fillStyle=palette.paper;c.fillRect(0,0,sheet.width,sheet.height);c.font='bold 16px monospace';
    for(let i=0;i<shots.length;i++) {
      const [key,region,weather,label]=shots[i],s=state(region);s.weather=weather;
      const tile=createCanvas(640,320);Z.R.draw(tile,key,s,2.4,{motion:true,reduce:true,settled:true,dist:75});
      const x=i%2*640,y=Math.floor(i/2)*366;c.fillStyle=palette.ink;c.fillText(label,x+16,y+28);c.drawImage(tile,x,y+40);
    }
    fs.writeFileSync(path.join(out,`retro-graphics-${theme}.png`),sheet.toBuffer('image/png'));
  }
}
console.log(`Graphics checks passed: ${keys.length} scenes, ${renders} native renders; both themes, weather, party sizes, on-foot play, frozen motion, visible animation, parked arrivals, exact palette, and unchanged game state/RNG.`);
