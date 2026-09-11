/* Road atlas. Pure read-only projections of the route graph and saved journey.
   Distances follow game roads; straight map segments join their real endpoints. */
'use strict';
ZT.Atlas = {
  width: 1120, height: 460,
  escape(text) { return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  key(l) { return l.from + '>' + l.to; },

  // Shortest path to an arbitrary stop, not a difference of distances to Boise.
  route(from, to) {
    if (!ZT.NODES[from] || !ZT.NODES[to]) return null;
    const todo = [{ id: from, miles: 0, legs: [] }], done = new Set();
    while (todo.length) {
      todo.sort((a, b) => a.miles - b.miles);
      const next = todo.shift();
      if (next.id === to) return { miles: next.miles, legs: next.legs };
      if (done.has(next.id)) continue;
      done.add(next.id);
      for (const leg of ZT.legsFrom(next.id)) {
        if (!done.has(leg.to)) todo.push({ id: leg.to, miles: next.miles + leg.miles, legs: next.legs.concat(leg) });
      }
    }
    return null;
  },
  fromYou(s, id) {
    const live = ZT.currentLeg(s);
    const route = this.route(live ? live.to : s.at, id);
    if (!route) return null;
    return { miles: route.miles + (live ? Math.max(0, live.miles - s.legMiles) : 0),
      legs: live ? [live].concat(route.legs) : route.legs };
  },
  status(s, id) {
    if (id === s.at && !s.legTo) return 'here';
    if ((s.path || []).includes(id)) return 'passed';
    return this.fromYou(s, id) ? 'ahead' : 'off';
  },
  distanceText(s, id) {
    const status = this.status(s, id);
    if (status === 'here') return 'You are here';
    if (status === 'passed') return 'Traveled';
    if (status === 'off') return 'Other branch';
    return Math.round(this.fromYou(s, id).miles) + ' mi ahead';
  },
  roadStatus(s, l) {
    if (s.at === l.from && s.legTo === l.to) return 'current';
    const path = s.path || [];
    if (path.some((id, i) => id === l.from && path[i + 1] === l.to)) return 'traveled';
    return ZT.reachable(s.legTo || s.at, l.from) ? 'ahead' : 'off';
  },
  preview(s, selected, destination) {
    const approach = this.fromYou(s, selected);
    if (!approach) return [];
    const branch = destination && ZT.legBetween(selected, destination);
    if (!branch) return approach.legs;
    const onward = this.route(destination, ZT.END_NODE);
    return approach.legs.concat(branch, onward ? onward.legs : []);
  },
  legEstimate(s, leg) {
    const reg = ZT.REGIONS[leg.region], wx = ZT.WEATHER[s.weather];
    const remaining = s.at === leg.from && s.legTo === leg.to ? Math.max(0, leg.miles - s.legMiles) : leg.miles;
    // A shallow view changes only the location used by the existing MPG function.
    const view = Object.assign({}, s, { at: leg.from, legTo: leg.to });
    let daily;
    if (s.vehicle.has) {
      daily = ZT.PACE[s.pace].mpd * wx.speed * reg.road * ZT.Vehicle.speedFactor(s);
      if (ZT.State.hasRole(s, 'driver')) daily *= 1.08;
      const fatigue = ZT.Party.avgFatigue(s);
      if (fatigue > 60) daily *= 1 - (fatigue - 60) / 200;
      daily *= 1 - Math.min(0.3, ZT.State.alive(s).filter(m => m.health < 40 || m.inf === 'symptomatic').length * 0.08);
      daily = Math.max(4, daily);
    } else {
      daily = Math.max(3, 12 * wx.speed * (0.85 + ZT.Party.avgHealth(s) / 100 * 0.3) *
        ZT.clamp(1 - ZT.Party.avgFatigue(s) / 250, 0.6, 1));
    }
    const days = Math.ceil(remaining / daily);
    return { remaining, days, fuel: s.vehicle.has ? remaining / ZT.Vehicle.mpg(view) : null,
      food: days * ZT.State.aliveCount(s) * ZT.RATIONS[s.rations].lbs * (s.vehicle.has ? 1 : 1.15),
      dead: reg.density < 0.25 ? 'Sparse' : reg.density < 0.5 ? 'Scattered' : 'Crowded',
      surface: reg.road >= 0.85 ? 'Faster going' : reg.road >= 0.75 ? 'Slower going' : 'Rough going' };
  },
  camera(zoom, center) {
    const z = [1, 1.6, 2.5, 4].includes(zoom) ? zoom : 1;
    const base = { west: -117.7, east: -94.7, south: 39.5, north: 45.0 };
    const dx = (base.east - base.west) / z, dy = (base.north - base.south) / z;
    const lon = z === 1 ? (base.west + base.east) / 2 : ZT.clamp(center.lon, base.west + dx / 2, base.east - dx / 2);
    const lat = z === 1 ? (base.south + base.north) / 2 : ZT.clamp(center.lat, base.south + dy / 2, base.north - dy / 2);
    const k = Math.cos(42 * Math.PI / 180), scale = Math.min((this.width - 112) / (dx * k), (this.height - 92) / dy);
    return { scale, project: p => ({ x: this.width / 2 + (p.lon - lon) * k * scale,
      y: this.height / 2 - (p.lat - lat) * scale }) };
  },
  layout(s, opt) {
    const camera = this.camera(opt.zoom || 1, opt.center || ZT.position(s));
    const point = camera.project, you = point(ZT.position(s));
    const inside = p => p.x >= 28 && p.x <= this.width - 28 && p.y >= 35 && p.y <= this.height - 35;
    const nodes = Object.keys(ZT.NODES).map(id => Object.assign({ id }, point(ZT.NODES[id]))).filter(inside);
    const priority = id => id === opt.selected ? 0 : id === (s.legTo || s.at) ? 1 : ['start', 'end', 'fork'].includes(ZT.NODES[id].kind) ? 2 : 3;
    nodes.sort((a, b) => priority(a.id) - priority(b.id));
    const occupied = nodes.map(p => ({ x: p.x - 13, y: p.y - 13, w: 26, h: 26 }));
    for (const st of ZT.GEO.states) {
      const p = point({ lat: st.label[0], lon: st.label[1] });
      if (inside(p)) occupied.push({ x: p.x - st.name.length * 7, y: p.y - 18, w: st.name.length * 14, h: 24 });
    }
    if (inside(you)) occupied.push({ x: you.x - 15, y: you.y - 17, w: 30, h: 34 });
    const overlap = (a, b) => a.x < b.x + b.w + 5 && a.x + a.w + 5 > b.x && a.y < b.y + b.h + 5 && a.y + a.h + 5 > b.y;
    // Give every visible place a readable label, with short leader lines where crowded.
    for (const p of nodes) {
      const text = ZT.NODES[p.id].name.toUpperCase();
      const w = text.length * 10.9 + 10, h = 25;
      const candidates = [];
      for (const gap of [18, 44, 72, 100, 128, 156]) {
        for (const align of [0.5, 0.25, 0.75, 0, 1]) {
          candidates.push({ x: p.x - w * align, y: p.y - gap - h, w, h }, { x: p.x - w * align, y: p.y + gap, w, h });
        }
        candidates.push({ x: p.x + gap, y: p.y - h / 2, w, h }, { x: p.x - gap - w, y: p.y - h / 2, w, h });
      }
      const label = candidates.find(a => a.x >= 8 && a.y >= 28 && a.x + a.w <= this.width - 8 &&
        a.y + a.h <= this.height - 26 && !occupied.some(b => overlap(a, b)));
      if (label) { p.label = Object.assign({ text }, label); occupied.push(label); }
    }
    return { camera, nodes, you, inside };
  },
  svg(s, opt) {
    const esc = this.escape, { camera, nodes, you, inside } = this.layout(s, opt);
    const project = camera.project;
    const path = pts => pts.map((p, i) => { const q = project({ lat: p[0], lon: p[1] }); return `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(' ');
    const segment = (a, b) => `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
    const highlighted = new Set(this.preview(s, opt.selected, opt.route).map(l => this.key(l)));
    const lines = ZT.LEGS.map(l => {
      const a = project(ZT.NODES[l.from]), b = project(ZT.NODES[l.to]), type = this.roadStatus(s, l);
      let d = `<path class="atlas-road ${type}" d="${segment(a, b)}"/>`;
      if (highlighted.has(this.key(l))) d += `<path class="atlas-route-preview" d="${segment(a, b)}"/>`;
      if (type === 'current') d += `<path class="atlas-road traveled" d="${segment(a, you)}"/>`;
      return d;
    }).join('');
    const shapes = nodes.map(p => {
      const n = ZT.NODES[p.id], label = p.label, selected = p.id === opt.selected;
      const status = this.status(s, p.id), fork = n.kind === 'fork';
      const marker = fork ? `<path d="M${p.x},${p.y - 8} l8,8 -8,8 -8,-8 Z"/>` : `<rect x="${p.x - 6}" y="${p.y - 6}" width="12" height="12"/>`;
      const leader = label ? `<path class="atlas-leader" d="${segment(p, {x: ZT.clamp(p.x, label.x, label.x + label.w), y: ZT.clamp(p.y, label.y, label.y + label.h)})}"/>` : '';
      return `<g class="atlas-stop ${status}${selected ? ' selected' : ''}" data-map-stop="${p.id}" role="button" tabindex="0" aria-pressed="${selected}" aria-label="${esc(n.name + ', ' + this.distanceText(s, p.id))}">
        <title>${esc(n.name + ' — ' + this.distanceText(s, p.id))}</title>${leader}
        <rect class="atlas-hit" x="${p.x - 28}" y="${p.y - 28}" width="56" height="56"/>
        <g class="atlas-symbol">${marker}</g>
        ${selected ? `<rect class="atlas-selection" x="${p.x - 12}" y="${p.y - 12}" width="24" height="24"/>` : ''}
        ${label ? `<rect class="atlas-label-bg" x="${label.x}" y="${label.y}" width="${label.w}" height="${label.h}"/>
          <text class="atlas-label" x="${label.x + 5}" y="${label.y + 18}">${esc(label.text)}</text>` : ''}
      </g>`;
    }).join('');
    const states = ZT.GEO.states.map(st => `<path class="atlas-boundary" d="${path(st.pts)}"/>`).join('');
    const rivers = ZT.GEO.rivers.map(rv => `<path class="atlas-river" d="${path(rv.pts)}"/>`).join('');
    const names = ZT.GEO.states.map(st => {
      const p = project({ lat: st.label[0], lon: st.label[1] });
      return inside(p) ? `<text class="atlas-state-name" x="${p.x}" y="${p.y}" text-anchor="middle">${esc(st.name)}</text>` : '';
    }).join('');
    const scaleMiles = (opt.zoom || 1) >= 2.5 ? 50 : 200, scaleWidth = scaleMiles / 69 * camera.scale;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="atlas-chart" viewBox="0 0 ${this.width} ${this.height}" aria-label="Road atlas: select a stop to inspect it" role="group">
      <style>
        .atlas-paper {fill:#080b0c}.atlas-boundary{fill:none;stroke:#454e4a;stroke-width:1;stroke-dasharray:3 5}
        .atlas-river{fill:none;stroke:#303d38;stroke-width:2}.atlas-state-name{font:16px monospace;fill:#727e77;letter-spacing:4px}
        .atlas-road{fill:none;stroke:#b0bcb4;stroke-width:2.5;stroke-dasharray:5 7}.atlas-road.off{stroke:#555f59;stroke-dasharray:1 9}
        .atlas-road.traveled{stroke:#edf1e9;stroke-width:5;stroke-dasharray:none}.atlas-road.current{stroke:#edf1e9;stroke-width:3;stroke-dasharray:12 5}
        .atlas-route-preview{fill:none;stroke:#edf1e9;stroke-width:6;stroke-linecap:round;stroke-dasharray:1 13}
        .atlas-stop{cursor:pointer}.atlas-symbol{stroke:#edf1e9;stroke-width:2;fill:#080b0c}.atlas-stop.passed .atlas-symbol{fill:#edf1e9}
        .atlas-stop.off .atlas-symbol{stroke:#727e77}.atlas-selection{fill:none;stroke:#edf1e9;stroke-width:2}
        .atlas-leader{stroke:#89968d;stroke-width:1;fill:none}.atlas-hit{fill:transparent;stroke:none}
        .atlas-label-bg{fill:#080b0c;stroke:none}.atlas-label{font:bold 18px monospace;fill:#edf1e9}
        .atlas-stop.off .atlas-label{fill:#9da89f}.atlas-stop.selected .atlas-label-bg{fill:#edf1e9}
        .atlas-stop.selected .atlas-label{fill:#080b0c}.atlas-stop:focus .atlas-label-bg,.atlas-stop:hover .atlas-label-bg{fill:#edf1e9}
        .atlas-stop:focus .atlas-label,.atlas-stop:hover .atlas-label{fill:#080b0c}
        .atlas-stop:focus{outline:none}.atlas-stop:focus .atlas-hit{stroke:#edf1e9;stroke-width:2;stroke-dasharray:4 3}
        .atlas-you{fill:#edf1e9;stroke:#080b0c;stroke-width:3;pointer-events:none}.atlas-caption{font:16px monospace;fill:#edf1e9}
      </style>
      <defs><clipPath id="atlas-clip"><rect x="1" y="1" width="${this.width - 2}" height="${this.height - 2}"/></clipPath></defs>
      <rect class="atlas-paper" width="${this.width}" height="${this.height}"/>
      <g clip-path="url(#atlas-clip)">${states}${rivers}${names}${lines}${shapes}
      ${inside(you) ? `<g aria-hidden="true"><path class="atlas-you" d="M${you.x},${you.y - 16} l12,23 -12,-5 -12,5 Z"/></g>` : ''}</g>
      <g aria-hidden="true"><text class="atlas-caption" x="18" y="22">N ↑ · WEST ←</text>
        <path d="M20,${this.height - 22} v6 h${scaleWidth} v-6" stroke="#b0bcb4" fill="none" stroke-width="2"/>
        <text class="atlas-caption" x="${26 + scaleWidth}" y="${this.height - 11}">~${scaleMiles} MI</text></g>
    </svg>`;
  },
};
