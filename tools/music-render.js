#!/usr/bin/env node
// Renders the game's night music to audio files, without playing it, so a piece can be listened to
// (or measured) outside the game. Uses the same code the game plays from (SND's music, in index.html).
//
//   node tools/music-render.js [--ids a,b,c] [--secs 180] [--warp] [--out DIR] [--ogg]
//
//   --ids   which pieces (the ids in MUSIC); default all of them
//   --secs  how long each render is (default 180; a whole piece is 240-420)
//   --warp  play them as the Cascades warp them
//   --ogg   also write .ogg next to each .wav (needs ffmpeg on the path)
//   --list  print the pieces and stop
// Each render is written at full level (the in-game Soft setting plays it at about half this).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const arg = (k, def) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : def; };
const has = (k) => process.argv.includes("--" + k);
const secs = +arg("secs", 180), out = path.resolve(arg("out", "music-render"));
const SRC = path.join(__dirname, "..", "index.html");
const mark = "  // ---------- playthrough journal ----------";
const html = fs.readFileSync(SRC, "utf8").replace(mark, "  window.__snd = SND;\n" + mark);

function wav(chans, sr) {
  const n = chans[0].length, b = Buffer.alloc(44 + n * 4);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 4, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(chans[c][i] * 32767))), 44 + i * 4 + c * 2);
  return b;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const tmp = path.join(out, "game.html");
  fs.writeFileSync(tmp, html);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e)));
  await page.goto("file://" + tmp);
  const all = await page.evaluate(() => window.__snd.MUSIC.map(x => ({ id: x.id, name: x.name, pool: x.pool })));
  if (has("list")) { all.forEach(x => console.log(x.pool.padEnd(11), x.id.padEnd(18), x.name)); await browser.close(); return; }
  const ids = arg("ids", null) ? arg("ids").split(",") : all.map(x => x.id);
  for (const id of ids) {
    const t0 = Date.now();
    const r = await page.evaluate(async ([id, secs, warp]) => {
      const r = await window.__snd.musRender(id, secs, warp);
      if (!r) return null;
      const to = (a) => { const u = new Uint8Array(a.buffer); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
      return { name: r.name, len: r.len, sr: r.buf.sampleRate, ch: [to(r.buf.getChannelData(0)), to(r.buf.getChannelData(1))] };
    }, [id, secs, has("warp")]);
    if (!r) { console.log("no such piece:", id); continue; }
    const ch = r.ch.map(s => { const b = Buffer.from(s, "base64"); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); });
    let peak = 0, sum = 0;
    for (const c of ch) for (let i = 0; i < c.length; i++) { const v = Math.abs(c[i]); if (v > peak) peak = v; sum += v * v; }
    const rms = Math.sqrt(sum / (ch[0].length * 2));
    const f = path.join(out, id + (has("warp") ? "-warped" : "") + ".wav");
    fs.writeFileSync(f, wav(ch, r.sr));
    if (has("ogg")) execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", f, "-c:a", "libvorbis", "-q:a", "4", f.replace(/\.wav$/, ".ogg")]);
    console.log(id.padEnd(18), r.name.padEnd(28), "peak", (20 * Math.log10(peak + 1e-9)).toFixed(1), "dB  rms", (20 * Math.log10(rms + 1e-9)).toFixed(1), "dB ", ((Date.now() - t0) / 1000).toFixed(1) + "s");
  }
  if (errs.length) console.log("page errors:\n" + errs.join("\n"));
  await browser.close();
})();
