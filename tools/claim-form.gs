/**
 * Labyrinth of Roots: reward claims, answered automatically.
 *
 * A Google Apps Script for the claim form. It lives in the form's own script editor.
 * When a player sends a code through the form, it:
 *   1. checks the code's seal (the same recipe the game uses, with the key kept in Script Properties),
 *   2. refuses a code, or a player and milestone, that has already been claimed,
 *   3. gives the reward: a name in the Credits sheet (Siege of Rahdaria), the next unused itch.io key
 *      from the Keys sheet (Twinbreaker), or the download links for the rewards the game hands out itself,
 *   4. emails the player, and writes every claim to the Claims sheet.
 * Claims that look too fast (fewer hours played than a real player needs) are held for Adrian to check.
 *
 * Setup steps are in tools/claim-form-setup.md. Run setup() once from the editor.
 * Nothing secret is written in this file: the key is a Script Property named RW_KEY.
 */

// Same order as REWARDS in index.html. kind: "credit" = name in the credits, "key" = itch.io key,
// "file" = the game already hands it out (the email repeats the links). min = fewest hours a real
// player needs, roughly; a claim under it is held for a look.
var MILESTONES = [
  { name: "Into the Roots", what: "finishing The Labyrinth of Roots", kind: "file", min: 0,
    links: [["Desktop wallpaper", "world-map-wallpaper-desktop.jpg"], ["Phone wallpaper", "world-map-wallpaper-phone.jpg"]] },
  { name: "Rahdaria Stands", what: "finishing The Siege of Rahdaria", kind: "credit", min: 3 },
  { name: "Drawn Back In", what: "finishing The Unmapped", kind: "file", min: 6,
    links: [["Art pack", "labyrinth-of-roots-art-pack.zip"]] },
  { name: "Ringwarden", what: "reaching level 50", kind: "file", min: 8,
    links: [["The Fiftieth Ring (Relicsong card)", "relicsong-card-the-fiftieth-ring.png"]] },
  { name: "Twinbreaker", what: "beating the Hollow Twin in Rimehold", kind: "key", min: 8 }
];
var REWARD_BASE = "https://coderblack15.github.io/labyrinth-of-roots/rewards/";
var GAME_URL = "https://coderblack15.github.io/labyrinth-of-roots/";
var B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
var EPOCH = Date.UTC(2026, 0, 1);

// ---------- one-time setup ----------
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty("RW_KEY")) throw new Error("Add the Script Property RW_KEY first (Project Settings → Script Properties). See the setup steps.");
  var id = props.getProperty("SHEET_ID"), ss;
  if (id) ss = SpreadsheetApp.openById(id);
  else {
    ss = SpreadsheetApp.create("Labyrinth of Roots rewards");
    props.setProperty("SHEET_ID", ss.getId());
  }
  sheet_(ss, "Claims", ["When", "Code", "Milestone", "Wayfarer", "Earned", "Hours", "Name", "Email", "Result", "Key given"]);
  sheet_(ss, "Credits", ["Name", "Milestone", "When"]);
  sheet_(ss, "Keys", ["itch.io key or link (paste one per row)", "Given to (code)", "When"]);
  var def = ss.getSheetByName("Sheet1");
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  var form = FormApp.getActiveForm();
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === "onClaim"; });
  if (!has) ScriptApp.newTrigger("onClaim").forForm(form).onFormSubmit().create();
  Logger.log("Ready. Your rewards sheet: " + ss.getUrl());
}
function sheet_(ss, name, head) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) { sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight("bold"); }
  return sh;
}

// ---------- the form trigger ----------
function onClaim(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { handle_(e.response); } finally { lock.releaseLock(); }
}

function handle_(response) {
  var a = answers_(response);
  var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("SHEET_ID"));
  var claims = ss.getSheetByName("Claims");
  var when = new Date();
  var r = verifyCode(a.code, PropertiesService.getScriptProperties().getProperty("RW_KEY"), hmacBytes_);
  var log = function (m, result, key) {
    claims.appendRow([when, r.code || a.code, m ? m.name : "", r.wid || "", r.earned || "", r.hours === undefined ? "" : r.hours, a.name, a.email, result, key || ""]);
  };
  if (!r.ok) {
    log(null, "Refused: " + r.why);
    mail_(a.email, "Your Labyrinth of Roots code", "<p>That code didn't check out: " + esc_(r.why) +
      "</p><p>Copy it again from the <b>Reward codes</b> page in your journal (the Copy button helps) and send it once more.</p>");
    return;
  }
  var m = MILESTONES[r.idx];
  if (!m) { log(null, "Held: unknown milestone " + r.idx); tellAdrian_("A code for a milestone this script doesn't know yet (" + r.idx + "): " + r.code); return; }
  // Repeats: the same code, or the same player (browser) and milestone.
  var rows = claims.getDataRange().getValues().slice(1);
  var dupe = rows.some(function (x) { return (x[1] === r.code || (x[3] === r.wid && x[2] === m.name)) && /^(Given|Held)/.test(String(x[8])); });
  if (dupe) {
    log(m, "Refused: already claimed");
    mail_(a.email, "Your Labyrinth of Roots code", "<p>The reward for <b>" + esc_(m.name) + "</b> has already been claimed with this code. Each one can be claimed once.</p>");
    return;
  }
  if (r.hours < m.min || r.future) {
    log(m, "Held: " + (r.future ? "earned on a future date" : "only " + r.hours + " hours played") + ", check it");
    mail_(a.email, "Your Labyrinth of Roots code", "<p>Thanks! Your code for <b>" + esc_(m.name) + "</b> is in. Adrian will look it over and send your reward soon.</p>");
    tellAdrian_("A claim was held for a look: " + m.name + ", code " + r.code + ", " + r.hours + " hours played, from " + a.name + " <" + a.email + ">. If it's fine, give the reward by hand and change its Result to Given.");
    return;
  }
  if (m.kind === "credit") {
    if (!a.name) { log(m, "Refused: no name"); mail_(a.email, "Your Labyrinth of Roots code", "<p>Your code is good, but the form didn't have a name for the credits. Send it again with the name you'd like to be known by.</p>"); return; }
    ss.getSheetByName("Credits").appendRow([a.name, m.name, when]);
    log(m, "Given: credits");
    mail_(a.email, "You're in the credits of Labyrinth of Roots", "<p>Thank you for holding Rahdaria. <b>" + esc_(a.name) +
      "</b> goes into the game's credits, in the list of Wayfarers, with the next update. Look for it on the <b>Credits</b> page of your journal.</p>");
    tellAdrian_("New name for the credits: " + a.name + " (" + m.name + "). Add it to WAYFARERS in index.html, or ask Claude to.");
    return;
  }
  if (m.kind === "key") {
    var keys = ss.getSheetByName("Keys"), kv = keys.getDataRange().getValues(), row = -1;
    for (var i = 1; i < kv.length; i++) if (kv[i][0] && !kv[i][1]) { row = i; break; }
    if (row < 0) {
      log(m, "Held: no keys left");
      mail_(a.email, "Your Labyrinth of Roots code", "<p>Your Twinbreaker code is good. The keys for friends have run out for the moment; Adrian will send yours soon.</p>");
      tellAdrian_("The Keys sheet is empty, and " + a.name + " <" + a.email + "> is waiting for a Twinbreaker key (code " + r.code + "). Paste more keys into the Keys sheet and send one by hand.");
      return;
    }
    var key = String(kv[row][0]);
    keys.getRange(row + 1, 2, 1, 2).setValues([[r.code, when]]);
    log(m, "Given: key", key);
    mail_(a.email, "A Labyrinth of Roots key for a friend", "<p>You beat the Hollow Twin. Here is a key for the full game, to give to a friend:</p><p style=\"font-size:1.2em\"><b>" + esc_(key) +
      "</b></p><p>It works once. Open it on the game's itch.io page: <a href=\"https://coderblack15.itch.io/labyrinth-of-roots\">coderblack15.itch.io/labyrinth-of-roots</a></p>");
    return;
  }
  // File rewards: the game already shows the download buttons. Send the links anyway.
  log(m, "Given: links");
  mail_(a.email, "Your Labyrinth of Roots reward", "<p>Your reward for <b>" + esc_(m.name) + "</b> (" + esc_(m.what) + ") downloads straight from the game, on the <b>Reward codes</b> page of your journal. Here are the links too:</p><ul>" +
    m.links.map(function (l) { return '<li><a href="' + REWARD_BASE + l[1] + '">' + esc_(l[0]) + "</a></li>"; }).join("") + "</ul>");
}

// Finds the code, name and email in a form response by question title, so the form's wording can change.
function answers_(response) {
  var a = { code: "", name: "", email: response.getRespondentEmail ? (response.getRespondentEmail() || "") : "" };
  response.getItemResponses().forEach(function (ir) {
    var t = ir.getItem().getTitle().toLowerCase(), v = String(ir.getResponse() || "").trim();
    if (/code/.test(t)) a.code = v;
    else if (/mail/.test(t)) a.email = v || a.email;
    else if (/name|credit/.test(t)) a.name = v.slice(0, 60);
  });
  return a;
}

// ---------- the seal (same recipe as the game and tools/reward-codes.js) ----------
// hmac(keyString, bytes 0-255) must return the HMAC-SHA256 as bytes 0-255.
function verifyCode(raw, key, hmac) {
  var s = String(raw || "").toUpperCase().replace(/^\s*LR/, "").replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (!s) return { ok: false, why: "the form had no code in it." };
  if (s.length !== 20) return { ok: false, why: "a code has 20 letters and digits after LR, and this one has " + s.length + "." };
  var bits = "";
  for (var i = 0; i < 20; i++) {
    var v = B32.indexOf(s.charAt(i));
    if (v < 0) return { ok: false, why: "\"" + s.charAt(i) + "\" never appears in a code." };
    bits += ("00000" + v.toString(2)).slice(-5);
  }
  if (bits.slice(96) !== "0000") return { ok: false, why: "the last letter is wrong." };
  var b = [];
  for (i = 0; i < 12; i++) b.push(parseInt(bits.slice(i * 8, i * 8 + 8), 2));
  var sig = hmac(key, b.slice(0, 8));
  for (i = 0; i < 4; i++) if (sig[i] !== b[8 + i]) return { ok: false, why: "it doesn't match the game's seal, so a letter is probably mistyped." };
  var wid = ((b[1] << 24) >>> 0) + (b[2] << 16) + (b[3] << 8) + b[4];
  var day = (b[5] << 8) + b[6], earned = new Date(EPOCH + day * 86400000);
  return { ok: true, idx: b[0] & 63, code: "LR-" + s.match(/.{5}/g).join("-"), wid: ("0000000" + wid.toString(16)).slice(-8).toUpperCase(),
    earned: earned.toISOString().slice(0, 10), future: earned.getTime() > Date.now() + 86400000, hours: b[7] };
}
function hmacBytes_(key, bytes) {
  var signed = bytes.map(function (x) { return x > 127 ? x - 256 : x; });
  return Utilities.computeHmacSha256Signature(signed, Utilities.newBlob(key).getBytes()).map(function (x) { return x & 255; });
}

// ---------- mail ----------
function mail_(to, subject, html) {
  if (!to) return;
  MailApp.sendEmail({ to: to, subject: subject, name: "Labyrinth of Roots",
    htmlBody: html + '<p style="color:#777">Labyrinth of Roots, by Adrian Blackshire and Claude · <a href="' + GAME_URL + '">play it here</a></p>' });
}
function tellAdrian_(text) {
  var me = Session.getEffectiveUser().getEmail();
  if (me) MailApp.sendEmail(me, "Labyrinth of Roots: a reward claim needs you", text);
}
function esc_(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

if (typeof module !== "undefined") module.exports = { verifyCode: verifyCode, MILESTONES: MILESTONES };
