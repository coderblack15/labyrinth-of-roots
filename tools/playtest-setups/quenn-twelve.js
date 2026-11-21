// Ebba Quenn's Twelve (PR #166): put all twelve in the Bag and wield one, so every fight on the roads
// back runs through life steal, poison, withering and lunar damage, and the bot swaps between them.
//   node tools/playtest.js --from save.json --setup tools/playtest-setups/quenn-twelve.js
const Q = qt(), got = [];
QT_ORDER.forEach(id => {
  if (Q.got.includes(id) || qtHas(id)) return;
  const D = QT[id];
  S.lootN = (S.lootN || 0) + 1;
  gainLoot(Object.assign({ id: S.lootN, uid: newUid(), qt: id, icon: ARM_BASES[D.L.b].icon, pic: "qt_" + id, keep: true, lore: D.lore }, D.L, { tr: D.L.tr.slice(), ac: D.L.ac.slice() }));
  Q.got.push(id); got.push("L" + S.lootN);
});
if (got.length) wield(got[0]);
renderSheet(); save();
"gave " + got.length + " of the Twelve; wielding " + wpnKey() + " (" + wDef(wpnKey()).name + ")";
