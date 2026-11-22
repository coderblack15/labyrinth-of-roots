# The story of Parts I to IV, ported line for line from the web game (index.html:
# partPathway, partWebs, partChamber, partNest), with the same checks, DCs and damage.
# The 3D beats (walking to a ring, a swing, a spider dropping) sit beside the text.
extends Node

var main
var ui
var world
var S := {}
var FOE := {"on": false, "name": "", "hp": 0, "max": 0, "chain": 0}
var rx := RegEx.new()

func _ready() -> void:
	rx.compile("\\{g:([^|}]*)\\|([^|}]*)\\|([^}]*)\\}")

func run() -> void:
	ui = main.ui
	world = main.world
	S = {"hp": 24, "max_hp": 24, "coins": 12, "blessing": false, "torch": false, "axe": false,
		"shield": false, "paid": false, "gems_spent": false, "slain": false, "name": "", "pr": "they"}
	world.build("pathway")
	world.set_light("dusk", 0.01)
	var who: Dictionary = await ui.title_screen()
	S.name = who.name
	S.pr = who.pr
	world.play_music("roots-listening")
	ui.show_hud(true)
	stats()
	await part_pathway()
	await part_webs()
	await part_chamber()
	await part_nest()
	await main.shot("end")
	await ui.end_card(S)

# ---------- the game master's tools ----------
func tok(t: String) -> String:
	var i: int = {"he": 0, "she": 1}.get(S.pr, 2)
	var out := t
	for m in rx.search_all(t):
		out = out.replace(m.get_string(), m.get_string(i + 1))
	return out

func stats() -> void:
	ui.stats(S)

func say(t: String, kind := "say") -> void:
	await ui.say(tok(t), kind)

func voice(t: String) -> void:
	await say(t, "voice")

func mech(t: String, kind := "mech") -> void:
	await ui.say(tok(t), kind)

func heading(num: String, title: String) -> void:
	await ui.heading(num, title)

func choose(opts: Array) -> String:
	return await ui.choose(opts)

# "go" is the web game's single button. Here it is also a ring on the ground:
# press the button and the hero walks there, or walk there yourself.
func go(label: String, marker := "") -> void:
	if marker != "":
		world.set_goal(marker)
	ui.show_go(label, marker != "")
	var how = await main.advance
	ui.clear_actions()
	if marker != "":
		if how == "button":
			await world.walk_to_goal()
		world.clear_goal()

func d(n: int) -> int:
	return main.rng.randi_range(1, n)

func ac() -> int:
	return 13 + (1 if S.shield else 0)

func sgn(m: int) -> String:
	return ("+" if m >= 0 else "") + str(m)

func check(o: Dictionary) -> Dictionary:
	var label: String = o.get("label", "Check")
	var mod: int = o.get("mod", 0)
	var dc: int = o.get("dc", 10)
	var target: String = o.get("target", "DC")
	var adv: bool = o.get("adv", false)
	var dis: bool = o.get("dis", false)
	if adv and dis:
		adv = false
		dis = false
	var atk: bool = FOE.on and target == "AC"
	var cb: int = min(2, FOE.chain) if atk else 0
	mod += cb
	var against := ("DC %d" % dc) if target == "DC" else (("AC %d" % dc) if target == "AC" else "%s, DC %d" % [target, dc])
	var meta := "d20 %s%s  vs  %s" % [sgn(mod), ("  (combo +%d)" % cb) if cb > 0 else "", against]
	if adv:
		meta += "  ·  advantage"
	if dis:
		meta += "  ·  disadvantage"
	var rolls := [d(20)]
	if adv or dis:
		rolls.append(d(20))
	var keep := 0
	if adv and rolls[1] > rolls[0]:
		keep = 1
	if dis and rolls[1] < rolls[0]:
		keep = 1
	var total: int = rolls[keep] + mod
	var ok := total >= dc
	var res := "%d %s = %d.  %s" % [rolls[keep], sgn(mod), total, ("Hit!" if atk else "Success.") if ok else ("Miss." if atk else "Failure.")]
	await ui.roll_card({"label": label, "meta": meta, "cta": o.get("cta", "Roll d20"), "dice": rolls, "keep": keep if rolls.size() > 1 else -1, "result": res, "ok": ok})
	var chain_before: int = FOE.chain
	if atk:
		FOE.chain = min(3, FOE.chain + 1) if ok else 0
		ui.foe_update(FOE)
	if not ok and S.blessing:
		var k := await choose([
			{"key": "bless", "label": "Call on the strangers' blessing and reroll"},
			{"key": "keep", "label": "Let the roll stand", "plain": true}])
		if k == "bless":
			S.blessing = false
			stats()
			FOE.chain = chain_before
			await mech("\"Then may the old roots remember you.\" The words come back, and so does your nerve.", "loot")
			var o2 := o.duplicate()
			o2.cta = "Reroll"
			return await check(o2)
	return {"ok": ok, "total": total, "roll": rolls[keep]}

func contest(o: Dictionary) -> bool:
	var me := d(20)
	var foe := d(20)
	var mt: int = me + o.mod
	var ft: int = foe + o.foe_mod
	var won := mt >= ft
	await ui.roll_card({"label": o.label, "meta": "You d20 %s  vs  %s d20 %s" % [sgn(o.mod), o.foe, sgn(o.foe_mod)],
		"cta": o.cta, "dice": [me, foe], "names": ["You", o.foe],
		"result": "You %d, %s %d.  %s" % [mt, o.foe, ft, "You win the contest." if won else "You lose the contest."], "ok": won})
	return won

func enemy_attack(o: Dictionary) -> bool:
	var dis: bool = o.get("dis", false)
	var rolls := [d(20)]
	if dis:
		rolls.append(d(20))
	var keep := 0
	if dis and rolls[1] < rolls[0]:
		keep = 1
	var total: int = rolls[keep] + o.bonus
	var hit := total >= ac()
	await ui.roll_card({"label": o.label, "meta": "%s d20 %s  vs  your AC %d%s" % [o.foe, sgn(o.bonus), ac(), "  ·  it has disadvantage" if dis else ""],
		"cta": o.get("cta", "Roll for it"), "dice": rolls, "keep": keep if dis else -1,
		"result": "%d %s = %d.  %s" % [rolls[keep], sgn(o.bonus), total, "It hits." if hit else "It misses."], "ok": not hit})
	return hit

func hurt(n: int, s: int, type: String, why: String) -> void:
	var rolls := []
	var total := 0
	for i in n:
		var r := d(s)
		rolls.append(r)
		total += r
	S.hp -= total
	world.hero_hurt()
	var held := false
	if S.hp <= 0:
		S.hp = 1
		held = true
	stats()
	var parts := " + ".join(rolls.map(func(x): return str(x))) + " = " if n > 1 else ""
	await mech("%s Take %dd%d %s damage: %s%d." % [why, n, s, type, parts, total], "hurt")
	if held:
		if S.axe:
			await voice("\"Not here,\" the axe says, and the gems hold you up with 1 HP.")
		else:
			await mech("You go down on one knee, and somehow get up again with 1 HP.", "hurt")

func damage_roll(n: int, s: int, bonus: int, label: String) -> int:
	var rolls := []
	var total := bonus
	for i in n:
		var r := d(s)
		rolls.append(r)
		total += r
	await mech("%s: %dd%d%s rolls %s%s = %d." % [label, n, s, (" + %d" % bonus) if bonus else "", " + ".join(rolls.map(func(x): return str(x))), (" + %d" % bonus) if bonus else "", total])
	return total

func foe_start(name: String, hp: int) -> void:
	FOE = {"on": true, "name": name, "hp": hp, "max": hp, "chain": 0}
	ui.foe_show(FOE)

func foe_strike(n: int, s: int, bonus: int, label: String) -> int:
	var total := await damage_roll(n, s, bonus, label)
	FOE.hp = max(0, FOE.hp - total)
	ui.foe_update(FOE)
	return total

func foe_end() -> void:
	FOE.on = false
	ui.foe_hide()

# ---------- Part I ----------
func part_pathway() -> void:
	await heading("I", "The Pathway")
	await say("For two days you have walked the ceremonial pathway, pausing only to eat a few bites from your pack. The labyrinth waits somewhere below.")
	await main.shot("pathway")
	await go("Walk on down the pathway", "strangers")
	await say("On the road, two hooded strangers step into your path.")
	await world.strangers_step_in()
	await say("\"Turn back, {g:brother|sister|traveller},\" one says. \"Nothing that goes down there comes back up.\"", "voice")
	await main.shot("strangers")
	var c := await choose([
		{"key": "coins", "label": "Smile and press three coins into their palms"},
		{"key": "past", "label": "Brush past them in silence"}])
	if c == "coins":
		await world.give_coins()
		S.coins -= 3
		S.paid = true
		stats()
		await say("You smile, press three coins into their palms, and walk on.")
		await say("As you pass, the taller one murmurs something under the hood: \"Then may the old roots remember you.\"", "voice")
		S.blessing = true
		stats()
		await mech("You gain the Strangers' Blessing: once, you may reroll a failed check.", "loot")
	else:
		await say("You walk on without a word. Behind you, one of them laughs softly, and the sound follows you down the road longer than it should.")
	world.strangers_aside()
	await go("Go down to the gate", "gate")
	await say("You descend level after level until the outer gate of the labyrinth rises before you. Its stone face is covered in druidic carvings: spirals, antlered figures, and runes that seem to shift when you look away. A chill settles in your gut. Perhaps the strangers knew something after all.")
	await main.shot("gate")
	var g := await choose([
		{"key": "on", "label": "Step through the gate"},
		{"key": "study", "label": "Study the carvings first", "plain": true}])
	if g == "study":
		world.runes_shift()
		await say("You trace the grooves with your fingers. Among the spirals, one rune keeps returning: an axe laid across the trunk of a tree. Every time you find it, it seems to point a little further down.")
		await go("Step through the gate", "gate_step")
	else:
		await world.walk_to_marker("gate_step")
	await say("The sun sinks, washing the stone in violet, and then the light is gone. Darkness, total and absolute.")
	await world.set_light("dark", 2.5)
	await mech("Something is moving in the dark. Make a Perception check.")
	var p := await check({"label": "Perception check", "mod": 2, "dc": 13})
	await world.vine_rise()
	if p.ok:
		await say("A dry rustle behind you, like leaves where no leaves should grow. You spin around just as something unfolds to its full height. It's a vine horror, nearly eight feet tall, and its thick, thorned limbs are made for tearing flesh. One lashes at you, and you jerk your head aside as it whistles past your ear.")
	else:
		await say("You never hear it coming. Behind you, something unfolds to its full height. It's a vine horror, nearly eight feet tall, and its thick, thorned limbs are made for tearing flesh. One lashes past your ear.")
	await main.shot("vine-horror")
	var f := await choose([
		{"key": "fight", "label": "Roll initiative"},
		{"key": "run", "label": "Run", "plain": true}])
	if f == "fight":
		var i := await check({"label": "Initiative", "mod": 2, "dc": 12, "target": "vs vine horror", "cta": "Roll initiative"})
		if i.ok:
			await world.hero_swing()
			await world.vine_recoil()
			await say("You're faster. Your belt knife flashes and opens a long gash in one of its limbs. Sap like black blood spills out, and the thing reels back with a sound like a tree splitting in a storm.")
			await say("It's barely hurt. A knife won't finish this. While it recoils, you turn and run.")
		else:
			await world.vine_lash(true)
			await say("It's faster. A thorned limb wraps your shoulder and rips free, tearing cloth and skin.")
			await hurt(1, 6, "piercing", "Thorns rake your shoulder.")
			await say("No knife in the world will stop this thing. You tear loose and run.")
	else:
		var r := await check({"label": "Dexterity check", "mod": 2, "dc": 11, "cta": "Roll to escape"})
		if not r.ok:
			await world.vine_lash(true)
			await hurt(1, 4, "piercing", "A thorned limb catches your calf as you bolt.")
		else:
			await world.vine_lash(false)
			await say("You're gone before the second limb comes down.")
	await world.flee()
	await world.change_stage("corridors")
	world.set_light("dark", 0.01)
	await say("You flee into the corridors and turn blindly left, then right, then left again, until the rustling behind you fades. You've lost it, for now.")
	await say("In the pitch black, you need a cloth, a stick, and your flint.")
	var lit := false
	var tries := 0
	while not lit:
		var s := await check({"label": "Survival check", "mod": 2, "dc": 10, "cta": "Strike the flint again" if tries else "Strike the flint"})
		await world.flint(s.ok)
		if s.ok:
			lit = true
		else:
			tries += 1
			await hurt(1, 1, "slashing", "The sparks die on damp cloth, and the flint splits your knuckle.")
			await say("Somewhere far off, leaves rustle. Try again.")
	S.torch = true
	world.hero_take_torch()
	stats()
	await say("Sparks catch, and the torch flares to life.")
	await world.set_light("torch", 0.8)
	await mech("Torch added to your pack.", "loot")
	await say("Then you see where you are. Thick white webbing fills the corridor from floor to ceiling. Skeletons hang in the strands like flies, dozens of them, some still in rusted armor and clutching their weapons.")
	await main.shot("torch-webs")
	await go("Press into the webs", "webs")

# ---------- Part II ----------
func part_webs() -> void:
	await heading("II", "The Webs")
	await say("The smell of death and decay fills your nose and throat. A warm wind brushes your skin, though there should be no wind down here. Then something hairy and jointed reaches out of the dark toward you.")
	await world.leg_reach()
	world.torch_sputter(true)
	await say("Your torch sputters. Your heart sinks.")
	await main.shot("the-leg")
	var c := await choose([
		{"key": "duck", "label": "Drop low and smother the flame"},
		{"key": "thrust", "label": "Thrust the torch at it", "plain": true}])
	var adv := false
	if c == "thrust":
		await world.hero_lunge(0.5)
		await world.leg_flinch()
		await say("You jab the sputtering torch at the leg. It flinches back from the heat, and the flame gutters down to a dull ember. You've bought yourself a heartbeat.")
		await mech("You have advantage on the Dexterity check.")
		adv = true
	var r := await check({"label": "Dexterity check", "mod": 2, "dc": 12, "adv": adv})
	if not r.ok:
		await world.leg_grab()
		await say("You're too slow. The leg closes around your arm, and something sharp sinks in before you rip yourself free.")
		await hurt(1, 6, "poison", "A burning bite.")
		await say("Gasping, you drop into a crouch and smother what's left of the flame. Down by the floor, you spot a gap beneath the webbing where the strands are loose enough to crawl through.")
	else:
		await say("You drop into a crouch, smother the flame, and spot a gap beneath the webbing where the strands are loose enough to crawl through.")
	await world.hero_crouch(true)
	await world.set_light("dark", 0.5)
	await say("You slip under them on your belly, silk brushing your neck, and keep crawling until the passage opens.")
	await world.crawl_through()
	await world.hero_crouch(false)
	await world.flint(true)
	world.torch_sputter(false)
	await world.set_light("torch", 0.6)
	await say("On the far side you strike your flint once more, and this time the torch catches on the first try.")
	await go("Stand up and look around")

# ---------- Part III ----------
func part_chamber() -> void:
	await world.change_stage("chamber")
	world.set_light("torch", 0.01)
	await heading("III", "The Hollow Chamber")
	await say("You emerge into a round room that feels less built than grown. The walls curve up like the inside of a great hollowed tree, ridged with bark and knotted roots that twist into the ceiling. Thorny bushes sprout from cracks in the floor, their leaves pale from never seeing sunlight. Webbing stretches from root to root, sagging under its own weight. At the center stands the dead trunk itself, split open down the middle like a doorway.")
	await main.shot("chamber")
	await say("You need a weapon.")
	await go("Search the room", "skeleton")
	await world.face(world.props.skel.global_position)
	await say("You find a skeleton slumped against the roots, still in dented plate armor. Across its lap lies a two-handed steel axe, its haft set with gems of ruby, sapphire, and emerald that glitter even in the dark.")
	await main.shot("skeleton-axe")
	await go("Lean down and lift the axe")
	await world.hero_take_axe()
	S.axe = true
	stats()
	await say("Power floods up your arms.")
	await mech("New power: once per encounter, the gems flare and the axe deals extra radiant damage, burning away webbing within 10 feet.", "loot")
	await voice("\"You will not perish here. Listen, and I will guide you through this catastrophe.\"")
	var c := await choose([
		{"key": "look", "label": "Look over the rest of the skeleton", "tag": "Investigation"},
		{"key": "leave", "label": "Leave the dead in peace", "plain": true}])
	if c == "look":
		var r := await check({"label": "Investigation check", "mod": 1, "dc": 12})
		if r.ok:
			S.shield = true
			world.hero_take_shield()
			stats()
			await say("The straps of its breastplate have rotted through, and the pauldron on its left shoulder comes loose in your hand. It's a curved slab of steel, dented but solid, about the size of a small shield. You loop the old leather strap around your forearm.")
			await mech("Improvised shield: +1 AC, and it unlocks Shield Slam.", "loot")
		else:
			await say("The armor has fused with rust and root. You tug at the plates, but nothing comes loose, and you leave the old warrior as you found them.")
	else:
		await say("You bow your head to the bones and step back.")
	await go("Swing the axe before the hollow tree", "trunk")
	await world.face(Vector3(0, 0, -2))
	await world.hero_swing()
	world.set_light("gems", 0.4)
	world.trunk_glow()
	await say("The trunk answers. A red glow pulses from deep inside it, and you stumble back a step.")
	await world.ghost_rise()
	world.hero_kneel(true)
	await say("A ghost rises out of the light, and it has the same shape as the skeleton at your feet. Its face is gaunt and its eyes burn, and it hovers over you with a presence so heavy that sweat runs down your forehead. Your knees hit the floor.")
	await main.shot("vaelric")
	await voice("\"I am Vaelric, last warden of this place. My axe has chosen you. Carry it where I could not. Ryytaa the Ender nests beyond. Kill her, take what I guarded, and walk out into the light.\"")
	await world.trunk_open()
	await say("The ghost raises a hand, and the back of the tree splits open, revealing a tunnel.")
	await world.ghost_fade()
	world.hero_kneel(false)
	world.set_light("torch", 0.8)
	await go("Enter the tunnel", "tunnel")

# ---------- Part IV ----------
func part_nest() -> void:
	await world.change_stage("nest")
	world.set_light("torch", 0.01)
	await heading("IV", "The Nest")
	S.gems_spent = false
	stats()
	await say("The tunnel ends in a cavern draped in webs, and the floor is littered with egg sacs as big as barrels. Clicking echoes from every direction. Four giant spiders drop from the ceiling on silk lines, and behind them Ryytaa the Ender unfolds, the brood mother herself, as big as a cart, with venom dripping from her fangs.")
	await world.nest_intro()
	await main.shot("nest-field")
	var init := await check({"label": "Initiative", "mod": 2, "dc": 14, "target": "vs the brood", "cta": "Roll initiative"})
	await say("You're ready before their feet touch stone." if init.ok else "They move before you can raise the axe.")
	foe_start("Ryytaa the Ender", 24)
	await mech("Ryytaa the Ender waits at the back of the nest while her brood comes at you. Every hit you land in a row builds your combo, and she has 24 HP.")
	# Round 1
	await mech("Round 1")
	await world.spider_rear("a")
	await say("The first spider lands right in front of you, its eight eyes shining red in the axe's glow. Its abdomen clenches, its fangs spread wide, and a wet, gurgling sound rises from its throat. It's about to spray venom straight at your face.")
	var sv := await check({"label": "Dexterity saving throw", "mod": 2, "dc": 13, "cta": "Roll the save"})
	var dis := false
	if sv.ok:
		await world.venom("a", false)
		await say("You throw yourself sideways, and the venom spatters across the stone where your head just was, hissing as it eats into the rock.")
	else:
		await world.venom("a", true)
		await say("It catches you across the cheek.")
		await hurt(1, 6, "poison", "The venom burns like acid.")
		await mech("You have disadvantage on your next attack.", "hurt")
		dis = true
	if not S.shield:
		await say("As you roll, your hand lands on a curved piece of plate half buried in the webs. You snatch it up just as the spider spits again, and the venom splashes off the steel.")
		S.shield = true
		world.hero_take_shield()
		stats()
		await mech("You gain the improvised shield: +1 AC, and it unlocks Shield Slam.", "loot")
	# Round 2
	await mech("Round 2")
	await say("You come up swinging.")
	var hit := false
	var first := true
	while not hit:
		var a := await check({"label": "Axe attack", "mod": 5, "dc": 12, "target": "AC", "dis": first and dis, "cta": "Swing the axe" if first else "Swing again"})
		first = false
		if a.ok:
			hit = true
			await world.swing_at("a", true)
		else:
			await world.swing_at("a", false)
			await say("The spider skitters back and your axe bites stone, throwing sparks. It darts in and sinks its fangs into your forearm.")
			await world.spider_bite("a")
			await hurt(1, 4, "piercing", "A quick bite.")
	world.spider_lose_leg("a")
	await say("The axe bites into the spider's leg and takes it off, and the spider shrieks and backs away. Two more spiders scuttle down the walls to flank you.")
	await world.flankers_drop()
	await main.shot("flanked")
	var r2 := await choose([
		{"key": "attack", "label": "Attack the nearest flanker"},
		{"key": "brace", "label": "Brace your shield", "tag": "attacker has disadvantage"}])
	if r2 == "attack":
		var a2 := await check({"label": "Axe attack", "mod": 5, "dc": 12, "target": "AC", "cta": "Swing the axe"})
		if a2.ok:
			await world.swing_at("b", true)
			await world.spider_die("b")
			await say("You catch the closer one mid-leap. It tumbles off the wall in two pieces.")
		else:
			await world.swing_at("b", false)
			await say("You miss, and the other flanker drops onto your back.")
			await world.spider_bite("c")
			await hurt(1, 6, "piercing", "Fangs between your shoulder blades.")
	else:
		await world.face(world.props.sp_b.global_position)
		await world.hero_brace(true)
		await say("You plant your feet and raise the pauldron as the nearest flanker lunges.")
		var h := await enemy_attack({"label": "Spider bite", "foe": "Spider", "bonus": 4, "dis": true, "cta": "Brace!"})
		if h:
			await world.spider_bite("b")
			await hurt(1, 6, "piercing", "It finds the gap under the steel.")
		else:
			await world.spider_bounce("b")
			await say("Its fangs screech off the steel, and it drops back to the floor, stunned and clicking.")
		await world.hero_brace(false)
	# Round 3
	await mech("Round 3")
	await world.face(world.props.sp_a.global_position)
	await world.spider_rear("a")
	await say("The wounded spider rears up for another spray, but you're already moving.")
	await go("Slam the axe down and wake the gems")
	S.gems_spent = true
	stats()
	world.set_light("gems", 0.2)
	await world.gems_burst()
	await damage_roll(2, 8, 0, "Radiant burst")
	world.spider_die("a")
	await say("You slam the axe down and the gems burst with red light. The webs around you curl into ash, leaving the spiders nowhere to hide. The wounded one crumples, smoking.")
	await main.shot("gems")
	world.set_light("torch", 1.0)
	# Round 4
	await mech("Round 4")
	await world.face(world.props.ryytaa.global_position)
	await world.ryytaa_charge()
	await say("Now Ryytaa the Ender moves. The floor shakes as she charges, her fangs as long as daggers.")
	await main.shot("ryytaa-charge")
	await go("Step into her and drive the shield into her face")
	var won := await contest({"label": "Shield Slam · Strength contest", "mod": 3, "foe": "Ryytaa", "foe_mod": 4, "cta": "Slam!"})
	await world.shield_slam(won)
	var adv_final := false
	if won:
		await say("As she rears back to strike, you step into her and drive the shield into her face with all your weight behind it. The steel rings like a bell, and she staggers.")
		await mech("Ryytaa is stunned until the end of your next turn. You have advantage on your next attack.")
		adv_final = true
	else:
		await say("You drive the shield into her face, but she's too heavy to stop. She shoves through the blow, and one fang rakes along your side.")
		await hurt(2, 6, "piercing", "Ryytaa's fang tears your side.")
		await say("Still, the steel rang hard against her skull. She's shaking her head, slow to recover.")
	await voice("\"Now,\" Vaelric whispers from the axe.")
	first = true
	while FOE.hp > 0:
		var a3 := await check({"label": "Killing blow", "mod": 5, "dc": 14, "target": "AC", "adv": first and adv_final, "cta": "Bring the axe down with both hands" if first else "Strike again"})
		first = false
		if a3.ok:
			var dmg := await foe_strike(2, 12, 3, "Axe damage")
			await world.swing_at("ryytaa", true, "-%d" % dmg)
			if FOE.hp > 0:
				await say("The axe bites deep into her carapace, and black ichor sprays across the webs. She screams and rears up again, still standing.")
		else:
			await world.swing_at("ryytaa", false)
			await world.ryytaa_dodge()
			await say("She twists aside at the last instant and the blade shears through silk instead of flesh.")
			await voice("\"Steady. Again.\"")
	S.slain = true
	foe_end()
	stats()
	world.set_light("gems", 0.3)
	await world.ryytaa_die()
	await say("The gems blaze so brightly that the whole nest is lit like noon. When Ryytaa the Ender falls, the egg sacs shrivel, the last spiders flee into the cracks in the walls, and the clicking dies.")
	await main.shot("ryytaa-falls")
	await say("The shield stays strapped to your arm, scarred by venom and dented in the shape of a spider's face.")
	world.set_light("torch", 1.0)
	S.gems_spent = false
	stats()
	world.fight_cam(false)
	world.play_music("roots-listening")
	await go("Go deeper, past the nest", "deeper")
