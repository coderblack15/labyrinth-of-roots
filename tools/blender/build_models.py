# Builds the 3D game's figures and props in Blender and exports them as .glb files
# for the Godot version (godot/models/). Everything is made from code, so it can be
# re-run and tweaked: no hand-sculpted files to keep in sync.
#
#   blender --background --python tools/blender/build_models.py -- godot/models
#   (or, with the bpy module:  python tools/blender/build_models.py godot/models)
#
# Blender is Z-up; the glTF export turns that into Godot's Y-up. A model's front faces
# Blender +Y, which is Godot's -Z (the way Godot nodes look).
#
# Created by: Adrian Blackshire and Claude
import bpy
import bmesh
import math
import os
import random
import sys
from mathutils import Vector, Matrix, Euler, noise

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
OUT = os.path.abspath(args[0] if args else "godot/models")
os.makedirs(OUT, exist_ok=True)


def lin(hexstr):
    h = hexstr.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mat(name, col, rough=0.8, metal=0.0, emit=None, es=1.0, alpha=1.0):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = bpy.data.materials.new(name)
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*lin(col), 1.0)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if emit:
        p.inputs["Emission Color"].default_value = (*lin(emit), 1.0)
        p.inputs["Emission Strength"].default_value = es
    if alpha < 1.0:
        p.inputs["Alpha"].default_value = alpha
        try:
            m.surface_render_method = "BLENDED"
        except Exception:
            m.blend_method = "BLEND"
    m.use_backface_culling = False
    return m


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def empty(name, parent=None, loc=(0, 0, 0)):
    ob = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = parent
    ob.location = loc
    return ob


def export(name):
    path = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_yup=True, export_apply=True)
    print("wrote", path)


class Part:
    """One mesh object made of many primitives, one surface per material."""

    def __init__(self, name, seed=1):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []
        self.rng = random.Random(seed)

    def _tag(self, verts, m, smooth=True):
        if m not in self.mats:
            self.mats.append(m)
        idx = self.mats.index(m)
        faces = {f for v in verts for f in v.link_faces}
        for f in faces:
            f.material_index = idx
            f.smooth = smooth

    def _rough(self, verts, centre, amt, freq, seed):
        if amt <= 0:
            return
        off = Vector((seed * 7.13, seed * 3.31, seed * 1.77))
        for v in verts:
            d = v.co - centre
            if d.length < 1e-6:
                continue
            v.co += d.normalized() * amt * noise.noise(v.co * freq + off)

    def sphere(self, m, r, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), seg=14, rings=9, rough=0.0, freq=6.0, smooth=True):
        mx = Matrix.LocRotScale(Vector(loc), Euler([math.radians(a) for a in rot]), Vector(scale))
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=rings, radius=r, matrix=mx)
        self._rough(res["verts"], Vector(loc), rough, freq, self.rng.random() * 50)
        self._tag(res["verts"], m, smooth)
        return res["verts"]

    def ico(self, m, r, loc=(0, 0, 0), scale=(1, 1, 1), subdiv=1):
        mx = Matrix.LocRotScale(Vector(loc), None, Vector(scale))
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=r, matrix=mx)
        self._tag(res["verts"], m, False)

    def cone(self, m, r1, r2, depth, loc=(0, 0, 0), rot=(0, 0, 0), seg=8, smooth=True, scale=(1, 1, 1)):
        mx = Matrix.LocRotScale(Vector(loc), Euler([math.radians(a) for a in rot]), Vector(scale))
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=depth, matrix=mx)
        self._tag(res["verts"], m, smooth)

    def box(self, m, size, loc=(0, 0, 0), rot=(0, 0, 0)):
        mx = Matrix.LocRotScale(Vector(loc), Euler([math.radians(a) for a in rot]), Vector(size))
        res = bmesh.ops.create_cube(self.bm, size=1.0, matrix=mx)
        self._tag(res["verts"], m, False)

    def torus(self, m, R, r, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), seg=24, rseg=8, arc=360.0):
        mx = Matrix.LocRotScale(Vector(loc), Euler([math.radians(a) for a in rot]), Vector(scale))
        full = arc >= 359.9
        n = seg if full else seg + 1
        rows = []
        for i in range(n):
            a = math.radians(arc) * i / seg
            c = Vector((math.cos(a), math.sin(a), 0))
            row = []
            for j in range(rseg):
                b = 2 * math.pi * j / rseg
                p = c * (R + r * math.cos(b)) + Vector((0, 0, r * math.sin(b)))
                row.append(self.bm.verts.new(mx @ p))
            rows.append(row)
        verts = [v for row in rows for v in row]
        for i in range(seg if full else seg):
            a, b = rows[i], rows[(i + 1) % n]
            for j in range(rseg):
                self.bm.faces.new((a[j], a[(j + 1) % rseg], b[(j + 1) % rseg], b[j]))
        self._tag(verts, m)

    def tube(self, m, pts, seg=8, rough=0.0, freq=8.0, cap=True, smooth=True, twist=0.0):
        """A swept tube through points (x, y, z, radius), with parallel-transport frames."""
        P = [Vector(p[:3]) for p in pts]
        R = [p[3] for p in pts]
        n = len(P)
        tans = []
        for i in range(n):
            a = P[max(0, i - 1)]
            b = P[min(n - 1, i + 1)]
            tans.append((b - a).normalized())
        ref = Vector((0, 0, 1)) if abs(tans[0].z) < 0.9 else Vector((1, 0, 0))
        u = tans[0].cross(ref).normalized()
        rows = []
        seed = self.rng.random() * 50
        for i in range(n):
            if i > 0:
                axis = tans[i - 1].cross(tans[i])
                if axis.length > 1e-6:
                    ang = tans[i - 1].angle(tans[i])
                    u = Matrix.Rotation(ang, 3, axis.normalized()) @ u
            w = tans[i].cross(u).normalized()
            row = []
            for j in range(seg):
                b = 2 * math.pi * j / seg + twist * i
                d = u * math.cos(b) + w * math.sin(b)
                rr = R[i] * (1.0 + (rough * noise.noise(P[i] * freq + d * 2.0 + Vector((seed, 0, 0))) if rough else 0.0))
                row.append(self.bm.verts.new(P[i] + d * rr))
            rows.append(row)
        for i in range(n - 1):
            a, b = rows[i], rows[i + 1]
            for j in range(seg):
                self.bm.faces.new((a[j], a[(j + 1) % seg], b[(j + 1) % seg], b[j]))
        verts = [v for row in rows for v in row]
        if cap:
            for row, p, t in ((rows[0], P[0], -tans[0]), (rows[-1], P[-1], tans[-1])):
                tip = self.bm.verts.new(p + t * R[rows.index(row) if row is rows[0] else -1] * 0.6)
                verts.append(tip)
                for j in range(seg):
                    f = (row[j], row[(j + 1) % seg], tip)
                    self.bm.faces.new(f if row is rows[-1] else tuple(reversed(f)))
        self._tag(verts, m, smooth)

    def lathe(self, m, profile, loc=(0, 0, 0), scale=(1, 1, 1), seg=24, fold=0.0, folds=8, arc=(0.0, 360.0), close_top=True, rough=0.0):
        """Spin a (radius, z) profile around Z. fold adds cloth-like vertical folds."""
        mx = Matrix.LocRotScale(Vector(loc), None, Vector(scale))
        full = (arc[1] - arc[0]) >= 359.9
        cols = seg if full else seg + 1
        rows = []
        zs = [p[1] for p in profile]
        z0, z1 = min(zs), max(zs)
        seed = self.rng.random() * 50
        for (r, z) in profile:
            row = []
            k = 1.0 - (z - z0) / max(1e-6, (z1 - z0))
            for i in range(cols):
                a = math.radians(arc[0] + (arc[1] - arc[0]) * i / seg)
                rr = r * (1.0 + fold * k * math.sin(a * folds) + (rough * noise.noise(Vector((math.cos(a) * 3, math.sin(a) * 3, z * 6 + seed))) if rough else 0))
                row.append(self.bm.verts.new(mx @ Vector((math.cos(a) * rr, math.sin(a) * rr, z))))
            rows.append(row)
        for i in range(len(rows) - 1):
            a, b = rows[i], rows[i + 1]
            for j in range(seg):
                self.bm.faces.new((a[j], a[(j + 1) % cols], b[(j + 1) % cols], b[j]))
        verts = [v for row in rows for v in row]
        if close_top and full and profile[-1][0] > 1e-4:
            tip = self.bm.verts.new(mx @ Vector((0, 0, profile[-1][1])))
            verts.append(tip)
            row = rows[-1]
            for j in range(seg):
                self.bm.faces.new((row[j], row[(j + 1) % cols], tip))
        self._tag(verts, m)

    def cap(self, m, R, ang, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), rings=6, seg=20, dent=0.0):
        """A sphere cap around +Y (for plates and shields)."""
        mx = Matrix.LocRotScale(Vector(loc), Euler([math.radians(a) for a in rot]), Vector(scale))
        top = self.bm.verts.new(mx @ Vector((0, 0, 0)))
        rows = []
        for i in range(1, rings + 1):
            ph = ang * i / rings
            row = []
            for j in range(seg):
                th = 2 * math.pi * j / seg
                p = Vector((R * math.sin(ph) * math.cos(th), R * math.cos(ph) - R, R * math.sin(ph) * math.sin(th)))
                if dent:
                    p.y += dent * noise.noise(p * 9.0)
                row.append(self.bm.verts.new(mx @ p))
            rows.append(row)
        for j in range(seg):
            self.bm.faces.new((top, rows[0][(j + 1) % seg], rows[0][j]))
        for i in range(rings - 1):
            a, b = rows[i], rows[i + 1]
            for j in range(seg):
                self.bm.faces.new((a[j], a[(j + 1) % seg], b[(j + 1) % seg], b[j]))
        self._tag([top] + [v for r in rows for v in r], m)

    def skin(self, m, pts, edges, subdiv=1, rough=0.0, freq=5.0):
        """Organic shape from a stick figure, using Blender's Skin modifier."""
        me = bpy.data.meshes.new("tmp")
        me.from_pydata([p[:3] for p in pts], edges, [])
        ob = bpy.data.objects.new("tmp", me)
        bpy.context.scene.collection.objects.link(ob)
        ob.modifiers.new("skin", "SKIN")
        sv = me.skin_vertices[0].data
        for i, p in enumerate(pts):
            sv[i].radius = (p[3], p[4] if len(p) > 4 else p[3])
        sv[0].use_root = True
        if subdiv:
            ob.modifiers.new("sub", "SUBSURF").levels = subdiv
        dg = bpy.context.evaluated_depsgraph_get()
        nm = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        n0 = len(self.bm.verts)
        self.bm.from_mesh(nm)
        self.bm.verts.ensure_lookup_table()
        new = self.bm.verts[n0:]
        if rough:
            self.bm.normal_update()
            seed = self.rng.random() * 50
            for v in new:
                v.co += v.normal * rough * noise.noise(v.co * freq + Vector((seed, 0, 0)))
        self._tag(new, m)
        bpy.data.objects.remove(ob)
        bpy.data.meshes.remove(me)
        bpy.data.meshes.remove(nm)

    def done(self, parent=None, loc=(0, 0, 0)):
        me = bpy.data.meshes.new(self.name)
        self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = parent
        ob.location = loc
        return ob


# ---------------------------------------------------------------- shared bits
def base(r=0.44, name="Base"):
    p = Part(name)
    wood = mat("base_wood", "#2a2018", 0.55)
    rim = mat("base_rim", "#8a6d3e", 0.35, 0.7)
    moss = mat("base_ground", "#3a3228", 0.95)
    p.lathe(wood, [(r + 0.03, 0.0), (r + 0.035, 0.012), (r + 0.01, 0.07), (r - 0.01, 0.08), (0.0, 0.08)], seg=32, close_top=False)
    p.torus(rim, r + 0.025, 0.01, loc=(0, 0, 0.04), seg=40, rseg=6)
    # a little painted ground on top: pebbles and earth, like a gamer's based mini
    for i in range(7):
        a = p.rng.random() * math.tau
        d = p.rng.uniform(0.1, r - 0.08)
        p.sphere(moss, p.rng.uniform(0.025, 0.05), loc=(math.cos(a) * d, math.sin(a) * d, 0.08), scale=(1, 1, 0.45), seg=7, rings=5, smooth=False)
    return p.done()


def boot_pair(p, leather, x):
    for s in (-1, 1):
        p.tube(leather, [(s * x, -0.01, 0.34, 0.072), (s * x, 0.0, 0.2, 0.068), (s * x, 0.01, 0.1, 0.07), (s * x, 0.08, 0.06, 0.06), (s * x, 0.17, 0.05, 0.042)], seg=10)
        p.torus(leather, 0.074, 0.016, loc=(s * x, -0.01, 0.34), seg=16, rseg=6)
        p.box(leather, (0.12, 0.26, 0.03), loc=(s * x, 0.05, 0.015))


# ---------------------------------------------------------------- the hero
def hero():
    reset()
    root = empty("hero")
    base().parent = root
    skin = mat("skin", "#c99a78", 0.6)
    tunic = mat("tunic", "#3b5a3a", 0.85)
    tunic_d = mat("tunic_trim", "#2c4430", 0.85)
    trousers = mat("trousers", "#4a3a2c", 0.9)
    leather = mat("leather", "#3a2616", 0.6)
    boots = mat("boots", "#2a1d14", 0.55)
    cloak = mat("cloak", "#5a2a22", 0.9)
    hair = mat("hair", "#2a1d14", 0.85)
    gold = mat("brass", "#b08a40", 0.35, 0.85)
    eye = mat("eye", "#120c08", 0.3)
    b = Part("Body", 3)
    for s in (-1, 1):
        b.tube(trousers, [(s * 0.105, 0, 0.95, 0.1), (s * 0.115, 0.03, 0.72, 0.085), (s * 0.12, 0.04, 0.52, 0.075), (s * 0.12, 0.0, 0.32, 0.066)], seg=10)
        b.sphere(trousers, 0.08, loc=(s * 0.12, 0.05, 0.52), seg=10, rings=7)
    boot_pair(b, boots, 0.12)
    b.lathe(tunic, [(0.3, 0.7), (0.285, 0.78), (0.26, 0.92), (0.25, 1.02), (0.265, 1.18), (0.28, 1.33), (0.255, 1.45), (0.17, 1.53), (0.08, 1.57)], scale=(1, 0.78, 1), seg=24, fold=0.06, folds=7, close_top=False)
    b.torus(tunic_d, 0.3, 0.012, loc=(0, 0, 0.705), scale=(1, 0.78, 1), seg=30, rseg=5)
    b.torus(leather, 0.258, 0.03, loc=(0, 0, 1.0), scale=(1, 0.8, 1), seg=28, rseg=6)
    b.box(gold, (0.07, 0.03, 0.055), loc=(0, 0.215, 1.0))
    b.box(leather, (0.1, 0.07, 0.11), loc=(0.2, 0.1, 0.93), rot=(0, 0, 30))
    b.box(leather, (0.05, 0.04, 0.2), loc=(-0.23, 0.04, 0.9), rot=(0, 12, 0))
    b.tube(skin, [(0, 0, 1.5, 0.068), (0, 0.01, 1.63, 0.062)], seg=10)
    # head
    b.sphere(skin, 0.15, loc=(0, 0.005, 1.73), scale=(0.9, 1.0, 1.08), seg=18, rings=12)
    b.sphere(skin, 0.095, loc=(0, 0.045, 1.65), scale=(1.05, 1.0, 0.78), seg=14, rings=8)
    b.cone(skin, 0.028, 0.006, 0.07, loc=(0, 0.155, 1.715), rot=(-75, 0, 0), seg=8)
    for s in (-1, 1):
        b.sphere(skin, 0.035, loc=(s * 0.135, 0.0, 1.72), scale=(0.45, 0.9, 1.25), seg=8, rings=6)
        b.sphere(eye, 0.017, loc=(s * 0.052, 0.128, 1.755), seg=8, rings=6)
        b.box(hair, (0.06, 0.02, 0.015), loc=(s * 0.054, 0.135, 1.79), rot=(0, s * -8, 0))
    b.sphere(hair, 0.163, loc=(0, -0.025, 1.775), scale=(1.0, 1.02, 0.92), seg=18, rings=12, rough=0.025, freq=14)
    b.sphere(hair, 0.09, loc=(0.05, 0.08, 1.85), scale=(1.4, 0.8, 0.5), seg=10, rings=6, rough=0.02, freq=14)
    b.done(root)
    # cloak, hanging behind, with the hood folded round the neck
    c = Part("Cloak", 4)
    prof = [(0.43, 0.5), (0.4, 0.7), (0.36, 0.95), (0.32, 1.2), (0.29, 1.4), (0.26, 1.5)]
    c.lathe(cloak, prof, scale=(1, 0.8, 1), seg=18, fold=0.07, folds=9, arc=(195, 345), close_top=False)
    c.torus(cloak, 0.19, 0.065, loc=(0, -0.03, 1.52), scale=(1, 0.85, 0.8), seg=20, rseg=8)
    c.sphere(gold, 0.025, loc=(0.13, 0.12, 1.5), seg=8, rings=6)
    c.done(root)
    for s, nm in ((1, "r"), (-1, "l")):
        arm = empty("arm_" + nm, root, (s * 0.31, 0, 1.47))
        a = Part("arm_mesh_" + nm, 5)
        a.sphere(leather, 0.1, loc=(0, 0, 0.02), scale=(1.05, 1.0, 0.7), seg=12, rings=8)
        a.tube(tunic, [(0, 0, 0, 0.074), (s * 0.01, 0.02, -0.28, 0.064), (0, 0.035, -0.4, 0.058)], seg=10)
        a.tube(leather, [(0, 0.035, -0.38, 0.062), (0, 0.042, -0.56, 0.057)], seg=10)
        a.sphere(skin, 0.055, loc=(0, 0.045, -0.62), scale=(0.75, 1.0, 1.2), seg=10, rings=7)
        a.sphere(skin, 0.022, loc=(s * -0.035, 0.08, -0.6), seg=6, rings=4)
        a.done(arm)
        empty("hand_" + nm, arm, (0, 0.02, -0.62))
    export("hero")


# ---------------------------------------------------------------- the hooded strangers
def stranger(name, robe_hex, variant):
    reset()
    root = empty(name)
    base(0.42).parent = root
    robe = mat("robe_" + variant, robe_hex, 0.95)
    robe_d = mat("robe_dark_" + variant, robe_hex, 0.95)
    robe_d.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*[x * 0.6 for x in lin(robe_hex)], 1)
    void = mat("void", "#030202", 1.0)
    skin = mat("old_skin", "#9a8a78", 0.7)
    wood = mat("staff_wood", "#4a3a28", 0.85)
    cord = mat("cord", "#7a6a4a", 0.9)
    p = Part("Robe", 7 if variant == "a" else 8)
    p.lathe(robe, [(0.47, 0.08), (0.45, 0.2), (0.4, 0.45), (0.33, 0.8), (0.28, 1.1), (0.27, 1.32), (0.26, 1.48), (0.18, 1.58), (0.1, 1.62)], seg=28, fold=0.08, folds=11, close_top=False)
    # hood: an open shell with a black hollow where the face should be
    hood = []
    for i in range(10):
        ph = math.pi * (0.08 + 0.9 * i / 9)
        hood.append((0.24 * math.sin(ph), 1.78 + 0.27 * math.cos(ph)))
    p.lathe(robe, hood, seg=20, arc=(130, 410), close_top=False)
    p.sphere(void, 0.17, loc=(0, 0.02, 1.74), scale=(1.0, 0.9, 1.15), seg=12, rings=8)
    p.cone(robe, 0.09, 0.0, 0.2, loc=(0, -0.12, 2.0), rot=(-35, 0, 0), seg=8)
    p.torus(robe_d, 0.2, 0.06, loc=(0, 0, 1.55), scale=(1, 0.9, 0.7), seg=20, rseg=8)
    if variant == "a":
        p.tube(robe, [(0.22, 0, 1.45, 0.09), (0.3, 0.12, 1.2, 0.1), (0.34, 0.2, 1.06, 0.13)], seg=10, cap=False)
        p.tube(robe, [(-0.22, 0, 1.45, 0.09), (-0.24, 0.12, 1.2, 0.1), (-0.12, 0.22, 1.02, 0.12)], seg=10, cap=False)
        p.sphere(skin, 0.05, loc=(0.36, 0.22, 1.02), seg=8, rings=6)
        p.sphere(skin, 0.05, loc=(-0.08, 0.26, 0.98), seg=8, rings=6)
        pts = [(0.37, 0.22, z, 0.028 + 0.006 * math.sin(z * 9)) for z in [0.06 + 0.2 * i for i in range(10)]]
        p.tube(wood, pts, seg=7, rough=0.15, freq=10)
        p.sphere(wood, 0.06, loc=(0.37, 0.22, 2.0), seg=8, rings=6, rough=0.02, freq=20)
    else:
        p.torus(cord, 0.29, 0.018, loc=(0, 0, 1.08), scale=(1, 0.95, 1), seg=24, rseg=5)
        p.tube(cord, [(0.12, 0.27, 1.07, 0.014), (0.13, 0.3, 0.8, 0.012)], seg=5)
        p.tube(robe, [(0.22, 0, 1.45, 0.09), (0.18, 0.18, 1.15, 0.1), (0.05, 0.25, 1.05, 0.12)], seg=10, cap=False)
        p.tube(robe, [(-0.22, 0, 1.45, 0.09), (-0.18, 0.18, 1.15, 0.1), (-0.05, 0.25, 1.05, 0.12)], seg=10, cap=False)
        p.sphere(skin, 0.05, loc=(0.02, 0.3, 1.04), seg=8, rings=6)
        p.sphere(skin, 0.05, loc=(-0.04, 0.3, 1.04), seg=8, rings=6)
        for i in range(12):
            a = math.tau * i / 12
            p.sphere(cord, 0.016, loc=(0.0 + 0.06 * math.cos(a), 0.31, 0.92 + 0.08 * math.sin(a)), seg=6, rings=4)
    p.done(root)
    export(name)


# ---------------------------------------------------------------- the vine horror
def vine_horror():
    reset()
    root = empty("vine_horror")
    green = mat("vine_dark", "#26321a", 0.9)
    olive = mat("vine_olive", "#3e4a26", 0.9)
    thorn = mat("thorn", "#d4ccb0", 0.5)
    leaf = mat("pale_leaf", "#b8bca0", 0.8)
    rot_ = mat("rot", "#1a1410", 0.9)
    p = Part("Body", 11)
    rng = p.rng
    vines = []
    for i in range(10):
        a0 = math.tau * i / 10 + rng.uniform(-0.2, 0.2)
        pts = []
        for k in range(10):
            t = k / 9
            rad = 0.78 * (1 - t) + 0.16 * t + 0.06 * math.sin(t * 9 + i)
            a = a0 + t * 2.4
            pts.append((math.cos(a) * rad, math.sin(a) * rad, t * 2.35, 0.13 * (1 - t) + 0.055 * t))
        vines.append(pts)
        p.tube(green if i % 2 else olive, pts, seg=8, rough=0.18, freq=9)
        # roots clawing out over the ground
        p.tube(green, [(pts[0][0], pts[0][1], 0.06, 0.1), (pts[0][0] * 1.5, pts[0][1] * 1.5, 0.03, 0.06), (pts[0][0] * 1.9, pts[0][1] * 1.9, 0.0, 0.02)], seg=6, rough=0.2)
    # the knotted crown where a head should be, faceless
    for j in range(6):
        p.sphere(olive if j % 2 else green, rng.uniform(0.18, 0.3), loc=(rng.uniform(-0.15, 0.15), rng.uniform(-0.15, 0.15), 2.3 + rng.uniform(0, 0.35)), seg=10, rings=7, rough=0.06, freq=7)
    p.sphere(rot_, 0.12, loc=(0, 0.24, 2.42), scale=(1.4, 0.5, 0.5), seg=10, rings=6)
    for j in range(9):
        a = math.tau * j / 9
        p.cone(thorn, 0.04, 0.0, 0.3, loc=(math.cos(a) * 0.22, math.sin(a) * 0.22, 2.72), rot=(math.degrees(math.sin(a)) * -0.5, math.degrees(math.cos(a)) * 0.5, 0), seg=5)
    # thorns all over the vines, and a few pale leaves
    for _ in range(70):
        v = rng.choice(vines)
        k = rng.randrange(1, 9)
        x, y, z, r = v[k]
        d = Vector((x, y, 0)).normalized() if abs(x) + abs(y) > 0.01 else Vector((1, 0, 0))
        loc = Vector((x, y, z)) + d * r * 0.8
        rot = d.to_track_quat("Z", "Y").to_euler()
        p.cone(thorn, 0.03, 0.0, 0.17, loc=tuple(loc + d * 0.06), rot=tuple(math.degrees(a) for a in rot), seg=5)
    for _ in range(14):
        v = rng.choice(vines)
        x, y, z, r = v[rng.randrange(2, 8)]
        p.sphere(leaf, 0.12, loc=(x * 1.2, y * 1.2, z), scale=(1.3, 0.3, 0.7), rot=(0, 0, math.degrees(math.atan2(y, x))), seg=8, rings=5)
    p.done(root)
    for s, nm in ((1, "r"), (-1, "l")):
        arm = empty("lash_" + nm, root, (s * 0.3, 0, 2.2))
        a = Part("lash_mesh_" + nm, 12 + s)
        pts = [(0, 0, 0, 0.1), (s * 0.45, 0.25, 0.15, 0.09), (s * 0.9, 0.5, 0.2, 0.08), (s * 1.25, 0.75, -0.15, 0.06), (s * 1.6, 1.0, -0.6, 0.035), (s * 1.75, 1.05, -0.85, 0.012)]
        a.tube(green, pts, seg=8, rough=0.15)
        for k in range(1, 5):
            x, y, z, r = pts[k]
            a.cone(thorn, 0.025, 0.0, 0.14, loc=(x, y, z + r), seg=5)
            a.cone(thorn, 0.025, 0.0, 0.14, loc=(x, y + r, z), rot=(-90, 0, 0), seg=5)
        a.done(arm)
    export("vine_horror")


# ---------------------------------------------------------------- spiders and Ryytaa
def spider(name, pale):
    reset()
    root = empty(name)
    base(0.55).parent = root
    if pale:
        body_c = mat("ryy_body", "#d8d0c0", 0.55)
        dark_c = mat("ryy_mark", "#5a4a3a", 0.7)
        leg_c = mat("ryy_leg", "#c4baa6", 0.6)
        joint_c = mat("ryy_joint", "#8a7a66", 0.6)
    else:
        body_c = mat("sp_body", "#2a2320", 0.55)
        dark_c = mat("sp_mark", "#6a5040", 0.7)
        leg_c = mat("sp_leg", "#221c19", 0.6)
        joint_c = mat("sp_joint", "#3e3026", 0.6)
    eye = mat("sp_eye", "#ff2a18", 0.15, 0.0, "#ff3020", 3.0)
    fang = mat("fang", "#0e0b0a", 0.25)
    bristle = mat("bristle", "#14100e" if not pale else "#9a8c78", 0.9)
    body = empty("Body", root)
    p = Part("Torso", 21 if pale else 22)
    p.sphere(body_c, 0.27, loc=(0, 0.1, 0.5), scale=(1.0, 1.18, 0.68), seg=16, rings=10, rough=0.03, freq=8)
    p.tube(body_c, [(0, -0.12, 0.52, 0.08), (0, -0.2, 0.55, 0.07)], seg=8, cap=False)
    p.sphere(body_c, 0.4, loc=(0, -0.52, 0.64), scale=(1.0, 1.32, 0.86), seg=18, rings=12, rough=0.04, freq=5)
    # markings down the back: chevrons
    for i in range(5):
        y = -0.3 - i * 0.12
        z = 0.95 - abs(y + 0.55) * 0.35
        for s in (-1, 1):
            p.box(dark_c, (0.16 - i * 0.02, 0.035, 0.02), loc=(s * 0.06, y, z), rot=(0, 0, s * 35))
    # eight eyes, two rows
    for i, (ex, ez, er) in enumerate([(-0.05, 0.62, 0.035), (0.05, 0.62, 0.035), (-0.12, 0.6, 0.022), (0.12, 0.6, 0.022),
                                       (-0.035, 0.57, 0.024), (0.035, 0.57, 0.024), (-0.09, 0.56, 0.018), (0.09, 0.56, 0.018)]):
        p.sphere(eye, er, loc=(ex, 0.38 - abs(ex) * 0.4, ez), seg=8, rings=6)
    # chelicerae and fangs
    for s in (-1, 1):
        p.sphere(body_c, 0.06, loc=(s * 0.06, 0.4, 0.42), scale=(1, 1.2, 1.4), seg=8, rings=6)
        p.tube(fang, [(s * 0.06, 0.44, 0.36, 0.022), (s * 0.055, 0.47, 0.27, 0.014), (s * 0.035, 0.44, 0.2, 0.002)], seg=6)
        p.tube(leg_c, [(s * 0.12, 0.33, 0.45, 0.025), (s * 0.18, 0.46, 0.4, 0.022), (s * 0.15, 0.55, 0.3, 0.015)], seg=6)
    if not pale:
        for _ in range(30):
            a = p.rng.random() * math.tau
            zz = p.rng.uniform(0.55, 0.95)
            loc = (math.cos(a) * 0.3, -0.52 + math.sin(a) * 0.42, zz)
            p.cone(bristle, 0.012, 0.0, 0.08, loc=loc, rot=(p.rng.uniform(-40, 40), p.rng.uniform(-40, 40), 0), seg=4)
    p.done(body)
    legs = empty("Legs", body)
    for side in (-1, 1):
        for i in range(4):
            y = 0.22 - i * 0.15
            spread = (i - 1.5) * 0.45
            hip = (side * 0.18, y, 0.5)
            pts = [hip,
                   (side * 0.45, y - spread * 0.35, 0.82),
                   (side * 0.72, y - spread * 0.9, 0.98),
                   (side * 0.9, y - spread * 1.3, 0.6),
                   (side * 1.02, y - spread * 1.55, 0.2),
                   (side * 1.08, y - spread * 1.65, 0.02)]
            radii = [0.05, 0.048, 0.042, 0.034, 0.022, 0.01]
            lg = Part("Leg%d%s" % (i, "R" if side == 1 else "L"), 30 + i * 2 + side)
            lg.tube(leg_c, [(*pts[k], radii[k]) for k in range(6)], seg=8)
            for k in (1, 2, 3):
                lg.sphere(joint_c, radii[k] * 1.25, loc=pts[k], seg=8, rings=6)
            if not pale:
                for k in range(1, 4):
                    a, b = Vector(pts[k]), Vector(pts[k + 1])
                    for t in (0.3, 0.6):
                        c = a.lerp(b, t)
                        lg.cone(bristle, 0.008, 0.0, 0.07, loc=tuple(c + Vector((0, 0, radii[k]))), rot=(0, side * 30, 0), seg=4)
            lg.done(legs)
    export(name)


# ---------------------------------------------------------------- the dead
def skeleton(name, sitting, armor, rust=False, sword=False):
    reset()
    root = empty(name)
    bone = mat("bone", "#d9d2bd", 0.7)
    dark = mat("socket", "#080706", 1.0)
    steel = mat("rust_plate" if rust else "dented_plate", "#6a4a30" if rust else "#6b6e70", 0.6 if rust else 0.45, 0.4 if rust else 0.7)
    leather = mat("old_leather", "#2e2218", 0.9)
    p = Part("Bones", 41 + sitting)
    if sitting:
        pelvis = Vector((0, -0.05, 0.18))
        knees = [(-0.13, 0.4, 0.26), (0.15, 0.38, 0.22)]
        feet = [(-0.16, 0.72, 0.05), (0.2, 0.7, 0.05)]
        spine = [(0, -0.06, 0.22), (0, -0.12, 0.45), (0.02, -0.1, 0.72)]
        head = Vector((0.05, -0.02, 0.92))
        sh = [(-0.22, -0.08, 0.72), (0.24, -0.08, 0.72)]
        el = [(-0.3, 0.02, 0.45), (0.3, 0.05, 0.42)]
        hn = [(-0.18, 0.25, 0.3), (0.16, 0.28, 0.3)]
    else:
        pelvis = Vector((0, 0, 0.85))
        knees = [(-0.11, 0.03, 0.45), (0.12, -0.02, 0.47)]
        feet = [(-0.13, 0.04, 0.03), (0.14, 0.0, 0.05)]
        spine = [(0, 0, 0.88), (0, -0.02, 1.15), (0, 0.0, 1.38)]
        head = Vector((0.03, 0.04, 1.58))
        sh = [(-0.2, 0, 1.38), (0.2, 0, 1.38)]
        el = [(-0.38, 0.02, 1.62), (0.36, 0.05, 1.12)]
        hn = [(-0.42, 0.04, 1.9), (0.3, 0.12, 0.88)]
    p.sphere(bone, 0.1, loc=tuple(pelvis), scale=(1.6, 0.9, 0.75), seg=10, rings=7)
    for k, f, s in zip(knees, feet, (-1, 1)):
        hip = pelvis + Vector((s * 0.1, 0, -0.02))
        p.tube(bone, [(*hip, 0.035), (*k, 0.03)], seg=6)
        p.sphere(bone, 0.042, loc=k, seg=8, rings=6)
        p.tube(bone, [(*k, 0.03), (*f, 0.024)], seg=6)
        p.box(bone, (0.07, 0.15, 0.04), loc=(f[0], f[1] + 0.06, f[2]))
    p.tube(bone, [(*sp, 0.03) for sp in spine], seg=6)
    for i in range(6):
        t = i / 5
        z = spine[1][2] + (spine[2][2] - spine[1][2]) * t
        y = spine[1][1] + 0.06
        p.torus(bone, 0.11 + 0.04 * math.sin(t * math.pi), 0.012, loc=(0, y, z), scale=(1, 0.75, 1), seg=14, rseg=4, arc=300, rot=(0, 0, -60))
    for s_, e_, h_ in zip(sh, el, hn):
        p.tube(bone, [(*s_, 0.028), (*e_, 0.024)], seg=6)
        p.sphere(bone, 0.032, loc=e_, seg=6, rings=5)
        p.tube(bone, [(*e_, 0.022), (*h_, 0.018)], seg=6)
        for f in range(4):
            p.tube(bone, [(*h_, 0.008), (h_[0] + (f - 1.5) * 0.02, h_[1] + 0.07, h_[2] - 0.03, 0.006)], seg=4)
    # skull with jaw and hollow eyes
    p.sphere(bone, 0.125, loc=tuple(head), scale=(0.9, 1.05, 1.0), seg=14, rings=10)
    p.sphere(bone, 0.075, loc=tuple(head + Vector((0, 0.07, -0.1))), scale=(1.1, 0.9, 0.6), seg=10, rings=6)
    for s in (-1, 1):
        p.sphere(dark, 0.034, loc=tuple(head + Vector((s * 0.045, 0.105, 0.01))), seg=8, rings=6)
    p.cone(dark, 0.018, 0.0, 0.04, loc=tuple(head + Vector((0, 0.12, -0.04))), rot=(90, 0, 0), seg=4)
    for t in range(6):
        p.box(bone, (0.012, 0.01, 0.022), loc=tuple(head + Vector(((t - 2.5) * 0.017, 0.11, -0.075))))
    if armor:
        chest = Vector((0, spine[1][1] + 0.06, (spine[1][2] + spine[2][2]) / 2 + 0.02))
        # a dented breastplate over the ribs (front only, so the bones show at the sides)
        p.cap(steel, 0.34, 0.62, loc=tuple(chest + Vector((0, 0.15, 0.02))), scale=(0.95, 0.55, 1.15), dent=0.018, rings=6)
        p.torus(leather, 0.15, 0.015, loc=tuple(chest + Vector((0, 0.02, -0.14))), scale=(1, 0.7, 1), seg=18, rseg=5)
        p.cap(steel, 0.2, 0.75, loc=(sh[0][0] - 0.02, sh[0][1], sh[0][2] + 0.05), rot=(0, 0, 90), scale=(0.7, 0.6, 0.75), dent=0.015)
        if sitting:
            p.cap(steel, 0.2, 0.75, loc=(sh[1][0] + 0.02, sh[1][1], sh[1][2] + 0.05), rot=(0, 0, -90), scale=(0.7, 0.6, 0.75), dent=0.015)
    if sword:
        h_ = hn[1]
        blade = mat("rust_blade", "#5a4a3a", 0.6, 0.5)
        p.box(blade, (0.04, 0.012, 0.75), loc=(h_[0], h_[1], h_[2] - 0.38), rot=(0, 8, 0))
        p.box(blade, (0.18, 0.03, 0.03), loc=(h_[0], h_[1], h_[2] + 0.0))
    p.done(root)
    export(name)


# ---------------------------------------------------------------- what the hero carries
def axe():
    reset()
    root = empty("axe")
    wood = mat("haft", "#4a3020", 0.7)
    wrap = mat("grip", "#2e1d10", 0.8)
    steel = mat("axe_steel", "#9aa0a6", 0.22, 0.95)
    dark = mat("axe_dark", "#5c6066", 0.4, 0.9)
    gold = mat("axe_gold", "#b08a40", 0.3, 0.9)
    p = Part("Haft", 51)
    p.tube(wood, [(0, 0, -0.22, 0.032), (0, 0, 0.4, 0.034), (0, 0, 1.12, 0.03)], seg=10)
    for i in range(7):
        p.torus(wrap, 0.036, 0.008, loc=(0, 0, -0.15 + i * 0.045), seg=12, rseg=4)
    p.sphere(gold, 0.045, loc=(0, 0, -0.24), scale=(1, 1, 0.8), seg=10, rings=6)
    for z in (0.33, 0.85):
        p.torus(gold, 0.037, 0.009, loc=(0, 0, z), seg=12, rseg=4)
    p.box(dark, (0.08, 0.1, 0.2), loc=(0, 0.0, 1.02))
    # the blade: a bearded crescent, thick at the socket and thin at the edge
    outline = [(0.05, 0.1), (0.16, 0.17), (0.3, 0.25), (0.38, 0.27), (0.42, 0.18), (0.45, 0.04), (0.45, -0.08), (0.41, -0.2), (0.34, -0.3), (0.28, -0.31), (0.2, -0.17), (0.12, -0.09), (0.05, -0.07)]
    cy, cz = 0.22, -0.01
    bm = p.bm
    front, back = [], []
    for (y, z) in outline:
        t = max(0.0, min(1.0, (y - 0.05) / 0.4))
        th = 0.032 * (1 - t) + 0.004 * t
        front.append(bm.verts.new((th, y, z + 1.02)))
        back.append(bm.verts.new((-th, y, z + 1.02)))
    cf = bm.verts.new((0.03, cy, cz + 1.02))
    cb = bm.verts.new((-0.03, cy, cz + 1.02))
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((cf, front[i], front[j]))
        bm.faces.new((cb, back[j], back[i]))
        bm.faces.new((front[i], back[i], back[j], front[j]))
    p._tag(front + back + [cf, cb], steel, False)
    p.cone(dark, 0.035, 0.0, 0.2, loc=(0, -0.13, 1.02), rot=(90, 0, 0), seg=4)
    for i, z in enumerate((0.25, 0.47, 0.69)):
        pass
    p.done(root)
    for i, (col, z) in enumerate((("#e0243a", 0.75), ("#2a5ae0", 0.59), ("#20c060", 0.43))):
        g = Part("Gem%d" % i, 60 + i)
        gm = mat("gem%d" % i, col, 0.05, 0.0, col, 2.5)
        g.ico(gm, 0.04, loc=(0, 0.032, z), scale=(1, 0.7, 1.25))
        g.torus(gold, 0.042, 0.008, loc=(0, 0.03, z), rot=(90, 0, 0), scale=(1, 1.25, 1), seg=12, rseg=4)
        g.done(root)
    export("axe")


def shield():
    reset()
    root = empty("shield")
    steel = mat("pauldron", "#7c8084", 0.45, 0.75)
    dark = mat("pauldron_dark", "#4a4e52", 0.5, 0.7)
    leather = mat("strap", "#3a2616", 0.85)
    p = Part("Plate", 71)
    p.cap(steel, 0.42, 0.85, scale=(1.0, 1.0, 1.25), seg=24, rings=7, dent=0.02)
    rim_y = 0.42 * math.cos(0.85) - 0.42
    p.torus(dark, 0.42 * math.sin(0.85), 0.014, loc=(0, rim_y, 0), rot=(90, 0, 0), scale=(1, 1.25, 1), seg=28, rseg=5)
    for i in range(8):
        a = math.tau * i / 8
        r = 0.42 * math.sin(0.85) - 0.03
        p.sphere(dark, 0.014, loc=(math.cos(a) * r, rim_y + 0.015, math.sin(a) * r * 1.25), seg=6, rings=4)
    p.box(leather, (0.34, 0.02, 0.05), loc=(0, rim_y - 0.03, 0))
    p.done(root)
    export("shield")


def torch():
    reset()
    root = empty("torch")
    wood = mat("torch_wood", "#5a3c22", 0.8)
    cloth = mat("torch_cloth", "#4a3a2a", 0.95)
    p = Part("Stick", 81)
    p.tube(wood, [(0, 0, -0.12, 0.024), (0, 0, 0.3, 0.027), (0, 0, 0.47, 0.03)], seg=8, rough=0.1)
    p.lathe(cloth, [(0.03, 0.42), (0.05, 0.46), (0.055, 0.52), (0.048, 0.58), (0.02, 0.61)], seg=10, rough=0.15)
    p.done(root)
    f = Part("Flame", 82)
    fl = mat("flame", "#ff9a30", 0.5, 0.0, "#ff8a20", 1.4)
    f.lathe(fl, [(0.05, 0.6), (0.06, 0.65), (0.045, 0.72), (0.02, 0.8), (0.004, 0.86)], seg=10, rough=0.15)
    f.done(root)
    export("torch")


def knife():
    reset()
    root = empty("knife")
    p = Part("Knife", 91)
    p.tube(mat("knife_grip", "#3a2616", 0.8), [(0, -0.06, 0, 0.018), (0, 0.06, 0, 0.02)], seg=8)
    p.box(mat("knife_guard", "#6a5a40", 0.4, 0.8), (0.08, 0.015, 0.025), loc=(0, 0.07, 0))
    p.cone(mat("knife_blade", "#a0a6ac", 0.25, 0.9), 0.022, 0.0, 0.26, loc=(0, 0.2, 0), rot=(-90, 0, 0), seg=4, smooth=False, scale=(1.0, 0.25, 1.0))
    p.done(root)
    export("knife")


def egg_sac():
    reset()
    root = empty("egg_sac")
    sac = mat("egg_sac", "#e6e0cc", 0.65, 0.0, "#a09a70", 0.25, alpha=0.93)
    vein = mat("egg_vein", "#9a8a6a", 0.8)
    p = Part("Sac", 101)
    p.sphere(sac, 0.5, loc=(0, 0, 0.45), scale=(1, 1, 0.92), seg=18, rings=12, rough=0.09, freq=3)
    p.sphere(sac, 0.18, loc=(0, 0, 0.92), scale=(1, 1, 0.6), seg=10, rings=6, rough=0.1, freq=5)
    for i in range(7):
        a = math.tau * i / 7 + p.rng.uniform(-0.2, 0.2)
        pts = []
        for k in range(7):
            t = k / 6
            ph = 0.2 + t * 2.4
            rr = 0.5 * math.sin(ph) + 0.005
            pts.append((math.cos(a + t * 0.6) * rr, math.sin(a + t * 0.6) * rr, 0.45 + 0.46 * math.cos(ph), 0.012))
        p.tube(vein, pts, seg=4, cap=False)
    p.done(root)
    export("egg_sac")


hero()
stranger("stranger_a", "#3a332c", "a")
stranger("stranger_b", "#2e3234", "b")
vine_horror()
spider("spider", False)
spider("ryytaa", True)
skeleton("skeleton_sit", True, True)
skeleton("skeleton_hang_armor", False, True, rust=True, sword=True)
skeleton("skeleton_hang_bare", False, False)
axe()
shield()
torch()
knife()
egg_sac()
print("all models built")
