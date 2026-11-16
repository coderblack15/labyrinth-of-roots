// Blade duel simulator (2026-11-16). Plays duelRun's rules (index.html, "blade duels: the stroke pad")
// against a modelled fencer, many times, and prints win rates per opponent and level.
//   node tools/duel-sim.js            the rules as they are in index.html now
//   node tools/duel-sim.js old        the rules before the 2026-11-16 "harder duels" pass
// The fencer is a model, not a person: each attack they answer with a reaction time (normal, mean/sd
// below, from the moment the answer bar starts) and a chance to draw the exact line (else one point
// off = half damage, else the wrong line). Knowing the foe's style (Duelist's Eye) makes them a little
// quicker and surer on attacks that follow it. In the press they see the guard and cut open lines,
// avoid repeating themselves, aim at a known weak spot, and the practised/sharp ones use Lantern Turn
// (bind, then a cut across). "Heat" is the number of duels already fought on this journey (S.duel.n).
// Since 2026-11-16 a duel is fought to the yield: you're beaten once it has cost you 40% of your max HP
// (DU_STAKE), not at 0, so "win%" means something. Before that, nobody lost a duel on HP.
"use strict";
const V = process.argv[2] || "now";
const N = +process.env.N || 3000;
const d = (s) => 1 + Math.floor(Math.random() * s);
const roll = ([n, s, b]) => { let t = b || 0; for (let i = 0; i < n; i++) t += d(s); return t; };
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// The rules that changed. "old" is the game before 2026-11-16; "now" mirrors index.html.
const R = {
  old: { winCut: 0, ripMs: 1000, readMs: 850, styleAt: 4, readFree: true, heat: () => ({ win: 0, hp: 1, dmg: 0, chain: false, guard: 0 }), smart: 0, weakDie: 1, hpX: 1, dmgK: 0, stake: 1 },
  now: { winCut: 200, ripMs: 900, readMs: 750, styleAt: 6, readFree: false,
    // Mirrors duHeat() in index.html.
    heat: (n) => { const h = Math.min(20, n); return { win: 15 * h, hp: 1 + 0.015 * h, dmg: Math.floor(h / 6), chain: h >= 12, guard: h >= 18 ? 1 : 0 }; },
    smart: 1, weakDie: 1, hpX: 1.4, dmgK: 0.05, stake: 0.4 },
}[V];

const FENCERS = {
  new:       { rt: 1450, sd: 420, ex: 0.62, half: 0.22, form: 0 },
  practised: { rt: 1050, sd: 320, ex: 0.80, half: 0.13, form: 0.5 },
  sharp:     { rt: 820,  sd: 230, ex: 0.90, half: 0.07, form: 1 },
};
const DU_LINES = [["right"], ["high", "right"], ["high"], ["high", "left"], ["left"], ["low", "left"], ["low"], ["low", "right"]];
const DU_ALL = ["high", "low", "left", "right"];
const STYLES = {
  fall: () => d(100) <= 65 ? { k: "cut", d: 4 + d(3) } : null,
  rise: () => d(100) <= 65 ? { k: "cut", d: d(3) } : null,
  scythe: () => d(100) <= 60 ? { k: "cut", d: d(2) === 1 ? 0 : 4 } : null,
  needle: () => d(100) <= 45 ? { k: "thrust" } : null,
  echo: (p) => p && d(2) === 1 ? Object.assign({}, p) : null,
  mirror: (p, last) => last != null && d(2) === 1 ? { k: "cut", d: (last + 4) % 8 } : null,
  vane: (p) => p && p.k === "cut" && d(100) <= 60 ? { k: "cut", d: (p.d + 1) % 8 } : null,
  wrong: () => d(100) <= 65 ? { k: "cut", d: 2 + d(3) } : null,
};
const STY = Object.keys(STYLES);
const hpAt = (L) => { const k = L - 3; return 24 + 2 * k + 3 * Math.floor(L / 5) + Math.round(0.56 * (24 + 2 * Math.min(k, 10))) + 12; };

// One duel. o: the foe as duelFight is called. L: your level. eye: Duelist's Eye rank (0-3). heat: duels fought.
function duel(o, L, F, eye, heat, school) {
  const k = L - 3, H = R.heat(heat);
  const fmax = Math.round(o.hp * (1 + 0.035 * k) * H.hp * R.hpX);
  let fhp = fmax, me = hpAt(L); const me0 = me, floor = Math.round(me0 * (1 - R.stake));
  const die = [1, 8, 3], lvDmg = Math.floor(k / 3), dmgUp = Math.floor(k / 4) + H.dmg;
  const sty = STYLES[STY[Math.floor(Math.random() * STY.length)]], wz = DU_ALL[d(4) - 1];
  let named = false, weak = false, seen = 0, studied = false;
  const st = { pr: school === "thorn" ? 2 : 0, broken: false, guard: [], unguard: false, recent: [], rip: false, stag: false, bleed: 0, maim: {}, wounds: { high: 0, low: 0, left: 0, right: 0 }, lastTell: null, lastCut: null, lines: { high: 0, low: 0, left: 0, right: 0 } };
  const chains = (o.chains || [0.5]).concat(H.chain ? [0.8] : []);
  for (let turn = 1; turn < 60; turn++) {
    // their turn
    if (st.bleed) { st.bleed--; fhp -= 2 + Math.floor(k / 6); if (fhp <= 0) return { won: true, lost: 1 - me / me0 }; }
    if (st.maim.left) { fhp -= 1 + Math.floor(k / 8); if (fhp <= 0) return { won: true, lost: 1 - me / me0 }; }
    let n = 1 + chains.filter(f => fhp / fmax <= f).length;
    if (st.maim.low) n = Math.max(1, n - 1);
    let prev = st.lastTell;
    for (let i = 0; i < n; i++) {
      const sw = sty(prev, st.lastCut), t = sw || (d(5) === 1 ? { k: "thrust" } : { k: "cut", d: d(8) - 1 });
      prev = t; seen++;
      if (eye && !named && (eye >= 3 || seen >= R.styleAt)) named = true;
      const win = (o.win || 2300) - R.winCut - H.win + (school === "lantern" ? 500 : 0) + (turn <= 2 ? 250 : 0) + (st.stag ? 900 : 0) + (st.maim.high ? 400 : 0) + (850 - R.readMs);
      const know = named && sw ? 1 : 0;
      const rt = F.rt - know * (150 + (eye >= 3 ? 80 : 0)) + gauss() * F.sd;
      let res = "miss";
      if (rt < win) { const r = Math.random(), ex = Math.min(0.97, F.ex + know * (0.05 + (eye >= 3 ? 0.03 : 0))); res = r < ex ? "full" : r < ex + F.half ? "half" : "miss"; }
      const dmg = Math.max(1, Math.round((roll(o.dmg) + dmgUp) * (1 + R.dmgK * k)) - (st.maim.right ? 2 : 0));
      if (res === "full") { if (rt < R.ripMs) { st.rip = true; if (eye >= 2) weak = true; } }
      else me -= res === "half" ? Math.ceil(dmg / 2) : dmg;
      if (me <= floor) return { won: false, lost: 1 - Math.max(0, me) / me0 };
    }
    st.lastTell = prev; st.stag = false;
    // your press
    st.guard = DU_ALL.slice().sort(() => Math.random() - 0.5).slice(0, Math.min(3, (o.guard || 2) + H.guard));
    // A sharper foe (2026-11-16) reads where you've been cutting this duel and covers that line.
    if (R.smart) { const hot = DU_ALL.filter(l => st.lines[l] >= 2).sort((a, b) => st.lines[b] - st.lines[a])[0]; if (hot && !st.guard.includes(hot)) st.guard[st.guard.length - 1] = hot; }
    if (st.rip) { st.rip = false; st.guard = st.guard.slice(0, 1); st.pr = Math.min(6, st.pr + (school === "lantern" ? 3 : 2)); if (st.pr >= 6) st.broken = true; }
    st.unguard = false;
    if (eye >= 2 && !studied && (!named || !weak) && Math.random() < 0.5) { studied = true; named = true; weak = true; if (eye < 3 || !R.readFree) continue; }
    const plan = [];
    if (Math.random() < F.form) plan.push("bind", 0);
    while (plan.length < 3) plan.push(null);
    for (const p of plan) {
      let t;
      if (p === "bind") t = { k: "bind" };
      else if (p === 0) t = { k: "cut", d: 0 };
      else {
        const open = st.unguard || st.broken;
        const cands = [0, 1, 2, 3, 4, 5, 6, 7].filter(x => !st.recent.slice(-3).includes("cut" + x) && (open || DU_LINES[x].some(l => !st.guard.includes(l))));
        const pick = F === FENCERS.new && Math.random() < 0.3 ? null : cands.sort((a, b) => (weak && DU_LINES[b].includes(wz) ? 1 : 0) - (weak && DU_LINES[a].includes(wz) ? 1 : 0))[0];
        t = pick == null ? (d(4) === 1 ? { k: "thrust" } : { k: "cut", d: d(8) - 1 }) : { k: "cut", d: pick };
      }
      const key = t.k === "cut" ? "cut" + t.d : t.k, repeated = st.recent.slice(-3).includes(key);
      st.recent.push(key);
      const lantern = t.k === "cut" && t.d === 0 && st.recent[st.recent.length - 2] === "bind";
      const open = st.unguard || st.broken;
      if (repeated && !open && t.k === "cut") st.guard = [...new Set(st.guard.concat(DU_LINES[t.d]))];
      let dmg = 0, pr = 1;
      if (t.k === "cut") {
        st.lastCut = t.d;
        for (const l of DU_LINES[t.d]) st.lines[l]++;
        if (open || DU_LINES[t.d].some(l => !st.guard.includes(l))) {
          dmg = roll(die) + lvDmg;
          if (eye) {
            const can = open ? DU_LINES[t.d] : DU_LINES[t.d].filter(x => !st.guard.includes(x));
            const z = eye >= 2 && weak && can.includes(wz) ? wz : can[0];
            if (z === wz && eye >= 2 && weak) dmg += R.weakDie ? roll(die) : 0;
            st.wounds[z]++; if (st.wounds[z] >= 2) st.maim[z] = true;
          }
        }
        st.unguard = false;
      } else if (t.k === "thrust") { dmg = d(4) + Math.floor(lvDmg / 2); st.unguard = false; }
      else if (t.k === "bind") st.unguard = true;
      if (lantern && dmg) { dmg += 3; pr += 1; }
      if (st.broken && dmg) { dmg = dmg * 2 + (school === "thorn" ? 4 : 0); st.broken = false; st.pr = 0; pr = 0; }
      fhp -= dmg;
      st.pr = Math.min(6, st.pr + pr); if (st.pr >= 6 && !st.broken) st.broken = true;
      if (fhp <= 0) return { won: true, lost: 1 - me / me0 };
    }
  }
  return { won: false, lost: 1 - me / me0 };
}

const FOES = {
  "salle journeyman": { hp: 26, dmg: [1, 6, 1], win: 2500, chains: [0.5], guard: 2 },
  "salle provost": { hp: 36, dmg: [1, 6, 2], win: 2250, chains: [0.5], guard: 2 },
  "salle master": { hp: 46, dmg: [1, 6, 3], win: 2000, chains: [0.6, 0.3], guard: 3 },
  "gang Knife": { hp: 30, dmg: [1, 8, 2], win: 2300, chains: [0.5] },
  "rival captain": { hp: 42, dmg: [2, 6, 1], win: 2100, chains: [0.6, 0.3] },
  "thief-taker": { hp: 36, dmg: [1, 8, 3], win: 1900, chains: [0.6, 0.3] },
};
// "win% / HP%": how often you win, and the share of your HP the duel costs on average.
const pct = (x) => (String(Math.round(100 * x[0])) + "%/" + Math.round(100 * x[1]) + "%").padStart(8);
function rate(o, L, F, eye, heat) { let w = 0, l = 0; for (let i = 0; i < N; i++) { const r = duel(o, L, F, eye, heat, ""); w += r.won ? 1 : 0; l += r.lost; } return [w / N, l / N]; }

console.log("Duel win rates (" + V + "), " + N + " duels each, as win% / share of HP lost. Columns: new / practised / sharp fencer.\n");
for (const [eye, tag] of [[0, "no Duelist's Eye"], [2, "Duelist's Eye, rank Mark"]]) {
  console.log("== " + tag + ", level 20, first duels (heat 0) ==");
  for (const [nm, o] of Object.entries(FOES)) console.log(nm.padEnd(18), Object.values(FENCERS).map(F => pct(rate(o, 20, F, eye, 0))).join("  "));
  console.log();
}
console.log("== practised fencer with the Eye (rank Mark), level 20, as duels pile up ==");
console.log("".padEnd(18), [0, 5, 10, 15, 20].map(h => ("heat " + h).padStart(10)).join(""));
for (const [nm, o] of Object.entries(FOES)) console.log(nm.padEnd(18), [0, 5, 10, 15, 20].map(h => pct(rate(o, 20, FENCERS.practised, 2, h)).padStart(10)).join(""));
console.log("\n== practised fencer, Eye rank Mark, heat 0, by level ==");
console.log("".padEnd(18), [10, 20, 30, 40].map(l => ("Lv " + l).padStart(10)).join(""));
for (const [nm, o] of Object.entries(FOES)) console.log(nm.padEnd(18), [10, 20, 30, 40].map(l => pct(rate(o, l, FENCERS.practised, 2, 0)).padStart(10)).join(""));
