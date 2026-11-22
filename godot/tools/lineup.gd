# Renders every Blender model side by side to a PNG, for checking art changes.
#   godot --path godot --script res://tools/lineup.gd -- out.png   (needs a display)
extends SceneTree

const M = preload("res://scripts/models.gd")

func _init() -> void:
	var out := "lineup.png"
	var ua := OS.get_cmdline_user_args()
	if ua.size() > 0:
		out = ua[0]
	var root := Node3D.new()
	get_root().add_child(root)
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("1a1512")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("807870")
	env.ambient_light_energy = 0.6
	var we := WorldEnvironment.new()
	we.environment = env
	root.add_child(we)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-40, 30, 0)
	sun.light_energy = 1.3
	sun.shadow_enabled = true
	root.add_child(sun)
	var fill := DirectionalLight3D.new()
	fill.rotation_degrees = Vector3(-20, 200, 0)
	fill.light_energy = 0.4
	fill.light_color = Color("a0b0ff")
	root.add_child(fill)
	var row1 := ["hero", "stranger_a", "stranger_b", "vine_horror", "skeleton_hang_armor", "skeleton_hang_bare"]
	var row2 := ["spider", "ryytaa", "skeleton_sit", "egg_sac", "axe", "shield", "torch", "knife"]
	var x := -6.0
	for n in row1:
		var g := M.glb(n)
		g.position = Vector3(x, 0, 0)
		g.rotation_degrees.y = 200
		root.add_child(g)
		x += 2.4 if n != "vine_horror" else 3.0
	x = -7.0
	for n in row2:
		var g := M.glb(n)
		var s := 1.0
		if n == "ryytaa":
			s = 1.4
		if n in ["axe", "shield", "torch", "knife"]:
			s = 1.6
		g.scale = Vector3.ONE * s
		g.position = Vector3(x, 0, 3.2)
		g.visible = true
		g.rotation_degrees.y = 200 if not n in ["axe", "knife"] else 270
		root.add_child(g)
		x += 2.6 if n in ["spider", "ryytaa"] else 1.7
	var cam := Camera3D.new()
	cam.fov = 40
	root.add_child(cam)
	cam.make_current()
	for shot in [[Vector3(1.2, 2.6, 8.0), Vector3(1.2, 1.1, 0), "-figures"], [Vector3(0.5, 2.6, 9.0), Vector3(0.5, 0.5, 3.2), "-props"]]:
		cam.position = shot[0]
		cam.look_at(shot[1])
		for i in 6:
			await process_frame
		await RenderingServer.frame_post_draw
		get_root().get_texture().get_image().save_png(out.get_basename() + shot[2] + ".png")
	print("saved ", out)
	quit()
