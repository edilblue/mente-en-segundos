"""Prueba de estilo 3D con Blender (bpy como librería de Python).

Tema: ¿Qué pasa con tu cerebro cuando no duermes 24 horas?
Escena: habitación de noche, un personaje original desvelado mirando el
celular; la cámara se acerca a su cabeza, que se vuelve transparente y deja
ver el cerebro con zonas que se apagan.

Uso:
    python blender/sleep_test.py --out build/bt/frames [--still 60] [--scale 0.667] [--samples 16]
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

FPS = 30
DUR = 8.0
N = int(FPS * DUR)

ap = argparse.ArgumentParser()
ap.add_argument("--out", default="build/bt/frames")
ap.add_argument("--still", type=int, nargs="*")
ap.add_argument("--scale", type=float, default=0.6667)
ap.add_argument("--samples", type=int, default=16)
ap.add_argument("--start", type=int, default=1)
ap.add_argument("--end", type=int, default=N)
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, N


# ------------------------------------------------------------------ helpers
def mat(name, col, rough=0.5, emit=None, emit_str=0.0, sss=0.0, metallic=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metallic
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (0.4, 0.15, 0.1)
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = emit_str
    b.inputs["Alpha"].default_value = alpha
    return m


def setmat(o, m):
    o.data.materials.clear()
    o.data.materials.append(m)
    return o


def attach(o, parent):
    bpy.context.view_layer.update()
    mw = o.matrix_world.copy()
    o.parent = parent
    o.matrix_world = mw
    return o


def smooth(o, sub=2):
    for p in o.data.polygons:
        p.use_smooth = True
    if sub:
        md = o.modifiers.new("sub", "SUBSURF")
        md.levels = md.render_levels = sub
    return o


def sphere(name, loc, scale, m, parent=None, sub=1, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    smooth(o, sub)
    setmat(o, m)
    if parent:
        attach(o, parent)
    return o


def capsule(name, p0, p1, r, m, parent=None):
    """Cápsula entre dos puntos (miembros del personaje)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    L = d.length
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=r, depth=L, location=(p0 + p1) / 2)
    cyl = bpy.context.object
    cyl.rotation_mode = "QUATERNION"
    cyl.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    objs = [cyl]
    for p in (p0, p1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=r, location=p)
        objs.append(bpy.context.object)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = cyl
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.remove_doubles(threshold=0.001)
    bpy.ops.object.mode_set(mode="OBJECT")
    smooth(o, 1)
    setmat(o, m)
    if parent:
        attach(o, parent)
    return o


def limb(name, pts, r, m, parent=None):
    """Extremidad suave: curva NURBS con bisel redondo y tapas."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = 6
    cu.use_fill_caps = True
    sp = cu.splines.new("NURBS")
    sp.points.add(len(pts) - 1)
    for i, q in enumerate(pts):
        sp.points[i].co = (*q, 1)
    sp.use_endpoint_u = True
    sp.order_u = min(3, len(pts))
    sp.resolution_u = 16
    o = bpy.data.objects.new(name, cu)
    sc.collection.objects.link(o)
    o.data.materials.append(m)
    for q in (pts[0], pts[-1]):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=r * 1.0, location=q)
        c = bpy.context.object
        smooth(c, 1)
        setmat(c, m)
        if parent:
            attach(c, parent)
    if parent:
        attach(o, parent)
    return o


def box(name, loc, size, m, bevel=0.02, parent=None):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.location = loc
    if bevel:
        md = o.modifiers.new("bev", "BEVEL")
        md.width = bevel
        md.segments = 4
    for p in o.data.polygons:
        p.use_smooth = True
    setmat(o, m)
    if parent:
        attach(o, parent)
    return o


def empty(name, loc, parent=None):
    o = bpy.data.objects.new(name, None)
    sc.collection.objects.link(o)
    o.location = loc
    if parent:
        o.parent = parent
    return o


def key(o, frame, **kw):
    for k, v in kw.items():
        setattr(o, k, v)
        o.keyframe_insert(data_path=k, frame=frame)


def ease_all():
    for o in bpy.data.objects:
        ad = o.animation_data
        if ad and ad.action:
            try:
                for fc in ad.action.fcurves:
                    for kp in fc.keyframe_points:
                        kp.interpolation = "BEZIER"
                        kp.easing = "EASE_IN_OUT"
            except AttributeError:
                pass


# ------------------------------------------------------------- materiales
M_WALL = mat("wall", (0.20, 0.24, 0.42), 0.9)
M_WALL2 = mat("wall2", (0.16, 0.19, 0.36), 0.9)
M_FLOOR = mat("floor", (0.32, 0.20, 0.13), 0.55)
M_TRIM = mat("trim", (0.85, 0.85, 0.9), 0.5)
M_BED = mat("bed", (0.45, 0.28, 0.18), 0.6)
M_SHEET = mat("sheet", (0.85, 0.88, 0.95), 0.8)
M_BLANKET = mat("blanket", (0.92, 0.55, 0.20), 0.85)
M_PILLOW = mat("pillow", (0.95, 0.95, 1.0), 0.8)
M_SKIN = mat("skin", (0.98, 0.76, 0.60), 0.45, sss=0.15)
M_HAIR = mat("hair", (0.95, 0.42, 0.10), 0.55)        # pelo naranja: rasgo propio del personaje
M_PJ = mat("pj", (0.10, 0.62, 0.58), 0.7)             # pijama verde azulado
M_PJ2 = mat("pj2", (0.06, 0.40, 0.40), 0.7)
M_EYE = mat("eye", (0.98, 0.98, 1.0), 0.15)
M_PUPIL = mat("pupil", (0.03, 0.03, 0.05), 0.1)
M_RED = mat("redeye", (0.95, 0.55, 0.55), 0.3)
M_BAGS = mat("bags", (0.50, 0.32, 0.50), 0.6)
M_MOUTH = mat("mouth", (0.22, 0.04, 0.06), 0.5)
M_PHONE = mat("phone", (0.05, 0.05, 0.07), 0.3)
M_SCREEN = mat("screen", (0.6, 0.85, 1.0), 0.2, emit=(0.6, 0.85, 1.0), emit_str=6.0)
M_CLOCK = mat("clock", (0.12, 0.12, 0.14), 0.4)
M_DIGITS = mat("digits", (1.0, 0.15, 0.1), 0.3, emit=(1.0, 0.12, 0.08), emit_str=12.0)
M_GLASS = mat("glass", (0.1, 0.15, 0.3), 0.1, emit=(0.25, 0.35, 0.7), emit_str=0.6)
M_MOON = mat("moon", (1, 1, 1), 0.5, emit=(0.85, 0.9, 1.0), emit_str=8.0)
M_LAMP = mat("lampshade", (1.0, 0.85, 0.6), 0.6, emit=(1.0, 0.7, 0.35), emit_str=3.0)
M_WOOD = mat("wood", (0.35, 0.21, 0.13), 0.6)
M_RUG = mat("rug", (0.12, 0.16, 0.3), 0.95)

# Cerebro: rosa con surcos (bump con textura de ondas distorsionadas) + emisión animable
M_BRAIN = bpy.data.materials.new("brain")
nt = M_BRAIN.node_tree
bsdf = nt.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.95, 0.55, 0.62, 1)
bsdf.inputs["Roughness"].default_value = 0.35
bsdf.inputs["Subsurface Weight"].default_value = 0.25
bsdf.inputs["Subsurface Radius"].default_value = (0.5, 0.2, 0.2)
wave = nt.nodes.new("ShaderNodeTexWave")
wave.inputs["Scale"].default_value = 3.5
wave.inputs["Distortion"].default_value = 18.0
wave.inputs["Detail"].default_value = 4.0
wave.inputs["Detail Scale"].default_value = 1.5
bump = nt.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.9
bump.inputs["Distance"].default_value = 0.03
nt.links.new(wave.outputs["Fac"], bump.inputs["Height"])
nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.55, 0.18, 0.28, 1)
ramp.color_ramp.elements[1].color = (1.0, 0.68, 0.72, 1)
nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
# Zonas activas (emisión cian) moduladas por ruido: "actividad" animable vía Emission Strength
noise = nt.nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 2.2
ramp2 = nt.nodes.new("ShaderNodeValToRGB")
ramp2.color_ramp.elements[0].position = 0.55
ramp2.color_ramp.elements[0].color = (0, 0, 0, 1)
ramp2.color_ramp.elements[1].position = 0.75
ramp2.color_ramp.elements[1].color = (0.2, 0.75, 1.0, 1)
nt.links.new(noise.outputs["Fac"], ramp2.inputs["Fac"])
nt.links.new(ramp2.outputs["Color"], bsdf.inputs["Emission Color"])
bsdf.inputs["Emission Strength"].default_value = 0.0
BRAIN_NOISE = noise

# Piel de la cabeza con transparencia animable (mezcla con shader transparente)
M_HEAD = bpy.data.materials.new("head_skin")
nt = M_HEAD.node_tree
b = nt.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (0.98, 0.76, 0.60, 1)
b.inputs["Roughness"].default_value = 0.45
b.inputs["Subsurface Weight"].default_value = 0.15
out = nt.nodes["Material Output"]
tr = nt.nodes.new("ShaderNodeBsdfTransparent")
glass_rim = nt.nodes.new("ShaderNodeEmission")
glass_rim.inputs["Color"].default_value = (0.35, 0.8, 1.0, 1)
lw = nt.nodes.new("ShaderNodeLayerWeight")
lw.inputs["Blend"].default_value = 0.35
rim_mix = nt.nodes.new("ShaderNodeMixShader")
nt.links.new(lw.outputs["Facing"], rim_mix.inputs["Fac"])
nt.links.new(tr.outputs[0], rim_mix.inputs[1])
nt.links.new(glass_rim.outputs[0], rim_mix.inputs[2])
mix = nt.nodes.new("ShaderNodeMixShader")
nt.links.new(b.outputs[0], mix.inputs[1])
nt.links.new(rim_mix.outputs[0], mix.inputs[2])
nt.links.new(mix.outputs[0], out.inputs["Surface"])
HEAD_MIX = mix.inputs["Fac"]
FADE_SOCKETS = []


def fadeable(src, name):
    """Copia del material que puede volverse vidrio (para el rayos X de la cabeza)."""
    m = src.copy()
    m.name = name
    nt_ = m.node_tree
    bs = nt_.nodes["Principled BSDF"]
    o_ = nt_.nodes["Material Output"]
    t_ = nt_.nodes.new("ShaderNodeBsdfTransparent")
    mx = nt_.nodes.new("ShaderNodeMixShader")
    nt_.links.new(bs.outputs[0], mx.inputs[1])
    nt_.links.new(t_.outputs[0], mx.inputs[2])
    nt_.links.new(mx.outputs[0], o_.inputs["Surface"])
    FADE_SOCKETS.append(mx.inputs["Fac"])
    return m
M_HAIRX = M_HEAD.copy()
M_HAIRX.name = "hair_x"
M_HAIRX.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.95, 0.42, 0.10, 1)
M_HAIRX.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.55
HAIR_MIX = [n for n in M_HAIRX.node_tree.nodes if n.type == "MIX_SHADER" and n.inputs[1].links
            and n.inputs[1].links[0].from_node.type == "BSDF_PRINCIPLED"][0].inputs["Fac"]

M_FACE = fadeable(M_SKIN, "face")
M_EYE_F = fadeable(M_EYE, "eye_f")
M_PUPIL_F = fadeable(M_PUPIL, "pupil_f")
M_BAGS_F = fadeable(M_BAGS, "bags_f")
M_MOUTH_F = fadeable(M_MOUTH, "mouth_f")

# ------------------------------------------------------------- habitación
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
setmat(bpy.context.object, M_FLOOR)
box("rug", (0.2, -0.6, 0.005), (2.6, 1.8, 0.01), M_RUG, bevel=0.0)
box("wall_back", (0, 2.2, 1.6), (8, 0.1, 3.2), M_WALL, bevel=0)
box("wall_left", (-2.6, 0, 1.6), (0.1, 6, 3.2), M_WALL2, bevel=0)
box("base_back", (0, 2.13, 0.06), (8, 0.04, 0.12), M_TRIM, bevel=0.005)
# Ventana con luna
box("win_frame", (1.6, 2.14, 1.85), (1.3, 0.06, 1.2), M_TRIM, bevel=0.01)
box("win_glass", (1.6, 2.12, 1.85), (1.15, 0.05, 1.05), M_GLASS, bevel=0)
box("win_bar_v", (1.6, 2.1, 1.85), (0.05, 0.04, 1.05), M_TRIM, bevel=0)
box("win_bar_h", (1.6, 2.1, 1.85), (1.15, 0.04, 0.05), M_TRIM, bevel=0)
sphere("moon", (1.85, 2.11, 2.12), (0.13, 0.01, 0.13), M_MOON, sub=0)
# Cuadro y estante
box("frame", (-1.2, 2.14, 2.0), (0.7, 0.04, 0.5), M_TRIM, bevel=0.01)
box("frame_art", (-1.2, 2.11, 2.0), (0.6, 0.03, 0.4), mat("art", (0.95, 0.75, 0.3), 0.6), bevel=0)

# Cama
box("bed_base", (-0.6, 1.0, 0.22), (1.6, 2.2, 0.3), M_BED, bevel=0.04)
box("mattress", (-0.6, 1.0, 0.45), (1.5, 2.1, 0.2), M_SHEET, bevel=0.08)
box("headboard", (-0.6, 2.07, 0.75), (1.7, 0.12, 0.9), M_BED, bevel=0.05)
box("blanket", (-0.6, 0.75, 0.57), (1.56, 1.4, 0.06), M_BLANKET, bevel=0.03)
box("pillow", (-0.6, 1.75, 0.62), (0.9, 0.38, 0.14), M_PILLOW, bevel=0.07)

# Mesita, reloj y lámpara
box("nightstand", (0.65, 1.7, 0.3), (0.55, 0.45, 0.6), M_WOOD, bevel=0.03)
box("clock", (0.55, 1.62, 0.68), (0.32, 0.14, 0.16), M_CLOCK, bevel=0.025)
bpy.ops.object.text_add(location=(0.55, 1.545, 0.68), rotation=(math.radians(90), 0, 0))
txt = bpy.context.object
txt.data.body = "4:00"
txt.data.align_x = "CENTER"
txt.data.align_y = "CENTER"
txt.data.size = 0.11
txt.data.extrude = 0.003
setmat(txt, M_DIGITS)
bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.3, location=(0.82, 1.78, 0.75))
setmat(bpy.context.object, M_WOOD)
bpy.ops.mesh.primitive_cone_add(radius1=0.16, radius2=0.09, depth=0.2, location=(0.82, 1.78, 0.95))
setmat(smooth(bpy.context.object, 0), M_LAMP)

# --------------------------------------------------------------- personaje
# Sentado en el borde de la cama mirando a cámara, con el celular en las manos.
root = empty("char_root", (-0.55, 0.25, 0.0))
SEAT_Z = 0.58
torso = empty("torso_pivot", (-0.55, 0.25, SEAT_Z), parent=None)
torso.parent = root
torso.matrix_parent_inverse = root.matrix_world.inverted()
capsule("torso", (-0.55, 0.25, SEAT_Z + 0.12), (-0.55, 0.25, SEAT_Z + 0.5), 0.2, M_PJ, parent=torso)
limb("neckmesh", [(-0.55, 0.25, SEAT_Z + 0.58), (-0.55, 0.245, SEAT_Z + 0.68), (-0.55, 0.24, SEAT_Z + 0.66)], 0.075, M_SKIN, parent=torso)
# Cabeza (pivote en el cuello para cabeceos)
neck = empty("neck", (-0.55, 0.25, SEAT_Z + 0.68))
neck.parent = torso
neck.matrix_parent_inverse = torso.matrix_world.inverted()
HC = Vector((-0.55, 0.23, SEAT_Z + 0.95))
head = sphere("head", HC, (0.27, 0.25, 0.28), M_HEAD, parent=neck, sub=2)
hair = sphere("hair", HC + Vector((0, 0.04, 0.09)), (0.285, 0.27, 0.24), M_HAIRX, parent=neck, sub=2)
bpy.context.view_layer.objects.active = hair
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.bisect(plane_co=HC + Vector((0, 0, 0.02)), plane_no=(0, -0.45, 1), clear_inner=True)
bpy.ops.object.mode_set(mode="OBJECT")
# Mechón
sphere("tuft", HC + Vector((0.06, -0.12, 0.27)), (0.07, 0.05, 0.1), M_HAIRX, parent=neck)
# Ojos con párpados pesados
eyes = []
for sx in (-1, 1):
    ec = HC + Vector((sx * 0.095, -0.215, 0.02))
    e = sphere(f"eye{sx}", ec, (0.06, 0.03, 0.06), M_EYE_F, parent=neck)
    p = sphere(f"pupil{sx}", ec + Vector((0, -0.028, -0.01)), (0.024, 0.01, 0.024), M_PUPIL_F, parent=neck)
    lid = sphere(f"lid{sx}", ec + Vector((0, -0.004, 0.0)), (0.066, 0.036, 0.066), M_FACE, parent=neck)
    # dejar sólo la mitad superior del párpado
    bpy.context.view_layer.objects.active = lid
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.bisect(plane_co=ec, plane_no=(0, 0, 1), clear_inner=True, use_fill=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    lid.rotation_mode = "XYZ"
    sphere(f"bag{sx}", ec + Vector((0, 0.005, -0.065)), (0.055, 0.02, 0.02), M_BAGS_F, parent=neck)
    eyes.append(lid)
mouth = sphere("mouth", HC + Vector((0, -0.235, -0.13)), (0.035, 0.02, 0.01), M_MOUTH_F, parent=neck)
nose = sphere("nose", HC + Vector((0, -0.26, -0.04)), (0.03, 0.03, 0.035), M_FACE, parent=neck)

# Brazos sosteniendo el celular
for sx in (-1, 1):
    sh = (-0.55 + sx * 0.19, 0.25, SEAT_Z + 0.5)
    el = (-0.55 + sx * 0.25, 0.14, SEAT_Z + 0.24)
    ha = (-0.55 + sx * 0.085, -0.07, SEAT_Z + 0.33)
    limb(f"arm{sx}", [sh, el, ha], 0.06, M_PJ, parent=torso)
    sphere(f"hand{sx}", ha, (0.06, 0.06, 0.065), M_SKIN, parent=torso)
phone = box("phone", (-0.55, -0.1, SEAT_Z + 0.38), (0.16, 0.02, 0.28), M_PHONE, bevel=0.015)
phone.rotation_euler = (math.radians(-25), 0, 0)
attach(phone, torso)
scr = box("screen", (-0.55, -0.113, SEAT_Z + 0.385), (0.14, 0.004, 0.25), M_SCREEN, bevel=0.0)
scr.rotation_euler = (math.radians(-25), 0, 0)
attach(scr, torso)
# Piernas (sentado): muslos hacia delante y pantorrillas hacia abajo
for sx in (-1, 1):
    hip = (-0.55 + sx * 0.1, 0.25, SEAT_Z + 0.06)
    knee = (-0.55 + sx * 0.12, -0.2, SEAT_Z + 0.03)
    foot = (-0.55 + sx * 0.13, -0.24, 0.11)
    limb(f"leg{sx}", [hip, (knee[0], knee[1] + 0.05, knee[2]), (knee[0], knee[1] - 0.02, knee[2] - 0.08), foot],
         0.08, M_PJ2, parent=root)
    sphere(f"foot{sx}", (foot[0], foot[1] - 0.05, 0.06), (0.07, 0.12, 0.055), M_SKIN, parent=root)

# Cerebro dentro de la cabeza
brain_parts = []
for sx in (-1, 1):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=HC + Vector((sx * 0.047, 0.01, 0.045)))
    o = bpy.context.object
    o.scale = (0.088, 0.175, 0.125)
    smooth(o, 2)
    setmat(o, M_BRAIN)
    o.parent = neck
    o.matrix_parent_inverse = neck.matrix_world.inverted()
    brain_parts.append(o)
cb = sphere("cerebellum", HC + Vector((0, 0.12, -0.065)), (0.1, 0.065, 0.05), M_BRAIN, parent=neck, sub=2)
brain_parts.append(cb)

# ------------------------------------------------------------------ luces
w = bpy.data.worlds.new("night")
sc.world = w
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.03, 0.08, 1)
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.25

bpy.ops.object.light_add(type="AREA", location=(1.6, 1.6, 1.9))
moon_l = bpy.context.object
moon_l.data.energy = 260
moon_l.data.color = (0.55, 0.7, 1.0)
moon_l.data.size = 1.2
moon_l.rotation_euler = (math.radians(70), 0, math.radians(150))
bpy.ops.object.light_add(type="POINT", location=(0.82, 1.78, 1.0))
lamp_l = bpy.context.object
lamp_l.data.energy = 70
lamp_l.data.color = (1.0, 0.65, 0.35)
lamp_l.data.shadow_soft_size = 0.2
bpy.ops.object.light_add(type="AREA", location=(-0.55, -0.35, SEAT_Z + 0.75))
phone_l = bpy.context.object
phone_l.data.energy = 30
phone_l.data.color = (0.6, 0.85, 1.0)
phone_l.data.size = 0.2
phone_l.rotation_euler = (math.radians(-80), 0, 0)
bpy.ops.object.light_add(type="AREA", location=(1.8, -2.5, 2.6))
key_l = bpy.context.object
key_l.data.energy = 45
key_l.data.color = (0.7, 0.75, 1.0)
key_l.data.size = 2.5
key_l.rotation_euler = (math.radians(55), 0, math.radians(35))
bpy.ops.object.light_add(type="AREA", location=(-2.0, -0.5, 2.2))
rim_l = bpy.context.object
rim_l.data.energy = 90
rim_l.data.color = (1.0, 0.45, 0.8)
rim_l.data.size = 1.0
rim_l.rotation_euler = (math.radians(60), 0, math.radians(-110))

# ------------------------------------------------------------------ cámara
bpy.ops.object.camera_add()
cam = bpy.context.object
sc.camera = cam
cam.data.lens = 32
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 2.8
target = empty("cam_target", HC + Vector((0, 0, -0.25)))
tc = cam.constraints.new("TRACK_TO")
tc.target = target
tc.track_axis = "TRACK_NEGATIVE_Z"
tc.up_axis = "UP_Y"
cam.data.dof.focus_object = target


def f(t):
    return int(round(t * FPS)) + 1


# Cámara: plano general -> se acerca a la cabeza -> rodea al cerebro
key(cam, f(0.0), location=(0.9, -2.9, 1.25))
key(cam, f(3.2), location=(0.25, -1.55, 1.45))
key(cam, f(5.0), location=(-0.3, -0.95, 1.62))
key(cam, f(8.0), location=(-1.15, -0.72, 1.72))
key(target, f(0.0), location=HC + Vector((0.15, 0.4, -0.45)))
key(target, f(3.2), location=HC + Vector((0, 0, -0.25)))
key(target, f(5.0), location=HC + Vector((0, 0.03, 0.02)))
key(target, f(8.0), location=HC + Vector((0, 0.03, 0.03)))

# Personaje: respiración, cabeceo por sueño, bostezo, parpadeos lentos
torso.rotation_mode = "XYZ"
neck.rotation_mode = "XYZ"
for k in range(0, 9):
    t = k * 1.0
    key(torso, f(t), scale=(1.0, 1.0, 1.0 + (0.012 if k % 2 else 0.0)))
key(neck, f(0.0), rotation_euler=(0, 0, 0))
key(neck, f(1.2), rotation_euler=(math.radians(14), 0, math.radians(4)))    # se le cae la cabeza
key(neck, f(1.55), rotation_euler=(math.radians(-6), 0, math.radians(-2)))  # despierta de golpe
key(neck, f(2.2), rotation_euler=(math.radians(-14), 0, 0))                 # bostezo, cabeza atrás
key(neck, f(3.3), rotation_euler=(math.radians(4), 0, 0))
key(neck, f(5.0), rotation_euler=(math.radians(3), 0, math.radians(-3)))
key(neck, f(6.5), rotation_euler=(math.radians(8), 0, math.radians(3)))
key(neck, f(8.0), rotation_euler=(math.radians(5), 0, 0))
key(mouth, f(1.8), scale=(0.035, 0.02, 0.01))
key(mouth, f(2.3), scale=(0.06, 0.02, 0.07))   # bostezo
key(mouth, f(2.9), scale=(0.06, 0.02, 0.07))
key(mouth, f(3.3), scale=(0.035, 0.02, 0.01))
for lid in eyes:
    # 0 = párpado a media asta (cansado), +60° = cerrado
    key(lid, f(0.0), rotation_euler=(math.radians(-25), 0, 0))
    key(lid, f(0.9), rotation_euler=(math.radians(-15), 0, 0))
    key(lid, f(1.2), rotation_euler=(math.radians(-100), 0, 0))
    key(lid, f(1.55), rotation_euler=(math.radians(0), 0, 0))
    key(lid, f(2.2), rotation_euler=(math.radians(-90), 0, 0))
    key(lid, f(3.3), rotation_euler=(math.radians(-30), 0, 0))
    key(lid, f(4.4), rotation_euler=(math.radians(-35), 0, 0))
    key(lid, f(4.6), rotation_euler=(math.radians(-100), 0, 0))
    key(lid, f(4.9), rotation_euler=(math.radians(-35), 0, 0))
    key(lid, f(8.0), rotation_euler=(math.radians(-50), 0, 0))

# Cabeza transparente y cerebro: actividad que se apaga por zonas
HEAD_MIX.default_value = 0.0
HEAD_MIX.keyframe_insert("default_value", frame=f(3.8))
HEAD_MIX.default_value = 0.92
HEAD_MIX.keyframe_insert("default_value", frame=f(4.8))
for fs in FADE_SOCKETS:
    fs.default_value = 0.0
    fs.keyframe_insert("default_value", frame=f(3.8))
    fs.default_value = 0.85
    fs.keyframe_insert("default_value", frame=f(4.8))
HAIR_MIX.default_value = 0.0
HAIR_MIX.keyframe_insert("default_value", frame=f(3.8))
HAIR_MIX.default_value = 0.95
HAIR_MIX.keyframe_insert("default_value", frame=f(4.8))
em = M_BRAIN.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
em.default_value = 0.0
em.keyframe_insert("default_value", frame=f(4.2))
em.default_value = 4.0
em.keyframe_insert("default_value", frame=f(5.0))
em.default_value = 3.0
em.keyframe_insert("default_value", frame=f(6.0))
em.default_value = 0.6
em.keyframe_insert("default_value", frame=f(7.2))
em.default_value = 1.2
em.keyframe_insert("default_value", frame=f(7.5))
em.default_value = 0.3
em.keyframe_insert("default_value", frame=f(8.0))
BRAIN_NOISE.noise_dimensions = "4D"
BRAIN_NOISE.inputs["W"].default_value = 0.0
BRAIN_NOISE.inputs["W"].keyframe_insert("default_value", frame=1)
BRAIN_NOISE.inputs["W"].default_value = 4.0
BRAIN_NOISE.inputs["W"].keyframe_insert("default_value", frame=N)
# Luz del celular parpadeando un poco
for k in range(0, N, 12):
    phone_l.data.energy = 30 + (8 if (k // 12) % 3 == 0 else 0)
    phone_l.data.keyframe_insert("energy", frame=k + 1)
ease_all()

# ------------------------------------------------------------------ render
r = sc.render
r.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = args.samples
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6
sc.cycles.transparent_max_bounces = 8
r.resolution_x = int(1080 * args.scale) // 2 * 2
r.resolution_y = int(1920 * args.scale) // 2 * 2
r.film_transparent = False
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Punchy"
r.use_persistent_data = True
r.image_settings.file_format = "PNG"
os.makedirs(args.out, exist_ok=True)
frames = args.still if args.still else range(args.start, args.end + 1)
for fr in frames:
    sc.frame_set(fr)
    r.filepath = os.path.join(os.path.abspath(args.out), f"f{fr:04d}.png")
    bpy.ops.render.render(write_still=True)
    print("frame", fr, flush=True)
