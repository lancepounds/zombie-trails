/* A one-time, untimed crisis at a real route fork. Consequences are saved flags. */
'use strict';
ZT.Overrun = {
  due(s) {
    return !!(s.vehicle.has && !s.vehicle.broken && s.legTo && s.legMiles === 0 &&
      ZT.legsFrom(s.at).length === 2 && !s.once.story_wagon_overrun && !s.flags.overrun);
  },
  alternative(s) { return ZT.legsFrom(s.at).find(l => l.to !== s.legTo); },
  finish(s, c, choice, reroute, text) {
    const from=s.at, original=s.legTo;
    if (reroute) {
      const alternative=this.alternative(s);
      ZT.Travel.takeLeg(s, alternative.to);
      ZT.X.d(c, `NEW ROAD: ${ZT.NODES[alternative.to].name} (${alternative.miles} miles)`);
    }
    s.flags.overrun={choice,from,original,to:s.legTo,day:s.day,travelDay:s.stats.travelDays};
    c.animation=choice==='abandoned'?'overrun_abandon':reroute?'overrun_detour':'overrun_escape';
    return ZT.Story.remember(s,text);
  },
};
ZT.Events.add([
  { id:'story_wagon_overrun', cat:'zombie', once:true, cond:()=>false, art:'zfork',
    text(s) {
      const road=ZT.currentLeg(s), alternate=ZT.Overrun.alternative(s);
      return `At the ${ZT.NODES[s.at].name} junction, the wagon stops behind a wreck. A hand slaps the driver's window. Then another. The dead climb onto the hood and roof. Ahead, ${road.road} leads to ${ZT.NODES[road.to].name} (${road.miles} miles). The other branch leads to ${ZT.NODES[alternate.to].name} (${alternate.miles} miles). You have to choose what goes west with you.`;
    }, choices:[
      { text:'Shoot a gap and keep the chosen road', hint:'16 rounds + 2 gal fuel; body -8, fatigue +8, horde +18',
        show:s=>s.inv.ammo>=16 && s.inv.fuel>=2,
        do(s,c) {
          ZT.X.shots(s,c,16);ZT.X.take(s,c,'fuel',2);ZT.X.wear(s,c,'body',8);
          ZT.X.fatigueAll(s,c,8);ZT.X.noise(s,c,25);ZT.X.horde(s,c,18);
          return ZT.Overrun.finish(s,c,'fought',false,`Sixteen shots clear just enough road. The wagon escapes toward ${ZT.NODES[s.legTo].name}, windows cracked and the horde following the noise. You kept the road you chose. Nobody asks you to stop for a while.`);
        } },
      { text:'Ram through and keep the chosen road', hint:'3 gal fuel; body -24, engine -10, everyone -8 health, fatigue +12',
        show:s=>s.inv.fuel>=3,
        do(s,c) {
          ZT.X.take(s,c,'fuel',3);ZT.X.wear(s,c,'body',24);ZT.X.wear(s,c,'engine',10);
          for(const m of ZT.State.alive(s)) ZT.X.hurt(s,c,m,8,'injuries');
          ZT.X.fatigueAll(s,c,12);ZT.X.noise(s,c,15);
          return ZT.Overrun.finish(s,c,'rammed',false,`The wagon punches through. The hood buckles and everyone hits something hard. You are still headed for ${ZT.NODES[s.legTo].name}. The car will remember the junction for the rest of the trip.`);
        } },
      { text:s=>`Reverse out and detour toward ${ZT.NODES[ZT.Overrun.alternative(s).to].name}`,
        hint:'1 gal fuel + 1 day of food; body -6, fatigue +16; switch route', show:s=>s.inv.fuel>=1,
        do(s,c) {
          const destination=ZT.NODES[ZT.Overrun.alternative(s).to].name;
          ZT.X.take(s,c,'fuel',1);ZT.X.wear(s,c,'body',6);ZT.X.fatigueAll(s,c,16);
          const text=ZT.Overrun.finish(s,c,'detoured',true,`You reverse through the wrecks and escape onto the other branch toward ${destination}. A day goes into waiting out the dead and finding a way back onto that road. The wagon survives, but your planned route is gone.`);
          ZT.X.delay(s,c,1);return text;
        } },
      { text:s=>`Leave the wagon and escape on foot toward ${ZT.NODES[ZT.Overrun.alternative(s).to].name}`,
        hint:'Lose the wagon and supplies above carrying limits; 1 day of food, fatigue +20, morale -12; switch route',
        do(s,c) {
          const destination=ZT.NODES[ZT.Overrun.alternative(s).to].name;
          ZT.X.loseVehicle(s,c,'overrun at the route fork');ZT.X.fatigueAll(s,c,20);ZT.X.morale(s,c,-12);
          const text=ZT.Overrun.finish(s,c,'abandoned',true,`You slip out the far doors and leave the wagon to the dead. Only what fits in your packs comes with you. The other road leads toward ${destination}. A day passes before it is safe to reach it. From here, west is measured in footsteps.`);
          ZT.X.delay(s,c,1);return text;
        } },
    ] },
  { id:'story_overrun_echo', cat:'people', once:true, cond:()=>false, art:'camp',
    text(s) {
      const f=s.flags.overrun, destination=ZT.NODES[f.to].name;
      if(f.choice==='abandoned') return `At camp, someone starts to say the supplies are in the wagon. Then remembers the ${ZT.NODES[f.from].name} junction. The walk toward ${destination} has made every pound in a pack a decision. A traveler offers a little food for the story of how you got here.`;
      if(f.choice==='detoured') return `At camp, you unfold the map. ${destination} was not the road you meant to take. A traveler marks a quiet place ahead and says the road you escaped from is still packed with dead. For once, going the wrong way may have been the right thing.`;
      return `At camp, a traveler recognizes the damage from the ${ZT.NODES[f.from].name} junction. You kept the road toward ${destination}, but everyone remembers the hands on the glass. The traveler offers a roll of cloth for the cuts. Nobody calls that junction a shortcut anymore.`;
    }, choices:[
      { text:'Share the story and accept the help', hint:s=>s.flags.overrun.choice==='abandoned'?'Gain up to 12 lb food; morale +4':s.flags.overrun.choice==='detoured'?'Horde -8; morale +4':'Gain up to 1 medicine kit; morale +4',
        do(s,c) {
          const choice=s.flags.overrun.choice;
          if(choice==='abandoned') ZT.X.give(s,c,'food',12);
          else if(choice==='detoured') ZT.X.horde(s,c,-8);
          else ZT.X.give(s,c,'medicine',1);
          ZT.X.morale(s,c,4);s.flags.overrunEcho=true;
          return ZT.Story.remember(s,'You told another traveler about the overrun wagon. The road you chose there was still with you.');
        } },
      { text:'Keep the story to yourselves', hint:'No supply or morale change',
        do(s) {s.flags.overrunEcho=true;return ZT.Story.remember(s,'You kept the story of the overrun wagon to yourselves. Nobody had forgotten.');} },
    ] },
]);
