#!/usr/bin/env node
// Fight simulator for balancing Labyrinth of Roots: a Monte Carlo of hkFight's core loop (you swing
// every round and wake the gems once; the foe swings back; combos, Rootbreakers, Adaptive Reasoning's
// AC, the heartgrain, bleeds and up to 2 bandages are modelled; companions, items, spells and quirks
// are not, so real fights run a little easier). Levels and max HP per part come from playtest bot runs.
//
//   node tools/fight-sim.js          the curve in the game now
//   node tools/fight-sim.js old      the curve before 2026-11-04 (no bleeds)
//   D=4 A=6 P=3 M=0.035 B=25 node tools/fight-sim.js try    try other numbers: foe damage +1 every D
//                                    levels, foe to-hit +1 every A, your damage +1 every P, foe HP +M a
//                                    level, B% bleed chance (0 = none)
//
// It prints, for a fight at the level you'd usually meet it: average rounds, % of max HP lost, how often
// you'd dig in (23% HP or less) and how often the axe would have to hold you at 1 HP.
// Aim (2026-11-04): ordinary fights 3-4 rounds and 15-25% of HP; bosses 6-9 rounds and 40-70%.
const V = process.argv[2] || "now";
const d = (s) => 1 + Math.floor(Math.random() * s);
const roll = (n, s) => { let t = 0; for (let i = 0; i < n; i++) t += d(s); return t; };
const E = (k, def) => (process.env[k] !== undefined ? +process.env[k] : def);
const SCALE = {
  old: { mult: k => 1 + 0.035 * k, atk: k => Math.floor(k / 8), dmg: k => Math.floor(k / 6), heads: k => 0, pdmg: k => Math.floor(k / 6), bleed: 0, band: false },
  now: { mult: k => 1 + 0.035 * k, atk: k => Math.floor(k / 6), dmg: k => Math.floor(k / 4), heads: k => 0, pdmg: k => Math.floor(k / 3), bleed: 25, band: true },
  try: { mult: k => 1 + E("M", 0.035) * k, atk: k => Math.floor(k / E("A", 6)), dmg: k => Math.floor(k / E("D", 4)), heads: k => 0, pdmg: k => Math.floor(k / E("P", 3)), bleed: E("B", 25), band: true },
}[V];
// Level and max HP at a part. The pace since 2026-11-08 (xpNeed 200 + 1 a level, the bot earns ~108 XP a
// part) lands about a level every two parts and level 40 at the end of the story; "old" is the pace
// before it (lv ≈ 3 + 0.57*part). HP ≈ 24 + 2k (+3 at each fifth-level milestone), +56% at the Glade, + ~8 items.
const xpNeed = (L) => L < 40 ? 200 + (L - 3) : 300 + 40 * (L - 39);
const lvAt = (p) => { if (V === "old") return Math.min(40, Math.round(3 + 0.57 * p)); let x = 108 * p, L = 3; while (L < 50 && x >= xpNeed(L)) { x -= xpNeed(L); L++; } return L; };
const hpAt = (p, L) => { const k = L - 3; let h = 24 + 2 * k + (V === "old" ? 0 : 3 * Math.floor(L / 5)); if (p >= 15) h += Math.round(0.56 * (24 + 2 * Math.min(k, 10))); if (p >= 10) h += 6; if (p >= 30) h += 6; return h; };

function fight(F, L, maxHp, opt = {}) {
  const k = L - 3, fk = opt.fk != null ? opt.fk : k; // fk: the foe's level (an outgrown road beast fights below yours)
  const heads = !!F.heads;
  let fhp = heads ? F.heads + SCALE.heads(fk) : Math.round(F.hp * SCALE.mult(fk));
  const fatk = F.atk + SCALE.atk(fk), fdmg = SCALE.dmg(fk) + (opt.hard && V !== "old" ? 1 + Math.floor(fk / 12) : 0); // hard: a lone road beast from Part XVIII on (2026-11-14)
  let hp = maxHp, rounds = 0, chain = 0, adapt = 0, grained = false, gems = true, lowest = hp, saves = 0, bleed = [], bands = 2;
  const pHit = 5 + Math.floor(k / 9), pDmg = 3 + SCALE.pdmg(k);
  const acBase = 13 + Math.floor(k / 12) + (opt.gear || 0);
  while (fhp > 0 && rounds < 40) {
    rounds++;
    if (gems && !heads) { gems = false; fhp -= roll(2, 6); chain = Math.min(2, chain + 1); }
    else if (gems && heads) { gems = false; fhp -= 1; chain = Math.min(2, chain + 1); }
    else {
      const r = d(20), cb = Math.min(2, chain);
      if (r === 20 || (r !== 1 && r + pHit + cb >= F.ac)) {
        chain = Math.min(3, chain + 1);
        if (heads) { fhp -= (chain >= 3 && fhp > 1) ? 2 : 1; if (chain >= 3) chain = 0; }
        else {
          const rb = chain >= 3; let t = roll(rb ? 2 : 1, 8) + pDmg + (chain === 2 ? 2 : rb ? 4 : 0); if (rb) chain = 0; fhp -= t;
        }
      } else chain = 0;
    }
    if (fhp <= 0) break;
    if (SCALE.bleed && bleed.length) { let t = Math.floor(k / 9); bleed.forEach(x => t += d(x)); hp = Math.max(1, hp - t); lowest = Math.min(lowest, hp); if (SCALE.band && bleed.length >= 2 && bands > 0) { bands--; bleed = []; continue; } }
    const swings = heads ? Math.min(fhp, 2) : 1;
    for (let i = 0; i < swings; i++) {
      const ac = acBase + (L >= 5 ? adapt : 0);
      const r = d(20);
      if (r === 20 || (r !== 1 && r + fatk >= ac)) {
        let t = roll(F.n || 1, F.s) + fdmg;
        if (!grained && t > 1 && opt.grain) { grained = true; t -= Math.min(t - 1, d(4)); }
        hp -= t; if (adapt < 2) adapt++;
        if (SCALE.bleed && (r === 20 || d(100) <= SCALE.bleed)) { const die = F.s >= 8 && L >= 9 ? 6 : 4; if (bleed.length < 3) bleed.push(die); else { bleed.sort((a,b)=>a-b); bleed[0] = Math.max(bleed[0], die); } }
        if (hp <= 0) { hp = 1; saves++; }
        lowest = Math.min(lowest, hp);
      }
    }
  }
  return { rounds, lost: (maxHp - hp) / maxHp, low: lowest / maxHp, saves };
}
function stats(F, L, maxHp, opt) {
  const N = 4000; let r = 0, l = 0, lo = 0, sv = 0, dig = 0;
  for (let i = 0; i < N; i++) { const o = fight(F, L, maxHp, opt); r += o.rounds; l += o.lost; lo += o.low; sv += o.saves ? 1 : 0; dig += o.low <= 0.23 ? 1 : 0; }
  return { rounds: (r / N).toFixed(1), lost: Math.round(100 * l / N) + "%", dig: Math.round(100 * dig / N) + "%", axe: Math.round(100 * sv / N) + "%" };
}
module.exports = { fight, stats, lvAt, hpAt };
if (require.main === module) {
  const HESK = { ac: 13, atk: 4, n: 1, s: 8 };
  const FIGHTS = [
    ["Knot-hound (roots, p4)", 4, { hp: 18, ac: 12, atk: 4, s: 6 }],
    ["Burrow-ticks (p4)", 4, { heads: 3, ac: 11, atk: 3, s: 4 }],
    ["Duneskimmer (p6)", 6, { hp: 16, ac: 15, atk: 5, s: 6 }],
    ["Peat-hulk (p11)", 11, { hp: 24, ac: 11, atk: 3, n: 2, s: 8 }],
    ["Rustcoat (p17)", 17, { hp: 20, ac: 13, atk: 4, s: 8 }],
    ["Ditch-reeve (p23)", 23, { hp: 16, ac: 13, atk: 4, s: 8 }],
    ["Gibbet crows (p23)", 23, { heads: 4, ac: 12, atk: 4, s: 4 }],
    ["Kiln-mastiff (p29)", 29, { hp: 20, ac: 13, atk: 4, s: 8 }],
    ["Coyle 40 (p33)", 33, { hp: 40, ac: 14, atk: 5, s: 8 }],
    ["Hesk gleaner (p35)", 35, { ...HESK, hp: 16 }],
    ["Skarrit (p37)", 37, { hp: 26, ac: 14, atk: 5, s: 10 }],
    ["Hesk raiders x3 (p36)", 36, { ...HESK, heads: 3 }],
    ["Korr-Vesh (p40)", 40, { hp: 40, ac: 14, atk: 5, s: 10 }],
    ["Shade-shearer (p43)", 43, { hp: 18, ac: 13, atk: 5, s: 6 }],
    ["Dimmers x3 (p44)", 44, { heads: 3, ac: 12, atk: 4, s: 6 }],
    ["Plumbmaw (p50)", 50, { hp: 24, ac: 15, atk: 4, s: 8 }],
    ["Unmoored x3 (p50)", 50, { heads: 3, ac: 13, atk: 4, s: 6 }],
    ["Brine-hound (p57)", 57, { hp: 20, ac: 13, atk: 5, s: 6 }],
    ["Bathyr x3 (p57)", 57, { heads: 3, ac: 14, atk: 5, s: 8 }],
    ["Silent General (p60)", 60, { hp: 42, ac: 16, atk: 7, s: 10 }],
    ["Curator (p61)", 61, { hp: 52, ac: 15, atk: 7, s: 10 }],
    ["Road beast L40", 76, { hp: 20, ac: 13, atk: 4, s: 8 }, 40],
    ["Road mob L40", 76, { heads: 3, ac: 12, atk: 4, s: 6 }, 40],
    // An outgrown road beast: back in the Labyrinth (left at part 6) at level 30 and 39, before the Cascades.
    ["Knot-hound back home L30", 76, { hp: 18, ac: 12, atk: 4, s: 6 }, 30, "roots"],
    ["Knot-hound back home L39", 76, { hp: 18, ac: 12, atk: 4, s: 6 }, 39, "roots"],
    ["Brine-hound back L39", 76, { hp: 20, ac: 13, atk: 5, s: 6 }, 39, 62],
  ];
  // The game's foeLvkFor: a road beast fights at the level you'd have on leaving its region, closing half the gap if you've outgrown it.
  const regK = (left) => lvAt(left) - 3;
  const fkFor = (k, left) => { if (V === "old" || left == null) return k; const r = regK(left === "roots" ? 6 : left); return k <= r ? k : Math.round(r + (k - r) / 2); };
  console.log("curve: " + V);
  const BOSS = /Coyle|Korr-Vesh|General|Curator/;
  for (const [n, p, F, lvl, left] of FIGHTS) { const L = lvl || lvAt(p), H = hpAt(p, L), fk = fkFor(L - 3, left), hard = p >= 17 && !F.heads && !BOSS.test(n); console.log(n.padEnd(26), "Lv" + L + (fk !== L - 3 ? " (foe Lv" + (fk + 3) + ")" : ""), "HP" + H, JSON.stringify(stats(F, L, H, { grain: p > 5, gear: p > 20 ? 1 : 0, fk, hard }))); }
}
