#!/usr/bin/env node
// Balance check for Ebba Quenn's Twelve (2026-11-21) against the named weapons already in the game.
// A Monte Carlo of one weapon in hand against a level-scaled armoured foe: you swing every round
// (to-hit vs AC, combos and Rootbreakers), the weapon's traits fire as foeStrike/peWeaponProc do in
// index.html, poison and burning tick each round, and the weapon's first active goes off on round 2.
// It prints average rounds to drop the foe and HP drunk back per fight. Aim: the Twelve sit inside the
// band the Nightmare Armoury and Threadfang already make, never more than ~10% faster than the best.
//
//   node tools/quench-sim.js            level 25, a 110 HP foe with 30% armour, AC 15, by day
//   NIGHT=1 LV=40 HP=160 node tools/quench-sim.js
const d = (s) => 1 + Math.floor(Math.random() * s);
const roll = (n, s) => { let t = 0; for (let i = 0; i < n; i++) t += d(s); return t; };
const LV = +(process.env.LV || 25), HP = +(process.env.HP || 110), ARM = +(process.env.ARM || 0.3), AC = +(process.env.AC || 15), NIGHT = !!+(process.env.NIGHT || 0);
const ATK = 3 + Math.floor(LV / 4), DMG = Math.floor((LV - 3) / 3);
const W = {
  // already in the game
  "Nightmare Haunt Scythe": { die: [1, 12, 4], hit: 1, tr: ["keen", "drink"], ac: "eye" },
  "Flame Strike Bow": { die: [1, 10, 4], hit: 2, tr: ["fire", "first"], ac: "flame" },
  "The Watching Thorn": { die: [1, 10, 4], hit: 2, tr: ["first", "keen"], ac: "gaze" },
  "Frostbite": { die: [2, 6, 3], hit: 0, tr: ["frost"], ac: "rime", crush: true },
  "Threadfang": { die: [1, 8, 4], hit: 2, tr: ["keen"], ac: "drop" },
  "The Wrathbrand": { die: [1, 10, 4], hit: 1, tr: ["keen"], ac: "wrath" },
  // the Twelve
  "Rotwake": { die: [1, 12, 4], hit: 1, tr: ["venom", "keen"], ac: "rotbloom" },
  "The Ember Tithe": { die: [1, 8, 3], hit: 1, tr: ["fire", "leech"], ac: "flare" },
  "Tidebreaker": { die: [2, 6, 4], hit: 0, tr: ["lunar", "crush"], ac: "moonfall", crush: true },
  "Briarstring": { die: [1, 8, 3], hit: 2, tr: ["venom", "first"], ac: "onslaught" },
  "Heartwrack": { die: [2, 6, 4], hit: 0, tr: ["leech", "crush"], ac: "bloodlet", crush: true },
  "Widowhorn": { die: [1, 6, 4], hit: 1, tr: ["wither", "keen"], ac: "none" },
  "Dawnmercy": { die: [1, 10, 3], hit: 2, tr: ["leech", "keen"], ac: "flare" },
  "The Pale Harvest": { die: [1, 12, 4], hit: 1, tr: ["wither", "lunar"], ac: "reap" },
  "Gutterhook": { die: [1, 10, 2], hit: 1, tr: ["leech", "first"], ac: "bloodlet" },
  "The Gilt Arbalest": { die: [1, 10, 4], hit: 2, tr: ["venom", "first"], ac: "rotbloom" },
  "Moonsplitter": { die: [1, 8, 4], hit: 1, tr: ["lunar", "keen"], ac: "moonfall" },
  "The Eclipse Sceptre": { die: [2, 6, 2], hit: 0, tr: ["fire", "wither"], ac: "reap", crush: true },
};
const ACT = {
  eye: () => roll(2, 10), flame: (F) => { F.burnHits = 3; return roll(3, 8); }, gaze: () => roll(2, 10), rime: () => roll(2, 8),
  drop: (F) => { F.drop = true; return 0; }, wrath: () => roll(4, 8), flare: () => roll(3, 6), onslaught: () => roll(3, 6), none: () => 0,
  rotbloom: (F) => { F.ven = 3; return roll(2, 6); }, bloodlet: (F) => { const n = roll(2, 8); F.heal += Math.ceil(n / 2); return n; },
  moonfall: () => roll(NIGHT ? 4 : 2, 8), reap: (F) => { const n = roll(2, 10); if (n >= F.hp) F.heal += roll(2, 6); return n; },
};
function fight(w) {
  const F = { hp: HP, max: HP, ar: Math.round(HP * ARM), ven: 0, burn: 0, burnHits: 0, heal: 0, first: false, drop: false };
  let chain = 0, r = 0;
  while (F.hp > 0 && r < 40) {
    r++;
    if (F.burn > 0) { F.burn--; F.hp -= d(4); if (F.ar > 0) F.ar--; }
    if (F.ven > 0) F.hp -= F.ven;
    if (F.hp <= 0) break;
    if (r === 2) { F.hp -= ACT[w.ac](F); if (F.hp <= 0) break; }
    if (d(20) + ATK + w.hit + Math.min(chain, 2) < AC) { chain = 0; continue; }
    chain++;
    const rb = chain >= 3; if (rb) chain = 0;
    let t = roll(rb ? w.die[0] * 2 : w.die[0], w.die[1]) + w.die[2] + DMG + (rb ? 4 : chain === 2 ? 2 : 0);
    const tr = w.tr;
    if (tr.includes("first") && !F.first) { F.first = true; t += d(4); }
    if (tr.includes("fire")) t += d(4);
    if (F.drop) { F.drop = false; t += roll(2, 6); }
    if (tr.includes("crush") && rb) t += 4;
    if (tr.includes("keen") && F.hp < F.max / 2) t += d(6);
    if (tr.includes("lunar")) t += NIGHT ? d(8) : d(4);
    if (F.burnHits > 0) { F.burnHits--; t += d(6); }
    if (F.ar > 0) { const mult = 1 + (rb || w.crush ? 1 : 0), need = Math.ceil(F.ar / mult); if (t < need) { F.ar -= t * mult; t = 0; } else { t -= need; F.ar = 0; } }
    if (tr.includes("wither")) t += d(6);
    if (tr.includes("leech") && t > 0) F.heal += Math.max(1, Math.min(5, Math.floor(t / 5)));
    if (tr.includes("drink")) F.heal += d(3);
    F.hp -= t;
    if (tr.includes("fire") && d(3) === 1) F.burn = Math.max(F.burn, 2);
    if (tr.includes("venom") && d(2) === 1) F.ven = Math.min(3, F.ven + 1);
  }
  return [r, F.heal];
}
const N = 20000, rows = [];
for (const [name, w] of Object.entries(W)) {
  let R = 0, H = 0;
  for (let i = 0; i < N; i++) { const [r, h] = fight(w); R += r; H += h; }
  rows.push([name, R / N, H / N]);
}
console.log(`Level ${LV}, foe ${HP} HP, ${Math.round(ARM * 100)}% armour, AC ${AC}, ${NIGHT ? "night" : "day"}`);
rows.forEach(([n, r, h], i) => { if (i === 6) console.log("  -- Ebba Quenn's Twelve --"); console.log("  " + n.padEnd(24) + r.toFixed(2).padStart(6) + " rounds   " + h.toFixed(1).padStart(5) + " HP back"); });
