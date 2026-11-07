#!/usr/bin/env node
// Scripted playthrough for Labyrinth of Roots: a bot that plays index.html in a headless browser,
// clicking choices (it prefers ones it hasn't tried yet), rolling dice and poking at puzzles, and
// reports script errors, soft-locks (nothing to click for a while) and hangs (a frozen page, with
// the stack where it froze). Run it after any change to the game, and from a saved part to test
// one chapter.
//
//   npm i playwright   (once, anywhere on the path; it needs a Chromium)
//   node tools/playtest.js [--seed N] [--steps N] [--from save.json] [--stop PART] [--prefer REGEX] [--out DIR] [--file index.html]
//
//   --seed     the dice: the same seed plays the same game
//   --steps    how many clicks before it gives up (default 40000, a whole run is ~5000-10000)
//   --from     start from a saved game (a save-partN.json this tool wrote earlier)
//   --stop     stop when it reaches this part (0-based, as S.part counts)
//   --prefer   always pick a choice whose label matches, e.g. "Climb the bell rope|Leave the rafters"
//
// Output (in --out, default ./playtest-<seed>): log.txt (every click, with HP and the foe),
// save-partN.json at the start of each part, errors.txt, hang.txt, and final.json.
// Exit code: 0 finished or out of steps, 1 script errors, 2 soft-lock, 3 hang.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const arg = (k, def) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : def; };
const seed = +arg("seed", 1), MAX = +arg("steps", 40000), stopPart = +arg("stop", 9999);
const from = arg("from", null), prefer = arg("prefer", null) ? new RegExp(arg("prefer")) : null;
const SRC = path.resolve(arg("file", path.join(__dirname, "..", "index.html")));
const out = path.resolve(arg("out", "playtest-" + seed));
fs.mkdirSync(out, { recursive: true });

// Expose the game's state to the bot (the game keeps it inside a closure).
const html = fs.readFileSync(SRC, "utf8").replace("let S = fresh();", "let S = fresh(); window.__g = { get S() { return S; }, get FOE() { return FOE; }, get J() { return J; } };");
if (!html.includes("window.__g")) { console.error("Couldn't find `let S = fresh();` in " + SRC); process.exit(1); }
const gamePath = path.join(out, "game.html");
fs.writeFileSync(gamePath, html);

// The buttons the bot may press: those in the newest block of the story with anything to press.
const POOL = `(() => {
  const story = document.getElementById("story");
  const ok = (b) => !b.disabled && b.offsetParent !== null && !b.closest("[hidden]") && !b.classList.contains("map-link") && !b.classList.contains("taken") && b.style.pointerEvents !== "none";
  const dlg = [...document.querySelectorAll("dialog[open]")];
  let pool = dlg.length ? [...dlg[dlg.length - 1].querySelectorAll("button, input[type=submit]")].filter(ok) : [];
  if (!pool.length) {
    const all = [...story.querySelectorAll("button, input[type=submit]")].filter(ok);
    if (all.length) { let g = all[all.length - 1]; while (g.parentElement && g.parentElement !== story) g = g.parentElement; pool = all.filter(b => g.contains(b)); }
  }
  return pool;
})()`;
const SKIP = /Start over|Tap again|Erase|New descent|Walk the pathway again|Saves|Skip recaps|Stand down|Accept the result/i;
const MEH = /Swap weapon|harness · free|second swap|from the pack|Never mind|Open your|Close$/;
const EXIT = /leave|move on|carry on|go on|onward|continue|set out|press on|head|done|enough|walk on|go down|close/i;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1200, height: 900 } });
  await ctx.addInitScript(([seed, save]) => {
    let s = seed >>> 0 || 1;
    Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    if (!sessionStorage.getItem("__pt")) {
      localStorage.clear();
      if (save) { localStorage.setItem("labyrinth-of-roots-v1", save); localStorage.setItem("labyrinth-of-roots-recap-off", "1"); }
      sessionStorage.setItem("__pt", "1");
    }
  }, [seed, from ? fs.readFileSync(from, "utf8") : null]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => { errors.push(String(e.stack || e)); console.log("PAGE ERROR", String(e.stack || e).slice(0, 600)); });
  page.on("console", m => { if (m.type() === "error") { errors.push("console: " + m.text()); console.log("CONSOLE ERROR", m.text().slice(0, 300)); } });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Debugger.enable");
  const finish = async (code) => {
    try { fs.writeFileSync(path.join(out, "final.json"), JSON.stringify(await page.evaluate(() => ({ S: window.__g.S, J: window.__g.J })), null, 1)); } catch (e) {}
    fs.writeFileSync(path.join(out, "errors.txt"), errors.join("\n\n"));
    await browser.close();
    process.exit(code || (errors.length ? 1 : 0));
  };
  // A page that doesn't answer for 30 seconds is stuck in a loop: pause it and record where.
  async function guard(p, what) {
    let t; const v = await Promise.race([p, new Promise(r => { t = setTimeout(() => r("__HANG__"), 30000); })]); clearTimeout(t);
    if (v !== "__HANG__") return v;
    const paused = new Promise(r => cdp.once("Debugger.paused", r));
    await cdp.send("Debugger.pause");
    const frames = (await paused).callFrames.slice(0, 12).map(f => (f.functionName || "(anonymous)") + " @ line " + (f.location.lineNumber + 1));
    console.log("HANG during " + what + "\n" + frames.join("\n"));
    fs.writeFileSync(path.join(out, "hang.txt"), frames.join("\n"));
    process.exit(3);
  }

  await page.goto("file://" + gamePath);
  await page.click("#enter-btn");
  await page.waitForTimeout(100);
  await page.evaluate((from) => { const b = from ? document.querySelector("#slots .slot .primary") : document.getElementById("beginBtn"); b.click(); }, !!from);
  const log = fs.createWriteStream(path.join(out, "log.txt"));
  const counts = {};
  let lastPart = -1, idle = 0, partSteps = 0;
  for (let step = 0; step < MAX; step++) {
    const r = await guard(page.evaluate((POOL) => {
      const pool = eval(POOL), g = window.__g, S = g.S, story = document.getElementById("story");
      const name = document.getElementById("nameIn");
      if (name && !name.disabled && !name.value) name.value = "Tester";
      return { labels: pool.map(b => (b.innerText || b.value || "").trim().replace(/\s+/g, " ").slice(0, 90)), part: S.part, hp: S.hp, max: S.maxHp, lv: S.lv, coins: S.coins,
        foe: g.FOE.on ? g.FOE.name + " " + g.FOE.hp + "/" + g.FOE.max : "", tail: (story.lastElementChild ? story.lastElementChild.innerText : "").slice(-400) };
    }, POOL), "a look at the page");
    if (r.part !== lastPart) {
      fs.writeFileSync(path.join(out, "save-part" + r.part + ".json"), await page.evaluate(() => JSON.stringify(window.__g.S)));
      console.log("Part " + (r.part + 1) + " (S.part " + r.part + ") at step " + step + " · HP " + r.hp + "/" + r.max + " · Lv " + r.lv + " · " + r.coins + " gold");
      lastPart = r.part; partSteps = 0;
      if (r.part >= stopPart) break;
    }
    partSteps++;
    // Pronoun tokens ({he}, {g:a|b|c}) should never reach the page unresolved.
    const tok = /\{(g:[^{}]*|[Hh](?:e|im|is|ers|imself|e's|e'd|e'll))\}/.exec(r.tail + " " + r.labels.join(" "));
    if (tok) { console.log("UNRESOLVED TOKEN " + tok[0] + " at S.part " + r.part + ": " + r.tail.slice(-200)); errors.push("token " + tok[0]); }
    if (!r.labels.length) {
      // 10 seconds: the Thrice-Seen Man's last round (7 swaps) runs just over 6 before you can strike.
      if (++idle > 100) { console.log("SOFT-LOCK at S.part " + r.part + ": nothing to press for 10 seconds.\n" + r.tail); log.write("SOFT-LOCK\n" + r.tail + "\n"); return finish(2); }
      await page.waitForTimeout(100); continue;
    }
    idle = 0;
    let idx = r.labels.map((l, i) => i).filter(i => !SKIP.test(r.labels[i]));
    if (!idx.length) idx = r.labels.map((l, i) => i);
    if (idx.some(i => !MEH.test(r.labels[i])) && Math.random() < 0.92) idx = idx.filter(i => !MEH.test(r.labels[i]));
    const key = (l) => r.part + "|" + l.replace(/\d+/g, "#");
    let pick = prefer ? idx.find(i => prefer.test(r.labels[i])) : undefined;
    if (pick === undefined) {
      const exits = idx.filter(i => EXIT.test(r.labels[i]));
      if (partSteps > 1500 && exits.length && Math.random() < 0.7) pick = exits[Math.floor(Math.random() * exits.length)];
      else {
        const least = Math.min(...idx.map(i => counts[key(r.labels[i])] || 0));
        const fresh = idx.filter(i => (counts[key(r.labels[i])] || 0) <= least + 1);
        pick = Math.random() < 0.8 ? fresh[Math.floor(Math.random() * fresh.length)] : idx[Math.floor(Math.random() * idx.length)];
      }
    }
    counts[key(r.labels[pick])] = (counts[key(r.labels[pick])] || 0) + 1;
    log.write(step + " P" + r.part + " hp" + r.hp + "/" + r.max + (r.foe ? " [" + r.foe + "]" : "") + " > " + r.labels[pick] + "   {" + r.labels.join(" | ") + "}\n");
    await guard(page.evaluate(([POOL, i]) => { const b = eval(POOL)[i]; if (b) b.click(); }, [POOL, pick]), "a click on \"" + r.labels[pick] + "\"");
    await page.waitForTimeout(15);
  }
  console.log("Done: " + errors.length + " script error(s).");
  await finish();
})();
