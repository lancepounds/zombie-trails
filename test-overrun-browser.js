/* Optional integration check: Playwright and its Chromium browser. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs');
(async()=>{
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(__dirname+'/index.html'));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
    for(const choice of ['Shoot a gap','Ram through','Reverse out','Leave the wagon']) {
      await page.evaluate(()=>{
        const s=ZT.State.newGame({seed:17});Object.assign(s.inv,{food:300,fuel:30,ammo:40});s.at='ogallala';s.miles=355;s.day=20;s.path=['omaha','kearney','ogallala'];s.seen.ogallala=true;
        ZT.Travel.takeLeg(s,'chimney');ZT.Save.save(s);ZT.Save.saveSettings({motion:false,flash:false,daily:true});
      });
      await page.reload();await page.getByRole('button',{name:/Continue/}).click();
      await page.getByRole('button',{name:/Continue on the trail/}).click();
      assert.match(await page.locator('.etext').innerText(),/dead climb onto the hood and roof/);
      await page.getByRole('button',{name:new RegExp(choice)}).click();
      assert.equal(await page.locator('canvas').getAttribute('aria-label'),choice==='Leave the wagon'?'The survivors leave the overrun wagon and escape on foot along the other road.':choice==='Reverse out'?'The wagon escapes the horde onto the other branch of the road.':'The damaged wagon breaks through the horde and keeps the chosen road.');
      if(choice==='Reverse out') {await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'/tmp/overrun-mobile.png'});await page.setViewportSize({width:1100,height:850});}
      await page.getByRole('button',{name:/Continue/}).click();
      const saved=await page.evaluate(()=>ZT.Save.load());assert(saved.flags.overrun);
      assert.equal(saved.legTo,['Reverse out','Leave the wagon'].includes(choice)?'cheyenne':'chimney');assert.equal(saved.vehicle.has,choice!=='Leave the wagon');
      await page.reload();await page.getByRole('button',{name:/Continue/}).click();
      assert.match(await page.locator('#screen').innerText(),choice==='Leave the wagon'?/You are on foot/:/station wagon|wagon/i);
    }
    await page.evaluate(()=>{const s=ZT.State.newGame({seed:17});s.at='ogallala';ZT.Travel.takeLeg(s,'chimney');ZT.Save.save(s);});
    await page.reload();await page.getByRole('button',{name:/Continue/}).click();await page.getByRole('button',{name:/Continue on the trail/}).click();
    assert.equal(await page.getByRole('button',{name:/Leave the wagon/}).count(),1);assert.equal(await page.getByRole('button',{name:/Shoot a gap|Ram through|Reverse out/}).count(),0);
    assert.deepEqual(errors,[]);console.log('Browser overrun checks passed: four real UI choices, outcome descriptions, saved routes and vehicle loss, reduced motion, mobile width, resume, and zero-fuel escape.');
  } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
