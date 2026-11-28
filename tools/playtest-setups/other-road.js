// The Other Road on the roads back: a hero sent straight to the end of the story so far, at level 30, with six
// meetings with Merriel Haverick behind them, so the bot can reach the Daily Road, the Needle's Reckoning and the
// Second Descent from the roads-back menu (and then play on into Part I of the Second Descent).
//   node tools/playtest.js --setup tools/playtest-setups/other-road.js --steps 2500 \
//     --prefer "Walk the Daily Road|Meet Merriel|Draw$|Go down the labyrinth again|Go down again|Keen Edge"
{ const askCalling0 = askCalling;
askCalling = async function () {
  askCalling = askCalling0; // only once: a Second Descent asks for a calling the usual way
  S.cl = { k: "axe", b: {}, rk: clRank(), uses: 0, heard: [] };
  S.part = PARTS.length - 1; S.roamEnd = PARTS.length - 1; S.axe = true;
  S.lv = 30; S.maxHp = 110; S.hp = 110; S.coins += 900;
  S.rv = { n: 6, w: 3, l: 3, re: 0, edge: 2, met: {}, log: [], owes: 0, owe: 0, robbed: 1, back: 0, lied: 0, cheat: 0, helped: 1, left: 1, end: null, needle: false, cycle: 0, last: { how: "won", p: "the Dry Cistern", slug: "desert" } };
  save(); renderSheet();
  await roamHub();
};
}
"the calling card sends a hero straight to the roads back at the end of the story";
