// The Sowers' Table (NEWS v160): a level-38 Axe-Sworn who has finished the Vell cases, sent straight into
// Part CXXXIV with the Lost Hand and the Heart already behind them. The calling card starts the chapter.
//   node tools/playtest.js --setup tools/playtest-setups/sowers-table.js --steps 6000
// Change TB_LH / TB_HT below to try Gerrand as the Concern's factor ("reeve") or your quartermaster ("amber").
const TB_LH = "amber", TB_HT = "refuse";
askCalling = async function () {
  S.cl = { k: "axe", b: {}, rk: clRank(), uses: 0, heard: [] };
  S.lv = 38; S.maxHp = 150; S.hp = 150; S.coins += 600; S.axeSpent = true;
  S.lh = { on: true, done: true, side: "friend", gang: ["sable", "ysolde"], help: {}, gerrand: TB_LH, land: "give", boat: true, accused: "ossel", right: true, grell: "pick", cage: "safe" };
  delete S.ht; Object.assign(ht(), { on: true, done: true, end: TB_HT });
  S.dc = { on: true, done: true, saint: "caught", cases: {}, rep: {}, seen: [], halves: [] };
  S.part = 133;
  save(); renderSheet();
};
"the calling card sends a level-38 Axe-Sworn into Part CXXXIV";
