// The Chair of the Eye (PR #165): sit you in Haggith's chair with every agent at the table, two missions
// of each kind already done (the third brings a relic), and two agents due home. Run on a save from the
// roads back, steering toward the chair:
//   node tools/playtest.js --from save.json --setup tools/playtest-setups/eye-command.js \
//     --prefer "^(The Mind's Eye|Open the tithe chest|Gather the tithe|Open a white door|Have a compound Seen|Send the ravens|Hold a Ladder|Send the Quiet|Send |Nobody's free|Not yet)"
if (!S.me) S.me = meNew();
const M = S.me;
Object.keys(M.lens).forEach(k => { M.lens[k] = "spared"; });
rc().raven = "spared";
const ok = meCmdN() === ME_CMD_NEED.length;
M.end = "command"; M.endAt = calDay();
M.cmd = { day: calDay(), dev: 80, ag: {}, done: { tithe: 2, door: 2, read: 2, ravens: 2, ladder: 2, quiet: 2 }, chest: { g: 40, cloth: 1, metal: 1, spore: 1 }, tAt: calDay() - 6, doors: {}, seen: [], trick: {}, relics: [], veil: null, log: [] };
["haggith", "clauneck", "tharen", "aulden", "mabry", "corse"].forEach(id => { M.cmd.ag[id] = { n: 4, away: null, rest: 0 }; });
M.cmd.ag.haggith.away = { m: "tithe", t: null, back: calDay() };
M.cmd.ag.clauneck.away = { m: "tithe", t: null, back: calDay() };
rc().raven = "sworn";
S.gear = S.gear || []; if (!hasGear("eyestone")) S.gear.push("eyestone");
renderSheet(); save();
"chair set up; all five spared counted: " + ok + "; towns " + townsOpen().length + "; compounds " + rcStanding().length;
