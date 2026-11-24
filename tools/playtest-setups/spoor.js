// The Long Spoor (NEWS v156): a Kithcaller who goes out on the spoor four times before the first
// chapter, then sees to the kith, leaves a pair at the kennel and comes back for the litter.
//   node tools/playtest.js --setup tools/playtest-setups/spoor.js --stop 6 --prefer "Set out|Take bait|Take an ash-cloak|Read the sign closer|Follow the first|Circle round|Hold out your hand|Leave a pair|Keep the first|Groom|Drill|Feed your kith|Point"
askCalling = async function () {
  S.cl = { k: "kith", b: {}, rk: clRank(), uses: 0, heard: [] };
  S.gear = S.gear || []; if (!S.gear.includes("kithwhistle")) S.gear.push("kithwhistle");
  S.coins += 200; S.cl.feed = 3; save(); renderSheet();
  const B = beastById("hound");
  await kithJoin(B, { nm: "Alpha" }); await kithJoin(B, { nm: "Beta" });
  for (let i = 0; i < 4; i++) await kthSpoor(["roots", "desert", "fen", "roots"][i], true);
  S.roam = true;
  await kthCare("hub");
  calPass(48); await kthTick();
  await kthCare("hub");
  S.roam = false;
  await kthCare("camp");
  window.__kth = JSON.stringify({ kith: S.cl.kith.map(k => [k.nm, k.id, k.g, k.v, k.bond, k.taught, (k.log || []).length, k.gen]), sp: S.cl.spoor, feed: S.cl.feed, html: kthCards().length });
  await mech("KTHTEST " + window.__kth);
};
"the calling card makes a Kithcaller who goes out on the spoor";
