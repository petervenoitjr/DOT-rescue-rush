// =====================================================================
//  DO-T: LOST AND FOUND  -  a hex tactics game (Hoplite rules) aboard the station from All Humans Are Dead
//  Made by Peter Venoit, Jr. - 2026
//  Paste this whole file into the p5.js web editor (p5 2.x) as sketch.js.
// =====================================================================

// ===== SETTINGS: STUDENTS, EDIT HERE =====
const SETTINGS = {
  credit: 'Made by Peter Venoit, Jr. — 2026',
  savePrefix: 'dot_hex',            // saved-data name on this device
  canvas: { w: 540, h: 960 },       // portrait phone shape; the page scales it to fit
  board: { hexSize: 40, top: 160 }, // hex radius in pixels, and where the first row of hexes sits
  hero: {
    hearts: 3,            // hull plates DO-T starts with
    energy: 100,          // thruster energy (refills in each new sector)
    leapCost: 50,         // energy one thrust-jump costs
    leapRange: 2,         // how far a thrust-jump reaches, in hexes
    regen: 10,            // energy back every turn
    ammoStart: 1,         // DO-T has ONE rocket fist: throw it, then go and pick it up (like Hoplite's spear)
    ammoMax: 1,
    throwRange: 3,        // how far the rocket fist flies, in a straight hex line
    bashCooldown: 3,      // turns between shield bumps
    carry: 2              // babies DO-T can carry at once
  },
  feel: { turnLock: 0.16, travelStep: 0.1 },   // travelStep = seconds per hex when walking on its own in a cleared place   // turnLock = seconds after each turn before the next tap counts
  audio: { volume: 0.7 },
  timer: { turns: 650, alarmAllAt: 0.35 },   // SELF-DESTRUCT: turns before the station blows. Below 35% left, every dark sector's alarm goes off
  alarm: { every: 7, max: 3 },          // alarm sectors: a new enemy crawls out every 7 turns (max 3) until the lights are back
  travel: { warpTurns: 6 },  // turns a map warp to a cleared sector costs
  debug: { skipTitle: false, invincible: false, revealMap: false, fixedSeed: 0 }   // fixedSeed 0 = a new station layout every run
};

// ---- the light-haters (W crawler, L pouncer, R brute, B spitter). Names are placeholders: rename them to match AHAD ----
const FOES = {
  W: { name: 'Crawler', hp: 1, move: 1, kind: 'melee' },
  L: { name: 'Pouncer', hp: 2, move: 2, kind: 'melee' },    // moves 2 hexes a turn; needs 2 hits
  R: { name: 'Brute', hp: 3, move: 1, kind: 'melee' },      // slow, needs 3 hits
  B: { name: 'Spitter', hp: 1, move: 1, kind: 'archer', range: 4 },
  // ---- the CRAB WORKER boss (Security Bay). Asleep until DO-T comes within 'wake' hexes or makes noise.
  //      Armored while it has claws: shield-bump a claw INTO the shell to crack it off. With both claws gone the eyes show and it can be hit.
  //      Every 'every' turns it lobs 'acid' bubbles: they land next turn on the marked hexes. ----
  K: { name: 'Crab Worker', hp: 3, move: 0, kind: 'boss', every: 2, acid: 3, wake: 3 },
  C: { name: 'Claw', hp: 1, move: 0, kind: 'claw' }
};

// ---- upgrades offered when DO-T repairs a circuit (solve the math first). cost = hull plates taken from his most ----
const BLESSINGS = [
  { id: 'range', name: 'Fist Booster', desc: 'Rocket fist flies 1 hex farther', cost: 1 },
  { id: 'deep', name: 'Boost Ram+', desc: 'A ram hits 2 foes in a row', cost: 0 },
  { id: 'bashcd', name: 'Shield Capacitor', desc: 'Bump every 2 turns; stuns 2 turns', cost: 1 },
  { id: 'leapR', name: 'Thruster Upgrade', desc: 'Thrust-jump 1 hex farther', cost: 1 },
  { id: 'ammo', name: 'Second Fist', desc: 'Carry one more rocket fist', cost: 0 },
  { id: 'heart', name: 'Hull Plate', desc: '1 more hull plate', cost: 0 },
  { id: 'carry', name: 'Tow Cable', desc: 'Carry 3 babies at once', cost: 0 },
  { id: 'regen', name: 'Battery Cell', desc: 'Thrust costs less, energy returns faster', cost: 1 }
];

// ---- sector looks: rock = chance a hex is a wall block, chasm = open vents, water = a coolant channel crosses,
//      open = share of hexes that must be reachable, border = walled edges (ducts) ----
const BIOMES = {
  fold:    { rock: 0.05, chasm: 0, water: false, pebbles: 0, open: 0.8, look: 'deck' },
  pasture: { rock: 0.09, chasm: 0, water: false, pebbles: 0, open: 0.7, look: 'deck' },
  brook:   { rock: 0.07, chasm: 0, water: true, pebbles: 0, open: 0.55, look: 'deck' },
  grove:   { rock: 0.15, chasm: 0, water: false, pebbles: 0, open: 0.6, look: 'garden' },
  hills:   { rock: 0.13, chasm: 1, water: false, pebbles: 0, open: 0.6, look: 'deck' },
  ridge:   { rock: 0.12, chasm: 2, water: false, pebbles: 0, open: 0.55, look: 'reactor' },
  wadi:    { rock: 0.12, chasm: 1, water: false, pebbles: 0, open: 0.6, look: 'cargo' },
  cave:    { rock: 0.12, chasm: 1, water: false, pebbles: 0, open: 0.45, border: 0.75, look: 'duct' },
  bossbay: { rock: 0.03, chasm: 0, water: false, pebbles: 0, open: 0.6, border: 0.9, look: 'security' }
};

// ---- the station map: neighbours on the grid connect unless a wall is listed ----
// foes: one letter per enemy.  sheep: lost babies there.  site: a repair circuit (puzzle -> lights on -> upgrade).  cave: a maintenance duct inside it.
// alarm: the sector starts dark with red alarms and enemies keep crawling in until its circuit is repaired.  boss: a boss room.
const WORLD = {
  start: 'dock',
  grid: [
    ['reactor', 'refinery', 'labs', 'array'],
    ['cargo', 'garden', 'shaft', 'nest'],
    ['coolant', 'nursery', 'medbay', 'mess'],
    [null, 'dock', 'bridge', null]
  ],
  walls: [['refinery', 'labs'], ['cargo', 'garden'], ['medbay', 'mess']],
  rooms: {
    dock:     { name: 'The Dock', biome: 'fold', foes: '' },
    nursery:  { name: 'Nursery Ring', biome: 'pasture', foes: 'WW', sheep: 1 },
    bridge:   { name: 'Bridge Walk', biome: 'pasture', foes: 'WB', site: true },
    coolant:  { name: 'Coolant Bay', biome: 'brook', foes: 'WW', sheep: 1, site: true },
    medbay:   { name: 'Med Bay', biome: 'hills', foes: 'WWB', sheep: 1, site: true, alarm: true },
    garden:   { name: 'Garden Deck', biome: 'grove', foes: 'WWL', sheep: 1 },
    shaft:    { name: 'Old Lift Shaft', biome: 'pasture', foes: 'WB', cave: 'pit' },
    cargo:    { name: 'Cargo Hold', biome: 'wadi', foes: 'WBB', site: true, alarm: true },
    mess:     { name: 'Mess Hall', biome: 'wadi', foes: 'LBW', site: true, alarm: true },
    nest:     { name: 'Crawler Nest', biome: 'grove', foes: 'WWWW', site: true, alarm: true },
    labs:     { name: 'Hydro Labs', biome: 'hills', foes: 'LWB', cave: 'security' },
    reactor:  { name: 'Reactor Ring', biome: 'ridge', foes: 'LWB', cave: 'core', site: true, alarm: true },
    refinery: { name: 'Refinery', biome: 'hills', foes: 'BBBW', sheep: 1, alarm: true },
    array:    { name: 'Comms Array', biome: 'ridge', foes: 'LBBW', site: true },
    pit:      { name: 'Lift Pit', biome: 'cave', foes: 'WWW', sheep: 1, parent: 'shaft' },
    core:     { name: 'Core Ducts', biome: 'cave', foes: 'LRW', sheep: 1, parent: 'reactor' },
    security: { name: 'Security Bay', biome: 'bossbay', foes: '', sheep: 1, boss: 'crab', parent: 'labs' }
  }
};
// ===== END SETTINGS: CODE BELOW =====


// =====================================================================
// DO-T (Dot)  v1.0.0  (LightHeart Labs module; see README.md here)
// A cheerful robot from All Humans Are Dead (AHAD v10, Prototype 11): the original vector rig, unchanged.
// =====================================================================
const DOT_VERSION = '1.0.0';
// dot_rig.js
// ============================================================
// ============================================================
// DO-T  -  pseudo-3D vector rig for p5.js 2.x
// Everything is flat 2D shapes, but features (visor, face, arm pods, fins, seams)
// live on an imaginary sphere and are re-projected every frame, so the visor and
// face wrap around the body and the pods / fins swing like they are real 3D.
// Art units = pixels of the reference hero art (body radius 315). draw() scales it.
// Tools: 'light' | 'ext' | 'flame' | 'empty'
// Faces: happy neutral strained tired sad heart content unimpressed defeated
// ============================================================
const DOT_REF = 315;
const D2R = Math.PI / 180;
const DOTC = {
  shade: '#CDE8EF', hi: '#E9F5F4', hi2: '#F6FBFA', rim: '#62CAF0', pale: '#BFE3F0', blue: '#2E86C8', blue2: '#1B6FB0',
  deep: '#1362A3', navy: '#16315A', screen: '#5FCAEE', face: '#0C2243', hl: '#BCE4F6', white: '#EDF6F5',
  or1: '#FFC878', or2: '#F79454', amber: '#F6B04E'
};
const FACE_ALIAS = { alert: 'neutral', wide: 'neutral', worried: 'tired', asleep: 'content' };

// ---- shape samplers (visor-local art px) ----
function dEll(cx, cy, rx, ry, n = 30) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; }
function dPill(cx, cy, w, h, n = 18) { const r = h / 2, o = []; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI; o.push([cx + w / 2 - r + Math.cos(a) * r, cy + Math.sin(a) * r]); } for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + i / n * Math.PI; o.push([cx - w / 2 + r + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function dArc(cx, cy, r, a0, a1, n = 16) { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function dBez(p0, p1, p2, p3, n = 14) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
const HEART_SIZE = 38;      // LOVE face: how big the heart eyes are (half the width of one heart, in rig units; the character sheet is about 38)
function dHeart(cx, cy, s) { const o = []; for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 2; o.push([cx + s * 16 * Math.pow(Math.sin(t), 3) / 16 * 16 / 16, cy - s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 * 16 / 16]); } return o; }
const mirrorX = (pts) => pts.map(p => [-p[0], p[1]]);

class DotRig {
  constructor() {
    this.restYaw = 29 * D2R;
    this.yaw = this.restYaw; this.yawV = 0; this.pitch = 0; this.roll = 0;
    this.facing = 1; this.t = Math.random() * 10; this.blinkT = 0; this.nextBlink = 2.5;
    this.gx = 0; this.gy = 0; this.speed = 0; this.velAng = 0; this.thrust = 0; this.flutter = 0; this.bob = 0;
    this.finPhase = Math.random() * 6; this.turnPulse = 0;
    this.fins = [
      { p: [-0.349, -0.873, -0.34], k: 1.0, w: 230, h: 120, ang: -12, col: DOTC.blue, back: true },
      { p: [0.97, 0.13, -0.2], k: 1.1, w: 84, h: 160, ang: 90, col: DOTC.blue2, back: true },
      { p: [-0.63, 0.72, -0.29], k: 1.2, w: 120, h: 250, ang: 34, col: DOTC.deep, back: true },
      { p: [0.03, 1.0, -0.2], k: 1.06, w: 175, h: 95, ang: 0, col: DOTC.deep, back: true },
      { p: [-0.9, -0.25, -0.35], k: 1.05, w: 86, h: 150, ang: 90, col: DOTC.blue2, back: true } // mirror of right fin, shows when facing left
    ];
  }

  // ---------- animation ----------
  update(dt, vx, vy, aim, opt = {}) {
    this.t += dt; const maxS = opt.maxSpeed || 235;
    const sp = Math.hypot(vx, vy); this.speed = sp; if (sp > 8) this.velAng = Math.atan2(vy, vx);
    if (Math.abs(vx) > 25) this.facing = Math.sign(vx);
    else if (opt.aimFacing && Math.abs(Math.cos(aim)) > 0.35) this.facing = Math.sign(Math.cos(aim));
    const sway = Math.sin(this.t * 0.9) * 0.05;
    const target = this.facing * this.restYaw + Math.max(-1, Math.min(1, vx / maxS)) * 0.2 * (this.facing >= 0 ? 1 : 1) + sway;
    const k = 120, c = 2 * Math.sqrt(k) * 0.55;
    this.yawV += ((target - this.yaw) * k - this.yawV * c) * dt; this.yaw += this.yawV * dt;
    const pt = Math.max(-1, Math.min(1, -vy / maxS)) * 0.38 + Math.sin(this.t * 0.7) * 0.03;
    this.pitch += (pt - this.pitch) * Math.min(1, dt * 7);
    const idle = 1 - this.thrust;
    this.roll += (Math.max(-1, Math.min(1, vx / maxS)) * 0.18 + Math.sin(this.t * 3.49) * 0.09 * idle - this.roll) * Math.min(1, dt * 6);
    this.thrust += (Math.min(1, sp / maxS) - this.thrust) * Math.min(1, dt * 8);
    this.bob = Math.sin(this.t * 3.49) * 0.035 * (0.4 + 0.6 * (1 - this.thrust)) + Math.sin(this.t * 1.3) * 0.008;
    this.flutter = Math.sin(this.t * (6 + 10 * this.thrust) + this.finPhase) * (3 + 7 * this.thrust);
    this.blinkT -= dt; this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blinkT = 0.14; this.nextBlink = 2.2 + Math.random() * 3.2; }
    const gx = Math.cos(aim) * (opt.gazeAim ? 1 : 0) + vx / maxS, gy = Math.sin(aim) * (opt.gazeAim ? 1 : 0) + vy / maxS;
    this.gx += (Math.max(-1, Math.min(1, gx)) * 9 - this.gx) * Math.min(1, dt * 8);
    this.gy += (Math.max(-1, Math.min(1, gy)) * 6 - this.gy) * Math.min(1, dt * 8);
  }

  // ---------- projection ----------
  _view(b, yaw = this.yaw, pitch = this.pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x = b[0] * cy + b[2] * sy, z = -b[0] * sy + b[2] * cy, y = b[1];
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    return [x, y * cp - z * sp, y * sp + z * cp];
  }
  _bodyFromRest(v) { return this._view(v, -this.restYaw, 0); }
  _map(lon, lat, roll, k, pts) {
    const a = lon * D2R, b = lat * D2R;
    const c = [Math.cos(b) * Math.sin(a), -Math.sin(b), Math.cos(b) * Math.cos(a)];
    const E = [Math.cos(a), 0, -Math.sin(a)], S = [Math.sin(b) * Math.sin(a), Math.cos(b), Math.sin(b) * Math.cos(a)];
    const cr = Math.cos(roll * D2R), sr = Math.sin(roll * D2R), out = [];
    for (const [u, v] of pts) {
      const uu = u * cr - v * sr, vv = u * sr + v * cr, rho = Math.hypot(uu, vv) / DOT_REF;
      let d = [0, 0, 0]; if (rho > 1e-7) { const ca = uu / (rho * DOT_REF), sa = vv / (rho * DOT_REF); d = [ca * E[0] + sa * S[0], ca * E[1] + sa * S[1], ca * E[2] + sa * S[2]]; }
      const sr2 = Math.sin(rho), cr2 = Math.cos(rho);
      const w = this._view([(c[0] * cr2 + d[0] * sr2) * k, (c[1] * cr2 + d[1] * sr2) * k, (c[2] * cr2 + d[2] * sr2) * k]);
      if (w[2] < 0) { const m = Math.hypot(w[0], w[1]) || 1; out.push([w[0] / m * DOT_REF * k, w[1] / m * DOT_REF * k, w[2]]); }
      else out.push([w[0] * DOT_REF, w[1] * DOT_REF, w[2]]);
    }
    return out;
  }
  _zc(lon, lat) { return this._view(dvec(lon, lat))[2]; }
  _poly(P) { beginShape(); for (const q of P) vertex(q[0], q[1]); endShape(CLOSE); }
  _line(P) { noFill(); beginShape(); for (const q of P) vertex(q[0], q[1]); endShape(); }

  // billboard transform for protruding parts (pods): sits on sphere, tilts with it
  _billboard(lon, lat, k, restZ, fn) {
    const bv = dvec(lon, lat), v = this._view(bv); if (v[2] < -0.12) return;
    const px = v[0] * DOT_REF * k, py = v[1] * DOT_REF * k;
    const f = Math.max(0.06, Math.min(1, Math.max(0, v[2]) / restZ)), nang = Math.atan2(v[1], v[0]);
    push(); translate(px, py); rotate(nang); scale(f, 1); rotate(-nang); fn(v, nang, f); pop();
  }

  // ---------- draw ----------
  draw(x, y, R, o = {}) {
    const face = FACE_ALIAS[o.face] || o.face || 'happy', toolId = o.tool || 'light', aim = o.aim || 0;
    const s = R / DOT_REF, sp = this.speed;
    push(); translate(x, y + this.bob * R); rotate(this.roll);
    if (sp > 20) { const st = Math.min(0.12, sp / 2600); rotate(this.velAng); scale(1 + st, 1 - st * 0.7); rotate(-this.velAng); }
    scale(s);
    // thruster glow
    noStroke();
    for (let i = 0; i < 3; i++) { fill(95, 202, 238, (22 + 55 * this.thrust) / (i + 1)); ellipse(0, DOT_REF * 1.02, DOT_REF * (0.9 - i * 0.2), DOT_REF * (0.22 + 0.4 * this.thrust) * (1 + i * 0.3)); }
    // idle sonic rings (from the 12-frame idle GIF): two cyan ellipses expand + fade from under the arm pod
    { const idleK = 1 - this.thrust; if (idleK > 0.05) { noFill(); for (let k = 0; k < 2; k++) { const ph = ((this.t / 1.8) + k * 0.5) % 1, a = Math.sin(ph * Math.PI) * 220 * idleK;
      stroke(95, 215, 250, a); strokeWeight(9 - 4 * ph); push(); translate(-DOT_REF * (1.15 + 0.12 * ph), DOT_REF * (0.52 + 0.1 * ph)); rotate(-0.2); ellipse(0, 0, 70 + 70 * ph, 190 + 90 * ph); pop(); } noStroke(); } }
    // outer glow
    for (let i = 4; i >= 1; i--) { fill(120, 210, 245, 10); circle(0, 0, DOT_REF * 2 + i * 22); }
    // tool (behind body, outside the rim)
    this._tool(toolId, aim, o.lightOn !== false);
    // back fins
    for (const f of this.fins) this._fin(f, true);
    // body
    noStroke(); fill(DOTC.shade); circle(0, 0, DOT_REF * 2);
    fill(DOTC.hi); circle(-DOT_REF * 0.05, -DOT_REF * 0.06, DOT_REF * 1.86);
    this._seams();
    // front fins (swung round in front)
    for (const f of this.fins) this._fin(f, false);
    // rim light (left)
    noFill(); stroke(DOTC.rim); strokeWeight(9); strokeCap(ROUND); arc(0, 0, DOT_REF * 2 - 4, DOT_REF * 2 - 4, Math.PI * 0.62, Math.PI * 1.32);
    noStroke();
    // pods + chest + visor (sorted by depth)
    const items = [
      { z: this._zc(-80, -2), fn: () => this._pod(-1) }, { z: this._zc(80, -2), fn: () => this._pod(1) },
      { z: 0.5, fn: () => this._chest() },
      { z: 1, fn: () => this._visor(face, o) }
    ].sort((a, b) => a.z - b.z);
    for (const it of items) it.fn();
    pop();
  }

  _seams() { // two meridian seams that rotate with the body
    stroke(DOTC.hi2); strokeWeight(8); strokeCap(ROUND); noFill();
    for (const lon of [8, 29]) {
      let run = [];
      for (let lat = -78; lat <= 78; lat += 6) {
        const v = this._view(dvec(lon, lat));
        if (v[2] > 0.04) run.push([v[0] * DOT_REF, v[1] * DOT_REF]); else { if (run.length > 1) this._line(run); run = []; }
      }
      if (run.length > 1) this._line(run);
    }
    stroke(DOTC.pale); strokeWeight(5);
    for (const lon of [18]) {
      let run = [];
      for (let lat = -70; lat <= 70; lat += 6) { const v = this._view(dvec(lon, lat)); if (v[2] > 0.04) run.push([v[0] * DOT_REF, v[1] * DOT_REF]); else { if (run.length > 1) this._line(run); run = []; } }
      if (run.length > 1) this._line(run);
    }
    noStroke();
  }

  _fin(f, backPass) {
    const b = this._bodyFromRest(f.p), v = this._view(b);
    const isBack = v[2] < 0.02; if (isBack !== backPass) return;
    const px = v[0] * DOT_REF * f.k, py = v[1] * DOT_REF * f.k;
    const restV = f.p, restAng = Math.atan2(restV[1], restV[0]), nowAng = Math.atan2(v[1], v[0]);
    const swing = this.flutter * D2R * (f.p[1] > 0 ? 1 : -1);
    push(); translate(px, py); rotate((f.ang * D2R) + (nowAng - restAng) + swing);
    const depth = Math.max(0.35, Math.abs(v[2]) * 0.4 + 0.6);
    noStroke(); fill(f.col); ellipse(0, 0, f.w * depth, f.h * 1);
    pop();
  }

  _chest() {
    const lon = -26, lat = -22, v = this._view(dvec(lon, lat)); if (v[2] < 0.15) return;
    const rot = (pts, cx, cy, a) => pts.map(p => { const x = p[0] - cx, y = p[1] - cy, c = Math.cos(a * D2R), s = Math.sin(a * D2R); return [cx + x * c - y * s, cy + x * s + y * c]; });
    const pill = (cx, cy, w, h, a, col) => { fill(col); this._poly(this._map(lon, lat, 0, 1.0, rot(dPill(cx, cy, w, h, 10), cx, cy, a))); };
    noStroke(); pill(-72, 22, 72, 30, 14, DOTC.or1); pill(2, 32, 54, 26, 0, DOTC.or2); pill(58, 26, 30, 20, -18, DOTC.or1);
    this._billboard(lon, lat + 1.5, 1.0, Math.cos(17 * D2R) * Math.cos(24 * D2R), () => {
      noStroke(); fill(DOTC.navy); textAlign(CENTER, CENTER); textSize(21); textStyle(BOLD); text('DO-T', 6, -2); textStyle(NORMAL);
    });
  }

  _pod(side) {
    const lon = side * 80, lat = -2, rest = Math.cos(51 * D2R);
    this._billboard(lon, lat, 1.04, rest, (v, nang, f) => {
      scale(-side, 1); // art drawn for the left pod
      const dep = (d) => { translate(0, 0); };
      noStroke();
      // wing plate (behind the ring)
      push(); translate(-150 + this.flutter * 0.6, -62); rotate(-28 * D2R);
      fill(DOTC.blue); rect(-115, -34, 230, 70, 22); fill(DOTC.white); rect(-104, -26, 208, 54, 17);
      fill('#B4E0F4'); rect(-86, -14, 120, 11, 5); rect(-86, 4, 86, 11, 5);
      fill(DOTC.blue); rect(-60, 34, 100, 26, 10); fill(DOTC.white); rect(-52, 38, 78, 14, 6);
      pop();
      fill(DOTC.rim); circle(0, 0, 276);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.3; fill(DOTC.navy); circle(Math.cos(a) * 118, Math.sin(a) * 118, 11); }
      fill(DOTC.blue); circle(-4, 0, 224);
      fill(DOTC.deep); circle(-30, 4, 172);
      fill(DOTC.navy); circle(-74, 4, 104); fill(DOTC.blue); circle(-74, 4, 78);
    });
  }

  _visor(face, o) {
    const lon = 0, lat = 8, K = 1;
    const fill_ = (col, pts, k) => { fill(col); this._poly(this._map(lon, lat, 0, k, pts)); };
    noStroke();
    fill_(DOTC.pale, dPill(-16, 20, 470, 206), 1.06);
    fill_(DOTC.navy, dPill(0, 0, 470, 206), 1.10);
    fill_(DOTC.blue, dPill(14, 8, 408, 172), 1.115);
    fill_(DOTC.screen, dPill(16, 14, 386, 154), 1.122);
    fill_(DOTC.hl, dPill(-168, 60, 16, 11, 8), 1.123); fill_(DOTC.hl, dPill(-104, 60, 84, 11, 8), 1.123);
    this._face(face, lon, lat, 1.13);
  }

  _face(face, lon, lat, k) {
    const cx = 22 + this.gx, cy = 8 + this.gy, E = 97;
    const mp = (pts) => this._map(lon, lat, 0, k, pts.map(p => [p[0] + cx, p[1] + cy]));
    const F = (pts) => { noStroke(); fill(DOTC.face); this._poly(mp(pts)); };
    const L = (pts, w = 11) => { stroke(DOTC.face); strokeWeight(w); strokeCap(ROUND); strokeJoin(ROUND); this._line(mp(pts)); noStroke(); };
    const blink = this.blinkT > 0 ? 0.12 : 1;
    const eyeL = [[-122, 8], [-84, 8]];
    const tiredEye = (sgn) => { const c = dBez([sgn * 84, -30], [sgn * 86, -6], [sgn * 100, 6], [sgn * 124, 6]); L(c, 10); L([[sgn * 126, 20], [sgn * 92, 20]], 10); };
    switch (face) {
      case 'neutral': F(dEll(-E, 0, 15, 30 * blink)); F(dEll(E, 0, 15, 30 * blink)); F(dEll(0, 14, 12, 12)); break;
      case 'strained': L([[-124, -26], [-84, 0], [-124, 26]]); L([[124, -26], [84, 0], [124, 26]]); L(dArc(-21, 24, 21, Math.PI, Math.PI * 2, 10).concat(dArc(21, 24, 21, Math.PI, Math.PI * 2, 10)), 10); break;
      case 'tired': tiredEye(-1); tiredEye(1); F(dEll(0, 8, 13, 27)); break;
      case 'sad': tiredEye(-1); tiredEye(1); L(dArc(0, 34, 22, Math.PI, Math.PI * 2, 12), 11); break;
      case 'heart': F(dHeart(-E, -5, HEART_SIZE)); F(dHeart(E, -5, HEART_SIZE)); L(dArc(0, 2, 27, 0.15, Math.PI - 0.15, 14), 9); break;   // big hearts like the character sheet (half-width = HEART_SIZE)
      case 'content': L(dArc(-E, -6, 20, 0.1, Math.PI - 0.1, 12), 10); L(dArc(E, -6, 20, 0.1, Math.PI - 0.1, 12), 10); L([[-22, 24], [22, 24]], 10); break;
      case 'unimpressed': { for (const sg of [-1, 1]) { L([[sg * 134, -8], [sg * 60, -8]], 9); F(dArc(sg * 97, -8, 17, 0, Math.PI, 12)); L([[sg * 60, -36], [sg * 60, -8]], 8); } L([[-28, 22], [28, 22]], 9); break; }
      case 'defeated': { for (const sg of [-1, 1]) { L([[sg * E - 20, -22], [sg * E + 20, 18]], 11); L([[sg * E - 20, 18], [sg * E + 20, -22]], 11); } F(dEll(0, 8, 13, 26)); break; }
      case 'joy':
        L(dArc(-E, 6, 21, Math.PI, Math.PI * 2, 12), 11); L(dArc(E, 6, 21, Math.PI, Math.PI * 2, 12), 11);
        F(dArc(0, 0, 28, 0, Math.PI, 14).concat([[-28, 0]]).map(p => [p[0], p[1] + 6])); break;
      default: // happy = hero painting face: tall oval eyes + U smile
        F(dEll(-E, -2, 18, 38 * blink)); F(dEll(E, -2, 18, 38 * blink)); L(dArc(0, -6, 34, 0.2, Math.PI - 0.2, 16), 7);
    }
  }

  // ---------- tools (drawn pointing +x from the socket) ----------
  _tool(id, aim, lightOn) {
    push();
    const dist = DOT_REF * 1.13; translate(Math.cos(aim) * dist, Math.sin(aim) * dist); rotate(aim);
    if (Math.cos(aim) < 0) scale(1, -1);
    const pump = Math.sin(this.t * 3) * 3;
    noStroke();
    fill(DOTC.blue); circle(0, 0, 150); fill(DOTC.blue2); circle(9, 0, 112);       // socket cap
    // bell
    const bell = () => {
      fill(DOTC.white); beginShape(); for (const q of dBez([22, -58], [60, -118], [120, -140], [182, -140], 14)) vertex(q[0], q[1]);
      for (const q of dBez([182, 150], [120, 148], [60, 118], [22, 60], 14)) vertex(q[0], q[1]); endShape(CLOSE);
      fill(DOTC.pale); beginShape(); for (const q of dBez([22, 60], [60, 118], [120, 148], [182, 150], 12)) vertex(q[0], q[1]);
      for (const q of dBez([182, 40], [130, 70], [70, 62], [22, 30], 12)) vertex(q[0], q[1]); endShape(CLOSE);
      fill(DOTC.navy); quad(168, -150, 214, -148, 214, 160, 168, 160);
      fill(DOTC.screen); for (const yy of [-110, -45, 20, 85, 130]) circle(191, yy, 8);
    };
    bell();
    if (id === 'light') {
      fill(DOTC.blue); ellipse(222, 6, 40, 296);
      fill(lightOn ? '#FFE9A8' : '#7a8aa6'); ellipse(222, 6, 28, 270);
      fill(lightOn ? DOTC.amber : '#51607c'); ellipse(222, 6, 20, 120);
    } else if (id === 'ext') {
      fill(DOTC.blue); beginShape(); vertex(214, -118); vertex(380, -104 - pump * 0.2); vertex(380, 116 + pump * 0.2); vertex(214, 130); endShape(CLOSE);
      fill(DOTC.screen); beginShape(); vertex(214, -118); vertex(380, -104); vertex(380, -64); vertex(214, -70); endShape(CLOSE);
      fill('#3FA4DE'); beginShape(); vertex(214, -50); vertex(380, -44); vertex(380, 20); vertex(214, 10); endShape(CLOSE);
      fill(DOTC.deep); ellipse(382, 6, 36, 222); fill('#0E4F86'); ellipse(384, 6, 22, 190);
      push(); translate(70, 110); rotate(-12 * D2R); fill('#B41F45'); rect(-50, -10, 96, 150, 18); fill('#F0485F'); rect(-34, 8, 12, 80, 6); fill(DOTC.screen); rect(-50, 124, 96, 22, 8); pop();
    } else if (id === 'flame') {
      push(); translate(52, 104); rotate(-18 * D2R); fill('#EC8780'); rect(-52, -10, 104, 160, 20); fill('#F4968A'); rect(-44, -4, 70, 140, 16); fill('#FFC6A6'); rect(-24, 16, 12, 70, 6); fill('#F2A090'); rect(-52, 134, 104, 20, 8); pop();
      fill(DOTC.navy); rect(214, -26, 52, 52); fill(DOTC.blue); rect(262, -14, 36, 28);
      fill(DOTC.screen); beginShape(); vertex(298, -34); vertex(430, -76); vertex(430, 82); vertex(298, 40); endShape(CLOSE);
      fill(DOTC.face); for (const [px, py, r] of [[330, -30, 16], [384, -48, 18], [364, 6, 20], [326, 26, 12], [398, 40, 17], [352, -64, 10], [336, -6, 10]]) ellipse(px, py, r * 1.4, r);
      fill(DOTC.deep); ellipse(432, 3, 28, 160);
      stroke('#5FA9E0'); strokeWeight(7); noFill(); line(240, 70, 310, 126); line(310, 126, 430, 110); noStroke();
      fill(DOTC.blue); rect(430, 96, 36, 28, 8);
      const fl = Math.sin(this.t * 14) * 4; fill('#FF7A24'); ellipse(488, 100, 36 + fl, 52); fill('#FFD04A'); ellipse(488, 104, 20, 32);
    } else if (id === 'fist') {
      fill(DOTC.navy); rect(214, -30, 56, 60, 8);   // wrist mount only: the full-size Rocket Fist is drawn by drawHolsterFist() in the world layer
    } else if (id === 'shield') {
      fill(DOTC.navy); rect(214, -26, 44, 52, 8);
      fill(DOTC.screen); beginShape(); for (const q of dBez([250, -190], [380, -150], [380, 150], [250, 190], 16)) vertex(q[0], q[1]); for (const q of dBez([286, 120], [336, 70], [336, -70], [286, -120], 12)) vertex(q[0], q[1]); endShape(CLOSE);
      fill(DOTC.hl); beginShape(); for (const q of dBez([262, -150], [330, -110], [330, -40], [300, -20], 10)) vertex(q[0], q[1]); for (const q of dBez([284, -30], [300, -70], [296, -110], [262, -130], 10)) vertex(q[0], q[1]); endShape(CLOSE);
    } else { // empty socket stub
      fill(DOTC.pale); rect(210, -20, 124, 44, 12); fill(DOTC.white); rect(210, -22, 124, 36, 12);
    }
    pop();
  }
}

function dvec(lon, lat) { const a = lon * D2R, b = lat * D2R; return [Math.cos(b) * Math.sin(a), -Math.sin(b), Math.cos(b) * Math.cos(a)]; }


// =====================================================================
//  THEME: DO-T  -  the AHAD station look (tron grid, cyan / amber / violet), his words, his sounds.
//  DO-T himself is drawn by DotRig (the AHAD rig, unchanged).
// =====================================================================
const TC = { cy: '#19E3FF', cy2: '#8CF6FF', am: '#FFB938', gn: '#3CFFB0', vi: '#8E7BFF', mg: '#FF3FD0', red: '#FF4D5E', or: '#FF8A3D', bg: '#03060f', ink: '#E6F6FF', dim: '#58698f' };
const DLOOK = {
  security: { base: ['#1d0c16', '#220e1a', '#190a13'], rim: 'rgba(255,77,94,0.35)', wall: '#3a1626' },
  deck:    { base: ['#0c1733', '#0e1a3a', '#0a1430'], rim: 'rgba(25,227,255,0.30)', wall: '#1b2a52' },
  garden:  { base: ['#0c2230', '#0e2734', '#0a1f2c'], rim: 'rgba(60,255,176,0.30)', wall: '#173a3a' },
  reactor: { base: ['#1a0f2c', '#1d1232', '#170d28'], rim: 'rgba(255,185,56,0.30)', wall: '#2e1f4a' },
  cargo:   { base: ['#14162c', '#171a33', '#121428'], rim: 'rgba(142,123,255,0.32)', wall: '#272a4a' },
  duct:    { base: ['#07091a', '#090c20', '#060816'], rim: 'rgba(25,227,255,0.18)', wall: '#141a33' }
};
function glowOn(c, b) { drawingContext.shadowColor = c; drawingContext.shadowBlur = b; }
function glowOff() { drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'rgba(0,0,0,0)'; }
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
function chamferRect(x, y, w, h, c) { beginShape(); vertex(x + c, y); vertex(x + w - c, y); vertex(x + w, y + c); vertex(x + w, y + h - c); vertex(x + w - c, y + h); vertex(x + c, y + h); vertex(x, y + h - c); vertex(x, y + c); endShape(CLOSE); }

const DVERSES = {
  title: '“I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.”  John 8:12',
  coolant: '“Thy word is a lamp unto my feet, and a light unto my path.”  Psalm 119:105',
  medbay: '“And the light shineth in darkness; and the darkness comprehended it not.”  John 1:5',
  bridge: '“Ye are the light of the world. A city that is set on an hill cannot be hid.”  Matthew 5:14',
  array: '“The LORD is my light and my salvation; whom shall I fear?”  Psalm 27:1',
  win: '“Even so it is not the will of your Father which is in heaven, that one of these little ones should perish.”  Matthew 18:14',
  lose: '“Rejoice not against me, O mine enemy: when I fall, I shall arise; when I sit in darkness, the LORD shall be a light unto me.”  Micah 7:8'
};
let DOTRIG = null, DOT_PREV = { x: 0, y: 0 };
const BABY_RIGS = [];

const THEME = {
  font: 'Exo 2',
  title: 'DO-T',
  tagline: 'LOST AND FOUND  ·  a station hex tactics game',
  titleVerse: DVERSES.title,
  pebbles: false, ammoBlessing: 1, siteFlow: 'quiz', podLaunch: true,
  puzzles: ['dots', 'math', 'colors'], cableColors: ['#19E3FF', '#FFB938', '#FF3FD0', '#3CFFB0'],
  siteVerse: (id) => DVERSES[id] || DVERSES.bridge,
  ui: {
    text: TC.ink, textShadow: '#03060f', title: TC.am, dimText: '#7d8fb8', good: TC.gn, danger: TC.red, flash: TC.cy2, hit: '#ffffff',
    acid: '#B6FF3C', fadeCol: '#03060f', scrim: 'rgba(2,6,20,0.78)', barBack: 'rgba(25,227,255,0.15)', energy: TC.cy, dim: '#3a4a70'
  },
  help: [
    'The babies’ pods have drifted all over the station. Find all 8 and carry them home to The Dock. Tap a hex next to DO-T to move there.',
    'Every tap is one turn. After DO-T moves, every light-hater moves.',
    'RED hexes are danger: an enemy will hit you there on its turn. Plan around them, like chess.',
    'ZAP: move PAST an enemy (start and end your move next to it) to zap it. Move straight TOWARD an enemy 2 hexes away to boost-ram it.',
    'SHIELD BUMP: tap an enemy right next to DO-T. It is knocked back and stunned. Knock it into an open vent or the coolant and it is gone.',
    'ROCKET FIST: tap FIST, then an enemy in a straight line. The fist lands there, and DO-T must go and pick it up before he can throw again.',
    'THRUST: tap THRUST, then a hex up to 2 away. It uses energy, which comes back a little every turn and fully in each new sector.',
    'REPAIR CIRCUITS: solve the math to restore power, then choose an upgrade (some cost a hull plate) or repair your hull.',
    'Crawlers bite. Pouncers move 2 hexes a turn. Brutes are tough. Spitters shoot along straight lines, but never at someone right next to them.',
    'If DO-T is hit while carrying a baby, the pod pops loose nearby. Pick it up again!',
    'On a computer: W E D X Z A move, 1 = Thrust, 2 = Fist, M = map, Esc = pause.'
  ],
  text: {
    intro: 'SELF-DESTRUCT ARMED. Find all 8 babies and get them to the escape pods!',
    homeWord: 'safe', banked: (n, b, t) => n + (n === 1 ? ' baby is' : ' babies are') + ' safe at the Dock!  ' + b + ' of ' + t,
    lunge: 'RAM!', stab: 'ZAP!', multi: 'OVERLOAD!', gotSheep: 'Found one!', carryHint: 'Carry the pod home to The Dock.', ammoOne: 'fist',
    cantLeap: 'Can’t thrust there.', cantThrow: 'Aim at an enemy in a straight, clear line.', throwHit: 'POW!',
    bashWait: (n) => 'Shield recharges in ' + n + (n === 1 ? ' turn.' : ' turns.'), armsFull: 'Hands full. Take these to the Dock first.',
    fell: 'Vented!', slam: 'SLAM!', stunned: 'Stunned', dropped: 'The pod popped loose! Pick it up again.', rested: 'Hull repaired.',
    noEnergy: 'Not enough energy to thrust yet.', noAmmo: 'The rocket fist is out. Go and pick it up!',
    leapHint: 'Tap a hex to thrust to (tap THRUST again to cancel).', throwHint: 'Tap an enemy in a straight line to launch the fist.',
    clearHint: 'Sector clear. Tap any hex and DO-T flies there.',
    idleHint: 'Tap a hex next to DO-T. Red hexes are danger.', energyWord: 'PWR',
    flockLine: (b, t) => 'Safe ' + b + ' / ' + t, carryLine: (c, cap) => 'Carrying ' + c + ' / ' + cap,
    leapBtn: 'THRUST', throwBtn: 'FIST', bashBtn: 'SHIELD', mapBtn: 'MAP', ready: 'ready',
    bashHelp: 'Tap an enemy right next to DO-T to shield-bump it.',
    begin: 'START', howBtn: 'HOW TO PLAY', bestLine: (b, t) => 'Best: ' + b.sheep + ' of ' + t + ' safe' + (b.won ? ' in ' + b.turns + ' turns' : ''),
    paused: 'PAUSED', resume: 'RESUME', soundOn: 'SOUND: ON', soundOff: 'SOUND: OFF', restart: 'NEW STATION', titleBtn: 'TITLE', gotIt: 'GOT IT',
    winTitle: 'ALL SAFE!', loseTitle: 'POWER DOWN', winVerse: DVERSES.win, loseVerse: DVERSES.lose, turnsWord: 'turns', foesWord: 'light-haters',
    again: 'REBOOT', mapTitle: 'STATION MAP', mapLegend: 'Tap a cleared sector to warp there. Chip = repair circuit.', close: 'CLOSE',
    siteTitle: 'CIRCUIT RESTORED', siteAsk: 'Power is back. Choose one:', costWord: (n) => 'costs ' + n + ' hull', free: 'free', rest: 'REPAIR HULL', restSub: 'Restore all hull plates',
    quizTitle: 'REPAIR THE CIRCUIT', quizWrong: 'Sparks! Try again.',
    puzzleTitle: { math: 'BALANCE THE POWER', dots: 'RECONNECT THE WIRE', colors: 'MATCH THE CABLES' },
    puzzleHelp: { math: 'Pick the right answer to route the power.', dots: 'Tap the nodes in order: 1, 2, 3 ... 6.', colors: 'Tap a cable on the left, then the same color on the right.' },
    lightsOn: 'Lights on! The alarm stops here.',
    youAreHere: 'you are here', warpHome: 'TO ESCAPE PODS', warpBlocked: 'Clear this sector before you warp.', warpNoTarget: 'You can only warp to sectors you have cleared.', alreadyHome: 'You are already at the escape pods.', clearFirst: 'clear this sector first',
    clank: 'CLANK!', tooHeavy: 'Too heavy!', crack: 'CRACK!', exposed: 'Both claws are off! Its eyes are open. Hit it now!',
    bossWake: 'The Crab Worker woke up! Watch for acid.', bossHint: 'Shield-bump a claw INTO the shell to crack it off. Green rings = acid next turn.',
    bossTitle: 'CRAB WORKER DOWN', bossVerse: '\u201cThe LORD is my light and my salvation; whom shall I fear?\u201d  Psalm 27:1',
    spawnWarn: 'Something is crawling out of the vents!', alarmHint: 'ALARM! Repair this sector\u2019s circuit to stop the crawlers.',
    launchTitle: 'LAUNCH THE ESCAPE POD?', launchAsk: (b, t, tl) => b + ' of ' + t + ' babies are aboard. ' + Math.max(0, tl) + ' turns until the station blows. Launch now, or go back for the rest?',
    launchNow: 'LAUNCH NOW', keepLooking: 'KEEP SEARCHING', launchedTitle: 'POD LAUNCHED', timeTitle: 'STATION LOST',
    timeVerse: '\u201cRejoice not against me, O mine enemy: when I fall, I shall arise; when I sit in darkness, the LORD shall be a light unto me.\u201d  Micah 7:8'
  },

  init() { DOTRIG = new DotRig(); },
  background() {
    background(TC.bg); stroke(25, 227, 255, 14); strokeWeight(1);
    for (let x = 0; x <= W; x += 30) { line(x, 0, x, H); } for (let y = 0; y <= H; y += 30) { line(0, y, W, y); } noStroke();
  },

  tile(i, t, x, y, R) {
    const look = DLOOK[BIOMES[R.def.biome].look] || DLOOK.deck, v = R.deco[i];
    noStroke(); fill(look.base[Math.floor(v * 3) % 3]); hexPath(x, y, HS - 1.5);
    stroke(look.rim); strokeWeight(1.2); noFill(); hexPath(x, y, HS - 1.5); noStroke();
    if (t === '~') { fill(hexA('#1fd6c8', 0.35 + Math.sin(G.t * 2 + i) * 0.08)); hexPath(x, y, HS - 4); stroke(hexA('#8CF6FF', 0.7)); strokeWeight(2); noFill(); const o = Math.sin(G.t * 2 + i) * 5; line(x - 14 + o, y - 4, x - 2 + o, y - 4); line(x + 2 - o, y + 8, x + 14 - o, y + 8); noStroke(); }
    if (t === 'v') {
      fill('#000000'); hexPath(x, y, HS - 6); glowOn(TC.mg, 14); noFill(); stroke(hexA(TC.mg, 0.7)); strokeWeight(2); hexPath(x, y, HS - 8); glowOff();
      push(); translate(x, y); rotate(G.t * 1.5 + v * 6); stroke('#2a1a40'); strokeWeight(5); for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; line(0, 0, Math.cos(a) * 20, Math.sin(a) * 20); } pop(); noStroke();
    }
    if (t === '#') {
      if (BIOMES[R.def.biome].look === 'garden' && v > 0.3) {
        fill('#3a2a1e'); rect(x - 16, y - 2, 32, 16, 3); glowOn(TC.gn, 10); fill(v > 0.6 ? '#2fb37a' : '#24936a'); ellipse(x, y - 10, 36, 26); ellipse(x - 10, y - 4, 18, 14); ellipse(x + 10, y - 4, 18, 14); glowOff();
      } else {
        fill('#02040c'); hexPath(x, y + 4, HS - 5); fill(look.wall); hexPath(x, y - 4, HS - 5);
        stroke(look.rim); strokeWeight(1.5); noFill(); hexPath(x, y - 4, HS - 5); noStroke();
        fill(hexA(TC.cy, 0.25)); rect(x - 12, y - 8, 24, 3, 1); if (v > 0.6) { fill(TC.am); circle(x + 14, y - 14, 3); }
      }
    }
  },
  exit(x, y, side) {
    noStroke(); fill(hexA(TC.am, 0.14)); hexPath(x, y, HS - 6);
    const a = { n: -Math.PI / 2, s: Math.PI / 2, e: 0, w: Math.PI }[side], bob = Math.sin(G.t * 3) * 3;
    push(); translate(x + Math.cos(a) * bob, y + Math.sin(a) * bob); rotate(a); glowOn(TC.am, 10); noFill(); stroke(TC.am); strokeWeight(3);
    line(-8, -10, 4, 0); line(4, 0, -8, 10); line(4, -10, 16, 0); line(16, 0, 4, 10); glowOff(); pop(); noStroke();
  },
  mouth(x, y, up) {
    push(); translate(x, y);
    if (up) { glowOn(TC.cy, 16); noFill(); stroke(TC.cy); strokeWeight(2); circle(0, 0, 50); glowOff(); stroke(TC.cy2); strokeWeight(3); line(-8, -22, -8, 22); line(8, -22, 8, 22); for (let k = -2; k <= 2; k++) { line(-8, k * 9, 8, k * 9); } }
    else { fill('#000'); circle(0, 0, 54); stroke(TC.am); strokeWeight(5); noFill(); circle(0, 0, 54); stroke('#03060f'); strokeWeight(5); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.4; line(Math.cos(a) * 24, Math.sin(a) * 24, Math.cos(a) * 30, Math.sin(a) * 30); } }
    noStroke(); pop();
  },
  site(x, y, used) {
    push(); translate(x, y); const c = used ? TC.gn : TC.am;
    glowOn(c, used ? 12 : 8 + Math.sin(G.t * 4) * 6); fill('#0b1a3a'); stroke(c); strokeWeight(2); chamferRect(-22, -20, 44, 36, 7); glowOff();
    stroke(hexA(c, 0.9)); strokeWeight(2); noFill(); line(-14, -6, -4, -6); line(-4, -6, -4, 6); line(-4, 6, 10, 6); line(10, 6, 10, -10);
    noStroke(); fill(c); circle(-14, -6, 5); circle(10, -10, 5); if (!used && Math.sin(G.t * 9) > 0) { fill('#fff'); circle(-4 + Math.random() * 4, 0, 3); }
    pop();
  },
  fold(x, y) {
    push(); translate(x, y); glowOn(TC.cy, 18); noFill(); stroke(TC.cy); strokeWeight(3); ellipse(0, 0, 130, 56); stroke(hexA(TC.cy, 0.4)); strokeWeight(1.5); ellipse(0, 0, 104, 42); glowOff(); noStroke();
    fill('#E9F5F4'); ellipse(0, -18, 46, 56); fill('#5FCAEE'); ellipse(0, -26, 30, 20); fill('#FF4D5E'); rect(-6, -48, 12, 6, 2); glowOn(TC.am, 10 + Math.sin(G.t * 4) * 5); fill(TC.am); triangle(-10, 8, 10, 8, 0, 20); glowOff();
    fill(TC.ink); textAlign(CENTER, CENTER); textSize(10); textStyle(BOLD); text('ESCAPE POD', 0, 34); textStyle(NORMAL); pop();
    for (let k = 0; k < Math.min(P.banked, 8); k++) { drawBaby(x - 42 + (k % 4) * 28, y - 4 + Math.floor(k / 4) * 16, 0.62, k, 0, true); }
  },
  ammoItem(x, y) { drawFist(x, y - 4, 0.9, true); },
  threat(x, y, kind) {
    noStroke(); fill(kind & 1 ? 'rgba(255,77,94,0.30)' : 'rgba(255,77,94,0.18)'); hexPath(x, y, HS - 4);
    if (kind & 2) { stroke('rgba(255,138,61,0.8)'); strokeWeight(2); line(x - 10, y, x + 10, y); circle(x, y, 6); noStroke(); }
  },
  choice(x, y, kind, danger) {
    const pulse = 1 + Math.sin(G.t * 5) * 0.08;
    if (kind === 'path') { noStroke(); fill(hexA(TC.cy, 0.8)); circle(x, y, 9); return; }
    if (kind === 'throw') { glowOn(TC.am, 10); noFill(); stroke(TC.am); strokeWeight(2.5); circle(x, y - 12, 50 * pulse); line(x - 32, y - 12, x - 20, y - 12); line(x + 20, y - 12, x + 32, y - 12); line(x, y - 44, x, y - 32); glowOff(); noStroke(); return; }
    if (kind === 'bash') { glowOn(TC.vi, 10); noFill(); stroke(TC.vi); strokeWeight(3); arc(x, y - 8, 60 * pulse, 60 * pulse, -Math.PI * 0.9, -Math.PI * 0.1); glowOff(); noStroke(); return; }
    noFill(); stroke(danger ? TC.red : (kind === 'leap' ? TC.am : hexA(TC.cy, 0.75))); strokeWeight(2); hexPath(x, y, 11 * pulse);
    if (danger) { line(x - 5, y - 5, x + 5, y + 5); line(x + 5, y - 5, x - 5, y + 5); }
    noStroke();
  },
  sheep(x, y, o) { drawBaby(x, y - 10, 1, o.seed, o.scared, false); },
  sheepIcon(x, y, s) { drawBaby(x, y, 0.7 * (s || 1), 1, 0, true); },
  hero(x, y, inDanger) {
    const dt = G.dt || 1 / 60, vx = (x - DOT_PREV.x) / dt * 0.6, vy = (y - DOT_PREV.y) / dt * 0.6; DOT_PREV = { x, y };
    for (let k = 0; k < P.carry; k++) { const a = G.t * 2 + k * Math.PI; drawBaby(x + Math.cos(a) * 30, y - 30 + Math.sin(a) * 10, 0.6, k + 4, 0, true); }
    const face = P.hurtT > 0 ? 'strained' : P.hp <= 0 ? 'defeated' : (G.sing > 0 ? 'heart' : P.joyT > 0 ? 'joy' : P.hp === 1 ? 'tired' : P.carry > 0 ? 'heart' : inDanger ? 'neutral' : 'happy');
    const aim = P.face > 0 ? -0.15 : Math.PI + 0.15;
    DOTRIG.update(dt, Math.max(-400, Math.min(400, vx)), Math.max(-400, Math.min(400, vy)), aim, { maxSpeed: 300, aimFacing: true });
    noStroke(); fill(0, 0, 0, 90); ellipse(x, y + 4, 40, 10);
    DOTRIG.draw(x, y - 26, 19, { face, tool: P.ammo > 0 ? 'fist' : 'empty', aim, lightOn: true });
    if (P.swing > 0) { glowOn(TC.cy2, 16); noFill(); stroke(TC.cy2); strokeWeight(3); circle(x, y - 26, 60 + (0.28 - P.swing) * 120); glowOff(); noStroke(); }
    if (inDanger) { noFill(); stroke(TC.red); strokeWeight(2); hexPath(x, y - 6, 30 + Math.sin(G.t * 8) * 2); noStroke(); }
  },
  enemy(e, x, y, face) {
    const F = FOES[e.ch], hurt = e.hurtT > 0, t = G.t + e.seed;
    push(); translate(x, y); if (hurt) { translate(Math.sin(G.t * 60) * 2, 0); }
    noStroke(); fill(0, 0, 0, 90); ellipse(0, 0, 40, 9); scale(face, 1);
    const eye = (ex, ey, r) => { fill('#ffe2f4'); ellipse(ex, ey, r * 2, r * 1.5); fill('#120018'); circle(ex + r * 0.3, ey, r); fill('#ffffff'); circle(ex + r * 0.1, ey - r * 0.3, r * 0.4); stroke('#120018'); strokeWeight(2); line(ex - r, ey - r * 1.1, ex + r, ey - r * 0.5); noStroke(); };
    if (e.ch === 'K') { pop(); drawCrabBody(e, x, y); return; }
    if (e.ch === 'C') { pop(); drawCrabClaw(e, x, y); return; }
    if (e.ch === 'W') {
      const b = Math.sin(t * 7) * 1.5; glowOn(TC.vi, 12); fill('#5b3fd1'); ellipse(0, -16 + b, 40, 26); glowOff();
      stroke('#3a2490'); strokeWeight(3); for (let k = -1; k <= 1; k += 2) { line(k * 10, -8, k * 18, 0); line(k * 4, -6, k * 8, 0); } noStroke();
      fill('#7d63ff'); triangle(-14, -26 + b, -8, -38 + b, -4, -26 + b); triangle(2, -28 + b, 8, -40 + b, 12, -28 + b); eye(8, -18 + b, 6);
    } else if (e.ch === 'L') {
      const b = Math.sin(t * 9) * 2; glowOn(TC.mg, 14); fill('#c22aa0'); beginShape(); vertex(-22, -10); vertex(-10, -30 + b); vertex(2, -24 + b); vertex(14, -36 + b); vertex(22, -16); vertex(10, -4); vertex(-14, -4); endShape(CLOSE); glowOff();
      fill('#ff6fe0'); for (let k = 0; k < 4; k++) { triangle(-18 + k * 9, -14, -14 + k * 9, -24 + b, -10 + k * 9, -14); } eye(12, -22 + b, 6);
    } else if (e.ch === 'R') {
      const b = Math.sin(t * 3) * 1.2; glowOn(TC.or, 10); fill('#3a1f5c'); ellipse(0, -22 + b, 52, 40); glowOff();
      stroke(TC.or); strokeWeight(2); line(-14, -30, -6, -20); line(-6, -20, -10, -10); line(8, -34, 14, -24); noStroke(); fill('#2a1444'); rect(-20, -8, 12, 9, 3); rect(8, -8, 12, 9, 3); eye(10, -26 + b, 7);
    } else {
      const b = Math.sin(t * 5) * 1.5; glowOn(TC.or, 12); fill('#e8642a'); ellipse(0, -20 + b, 32, 32); glowOff(); fill('#b8441c'); rect(8, -24 + b, 16, 10, 4); fill('#ffd27a'); circle(24, -19 + b, 6); eye(-2, -24 + b, 6);
      fill('#b8441c'); rect(-12, -6, 6, 7, 2); rect(4, -6, 6, 7, 2);
    }
    pop();
    if (F.hp > 1) { for (let k = 0; k < F.hp; k++) { noStroke(); fill(k < e.hp ? TC.mg : 'rgba(255,255,255,0.18)'); hexPath(x - (F.hp - 1) * 7 + k * 14, y - 58, 5); } }
    if (e.stun > 0) { noStroke(); fill(TC.cy2); for (let k = 0; k < 3; k++) { const a = G.t * 4 + k * 2.1; circle(x + Math.cos(a) * 16, y - 50 + Math.sin(a) * 5, 5); } }
    if (F.move > 1 && e.stun <= 0) { noStroke(); fill(TC.red); textAlign(CENTER, CENTER); textSize(12); textStyle(BOLD); text('»' + F.move, x + 22, y - 50); textStyle(NORMAL); }
  },
  projectile(x, y, mine, ang) {
    if (mine) { push(); translate(x, y); rotate(ang); drawFist(0, 0, 0.9, false); glowOn(TC.am, 14); fill(TC.am); ellipse(-16, 0, 16, 6); glowOff(); pop(); return; }
    glowOn(TC.or, 14); noStroke(); fill('#ffb04a'); circle(x, y, 12); fill('#fff1c0'); circle(x - 2, y - 2, 5); glowOff();
  },
  button(x, y, w, h, label, o) {
    push(); if (o.dim) { drawingContext.globalAlpha = 0.5; }
    const c = o.on ? TC.am : (o.warn ? TC.mg : TC.cy);
    if (o.on || o.big) { glowOn(c, 12); }
    fill(o.on ? hexA(TC.am, 0.18) : 'rgba(3,10,30,0.85)'); stroke(c); strokeWeight(o.on ? 2.2 : 1.5); chamferRect(x, y, w, h, 10); glowOff();
    noStroke(); fill(o.on ? TC.am : TC.ink); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(o.big ? 21 : (o.small ? 13 : (o.wide ? 18 : 16)));
    try { drawingContext.letterSpacing = '2px'; } catch (_) { /* ignore */ }
    if (o.sub) { text(label, x + w / 2, y + h * (o.wide ? 0.36 : 0.38)); textStyle(NORMAL); textSize(o.wide ? 13 : 11); fill(o.warn ? '#ff9ad8' : TC.dim === '#58698f' ? '#9fb3dc' : TC.dim); text(o.sub, x + 8, y + h * 0.56, w - 16, h * 0.4); }
    else { text(label, x + w / 2, y + h / 2); }
    try { drawingContext.letterSpacing = '0px'; } catch (_) { /* ignore */ }
    textStyle(NORMAL); pop();
  },
  hudPanel(x, y, w, h) { noStroke(); fill('rgba(3,8,24,0.94)'); rect(x, y, w, h); stroke(hexA(TC.cy, 0.6)); strokeWeight(1.5); if (y === 0) { line(0, h, w, h); } else { line(0, y, w, y); } noStroke(); },
  heart(x, y, full) { push(); translate(x, y); if (full) { glowOn(TC.gn, 8); } fill(full ? TC.gn : 'rgba(60,255,176,0.12)'); stroke(full ? '#b8ffe2' : 'rgba(60,255,176,0.4)'); strokeWeight(1.5); hexPath(0, 0, 11); glowOff(); noStroke(); pop(); },
  ammoIcon(x, y, full) { push(); if (!full) { drawingContext.globalAlpha = 0.25; } drawFist(x + 4, y, 0.7, false); pop(); },
  overlayPanel(x, y, w, h) { glowOn(TC.cy, 16); fill('rgba(3,9,28,0.97)'); stroke(TC.cy); strokeWeight(1.5); chamferRect(x, y, w, h, 18); glowOff(); noFill(); stroke(hexA(TC.cy, 0.35)); strokeWeight(1); chamferRect(x + 8, y + 8, w - 16, h - 16, 14); noStroke(); },
  titleArt(t) {
    noStroke(); for (let k = 0; k < 90; k++) { const sx = ((k * 97.3 + t * 6 * (0.3 + (k % 5) * 0.2)) % W), sy = (k * 61.7) % 440; fill(200, 230, 255, 60 + (k % 4) * 40); circle(sx, sy, 1 + (k % 3)); }
    glowOn(TC.cy, 30); noFill(); stroke(hexA(TC.cy, 0.5)); strokeWeight(2); ellipse(W / 2, 400, 360, 80); glowOff(); noStroke();
    if (!DOTRIG) { DOTRIG = new DotRig(); }
    DOTRIG.update(1 / 60, Math.sin(t) * 60, 0, 0, { maxSpeed: 300 });
    DOTRIG.draw(W / 2, 270 + Math.sin(t * 1.6) * 8, 90, { face: Math.floor(t / 3) % 2 ? 'joy' : 'happy', tool: 'fist', aim: 0.2, lightOn: true });
    for (let k = 0; k < 4; k++) { const a = t * 0.8 + k * Math.PI / 2; drawBaby(W / 2 + Math.cos(a) * 170, 300 + Math.sin(a) * 50, 1.3, k, 0, true); }
  },
  mapCell(x, y, w, h, seen, here, start, warp, alarm) {
    if (here || warp) { glowOn(here ? TC.am : TC.gn, 12); } fill(seen ? '#0e1d44' : '#070c1e'); stroke(here ? TC.am : (warp ? TC.gn : hexA(TC.cy, seen ? 0.7 : 0.25))); strokeWeight(here ? 3 : 1.5); chamferRect(x - w / 2, y - h / 2, w, h, 10); glowOff(); noStroke();
    if (start) { noFill(); stroke(TC.cy); strokeWeight(2); ellipse(x, y + 26, 50, 14); noStroke(); }
    if (alarm) { glowOn(TC.red, 10); fill(Math.sin(G.t * 6) > 0 ? TC.red : '#7a1020'); circle(x + w / 2 - 12, y - h / 2 + 12, 9); glowOff(); }
  },
  mapSiteIcon(x, y, used) { push(); translate(x, y); const c = used ? TC.gn : TC.am; fill('#0b1a3a'); stroke(c); strokeWeight(1.5); chamferRect(-8, -7, 16, 14, 3); noStroke(); fill(c); circle(-3, -1, 3); circle(3, 2, 3); pop(); },
  mapCaveIcon(x, y, seen, left) { push(); translate(x, y); fill('#000'); stroke(TC.am); strokeWeight(2.5); circle(0, 0, 18); pop(); if (seen && left > 0) { noStroke(); fill(TC.ink); textSize(10); textAlign(CENTER, CENTER); text(left, x, y - 14); } },


  countdown(x, y, tl, hot) {
    const flash = hot && Math.sin(G.t * 8) > 0; noStroke(); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(13);
    try { drawingContext.letterSpacing = '2px'; } catch (_) { /* ignore */ }
    if (hot) { glowOn(TC.red, 12); } fill(flash ? '#ffffff' : (hot ? TC.red : TC.am)); text('SELF-DESTRUCT  ' + String(tl).padStart(3, '0'), x, y); glowOff();
    try { drawingContext.letterSpacing = '0px'; } catch (_) { /* ignore */ } textStyle(NORMAL);
  },
  acidMark(x, y) { const k = 1 + Math.sin(G.t * 8) * 0.1; glowOn('#B6FF3C', 14); noFill(); stroke('#B6FF3C'); strokeWeight(3); circle(x, y, 44 * k); strokeWeight(1.5); circle(x, y, 26 * k); glowOff(); noStroke(); fill('rgba(182,255,60,0.35)'); for (let k2 = 0; k2 < 3; k2++) { circle(x - 8 + k2 * 8, y - 4 + Math.sin(G.t * 6 + k2) * 3, 7); } },
  spawnMark(x, y) { const k = (G.t * 1.5) % 1; noFill(); stroke(hexA(TC.red, 1 - k)); strokeWeight(3); hexPath(x, y, 10 + k * 26); noStroke(); fill(TC.red); textAlign(CENTER, CENTER); textSize(16); textStyle(BOLD); text('!', x, y - 1); textStyle(NORMAL); },
  alarm(t) {
    const p = (Math.sin(t * 5) + 1) / 2; noStroke();
    const g = drawingContext.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.7); g.addColorStop(0, 'rgba(255,30,50,0)'); g.addColorStop(1, 'rgba(255,30,50,' + (0.18 + 0.22 * p) + ')');
    drawingContext.fillStyle = g; rect(0, 112, W, H - 262);
    push(); translate(W - 30, 128); rotate(t * 4); fill('rgba(255,60,70,0.22)'); arc(0, 0, 340, 340, -0.35, 0.35); pop();
    push(); translate(30, 128); rotate(-t * 4 + 1.5); fill('rgba(255,60,70,0.22)'); arc(0, 0, 340, 340, -0.35, 0.35); pop();
    glowOn(TC.red, 16); fill(p > 0.5 ? '#ff4d5e' : '#7a1020'); circle(W - 30, 128, 14); circle(30, 128, 14); glowOff();
  },
  wire(x1, y1, x2, y2, col) { glowOn(col, 12); noFill(); stroke(col); strokeWeight(5); const mx = (x1 + x2) / 2; bezier(x1, y1, mx, y1, mx, y2, x2, y2); glowOff(); noStroke(); },
  node(x, y, label, done, next) {
    if (done || next) { glowOn(done ? TC.gn : TC.am, 14); } fill(done ? '#0f3a30' : '#0b1a3a'); stroke(done ? TC.gn : (next ? TC.am : TC.cy)); strokeWeight(2.5); circle(x, y, 52); glowOff();
    noStroke(); fill(TC.ink); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(20); text(label, x, y); textStyle(NORMAL);
  },
  plug(x, y, col, done, sel) { if (done || sel) { glowOn(col, 14); } fill('#0b1a3a'); stroke(col); strokeWeight(sel ? 4 : 2.5); chamferRect(x - 30, y - 22, 60, 44, 8); glowOff(); noStroke(); fill(col); circle(x, y, done ? 22 : 16); },
  sfx: {
    tap: (t) => tone('sine', 1300, 1750, t, 0.05, 0.12),
    step: (t) => { tone('square', 220, 180, t, 0.05, 0.05, { lp: 900 }); sndNoise(t, 0.05, 0.08, 3000, 0, 1); },
    leap: (t) => { sndNoise(t, 0.3, 0.3, 500, 3600, 2); tone('sine', 180, 620, t, 0.25, 0.18); },
    throw: (t) => { sndNoise(t, 0.4, 0.25, 300, 2600, 1.4); tone('sawtooth', 90, 340, t, 0.35, 0.08, { lp: 1200 }); },
    shoot: (t) => { sndNoise(t, 0.25, 0.25, 2000, 400, 1); tone('sine', 400, 120, t, 0.2, 0.15); },
    hit: (t) => { sndNoise(t, 0.05, 0.25, 1800, 0, 1.5); tone('sine', 320, 120, t, 0.09, 0.25); },
    kill: (t) => { sndNoise(t, 0.35, 0.3, 1500, 200, 1.2); tone('square', 430, 60, t, 0.3, 0.12, { lp: 1500 }); tone('sine', 900, 2400, t, 0.1, 0.1); },
    hurt: (t) => { tone('sawtooth', 190, 70, t, 0.22, 0.24, { lp: 1300 }); sndNoise(t, 0.18, 0.25, 1000, 200, 1); },
    bash: (t) => { tone('triangle', 1500, 900, t, 0.2, 0.2); tone('sine', 2300, 0, t, 0.12, 0.08); },
    fall: (t) => { tone('sine', 950, 85, t, 0.8, 0.22); tone('triangle', 1400, 120, t, 0.8, 0.08); },
    baa: (t) => { tone('sine', 520, 700, t, 0.22, 0.12, { a: 0.05 }); tone('sine', 700, 600, t + 0.2, 0.28, 0.1, { a: 0.05 }); },
    pick: (t) => { tone('square', 1568, 0, t, 0.07, 0.08, { lp: 5000 }); tone('square', 2093, 0, t + 0.07, 0.16, 0.08, { lp: 5000 }); },
    exit: (t) => { sndNoise(t, 0.4, 0.15, 400, 1500, 1.2); tone('sawtooth', 70, 150, t, 0.4, 0.1, { lp: 600 }); },
    no: (t) => { tone('square', 150, 0, t, 0.09, 0.1, { lp: 800 }); tone('square', 108, 0, t + 0.11, 0.12, 0.1, { lp: 700 }); },
    site: (t) => { for (let k = 0; k < 4; k++) { tone('sine', 1500 + Math.random() * 1200, 0, t + k * 0.06, 0.04, 0.08); } },
    bless: (t) => { const n = [72, 76, 79, 84, 88]; for (let k = 0; k < n.length; k++) { tone('triangle', 440 * Math.pow(2, (n[k] - 69) / 12), 0, t + k * 0.08, 0.4, 0.12); } },
    win: (t) => { const n = [81, 83, 81, 86]; for (let k = 0; k < n.length; k++) { tone('triangle', 440 * Math.pow(2, (n[k] - 69) / 12), 0, t + [0, 0.14, 0.28, 0.44][k], k === 3 ? 1.6 : 0.26, 0.16); } },
    warp: (t) => { sndNoise(t, 0.6, 0.3, 300, 6000, 2); tone('sine', 200, 1600, t, 0.5, 0.15); tone('triangle', 1600, 400, t + 0.45, 0.4, 0.1); },
    roar: (t) => { tone('sawtooth', 70, 38, t, 1.4, 0.3, { lp: 500 }); tone('sawtooth', 73, 40, t, 1.4, 0.25, { lp: 500 }); sndNoise(t, 1.2, 0.2, 160, 700, 2); },
    bubble: (t) => { for (let k = 0; k < 3; k++) { tone('sine', 300 + k * 120, 900 + k * 200, t + k * 0.08, 0.12, 0.12); } },
    acid: (t) => { sndNoise(t, 0.4, 0.3, 2000, 600, 1); tone('sine', 500, 120, t, 0.3, 0.12); },
    spawn: (t) => { sndNoise(t, 0.3, 0.25, 600, 200, 1.5); tone('square', 120, 60, t, 0.25, 0.08, { lp: 600 }); },
    siren: (t) => { tone('sawtooth', 620, 880, t, 0.5, 0.05, { lp: 1800 }); tone('sawtooth', 880, 620, t + 0.5, 0.5, 0.05, { lp: 1800 }); },
    lose: (t) => { tone('sine', 440, 40, t, 1.3, 0.3); tone('sawtooth', 220, 30, t, 1.3, 0.1, { lp: 600 }); }
  }
};
// a baby in a little glowing pod
function drawBaby(x, y, s, seed, scared, icon) {
  push(); translate(x + (scared ? Math.sin(G.t * 40 + seed) * 1 : 0), y + Math.sin(G.t * 2 + seed) * (icon ? 0 : 2)); scale(s);
  if (!icon) { noStroke(); fill(0, 0, 0, 80); ellipse(0, 18, 26, 6); }
  glowOn(TC.cy, 10); fill('#E9F5F4'); ellipse(0, 6, 28, 20); fill('#5FCAEE'); arc(0, 2, 26, 26, Math.PI, 0); glowOff();
  fill('#ffd9c2'); circle(0, -2, 14); fill('#0C2243'); if (scared) { circle(-3, -3, 3); circle(3, -3, 3); } else { arc(-3, -3, 4, 3, 0, Math.PI); arc(3, -3, 4, 3, 0, Math.PI); }
  noFill(); stroke('#0C2243'); strokeWeight(1); arc(0, 1, 5, 3, 0, Math.PI); noStroke(); fill('rgba(255,255,255,0.6)'); ellipse(-6, -4, 5, 3);
  pop();
}
// the rocket fist
function drawFist(x, y, s, onFloor) {
  push(); translate(x, y); scale(s); if (onFloor) { glowOn(TC.am, 10 + Math.sin(G.t * 5) * 4); }
  fill('#16315A'); rect(-14, -7, 10, 14, 3); fill('#2E86C8'); rect(-6, -10, 18, 20, 6); fill('#5FCAEE'); for (let k = 0; k < 3; k++) { rect(10, -9 + k * 6.5, 5, 5, 2); }
  glowOff(); pop();
}

// ---- the CRAB WORKER (AHAD Security boss): big shell, eyes hidden until both claws crack off ----
function drawCrabBody(e, x, y) {
  const asleep = !!e.sleep, armored = isArmored(e), b = asleep ? Math.sin(G.t * 1.5) * 2 : Math.sin(G.t * 6) * 2, hurt = e.hurtT > 0;
  push(); translate(x + (hurt ? Math.sin(G.t * 60) * 3 : 0), y - 18 + b);
  noStroke(); fill(0, 0, 0, 110); ellipse(0, 26, 110, 22);
  stroke('#3a1f5c'); strokeWeight(5); for (let k = -1; k <= 1; k += 2) { for (let j = 0; j < 3; j++) { const a = 0.4 + j * 0.35; line(k * 30, 6, k * (52 + j * 6), 20 + j * 4); } } noStroke();
  glowOn(armored ? TC.or : TC.mg, asleep ? 6 : 16); fill(armored ? '#c4532a' : '#8a2a6a'); arc(0, 4, 104, 84, Math.PI, 0); rect(-52, 2, 104, 14, 0, 0, 10, 10); glowOff();
  fill(armored ? '#e2723a' : '#a63a84'); arc(0, 2, 76, 56, Math.PI, 0);
  stroke('#5a1e10'); strokeWeight(2); noFill(); arc(0, 4, 84, 64, Math.PI * 1.15, Math.PI * 1.85); if (!armored) { stroke(TC.am); line(-20, -24, -8, -10); line(-8, -10, -14, 0); line(14, -28, 22, -14); } noStroke();
  for (let k = -1; k <= 1; k += 2) {
    const ex = k * 18, ey = -34;
    stroke('#3a1f5c'); strokeWeight(4); line(k * 12, -20, ex, ey); noStroke();
    if (asleep || armored) { fill('#2a1444'); ellipse(ex, ey, 16, 8); }
    else { glowOn('#ffe2f4', 12); fill('#ffe2f4'); circle(ex, ey, 16); glowOff(); fill('#120018'); circle(ex + k * 2, ey, 8); }
  }
  pop();
  if (asleep) { noStroke(); fill(TC.cy2); textAlign(CENTER, CENTER); textStyle(BOLD); for (let k = 0; k < 3; k++) { const q = (G.t * 0.6 + k / 3) % 1; textSize(10 + q * 10); drawingContext.globalAlpha = 1 - q; text('z', x + 30 + q * 20, y - 70 - q * 40); } drawingContext.globalAlpha = 1; textStyle(NORMAL); }
  else if (!armored) { for (let k = 0; k < FOES.K.hp; k++) { noStroke(); fill(k < e.hp ? TC.mg : 'rgba(255,255,255,0.18)'); hexPath(x - (FOES.K.hp - 1) * 7 + k * 14, y - 86, 5); } }
  else { noStroke(); fill(TC.am); textAlign(CENTER, CENTER); textSize(11); textStyle(BOLD); text('ARMORED', x, y - 86); textStyle(NORMAL); }
  if (e.stun > 0) { noStroke(); fill(TC.cy2); for (let k = 0; k < 3; k++) { const a = G.t * 4 + k * 2.1; circle(x + Math.cos(a) * 26, y - 74 + Math.sin(a) * 6, 6); } }
}
function drawCrabClaw(e, x, y) {
  const s = e.side || 1, open = e.sleep ? 0.15 : (0.3 + Math.abs(Math.sin(G.t * 3 + e.seed)) * 0.5) + (e.bump > 0 ? 0.6 : 0), hurt = e.hurtT > 0;
  push(); translate(x + (hurt ? Math.sin(G.t * 60) * 3 : 0), y - 14); scale(s, 1);
  noStroke(); fill(0, 0, 0, 90); ellipse(0, 18, 50, 12);
  glowOn(TC.or, e.sleep ? 4 : 12); fill('#c4532a'); ellipse(-6, 4, 34, 26);
  push(); translate(8, -2); rotate(-open); fill('#e2723a'); beginShape(); vertex(0, -4); vertex(30, -16); vertex(34, -8); vertex(4, 4); endShape(CLOSE); pop();
  push(); translate(8, 4); rotate(open * 0.6); fill('#d0602f'); beginShape(); vertex(0, -2); vertex(26, 8); vertex(22, 14); vertex(0, 6); endShape(CLOSE); pop();
  glowOff(); fill('#ffd27a'); circle(-10, 0, 5); pop();
  if (e.stun > 0) { noStroke(); fill(TC.cy2); for (let k = 0; k < 3; k++) { const a = G.t * 4 + k * 2.1; circle(x + Math.cos(a) * 14, y - 46 + Math.sin(a) * 4, 5); } }
}


// =====================================================================
//  HEX ENGINE  -  shared by the David and DO-T versions.  Hoplite rules on a hex grid:
//  every tap is one turn; moving IS attacking (stab past, lunge toward); sling/fist throw; shove; leap.
//  Enemies telegraph: red tiles = where you will be hit if you end your turn there.
//  Nothing in here is character-specific: the THEME object (art + names) decides the look.
// =====================================================================
const W = SETTINGS.canvas.w, H = SETTINGS.canvas.h;
const COLS = 7, ROWS = 11, NT = COLS * ROWS;
const HS = SETTINGS.board.hexSize, SQ3 = Math.sqrt(3);
const BOARD = { ox: (W - (COLS + 0.5) * HS * SQ3) / 2 + HS * SQ3 / 2, oy: SETTINGS.board.top };
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];   // E, NE, NW, W, SW, SE
const EXIT_TILE = { n: 3, s: 10 * COLS + 3, w: 5 * COLS, e: 5 * COLS + 6 };
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const CAVE_UP = 8 * COLS + 3;
const POD_TILE = CAVE_UP - 3 * COLS;          // the pen in The Fold / the escape pod on the Dock
const BOSS_AT = 3 * COLS + 3, BOSS_BABY = 1 * COLS + 3;   // boss room: the boss body sits here, its two claws left and right of it

// ---------- hex maths ----------
function tilePos(i) { const c = i % COLS, r = (i / COLS) | 0; return { x: BOARD.ox + HS * SQ3 * (c + 0.5 * (r & 1)), y: BOARD.oy + HS * 1.5 * r }; }
function axOf(i) { const c = i % COLS, r = (i / COLS) | 0; return [c - ((r - (r & 1)) >> 1), r]; }
function fromAx(q, r) { if (r < 0 || r >= ROWS) { return -1; } const c = q + ((r - (r & 1)) >> 1); if (c < 0 || c >= COLS) { return -1; } return r * COLS + c; }
function stepHex(i, d) { const a = axOf(i); return fromAx(a[0] + DIRS[d][0], a[1] + DIRS[d][1]); }
function hexDist(a, b) { const A = axOf(a), B = axOf(b), dq = A[0] - B[0], dr = A[1] - B[1]; return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2; }
function nbrs(i) { const o = []; for (let d = 0; d < 6; d++) { const j = stepHex(i, d); if (j >= 0) { o.push(j); } } return o; }
function dirTo(a, b) { for (let d = 0; d < 6; d++) { if (stepHex(a, d) === b) { return d; } } return -1; }
function lineTo(a, b) { for (let d = 0; d < 6; d++) { let j = a; for (let k = 1; k < 14; k++) { j = stepHex(j, d); if (j < 0) { break; } if (j === b) { return { d, n: k }; } } } return null; }
function hexAt(x, y) { let best = -1, bd = 1e9; for (let i = 0; i < NT; i++) { const p = tilePos(i), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = i; } } return bd < HS * 0.98 ? best : -1; }
function rowOf(i) { return (i / COLS) | 0; }
function colOf(i) { return i % COLS; }

// ---------- random ----------
function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rInt(R, a, b) { return a + Math.floor(R() * (b - a + 1)); }
function shuffled(arr, R) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

// ---------- tiles ----------
// '.' floor   '#' rock/tree/wall (blocks moving and shots)   '~' water (blocks moving only)   'v' chasm (blocks moving only)   ',' floor with a stone to pick up
const isWalk = (t) => t === '.' || t === ',';
const isHazard = (t) => t === '~' || t === 'v';

// ---------- game state ----------
const G = {
  scene: 'title', overlay: null, t: 0, dt: 0, busy: 0, seed: 1, rooms: {}, roomId: null, room: null,
  msg: '', msgT: 0, fx: [], floats: [], fade: 0, siteOpts: null, quiz: null, best: null, shake: 0, turnsInRoom: 0, sing: 0, ui: [], won: false
};
const P = { i: 0, hp: 3, maxHp: 3, energy: 100, maxEnergy: 100, ammo: 1, ammoMax: 3, bashCd: 0, carry: 0, banked: 0, mode: null, face: 1, up: {}, turns: 0, kills: 0, dx: 0, dy: 0, hop: 0, hurtT: 0, swing: 0, throwT: 0, joyT: 0 };

function totalSheep() { let n = 0; for (const id in WORLD.rooms) { n += WORLD.rooms[id].sheep || 0; } return n; }
function say(s, secs) { G.msg = s; G.msgT = secs || 2.4; }
function floatText(i, s, col) { const p = tilePos(i); G.floats.push({ x: p.x, y: p.y - 30, s, col: col || THEME.ui.text, life: 1.2 }); }

// =====================================================================
//  WORLD: the room grid (like the first Zelda map), caves hang off rooms
// =====================================================================
function gridPos(id) { for (let r = 0; r < WORLD.grid.length; r++) { const c = WORLD.grid[r].indexOf(id); if (c >= 0) { return { r, c }; } } return null; }
function walled(a, b) { return WORLD.walls.some((w) => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a)); }
function neighborRoom(id, side) {
  const g = gridPos(id); if (!g) { return null; }
  const d = { n: [-1, 0], s: [1, 0], w: [0, -1], e: [0, 1] }[side], r = g.r + d[0], c = g.c + d[1];
  if (r < 0 || r >= WORLD.grid.length || c < 0 || c >= WORLD.grid[r].length) { return null; }
  const o = WORLD.grid[r][c]; if (!o || walled(id, o)) { return null; } return o;
}
function sidesOf(id) { return ['n', 's', 'e', 'w'].filter((s) => neighborRoom(id, s)); }

function bfs(start, room, pass) {
  const dist = new Array(NT).fill(-1); dist[start] = 0; const q = [start];
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of nbrs(i)) { if (dist[j] < 0 && pass(j)) { dist[j] = dist[i] + 1; q.push(j); } } }
  return dist;
}

function genRoom(id, entry) {
  const def = WORLD.rooms[id], bi = BIOMES[def.biome] || BIOMES.pasture;
  for (let attempt = 0; attempt < 80; attempt++) {
    const R = mulberry(hashStr(G.seed + ':' + id + ':' + attempt));
    const soft = attempt > 40 ? 0.55 : 1;
    const tiles = new Array(NT).fill('.');
    for (let i = 0; i < NT; i++) { if (R() < bi.rock * soft) { tiles[i] = '#'; } }
    if (bi.border) { for (let i = 0; i < NT; i++) { const c = colOf(i), r = rowOf(i); if ((c === 0 || c === COLS - 1 || r === 0 || r === ROWS - 1) && R() < bi.border) { tiles[i] = '#'; } } }
    for (let k = 0; k < bi.chasm; k++) { let i = rInt(R, 0, NT - 1); const len = rInt(R, 3, 6); for (let s = 0; s < len; s++) { tiles[i] = 'v'; const j = stepHex(i, rInt(R, 0, 5)); if (j >= 0) { i = j; } } }
    if (bi.water) {
      let i = rInt(R, 3, 7) * COLS;
      for (let s = 0; s < 30 && i >= 0; s++) { tiles[i] = '~'; if (colOf(i) === COLS - 1) { break; } const opts = [0, 0, 1, 5]; const j = stepHex(i, opts[rInt(R, 0, 3)]); if (j < 0) { break; } i = j; }
      const wet = []; for (let k = 0; k < NT; k++) { if (tiles[k] === '~') { wet.push(k); } }
      const fords = shuffled(wet, R).slice(0, 2); for (const f of fords) { tiles[f] = ','; }
    }
    const exits = {}; const sides = def.parent ? [] : sidesOf(id);
    const clear = (t) => { tiles[t] = '.'; for (const n of nbrs(t)) { if (!isWalk(tiles[n])) { tiles[n] = '.'; } } };
    for (const s of sides) { exits[s] = EXIT_TILE[s]; clear(EXIT_TILE[s]); }
    let up = -1; if (def.parent) { up = CAVE_UP; clear(up); }
    clear(entry);
    if (id === WORLD.start) { clear(POD_TILE); }
    if (def.boss) { for (const t of [BOSS_AT].concat(nbrs(BOSS_AT), nbrs(BOSS_AT - 1), nbrs(BOSS_AT + 1), nbrs(BOSS_BABY))) { tiles[t] = '.'; } }
    if (bi.pebbles) {
      const near = []; for (let i = 0; i < NT; i++) { if (tiles[i] === '.' && nbrs(i).some((n) => tiles[n] === '~')) { near.push(i); } }
      const any = []; for (let i = 0; i < NT; i++) { if (tiles[i] === '.') { any.push(i); } }
      const pool = near.length >= bi.pebbles ? near : any; for (const i of shuffled(pool, R).slice(0, bi.pebbles)) { tiles[i] = ','; }
    }
    const reach = bfs(entry, null, (j) => isWalk(tiles[j]));
    let count = 0; for (let i = 0; i < NT; i++) { if (reach[i] >= 0) { count++; } }
    if (count < NT * (bi.open || 0.55) * soft) { continue; }
    if (Object.values(exits).some((t) => reach[t] < 0) || (up >= 0 && reach[up] < 0)) { continue; }
    const special = new Set(Object.values(exits)); if (up >= 0) { special.add(up); } special.add(entry);
    const used = new Set(special);
    const cands = (minD) => { const o = []; for (let i = 0; i < NT; i++) { if (reach[i] >= minD && tiles[i] === '.' && !used.has(i) && rowOf(i) > 0 && rowOf(i) < ROWS - 1) { o.push(i); } } return o; };
    const take = (minD, farBias) => { let c = cands(minD); if (!c.length) { c = cands(2); } if (!c.length) { return -1; } c = shuffled(c, R); if (farBias) { c.sort((a, b) => reach[b] - reach[a]); c = c.slice(0, Math.max(1, Math.ceil(c.length * 0.4))); c = shuffled(c, R); } const t = c[0]; used.add(t); for (const n of nbrs(t)) { used.add(n); } return t; };
    let mouth = -1; if (def.cave) { mouth = take(3); if (mouth < 0) { continue; } }
    let site = -1; if (def.site) { site = take(3); if (site < 0) { continue; } }
    const sheep = []; let ok = true;
    if (def.boss) { sheep.push(BOSS_BABY); for (const t of [BOSS_AT, BOSS_AT - 1, BOSS_AT + 1, BOSS_BABY]) { used.add(t); for (const n of nbrs(t)) { used.add(n); } } }
    for (let k = sheep.length; k < (def.sheep || 0); k++) { const t = take(4, true); if (t < 0) { ok = false; break; } sheep.push(t); }
    if (!ok) { continue; }
    for (const n of nbrs(mouth)) { used.delete(n); } for (const n of nbrs(site)) { used.delete(n); }
    const enemies = [];
    if (def.boss && FOES.K) {
      const mk = (ch, i, side) => ({ ch, i, hp: FOES[ch].hp, stun: 0, id: hashStr(id + ch + i), dx: 0, dy: 0, bump: 0, hurtT: 0, seed: R() * 10, side, sleep: true, cd: 1 });
      enemies.push(mk('K', BOSS_AT, 0), mk('C', BOSS_AT - 1, -1), mk('C', BOSS_AT + 1, 1));
    }
    for (const ch of (def.foes || '')) {
      const F = FOES[ch]; if (!F) { continue; }
      const c = cands(4).filter((i) => !sheep.includes(i)); if (!c.length) { ok = false; break; }
      const t = shuffled(c, R)[0]; used.add(t);
      enemies.push({ ch, i: t, hp: F.hp, stun: 0, id: hashStr(id + enemies.length + ':' + attempt), dx: 0, dy: 0, bump: 0, hurtT: 0, seed: R() * 10 });
    }
    if (!ok) { continue; }
    return { id, def, tiles, exits, up, mouth, site, siteUsed: false, sheep, stones: [], enemies, visited: true, deco: Array.from({ length: NT }, () => R()), lit: !def.alarm, spawned: 0, spawnWarn: -1, acid: [], noise: false };
  }
  // fallback: open room
  const tiles = new Array(NT).fill('.'); const exits = {}; for (const s of (def.parent ? [] : sidesOf(id))) { exits[s] = EXIT_TILE[s]; }
  return { id, def, tiles, exits, up: def.parent ? CAVE_UP : -1, mouth: -1, site: -1, siteUsed: false, sheep: [], stones: [], enemies: [], visited: true, deco: new Array(NT).fill(0.5), lit: true, spawned: 0, spawnWarn: -1, acid: [], noise: false };
}

// =====================================================================
//  RUN
// =====================================================================
function newRun() {
  G.seed = (SETTINGS.debug.fixedSeed || Math.floor(Math.random() * 1e9)) >>> 0;
  G.rooms = {}; G.fx = []; G.floats = []; G.won = false; G.loseReason = ''; G.launched = false; G.path = null; G.pendingBoss = false; G.bossReward = false;
  const S = SETTINGS.hero;
  Object.assign(P, { hp: S.hearts, maxHp: S.hearts, energy: S.energy, maxEnergy: S.energy, ammo: S.ammoStart, ammoMax: S.ammoMax, bashCd: 0, carry: 0, banked: 0, mode: null, face: 1, up: {}, turns: 0, kills: 0, hop: 0, hurtT: 0 });
  G.scene = 'play'; G.overlay = null;
  enterRoom(WORLD.start, CAVE_UP - COLS, true);
  say(THEME.text.intro, 4);
}

function enterRoom(id, arriveAt, first) {
  if (!G.rooms[id]) { G.rooms[id] = genRoom(id, arriveAt); }
  G.roomId = id; G.room = G.rooms[id]; P.i = arriveAt; P.mode = null; P.energy = P.maxEnergy;
  const p = tilePos(P.i); P.dx = p.x; P.dy = p.y; G.turnsInRoom = 0;
  for (const e of G.room.enemies) { const q = tilePos(e.i); e.dx = q.x; e.dy = q.y; }
  G.fade = 1;
  if (id === WORLD.start) {
    if (P.carry > 0) { P.banked += P.carry; floatText(P.i, '+' + P.carry + ' ' + THEME.text.homeWord, THEME.ui.good); say(THEME.text.banked(P.carry, P.banked, totalSheep()), 3); P.carry = 0; sfx('win'); }
    P.hp = P.maxHp;
    if (P.banked >= totalSheep() && !G.won) { G.won = true; setTimeout(() => { G.overlay = 'win'; saveBest(); }, 700); }
  } else if (!first) { say(G.room.def.name, 1.6); sfx('exit'); }
}

function warpSpot(id) { if (id === WORLD.start) { return CAVE_UP - COLS; } const R = G.rooms[id]; const ex = Object.values(R.exits); return R.up >= 0 ? R.up : (ex.length ? ex[0] : CAVE_UP); }
function canWarpTo(id) { return !!G.rooms[id] && id !== G.roomId && (id === WORLD.start || G.rooms[id].enemies.length === 0); }
function tryWarp(id) {
  if (G.room.enemies.length) { G.mapMsg = THEME.text.warpBlocked; G.mapMsgT = 2.4; sfx('no'); return false; }
  if (!canWarpTo(id)) { G.mapMsg = THEME.text.warpNoTarget; G.mapMsgT = 2.4; sfx('no'); return false; }
  P.turns += SETTINGS.travel.warpTurns; G.overlay = null; G.path = null; sfx('warp');
  const a = tilePos(P.i); burst(a.x, a.y - 20, THEME.ui.flash, 20);
  enterRoom(id, warpSpot(id)); const b = tilePos(P.i); burst(b.x, b.y - 20, THEME.ui.flash, 20); return true;
}
function leaveVia(side) {
  if (side === 'up') { const parent = G.room.def.parent; enterRoom(parent, G.rooms[parent].mouth); return; }
  if (side === 'cave') { enterRoom(G.room.def.cave, CAVE_UP); return; }
  const to = neighborRoom(G.roomId, side); if (to) { enterRoom(to, EXIT_TILE[OPP[side]]); }
}

// ---------- who is where ----------
function enemyAt(i) { return G.room.enemies.find((e) => e.i === i) || null; }
function sheepAt(i) { return G.room.sheep.indexOf(i); }
function blockedForEnemy(i) {
  const R = G.room; if (!isWalk(R.tiles[i])) { return true; }
  if (i === P.i || enemyAt(i) || R.sheep.includes(i)) { return true; }
  if (Object.values(R.exits).includes(i) || i === R.mouth || i === R.up) { return true; }
  return false;
}
function exitSideAt(i) { const R = G.room; for (const s in R.exits) { if (R.exits[s] === i) { return s; } } if (i === R.mouth) { return 'cave'; } if (i === R.up) { return 'up'; } return null; }

// stats from upgrades
function throwRange() { return SETTINGS.hero.throwRange + (P.up.range ? 1 : 0); }
function leapRange() { return SETTINGS.hero.leapRange + (P.up.leapR ? 1 : 0); }
function leapCost() { return SETTINGS.hero.leapCost - (P.up.regen ? 10 : 0); }
function carryCap() { return SETTINGS.hero.carry + (P.up.carry ? 1 : 0); }
function bashCool() { return SETTINGS.hero.bashCooldown - (P.up.bashcd ? 1 : 0); }

// ---------- what the player may do this turn ----------
function canStepTo(i) {
  if (i < 0 || hexDist(P.i, i) !== 1) { return false; }
  const R = G.room; if (!isWalk(R.tiles[i]) || enemyAt(i)) { return false; }
  if (R.sheep.includes(i) && P.carry >= carryCap()) { return false; }
  return true;
}
function canLeapTo(i) {
  if (i < 0 || P.energy < leapCost()) { return false; }
  const d = hexDist(P.i, i); if (d < 1 || d > leapRange()) { return false; }
  const R = G.room; if (!isWalk(R.tiles[i]) || enemyAt(i)) { return false; }
  if (R.sheep.includes(i) && P.carry >= carryCap()) { return false; }
  return true;
}
function throwTarget(i) {          // the enemy a throw at tile i would hit, or null
  if (P.ammo <= 0) { return null; }
  const e = enemyAt(i); if (!e) { return null; }
  const L = lineTo(P.i, i); if (!L || L.n > throwRange()) { return null; }
  let j = P.i; for (let k = 1; k < L.n; k++) { j = stepHex(j, L.d); if (G.room.tiles[j] === '#' || enemyAt(j) || G.room.sheep.includes(j)) { return null; } }
  return e;
}
function canBash(i) { return P.bashCd <= 0 && hexDist(P.i, i) === 1 && !!enemyAt(i); }

// ---------- enemy threat (the telegraph) ----------
function threatMap() {
  const m = new Array(NT).fill(0), R = G.room;
  for (const e of R.enemies) {
    if (e.stun > 0) { continue; }
    const F = FOES[e.ch];
    if (F.kind === 'boss') { continue; }
    if (F.kind === 'claw') { if (!bossAsleep()) { for (const n of nbrs(e.i)) { m[n] |= 1; } } continue; }
    if (F.kind === 'archer') {
      for (let d = 0; d < 6; d++) { let j = e.i; for (let k = 1; k <= F.range; k++) { j = stepHex(j, d); if (j < 0 || R.tiles[j] === '#') { break; } if (k >= 2) { m[j] |= 2; } if (enemyAt(j) || R.sheep.includes(j)) { break; } } }
    } else { for (const n of nbrs(e.i)) { m[n] |= 1; } }
  }
  for (const a of (R.acid || [])) { m[a] |= 4; }
  return m;
}

// =====================================================================
//  PLAYER TURN
// =====================================================================
function bossBody() { return G.room.enemies.find((e) => FOES[e.ch] && FOES[e.ch].kind === 'boss') || null; }
function bossAsleep() { const b = bossBody(); return !!b && b.sleep; }
function isArmored(e) { const F = FOES[e.ch]; if (!F) { return false; } if (F.kind === 'claw') { return true; } if (F.kind === 'boss') { return G.room.enemies.some((o) => FOES[o.ch] && FOES[o.ch].kind === 'claw'); } return false; }
function wakeBoss() { const b = bossBody(); if (b && b.sleep) { b.sleep = false; b.cd = 1; for (const o of G.room.enemies) { o.sleep = false; } sfx('roar'); say(THEME.text.bossWake, 3); G.shake = 0.5; } }
function damageEnemy(e, n, how) {
  if (FOES[e.ch] && (FOES[e.ch].kind === 'boss' || FOES[e.ch].kind === 'claw')) { wakeBoss(); }
  if (isArmored(e)) { e.hurtT = 0.2; floatText(e.i, THEME.text.clank, THEME.ui.text); sfx('no'); return; }
  e.hp -= n; e.hurtT = 0.35; const p = tilePos(e.i);
  if (e.hp <= 0) {
    G.room.enemies.splice(G.room.enemies.indexOf(e), 1); P.kills++; P.joyT = 1;
    if (FOES[e.ch].kind === 'boss') { G.room.enemies = G.room.enemies.filter((o) => FOES[o.ch].kind !== 'claw'); G.room.acid = []; G.room.bossDown = true; G.pendingBoss = true; burst(p.x, p.y - 20, THEME.ui.good, 40); G.shake = 0.6; }
    burst(p.x, p.y - 12, THEME.ui.flash, 18); sfx('kill'); floatText(e.i, how || '', THEME.ui.flash);
  } else { burst(p.x, p.y - 12, THEME.ui.hit, 6); sfx('hit'); }
}

function resolveStabs(from, to, lunge) {
  const hits = new Map();
  if (lunge !== null && lunge !== undefined) {
    const d = lunge; let j = stepHex(to, d);
    if (j >= 0 && enemyAt(j)) { hits.set(enemyAt(j), THEME.text.lunge); if (P.up.deep) { const k = stepHex(j, d); if (k >= 0 && enemyAt(k)) { hits.set(enemyAt(k), THEME.text.lunge); } } }
  }
  for (const e of G.room.enemies.slice()) { if (!hits.has(e) && hexDist(e.i, from) === 1 && hexDist(e.i, to) === 1) { hits.set(e, THEME.text.stab); } }
  if (hits.size) { P.swing = 0.28; }
  for (const [e, how] of hits) { if (G.room.enemies.includes(e)) { damageEnemy(e, 1, how); } }
  if (hits.size >= 3) { floatText(to, THEME.text.multi, THEME.ui.flash); }
  return hits.size;
}

function arriveOn(i) {
  const R = G.room;
  const s = R.sheep.indexOf(i);
  if (s >= 0 && P.carry < carryCap()) { R.sheep.splice(s, 1); P.carry++; sfx('baa'); floatText(i, THEME.text.gotSheep, THEME.ui.good); P.joyT = 1.2; say(THEME.text.carryHint, 2.6); }
  let st = R.stones.indexOf(i);
  while (st >= 0 && P.ammo < P.ammoMax) { R.stones.splice(st, 1); P.ammo++; sfx('pick'); floatText(i, '+1 ' + THEME.text.ammoOne, THEME.ui.text); st = R.stones.indexOf(i); }
  if (R.tiles[i] === ',' && THEME.pebbles && P.ammo < P.ammoMax) { R.tiles[i] = '.'; P.ammo++; sfx('pick'); floatText(i, '+1 ' + THEME.text.ammoOne, THEME.ui.text); }
}

// ---------- TRAVEL: in a place with no enemies left, tap any reachable hex and David walks there on his own ----------
function travelPath(to) {
  const R = G.room; if (R.enemies.length || to < 0 || to === P.i || !isWalk(R.tiles[to])) { return null; }
  if (R.sheep.includes(to) && P.carry >= carryCap()) { return null; }
  const pass = (j) => j === to || j === P.i || (isWalk(R.tiles[j]) && !exitSideAt(j) && !(R.sheep.includes(j) && P.carry >= carryCap()) && j !== R.site);
  const dist = bfs(to, R, pass); if (dist[P.i] < 0) { return null; }
  const path = []; let c = P.i;
  while (c !== to && path.length < NT) { let nx = -1; for (const n of nbrs(c)) { if (dist[n] >= 0 && dist[n] === dist[c] - 1 && pass(n)) { nx = n; break; } } if (nx < 0) { return null; } path.push(nx); c = nx; }
  return path;
}
function travelTick() {
  if (!G.path || !G.path.length) { G.path = null; return; }
  if (G.overlay || G.scene !== 'play' || G.room.enemies.length || P.hp <= 0) { G.path = null; return; }
  if (G.busy > 0) { return; }
  const next = G.path.shift(), room = G.roomId;
  if (!canStepTo(next)) { G.path = null; return; }
  G.traveling = true; playerTap(next); G.traveling = false;
  G.busy = Math.min(G.busy, SETTINGS.feel.travelStep);
  if (G.roomId !== room || !G.path || !G.path.length) { G.path = null; }
}

function playerTap(i) {
  if (!G.traveling && G.path) { G.path = null; return; }       // any tap while walking stops the walk
  if (G.busy > 0 || G.scene !== 'play' || G.overlay || P.hp <= 0) { return; }
  if (i < 0) { P.mode = null; return; }
  const R = G.room;
  if (P.mode === 'leap') {
    if (i === P.i) { P.mode = null; return; }
    if (!canLeapTo(i)) { say(THEME.text.cantLeap, 1.6); sfx('no'); return; }
    const from = P.i; P.energy -= leapCost(); P.i = i; P.hop = 1; P.mode = null; sfx('leap');
    if (tilePos(i).x !== tilePos(from).x) { P.face = tilePos(i).x > tilePos(from).x ? 1 : -1; }
    resolveStabs(from, i, null); arriveOn(i);
    const side = exitSideAt(i); if (side) { P.turns++; return leaveVia(side); }
    return endPlayerTurn();
  }
  if (P.mode === 'throw') {
    if (i === P.i) { P.mode = null; return; }
    const e = throwTarget(i); if (!e) { say(THEME.text.cantThrow, 1.6); sfx('no'); return; }
    const a = tilePos(P.i), b = tilePos(e.i); G.fx.push({ kind: 'shot', x0: a.x, y0: a.y - 24, x1: b.x, y1: b.y - 14, t: 0, dur: 0.18, mine: true });
    P.ammo--; P.throwT = 0.3; P.mode = null; P.face = b.x >= a.x ? 1 : -1; sfx('throw'); R.noise = true;
    R.stones.push(e.i); damageEnemy(e, 1, THEME.text.throwHit); return endPlayerTurn();
  }
  if (i === P.i) { return; }
  if (canBash(i)) { return doBash(enemyAt(i)); }
  if (enemyAt(i) && hexDist(P.i, i) === 1) { say(THEME.text.bashWait(P.bashCd), 1.8); sfx('no'); return; }
  if (!canStepTo(i) && !P.mode) {
    const path = travelPath(i);
    if (path && path.length) { G.path = path; travelTick(); return; }
  }
  if (!canStepTo(i)) {
    if (R.sheep.includes(i) && P.carry >= carryCap()) { say(THEME.text.armsFull, 2); }
    sfx('no'); return;
  }
  const from = P.i, d = dirTo(from, i); P.i = i; sfx('step');
  if (tilePos(i).x !== tilePos(from).x) { P.face = tilePos(i).x > tilePos(from).x ? 1 : -1; }
  resolveStabs(from, i, d); arriveOn(i);
  const side = exitSideAt(i); if (side) { P.turns++; return leaveVia(side); }
  endPlayerTurn();
}

function doBash(e) {
  const d = dirTo(P.i, e.i), dest = stepHex(e.i, d), R = G.room; P.bashCd = bashCool(); P.swing = 0.3; sfx('bash');
  const stunN = P.up.bashcd ? 2 : 1;
  const Fk = FOES[e.ch].kind;
  if (Fk === 'boss') { wakeBoss(); e.hurtT = 0.2; floatText(e.i, THEME.text.tooHeavy, THEME.ui.text); return endPlayerTurn(); }
  if (Fk === 'claw') {
    wakeBoss(); const o = dest >= 0 ? enemyAt(dest) : null;
    if (o && FOES[o.ch].kind === 'boss') {
      const p = tilePos(e.i); R.enemies.splice(R.enemies.indexOf(e), 1); burst(p.x, p.y - 14, THEME.ui.flash, 26); G.shake = 0.4; sfx('kill'); floatText(e.i, THEME.text.crack, THEME.ui.flash); o.hurtT = 0.4; o.stun = 1; P.joyT = 1.2;
      if (!R.enemies.some((q) => FOES[q.ch].kind === 'claw')) { say(THEME.text.exposed, 3.5); }
    } else { e.stun = stunN; e.bump = 0.25; floatText(e.i, THEME.text.clank, THEME.ui.text); }
    return endPlayerTurn();
  }
  if (dest >= 0 && isHazard(R.tiles[dest])) {
    const p = tilePos(dest); e.i = dest; burst(p.x, p.y, THEME.ui.flash, 14);
    R.enemies.splice(R.enemies.indexOf(e), 1); P.kills++; P.joyT = 1; sfx('fall'); floatText(dest, THEME.text.fell, THEME.ui.flash);
  } else if (dest < 0 || R.tiles[dest] === '#' || R.sheep.includes(dest) || dest === P.i) {
    e.stun = stunN; e.bump = 0.25; damageEnemy(e, 1, THEME.text.slam);
  } else if (enemyAt(dest)) {
    const o = enemyAt(dest); e.stun = stunN; o.stun = stunN; damageEnemy(e, 1, THEME.text.slam); if (R.enemies.includes(o)) { damageEnemy(o, 1, THEME.text.slam); }
  } else { e.i = dest; e.stun = stunN; floatText(dest, THEME.text.stunned, THEME.ui.text); }
  endPlayerTurn();
}

function endPlayerTurn() {
  P.turns++; G.turnsInRoom++;
  enemyPhase();
  if (P.hp > 0) { alarmTick(); }
  P.energy = Math.min(P.maxEnergy, P.energy + SETTINGS.hero.regen + (P.up.regen ? 5 : 0));
  P.bashCd = Math.max(0, P.bashCd - 1);
  G.busy = SETTINGS.feel.turnLock;
  if (P.hp <= 0) { P.hp = 0; sfx('lose'); G.busy = 1.2; setTimeout(() => { G.overlay = 'lose'; saveBest(); }, 900); return; }
  if (G.pendingBoss) { G.pendingBoss = false; openBossReward(); return; }
  if (P.i === G.room.site && !G.room.siteUsed) { openSite(); return; }
  if (THEME.podLaunch && G.roomId === WORLD.start && P.i === POD_TILE && P.banked > 0 && P.banked < totalSheep()) { G.overlay = 'launch'; }
}

// ---------- SELF-DESTRUCT COUNTDOWN and ALARMS (used when SETTINGS.timer.turns > 0) ----------
function timerOn() { return SETTINGS.timer && SETTINGS.timer.turns > 0; }
function turnsLeft() { return SETTINGS.timer.turns - P.turns; }
function alarmOn(R) {
  R = R || G.room; if (!timerOn() || R.lit || R.id === WORLD.start || R.def.boss) { return false; }
  return !!R.def.alarm || turnsLeft() <= SETTINGS.timer.turns * SETTINGS.timer.alarmAllAt;
}
function alarmTick() {
  const R = G.room; if (!alarmOn(R)) { R.spawnWarn = -1; return; }
  if (R.spawnWarn >= 0) {
    const t = R.spawnWarn; R.spawnWarn = -1;
    if (!blockedForEnemy(t) && FOES.W) { R.enemies.push({ ch: 'W', i: t, hp: FOES.W.hp, stun: 1, id: hashStr(R.id + 'spawn' + P.turns), dx: tilePos(t).x, dy: tilePos(t).y, bump: 0, hurtT: 0, seed: Math.random() * 10 }); R.spawned++; const p = tilePos(t); burst(p.x, p.y, THEME.ui.danger, 10); sfx('spawn'); }
    return;
  }
  if (R.spawned < SETTINGS.alarm.max && G.turnsInRoom % SETTINGS.alarm.every === 0) {
    const c = []; for (let i = 0; i < NT; i++) { if (!blockedForEnemy(i) && hexDist(i, P.i) >= 3 && !exitSideAt(i)) { c.push(i); } }
    if (c.length) { R.spawnWarn = c[Math.floor(Math.random() * c.length)]; say(THEME.text.spawnWarn, 2); }
  }
}
function openBossReward() {
  const pool = BLESSINGS.filter((b) => !P.up[b.id]); G.siteOpts = shuffled(pool, Math.random).slice(0, 3);
  G.verse = THEME.text.bossVerse || ''; G.bossReward = true; G.overlay = 'site'; sfx('bless');
}

// =====================================================================
//  ENEMY TURN
// =====================================================================
function hurtPlayer(e, how) {
  if (SETTINGS.debug.invincible) { floatText(P.i, '(miss)', THEME.ui.text); return; }
  P.hp -= 1; P.hurtT = 0.5; G.shake = 0.3; sfx('hurt'); floatText(P.i, '-1', THEME.ui.danger);
  if (P.carry > 0) {
    const free = nbrs(P.i).filter((n) => isWalk(G.room.tiles[n]) && !enemyAt(n) && !G.room.sheep.includes(n) && !exitSideAt(n));
    if (free.length) { P.carry--; G.room.sheep.push(free[Math.floor(Math.random() * free.length)]); sfx('baa'); say(THEME.text.dropped, 2.4); }
  }
}
function archerCanShoot(e, from) {
  const F = FOES[e.ch], L = lineTo(from, P.i); if (!L || L.n < 2 || L.n > F.range) { return false; }
  let j = from; for (let k = 1; k < L.n; k++) { j = stepHex(j, L.d); if (G.room.tiles[j] === '#' || (enemyAt(j) && enemyAt(j) !== e) || G.room.sheep.includes(j)) { return false; } }
  return true;
}
function enemyPhase() {
  const R = G.room;
  if (R.acid && R.acid.length) {
    for (const a of R.acid) { const p = tilePos(a); burst(p.x, p.y, THEME.ui.acid || THEME.ui.danger, 8); }
    const hit = R.acid.includes(P.i); R.acid = []; sfx('acid'); if (hit) { hurtPlayer(null); }
  }
  if (R.noise || (bossBody() && hexDist(bossBody().i, P.i) <= FOES.K.wake)) { R.noise = false; if (bossAsleep()) { wakeBoss(); return; } }
  const order = R.enemies.slice().sort((a, b) => hexDist(a.i, P.i) - hexDist(b.i, P.i));
  for (const e of order) {
    if (!R.enemies.includes(e) || P.hp <= 0) { continue; }
    if (e.stun > 0) { e.stun--; continue; }
    const F = FOES[e.ch];
    if (F.kind === 'boss') {
      if (e.sleep) { continue; }
      e.cd--; if (e.cd <= 0) { e.cd = F.every; const tg = [P.i].concat(shuffled(nbrs(P.i).filter((n) => isWalk(R.tiles[n]) && !enemyAt(n)), Math.random).slice(0, F.acid - 1)); R.acid = tg; e.bump = 0.3; sfx('bubble'); }
      continue;
    }
    if (F.kind === 'claw') { if (!e.sleep && hexDist(e.i, P.i) === 1) { e.bump = 0.25; hurtPlayer(e); } continue; }
    if (F.kind === 'archer') {
      if (archerCanShoot(e, e.i)) {
        const a = tilePos(e.i), b = tilePos(P.i); G.fx.push({ kind: 'shot', x0: a.x, y0: a.y - 20, x1: b.x, y1: b.y - 20, t: 0, dur: 0.2, mine: false });
        sfx('shoot'); e.bump = 0.2; hurtPlayer(e); continue;
      }
      let best = e.i, bs = 1e9;
      for (const c of [e.i].concat(nbrs(e.i).filter((n) => !blockedForEnemy(n)))) {
        const dd = hexDist(c, P.i); let s = (archerCanShoot(e, c) ? 0 : 10) + Math.abs(dd - 3) + (dd <= 1 ? 6 : 0) + (c === e.i ? 0.3 : 0);
        if (s < bs) { bs = s; best = c; }
      }
      e.i = best; continue;
    }
    if (hexDist(e.i, P.i) === 1) { e.bump = 0.22; hurtPlayer(e); continue; }
    const dist = bfs(P.i, R, (j) => isWalk(R.tiles[j]) && !R.sheep.includes(j) && !exitSideAt(j));
    for (let s = 0; s < F.move; s++) {
      let best = -1, bd = dist[e.i] < 0 ? 1e9 : dist[e.i];
      for (const n of nbrs(e.i)) { if (blockedForEnemy(n) || dist[n] < 0) { continue; } if (dist[n] < bd) { bd = dist[n]; best = n; } }
      if (best < 0) { break; }
      e.i = best; if (hexDist(e.i, P.i) === 1) { break; }
    }
  }
}

// =====================================================================
//  SONG SITE / CIRCUIT (the Hoplite altar): a blessing, or rest
// =====================================================================
function openSite() {
  const R = mulberry(hashStr(G.seed + ':site:' + G.roomId));
  const pool = BLESSINGS.filter((b) => !P.up[b.id]);
  G.siteOpts = shuffled(pool, R).slice(0, 3);
  G.verse = THEME.siteVerse(G.roomId);
  if (THEME.siteFlow === 'quiz') { G.quiz = makePuzzle(R, G.roomId); G.overlay = 'quiz'; } else { G.overlay = 'site'; }
  G.sing = 2.5; sfx('site');
}
// ---------- circuit puzzles (AHAD style): math, connect the dots, match the cables ----------
function makePuzzle(R, id) {
  const kinds = THEME.puzzles || ['math'], kind = kinds[hashStr(G.seed + ':pk:' + id) % kinds.length];
  if (kind === 'dots') {
    const pts = []; let guard = 0;
    while (pts.length < 6 && guard++ < 400) { const x = 90 + R() * (W - 180), y = 330 + R() * 300; if (pts.every((q) => Math.hypot(q.x - x, q.y - y) > 92)) { pts.push({ x, y }); } }
    return { kind, pts, next: 0, tries: 0 };
  }
  if (kind === 'colors') {
    const cols = THEME.cableColors.slice(0, 4); return { kind, cols, right: shuffled([0, 1, 2, 3], R), done: [], sel: -1, tries: 0 };
  }
  return Object.assign(makeQuiz(R), { kind: 'math' });
}
function puzzleSolved() { G.room.lit = true; G.room.spawnWarn = -1; sfx('bless'); say(THEME.text.lightsOn, 2.4); G.overlay = 'site'; }
function makeQuiz(R) {
  const kind = rInt(R, 0, 3); let q, a;
  if (kind === 0) { const x = rInt(R, 3, 12), y = rInt(R, 3, 12); q = x + ' × ' + y; a = x * y; }
  else if (kind === 1) { const y = rInt(R, 2, 9), a0 = rInt(R, 2, 12); q = (a0 * y) + ' ÷ ' + y; a = a0; }
  else if (kind === 2) { const x = rInt(R, 12, 60), y = rInt(R, 12, 60); q = x + ' + ' + y; a = x + y; }
  else { const v = rInt(R, 3, 12), r = rInt(R, 2, 9); q = (v * r) + ' volts \u00f7 ' + r + ' ohms = ? amps'; a = v; }
  const wrong = new Set(); while (wrong.size < 2) { const w = a + rInt(R, -6, 6); if (w !== a && w > 0) { wrong.add(w); } }
  return { q, a, choices: shuffled([a].concat(Array.from(wrong)), R), tries: 0 };
}
function takeBlessing(b) {
  P.up[b.id] = true; if (b.cost) { P.maxHp = Math.max(1, P.maxHp - b.cost); P.hp = Math.min(P.hp, P.maxHp); }
  if (b.id === 'heart') { P.maxHp++; P.hp++; }
  if (b.id === 'ammo') { P.ammoMax += THEME.ammoBlessing; P.ammo += THEME.ammoBlessing; }
  if (G.bossReward) { G.bossReward = false; } else { G.room.siteUsed = true; G.room.lit = true; } G.overlay = null; sfx('bless'); say(b.name + '!', 2.2); P.joyT = 1.5;
}
function takeRest() { P.hp = P.maxHp; if (G.bossReward) { G.bossReward = false; } else { G.room.siteUsed = true; G.room.lit = true; } G.overlay = null; sfx('bless'); say(THEME.text.rested, 2); }

// =====================================================================
//  EFFECTS
// =====================================================================
function burst(x, y, col, n) { for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 140; G.fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.5 + Math.random() * 0.4, col, r: 2 + Math.random() * 3 }); } G.fx.push({ kind: 'ring', x, y, life: 0.4, col }); }
function updateFx(dt) {
  for (const f of G.fx) {
    if (f.kind === 'spark') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 220 * dt; f.life -= dt; }
    else if (f.kind === 'ring') { f.life -= dt; }
    else if (f.kind === 'shot') { f.t += dt; if (f.t >= f.dur) { f.life = -1; } else { f.life = 1; } }
  }
  G.fx = G.fx.filter((f) => f.life > 0);
  for (const f of G.floats) { f.y -= 26 * dt; f.life -= dt; }
  G.floats = G.floats.filter((f) => f.life > 0);
}
function drawFx() {
  for (const f of G.fx) {
    if (f.kind === 'spark') { noStroke(); fill(f.col); circle(f.x, f.y, f.r * 2 * Math.max(0.2, f.life * 1.6)); }
    else if (f.kind === 'ring') { noFill(); stroke(f.col); strokeWeight(3 * f.life / 0.4 + 0.5); circle(f.x, f.y, (1 - f.life / 0.4) * 90 + 10); }
    else if (f.kind === 'shot') { const k = f.t / f.dur; THEME.projectile(lerpN(f.x0, f.x1, k), lerpN(f.y0, f.y1, k) - Math.sin(k * Math.PI) * (f.mine ? 24 : 6), f.mine, Math.atan2(f.y1 - f.y0, f.x1 - f.x0)); }
  }
  for (const f of G.floats) { noStroke(); fill(f.col); textAlign(CENTER, CENTER); textSize(15); textStyle(BOLD); push(); drawingContext.globalAlpha = Math.min(1, f.life * 2); outlinedText(f.s, f.x, f.y); pop(); textStyle(NORMAL); }
}
function lerpN(a, b, t) { return a + (b - a) * t; }
function outlinedText(s, x, y) { const c = drawingContext.fillStyle; stroke(THEME.ui.textShadow); strokeWeight(4); strokeJoin(ROUND); text(s, x, y); noStroke(); fill(c); text(s, x, y); }

// =====================================================================
//  SOUND (WebAudio, synthesized; no files)
// =====================================================================
const SND = { ctx: null, master: null, on: true };
function sndInit() { if (SND.ctx) { if (SND.ctx.state !== 'running') { SND.ctx.resume(); } return; } try { const AC = window.AudioContext || window.webkitAudioContext; SND.ctx = new AC(); SND.master = SND.ctx.createGain(); SND.master.gain.value = SETTINGS.audio.volume; SND.master.connect(SND.ctx.destination); } catch (_) { SND.ctx = null; } }
function tone(type, f0, f1, t0, dur, vol, o) {
  const c = SND.ctx, osc = c.createOscillator(), g = c.createGain(); o = o || {};
  osc.type = type; osc.frequency.setValueAtTime(Math.max(20, f0), t0); if (f1 && f1 !== f0) { osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); }
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + (o.a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = osc; if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
  node.connect(g); g.connect(SND.master); osc.start(t0); osc.stop(t0 + dur + 0.05);
}
function sndNoise(t0, dur, vol, f0, f1, q) {
  const c = SND.ctx, len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) { d[i] = Math.random() * 2 - 1; }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; f.type = 'bandpass'; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t0); if (f1) { f.frequency.exponentialRampToValueAtTime(f1, t0 + dur); }
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); s.connect(f); f.connect(g); g.connect(SND.master); s.start(t0);
}
function sfx(name) { if (!SND.ctx || !SND.on || SND.ctx.state !== 'running') { return; } const fn = THEME.sfx[name]; if (!fn) { return; } try { fn(SND.ctx.currentTime + 0.01); } catch (_) { /* ignore */ } }

// =====================================================================
//  SAVE: best result on this device
// =====================================================================
function loadBest() { try { G.best = JSON.parse(localStorage.getItem(SETTINGS.savePrefix + '_best') || 'null'); } catch (_) { G.best = null; } }
function saveBest() {
  const r = { sheep: P.banked, turns: P.turns, won: P.banked >= totalSheep() }; const b = G.best;
  const better = !b || r.sheep > b.sheep || (r.sheep === b.sheep && r.won && r.turns < b.turns);
  if (better) { G.best = r; try { localStorage.setItem(SETTINGS.savePrefix + '_best', JSON.stringify(r)); } catch (_) { /* ignore */ } }
}

// =====================================================================
//  INPUT: pointer (tap) and keyboard
// =====================================================================
let CNV = null;
function logicalPoint(e) { const r = CNV.elt.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
function onTap(x, y) {
  sndInit();
  for (let k = G.ui.length - 1; k >= 0; k--) { const b = G.ui[k]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { if (b.fn) { sfx('tap'); b.fn(); } return; } }
  if (G.scene === 'play' && !G.overlay) { playerTap(hexAt(x, y)); }
}
function onKey(e) {
  sndInit();
  if (G.overlay === 'title' || G.scene === 'title') { if (e.code === 'Enter' || e.code === 'Space') { newRun(); } return; }
  if (e.code === 'Escape') { G.overlay = G.overlay ? (G.overlay === 'site' || G.overlay === 'quiz' ? G.overlay : null) : 'pause'; return; }
  if (G.overlay) { if (G.overlay === 'map' && (e.code === 'KeyM' || e.code === 'Enter')) { G.overlay = null; } if ((G.overlay === 'win' || G.overlay === 'lose') && e.code === 'Enter') { newRun(); } return; }
  const dirKey = { KeyD: 0, KeyE: 1, KeyW: 2, KeyA: 3, KeyZ: 4, KeyX: 5 }[e.code];
  if (dirKey !== undefined) { e.preventDefault(); playerTap(stepHex(P.i, dirKey)); return; }
  if (e.code === 'Digit1' || e.code === 'KeyL') { toggleMode('leap'); }
  if (e.code === 'Digit2' || e.code === 'KeyF') { toggleMode('throw'); }
  if (e.code === 'KeyM') { G.overlay = 'map'; }
}
function toggleMode(m) {
  if (G.scene !== 'play' || G.overlay) { return; }
  if (P.mode === m) { P.mode = null; return; }
  if (m === 'leap' && P.energy < leapCost()) { say(THEME.text.noEnergy, 1.8); sfx('no'); return; }
  if (m === 'throw' && P.ammo <= 0) { say(THEME.text.noAmmo, 2.2); sfx('no'); return; }
  P.mode = m; say(m === 'leap' ? THEME.text.leapHint : THEME.text.throwHint, 2);
}

// =====================================================================
//  p5
// =====================================================================
function setup() {
  CNV = createCanvas(W, H); pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  CNV.elt.style.touchAction = 'none';
  const fit = () => { const b = document.body.getBoundingClientRect(), bw = b.width || window.innerWidth, bh = (b.height > 50 ? b.height : window.innerHeight); const k = Math.min(bw / W, bh / H); CNV.elt.style.width = W * k + 'px'; CNV.elt.style.height = H * k + 'px'; };
  fit(); window.addEventListener('resize', fit);
  CNV.elt.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = logicalPoint(e); onTap(p.x, p.y); }, { passive: false });
  CNV.elt.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', onKey);
  textFont(THEME.font + ', system-ui, -apple-system, sans-serif');
  loadBest(); THEME.init();
  if (SETTINGS.debug.skipTitle) { newRun(); }
}

function draw() {
  const dt = Math.min(0.05, deltaTime / 1000); G.dt = dt; G.t += dt; G.ui = [];
  G.busy = Math.max(0, G.busy - dt); travelTick(); G.msgT = Math.max(0, G.msgT - dt); G.fade = Math.max(0, G.fade - dt * 3); G.shake = Math.max(0, G.shake - dt);
  G.sing = Math.max(0, G.sing - dt); G.mapMsgT = Math.max(0, (G.mapMsgT || 0) - dt);
  P.hop = Math.max(0, P.hop - dt * 4); P.hurtT = Math.max(0, P.hurtT - dt); P.swing = Math.max(0, P.swing - dt); P.throwT = Math.max(0, P.throwT - dt); P.joyT = Math.max(0, P.joyT - dt);
  updateFx(dt);
  THEME.background();
  if (G.scene === 'title') { drawTitle(); return; }
  push(); if (G.shake > 0) { translate((Math.random() - 0.5) * 10 * G.shake, (Math.random() - 0.5) * 10 * G.shake); }
  drawBoard(dt);
  pop();
  if (G.scene === 'play' && alarmOn()) { THEME.alarm(G.t); G.sirenT = (G.sirenT || 0) - dt; if (G.sirenT <= 0) { G.sirenT = 2.2; sfx('siren'); } }
  if (G.scene === 'play' && timerOn() && turnsLeft() <= 0 && !G.overlay && !G.won && P.hp > 0) { G.won = true; G.loseReason = 'time'; P.hp = 0; sfx('lose'); setTimeout(() => { G.overlay = 'lose'; saveBest(); }, 600); }
  drawHud();
  if (G.fade > 0) { noStroke(); fill(THEME.ui.fadeCol); drawingContext.globalAlpha = G.fade; rect(0, 0, W, H); drawingContext.globalAlpha = 1; }
  if (G.overlay) { drawOverlay(); }
}

function hexPath(x, y, r) { beginShape(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; vertex(x + Math.cos(a) * r, y + Math.sin(a) * r); } endShape(CLOSE); }

function drawBoard(dt) {
  const R = G.room, threat = threatMap(), k = 1 - Math.exp(-dt * 16);
  for (let i = 0; i < NT; i++) { const p = tilePos(i); THEME.tile(i, R.tiles[i], p.x, p.y, R); }
  for (const s in R.exits) { const p = tilePos(R.exits[s]); THEME.exit(p.x, p.y, s, neighborName(s)); }
  if (R.mouth >= 0) { const p = tilePos(R.mouth); THEME.mouth(p.x, p.y, false, WORLD.rooms[R.def.cave].name); }
  if (R.up >= 0) { const p = tilePos(R.up); THEME.mouth(p.x, p.y, true, WORLD.rooms[R.def.parent].name); }
  if (R.site >= 0) { const p = tilePos(R.site); THEME.site(p.x, p.y, R.siteUsed); }
  if (G.roomId === WORLD.start) { const p = tilePos(CAVE_UP - 3 * COLS); THEME.fold(p.x, p.y); }
  for (const s of R.stones) { const p = tilePos(s); THEME.ammoItem(p.x, p.y + 8); }
  // telegraph + choices
  const showMoves = !G.overlay && G.busy <= 0;
  for (let i = 0; i < NT; i++) {
    const p = tilePos(i);
    if (threat[i] && isWalk(R.tiles[i])) { THEME.threat(p.x, p.y, threat[i]); }
    if (!showMoves) { continue; }
    if (P.mode === 'leap' && canLeapTo(i)) { THEME.choice(p.x, p.y, 'leap', !!threat[i]); }
    else if (P.mode === 'throw' && throwTarget(i)) { THEME.choice(p.x, p.y, 'throw', false); }
    else if (!P.mode && canStepTo(i)) { THEME.choice(p.x, p.y, 'step', !!threat[i]); }
    else if (!P.mode && canBash(i)) { THEME.choice(p.x, p.y, 'bash', false); }
  }
  if (G.path) { for (const j of G.path) { const p = tilePos(j); THEME.choice(p.x, p.y, 'path', false); } }
  // units, back to front
  const list = [];
  for (const s of R.sheep) { const p = tilePos(s); list.push({ y: p.y, fn: () => THEME.sheep(p.x, p.y + 10, { seed: s, scared: threat[s] ? 1 : 0 }) }); }
  for (const e of R.enemies) { const p = tilePos(e.i); e.dx += (p.x - e.dx) * k; e.dy += (p.y - e.dy) * k; e.bump = Math.max(0, e.bump - dt); e.hurtT = Math.max(0, e.hurtT - dt); list.push({ y: e.dy, fn: () => { const lean = e.bump > 0 ? Math.sin(e.bump / 0.22 * Math.PI) * 10 : 0, ang = Math.atan2(P.dy - e.dy, P.dx - e.dx); THEME.enemy(e, e.dx + Math.cos(ang) * lean, e.dy + 10 + Math.sin(ang) * lean, P.dx < e.dx ? -1 : 1); } }); }
  { const p = tilePos(P.i); P.dx += (p.x - P.dx) * k; P.dy += (p.y - P.dy) * k; list.push({ y: P.dy, fn: () => THEME.hero(P.dx, P.dy + 10 - Math.sin(P.hop * Math.PI) * 34, threat[P.i]) }); }
  list.sort((a, b) => a.y - b.y); for (const u of list) { u.fn(); }
  for (const a of (R.acid || [])) { const p = tilePos(a); THEME.acidMark(p.x, p.y); }
  if (R.spawnWarn >= 0) { const p = tilePos(R.spawnWarn); THEME.spawnMark(p.x, p.y); }
  drawFx();
}
function neighborName(s) { const o = neighborRoom(G.roomId, s); return o ? WORLD.rooms[o].name : ''; }

// ---------- buttons (immediate mode) ----------
function button(x, y, w, h, label, fn, o) {
  o = o || {}; THEME.button(x, y, w, h, label, o); if (fn) { G.ui.push({ x, y, w, h, fn }); }
}
function drawHud() {
  const U = THEME.ui;
  THEME.hudPanel(0, 0, W, 112); THEME.hudPanel(0, H - 150, W, 150);
  noStroke(); fill(U.text); textAlign(CENTER, CENTER); textSize(22); textStyle(BOLD); text(G.room.def.name, W / 2, 26); textStyle(NORMAL);
  if (timerOn()) { const tl = Math.max(0, turnsLeft()), hot = tl <= SETTINGS.timer.turns * SETTINGS.timer.alarmAllAt; THEME.countdown(W / 2, 54, tl, hot); }
  for (let k = 0; k < P.maxHp; k++) { THEME.heart(28 + k * 30, 64, k < P.hp); }
  for (let k = 0; k < P.ammoMax; k++) { THEME.ammoIcon(28 + k * 24, 96, k < P.ammo); }
  const tot = totalSheep();
  textAlign(RIGHT, CENTER); textSize(14); fill(U.text); text(THEME.text.flockLine(P.banked, tot), W - 66, 60); text(THEME.text.carryLine(P.carry, carryCap()), W - 66, 84);
  THEME.sheepIcon(W - 46, 72);
  button(W - 52, 6, 44, 34, '❙❙', () => { G.overlay = 'pause'; }, { small: true });
  // energy bar
  const bx = 150, bw = 170, ef = P.energy / P.maxEnergy;
  noStroke(); fill(U.barBack); rect(bx, 92, bw, 9, 4); fill(P.energy >= leapCost() ? U.energy : U.dim); rect(bx, 92, bw * ef, 9, 4);
  stroke(U.text); strokeWeight(1.5); const lc = bx + bw * leapCost() / P.maxEnergy; line(lc, 88, lc, 104); noStroke();
  textAlign(LEFT, CENTER); textSize(11); fill(U.text); text(THEME.text.energyWord, bx, 80);
  // bottom: hint line + four buttons
  textAlign(CENTER, CENTER); textSize(15); fill(U.text);
  const hint = G.msgT > 0 ? G.msg : (P.mode === 'leap' ? THEME.text.leapHint : P.mode === 'throw' ? THEME.text.throwHint : (G.room.def.boss && G.room.enemies.length ? THEME.text.bossHint : (G.room.enemies.length ? (alarmOn() ? THEME.text.alarmHint : THEME.text.idleHint) : THEME.text.clearHint)));
  text(hint, 20, H - 150, W - 40, 44);
  const by = H - 98, bh = 76, gap = 10, w4 = (W - 32 - gap * 3) / 4;
  button(16, by, w4, bh, THEME.text.leapBtn, () => toggleMode('leap'), { on: P.mode === 'leap', sub: P.energy >= leapCost() ? THEME.text.ready : Math.ceil((leapCost() - P.energy) / SETTINGS.hero.regen) + ' turns', dim: P.energy < leapCost(), icon: 'leap' });
  button(16 + (w4 + gap), by, w4, bh, THEME.text.throwBtn, () => toggleMode('throw'), { on: P.mode === 'throw', sub: P.ammo + ' / ' + P.ammoMax, dim: P.ammo <= 0, icon: 'throw' });
  button(16 + (w4 + gap) * 2, by, w4, bh, THEME.text.bashBtn, () => say(THEME.text.bashHelp, 3), { sub: P.bashCd > 0 ? P.bashCd + ' turns' : THEME.text.ready, dim: P.bashCd > 0, icon: 'bash' });
  button(16 + (w4 + gap) * 3, by, w4, bh, THEME.text.mapBtn, () => { G.overlay = 'map'; }, { sub: Object.keys(G.rooms).length + ' / ' + Object.keys(WORLD.rooms).length, icon: 'map' });
}

// =====================================================================
//  SCREENS
// =====================================================================
function panel(x, y, w, h) { THEME.overlayPanel(x, y, w, h); }
function wrapText(s, x, y, w, size, lead) { textSize(size); textAlign(CENTER, TOP); const words = String(s).split(' '); let ln = '', yy = y; for (const wd of words) { const t = ln ? ln + ' ' + wd : wd; if (textWidth(t) > w && ln) { text(ln, x + w / 2, yy); yy += lead; ln = wd; } else { ln = t; } } if (ln) { text(ln, x + w / 2, yy); yy += lead; } return yy; }
function credit(y) { noStroke(); fill(THEME.ui.dimText); textAlign(CENTER, CENTER); textSize(12); text(SETTINGS.credit, W / 2, y); }

function drawTitle() {
  THEME.titleArt(G.t);
  const U = THEME.ui; noStroke(); fill(U.title); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(46); text(THEME.title, W / 2, 470); textStyle(NORMAL);
  fill(U.text); textSize(17); text(THEME.tagline, W / 2, 516);
  fill(U.text); wrapText(THEME.titleVerse, 50, 548, W - 100, 15, 21);
  button(W / 2 - 130, 660, 260, 64, THEME.text.begin, () => newRun(), { big: true });
  button(W / 2 - 130, 738, 260, 52, THEME.text.howBtn, () => { G.scene = 'title'; G.overlay = 'help'; }, {});
  if (G.best) { fill(U.dimText); textSize(13); text(THEME.text.bestLine(G.best, totalSheep()), W / 2, 812); }
  credit(H - 30);
  if (G.overlay === 'help') { drawOverlay(); }
}

function drawOverlay() {
  const U = THEME.ui; noStroke(); fill(U.scrim); rect(0, 0, W, H);
  G.ui.push({ x: 0, y: 0, w: W, h: H, fn: null });      // the dim layer swallows taps on whatever is underneath
  const o = G.overlay;
  if (o === 'pause') {
    panel(40, 200, W - 80, 520); fill(U.text); textAlign(CENTER, CENTER); textSize(28); textStyle(BOLD); text(THEME.text.paused, W / 2, 250); textStyle(NORMAL);
    button(80, 300, W - 160, 56, THEME.text.resume, () => { G.overlay = null; }, { big: true });
    button(80, 370, W - 160, 50, THEME.text.howBtn, () => { G.overlay = 'help'; });
    button(80, 432, W - 160, 50, THEME.text.mapBtn, () => { G.overlay = 'map'; });
    button(80, 494, W - 160, 50, (SND.on ? THEME.text.soundOn : THEME.text.soundOff), () => { SND.on = !SND.on; });
    button(80, 556, W - 160, 50, THEME.text.restart, () => { newRun(); });
    button(80, 618, W - 160, 50, THEME.text.titleBtn, () => { G.scene = 'title'; G.overlay = null; });
    credit(700);
  } else if (o === 'help') {
    panel(24, 70, W - 48, H - 140); fill(U.text); textAlign(CENTER, CENTER); textSize(26); textStyle(BOLD); text(THEME.text.howBtn, W / 2, 110); textStyle(NORMAL);
    let y = 150; for (const line of THEME.help) { y = wrapText(line, 52, y, W - 104, 15, 20) + 9; }
    button(W / 2 - 100, H - 140, 200, 52, THEME.text.gotIt, () => { G.overlay = G.scene === 'play' ? 'pause' : null; });
  } else if (o === 'map') { drawWorldMap(); }
  else if (o === 'site') { drawSite(); }
  else if (o === 'quiz') { drawQuiz(); }
  else if (o === 'launch') {
    panel(40, 250, W - 80, 420); fill(U.title); textAlign(CENTER, CENTER); textSize(28); textStyle(BOLD); text(THEME.text.launchTitle, W / 2, 300); textStyle(NORMAL);
    fill(U.text); wrapText(THEME.text.launchAsk(P.banked, totalSheep(), turnsLeft()), 70, 340, W - 140, 16, 22);
    button(80, 470, W - 160, 64, THEME.text.launchNow, () => { G.launched = true; G.overlay = 'win'; sfx('win'); saveBest(); }, { big: true, warn: true });
    button(80, 550, W - 160, 56, THEME.text.keepLooking, () => { G.overlay = null; });
  }
  else if (o === 'win' || o === 'lose') {
    panel(40, 220, W - 80, 470); const win = o === 'win';
    fill(win ? U.good : U.danger); textAlign(CENTER, CENTER); textSize(34); textStyle(BOLD); text(win ? (P.banked >= totalSheep() ? THEME.text.winTitle : THEME.text.launchedTitle) : (G.loseReason === 'time' ? THEME.text.timeTitle : THEME.text.loseTitle), W / 2, 280); textStyle(NORMAL);
    fill(U.text); let y = wrapText(win ? THEME.text.winVerse : (G.loseReason === 'time' ? THEME.text.timeVerse : THEME.text.loseVerse), 70, 320, W - 140, 16, 22);
    textSize(16); text(THEME.text.flockLine(P.banked, totalSheep()), W / 2, y + 30); text(P.turns + ' ' + THEME.text.turnsWord + '   ·   ' + P.kills + ' ' + THEME.text.foesWord, W / 2, y + 56);
    button(90, 590, W - 180, 60, THEME.text.again, () => newRun(), { big: true });
    credit(670);
  }
}

function drawWorldMap() {
  const U = THEME.ui, gw = WORLD.grid[0].length, gh = WORLD.grid.length, cw = 112, ch = 96, x0 = (W - gw * cw) / 2, y0 = 190;
  panel(16, 110, W - 32, 680); fill(U.text); textAlign(CENTER, CENTER); textSize(26); textStyle(BOLD); text(THEME.text.mapTitle, W / 2, 150); textStyle(NORMAL);
  const center = (id) => { const g = gridPos(id); return { x: x0 + g.c * cw + cw / 2, y: y0 + g.r * ch + ch / 2 }; };
  const seenId = (id) => !!G.rooms[id] || SETTINGS.debug.revealMap;
  stroke(U.dimText); strokeWeight(5);
  for (let r = 0; r < gh; r++) { for (let c = 0; c < gw; c++) { const id = WORLD.grid[r][c]; if (!id) { continue; } for (const s of ['e', 's']) { const o = neighborRoom(id, s); if (o && (seenId(id) || seenId(o))) { const a = center(id), b = center(o); line(a.x, a.y, b.x, b.y); } } } }
  noStroke();
  for (let r = 0; r < gh; r++) {
    for (let c = 0; c < gw; c++) {
      const id = WORLD.grid[r][c]; if (!id) { continue; }
      const p = center(id), seen = seenId(id), here = id === G.roomId || WORLD.rooms[id].cave === G.roomId;
      const warp = canWarpTo(id) && !G.room.enemies.length;
      THEME.mapCell(p.x, p.y, cw - 14, ch - 14, seen, here, id === WORLD.start, warp, !!G.rooms[id] && alarmOn(G.rooms[id]));
      if (seen && !here) { G.ui.push({ x: p.x - (cw - 14) / 2, y: p.y - (ch - 14) / 2, w: cw - 14, h: ch - 14, fn: () => tryWarp(id) }); }
      noStroke(); fill(U.text); textAlign(CENTER, CENTER); textSize(12);
      if (!seen) { fill(U.dimText); textSize(26); text('?', p.x, p.y); continue; }
      text(WORLD.rooms[id].name, p.x, p.y - 22);
      const info = roomSheepInfo(id); for (let k = 0; k < info.left; k++) { THEME.sheepIcon(p.x - 10 * (info.left - 1) + k * 20, p.y + 2, 0.7); }
      if (WORLD.rooms[id].site) { THEME.mapSiteIcon(p.x + 34, p.y + 24, G.rooms[id] && G.rooms[id].siteUsed); }
      if (WORLD.rooms[id].cave) { const cv = WORLD.rooms[id].cave; THEME.mapCaveIcon(p.x - 34, p.y + 24, !!G.rooms[cv], roomSheepInfo(cv).left); }
    }
  }
  fill(U.text); textSize(14); textAlign(CENTER, CENTER); text(THEME.text.mapLegend, W / 2, 606);
  text(THEME.text.flockLine(P.banked, totalSheep()) + '   ·   ' + THEME.text.carryLine(P.carry, carryCap()), W / 2, 640);
  const homeOk = G.roomId !== WORLD.start && !G.room.enemies.length;
  button(40, 690, W / 2 - 50, 64, THEME.text.warpHome, () => { if (G.roomId === WORLD.start) { G.mapMsg = THEME.text.alreadyHome; G.mapMsgT = 2; return; } tryWarp(WORLD.start); }, { dim: !homeOk, sub: G.roomId === WORLD.start ? THEME.text.youAreHere : (homeOk ? (SETTINGS.travel.warpTurns ? SETTINGS.travel.warpTurns + ' ' + THEME.text.turnsWord : THEME.text.ready) : THEME.text.clearFirst) });
  button(W / 2 + 10, 690, W / 2 - 50, 64, THEME.text.close, () => { G.overlay = null; }, { big: true });
  if (G.mapMsgT > 0) { noStroke(); fill(U.danger); textSize(14); textAlign(CENTER, CENTER); text(G.mapMsg, W / 2, 668); }
}
function roomSheepInfo(id) { const r = G.rooms[id]; if (!r) { return { left: SETTINGS.debug.revealMap ? (WORLD.rooms[id].sheep || 0) : 0 }; } return { left: r.sheep.length }; }

function drawSite() {
  const U = THEME.ui; panel(24, 120, W - 48, 660);
  fill(U.title); textAlign(CENTER, CENTER); textSize(26); textStyle(BOLD); text(G.bossReward ? THEME.text.bossTitle : THEME.text.siteTitle, W / 2, 160); textStyle(NORMAL);
  fill(U.text); let y = wrapText(G.verse, 60, 190, W - 120, 15, 21) + 6;
  textSize(14); fill(U.dimText); text(THEME.text.siteAsk, W / 2, y + 8); y += 30;
  for (const b of G.siteOpts) {
    const label = b.name, sub = b.desc + (b.cost ? '   ' + THEME.text.costWord(b.cost) : '   ' + THEME.text.free);
    button(52, y, W - 104, 92, label, () => takeBlessing(b), { sub, wide: true, warn: !!b.cost });
    y += 104;
  }
  button(52, y + 6, W - 104, 66, THEME.text.rest, () => takeRest(), { sub: THEME.text.restSub, wide: true });
}
function drawQuiz() {
  const U = THEME.ui, Q = G.quiz; panel(24, 160, W - 48, 620);
  fill(U.title); textAlign(CENTER, CENTER); textSize(24); textStyle(BOLD); text(THEME.text.puzzleTitle[Q.kind] || THEME.text.quizTitle, W / 2, 196); textStyle(NORMAL);
  fill(U.dimText); textSize(14); text(THEME.text.puzzleHelp[Q.kind] || '', W / 2, 226);
  fill(U.text); let y = wrapText(G.verse, 60, 248, W - 120, 13, 18) + 10;
  if (Q.kind === 'math') {
    textStyle(BOLD); textSize(34); while (textWidth(Q.q) > W - 110 && textSize() > 16) { textSize(textSize() - 1); } text(Q.q, W / 2, y + 24); textStyle(NORMAL); y += 74;
    Q.choices.forEach((c, k) => { button(70, y + k * 82, W - 140, 68, String(c), () => { if (c === Q.a) { puzzleSolved(); } else { Q.tries++; sfx('no'); say(THEME.text.quizWrong, 1.6); const nq = makePuzzle(mulberry(hashStr(G.seed + ':q:' + G.roomId + ':' + Q.tries)), G.roomId); nq.tries = Q.tries; G.quiz = nq.kind === 'math' ? nq : Object.assign(makeQuiz(mulberry(hashStr('m' + Q.tries))), { kind: 'math', tries: Q.tries }); } }, { big: true }); });
  } else if (Q.kind === 'dots') {
    for (let k = 1; k < Q.next; k++) { THEME.wire(Q.pts[k - 1].x, Q.pts[k - 1].y, Q.pts[k].x, Q.pts[k].y, THEME.cableColors[0]); }
    Q.pts.forEach((pt, k) => { THEME.node(pt.x, pt.y, String(k + 1), k < Q.next, k === Q.next); G.ui.push({ x: pt.x - 34, y: pt.y - 34, w: 68, h: 68, fn: () => {
      if (k === Q.next) { Q.next++; sfx('pick'); if (Q.next >= Q.pts.length) { puzzleSolved(); } }
      else if (k >= Q.next) { Q.next = 0; Q.tries++; sfx('no'); say(THEME.text.quizWrong, 1.4); }
    } }); });
  } else if (Q.kind === 'colors') {
    const ly = (k) => 350 + k * 78, lx = 110, rx = W - 110;
    for (const k of Q.done) { THEME.wire(lx, ly(k), rx, ly(Q.right.indexOf(k)), Q.cols[k]); }
    if (Q.sel >= 0) { THEME.wire(lx, ly(Q.sel), lx + 60, ly(Q.sel), Q.cols[Q.sel]); }
    for (let k = 0; k < 4; k++) {
      THEME.plug(lx, ly(k), Q.cols[k], Q.done.includes(k), Q.sel === k);
      G.ui.push({ x: lx - 40, y: ly(k) - 34, w: 80, h: 68, fn: () => { if (!Q.done.includes(k)) { Q.sel = k; sfx('tap'); } } });
      const c = Q.right[k];
      THEME.plug(rx, ly(k), Q.cols[c], Q.done.includes(c), false);
      G.ui.push({ x: rx - 40, y: ly(k) - 34, w: 80, h: 68, fn: () => {
        if (Q.sel < 0 || Q.done.includes(c)) { return; }
        if (Q.sel === c) { Q.done.push(c); Q.sel = -1; sfx('pick'); if (Q.done.length === 4) { puzzleSolved(); } } else { Q.sel = -1; Q.tries++; sfx('no'); say(THEME.text.quizWrong, 1.4); }
      } });
    }
  }
  if (G.msgT > 0 && Q.tries > 0) { noStroke(); fill(U.danger); textSize(15); textAlign(CENTER, CENTER); text(G.msg, W / 2, 748); }
}

