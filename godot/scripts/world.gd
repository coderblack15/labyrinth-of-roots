# The 3D world: stages for Parts I to IV, the hero mini you walk, the camera,
# light moods, goal rings, and every animated beat the story asks for.
extends Node3D

const M = preload("res://scripts/models.gd")

signal arrived

var main
var env: Environment
var sky_mat: ProceduralSkyMaterial
var sun: DirectionalLight3D
var cam: Camera3D
var player: CharacterBody3D
var hero: Node3D
var torch_light: OmniLight3D
var dim_light: OmniLight3D
var gem_light: OmniLight3D
var stage: Node3D
var stage_name := ""
var props := {}
var markers := {}
var spawn := Vector3.ZERO

var cam_offset := Vector3(0, 6.2, 6.6)
var cam_look_off := Vector3(0, 1.0, -1.6)
var cam_fixed := false
var cam_fixed_pos := Vector3.ZERO
var cam_fixed_look := Vector3.ZERO
var cam_look := Vector3.ZERO
var shake := 0.0
var inset := Vector2.ZERO  # share of the screen the story panel covers (right, bottom)

var input_on := true
var target = null
var auto_walking := false
var stuck_t := 0.0
var crouch := false
var speed := 4.2
var goal_active := false
var goal_pos := Vector3.ZERO
var goal_ring: Node3D
var torch_dim := false
var torch_e := 3.2
var walk_t := 0.0
var music: AudioStreamPlayer
var music_key := ""

func _ready() -> void:
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	sky_mat = ProceduralSkyMaterial.new()
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	sun.shadow_enabled = true
	sun.rotation_degrees = Vector3(-14, 25, 0)
	add_child(sun)
	cam = Camera3D.new()
	cam.projection = Camera3D.PROJECTION_FRUSTUM
	cam.near = 0.1
	cam.far = 220.0
	add_child(cam)
	cam.make_current()
	player = CharacterBody3D.new()
	player.name = "Player"
	var col := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.38
	capsule.height = 1.8
	col.shape = capsule
	col.position = Vector3(0, 0.9, 0)
	player.add_child(col)
	add_child(player)
	hero = M.hero()
	player.add_child(hero)
	_hold("hand_r", M.knife(), Vector3.ZERO, Vector3(-80, 0, 0))
	torch_light = OmniLight3D.new()
	torch_light.light_color = Color("ffa050")
	torch_light.omni_range = 14.0
	torch_light.omni_attenuation = 1.3
	torch_light.shadow_enabled = false
	torch_light.position = Vector3(-0.35, 1.9, -0.3)
	torch_light.visible = false
	player.add_child(torch_light)
	dim_light = OmniLight3D.new()
	dim_light.light_color = Color("8090b0")
	dim_light.light_energy = 0.55
	dim_light.omni_range = 6.0
	dim_light.position = Vector3(0, 3.0, 1.0)
	dim_light.visible = false
	player.add_child(dim_light)
	gem_light = OmniLight3D.new()
	gem_light.light_color = Color("ff3030")
	gem_light.light_energy = 0.0
	gem_light.omni_range = 9.0
	gem_light.position = Vector3(0.4, 1.4, -0.6)
	player.add_child(gem_light)
	goal_ring = _make_ring()
	add_child(goal_ring)
	goal_ring.visible = false
	music = AudioStreamPlayer.new()
	music.volume_db = -8.0
	add_child(music)

func _make_ring() -> Node3D:
	var r := Node3D.new()
	var t := TorusMesh.new()
	t.inner_radius = 0.55
	t.outer_radius = 0.7
	t.rings = 24
	t.ring_segments = 6
	M.part(r, t, M.glow(Color("e8c070"), 2.2), Vector3(0, 0.06, 0), Vector3.ZERO, Vector3(1, 0.2, 1))
	var beam := M.part(r, M.cyl(0.6, 0.6, 2.6, 16), M.mat(Color("e8c070"), 1.0, Color("e8c070"), 0.6, 0.12), Vector3(0, 1.3, 0))
	beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var l := OmniLight3D.new()
	l.light_color = Color("e8c070")
	l.light_energy = 0.7
	l.omni_range = 3.0
	l.position = Vector3(0, 0.6, 0)
	r.add_child(l)
	return r

func _hold(hand: String, item: Node3D, pos: Vector3, rot: Vector3) -> Node3D:
	var h := hero.find_child(hand, true, false) as Node3D
	for c in h.get_children():
		c.queue_free()
	item.position = pos
	item.rotation_degrees = rot
	h.add_child(item)
	return item

func dice_sound() -> void:
	pass

func play_music(key: String) -> void:
	if key == music_key:
		return
	music_key = key
	var path := "res://audio/%s.ogg" % key
	if not ResourceLoader.exists(path):
		return
	var s = load(path)
	if s is AudioStreamOggVorbis:
		s.loop = true
	var tw := create_tween()
	if music.playing:
		tw.tween_property(music, "volume_db", -40.0, 1.2)
	tw.tween_callback(func():
		music.stream = s
		music.volume_db = -8.0
		music.play())

# ---------- frame loop ----------
func _physics_process(delta: float) -> void:
	var dir := Vector3.ZERO
	if input_on and not auto_walking:
		var k := Vector2.ZERO
		if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
			k.y -= 1
		if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
			k.y += 1
		if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
			k.x -= 1
		if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
			k.x += 1
		if k != Vector2.ZERO:
			target = null
			dir = Vector3(k.x, 0, k.y).normalized()
	if dir == Vector3.ZERO and target != null:
		var to: Vector3 = target - player.global_position
		to.y = 0
		if to.length() < 0.2:
			target = null
			if auto_walking:
				auto_walking = false
				arrived.emit()
		else:
			dir = to.normalized()
	var spd := speed * (0.45 if crouch else 1.0)
	var before := player.global_position
	player.velocity.x = dir.x * spd
	player.velocity.z = dir.z * spd
	if player.is_on_floor():
		player.velocity.y = -0.5
	else:
		player.velocity.y -= 20.0 * delta
	player.move_and_slide()
	if dir != Vector3.ZERO:
		var want := atan2(-dir.x, -dir.z)
		player.rotation.y = lerp_angle(player.rotation.y, want, 1.0 - exp(-delta * 10.0))
		walk_t += delta * 9.0
		hero.position.y = abs(sin(walk_t)) * 0.06
	else:
		hero.position.y = lerp(hero.position.y, 0.0, 0.3)
	if auto_walking:
		if player.global_position.distance_to(before) < spd * delta * 0.25:
			stuck_t += delta
		else:
			stuck_t = 0.0
		if stuck_t > 0.8:
			player.global_position = Vector3(target.x, player.global_position.y, target.z)
			target = null
			auto_walking = false
			stuck_t = 0.0
			arrived.emit()
	if player.global_position.y < -15:
		player.global_position = spawn
	if goal_active:
		var g := player.global_position
		if Vector2(g.x - goal_pos.x, g.z - goal_pos.z).length() < 0.9:
			goal_active = false
			main.advance.emit("walk")

func _process(delta: float) -> void:
	var wp: Vector3
	var wl: Vector3
	if cam_fixed:
		wp = cam_fixed_pos
		wl = cam_fixed_look
	else:
		wp = player.global_position + cam_offset
		wl = player.global_position + cam_look_off
		# Pull the camera in when a wall stands between it and the hero.
		var head := player.global_position + Vector3(0, 1.6, 0)
		var q := PhysicsRayQueryParameters3D.create(head, wp)
		q.exclude = [player.get_rid()]
		var hit := get_world_3d().direct_space_state.intersect_ray(q)
		if not hit.is_empty():
			wp = head + (hit.position - head) * 0.85
	var k := 1.0 - exp(-delta * 4.0)
	cam.global_position = cam.global_position.lerp(wp, k)
	cam_look = cam_look.lerp(wl, 1.0 - exp(-delta * 5.0))
	var sh := Vector3.ZERO
	if shake > 0.0:
		shake = max(0.0, shake - delta * 2.5)
		sh = Vector3(randf_range(-1, 1), randf_range(-1, 1), randf_range(-1, 1)) * shake * 0.25
	if cam.global_position.distance_to(cam_look + sh) > 0.01:
		cam.look_at(cam_look + sh, Vector3.UP)
	_frustum()
	if torch_light.visible:
		var fl := torch_e * (0.35 if torch_dim else 1.0)
		torch_light.light_energy = fl * (0.88 + 0.12 * sin(Time.get_ticks_msec() * 0.013) * sin(Time.get_ticks_msec() * 0.0071))
	if goal_ring.visible:
		goal_ring.rotation.y += delta * 1.2
		goal_ring.scale = Vector3.ONE * (1.0 + 0.06 * sin(Time.get_ticks_msec() * 0.005))
	if props.has("runes"):
		for i in props.runes.size():
			var m: StandardMaterial3D = props.runes[i].material_override
			m.emission_energy_multiplier = 0.6 + 0.6 * sin(Time.get_ticks_msec() * 0.002 + i * 1.7) * (2.5 if props.get("runes_hot", false) else 1.0)
	if props.has("vine") and props.vine.visible:
		props.vine.rotation.y = sin(Time.get_ticks_msec() * 0.0013) * 0.15

# Off-centre projection, so the action sits in the part of the screen the story panel leaves free.
func set_inset(right: float, bottom: float) -> void:
	inset = Vector2(right, bottom)

func _frustum() -> void:
	var vs := get_viewport().get_visible_rect().size
	if vs.y <= 0:
		return
	var aspect := vs.x / vs.y
	var portrait := aspect < 1.0
	var fov := 62.0 if portrait else 52.0
	if portrait:
		cam.keep_aspect = Camera3D.KEEP_WIDTH
		cam.size = 2.0 * cam.near * tan(deg_to_rad(fov * 0.5))
		var h := cam.size / aspect
		cam.frustum_offset = Vector2(0, -inset.y * h * 0.5)
	else:
		cam.keep_aspect = Camera3D.KEEP_HEIGHT
		cam.size = 2.0 * cam.near * tan(deg_to_rad(fov * 0.5))
		var w := cam.size * aspect
		cam.frustum_offset = Vector2(inset.x * w * 0.5, -inset.y * cam.size * 0.5)

func _unhandled_input(e: InputEvent) -> void:
	if not input_on or auto_walking:
		return
	if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		var from := cam.project_ray_origin(e.position)
		var to := from + cam.project_ray_normal(e.position) * 200.0
		var q := PhysicsRayQueryParameters3D.create(from, to)
		q.exclude = [player.get_rid()]
		var hit := get_world_3d().direct_space_state.intersect_ray(q)
		if not hit.is_empty() and hit.normal.y > 0.6:
			target = hit.position
			_tap_fx(hit.position)

func _tap_fx(p: Vector3) -> void:
	var t := TorusMesh.new()
	t.inner_radius = 0.18
	t.outer_radius = 0.24
	var mi := M.part(self, t, M.glow(Color("e8d8b0"), 1.5), p + Vector3(0, 0.05, 0), Vector3.ZERO, Vector3(1, 0.2, 1))
	var tw := create_tween()
	tw.tween_property(mi, "scale", Vector3(2.2, 0.2, 2.2), 0.35)
	tw.tween_callback(mi.queue_free)

# ---------- walking and goals ----------
func set_goal(name: String) -> void:
	goal_pos = markers[name]
	goal_ring.global_position = goal_pos
	goal_ring.visible = true
	goal_active = true

func clear_goal() -> void:
	goal_active = false
	goal_ring.visible = false

func walk_to(p: Vector3) -> void:
	target = Vector3(p.x, player.global_position.y, p.z)
	auto_walking = true
	stuck_t = 0.0
	await arrived

func walk_to_goal() -> void:
	goal_active = false
	await walk_to(goal_pos)

func walk_to_marker(name: String) -> void:
	await walk_to(markers[name])

func face(p: Vector3) -> void:
	var d := p - player.global_position
	var want := atan2(-d.x, -d.z)
	var tw := create_tween()
	tw.tween_property(player, "rotation:y", player.rotation.y + wrapf(want - player.rotation.y, -PI, PI), 0.3)
	await tw.finished

func place_player(p: Vector3, yaw_deg := 0.0) -> void:
	spawn = p
	player.global_position = p
	player.velocity = Vector3.ZERO
	player.rotation.y = deg_to_rad(yaw_deg)
	target = null
	auto_walking = false
	if not cam_fixed:
		cam.global_position = p + cam_offset
		cam_look = p + cam_look_off

func wait(t: float) -> void:
	await get_tree().create_timer(t).timeout

# ---------- light moods ----------
func set_light(mode: String, t := 1.2) -> void:
	var tw := create_tween().set_parallel(true)
	var sky_top := Color("030305")
	var sky_hor := Color("050507")
	var gnd := Color("030303")
	var amb := Color("141420")
	var amb_e := 0.35
	var sun_e := 0.0
	var fog_c := Color("000000")
	var fog_d := 0.03
	torch_light.visible = mode in ["torch", "gems"]
	dim_light.visible = mode == "dark"
	match mode:
		"dusk":
			sky_top = Color("2a1f4a")
			sky_hor = Color("c0708a")
			gnd = Color("2a1c24")
			amb = Color("7a6a90")
			amb_e = 0.55
			sun_e = 1.15
			fog_c = Color("6a5070")
			fog_d = 0.012
			sun.light_color = Color("ffb08a")
		"torch":
			amb = Color("1e1a22")
			amb_e = 0.45
			fog_d = 0.02
		"gems":
			amb = Color("2a1416")
			amb_e = 0.5
			fog_d = 0.02
	tw.tween_property(sky_mat, "sky_top_color", sky_top, t)
	tw.tween_property(sky_mat, "sky_horizon_color", sky_hor, t)
	tw.tween_property(sky_mat, "ground_horizon_color", sky_hor.darkened(0.3), t)
	tw.tween_property(sky_mat, "ground_bottom_color", gnd, t)
	tw.tween_property(env, "ambient_light_color", amb, t)
	tw.tween_property(env, "ambient_light_energy", amb_e, t)
	tw.tween_property(env, "fog_light_color", fog_c, t)
	tw.tween_property(env, "fog_density", fog_d, t)
	tw.tween_property(sun, "light_energy", sun_e, t)
	tw.tween_property(gem_light, "light_energy", 3.5 if mode == "gems" else (0.35 if main.story.S.get("axe", false) else 0.0), t * 0.5)
	await tw.finished

# ---------- stage building ----------
func clear_stage() -> void:
	if stage:
		stage.queue_free()
	stage = Node3D.new()
	add_child(stage)
	props = {}
	markers = {}

func solid(size: Vector3, pos: Vector3, m: Material, rot := Vector3.ZERO, show := true) -> StaticBody3D:
	var b := StaticBody3D.new()
	b.position = pos
	b.rotation_degrees = rot
	var cs := CollisionShape3D.new()
	var sh := BoxShape3D.new()
	sh.size = size
	cs.shape = sh
	b.add_child(cs)
	if show:
		M.part(b, M.box(size.x, size.y, size.z), m)
	stage.add_child(b)
	return b

func deco(mesh: Mesh, m: Material, pos := Vector3.ZERO, rot := Vector3.ZERO, scl := Vector3.ONE) -> MeshInstance3D:
	return M.part(stage, mesh, m, pos, rot, scl)

func web(pos: Vector3, w: float, h: float, rot := Vector3.ZERO, seed_v := 1) -> MeshInstance3D:
	var q := QuadMesh.new()
	q.size = Vector2(w, h)
	var mi := deco(q, M.web_mat(seed_v), pos, rot)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi

func build(name: String) -> void:
	clear_stage()
	stage_name = name
	cam_fixed = false
	call("_build_" + name)

func change_stage(name: String) -> void:
	await main.ui.fade_out(0.7)
	build(name)
	await get_tree().process_frame
	await main.ui.fade_in(0.9)

# Part I: the ceremonial pathway down to the labyrinth gate, at dusk.
func _build_pathway() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 11
	solid(Vector3(40, 0.2, 70), Vector3(0, -0.1, -18), M.mat(Color("3a3230")))
	deco(M.box(2.8, 0.03, 44), M.mat(Color("6a625a"), 0.9), Vector3(0, 0.015, -12))
	for i in 22:
		var z := 6.0 - i * 2.0
		deco(M.box(2.6, 0.035, 0.08), M.mat(Color("4a4440")), Vector3(0, 0.02, z))
	for side in [-1, 1]:
		for i in 22:
			var z := 7.0 - i * 1.8
			var h := 1.6 + (7.0 - z) * 0.3 + rng.randf_range(-0.6, 0.8)
			var w := rng.randf_range(1.6, 2.6)
			var c := M.C_STONE.lerp(Color("6a5a60"), rng.randf()).darkened(rng.randf_range(0.0, 0.3))
			solid(Vector3(w, h, 2.2), Vector3(side * (3.0 + w * 0.5 + rng.randf_range(0, 0.6)), h * 0.5, z), M.mat(c, 0.95), Vector3(0, rng.randf_range(-12, 12), rng.randf_range(-4, 4)))
			if rng.randf() < 0.4:
				deco(M.sph(rng.randf_range(0.3, 0.6), 6), M.mat(Color("4a5a3a")), Vector3(side * rng.randf_range(1.8, 2.6), 0.1, z), Vector3.ZERO, Vector3(1, 0.5, 1))
	# far peaks
	for i in 9:
		var x := -60.0 + i * 15.0 + rng.randf_range(-4, 4)
		var h2 := rng.randf_range(18, 34)
		deco(M.cyl(0.0, h2 * 0.7, h2, 7), M.mat(Color("2e2638").lerp(Color("4a3a50"), rng.randf()), 1.0), Vector3(x, h2 * 0.5 - 2.0, -70 - rng.randf_range(0, 20)))
	# the outer gate
	var gs := M.mat(Color("6e6a64"), 0.95)
	solid(Vector3(5.5, 9, 1.5), Vector3(-4.25, 4.5, -32), gs)
	solid(Vector3(5.5, 9, 1.5), Vector3(4.25, 4.5, -32), gs)
	solid(Vector3(3.0, 3.5, 1.5), Vector3(0, 7.25, -32), gs)
	solid(Vector3(14, 0.6, 1.9), Vector3(0, 9.2, -32), M.mat(Color("5a5650")))
	solid(Vector3(3, 6, 0.4), Vector3(0, 3, -36.5), M.mat(Color("050404")))
	solid(Vector3(0.4, 6, 4), Vector3(-1.7, 3, -34.5), M.mat(Color("0a0908")))
	solid(Vector3(0.4, 6, 4), Vector3(1.7, 3, -34.5), M.mat(Color("0a0908")))
	deco(M.box(3, 0.2, 4.6), M.mat(Color("0a0908")), Vector3(0, 5.6, -34.4))
	# carvings: spirals, antlered figures, runes
	var carve := M.mat(Color("5a564f"), 1.0)
	var runes := []
	for p in [Vector2(-4.5, 6.4), Vector2(4.4, 6.0), Vector2(-3.3, 2.6), Vector2(3.6, 2.9), Vector2(0, 8.2)]:
		for k in 3:
			var t := TorusMesh.new()
			t.inner_radius = 0.18 + k * 0.22
			t.outer_radius = 0.26 + k * 0.22
			deco(t, carve, Vector3(p.x, p.y, -31.2), Vector3(90, 0, 0), Vector3(1, 0.4, 1))
	for side in [-1, 1]:
		var fig := Node3D.new()
		fig.position = Vector3(side * 5.6, 3.8, -31.2)
		stage.add_child(fig)
		M.limb(fig, Vector3(0, -1.6, 0), Vector3(0, 0.6, 0), 0.08, carve)
		M.part(fig, M.sph(0.25, 8), carve, Vector3(0, 0.95, 0), Vector3.ZERO, Vector3(1, 1, 0.4))
		for a in [-1, 1]:
			M.limb(fig, Vector3(0.1 * a, 1.1, 0), Vector3(0.6 * a, 1.9, 0), 0.04, carve)
			M.limb(fig, Vector3(0.4 * a, 1.6, 0), Vector3(0.75 * a, 1.55, 0), 0.03, carve)
			M.limb(fig, Vector3(0, 0.2, 0), Vector3(0.55 * a, -0.4, 0), 0.06, carve)
	for i in 14:
		var rm := M.mat(Color("7a6a9a"), 0.9, Color("9a70e0"), 0.6)
		var rx := rng.randf_range(-6.4, 6.4)
		if abs(rx) < 1.8:
			rx = sign(rx + 0.01) * 1.9
		var r := deco(M.box(0.12, rng.randf_range(0.3, 0.6), 0.05), rm, Vector3(rx, rng.randf_range(1.0, 8.5), -31.2), Vector3(0, 0, rng.randf_range(-40, 40)))
		runes.append(r)
	props.runes = runes
	# the hooded strangers, at the roadside for now
	var sa := M.stranger(Color("3a332c"))
	sa.position = Vector3(-2.3, 0, -8.5)
	sa.rotation_degrees.y = 180
	stage.add_child(sa)
	var sb := M.stranger(Color("2e3234"))
	sb.position = Vector3(2.3, 0, -8.8)
	sb.rotation_degrees.y = 180
	sb.scale = Vector3(1.08, 1.08, 1.08)
	stage.add_child(sb)
	props.sa = sa
	props.sb = sb
	markers.strangers = Vector3(0, 0, -6.4)
	markers.gate = Vector3(0, 0, -29.6)
	markers.gate_step = Vector3(0, 0, -30.4)
	markers.gate_in = Vector3(0, 0, -33.6)
	place_player(Vector3(0, 0.1, 5), 0)

# After the flight: dark stone corridors, and the webs ahead.
func _build_corridors() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 21
	solid(Vector3(20, 0.2, 40), Vector3(0, -0.1, -8), M.mat(Color("2e2a26")))
	for side in [-1, 1]:
		var z := 5.0
		while z > -24.0:
			var seg_len := rng.randf_range(1.6, 2.8)
			var c := M.C_STONE2.darkened(rng.randf_range(0.0, 0.35))
			if rng.randf() < 0.18 and z < 2 and z > -11:
				# a side passage, black and going nowhere you want to go
				deco(M.box(0.2, 4, seg_len), M.mat(Color("050505")), Vector3(side * 3.4, 2, z - seg_len * 0.5))
				solid(Vector3(1.8, 4, 0.3), Vector3(side * 2.5, 2, z), M.mat(c, 0.95), Vector3.ZERO, true)
				solid(Vector3(1.8, 4, 0.3), Vector3(side * 2.5, 2, z - seg_len), M.mat(c, 0.95), Vector3.ZERO, true)
				solid(Vector3(0.4, 4, seg_len), Vector3(side * 3.6, 2, z - seg_len * 0.5), M.mat(c, 0.95), Vector3.ZERO, false)
			else:
				solid(Vector3(0.8, 4.2, seg_len), Vector3(side * 2.0, 2.1, z - seg_len * 0.5), M.mat(c, 0.95))
			z -= seg_len
	solid(Vector3(4, 4.2, 0.6), Vector3(0, 2.1, -24), M.mat(M.C_STONE2))
	solid(Vector3(4, 4.2, 0.6), Vector3(0, 2.1, 5.5), null, Vector3.ZERO, false)
	# the web wall, with the dead hanging in it
	web(Vector3(0, 2.55, -14.0), 3.2, 3.3, Vector3.ZERO, 4)
	web(Vector3(0, 2.2, -14.7), 3.2, 4.2, Vector3(0, 12, 0), 5)
	web(Vector3(0, 2.0, -15.6), 3.2, 4.2, Vector3(0, -9, 0), 6)
	web(Vector3(-1.2, 3.2, -12.0), 2.0, 2.0, Vector3(0, 60, 30), 7)
	web(Vector3(1.3, 3.0, -10.5), 2.0, 2.0, Vector3(0, -55, -20), 8)
	for i in 5:
		var sk := M.skeleton(i % 2 == 0, false)
		sk.position = Vector3(-1.1 + i * 0.55, 1.0 + rng.randf_range(0, 0.8), -14.3 - i * 0.35)
		sk.rotation_degrees = Vector3(rng.randf_range(-10, 10), 180 + rng.randf_range(-30, 30), rng.randf_range(-20, 20))
		stage.add_child(sk)
		if i % 2 == 1:
			M.part(sk, M.box(0.05, 0.9, 0.08), M.mat(Color("6a4a30"), 0.6, Color(0, 0, 0, 0), 1.0, 1.0, 0.5), Vector3(0.3, 0.4, -0.1), Vector3(0, 0, 25))
	for i in 12:
		deco(M.cyl(0.006, 0.006, 4.0, 4), M.mat(Color("e8e4d8"), 0.9, Color("e8e4d8"), 0.2, 0.6), Vector3(rng.randf_range(-1.5, 1.5), 2.0, -14.0 - rng.randf_range(0, 2)), Vector3(rng.randf_range(-20, 20), 0, rng.randf_range(-30, 30)))
	props.blocker = solid(Vector3(3.6, 4, 0.4), Vector3(0, 2, -13.7), null, Vector3.ZERO, false)
	# the leg that reaches out of the dark
	var leg := Node3D.new()
	leg.position = Vector3(0.7, 2.4, -14.6)
	stage.add_child(leg)
	var lm := M.mat(Color("1e1916"), 0.7)
	M.limb(leg, Vector3.ZERO, Vector3(0, 0.6, 1.2), 0.07, lm)
	M.limb(leg, Vector3(0, 0.6, 1.2), Vector3(-0.2, -0.3, 2.3), 0.05, lm)
	for i in 10:
		M.part(leg, M.cyl(0.0, 0.015, 0.12, 4), lm, Vector3(0, 0.3 + i * 0.03, 0.5 + i * 0.12), Vector3(rng.randf_range(-60, 60), 0, rng.randf_range(-60, 60)))
	leg.scale = Vector3(1, 1, 0.01)
	leg.visible = false
	props.leg = leg
	markers.webs = Vector3(0, 0, -12.4)
	markers.beyond = Vector3(0, 0, -17.6)
	place_player(Vector3(0, 0.1, -1.0), 0)

# Part III: the round room grown like the inside of a hollow tree.
func _build_chamber() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 31
	solid(Vector3(24, 0.2, 34), Vector3(0, -0.1, -2), M.mat(Color("2a221a")))
	deco(M.cyl(9.4, 9.4, 0.02, 32), M.mat(Color("33281c")), Vector3(0, 0.01, 0))
	var n := 30
	for i in n:
		var a := TAU * i / n
		var p := Vector3(sin(a), 0, cos(a)) * 9.4
		var deg := rad_to_deg(a)
		if abs(wrapf(deg, -180, 180)) < 9 or abs(wrapf(deg - 180, -180, 180)) < 9:
			continue
		var c := M.C_BARK.lerp(M.C_BARK2, rng.randf()).darkened(rng.randf_range(0, 0.2))
		solid(Vector3(2.2, 8, 0.9), Vector3(p.x, 4, p.z), M.mat(c, 0.95), Vector3(0, deg, rng.randf_range(-3, 3)))
	# entrance passage (south) and the tunnel beyond the tree (north)
	for side in [-1, 1]:
		solid(Vector3(0.8, 4, 5), Vector3(side * 1.7, 2, 11.5), M.mat(M.C_STONE2))
		solid(Vector3(0.8, 4, 8), Vector3(side * 1.7, 2, -13), M.mat(M.C_BARK2))
	solid(Vector3(4, 4, 0.6), Vector3(0, 2, 14), M.mat(M.C_STONE2))
	solid(Vector3(4, 4, 0.6), Vector3(0, 2, -17), M.mat(Color("050404")))
	props.tunnel_seal = solid(Vector3(3.4, 6, 0.8), Vector3(0, 3, -9.6), M.mat(Color("3e3022"), 0.95))
	deco(M.cyl(9.6, 9.6, 0.3, 32), M.mat(Color("120d09")), Vector3(0, 8.2, 0))
	# roots knotting up into the ceiling
	var rm := M.mat(Color("3e3022"), 0.9)
	for i in 14:
		var a := TAU * (i + 0.5) / 14
		var foot := Vector3(sin(a) * 8.7, 0.2, cos(a) * 8.7)
		var knee := Vector3(sin(a + 0.12) * 8.6, 4.0, cos(a + 0.12) * 8.6)
		var tip := Vector3(sin(a + 0.25) * 8.0, 8.1, cos(a + 0.25) * 8.0)
		M.limb(stage, foot, knee, 0.24, rm)
		M.limb(stage, knee, tip, 0.18, rm)
		M.limb(stage, foot, foot * 0.8 + Vector3(0, -0.05, 0), 0.14, rm)
	# pale thorn bushes from cracks in the floor
	var leaf := M.mat(Color("b8bca0"), 0.8)
	var thorn := M.mat(Color("6a6050"), 0.7)
	for i in 16:
		var a := rng.randf() * TAU
		var r := rng.randf_range(3.5, 8.0)
		var p := Vector3(sin(a) * r, 0, cos(a) * r)
		if abs(p.x) < 1.6 and p.z > 0:
			continue
		for k in 5:
			deco(M.sph(0.22, 6), leaf, p + Vector3(rng.randf_range(-0.4, 0.4), 0.2 + rng.randf() * 0.3, rng.randf_range(-0.4, 0.4)), Vector3.ZERO, Vector3(1, 0.6, 1))
			deco(M.cyl(0.0, 0.03, 0.4, 4), thorn, p + Vector3(rng.randf_range(-0.4, 0.4), 0.4, rng.randf_range(-0.4, 0.4)), Vector3(rng.randf_range(-40, 40), 0, rng.randf_range(-40, 40)))
	# webs from root to root
	for i in 9:
		var a := TAU * i / 9 + 0.3
		web(Vector3(sin(a) * 7.0, rng.randf_range(4.0, 6.5), cos(a) * 7.0), rng.randf_range(2.5, 4.0), rng.randf_range(2.0, 3.0), Vector3(rng.randf_range(-20, 20), rad_to_deg(a) + 90, 0), 10 + i)
	# the dead trunk, split down the middle like a doorway
	var trunk := Node3D.new()
	trunk.position = Vector3(0, 0, -2)
	stage.add_child(trunk)
	var back := []
	var tn := 14
	for i in tn:
		var a := TAU * i / tn
		var deg := rad_to_deg(a)
		if abs(wrapf(deg, -180, 180)) < 30:
			continue
		var b := StaticBody3D.new()
		b.position = Vector3(sin(a) * 1.6, 2.6, cos(a) * 1.6)
		b.rotation_degrees = Vector3(rng.randf_range(-3, 3), deg, 0)
		var cs := CollisionShape3D.new()
		var sh := BoxShape3D.new()
		sh.size = Vector3(0.85, 5.2, 0.45)
		cs.shape = sh
		b.add_child(cs)
		M.part(b, M.box(0.85, 5.2 + rng.randf_range(-0.8, 0.8), 0.45), M.mat(M.C_BARK.darkened(rng.randf_range(0, 0.25)), 0.95))
		trunk.add_child(b)
		if abs(wrapf(deg - 180, -180, 180)) < 40:
			back.append(b)
	for i in 6:
		var a := TAU * i / 6 + 0.5
		M.limb(trunk, Vector3(sin(a) * 1.5, 0.6, cos(a) * 1.5), Vector3(sin(a) * 3.2, 0.05, cos(a) * 3.2), 0.18, rm)
	props.trunk_back = back
	var red := OmniLight3D.new()
	red.light_color = Color("ff2a1a")
	red.light_energy = 0.0
	red.omni_range = 10.0
	red.position = Vector3(0, 1.8, -2)
	stage.add_child(red)
	props.red = red
	# the dead warden against the roots, the axe across his lap
	var sk := M.skeleton(true, true)
	sk.position = Vector3(-6.2, 0, 1.4)
	sk.rotation_degrees.y = -100
	stage.add_child(sk)
	props.skel = sk
	var ax := M.axe()
	ax.position = Vector3(-5.75, 0.3, 1.1)
	ax.rotation_degrees = Vector3(0, -10, 90)
	stage.add_child(ax)
	props.axe = ax
	markers.skeleton = Vector3(-4.6, 0, 1.4)
	markers.trunk = Vector3(0, 0, 1.2)
	markers.tunnel = Vector3(0, 0, -11.5)
	place_player(Vector3(0, 0.1, 7.6), 0)

# Part IV: the nest. The fight field is a 7 by 7 grid of 1.3 m squares.
const SQ := 1.3
func sq(c: int, r: int) -> Vector3:
	return Vector3((c - 3) * SQ, 0, (r - 3) * SQ)

func _build_nest() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 41
	solid(Vector3(30, 0.2, 34), Vector3(0, -0.1, 0), M.mat(Color("2a2420")))
	deco(M.cyl(11.5, 11.5, 0.02, 32), M.mat(Color("3a3028")), Vector3(0, 0.01, 0))
	for i in 28:
		var a := TAU * i / 28
		var deg := rad_to_deg(a)
		if abs(wrapf(deg, -180, 180)) < 8:
			continue
		var r := 11.5 + rng.randf_range(-0.5, 0.8)
		var p := Vector3(sin(a) * r, 0, cos(a) * r)
		var s := rng.randf_range(2.0, 3.4)
		var c := M.C_STONE2.lerp(Color("3a3430"), rng.randf()).darkened(rng.randf_range(0, 0.3))
		var b := solid(Vector3(s * 1.4, 9, s), Vector3(p.x, 4.5, p.z), null, Vector3(0, deg, 0), false)
		M.part(b, M.sph(1.0, 8), M.mat(c, 0.95), Vector3.ZERO, Vector3(rng.randf_range(-10, 10), 0, 0), Vector3(s, 5.0, s * 0.9))
	if true:
		var exit_block := solid(Vector3(4, 6, 0.6), Vector3(0, 3, -12.6), null, Vector3.ZERO, false)
		props.exit_block = exit_block
		for side in [-1, 1]:
			solid(Vector3(0.8, 5, 6), Vector3(side * 2.0, 2.5, 13), M.mat(M.C_STONE2))
			solid(Vector3(0.8, 5, 4), Vector3(side * 2.0, 2.5, -14.5), M.mat(M.C_STONE2))
		solid(Vector3(4, 5, 0.6), Vector3(0, 2.5, 16), M.mat(M.C_STONE2))
		solid(Vector3(4, 5, 0.6), Vector3(0, 2.5, -17), M.mat(Color("050404")))
	deco(M.cyl(12.5, 12.5, 0.3, 32), M.mat(Color("0e0b09")), Vector3(0, 9.0, 0))
	# webs everywhere
	var webs := []
	for i in 14:
		var a := TAU * i / 14 + 0.2
		var r := rng.randf_range(6, 9.5)
		webs.append(web(Vector3(sin(a) * r, rng.randf_range(3.5, 7.5), cos(a) * r), rng.randf_range(3, 5), rng.randf_range(2.5, 4), Vector3(rng.randf_range(-30, 30), rad_to_deg(a) + 90, rng.randf_range(-20, 20)), 30 + i))
	webs.append(web(Vector3(0, 2.6, -12.0), 4.0, 5.0, Vector3.ZERO, 50))
	for i in 6:
		webs.append(web(Vector3(rng.randf_range(-6, 6), 8.0, rng.randf_range(-6, 6)), 5, 5, Vector3(90 + rng.randf_range(-20, 20), rng.randf_range(0, 180), 0), 60 + i))
	props.webs = webs
	# egg sacs as big as barrels
	var eggs := []
	for i in 16:
		var a := rng.randf_range(-2.6, 2.6) + PI
		var r := rng.randf_range(5.6, 9.6)
		var e := M.egg_sac()
		e.position = Vector3(sin(a) * r, 0, cos(a) * r)
		var s := rng.randf_range(0.7, 1.4)
		e.scale = Vector3(s, s * rng.randf_range(0.9, 1.3), s)
		stage.add_child(e)
		eggs.append(e)
	props.eggs = eggs
	var egl := OmniLight3D.new()
	egl.light_color = Color("a0a070")
	egl.light_energy = 0.5
	egl.omni_range = 12
	egl.position = Vector3(0, 3, -7)
	stage.add_child(egl)
	# the fight field
	var g := PlaneMesh.new()
	g.size = Vector2(SQ * 7, SQ * 7)
	var gm := StandardMaterial3D.new()
	gm.albedo_texture = M.grid_texture(7)
	gm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	gm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	gm.albedo_color = Color(1, 1, 1, 0)
	var grid := deco(g, gm, Vector3(0, 0.025, 0))
	props.grid = grid
	# Ryytaa, folded small in the dark at the back
	var ry := M.spider(true)
	ry.position = sq(3, 0) + Vector3(0, 0, -0.6)
	ry.scale = Vector3.ONE * 1.4
	ry.visible = false
	stage.add_child(ry)
	props.ryytaa = ry
	for k in ["a", "b", "c", "d"]:
		var sp := M.spider(false)
		sp.visible = false
		stage.add_child(sp)
		props["sp_" + k] = sp
	markers.field = sq(3, 5)
	markers.deeper = Vector3(0, 0, -15.0)
	place_player(Vector3(0, 0.1, 13.5), 0)

# ---------- little effects ----------
func float_text(p: Vector3, text: String, col: Color) -> void:
	var l := Label3D.new()
	l.text = text
	l.font_size = 72
	l.pixel_size = 0.008
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.no_depth_test = true
	l.modulate = col
	l.outline_size = 14
	l.outline_modulate = Color(0, 0, 0, 0.8)
	l.position = p
	add_child(l)
	var tw := create_tween().set_parallel(true)
	tw.tween_property(l, "position", p + Vector3(0, 1.4, 0), 1.1)
	tw.tween_property(l, "modulate:a", 0.0, 1.1).set_delay(0.4)
	tw.chain().tween_callback(l.queue_free)

func flash(p: Vector3, col: Color, energy := 4.0, t := 0.35, rng_ := 6.0) -> void:
	var l := OmniLight3D.new()
	l.light_color = col
	l.light_energy = energy
	l.omni_range = rng_
	l.position = p
	add_child(l)
	var tw := create_tween()
	tw.tween_property(l, "light_energy", 0.0, t)
	tw.tween_callback(l.queue_free)

func hero_hurt() -> void:
	shake = 0.6
	flash(player.global_position + Vector3(0, 1.2, 0), Color("ff2020"), 3.0, 0.3, 3.0)
	float_text(player.global_position + Vector3(0, 2.2, 0), "hit", Color("ff8070"))

func arm(side: String) -> Node3D:
	return hero.find_child("arm_" + side, true, false) as Node3D

func hero_swing() -> void:
	var a := arm("r")
	var tw := create_tween()
	tw.tween_property(a, "rotation_degrees:x", 200.0, 0.22).set_trans(Tween.TRANS_SINE)
	tw.tween_property(a, "rotation_degrees:x", 55.0, 0.12).set_trans(Tween.TRANS_EXPO)
	tw.tween_property(a, "rotation_degrees:x", 0.0, 0.35)
	await tw.finished

func hero_lunge(dist := 0.6) -> void:
	var tw := create_tween()
	tw.tween_property(hero, "position:z", -dist, 0.15)
	tw.tween_property(hero, "position:z", 0.0, 0.3)
	await tw.finished

func hero_crouch(on: bool) -> void:
	crouch = on
	var tw := create_tween()
	tw.tween_property(hero, "scale", Vector3(1.0, 0.45, 1.25) if on else Vector3.ONE, 0.35)
	await tw.finished

func hero_dodge(side := 1.0) -> void:
	var tw := create_tween()
	tw.tween_property(hero, "position:x", 0.9 * side, 0.15)
	tw.tween_property(hero, "rotation_degrees:z", -25.0 * side, 0.1)
	tw.tween_property(hero, "rotation_degrees:z", 0.0, 0.25)
	tw.parallel().tween_property(hero, "position:x", 0.0, 0.35)
	await tw.finished

func hero_brace(on: bool) -> void:
	var tw := create_tween()
	tw.tween_property(arm("l"), "rotation_degrees", Vector3(80, 0, 30) if on else Vector3.ZERO, 0.2)
	await tw.finished

func hero_take_torch() -> void:
	_hold("hand_l", M.torch(), Vector3.ZERO, Vector3(-60, 0, 0))
	arm("l").rotation_degrees = Vector3(35, 0, 0)

func hero_take_axe() -> void:
	var ax: Node3D = props.axe
	var hand := hero.find_child("hand_r", true, false) as Node3D
	var tw := create_tween()
	tw.tween_property(ax, "global_position", hand.global_position, 0.6).set_trans(Tween.TRANS_SINE)
	await tw.finished
	ax.queue_free()
	props.erase("axe")
	_hold("hand_r", M.axe(), Vector3(0, -0.1, 0), Vector3(-50, 0, 0))
	flash(player.global_position + Vector3(0, 1.4, 0), Color("ff5040"), 5.0, 1.2, 6.0)
	var tw2 := create_tween()
	tw2.tween_property(gem_light, "light_energy", 0.35, 0.8)

func hero_take_shield() -> void:
	var sh := M.shield()
	var a := arm("l")
	sh.position = Vector3(-0.1, -0.35, -0.05)
	sh.rotation_degrees = Vector3(0, 90, 0)
	sh.name = "Shield"
	a.add_child(sh)

func strangers_step_in() -> void:
	var tw := create_tween().set_parallel(true)
	tw.tween_property(props.sa, "position", Vector3(-0.6, 0, -7.8), 0.9)
	tw.tween_property(props.sb, "position", Vector3(0.6, 0, -8.0), 0.9)
	await tw.finished

func strangers_aside() -> void:
	var tw := create_tween().set_parallel(true)
	tw.tween_property(props.sa, "position", Vector3(-2.2, 0, -8.2), 1.0)
	tw.tween_property(props.sb, "position", Vector3(2.2, 0, -8.4), 1.0)
	tw.tween_property(props.sa, "rotation_degrees:y", 120.0, 1.0)
	tw.tween_property(props.sb, "rotation_degrees:y", 240.0, 1.0)
	await tw.finished

func give_coins() -> void:
	await hero_lunge(0.4)
	for i in 3:
		var c := M.part(self, M.cyl(0.06, 0.06, 0.015, 10), M.mat(Color("e0b040"), 0.3, Color("e0b040"), 0.6, 1.0, 0.9), player.global_position + Vector3(0, 1.0, -0.6))
		var tw := create_tween()
		tw.tween_property(c, "global_position", props.sa.global_position + Vector3(0.3, 1.0, 0.2 + i * 0.05), 0.4).set_delay(i * 0.12)
		tw.tween_callback(c.queue_free)
	await wait(0.6)

func runes_shift() -> void:
	props.runes_hot = true
	for r in props.runes:
		var tw := create_tween()
		tw.tween_property(r, "rotation_degrees:z", r.rotation_degrees.z + randf_range(-50, 50), 1.5)

func vine_rise() -> void:
	var v := M.vine_horror()
	var p := player.global_position + Vector3(-1.7, 0, 1.4)
	v.position = p + Vector3(0, -2.6, 0)
	v.scale = Vector3(0.6, 0.2, 0.6)
	stage.add_child(v)
	props.vine = v
	var l := OmniLight3D.new()
	l.light_color = Color("70a060")
	l.light_energy = 0.0
	l.omni_range = 5.0
	l.position = Vector3(0, 2.0, -1.0)
	v.add_child(l)
	var tw := create_tween().set_parallel(true)
	tw.tween_property(v, "position", p, 1.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(v, "scale", Vector3.ONE, 1.3)
	tw.tween_property(l, "light_energy", 1.1, 1.3)
	shake = 0.4
	await tw.finished
	await face(p)

func vine_lash(hit: bool) -> void:
	var a: Node3D = props.vine.get_node("lash_l")
	var tw := create_tween()
	tw.tween_property(a, "rotation_degrees", Vector3(0, -50, -30), 0.15)
	tw.tween_property(a, "rotation_degrees", Vector3.ZERO, 0.4)
	await wait(0.15)
	if hit:
		hero_hurt()
	else:
		await hero_dodge(-1)

func vine_recoil() -> void:
	var v: Node3D = props.vine
	flash(v.global_position + Vector3(0, 1.5, 0), Color("204010"), 2.0)
	float_text(v.global_position + Vector3(0, 2.4, 0), "gashed", Color("c0e0a0"))
	var tw := create_tween()
	tw.tween_property(v, "rotation_degrees:x", -18.0, 0.15)
	tw.tween_property(v, "rotation_degrees:x", 0.0, 0.6)
	await tw.finished

func flee() -> void:
	walk_to(markers.get("gate_in", player.global_position + Vector3(0, 0, -4)))
	await wait(0.9)

func flint(ok: bool) -> void:
	var hand := hero.find_child("hand_r", true, false) as Node3D
	var p := hand.global_position + Vector3(0, 0.1, -0.2)
	for i in 6:
		var s := M.part(self, M.sph(0.02, 4), M.glow(Color("ffd080"), 4.0), p)
		var tw := create_tween()
		tw.tween_property(s, "position", p + Vector3(randf_range(-0.5, 0.5), randf_range(-0.2, 0.6), randf_range(-0.5, 0.5)), 0.3)
		tw.tween_callback(s.queue_free)
	flash(p, Color("ffc060"), 2.5 if ok else 1.2, 0.25, 4.0)
	await wait(0.3)

func leg_reach() -> void:
	var leg: Node3D = props.leg
	leg.visible = true
	var tw := create_tween()
	tw.tween_property(leg, "scale", Vector3.ONE, 1.4).set_trans(Tween.TRANS_SINE)
	await tw.finished

func leg_flinch() -> void:
	var tw := create_tween()
	tw.tween_property(props.leg, "scale", Vector3(1, 1, 0.45), 0.25)
	await tw.finished

func leg_grab() -> void:
	var tw := create_tween()
	tw.tween_property(props.leg, "scale", Vector3(1, 1, 1.25), 0.15)
	tw.tween_property(props.leg, "scale", Vector3(1, 1, 0.3), 0.5)
	await wait(0.15)
	hero_hurt()
	await tw.finished

func crawl_through() -> void:
	props.blocker.queue_free()
	props.leg.visible = false
	await walk_to_marker("beyond")

func torch_sputter(on: bool) -> void:
	torch_dim = on

func trunk_glow() -> void:
	var tw := create_tween()
	tw.tween_property(props.red, "light_energy", 6.0, 0.6)
	tw.tween_property(props.red, "light_energy", 2.5, 0.8)
	shake = 0.3

func ghost_rise() -> void:
	var g := M.ghost()
	g.position = Vector3(0, -1.5, -0.6)
	g.scale = Vector3.ONE * 1.3
	stage.add_child(g)
	props.ghost = g
	var tw := create_tween()
	tw.tween_property(g, "position", Vector3(0, 0.9, -0.6), 2.2).set_trans(Tween.TRANS_SINE)
	await tw.finished
	var tw2 := create_tween().set_loops(0)
	tw2.tween_property(g, "position:y", 1.05, 1.4).set_trans(Tween.TRANS_SINE)
	tw2.tween_property(g, "position:y", 0.9, 1.4).set_trans(Tween.TRANS_SINE)
	props.ghost_tw = tw2

func hero_kneel(on: bool) -> void:
	var tw := create_tween()
	tw.tween_property(hero, "scale", Vector3(1, 0.7, 1) if on else Vector3.ONE, 0.4)
	await tw.finished

func trunk_open() -> void:
	var tw := create_tween().set_parallel(true)
	for b in props.trunk_back:
		var side := 1.0 if b.position.x > 0.05 else (-1.0 if b.position.x < -0.05 else (1.0 if randf() < 0.5 else -1.0))
		tw.tween_property(b, "position", b.position + Vector3(side * 1.2, 0, -0.3), 1.4).set_trans(Tween.TRANS_SINE)
		tw.tween_property(b, "rotation_degrees:z", side * 12.0, 1.4)
	tw.tween_property(props.tunnel_seal, "position:y", -3.2, 1.6)
	shake = 0.5
	await tw.finished

func ghost_fade() -> void:
	if props.has("ghost_tw"):
		props.ghost_tw.kill()
	var tw := create_tween().set_parallel(true)
	tw.tween_property(props.ghost, "scale", Vector3(0.2, 2.0, 0.2), 1.2)
	tw.tween_property(props.ghost, "position:y", 3.0, 1.2)
	tw.tween_property(props.red, "light_energy", 0.0, 1.2)
	await tw.finished
	props.ghost.visible = false

# ---------- the nest fight ----------
func fight_cam(on: bool) -> void:
	cam_fixed = on
	cam_fixed_pos = Vector3(0, 9.0, 9.2)
	cam_fixed_look = Vector3(0, 0, -0.4)
	input_on = not on
	var tw := create_tween()
	tw.tween_property(props.grid.material_override, "albedo_color:a", 1.0 if on else 0.0, 0.8)

func spider_drop(k: String, at: Vector3, face_to := Vector3.ZERO, hang := 0.0) -> void:
	var sp: Node3D = props["sp_" + k]
	sp.visible = true
	sp.position = at + Vector3(0, 9.0, 0)
	_face_node(sp, at, face_to)
	var line := M.part(sp, M.cyl(0.01, 0.01, 9.0, 4), M.mat(Color("e8e4d8"), 0.9, Color("e8e4d8"), 0.3, 0.7), Vector3(0, 5.2, 0.3))
	line.name = "Silk"
	var tw := create_tween()
	tw.tween_property(sp, "position", at + Vector3(0, hang, 0), 0.9 if hang == 0.0 else 1.2).set_trans(Tween.TRANS_BOUNCE if hang == 0.0 else Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	await tw.finished
	if hang == 0.0:
		line.queue_free()

func _face_node(n: Node3D, at: Vector3, to: Vector3) -> void:
	var d := to - at
	if d.length() > 0.01:
		n.rotation.y = atan2(-d.x, -d.z)

func spider_move(k: String, at: Vector3, face_to: Vector3) -> void:
	var sp: Node3D = props["sp_" + k]
	var silk := sp.get_node_or_null("Silk")
	if silk:
		silk.queue_free()
	var tw := create_tween()
	tw.tween_property(sp, "position", at, 0.8).set_trans(Tween.TRANS_QUAD)
	await tw.finished
	_face_node(sp, at, face_to)

func ryytaa_unfold() -> void:
	var ry: Node3D = props.ryytaa
	ry.visible = true
	var tw := create_tween().set_parallel(true)
	tw.tween_property(ry, "scale", Vector3.ONE * 2.6, 1.6).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(ry, "position:z", sq(3, 0).z - 0.9, 1.6)
	shake = 0.5
	await tw.finished

func nest_intro() -> void:
	await walk_to_marker("field")
	await face(Vector3(0, 0, -5))
	fight_cam(true)
	play_music("rootbreaker")
	var a := sq(3, 4)
	spider_drop("a", a, player.global_position)
	await wait(0.25)
	spider_drop("d", sq(5, 1), player.global_position)
	await wait(0.25)
	spider_drop("b", sq(1, 5), player.global_position, 4.5)
	spider_drop("c", sq(5, 5), player.global_position, 4.5)
	await wait(0.5)
	await ryytaa_unfold()

func spider_rear(k: String) -> void:
	var b: Node3D = props["sp_" + k].get_node("Body")
	var tw := create_tween()
	tw.tween_property(b, "rotation_degrees:x", 25.0, 0.4)
	await tw.finished

func spider_settle(k: String) -> void:
	var b: Node3D = props["sp_" + k].get_node("Body")
	var tw := create_tween()
	tw.tween_property(b, "rotation_degrees:x", 0.0, 0.3)

func venom(k: String, hit: bool) -> void:
	var sp: Node3D = props["sp_" + k]
	var from := sp.global_position + Vector3(0, 0.7, 0) + (player.global_position - sp.global_position).normalized() * 0.4
	var to := player.global_position + Vector3(0, 1.6, 0)
	if not hit:
		to += Vector3(1.4, -1.2, -0.2)
		hero_dodge(-1)
	for i in 5:
		var g := M.part(self, M.sph(0.08 - i * 0.01, 6), M.glow(Color("80e040"), 2.0), from)
		var tw := create_tween()
		tw.tween_property(g, "global_position", to + Vector3(randf_range(-0.15, 0.15), randf_range(-0.15, 0.15), 0), 0.35).set_delay(i * 0.04)
		tw.tween_callback(g.queue_free)
	await wait(0.4)
	if hit:
		hero_hurt()
		flash(to, Color("80ff40"), 2.0)
	spider_settle(k)

func spider_bite(k: String) -> void:
	var sp: Node3D = props["sp_" + k]
	var start := sp.position
	var dir := (player.global_position - sp.global_position)
	dir.y = 0
	var tw := create_tween()
	tw.tween_property(sp, "position", start + dir.normalized() * max(0.0, dir.length() - 0.7), 0.15)
	tw.tween_property(sp, "position", start, 0.3)
	await wait(0.15)
	hero_hurt()
	await tw.finished

func spider_bounce(k: String) -> void:
	var sp: Node3D = props["sp_" + k]
	var start := sp.position
	var dir := (player.global_position - sp.global_position)
	dir.y = 0
	var tw := create_tween()
	tw.tween_property(sp, "position", start + dir.normalized() * max(0.0, dir.length() - 0.8), 0.15)
	tw.tween_property(sp, "position", start - dir.normalized() * 0.3, 0.3)
	await wait(0.15)
	flash(player.global_position + Vector3(0, 1.2, -0.4), Color("ffffff"), 2.0, 0.2, 3.0)
	float_text(player.global_position + Vector3(0, 2.0, 0), "clang", Color("e0e0ff"))
	await tw.finished

func swing_at(k: String, hit: bool, dmg := "") -> void:
	var n: Node3D = props.ryytaa if k == "ryytaa" else props["sp_" + k]
	await face(n.global_position)
	hero_swing()
	await hero_lunge(0.7)
	if hit:
		flash(n.global_position + Vector3(0, 0.8, 0), Color("ff6040"), 3.0)
		float_text(n.global_position + Vector3(0, 2.2 if k == "ryytaa" else 1.4, 0), dmg if dmg != "" else "hit", Color("ffb060"))
		var tw := create_tween()
		tw.tween_property(n, "rotation_degrees:z", 10.0, 0.08)
		tw.tween_property(n, "rotation_degrees:z", 0.0, 0.25)
	else:
		float_text(n.global_position + Vector3(0, 1.4, 0), "miss", Color("c0c0c0"))
		flash(n.global_position + Vector3(0, 0.1, 0.5), Color("ffe0a0"), 1.5, 0.2, 2.0)

func spider_lose_leg(k: String) -> void:
	var legs: Node3D = props["sp_" + k].get_node("Body/Legs")
	var leg := legs.get_child(0) as Node3D
	var tw := create_tween().set_parallel(true)
	tw.tween_property(leg, "position", Vector3(-1.2, -0.3, -0.6), 0.5)
	tw.tween_property(leg, "rotation_degrees", Vector3(0, 0, 80), 0.5)
	var sp: Node3D = props["sp_" + k]
	tw.tween_property(sp, "position", sp.position + Vector3(0, 0, -1.0), 0.6)

func spider_die(k: String) -> void:
	var sp: Node3D = props["sp_" + k]
	var tw := create_tween().set_parallel(true)
	tw.tween_property(sp, "rotation_degrees:z", 170.0, 0.6)
	tw.tween_property(sp, "position:y", 0.5, 0.6)
	tw.chain().tween_property(sp, "scale", Vector3(1, 0.4, 1), 0.8)
	await tw.finished

func flankers_drop() -> void:
	spider_move("b", sq(2, 5), player.global_position)
	await spider_move("c", sq(4, 5), player.global_position)

func gems_burst() -> void:
	hero_swing()
	await wait(0.3)
	shake = 1.0
	flash(player.global_position + Vector3(0, 0.5, -0.6), Color("ff3020"), 14.0, 1.6, 18.0)
	var tw := create_tween().set_parallel(true)
	for w in props.webs:
		var m: StandardMaterial3D = w.material_override
		tw.tween_property(m, "albedo_color", Color(0.2, 0.05, 0.0, 0.0), 1.2)
		tw.tween_property(m, "emission", Color(1.0, 0.3, 0.1), 0.3)
	await tw.finished
	props.exit_block.queue_free()

func ryytaa_charge() -> void:
	var ry: Node3D = props.ryytaa
	var tw := create_tween()
	tw.tween_property(ry, "position", sq(3, 2) + Vector3(0, 0, 0.4), 0.7).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	shake = 0.8
	await tw.finished

func shield_slam(won: bool) -> void:
	await hero_brace(true)
	await hero_lunge(1.0)
	var ry: Node3D = props.ryytaa
	flash(ry.global_position + Vector3(0, 1.0, 1.2), Color("ffffff"), 4.0, 0.3, 5.0)
	shake = 0.7
	if won:
		float_text(ry.global_position + Vector3(0, 3.0, 0), "stunned", Color("e0e0ff"))
		var tw := create_tween()
		tw.tween_property(ry, "rotation_degrees:x", -14.0, 0.2)
		tw.tween_property(ry, "position:z", ry.position.z - 0.8, 0.3)
	else:
		hero_hurt()
	await hero_brace(false)

func ryytaa_dodge() -> void:
	var ry: Node3D = props.ryytaa
	var tw := create_tween()
	tw.tween_property(ry, "position:x", 1.0, 0.15)
	tw.tween_property(ry, "position:x", 0.0, 0.5)
	await tw.finished

func ryytaa_die() -> void:
	var ry: Node3D = props.ryytaa
	flash(player.global_position + Vector3(0, 1.5, 0), Color("ff3020"), 10.0, 2.5, 20.0)
	var tw := create_tween().set_parallel(true)
	tw.tween_property(ry, "rotation_degrees", Vector3(0, 0, 175), 1.2).set_trans(Tween.TRANS_QUAD)
	tw.tween_property(ry, "position:y", 1.4, 1.2)
	for e in props.eggs:
		tw.tween_property(e, "scale", e.scale * Vector3(0.6, 0.25, 0.6), 2.0)
	for k in ["b", "c", "d"]:
		var sp: Node3D = props["sp_" + k]
		if sp.rotation_degrees.z > 90:
			continue
		var out := sp.position.normalized() * 11.0
		tw.tween_property(sp, "position", Vector3(out.x, 0, out.z), 1.6)
		tw.tween_property(sp, "scale", Vector3.ONE * 0.2, 1.6)
	await tw.finished
	for k in ["b", "c", "d"]:
		if props["sp_" + k].scale.x < 0.3:
			props["sp_" + k].visible = false
	tw = create_tween()
	tw.tween_property(ry, "scale", Vector3(2.6, 0.8, 2.6), 1.0)
