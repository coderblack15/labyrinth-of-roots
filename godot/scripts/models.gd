# Procedural low-poly "tabletop mini" models, built from Godot primitives.
# Every figure stands on a round base, like a painted miniature.
# These are placeholders that Blender-made models can replace one by one.
extends RefCounted

const C_BASE := Color("2a2018")
const C_SKIN := Color("c99a78")
const C_BONE := Color("d9d2bd")
const C_STEEL := Color("7c8084")
const C_BARK := Color("4a3a2a")
const C_BARK2 := Color("3a2c20")
const C_STONE := Color("5d5a55")
const C_STONE2 := Color("47443f")

# Blender-made models (tools/blender/build_models.py) live in res://models/.
# Each builder below uses its .glb when present and falls back to primitives.
static func glb(name: String) -> Node3D:
	var path := "res://models/%s.glb" % name
	if not ResourceLoader.exists(path):
		return null
	var ps = load(path)
	if not ps is PackedScene:
		return null
	# The .glb's own top node wraps the Blender root empty; hand back that empty.
	var wrap: Node3D = ps.instantiate()
	if wrap.get_child_count() != 1:
		return wrap
	var inner: Node3D = wrap.get_child(0)
	_unown(inner)
	wrap.remove_child(inner)
	wrap.free()
	return inner

static func _unown(n: Node) -> void:
	n.owner = null
	for c in n.get_children():
		_unown(c)

static func mat(c: Color, rough := 0.85, emit := Color(0, 0, 0, 0), emit_e := 1.0, alpha := 1.0, metal := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(c.r, c.g, c.b, alpha)
	m.roughness = rough
	m.metallic = metal
	if emit.a > 0.0:
		m.emission_enabled = true
		m.emission = Color(emit.r, emit.g, emit.b)
		m.emission_energy_multiplier = emit_e
	if alpha < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
	return m

static func glow(c: Color, e := 2.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.emission_enabled = true
	m.emission = c
	m.emission_energy_multiplier = e
	return m

static func box(x: float, y: float, z: float) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = Vector3(x, y, z)
	return b

static func cyl(top: float, bottom: float, h: float, seg := 12) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.top_radius = top
	c.bottom_radius = bottom
	c.height = h
	c.radial_segments = seg
	c.rings = 1
	return c

static func sph(r: float, seg := 12) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	s.radial_segments = seg
	s.rings = max(4, seg / 2)
	return s

static func cap(r: float, h: float, seg := 8) -> CapsuleMesh:
	var c := CapsuleMesh.new()
	c.radius = r
	c.height = max(h, r * 2.0 + 0.001)
	c.radial_segments = seg
	c.rings = 2
	return c

static func part(parent: Node3D, mesh: Mesh, m: Material, pos := Vector3.ZERO, rot := Vector3.ZERO, scl := Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = m
	mi.position = pos
	mi.rotation_degrees = rot
	mi.scale = scl
	parent.add_child(mi)
	return mi

# A capsule running from point a to point b (local to parent).
static func limb(parent: Node3D, a: Vector3, b: Vector3, r: float, m: Material) -> MeshInstance3D:
	var dv := b - a
	var mi := MeshInstance3D.new()
	mi.mesh = cap(r, dv.length() + r * 2.0, 6)
	mi.material_override = m
	var y := dv.normalized()
	var ref := Vector3.UP if abs(y.dot(Vector3.UP)) < 0.95 else Vector3.RIGHT
	var x := ref.cross(y).normalized()
	var z := x.cross(y).normalized()
	mi.transform = Transform3D(Basis(x, y, z), (a + b) * 0.5)
	parent.add_child(mi)
	return mi

static func base_disc(parent: Node3D, r := 0.44) -> void:
	part(parent, cyl(r, r + 0.04, 0.08, 20), mat(C_BASE, 0.6), Vector3(0, 0.04, 0))
	part(parent, cyl(r + 0.045, r + 0.045, 0.02, 20), mat(Color("6b5a3a"), 0.4, Color(0, 0, 0, 0), 1.0, 1.0, 0.6), Vector3(0, 0.005, 0))

# ---------- the hero ----------
# Returns a Node3D with children "arm_r"/"arm_l" (shoulder pivots) holding "hand_r"/"hand_l".
static func hero(pal := {}) -> Node3D:
	if pal.is_empty():
		var g := glb("hero")
		if g:
			return g
	var tunic: Color = pal.get("tunic", Color("3b5a3a"))
	var cloak: Color = pal.get("cloak", Color("5a2a22"))
	var skin: Color = pal.get("skin", C_SKIN)
	var hair: Color = pal.get("hair", Color("2a1d14"))
	var legs: Color = pal.get("legs", Color("4a3a2c"))
	var alpha: float = pal.get("alpha", 1.0)
	var emit: Color = pal.get("emit", Color(0, 0, 0, 0))
	var root := Node3D.new()
	root.name = "Hero"
	if not pal.get("no_base", false):
		base_disc(root)
	var mt := mat(tunic, 0.8, emit, 0.8, alpha)
	var ml := mat(legs, 0.9, emit, 0.8, alpha)
	var ms := mat(skin, 0.7, emit, 0.8, alpha)
	var mc := mat(cloak, 0.9, emit, 0.8, alpha)
	part(root, cap(0.11, 0.82), ml, Vector3(-0.13, 0.49, 0))
	part(root, cap(0.11, 0.82), ml, Vector3(0.13, 0.49, 0))
	part(root, cyl(0.22, 0.3, 0.72), mt, Vector3(0, 1.17, 0))
	part(root, cyl(0.31, 0.31, 0.08), mat(Color("3a2616"), 0.7, emit, 0.8, alpha), Vector3(0, 0.86, 0))
	part(root, sph(0.17), ms, Vector3(0, 1.7, 0))
	part(root, sph(0.18), mat(hair, 0.9, emit, 0.8, alpha), Vector3(0, 1.75, 0.03), Vector3.ZERO, Vector3(1, 0.85, 1))
	var cl := part(root, box(0.56, 1.0, 0.05), mc, Vector3(0, 1.08, 0.24), Vector3(-6, 0, 0))
	cl.name = "Cloak"
	for side in [-1, 1]:
		var arm := Node3D.new()
		arm.name = "arm_r" if side == 1 else "arm_l"
		arm.position = Vector3(0.34 * side, 1.47, 0)
		root.add_child(arm)
		part(arm, cap(0.085, 0.66), mt, Vector3(0, -0.3, 0))
		part(arm, sph(0.075), ms, Vector3(0, -0.62, 0))
		var hand := Node3D.new()
		hand.name = "hand_r" if side == 1 else "hand_l"
		hand.position = Vector3(0, -0.62, -0.02)
		arm.add_child(hand)
	return root

static func knife() -> Node3D:
	var g := glb("knife")
	if g:
		return g
	var r := Node3D.new()
	part(r, box(0.04, 0.12, 0.04), mat(Color("3a2616")), Vector3(0, 0, 0))
	part(r, box(0.025, 0.06, 0.28), mat(C_STEEL, 0.3, Color(0, 0, 0, 0), 1.0, 1.0, 0.8), Vector3(0, -0.02, -0.16))
	return r

static func torch() -> Node3D:
	var g := glb("torch")
	if g:
		return g
	var r := Node3D.new()
	part(r, cyl(0.03, 0.025, 0.6), mat(Color("5a3c22")), Vector3(0, 0.15, -0.05), Vector3(-20, 0, 0))
	part(r, cyl(0.05, 0.04, 0.1), mat(Color("8a7a5a")), Vector3(0, 0.44, -0.15), Vector3(-20, 0, 0))
	var f := part(r, sph(0.08, 8), glow(Color("ffb050"), 3.0), Vector3(0, 0.55, -0.19), Vector3.ZERO, Vector3(1, 1.6, 1))
	f.name = "Flame"
	return r

# The gem-set two-handed axe. Gems: ruby, sapphire, emerald.
static func axe() -> Node3D:
	var g := glb("axe")
	if g:
		return g
	var r := Node3D.new()
	r.name = "Axe"
	part(r, cyl(0.035, 0.04, 1.35), mat(Color("4a3020"), 0.7), Vector3(0, 0.45, 0))
	var head := Node3D.new()
	head.position = Vector3(0, 1.02, 0)
	r.add_child(head)
	part(head, box(0.07, 0.22, 0.2), mat(C_STEEL, 0.35, Color(0, 0, 0, 0), 1.0, 1.0, 0.85), Vector3(0, 0, -0.1))
	part(head, box(0.05, 0.4, 0.16), mat(Color("9aa0a6"), 0.25, Color(0, 0, 0, 0), 1.0, 1.0, 0.9), Vector3(0, 0, -0.27))
	part(head, box(0.05, 0.14, 0.1), mat(C_STEEL, 0.35, Color(0, 0, 0, 0), 1.0, 1.0, 0.85), Vector3(0, 0, 0.08))
	var gems := [Color("e0243a"), Color("2a5ae0"), Color("20c060")]
	for i in 3:
		var gm := part(r, sph(0.045, 8), glow(gems[i], 1.6), Vector3(0, 0.75 - i * 0.16, -0.035))
		gm.name = "Gem%d" % i
	return r

static func shield() -> Node3D:
	var g := glb("shield")
	if g:
		return g
	var r := Node3D.new()
	r.name = "Shield"
	part(r, cyl(0.32, 0.32, 0.06, 16), mat(C_STEEL, 0.45, Color(0, 0, 0, 0), 1.0, 1.0, 0.7), Vector3.ZERO, Vector3(90, 0, 0), Vector3(1, 1, 1.25))
	part(r, sph(0.07, 8), mat(Color("5a5e62"), 0.4, Color(0, 0, 0, 0), 1.0, 1.0, 0.7), Vector3(0, 0, -0.04))
	return r

# ---------- people and things on the road ----------
static func stranger(tint := Color("3a332c")) -> Node3D:
	var g := glb("stranger_a" if tint.r > 0.2 else "stranger_b")
	if g:
		return g
	var r := Node3D.new()
	base_disc(r, 0.42)
	part(r, cyl(0.16, 0.44, 1.6), mat(tint, 0.95), Vector3(0, 0.88, 0))
	part(r, sph(0.24), mat(tint.darkened(0.1), 0.95), Vector3(0, 1.78, 0.02), Vector3.ZERO, Vector3(1, 1.15, 1))
	part(r, sph(0.14), mat(Color("050404"), 1.0), Vector3(0, 1.74, -0.12), Vector3.ZERO, Vector3(1, 1.1, 0.6))
	part(r, cyl(0.025, 0.03, 2.0), mat(Color("4a3a28")), Vector3(0.38, 1.0, -0.1))
	return r

# The vine horror: a knot of thorned vines nearly eight feet tall.
static func vine_horror() -> Node3D:
	var g := glb("vine_horror")
	if g:
		return g
	var r := Node3D.new()
	var mv := mat(Color("2d3b1f"), 0.9)
	var mv2 := mat(Color("3e4a26"), 0.9)
	var mth := mat(Color("cfc6a8"), 0.6)
	var rng := RandomNumberGenerator.new()
	rng.seed = 77
	for i in 9:
		var a := TAU * i / 9.0
		var foot := Vector3(cos(a) * 0.7, 0, sin(a) * 0.7)
		var mid := Vector3(cos(a + 0.8) * 0.35, 1.3, sin(a + 0.8) * 0.35)
		var top := Vector3(cos(a + 1.6) * 0.2, 2.3, sin(a + 1.6) * 0.2)
		limb(r, foot, mid, 0.11, mv if i % 2 else mv2)
		limb(r, mid, top, 0.09, mv)
	part(r, sph(0.42, 10), mv2, Vector3(0, 2.35, 0), Vector3.ZERO, Vector3(1, 0.8, 1))
	for side in [-1, 1]:
		var arm := Node3D.new()
		arm.name = "lash_r" if side == 1 else "lash_l"
		arm.position = Vector3(0.3 * side, 2.2, 0)
		r.add_child(arm)
		limb(arm, Vector3.ZERO, Vector3(0.9 * side, 0.2, -0.5), 0.09, mv)
		limb(arm, Vector3(0.9 * side, 0.2, -0.5), Vector3(1.6 * side, -0.6, -1.0), 0.07, mv2)
	for i in 40:
		var h := rng.randf_range(0.3, 2.4)
		var a2 := rng.randf() * TAU
		var rad: float = lerp(0.65, 0.25, h / 2.4)
		var p := Vector3(cos(a2) * rad, h, sin(a2) * rad)
		var th := part(r, cyl(0.0, 0.035, 0.18, 5), mth, p)
		th.look_at_from_position(p, p + Vector3(cos(a2), 0.3, sin(a2)) * 2.0, Vector3.UP)
		th.rotate_object_local(Vector3.RIGHT, -PI / 2)
	for i in 10:
		var a3 := rng.randf() * TAU
		part(r, sph(0.12, 6), mat(Color("b8bca0"), 0.8), Vector3(cos(a3) * 0.4, rng.randf_range(0.8, 2.2), sin(a3) * 0.4), Vector3.ZERO, Vector3(1.4, 0.3, 0.8))
	return r

# A giant spider. Ryytaa is the same build, much bigger and pale.
static func spider(pale := false) -> Node3D:
	var g := glb("ryytaa" if pale else "spider")
	if g:
		return g
	var r := Node3D.new()
	var body_c := Color("d8d0c0") if pale else Color("2a2320")
	var leg_c := Color("bfb6a4") if pale else Color("1e1916")
	var mb := mat(body_c, 0.75)
	var ml := mat(leg_c, 0.8)
	base_disc(r, 0.55)
	var body := Node3D.new()
	body.name = "Body"
	r.add_child(body)
	part(body, sph(0.27), mb, Vector3(0, 0.5, -0.1), Vector3.ZERO, Vector3(1, 0.7, 1.15))
	part(body, sph(0.4), mb, Vector3(0, 0.62, 0.48), Vector3.ZERO, Vector3(1, 0.85, 1.3))
	if pale:
		for i in 4:
			part(body, sph(0.06, 6), mat(Color("6a5a4a")), Vector3(0, 0.9, 0.3 + i * 0.13), Vector3.ZERO, Vector3(2, 0.5, 1))
	var em := glow(Color("ff3020"), 2.5)
	for i in 8:
		var ex := (i % 4 - 1.5) * 0.06
		var ey := 0.58 + (0.05 if i < 4 else 0.0)
		part(body, sph(0.028 if i % 3 else 0.04, 6), em, Vector3(ex, ey, -0.34 + abs(ex) * 0.4))
	for side in [-1, 1]:
		part(body, cyl(0.0, 0.035, 0.18, 5), mat(Color("0e0b0a"), 0.4), Vector3(0.07 * side, 0.38, -0.35), Vector3(160, 0, 0))
	var legs := Node3D.new()
	legs.name = "Legs"
	body.add_child(legs)
	for side in [-1, 1]:
		for i in 4:
			var leg := Node3D.new()
			leg.name = "Leg%d%s" % [i, "R" if side == 1 else "L"]
			legs.add_child(leg)
			var z := -0.22 + i * 0.15
			var hip := Vector3(0.18 * side, 0.5, z)
			var spread := (i - 1.5) * 0.45
			var knee := Vector3(0.7 * side, 0.95, z + spread * 0.9)
			var foot := Vector3(1.05 * side, 0.02, z + spread * 1.6)
			limb(leg, hip, knee, 0.045, ml)
			limb(leg, knee, foot, 0.035, ml)
	return r

static func skeleton(armored := true, sitting := true) -> Node3D:
	var g := glb("skeleton_sit" if sitting else ("skeleton_hang_armor" if armored else "skeleton_hang_bare"))
	if g:
		return g
	var r := Node3D.new()
	var mb := mat(C_BONE, 0.8)
	var ma := mat(Color("6b6e70"), 0.55, Color(0, 0, 0, 0), 1.0, 1.0, 0.6)
	var dark := mat(Color("080706"), 1.0)
	var y0 := 0.0 if sitting else 0.8
	# legs
	if sitting:
		limb(r, Vector3(-0.13, 0.15, 0), Vector3(-0.15, 0.1, -0.75), 0.05, mb)
		limb(r, Vector3(0.13, 0.15, 0), Vector3(0.18, 0.1, -0.72), 0.05, mb)
	else:
		limb(r, Vector3(-0.12, 0.8, 0), Vector3(-0.14, 0.0, 0.05), 0.045, mb)
		limb(r, Vector3(0.12, 0.8, 0), Vector3(0.1, 0.05, -0.05), 0.045, mb)
	part(r, box(0.36, 0.16, 0.2), mb, Vector3(0, y0 + 0.2, 0))
	limb(r, Vector3(0, y0 + 0.25, 0.04), Vector3(0, y0 + 0.75, 0.1), 0.035, mb)
	if armored:
		part(r, box(0.5, 0.5, 0.32), ma, Vector3(0, y0 + 0.62, 0.08), Vector3(-12, 0, 4))
		part(r, sph(0.17, 8), ma, Vector3(-0.3, y0 + 0.82, 0.08), Vector3.ZERO, Vector3(1, 0.6, 1))
	else:
		for i in 4:
			part(r, cyl(0.2 - i * 0.02, 0.2 - i * 0.02, 0.03, 10), mb, Vector3(0, y0 + 0.45 + i * 0.1, 0.06))
	var skull := part(r, sph(0.14, 10), mb, Vector3(0.04, y0 + 1.0, 0.04), Vector3(20, 15, 10))
	part(skull, sph(0.035, 6), dark, Vector3(-0.05, 0.02, -0.12))
	part(skull, sph(0.035, 6), dark, Vector3(0.05, 0.02, -0.12))
	limb(r, Vector3(-0.26, y0 + 0.8, 0.05), Vector3(-0.3, y0 + 0.35, -0.2), 0.035, mb)
	limb(r, Vector3(0.26, y0 + 0.8, 0.05), Vector3(0.25, y0 + 0.35, -0.25), 0.035, mb)
	return r

static func ghost() -> Node3D:
	var gg := glb("hero")
	if gg:
		var gm := mat(Color("9fd8d0"), 0.6, Color("7fe0d0"), 0.9, 0.42)
		gm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		_paint(gg, gm)
		var b := gg.find_child("Base", true, false)
		if b:
			b.visible = false
		var em2 := glow(Color("ff3a2a"), 4.0)
		part(gg, sph(0.03, 6), em2, Vector3(-0.05, 1.75, -0.14))
		part(gg, sph(0.03, 6), em2, Vector3(0.05, 1.75, -0.14))
		return gg
	var g := hero({"tunic": Color("9fd8d0"), "cloak": Color("6fa8a0"), "skin": Color("cfeee8"), "hair": Color("8fc0b8"), "legs": Color("7fb8b0"), "alpha": 0.42, "emit": Color("7fe0d0"), "no_base": true})
	var em := glow(Color("ff3a2a"), 4.0)
	part(g, sph(0.03, 6), em, Vector3(-0.06, 1.72, -0.15))
	part(g, sph(0.03, 6), em, Vector3(0.06, 1.72, -0.15))
	return g

static func _paint(n: Node, m: Material) -> void:
	if n is MeshInstance3D:
		n.material_override = m
	for c in n.get_children():
		_paint(c, m)

static func egg_sac() -> Node3D:
	var g := glb("egg_sac")
	if g:
		return g
	var r := Node3D.new()
	var m := mat(Color("e6e0cc"), 0.4, Color("a09a70"), 0.25, 0.82)
	part(r, sph(0.5, 12), m, Vector3(0, 0.45, 0), Vector3.ZERO, Vector3(1, 0.9, 1))
	return r

# A cobweb texture, drawn into an image at load time.
static func web_texture(seed_v := 3) -> ImageTexture:
	var n := 256
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	img.fill(Color(1, 1, 1, 0))
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_v
	var c := Vector2(n * rng.randf_range(0.4, 0.6), n * rng.randf_range(0.4, 0.6))
	var spokes := 14
	var ang := []
	for i in spokes:
		ang.append(TAU * i / spokes + rng.randf_range(-0.12, 0.12))
	for a in ang:
		_line(img, c, c + Vector2(cos(a), sin(a)) * n, 0.85)
	var rad := 10.0
	while rad < n * 0.75:
		for i in spokes:
			var a0: float = ang[i]
			var a1: float = ang[(i + 1) % spokes]
			if a1 < a0:
				a1 += TAU
			var sag := rad * 0.9
			_line(img, c + Vector2(cos(a0), sin(a0)) * rad, c + Vector2(cos(a1), sin(a1)) * sag, 0.6)
		rad += rng.randf_range(9, 15)
	img.generate_mipmaps()
	return ImageTexture.create_from_image(img)

static func _line(img: Image, a: Vector2, b: Vector2, alpha: float) -> void:
	var n := img.get_width()
	var steps := int(a.distance_to(b))
	for i in steps:
		var p := a.lerp(b, float(i) / max(1, steps))
		var x := int(p.x)
		var y := int(p.y)
		if x >= 0 and y >= 0 and x < n and y < n:
			img.set_pixel(x, y, Color(1, 1, 1, alpha))
			if x + 1 < n:
				img.set_pixel(x + 1, y, Color(1, 1, 1, alpha * 0.5))

static func web_mat(seed_v := 3) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_texture = web_texture(seed_v)
	m.albedo_color = Color(1, 1, 1, 0.95)
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.roughness = 0.9
	m.emission_enabled = true
	m.emission = Color(0.25, 0.24, 0.22)
	m.emission_energy_multiplier = 0.4
	m.emission_texture = m.albedo_texture
	return m

static func grid_texture(cells: int) -> ImageTexture:
	var px := 32
	var n := cells * px
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	img.fill(Color(1, 1, 1, 0))
	for i in cells + 1:
		var p: int = min(n - 1, i * px)
		for k in n:
			img.set_pixel(p, k, Color(1, 0.85, 0.55, 0.55))
			img.set_pixel(k, p, Color(1, 0.85, 0.55, 0.55))
	img.generate_mipmaps()
	return ImageTexture.create_from_image(img)
