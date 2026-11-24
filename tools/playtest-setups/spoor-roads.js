// The Long Spoor on the roads back: a new Kithcaller who is sent straight out onto the roads back (as if
// the story had ended after Mount Corrach) with two hounds and gold, so the bot can reach the hub's
// spoor, kith care and kennel. The story never starts; the roads-back menu runs instead.
//   node tools/playtest.js --setup tools/playtest-setups/spoor-roads.js --steps 1500 \
//     --prefer "Go out on the spoor|See to your kith|Set out|Bring it down|Offer your hand|Open his cages|Take one|Leave a pair|Keep the|Feed your kith|Groom|Drill"
askCalling = async function () {
  S.cl = { k: "kith", b: {}, rk: clRank(), uses: 0, heard: [] };
  S.gear = S.gear || []; if (!S.gear.includes("kithwhistle")) S.gear.push("kithwhistle");
  S.coins += 400; S.cl.feed = 4; S.part = 40; S.roamEnd = 40;
  kithList().push({ u: "kA", id: "hound", nm: "Ash", bond: 4, wins: 6, day: 0, g: { h: 4, f: 3, a: 3, w: 5 }, v: "pale" }, { u: "kB", id: "hound", nm: "Brack", bond: 3, wins: 4, day: 0 });
  save(); renderSheet();
  await roamHub();
};
"the calling card sends a Kithcaller straight out onto the roads back";
