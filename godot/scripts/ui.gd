# The story panel, stat bar, foe meter, dice cards and the title and end screens.
extends CanvasLayer

signal chosen(key)
signal rolled

const C_TEXT := Color("e8dcc4")
const C_GOLD := Color("c9a45c")
const C_VOICE := Color("e6c98a")
const C_MECH := Color("a9b8c8")
const C_LOOT := Color("9fd49a")
const C_HURT := Color("e58a7a")

var main
var root: Control
var top: PanelContainer
var hp_lbl: Label
var hp_bar: ProgressBar
var gold_lbl: Label
var items_lbl: Label
var foe_box: PanelContainer
var foe_name: Label
var foe_bar: ProgressBar
var foe_hp: Label
var combo_lbl: Label
var panel: PanelContainer
var scroll: ScrollContainer
var log_box: VBoxContainer
var actions: VBoxContainer
var fade_rect: ColorRect
var skip := false
var typing := false
var view := Vector2(1280, 720)

func _ready() -> void:
	layer = 5
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.theme = _theme()
	add_child(root)
	_build_top()
	_build_foe()
	_build_panel()
	fade_rect = ColorRect.new()
	fade_rect.color = Color(0, 0, 0, 1)
	fade_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(fade_rect)
	top.visible = false
	panel.visible = false
	foe_box.visible = false

func _theme() -> Theme:
	var t := Theme.new()
	t.default_font_size = 18
	var sb := _sb(Color(0.114, 0.094, 0.075, 0.93), Color("6b5a3a"), 10, 12)
	t.set_stylebox("panel", "PanelContainer", sb)
	t.set_stylebox("normal", "Button", _sb(Color("2c2318"), Color("8a6d3e"), 8, 10))
	t.set_stylebox("hover", "Button", _sb(Color("3a2e1f"), Color("c9a45c"), 8, 10))
	t.set_stylebox("pressed", "Button", _sb(Color("4a3a26"), Color("e0c080"), 8, 10))
	t.set_stylebox("focus", "Button", _sb(Color(0, 0, 0, 0), Color("c9a45c"), 8, 10))
	t.set_stylebox("disabled", "Button", _sb(Color("1d1813"), Color("3a3024"), 8, 10))
	for k in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		t.set_color(k, "Button", Color("f0e4c8"))
	t.set_color("font_disabled_color", "Button", Color("7a6e5a"))
	t.set_color("default_color", "RichTextLabel", C_TEXT)
	t.set_color("font_color", "Label", C_TEXT)
	t.set_stylebox("normal", "LineEdit", _sb(Color("120e0a"), Color("8a6d3e"), 6, 10))
	t.set_stylebox("focus", "LineEdit", _sb(Color("120e0a"), Color("c9a45c"), 6, 10))
	t.set_color("font_color", "LineEdit", C_TEXT)
	return t

func _sb(bg: Color, border: Color, radius: int, margin: int) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(1)
	s.set_corner_radius_all(radius)
	s.content_margin_left = margin + 2
	s.content_margin_right = margin + 2
	s.content_margin_top = margin
	s.content_margin_bottom = margin
	return s

func _bar(fill: Color) -> ProgressBar:
	var b := ProgressBar.new()
	b.show_percentage = false
	b.custom_minimum_size = Vector2(120, 12)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color("120e0a")
	bg.set_corner_radius_all(6)
	var fg := StyleBoxFlat.new()
	fg.bg_color = fill
	fg.set_corner_radius_all(6)
	b.add_theme_stylebox_override("background", bg)
	b.add_theme_stylebox_override("fill", fg)
	return b

func _build_top() -> void:
	top = PanelContainer.new()
	top.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(top)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	top.add_child(v)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	v.add_child(h)
	hp_lbl = Label.new()
	hp_lbl.add_theme_font_size_override("font_size", 16)
	h.add_child(hp_lbl)
	hp_bar = _bar(Color("b0443a"))
	hp_bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	hp_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(hp_bar)
	gold_lbl = Label.new()
	gold_lbl.add_theme_font_size_override("font_size", 16)
	gold_lbl.add_theme_color_override("font_color", C_GOLD)
	h.add_child(gold_lbl)
	items_lbl = Label.new()
	items_lbl.add_theme_font_size_override("font_size", 14)
	items_lbl.add_theme_color_override("font_color", C_MECH)
	items_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(items_lbl)

func _build_foe() -> void:
	foe_box = PanelContainer.new()
	root.add_child(foe_box)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	foe_box.add_child(v)
	var h := HBoxContainer.new()
	v.add_child(h)
	foe_name = Label.new()
	foe_name.add_theme_color_override("font_color", C_HURT)
	foe_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(foe_name)
	foe_hp = Label.new()
	foe_hp.add_theme_font_size_override("font_size", 15)
	h.add_child(foe_hp)
	foe_bar = _bar(Color("8a2a3a"))
	v.add_child(foe_bar)
	combo_lbl = Label.new()
	combo_lbl.add_theme_font_size_override("font_size", 14)
	combo_lbl.add_theme_color_override("font_color", C_GOLD)
	v.add_child(combo_lbl)

func _build_panel() -> void:
	panel = PanelContainer.new()
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	panel.gui_input.connect(_panel_input)
	root.add_child(panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	panel.add_child(v)
	scroll = ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.mouse_filter = Control.MOUSE_FILTER_PASS
	v.add_child(scroll)
	log_box = VBoxContainer.new()
	log_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	log_box.add_theme_constant_override("separation", 10)
	scroll.add_child(log_box)
	scroll.get_v_scroll_bar().changed.connect(_to_bottom)
	actions = VBoxContainer.new()
	actions.add_theme_constant_override("separation", 6)
	v.add_child(actions)

func _to_bottom() -> void:
	scroll.scroll_vertical = int(scroll.get_v_scroll_bar().max_value)

func _panel_input(e: InputEvent) -> void:
	if typing and ((e is InputEventMouseButton and e.pressed) or (e is InputEventScreenTouch and e.pressed)):
		skip = true

func _unhandled_key_input(e: InputEvent) -> void:
	if typing and e.is_pressed() and (e as InputEventKey).keycode in [KEY_SPACE, KEY_ENTER]:
		skip = true

# Landscape: the story runs down the right side. Portrait: it fills the bottom.
func layout(v: Vector2) -> void:
	view = v
	var land := v.x > v.y * 1.05
	var m := 10.0
	if land:
		var w: float = clamp(v.x * 0.4, 340.0, 520.0)
		_place(panel, Vector2(v.x - w - m, m), Vector2(w, v.y - m * 2))
		_place(top, Vector2(m, m), Vector2(min(460.0, v.x - w - m * 3), 0))
		_place(foe_box, Vector2(m, v.y - 110), Vector2(min(380.0, v.x - w - m * 3), 0))
		if main and main.world:
			main.world.set_inset(w / v.x + 0.01, 0.0)
	else:
		var h: float = v.y * 0.45
		_place(panel, Vector2(m, v.y - h - m), Vector2(v.x - m * 2, h))
		_place(top, Vector2(m, m), Vector2(v.x - m * 2, 0))
		# In a fight the foe meter sits just above the story, and the camera frames the space above it.
		var fh: float = foe_box.get_combined_minimum_size().y if foe_box.visible else 0.0
		_place(foe_box, Vector2(m, v.y - h - m - fh - 6), Vector2(v.x - m * 2, 0))
		var tb: float = top.get_combined_minimum_size().y + m
		if main and main.world:
			main.world.set_inset(0.0, (h + m + fh + 6 - tb) / v.y)
	for c in root.get_children():
		if c.has_meta("full"):
			_place(c, Vector2.ZERO, v)

func _place(c: Control, pos: Vector2, size: Vector2) -> void:
	c.set_anchors_preset(Control.PRESET_TOP_LEFT)
	c.position = pos
	c.size = Vector2(size.x, max(size.y, c.get_combined_minimum_size().y))
	c.custom_minimum_size = Vector2(size.x, size.y)

# ---------- the stat bar ----------
func stats(S: Dictionary) -> void:
	hp_lbl.text = "HP %d/%d" % [S.hp, S.max_hp]
	hp_bar.max_value = S.max_hp
	hp_bar.value = S.hp
	gold_lbl.text = "%d gold" % S.coins
	var it := []
	if S.axe:
		it.append("Vaelric's axe" + (" (gems spent)" if S.gems_spent else ""))
	else:
		it.append("Belt knife")
	if S.torch:
		it.append("Torch")
	if S.shield:
		it.append("Pauldron Shield (+1 AC)")
	if S.blessing:
		it.append("Strangers' Blessing (one reroll)")
	items_lbl.text = S.name + " · " + ", ".join(it)

func show_hud(on: bool) -> void:
	top.visible = on
	panel.visible = on

# ---------- the foe meter ----------
func foe_show(F: Dictionary) -> void:
	foe_box.visible = true
	foe_update(F)
	layout(view)

func foe_update(F: Dictionary) -> void:
	foe_name.text = F.name
	foe_hp.text = "%d/%d HP" % [F.hp, F.max]
	foe_bar.max_value = F.max
	var tw := create_tween()
	tw.tween_property(foe_bar, "value", float(F.hp), 0.4)
	combo_lbl.text = "Combo %d/3" % F.chain + ("  ·  +%d to hit" % min(2, F.chain) if F.chain > 0 else "  ·  hits in a row add to your swing")

func foe_hide() -> void:
	foe_box.visible = false
	layout(view)

# ---------- story text ----------
func _rich(size := 18) -> RichTextLabel:
	var r := RichTextLabel.new()
	r.bbcode_enabled = true
	r.fit_content = true
	r.scroll_active = false
	r.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	r.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	r.mouse_filter = Control.MOUSE_FILTER_PASS
	r.add_theme_font_size_override("normal_font_size", size)
	r.add_theme_font_size_override("italics_font_size", size)
	r.add_theme_font_size_override("bold_font_size", size)
	return r

func say(text: String, kind := "say") -> void:
	if main.autoplay:
		print("  [", kind, "] ", text)
	var r: RichTextLabel
	var holder: Control
	match kind:
		"voice":
			r = _rich()
			r.text = "[i][color=#%s]%s[/color][/i]" % [C_VOICE.to_html(false), text]
			holder = r
		"mech", "loot", "hurt":
			r = _rich(16)
			var col := C_MECH if kind == "mech" else (C_LOOT if kind == "loot" else C_HURT)
			r.text = "[color=#%s]%s[/color]" % [col.to_html(false), text]
			var p := PanelContainer.new()
			p.mouse_filter = Control.MOUSE_FILTER_PASS
			p.add_theme_stylebox_override("panel", _sb(Color(0.05, 0.05, 0.06, 0.6), col.darkened(0.45), 6, 8))
			p.add_child(r)
			holder = p
		_:
			r = _rich()
			r.text = text
			holder = r
	log_box.add_child(holder)
	await _type(r)

func _type(r: RichTextLabel) -> void:
	var n := r.get_total_character_count()
	if main.fast or n == 0:
		r.visible_ratio = 1.0
		await get_tree().process_frame
		return
	r.visible_ratio = 0.0
	typing = true
	skip = false
	var cps := 95.0
	var t := 0.0
	while t * cps < n and not skip:
		await get_tree().process_frame
		t += get_process_delta_time()
		r.visible_characters = int(t * cps)
	r.visible_ratio = 1.0
	typing = false
	await get_tree().create_timer(0.15).timeout

func heading(num: String, title: String) -> void:
	if main.autoplay:
		print("== Part ", num, ": ", title)
	var r := _rich(16)
	r.text = "[center][color=#%s][font_size=15]PART %s[/font_size]\n[font_size=26]%s[/font_size][/color][/center]" % [C_GOLD.to_html(false), num, title]
	log_box.add_child(r)
	var sep := HSeparator.new()
	log_box.add_child(sep)
	await get_tree().process_frame

# ---------- choices ----------
func clear_actions() -> void:
	for c in actions.get_children():
		c.queue_free()

func _button(label: String, plain := false) -> Button:
	var b := Button.new()
	b.text = label
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	b.custom_minimum_size = Vector2(0, 46)
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	if plain:
		b.add_theme_stylebox_override("normal", _sb(Color(0, 0, 0, 0.2), Color("4a3e2c"), 8, 10))
		b.add_theme_color_override("font_color", Color("cdbf9f"))
	return b

func choose(opts: Array) -> String:
	clear_actions()
	for o in opts:
		var lab: String = o.label
		if o.has("tag"):
			lab += "   · " + o.tag
		var b := _button(lab, o.get("plain", false))
		var k: String = o.key
		b.pressed.connect(func(): chosen.emit(k))
		actions.add_child(b)
	if main.autoplay:
		var pick: String = opts[main.rng.randi_range(0, opts.size() - 1)].key
		_auto(func(): chosen.emit(pick))
	var key: String = await chosen
	var picked := ""
	for o in opts:
		if o.key == key:
			picked = o.label
	clear_actions()
	var r := _rich(16)
	r.text = "[color=#8a7a5a]> %s[/color]" % picked
	log_box.add_child(r)
	if main.autoplay:
		print("  > ", picked)
	return key

func _auto(f: Callable) -> void:
	await get_tree().create_timer(0.05 if main.fast else 0.5).timeout
	f.call()

func show_go(label: String, has_marker: bool) -> void:
	clear_actions()
	var b := _button(label)
	b.alignment = HORIZONTAL_ALIGNMENT_CENTER
	b.pressed.connect(func(): main.advance.emit("button"))
	actions.add_child(b)
	if has_marker:
		var hint := Label.new()
		hint.text = "Or walk to the glowing ring yourself (tap the ground, or WASD)."
		hint.add_theme_font_size_override("font_size", 13)
		hint.add_theme_color_override("font_color", Color("8a7a5a"))
		hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		actions.add_child(hint)
	if main.autoplay:
		_auto(func(): main.advance.emit("button"))

# ---------- dice ----------
# info: label, meta, cta, dice (Array of ints), names (optional labels under dice),
# keep (index of the die that counts, or -1 for all), result (text), ok (bool)
func roll_card(info: Dictionary) -> void:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _sb(Color(0.07, 0.06, 0.05, 0.9), Color("8a6d3e"), 10, 10))
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	card.add_child(v)
	var lab := Label.new()
	lab.text = info.label
	lab.add_theme_color_override("font_color", C_GOLD)
	lab.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(lab)
	var meta := Label.new()
	meta.text = info.meta
	meta.add_theme_font_size_override("font_size", 14)
	meta.add_theme_color_override("font_color", C_MECH)
	meta.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(meta)
	var dh := HBoxContainer.new()
	dh.add_theme_constant_override("separation", 12)
	v.add_child(dh)
	var faces := []
	var dice: Array = info.dice
	for i in dice.size():
		var dv := VBoxContainer.new()
		var face := Label.new()
		face.text = "20"
		face.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		face.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		face.custom_minimum_size = Vector2(58, 58)
		face.add_theme_font_size_override("font_size", 26)
		face.add_theme_stylebox_override("normal", _sb(Color("2c2318"), C_GOLD, 12, 4))
		dv.add_child(face)
		if info.has("names"):
			var nl := Label.new()
			nl.text = info.names[i]
			nl.add_theme_font_size_override("font_size", 12)
			nl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			dv.add_child(nl)
		dh.add_child(dv)
		faces.append(face)
	var out := RichTextLabel.new()
	out.bbcode_enabled = true
	out.fit_content = true
	out.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	out.add_theme_font_size_override("normal_font_size", 16)
	out.add_theme_font_size_override("bold_font_size", 16)
	v.add_child(out)
	log_box.add_child(card)
	clear_actions()
	var b := _button(info.cta)
	b.alignment = HORIZONTAL_ALIGNMENT_CENTER
	b.pressed.connect(func(): rolled.emit())
	actions.add_child(b)
	if main.autoplay:
		_auto(func(): rolled.emit())
	await rolled
	clear_actions()
	main.world.dice_sound()
	var t0 := Time.get_ticks_msec()
	if not main.fast:
		while Time.get_ticks_msec() - t0 < 650:
			for f in faces:
				f.text = str(main.rng.randi_range(1, 20))
			await get_tree().create_timer(0.06).timeout
	var keep: int = info.get("keep", -1)
	for i in faces.size():
		faces[i].text = str(dice[i])
		if keep >= 0 and i != keep:
			faces[i].modulate = Color(1, 1, 1, 0.4)
	var col := C_LOOT if info.ok else C_HURT
	out.text = "[color=#%s]%s[/color]" % [col.to_html(false), info.result]
	if main.autoplay:
		print("  [roll] ", info.label, ": ", info.result)
	await get_tree().create_timer(0.1 if main.fast else 0.45).timeout

# ---------- fades ----------
func fade_out(t := 0.8) -> void:
	fade_rect.mouse_filter = Control.MOUSE_FILTER_STOP
	var tw := create_tween()
	tw.tween_property(fade_rect, "color:a", 1.0, 0.05 if main.fast else t)
	await tw.finished

func fade_in(t := 0.9) -> void:
	var tw := create_tween()
	tw.tween_property(fade_rect, "color:a", 0.0, 0.05 if main.fast else t)
	await tw.finished
	fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE

# ---------- title, name card, end card ----------
func _overlay() -> Dictionary:
	var o := ColorRect.new()
	o.color = Color(0.03, 0.025, 0.02, 0.97)
	o.set_meta("full", true)
	o.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(o)
	root.move_child(o, root.get_child_count() - 2)
	_place(o, Vector2.ZERO, view)
	var cc := CenterContainer.new()
	cc.set_anchors_preset(Control.PRESET_FULL_RECT)
	o.add_child(cc)
	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(min(440.0, view.x - 40), 0)
	box.add_theme_constant_override("separation", 14)
	cc.add_child(box)
	return {"o": o, "box": box}

func _lbl(parent: Control, text: String, size: int, col := C_TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	parent.add_child(l)
	return l

func title_screen() -> Dictionary:
	await fade_in(1.2)
	# The warning, as the web game opens.
	var w := _overlay()
	_lbl(w.box, "WARNING", 34, C_HURT)
	_lbl(w.box, "The stories say the labyrinth was sealed.", 19)
	_lbl(w.box, "The stories are wrong.", 19)
	var enter := _button("ENTER")
	enter.alignment = HORIZONTAL_ALIGNMENT_CENTER
	w.box.add_child(enter)
	if main.autoplay:
		await main.shot("warning")
		_auto(func(): enter.pressed.emit())
	await enter.pressed
	w.o.queue_free()
	var t := _overlay()
	_lbl(t.box, "LABYRINTH OF ROOTS", 32, C_GOLD)
	_lbl(t.box, "The Descent, in 3D · Parts I to IV", 17, C_MECH)
	_lbl(t.box, "Created by: Adrian Blackshire and Claude", 15, Color("b0a080"))
	_lbl(t.box, "What do they call you?", 17)
	var name_in := LineEdit.new()
	name_in.placeholder_text = "Your name"
	name_in.max_length = 24
	name_in.alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_in.custom_minimum_size = Vector2(0, 46)
	t.box.add_child(name_in)
	_lbl(t.box, "How should the story speak of you?", 15, C_MECH)
	var ph := HBoxContainer.new()
	ph.alignment = BoxContainer.ALIGNMENT_CENTER
	ph.add_theme_constant_override("separation", 8)
	t.box.add_child(ph)
	var pr := ["they"]
	var pbs := []
	for p in [["he", "He"], ["she", "She"], ["they", "They"]]:
		var b := _button(p[1], true)
		b.toggle_mode = true
		b.custom_minimum_size = Vector2(84, 44)
		b.alignment = HORIZONTAL_ALIGNMENT_CENTER
		b.button_pressed = p[0] == "they"
		var key: String = p[0]
		b.pressed.connect(func():
			pr[0] = key
			for x in pbs:
				x.button_pressed = x == b)
		pbs.append(b)
		ph.add_child(b)
	var begin := _button("Begin the descent")
	begin.alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.box.add_child(begin)
	_lbl(t.box, "Tap the ground or use WASD to walk. Tap the story panel to hurry the text.", 13, Color("8a7a5a"))
	if main.autoplay:
		name_in.text = "Tester"
		await main.shot("title")
		_auto(func(): begin.pressed.emit())
	await begin.pressed
	var nm := name_in.text.strip_edges()
	t.o.queue_free()
	return {"name": nm if nm != "" else "Wanderer", "pr": pr[0]}

func end_card(S: Dictionary) -> void:
	await get_tree().create_timer(0.4).timeout
	var e := _overlay()
	_lbl(e.box, "END OF THE FIRST DESCENT", 26, C_GOLD)
	_lbl(e.box, "Ryytaa the Ender is dead, and the nest is quiet.", 18)
	var notes := "You came through with %d of %d HP" % [S.hp, S.max_hp]
	notes += ", the shield on your arm" if S.shield else ""
	notes += ", and the strangers' blessing still unspent." if S.blessing else "."
	_lbl(e.box, notes, 16, C_MECH)
	_lbl(e.box, "Next in 3D: the Library of Roots, then the desert.", 16)
	_lbl(e.box, "Created by: Adrian Blackshire and Claude", 14, Color("b0a080"))
	var again := _button("Play again")
	again.alignment = HORIZONTAL_ALIGNMENT_CENTER
	e.box.add_child(again)
	if main.autoplay:
		print("== END: ", notes)
		await main.shot("end-card")
		await get_tree().create_timer(0.3).timeout
		main.get_tree().quit()
		return
	await again.pressed
	main.get_tree().reload_current_scene()
