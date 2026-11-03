# Labyrinth of Roots

**Created by: Adrian Blackshire and Claude**

## Introduction

Far below an old ceremonial road lies a labyrinth grown from living roots, carved with druidic runes and guarded long ago by a warden named Vaelric. Travelers say nothing that goes down there comes back up. You are a lone adventurer with a pack, a belt knife and a flint, and you are going down anyway.

Labyrinth of Roots is a choose-and-roll dark fantasy adventure in sixty-two parts. Walk the ceremonial pathway, descend past the druid gate, take up Vaelric's gem-set axe, and face Ryytaa the Ender in her nest before climbing out into the desert, where a crew of thieves called the Hollow Hands wants your axe for one impossible heist, and on into the Hushfen, a drowned swamp ruled by a robber baron in violet, and out across its lake to Carrowmere, the drowned castle, where a knight with a lantern has guarded a stolen treasury for a hundred years, and down the road to Lastwell, a dead village where something you can't see drinks people dry, and hunts you while you scrape together water, food, rune mines and caltrops to survive it, and back to Sulmara, the Glass City, where you stand trial before the Glass Judge with a rogue named Tyra Quillon at your side, and finally north to the valley under Mount Corrach, where the Hesk, a tall, shelled people who sleep seventeen years at a time, have woken early, carrying a fungus called the Pale Bloom that Vaelric's axe can't save you from, and then down the deep stair under the mountain to Ammaret, the buried city under Sulmara, where it has been noon for six hundred years, the Lidless sell their shadows to sleep, and the Blackjackal is hiding inside one of four people, and at last back home to the labyrinth, which has heaved up out of the sand, and down past the bottom of it to Kedge, a town hung on chains over a moon that fell a thousand years ago and is waking up, and then west to the sea, to Rahdaria, a city of hanging gardens besieged by a people who came up out of the bottom of it, where you turn detective for a starving city and then break the blockade.

## How to play

1. Read each scene, then pick what you do next.
2. When a check comes up, click to roll the d20. Your bonus is added, and you need to meet or beat the number shown.
3. Keep an eye on your character sheet. It tracks your HP, armor class, gold and everything you find.

## Running it

Open `index.html` in any browser. It's a single self-contained page with no build step.

To play it online, turn on GitHub Pages: **Settings → Pages → Deploy from a branch → `main` / root**. The game will then be live at `https://coderblack15.github.io/labyrinth-of-roots/`.

## Free demo

`demo.html` is a free demo that plays Parts I–X and then shows an end card pointing to the full game. It's generated from `index.html`, so rebuild it after any change to the game:

```
python3 tools/build-demo.py --parts 10 --full-url https://coderblack15.itch.io/labyrinth-of-roots
```

`TIP_URL` (the Support the creator link) and `FULL_URL` (where the demo's "Play the full game" button goes) are set near the top of the script in `index.html`.

## What's in the game

- **A WARNING screen** that greets every visitor. Press *ENTER* to go in.
- **A landing page** that sets the mood before you play. *Enter the Labyrinth* and *Play Now* take you straight to the start of the game.
- **Choices** at key moments, such as paying the hooded strangers, fighting or fleeing the vine horror, and bracing your shield against the spiders.
- **Clickable d20 rolls** for every check: Perception, Survival, Dexterity checks, Investigation (DC 12), the Dexterity save (DC 13), attack rolls, and the Shield Slam Strength contest against Ryytaa. Success and failure each lead to their own text.
- **An enemy health meter** on the character sheet in every fight, from Ryytaa the Ender to the Wringer. Mob fights (guards, slugs) count heads instead of HP.
- **Combat combos**: each hit you land in a row adds +1 to your next attack (up to +2), the second hit deals +2 damage, and the third is a **Rootbreaker** that doubles your damage dice (or cuts through into a second foe in a mob fight) and spends the combo. A miss breaks the chain. Spells and gem bursts that land keep it alive.
- **A character sheet** that tracks HP, armor class, gold, and inventory: the torch, Vaelric's axe (its gem power works once per encounter), the pauldron shield, and the spellbooks you choose in the Library of Roots.
- **Survival in Lastwell** (Parts XXIII–XXVIII): water, food, five levels of exhaustion, ooze sickness, and the Hunt clock that brings the unseen Wringer down on you when you make noise.
- **Snare rune mines** (fire, poison and frost), each placed with an Arcana roll, that combine and that the Wringer learns to shrug off. You can scribe more scrolls with ooze ink, and forge **caltrops** from scrap iron once you find Hobb's book.
- **Four puzzles**: the rune-sealed cellar, scribing a rune from memory, crossing the rotten rafters of the spire, and the well-keeper's four-ring lock.
- **A recovery phase** in the belfry, where a Scroll of Revelation shows you the well-keeper's secret food stash.
- **Healing** in Lastwell: Draughts of Mending (+10 HP), Elixirs of Health (+20 HP), and gravemoss poultices from the old graves.
- **The Glass Assize** (Parts XXIX–XXXIV): two days in Sulmara with a Heat clock, disguises, the Vitreous Library's skill books (Lockcraft, Jurisprudence, Cardsharp, Streetwise, and the crafting skills Glasswright and Herbcraft), the Cracked Lantern inn, the Slag & Siphon bar (drinking contest and the High Glass card game), escort missions, a trial before a twelve-juror jury, and the sun-mirror at noon.
- **Your own name**: name your adventurer when you begin (each save slot keeps its own), and Sable, the clerks, the Glass Judge's warrant and others will use it.
- **Your company**: Burr, a dog who follows you out of the labyrinth, and Tyra Quillon are friends with a bond of 0 to 5 that grows with every third fight won together and an evening at camp after each chapter. Each step unlocks more help: a bite or a knife in fights, a blocked blow, a bonus on checks. Three sellswords (Odran Vey's shield, Wenna Strake's crossbow and Mother Caddock's stitching) can be hired at the start of most chapters, one at a time, and one who serves three chapters or camp evenings swears to you and travels for free. Companions soften foes up and catch blows, but the killing blow is always yours. The Hushfen lets one walker in, so your company waits outside it.
- **Tyra Quillon**, a laid-back rogue companion who runs errands, collects keys and cats, does odd jobs with you, and might fall for you.
- **More puzzles**: rebuilding a shattered witness pane, steering sunlight through mirror rigs, breaking a two-dial cipher, and cross-examining a lying witness.
- **The Corrach Three** (Parts XXXV–XLI): three days in the mining town of Ashgate, then the Singing Door, a snaking tunnel, and Thrumhold, the Hesk fortress in a 200-foot cavern of carved stone homes.
- **The Pale Bloom**, a disease that stops Vaelric's axe from keeping you on your feet. While you carry it, 0 HP means death: you wake at Vellum Rest, lose half your purse, and replay the part. Saltroot tea, firebaths, a saltroot mask and moltwater fight it.
- **Staying alive** in the Hesk fights: **Evade** gives up your swing for a 65% chance to slip every attack that round, and Sister Wren teaches **Field Mending** (first aid, 10 gold, also sold at the Vitreous Library) to bind your wounds twice a fight and patch up after every win.
- **Quick hands**: in any fight, every second turn you can use an item on top of your move (the Use an item button on the fight prompt, or Use on the item in your pack). Every use is a timing catch: stop the marker in the gold for a clean use, on the bright notch for a perfect one (half again as strong, and ready a turn sooner), or fumble it for half. Wait past your two turns and the notch gets wider. Healing is a quick gulp mid-fight (8 HP from a Draught, 15 from an Elixir); other items blind foes (the lens, a fistful of cullet), break a Hesk blade-song (a shatter flask), push back the Bloom (saltroot tea) or ward off the next Bloom save (raw saltroot).
- **Spoils**: every fight you come through leaves a leaf of a Scroll of Acquisition; four leaves bind into a scroll that teaches you a skill of your choice. Every foe you put down leaves salvage (cloth scraps, scrap metal, and Bloom spore sacks from the Hesk) that a tinker buys at the start of the next part.
- **Trapcraft**: schematics turn up in the spoils of fights (the first one teaches you the skill; so does Hobb's book, the Scroll of Acquisition, or *A Trapper's Hundred Knots* in the Vitreous Library). Once you know it, you keep your salvage metal and cloth for parts. **Small** traps (Jawbite, Tanglewire) are thrown mid-fight with quick hands; **medium** traps (Swing-Log, Stake Pit) are set before a road fight; **huge** twelve-foot traps (the Gallows Drop, the Thresher Wheel) are raised at build sites a chapter offers, against a great foe or a column of troops. Building is a rig puzzle (study the schematic, fit the parts in order), and a design you've built twice you know by heart.
- **Innovation**: you earn *insights* the hard way, from springing traps, bringing things down, failed builds, and your first fight in each kind of weather. Spend them at your trapper's kit to combine two schematics into a design of your own (Bramble Jaw, Pendulum Pit, the Rootcage) or to learn Load Paths, Weather Eye or Quick Set.
- **Weather and tremors**: roads roll rain, fog, high wind, thunderstorms, blazing heat or snow by region, each with one plain effect on fights, and you can see it fall. Underground roads can shake instead: the ground heaves mid-fight, and loose stone comes down more easily.
- **Sabotage**: some roads have something worth bringing down (a dead elm, a kiln chimney, a hanging tooth of moonstone). Hunt for its keystone (each wrong stone creaks out how far away the keystone is), then let it go when your foe is under it. The **Undermining** skill makes it easier.
- **The Reckoning Board**: bounties paid dead or alive (Wat Gorse, Corvin Dray the Thrice-Seen, the raid-leader Skarrit, a quiet assassination contract), with ranks from Copper to Silver.
- **The Coffer-House**, Ashgate's bank: 15 gold to open an account, and banked gold survives a death.
- **The Hesk song-language**, learned in lessons with the exile Ninefold: each level opens new ways to talk, sneak and fight.
- **Eight quest-earned items**: the Weathercloak (fire, frost and poison threads), Mirrorwake (a blade that splits you into copies), the Drum of Stilling, the Saltroot Mask, the Daylamp, the Long Reckoning crossbow, the Seventeen-Year Ring, and the Moltglaive.
- **Treasure hunts**: three riddle maps to dig up, and more puzzles: a tone-lock door, a fog-shrouded tunnel maze, shoring a collapsed mine, a shell game against an illusionist, and singing a drum-call back to break it.
- **The Kept Noon** (Parts XLII–XLVIII): down the deep stair to Ammaret, the buried city under Sulmara's glass, where the Lidless have had no night for six hundred years. Sell your shadow (and risk the axe's protection), keep the Noon from dimming, find out which of four people the Blackjackal is wearing, and decide whether the city keeps its light.
- **More puzzles**: the Hour-House's linked clock dials, the assayer's scales (find the false shadow in two weighings), two shadow gates (set shutter-stones so the moon glyphs fall in shadow and the sun glyphs stay lit), and pinning the Blackjackal's shadow on the wall.
- **Five more quest items**: the Sun-Shard, the Hour-Key, Oriel's Shadow Needle, the Lidless Veil and the Dimmer's Shutter-Cloak.
- **The Undermoon** (Parts XLIX–LV): home to the labyrinth, and under it to Kedge, where the Moored carry the stones of their dead so they don't float away. The Lift rises every turn: carry enough kinstones to keep your feet, but not so many you can't climb. Drive the wardens' pins back into the cage, stop Corwen Lisk the Tidecaller, who fights from the air, and decide whether the fallen moon sleeps or rises.
- **More puzzles**: balance beams (weight times distance), a sliding root-knot, the Drift (stepping stones that move every time you do), and the tide-readers' tide-table.
- **More quest items**: the Plumb-Heart, the Wardens' Maul, the Tether-Line, Corwen's Tide-Chart and the Ember Sapling.
- **The Siege of Rahdaria** (Parts LVI–LXII): west to the coast, where the garden city of Rahdaria is besieged by the Bathyr, a people who came up out of the bottom of the sea. The High Steward makes you her Inquirer: a **Detective** ability (the Inquirer's Eye) and a casebook of **seven cases**, each with three clues to find in three days of four watches. The city's **Hunger** rises every dawn; feed it and end the blight in the poisoned Hanging Gardens. Your **Standing** with the people gives up to 20% off at the inn, the smithy and the stalls. Then the Bathyr seal the city: break the **blockade** (a hundred soldiers, a hundred crates, three Generals) with sorties, raids and one **sabotage mission** in three branches (the Flood, the Fire, the Fall) that you plan from what you've found. An achievement for completing every objective. Under the cases run the **Seven Inquiries**: red herrings, suspects on the Inner Council, the Rat King's five faces, the spies Whisper, Rook and Veil, Inspector Amara Holt challenging every accusation, and the Curator under it all. With them come character backgrounds, **Detective Vision** (a trace-following puzzle), a **War Journal**, five Rahdarian allies (party of two), three paths through the blockade (military, sabotage, diplomacy), six battlefield professions with their own mini-games, a volley every 12 turns, retreat and enemy momentum (at 100%, Rahdaria falls), Adaptive Reasoning ranks II–IV, the Defender of Rahdaria tiers, and the grand feat, **The Eye of Rahdaria**.
- **More puzzles**: tracing the poison through the cisterns, auditing a grain ledger, a watch-rota logic grid, a knock code, mixing soil amendments, and reading Bathyr lead-letters on a cipher wheel.
- **Experience and levels**: an XP bar on the sheet. You start at level 3 and can reach **level 40**. Fights you come through, parts and chapters you finish, and checks you pass all give XP. Each level is +2 max HP; every 9 levels +1 to hit, every 6 +1 damage, every 12 +1 AC. **Foes are scaled to your level** (more HP, a harder swing and harder hits; the foe meter shows its level). Old saves are credited the XP for the parts they've reached. New fight engines get scaling for free through `foeStart`; pass `{ scale: false }` for a meter that mirrors its own HP.
- **Adaptive Reasoning** (learned at level 5): every blow that lands on you teaches you the next, +1 AC against that foe (up to +2) for the fight; and every fight you come through against a kind of foe is a read on it (1 read +1 to hit, 3 reads +1 AC, 5 reads +2 to hit).
- **Mimic** (learned at level 8): the catalyst is **Mockwax**, the grey wax tallow-moths leave in the labyrinth's walls, which remembers the last shape pressed into it. Through quick hands, press it into a fresh wound to copy the blow that made it: your next hit deals that blow too, with its rider (poison and rot sicken, fire and light dazzle). Copied blows are kept as prints (3 at most), and once a fight you can lay an old print on your blade for free.
- **The roads back**: after the story so far, walk any cleared region and fight what lives there for XP and gold. At level 40, **the Cascades** wake (the realm's nightmares falling upward toward you, now that you're the heaviest thing in it): every creature becomes a **Nightmare**, nine hidden things wash loose in the old places (the Seedcrown, the Glassfang, Duskwane's Lens, the Drowned King's Gauntlet, the Bell-Iron Buckle, the Clear Verdict, Ninefold's Blade-Shell, a Splinter of the Kept Noon and the Kinstone Ring), and the Cascades lead to **the Underdream**, a dream that learned to fight like you. Beat it and you choose whether the Cascades keep running.
- **Progress saving** in your browser, so you can continue from the last part you reached.
- **A journal** of each journey, kept in your browser: time played, deaths, close calls (when the axe held you at 1 HP), fights, gold found and spent, every item found, bounties claimed and treasure dug up. Each chapter ends with a summary card, and the journal (the *Journal* button in your items) keeps a table of finished chapters, totals across every journey, and your earlier runs.
- **The story so far.** Continuing a save opens with a short recap of that run: the choices you made in each chapter, who is with you, where you stopped and what you carry. Skip it, turn it off, or read it again any time at the top of the journal. Each chapter's lines come from the `RECAP` table in `index.html`, keyed by the chapter's slug in `CHAPTERS`; a new chapter should add an entry there.
- **A map that grows.** The *Map* button (next to *Journal*) opens a hand-inked map of the realm. Each chapter you reach lifts the fog off its region, with a mark for where you are now; the western sea stays uncharted. Each save slot keeps its own map. Regions come from the `MAP` table in `index.html`, keyed by the chapter's slug in `CHAPTERS`, so a new chapter adds its region with one entry (its place, glyphs from `MAP_ART`, labels, road and the fog it clears) and no redraw.

## Visitor stats (public site only)

The GitHub Pages version can count anonymous visits with [GoatCounter](https://www.goatcounter.com/), which uses no cookies and collects nothing personal. It's off until a site code is filled in: set `GOATCOUNTER_CODE` near the top of the game script in `index.html` to your GoatCounter code. It only ever runs on `coderblack15.github.io`, never in the private Claude link or a copy opened from disk.

Besides page views, the dashboard shows these events: `journey-start`, `journey-continue`, `part-1` … `part-62` (how far players get), `chapter-done-labyrinth`, `chapter-done-desert`, `chapter-done-hushfen`, `chapter-done-carrowmere`, `chapter-done-lastwell`, `chapter-done-assize`, `chapter-done-corrach`, `chapter-done-noon`, `chapter-done-undermoon`, `chapter-done-rahdaria`, `journey-finished`, and `bloom-death`.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The playable game |
| `STORY.md` | The full game master script for all sixty-two parts |

## Status

**Main-hand weapons.** Besides Vaelric's Axe, you can buy the Hollowpine Spear, the Cairnstone Maul, the Wasp-Needle Rapier and the Cinderbrand from the travelling armourer Hobb Tallis at the start of each chapter, or from Mattie Gorse in Rahdaria. The Thornwood Longbow (40 gold) carries **Onslaught**: once a fight, three arrows at once, each finding its own target (up to three foes in a group fight, or 3d6 on a single foe). Bows also drop in the field. Swap between them any time from the Bag. In Rahdaria, solving a case, closing an inquiry, breaking the blight, beating a General or winning the siege earns you **three cheers** from the city.

**Field weapons.** Won fights can drop weapons in five qualities of our own: Ashen (smoke grey, 12%), Tempered (bronze, 8%), Rootbound (verdigris, 4%), Gloaming (lavender, 1.5%) and Heartfire (ember gold, 0.34%). Heartfire has a safety net: each won fight without one adds 0.05%, and the 200th dry fight always drops one. Better weapons carry traits (Reach, Searing, Crushing, Keen, Thirsting) and a once-a-fight active fired with quick hands (Phase Strike, Become Ethereal, Heartflare, Sap Mend, Gloam Veil). The Curator's vault always holds the **Spectral Dagger of Rahdaria** (1d6 + 4, +2 to hit, Phase Strike for 34, Become Ethereal). You carry six found weapons; past that, the worst is sold.

**The weapon harness.** Four weapons ride ready (five at level 20, six at level 40), plus the axe. In a fight, Swap weapon to one is free once a turn, a second swap gives the foe advantage on its next attack, and a weapon from the pack costs your next swing.

**Towns and sanctuaries on the roads back.** After the story so far, every cleared region keeps its towns and quiet places, and you can visit any of them from the roads back: inns, markets (potions, elixirs, salvage), smiths (weapons and honing), banks in Ashgate and Rahdaria, the Library of Roots and the Vitreous Library (learn a skill for 30 gold), Sister Wren's Field Mending at Vellum Rest, bars for rumours, and sanctuaries (the Glade, Vellum Rest, the Temple of the Kept Noon, the hanging gardens, the Library of Roots) where you rest for free and the road's sicknesses are eased.

**The Warden's Weapon Chest.** At level 40, Hobb Tallis or Mattie Gorse sells it for 1,000 gold. Six places, kept apart from every save, so it's shared by all three slots and nothing that happens to a run (death, a replay from your last rest, Rahdaria Falls) touches it.

Parts I to LXII are complete. The story ends in Rahdaria, with the blockade broken and the Speaker for the Deep asking you to come down under the western sea, where the Drowned Light is going out. Part LXIII is still to come.
