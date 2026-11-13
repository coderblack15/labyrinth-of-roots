#!/usr/bin/env node
// Check a reward code from the game, or make one for testing.
//   node tools/reward-codes.js LR-XXXXX-XXXXX-XXXXX-XXXXX
//   node tools/reward-codes.js --make <milestone 0-63> [wid] [hours]
// It reads RW_KEY and the REWARDS names from index.html, so it always matches the game.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const src = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const KEY = eval(/const RW_KEY = ([^;]+);/.exec(src)[1]);
const NAMES = [...src.slice(src.indexOf("const REWARDS = ["), src.indexOf("const rwCh =")).matchAll(/\{ id: "(\w+)", name: "([^"]+)"/g)].map(m => m[2]);
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ", EPOCH = Date.UTC(2026, 0, 1);
const seal = (b) => crypto.createHmac("sha256", KEY).update(b.subarray(0, 8)).digest().subarray(0, 4);
function make(idx, wid, day, hours) {
  const b = Buffer.alloc(12);
  b[0] = 64 | idx; b.writeUInt32BE(wid >>> 0, 1); b.writeUInt16BE(day, 5); b[7] = Math.min(255, hours);
  seal(b).copy(b, 8);
  const bits = [...b].map(x => x.toString(2).padStart(8, "0")).join("");
  let s = ""; for (let i = 0; i < 96; i += 5) s += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return "LR-" + s.match(/.{5}/g).join("-");
}
function check(code) {
  const s = code.toUpperCase().replace(/^LR/, "").replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (s.length !== 20) return { ok: false, why: "A code has 20 letters after LR." };
  let bits = ""; for (const ch of s) { const v = B32.indexOf(ch); if (v < 0) return { ok: false, why: "Not a code letter: " + ch }; bits += v.toString(2).padStart(5, "0"); }
  if (bits.slice(96) !== "0000") return { ok: false, why: "The last letter is wrong." };
  const b = Buffer.alloc(12); for (let i = 0; i < 12; i++) b[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  if (!seal(b).equals(b.subarray(8))) return { ok: false, why: "The seal doesn't match: mistyped, or not made by the game." };
  const idx = b[0] & 63;
  return { ok: true, version: b[0] >> 6, milestone: NAMES[idx] || "Unknown milestone " + idx, wayfarer: b.readUInt32BE(1).toString(16).padStart(8, "0"),
    earned: new Date(EPOCH + b.readUInt16BE(5) * 86400000).toISOString().slice(0, 10), hoursPlayed: b[7] };
}
const a = process.argv.slice(2);
if (a[0] === "--make") console.log(make(+a[1] || 0, a[2] ? parseInt(a[2], 16) : 0x12345678, Math.floor((Date.now() - EPOCH) / 86400000), +a[3] || 0));
else if (a[0]) console.log(check(a[0]));
else console.log("Usage: node tools/reward-codes.js <code> | --make <n> [wid hex] [hours]");
module.exports = { make, check };
