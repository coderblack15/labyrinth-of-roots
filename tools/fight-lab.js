#!/usr/bin/env node
// Fight lab for balancing Labyrinth of Roots: runs the game's REAL fight code (hkFight and everything it
// calls: callings, the Turning Gauge, armour bars, elements, bleeds, Wren, signature moves) in a headless
// browser, many times over, with a bot making the choices. Where tools/fight-sim.js is a quick model of
// the core loop, this plays the actual fights, so new systems are counted without being re-modelled.
//
//   node tools/fight-lab.js [--n 60] [--only REGEX] [--lv 30] [--cl axe,hush,...] [--policy reader|careless]
//                           [--from save.json] [--file index.html] [--seed 1] [--json out.json]
//
//   --n       fights per scenario and calling (default 60)
//   --only    run the scenarios whose name matches
//   --lv      override every scenario's level
//   --cl      callings to try (default all nine: axe hush song tide ink root bloom clock kith)
//   --policy  reader: picks the right counter to every tell, breaks the Soul Devour, uses its calling's
//             move when it's offered, bandages and catches its breath when low. careless: just swings,
//             and bandages. Run both: the gap between them is what reading the fight is worth.
//   --from    a save (a playtest save-partN.json) to build the hero from; its level/HP are then rescaled
//   --file    another copy of the game (e.g. main's index.html, to compare before and after a change)
//   --isak    put Isak Corrow in the company at this trust (0-5), optionally with a stance: --isak 3,anvil
//   LABDBG=1  print every choice and each fight's story (use with --n 1)
//
// It runs ~1 fight a second; split long runs over a few processes (--only) to use every core.
//
// Prints, per scenario and calling: win %, average rounds, % of max HP lost, how often you'd dig in
// (23% HP or less), and how often the axe had to hold you at 1 HP ("axe"). Aims (2026-11-04, kept):
// ordinary fights 3-4 rounds and 15-25% HP; bosses 6-9 rounds and 40-70%. A signature boss may run
// harder for a careless player, as long as a reader lands in the boss band.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const arg = (k, def) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : def; };
const N = +arg("n", 60), ONLY = arg("only", null) ? new RegExp(arg("only"), "i") : null, LV = arg("lv", null);
const CLS = (arg("cl", "axe,hush,song,tide,ink,root,bloom,clock,kith")).split(",");
const POLICY = arg("policy", "reader"), SEED = +arg("seed", 1), FROM = arg("from", null), ISAK = arg("isak", null);
const SRC = path.resolve(arg("file", path.join(__dirname, "..", "index.html")));

// Patches for the lab copy only: reach into the game's closure, let the bot see tells, and tell the Blink apart.
function labHtml() {
  let h = fs.readFileSync(SRC, "utf8");
  const rep = (a, b, all) => { if (!h.includes(a)) throw new Error("fight-lab: can't find " + a.slice(0, 60)); h = all ? h.split(a).join(b) : h.replace(a, b); };
  rep("let S = fresh();", "let S = fresh(); window.__ev = (s) => eval(s);");
  rep("st0.tell = ", "st0.tell = window.__tell = ", true);
  if (h.includes("st.cut = TB_CUTS[d(3) - 1];")) rep("st.cut = TB_CUTS[d(3) - 1];", "st.cut = window.__cut = TB_CUTS[d(3) - 1];");
  rep("other = ME_FIGK.filter(k => k !== K)[d(3) - 1], real = d(4) - 1;", "other = ME_FIGK.filter(k => k !== K)[d(3) - 1], real = d(4) - 1; window.__real = real;");
  const base = '<base href="' + require("url").pathToFileURL(path.dirname(SRC) + path.sep).href + '">';
  return h.replace(/<head>/i, (x) => x + base);
}

// ---- in the page: the bot, the hero, the scenarios ----
const PAGE = String.raw`
window.__lab = (() => {
  const ev = window.__ev;
  const P = { policy: "reader", stat: null };
  // The bot. opts are the visible options of a choose() call, with their keys.
  function pick(opts) {
    const st = P.stat, S = ev("S"), FOE = ev("FOE"), keys = opts.map(o => String(o.key)), has = (k) => keys.includes(k);
    const find = (re) => opts.find(o => re.test(String(o.key)));
    if (st) { st.choices++; st.low = Math.min(st.low, S.hp / S.maxHp); }
    if (window.__dbg) console.log("pick", S.hp + "/" + S.maxHp, FOE.on ? FOE.hp : "-", JSON.stringify(opts.map(o => o.key)));
    if (st && st.choices > 600) { const o = find(/^(escape|flee)/); if (o) return o.key; }
    const inFight = FOE.on && has("evade");
    const reader = P.policy === "reader";
    const t = window.__tell;
    // The Blink: four of her, one real
    if (opts.length === 4 && keys.every(k => /^f\d$/.test(k))) return reader ? "f" + window.__real : keys[Math.floor(Math.random() * 4)];
    if (!inFight) {
      const good = opts.find(o => !/flee|escape|run|leave|yield|swap|never mind|spare|let (him|her|them) go/i.test(o.label)) || opts[0];
      return good.key;
    }
    const hpF = S.hp / S.maxHp;
    // tells first
    if (reader && t) {
      let o = null;
      if (typeof t === "object" && t.name) o = opts.find(x => x.tag && x.tag.toLowerCase().includes(t.name.toLowerCase().replace(/^the /, "")));
      else if (t === "fall") o = find(/^brace-cloak$/);
      else if (t === "quiet") o = find(/^brace-bole$/);
      else if (t === "eye") o = find(/^brace-eyes$/);
      else if (t === "x") o = find(/^brace-rc$/);
      if (!o && typeof t === "object") o = find(/^brace-/);
      if (o) return o.key;
    }
    // The Eldest Pruner's cuts (the Sowers' Table): answer the one it showed
    if (reader && window.__cut) { const o = find(new RegExp("^tb-" + window.__cut.ans + "$")); window.__cut = null; if (o) return o.key; }
    if (reader) {
      const o = find(/^me-dev-proof$/) || find(/^me-expose$/) || find(/^me-names$/) || find(/^rc-whistle$/) || find(/^me-kerchief$/) || find(/^wipe$/);
      if (o) return o.key;
    }
    if (has("band") && (hpF < 0.5 || (S.bleed || []).length >= 2)) return "band";
    if (has("mend") && hpF < 0.4) return "mend";
    if (has("breath") && hpF < 0.35) return "breath";
    if (reader) {
      // the calling's move: Heartcleave is a swing (always); Graft when hurt; the rest once early in a big fight
      // or when it's going badly. The meter callings spend on the dearest move they can afford.
      // (Every calling spends its uses, so the callings are compared at full strength.)
      const ck = S.cl && S.cl.k;
      if (has("cls") && (ck === "root" ? hpF < 0.6 : true)) return "cls";
      if (has("kin")) return "kin";
      for (const k of ["cx-mid", "cx-verd", "cx-guard", "cx-lock", "cx-hand", "cx-grove", "cx-grasp", "cx-s-prec", "cx-s-rend", "kc-accord", "kc-all", "kc-s-two", "kc-rend"]) if (has(k)) return k;
      if (has("kc-guard") && hpF < 0.5) return "kc-guard";
      if (has("kc-tame")) return "kc-tame";
      if (has("gems")) return "gems";
      if (has("book")) return "book";
      if (has("shard")) return "shard";
      if (window.__heavy && has("g-heavy")) return "g-heavy";
      // Read the foe (2026-11-20): a wind-up or howl it can see gets a heavy blow (which staggers it), else a Brace.
      if (FOE.g && ev("typeof tellKnown") === "function") {
        const g = FOE.g, w = ev("gWindNext")(g) && ev("tellKnown")(g, "wind"), hw = ev("gHowlNext")(g) && ev("tellKnown")(g, "howl");
        if ((w || hw) && has("g-heavy")) return "g-heavy";
        if (w && has("hbrace")) return "hbrace";
      }
    }
    if (has("atk")) return "atk";
    const a = opts.find(o => !/^(escape|evade|flee)/.test(String(o.key)));
    return (a || opts[0]).key;
  }
  function install() {
    ev("chooseRaw = function (opts) { FOE.menu = false; const vis = opts.filter(shown); return new Promise(r => setTimeout(() => r(window.__lab.pick(vis)), 0)); }");
    ev("goldPick = async () => 0");
    window.__auto = true;
    // Any dice card (yours or the foe's "Brace"): press its button.
    const press = () => document.querySelectorAll("#story .roll .ctrl button.primary, #story .roll .ctrl button:only-child").forEach(b => { if (!b.disabled && !b.__p) { b.__p = 1; setTimeout(() => b.click(), 0); } });
    // Timing mini-games (dig in, and the like): press when it feels right, which is about anywhere.
    const puz = () => document.querySelectorAll("#story .puzzle button").forEach(b => { if (!b.disabled && b.offsetParent && !b.__q) { b.__q = 1; setTimeout(() => { b.__q = 0; if (!b.disabled) b.click(); }, 150 + Math.random() * 700); } });
    setInterval(puz, 120);
    new MutationObserver(press).observe(document.getElementById("story"), { childList: true, subtree: true });
    ev("try { tip = () => {}; } catch (e) {}");
    ev("try { achToast = () => {}; xpPop = () => {}; } catch (e) {}");
    ev("try { save = () => {}; } catch (e) {}");
  }
  // The hero at level L, with calling k: a level-3 start levelled up the game's own way (lvUp), the Glade's
  // HP and the usual items by then (from a playtest save if one was given).
  function hero(L, k, base) {
    ev("S = " + (base ? "JSON.parse(" + JSON.stringify(JSON.stringify(base)) + ")" : "fresh()"));
    const S = ev("S");
    if (!base) { S.axe = true; S.torch = true; S.shield = true; S.dress = 2; S.part = L >= 30 ? 60 : 20; }
    S.lv = 3; S.maxHp = 24; S.hp = 24;
    ev("started = true");
    const lvUp = ev("lvUp");
    for (let x = 4; x <= L; x++) { S.lv = x; lvUp(x); }
    // The Glade's +56% (on level-3..13 HP) and the ~+12 from items by mid-game, as fight-sim's hpAt does.
    S.maxHp += Math.round(0.56 * (24 + 2 * Math.min(L - 3, 10))) + 12;
    // A calling as it'd be by then: its rank already announced, the First Awakening behind it (a one-off
    // 3d8 + lv/4 the Warden and the Clockrunner get once, that would otherwise land in every lab fight),
    // and a path (Edge or Mend, half each), so the kindled move is in play.
    if (k) S.cl = { k, b: {}, rk: 5, wake1: true, path: Math.random() < 0.5 ? "edge" : "mend", uses: 40 };
    // A Kithcaller by then has a kith: two beasts from the middle of the road, bonded, one at heel.
    if (k === "kith") Object.assign(S.cl, { kith: [{ u: "k1", id: "mastiff", nm: "Coker", bond: Math.min(10, Math.floor(L / 5)), wins: 20 }, { u: "k2", id: "crab", nm: "Wick", bond: Math.min(10, Math.floor(L / 6)), wins: 12 }], heel: "k1", kinds: ["mastiff", "crab", "hound", "skimmer"] });
    if (window.__isak) { const [tr, lock] = window.__isak.split(","); S.co = { burr: null, merc: "", loyal: {}, sworn: [], post: "", seen: false, isak: { tr: +tr, how: "show", q: {}, gift: {}, gave: 0, seen: null, sty: { hit: 0, guard: 0, kit: 0 }, st: lock || "wall", lock: lock || "", reads: {}, took: 0, turned: 0, campAt: 1e9 } }; }
    S.hp = S.maxHp; S.gemsSpent = false; S.bleed = [];
    ev("renderSheet()");
    return S;
  }
  async function run(sc, L, k, n, policy, base) {
    P.policy = policy;
    const out = { win: 0, rounds: 0, lost: 0, dig: 0, axe: 0, err: 0, n: 0 };
    for (let i = 0; i < n; i++) {
      const S = hero(L, k, base);
      document.getElementById("story").innerHTML = "";
      window.__tell = null; window.__real = null; window.__cut = null; window.__rounds = 0; window.__F = null;
      const st = P.stat = { choices: 0, low: 1, saves: 0 };
      const max = S.maxHp;
      let F;
      try {
        F = ev("(" + sc.make + ")")();
        ev("FOE.lk = null");
        const r = await Promise.race([ev("(" + sc.go + ")")(F), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 20000))]);
        const FF = window.__F || F; const won = r === undefined ? !(FF.fled || FF.overtaken) : !!r;
        out.win += won ? 1 : 0;
        out.rounds += (F.__rounds || window.__rounds || 0);
        out.lost += Math.max(0, (max - S.hp) / max);
        out.dig += st.low <= 0.23 ? 1 : 0;
        out.axe += (F.__axe || st.low * max <= 1.01) ? 1 : 0;
        out.n++;
        if (window.__dbg) console.log("STORY " + [...document.getElementById("story").children].map(x => x.textContent.slice(0, 160)).join("\n"));
      } catch (e) { out.err++; out.lastErr = String(e && e.stack || e).slice(0, 400).split("\n").slice(0, 2).join(" ") + " · last buttons: " + [...document.querySelectorAll("#story button:not([disabled])")].slice(-4).map(b => b.textContent.slice(0, 40)).join(" / ") + " · tail: " + [...document.getElementById("story").children].slice(-3).map(x => x.className + ":" + x.textContent.slice(0, 120)).join(" | "); try { ev("FOE.on = false; foeEnd && foeEnd()"); } catch (e2) {} }
    }
    return out;
  }
  return { pick, install, hero, run, P };
})();
`;

// Scenarios: make() builds the foe as the game does (or as a chapter fight does), go(F) fights it.
// Both are evaluated inside the game's closure. go may return true/false for won/lost; otherwise
// F.fled / F.overtaken decide. Rounds are read off the fight's own st.round via a wrapped F.before.
const ROUNDS = "F.__b = F.before; F.before = async (st) => { F.__rounds = st.round; if (F.__b) return F.__b(st); };";
const plain = (o) => ({ make: "() => (" + JSON.stringify({ bloom: 0, hesk: false, type: "slashing", who: "it", whoShort: "it", hitWhy: "It hits you.", miss: "It misses.", ...o }) + ")", go: "async (F) => { " + ROUNDS + " await hkFight(F); }" });
const SCEN = [
  // road fights from the roads back, at level 40 (Lv40 = the end of the story)
  ["Road beast (ordinary)", 38, plain({ name: "Ditch-hound", hp: 20, ac: 13, atk: 4, n: 1, s: 8, road: true })],
  ["Armoured road beast", 38, plain({ name: "Plated hoarback", hp: 30, ac: 14, atk: 6, n: 1, s: 10, road: true, armour: 0.5 })],
  ["Nightmare road beast", 44, plain({ name: "Ditch-hound", hp: 20, ac: 13, atk: 4, n: 1, s: 8, road: true })],
  ["Early road beast", 12, plain({ name: "Ditch-hound", hp: 20, ac: 13, atk: 4, n: 1, s: 8, road: true })],
  ["Mid-story boss (Coyle-like)", 20, plain({ name: "The Glass Judge", hp: 40, ac: 14, atk: 5, n: 1, s: 8 })],
  ["Late boss (Curator-like)", 33, plain({ name: "The Curator", hp: 52, ac: 15, atk: 7, n: 1, s: 10 })],
  // The Mind's Eye and the compounds: the real signature-move fights
  ["Lens (meSigFight)", 40, { make: "() => { S.me = meNew(); return meFoe('aulden'); }", go: "async (F) => { " + ROUNDS + " return meSigFight(F, ME_SIG.embrace, 'Aulden Crake'); }" }],
  ["Clauneck", 40, { make: "() => { S.me = meNew(); return meFoe('clauneck'); }", go: "async (F) => { " + ROUNDS + " return meSigFight(F, [ME_SIG.gilded, ME_SIG.purse], 'Clauneck'); }" }],
  ["Compound chief (size 3)", 38, { make: "() => ({})", go: "async () => labChief('stockade', 3)" }],
  ["Tharen Ravendare", 40, { make: "() => ({})", go: "async () => labChief('raven', 3)" }],
  ["Haggith", 40, { make: "() => ({})", go: "async () => labChief('eye', 3)" }],
  // The Amalgamation (Adrian's painting, 24 Nov): the fen's own, through meetBeast (the others already met, so it's the one)
  ["The Amalgamation", 20, { make: "() => ({})", go: "async () => { S.met = ['hulk', 'wader']; await meetBeast('fen', { forced: true }); return FOE.hp <= 0; }" }],
  // The Sowers' Table (Parts CXXXIV–CXL, NEWS v160): every fight in the chapter, as the chapter calls it
  ["Table: the Mudsire", 38, { make: "() => ({})", go: "async () => { S.tb = null; tb(); const real = hkFight; hkFight = async (F) => { window.__F = F; const b = F.before; F.before = async (st) => { window.__rounds = st.round; if (b) return b(st); }; try { return await real(F); } finally { hkFight = real; } }; await tbBeastFight('mudsire', { name: 'The Mudsire', hp: 34, reg: 'wetwood' }); return FOE.hp <= 0; }" }],
  ["Table: stair guard", 39, { make: "() => CONCERN({ name: \"The Concern's stair guard\", heads: 2, unit: 'guard|guards', reg: 'table' })", go: "async (F) => { " + ROUNDS + " await hkFight(F); }" }],
  ["Table: row-pruner", 39, { make: "() => ({})", go: "async () => { S.tb = null; tb(); const real = hkFight; hkFight = async (F) => { window.__F = F; const b = F.before; F.before = async (st) => { window.__rounds = st.round; if (b) return b(st); }; try { return await real(F); } finally { hkFight = real; } }; await tbBeastFight('rowpruner', { reg: 'table', hp: 26 }); return FOE.hp <= 0; }" }],
  ["Table: Concern in the hall", 40, { make: "() => CONCERN({ name: 'The Brindle Concern', heads: 3, unit: 'man|men', boss: false })", go: "async (F) => { " + ROUNDS + " await hkFight(F); }" }],
  ["Table: Wrayburn", 40, { make: "() => CONCERN({ name: 'Corisande Wrayburn', hp: 36, ac: 15, atk: 7, n: 1, s: 10, type: 'piercing', who: 'Wrayburn', whoShort: 'Wrayburn', person: true })", go: "async (F) => { " + ROUNDS + " await hkFight(F); }" }],
  ["Table: the Eldest Pruner", 40, { make: "() => ({})", go: "async () => { S.tb = null; tb(); const real = hkFight; hkFight = async (F) => { window.__F = F; const b = F.before; F.before = async (st) => { window.__rounds = st.round; if (b) return b(st); }; try { return await real(F); } finally { hkFight = real; } }; await tbEldest(); return FOE.hp <= 0; }" }],
  // A real road creature through meetBeast (for the Kithcaller, the taming: did it join?)
  ["Tame a road creature", 20, { make: "() => ({})", go: "async () => { const n0 = (S.cl && S.cl.kith || []).length; await meetBeast('glass', { forced: true }); return !S.cl || S.cl.k !== 'kith' || (S.cl.kith || []).length > n0 || FOE.hp <= 0; }" }],
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1200, height: 900 } });
  await ctx.addInitScript((seed) => { let s = seed >>> 0 || 1; Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; try { localStorage.clear(); } catch (e) {} }, SEED);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e.stack || e).slice(0, 300)));
  if (process.env.LABDBG) page.on("console", m => console.log("console:", m.text().slice(0, 20000)));
  const tmp = path.join(require("os").tmpdir(), "fight-lab-" + process.pid + ".html");
  fs.writeFileSync(tmp, labHtml());
  await page.goto(require("url").pathToFileURL(tmp).href);
  await page.waitForFunction(() => typeof window.__ev === "function");
  await page.evaluate(PAGE);
  await page.evaluate(() => window.__lab.install());
  if (process.env.LABDBG) await page.evaluate(() => { window.__dbg = true; });
  if (ISAK) await page.evaluate((v) => { window.__isak = v; }, ISAK);
  await page.evaluate(fs_lab_chief());
  const base = FROM ? JSON.parse(fs.readFileSync(FROM, "utf8")) : null;
  const results = [];
  console.log("policy: " + POLICY + ", " + N + " fights each" + (FROM ? ", hero from " + FROM : "") + (ISAK ? ", Isak at trust " + ISAK : ""));
  for (const [name, L0, sc] of SCEN) {
    if (ONLY && !ONLY.test(name)) continue;
    const L = LV ? +LV : L0;
    for (const k of CLS) {
      const r = await page.evaluate(([sc, L, k, n, pol, base]) => window.__lab.run(sc, L, k, n, pol, base), [sc, L, k, N, POLICY, base]);
      const m = r.n || 1;
      const row = { name, L, k, win: Math.round(100 * r.win / m), rounds: +(r.rounds / m).toFixed(1), lost: Math.round(100 * r.lost / m), dig: Math.round(100 * r.dig / m), axe: Math.round(100 * r.axe / m), err: r.err };
      results.push(row);
      console.log((name + " ").padEnd(28) + ("Lv" + L).padEnd(5) + k.padEnd(6) + " win " + String(row.win).padStart(3) + "%  rounds " + String(row.rounds).padStart(4) + "  lost " + String(row.lost).padStart(3) + "%  dig " + String(row.dig).padStart(3) + "%  axe " + String(row.axe).padStart(3) + "%" + (r.err ? "  ERR " + r.err + " " + (r.lastErr || "").replace(/\n\s*at [^\n]*/g, "") : ""));
    }
  }
  if (arg("json", null)) fs.writeFileSync(arg("json"), JSON.stringify(results, null, 1));
  if (errs.length) console.log("page errors:\n" + [...new Set(errs)].slice(0, 8).join("\n"));
  await browser.close(); fs.unlinkSync(tmp);
})();

// A compound and its chief (a fresh raid state), for rcLeader / meHaggith.
function fs_lab_chief() {
  return `window.__ev(${JSON.stringify(`window.labChief = async (kind, size) => {
    const C = { k: kind, size, place: "the lab yard", reg: 0, chief: { n: kind === "raven" ? "Tharen Ravendare" : kind === "eye" ? "Haggith" : "Garrow Pell" }, noticed: 0, jobs: ["kill"] };
    const B = { job: "kill", done: {}, alarm: true };
    if (kind === "eye") { S.me = meNew(); }
    rc();
    const real = hkFight; let FF = null;
    hkFight = async (F) => { FF = F; window.__F = F; const b = F.before; F.before = async (st) => { window.__rounds = st.round; if (b) return b(st); }; try { return await real(F); } finally { hkFight = real; } };
    const r = await rcLeader(C, B, false);
    return r !== "lost";
  }`)})`;
}
