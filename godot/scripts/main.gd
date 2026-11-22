# Labyrinth of Roots 3D. Created by: Adrian Blackshire and Claude.
# Builds the world, the story panel and the story, then runs Parts I to IV.
#
# Test flags (after "--" on the command line):
#   --autoplay        picks choices and presses every button by itself
#   --seed=N          fixes the dice
#   --shots=DIR       saves screenshots at the story's key moments
#   --fast            no typewriter, short waits (for headless runs)
extends Node3D

signal advance(how)

var rng := RandomNumberGenerator.new()
var ui
var world
var story
var autoplay := false
var fast := false
var shots_dir := ""
var shot_n := 0

func _ready() -> void:
	var seeded := false
	for a in OS.get_cmdline_user_args():
		if a == "--autoplay":
			autoplay = true
		elif a == "--fast":
			fast = true
		elif a.begins_with("--seed="):
			rng.seed = int(a.substr(7))
			seeded = true
		elif a.begins_with("--shots="):
			shots_dir = a.substr(8)
	if not seeded:
		rng.randomize()
	world = preload("res://scripts/world.gd").new()
	world.name = "World"
	world.main = self
	add_child(world)
	ui = preload("res://scripts/ui.gd").new()
	ui.name = "UI"
	ui.main = self
	add_child(ui)
	story = preload("res://scripts/story.gd").new()
	story.name = "Story"
	story.main = self
	add_child(story)
	if fast:
		Engine.time_scale = 4.0
	get_tree().root.size_changed.connect(_fit)
	_fit()
	story.run()

# Keeps text readable on phones and desktops alike: the UI scale follows the screen,
# and the 3D camera is told how much of the screen the story panel covers.
func _fit() -> void:
	var win := get_tree().root
	var ws := Vector2(win.size)
	if ws.x < 2 or ws.y < 2:
		return
	var dpr := DisplayServer.screen_get_scale()
	var f: float = max(min(ws.x / 520.0, ws.y / 760.0), dpr)
	f = clamp(f, 0.75, 4.0)
	win.content_scale_size = Vector2i(int(ws.x / f), int(ws.y / f))
	if ui:
		ui.layout(Vector2(ws.x / f, ws.y / f))

func shot(tag: String) -> void:
	if shots_dir == "":
		return
	await get_tree().create_timer(0.6).timeout
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	shot_n += 1
	DirAccess.make_dir_recursive_absolute(shots_dir)
	img.save_png(shots_dir.path_join("%02d-%s.png" % [shot_n, tag]))
	print("[shot] ", tag)
