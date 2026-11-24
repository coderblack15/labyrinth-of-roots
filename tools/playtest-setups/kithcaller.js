// The Kithcaller (NEWS v155): start a new game as a Kithcaller without the bot wandering the calling card,
// so a run goes through the calling's six scenes and tames what it can on the road.
//   node tools/playtest.js --setup tools/playtest-setups/kithcaller.js --prefer "Offer your hand|Take it with you|Unchain them|Stand up and speak|Go down after them|teaching the gulls"
askCalling = async function () {
  S.cl = { k: "kith", b: {}, rk: clRank(), uses: 0, heard: [] };
  S.gear = S.gear || []; if (!S.gear.includes("kithwhistle")) S.gear.push("kithwhistle");
  S.dress = (S.dress || 0) + 2;
  save(); renderSheet();
};
"the calling card now makes a Kithcaller";
