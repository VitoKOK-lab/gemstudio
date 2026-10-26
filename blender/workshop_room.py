# Builds the atelier room and workbench, bakes colour x ambient occlusion into atlases,
# and exports dist/models/workshop.glb. Layout follows workshop.js (three.js units, bench top at y = 0).
# Usage: blender -b -P workshop_room.py -- <out.glb> <texture-dir>
import bpy, bmesh, sys, math, os
import numpy as np

args = sys.argv[sys.argv.index('--') + 1:]
OUT, TEXDIR = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
groups = {'bench': [], 'room': [], 'metal': []}

def T(x, y, z):  # three.js (y up) -> Blender (z up)
    return (x, -z, y)

# ---------- materials ----------
def principled(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes['Principled BSDF']

def flat(name, color, rough=0.7, metal=0.0):
    m, n, l, b = principled(name)
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    return m

def noisy(name, color, amount=0.06, scale=8.0, rough=0.8):
    m, n, l, b = principled(name)
    tc = n.new('ShaderNodeTexCoord'); nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*[c * (1 - amount) for c in color], 1)
    ramp.color_ramp.elements[1].color = (*[min(1, c * (1 + amount)) for c in color], 1)
    l.new(tc.outputs['Object'], nz.inputs['Vector']); l.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    l.new(ramp.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough
    return m

def wood(name, light, dark, plank=(0.0, 0.0), grain_scale=(1.0, 14.0, 1.0)):
    """Oak: wave grain stretched along X, optional plank (brick) variation."""
    m, n, l, b = principled(name)
    tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = grain_scale
    wave = n.new('ShaderNodeTexWave'); wave.inputs['Scale'].default_value = 3.0
    wave.inputs['Distortion'].default_value = 2.5; wave.inputs['Detail'].default_value = 4.0
    nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 22.0
    mix = n.new('ShaderNodeMix'); mix.data_type = 'FLOAT'; mix.inputs['Factor'].default_value = 0.35
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*dark, 1); ramp.color_ramp.elements[1].color = (*light, 1)
    l.new(tc.outputs['Object'], mp.inputs['Vector']); l.new(mp.outputs['Vector'], wave.inputs['Vector'])
    l.new(tc.outputs['Object'], nz.inputs['Vector'])
    l.new(wave.outputs['Fac'], mix.inputs['A']); l.new(nz.outputs['Fac'], mix.inputs['B'])
    l.new(mix.outputs['Result'], ramp.inputs['Fac'])
    out = ramp.outputs['Color']
    if plank[0]:
        brick = n.new('ShaderNodeTexBrick'); brick.offset = 0.5
        brick.inputs['Scale'].default_value = 1.0
        brick.inputs['Brick Width'].default_value = plank[0]; brick.inputs['Row Height'].default_value = plank[1]
        brick.inputs['Mortar Size'].default_value = 0.006
        brick.inputs['Color1'].default_value = (1, 1, 1, 1); brick.inputs['Color2'].default_value = (0.82, 0.8, 0.78, 1)
        brick.inputs['Mortar'].default_value = (0.25, 0.2, 0.17, 1)
        l.new(tc.outputs['Object'], brick.inputs['Vector'])
        mul = n.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
        l.new(out, mul.inputs['A']); l.new(brick.outputs['Color'], mul.inputs['B']); out = mul.outputs['Result']
    l.new(out, b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.55
    return m

oak = wood('oak', (0.66, 0.47, 0.30), (0.42, 0.27, 0.15))
oak_top = wood('oak-top', (0.70, 0.51, 0.33), (0.46, 0.30, 0.17), plank=(9.0, 0.32))
floor_m = wood('floor', (0.55, 0.40, 0.27), (0.30, 0.19, 0.11), plank=(2.6, 0.36))
plaster = noisy('plaster', (0.92, 0.87, 0.79), 0.04, 3.0)
panel = noisy('panel', (0.80, 0.75, 0.66), 0.03, 6.0)
trim = flat('trim', (0.93, 0.90, 0.84), 0.6)
paper = flat('paper', (0.95, 0.93, 0.88), 0.9)
cloth = noisy('cloth', (0.66, 0.58, 0.56), 0.08, 40.0)
curtain = noisy('curtain', (0.96, 0.93, 0.87), 0.05, 14.0)
leaf = noisy('leaf', (0.24, 0.38, 0.22), 0.25, 12.0)
terracotta = noisy('pot', (0.68, 0.40, 0.28), 0.06, 10.0)
jars = [noisy('jar%d' % i, c, 0.04, 9.0) for i, c in enumerate([(0.71, 0.67, 0.64), (0.66, 0.71, 0.70), (0.83, 0.78, 0.69)])]
brass = flat('brass', (0.86, 0.66, 0.36), 0.28, 1.0)
steel = flat('steel', (0.56, 0.58, 0.60), 0.34, 1.0)
dark_metal = flat('dark-metal', (0.07, 0.07, 0.08), 0.45, 0.6)

# ---------- geometry helpers ----------
def finish(o, m, group, bevel):
    o.data.materials.append(m)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = 2; mod.limit_method = 'ANGLE'
    groups[group].append(o); return o

def box(w, h, d, x, y, z, m, group='room', bevel=0.012, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=T(x, y, z), rotation=rot)
    o = bpy.context.object; o.scale = (w, d, h); return finish(o, m, group, bevel)

def cyl(r, h, x, y, z, m, group='room', verts=32, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=T(x, y, z))
    return finish(bpy.context.object, m, group, bevel)

def rod(a, b, r, m, group='metal'):
    a, b = np.array(T(*a)), np.array(T(*b)); v = b - a; L = float(np.linalg.norm(v))
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=L, vertices=20, location=tuple((a + b) / 2))
    o = bpy.context.object
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = __import__('mathutils').Vector((0, 0, 1)).rotation_difference(__import__('mathutils').Vector(v))
    return finish(o, m, group, 0)

def sphere(r, x, y, z, m, group='room', scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=24, ring_count=12, location=T(x, y, z))
    o = bpy.context.object; o.scale = scale; return finish(o, m, group, 0)

# ---------- workbench (top surface exactly y = 0) ----------
box(9.4, 0.24, 6.0, 0, -0.12, 0, oak_top, 'bench', 0.03)
for zz in (2.92, -2.92): box(9.0, 0.5, 0.08, 0, -0.49, zz, oak, 'bench')
for xx in (4.42, -4.42): box(0.08, 0.5, 5.7, xx, -0.49, 0, oak, 'bench')
for xx in (-2.9, 0.0, 2.9):
    box(2.5, 0.36, 0.05, xx, -0.47, 2.985, oak, 'bench', 0.01)
    box(0.32, 0.05, 0.05, xx, -0.47, 3.03, brass, 'metal', 0.01)
for xx in (4.3, -4.3):
    for zz in (2.7, -2.7): box(0.22, 3.36, 0.22, xx, -1.92, zz, oak, 'bench', 0.02)
box(8.4, 0.07, 5.2, 0, -3.0, 0, oak, 'bench')
# Bench accessories kept where workshop.js put them.
box(1.05, 0.05, 0.7, -3.1, 0.025, 1.4, cloth, 'bench', 0.02)
box(0.95, 0.075, 0.75, 3.35, 0.0375, 1.1, steel, 'metal', 0.01)
box(0.85, 0.01, 0.65, 3.35, 0.08, 1.1, dark_metal, 'metal', 0)
for i in range(3): rod((3.07 + i * 0.24, 0.105, 0.9), (3.07 + i * 0.24, 0.105, 1.32), 0.025, brass)
# Potted plant at the back-left corner of the bench.
cyl(0.32, 0.5, -4.0, 0.25, -2.35, terracotta, 'bench', 28, 0.01)
for i in range(9):
    a = i * 2.4
    sphere(0.22, -4.0 + math.cos(a) * 0.2, 0.75 + (i % 3) * 0.15, -2.35 + math.sin(a) * 0.2, leaf, 'bench', (1, 1, 0.55))

# ---------- room ----------
box(20, 0.12, 16, 0, -3.66, 1.3, floor_m, 'room', 0)
WALL_Z, OPEN = -4.7, (-1.65, 3.05, 1.225, 4.375)  # window opening x0, x1, y0, y1
x0, x1, y0, y1 = OPEN
box(x0 + 10, 14, 0.18, (-10 + x0) / 2, 3.4, WALL_Z, plaster, 'room', 0)
box(7 - x1, 14, 0.18, (x1 + 7) / 2, 3.4, WALL_Z, plaster, 'room', 0)
box(x1 - x0, y0 + 3.6, 0.18, (x0 + x1) / 2, (y0 - 3.6) / 2, WALL_Z, plaster, 'room', 0)
box(x1 - x0, 10.4 - y1, 0.18, (x0 + x1) / 2, (y1 + 10.4) / 2, WALL_Z, plaster, 'room', 0)
box(0.18, 14, 18, 7, 3.4, 4.3, plaster, 'room', 0)
# Wainscoting with raised panels, chair rail and skirting on both walls.
for xx in np.arange(-9.2, 7.0, 1.6):
    box(1.3, 2.9, 0.035, xx + 0.65, -2.0, -4.6, panel, 'room', 0.01)
box(17, 0.1, 0.07, -1.5, 0.95, -4.58, trim, 'room', 0.02)
box(17, 0.3, 0.05, -1.5, -3.45, -4.59, trim, 'room', 0.01)
for zz in np.arange(-4.3, 12.0, 1.6):
    box(0.035, 2.9, 1.3, 6.9, -2.0, zz + 0.65, panel, 'room', 0.01)
box(0.07, 0.1, 17, 6.88, 0.95, 4.0, trim, 'room', 0.02)
box(0.05, 0.3, 17, 6.89, -3.45, 4.0, trim, 'room', 0.01)
box(17, 0.22, 0.12, -1.5, 7.2, -4.58, trim, 'room', 0.02)
# Window: reveal, frame, mullions, sill (the sky plane stays in the game for daylight).
for (w, h, x, y) in ((x1 - x0 + 0.24, 0.12, (x0 + x1) / 2, y1 + 0.06), (x1 - x0 + 0.24, 0.12, (x0 + x1) / 2, y0 - 0.06),
                     (0.12, y1 - y0, x0 - 0.06, (y0 + y1) / 2), (0.12, y1 - y0, x1 + 0.06, (y0 + y1) / 2)):
    box(w, h, 0.34, x, y, -4.52, trim, 'room', 0.015)
box(0.06, y1 - y0, 0.08, 0.7, (y0 + y1) / 2, -4.62, trim, 'room', 0.008)
box(x1 - x0, 0.06, 0.08, (x0 + x1) / 2, 2.8, -4.62, trim, 'room', 0.008)
box(4.9, 0.12, 0.44, 0.7, 1.2, -4.2, trim, 'room', 0.02)
# Sheer curtains gathered either side of the window, on a brass rod.
rod((-2.6, 4.75, -4.38), (3.9, 4.75, -4.38), 0.035, brass)
for cx in (-2.15, 3.45):
    bpy.ops.mesh.primitive_plane_add(size=1, location=T(cx, 2.85, -4.36), rotation=(math.radians(90), 0, 0))
    c = bpy.context.object; c.scale = (0.9 if cx < 0 else 0.7, 3.8, 1)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=24); bpy.ops.object.mode_set(mode='OBJECT')
    for v in c.data.vertices: v.co.y += 0.06 * math.sin(v.co.x * 22.0)
    s = c.modifiers.new('thick', 'SOLIDIFY'); s.thickness = 0.01
    c.data.materials.append(curtain); groups['room'].append(c)
# Shelf with canisters and a small framed crystal study.
box(2.1, 0.1, 0.5, -3.3, 1.9, -4.3, oak, 'room', 0.015)
for xx in (-4.1, -2.5): box(0.06, 0.3, 0.42, xx, 1.72, -4.36, brass, 'metal', 0.005)
for i in range(3):
    h = 0.32 + i * 0.06
    cyl(0.15, h, -3.9 + i * 0.53, 1.95 + h / 2, -4.22, jars[i], 'room', 32, 0.01)
    cyl(0.16, 0.035, -3.9 + i * 0.53, 1.95 + h + 0.018, -4.22, steel, 'metal', 32)
box(1.05, 1.36, 0.075, -3.25, 3.15, -4.54, brass, 'metal', 0.01)
box(0.96, 1.27, 0.02, -3.25, 3.15, -4.49, paper, 'room', 0)
# Desk lamp (its light and glowing diffuser stay in the game).
box(0.7, 0.12, 0.55, 3.25, 0.06, -1.75, dark_metal, 'metal', 0.02)
rod((3.25, 0.12, -1.75), (3.25, 2.6, -1.75), 0.045, steel)
rod((3.25, 2.6, -1.75), (0.1, 3.6, -0.75), 0.04, steel)
cyl(0.08, 0.12, 3.25, 2.6, -1.75, brass, 'metal', 20)
box(1.4, 0.15, 0.4, 0.1, 3.6, -0.75, dark_metal, 'metal', 0.02)

# ---------- join, unwrap, bake ----------
def join(group, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in groups[group]:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        for mod in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.join(); o = bpy.context.object; o.name = name; return o

sc.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'METAL'; prefs.refresh_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = 'GPU'
except Exception: pass

def bake(obj, size, name):
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    uv = obj.data.uv_layers.new(name='bake'); obj.data.uv_layers.active = uv
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003)
    bpy.ops.object.mode_set(mode='OBJECT')
    col = bpy.data.images.new(name + '-col', size, size, float_buffer=True)
    ao = bpy.data.images.new(name + '-ao', size, size, float_buffer=True)
    nodes = []
    for slot in obj.material_slots:
        nt = slot.material.node_tree; t = nt.nodes.new('ShaderNodeTexImage'); nt.nodes.active = t; nodes.append(t)
    for t in nodes: t.image = col
    sc.cycles.samples = 8; sc.render.bake.margin = 6
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, use_clear=True)
    for t in nodes: t.image = ao
    sc.cycles.samples = 96; sc.world.light_settings.distance = 0.9
    bpy.ops.object.bake(type='AO', use_clear=True)
    c = np.array(col.pixels[:]).reshape(-1, 4); a = np.array(ao.pixels[:]).reshape(-1, 4)
    occlusion = 0.35 + 0.65 * np.clip(a[:, :1], 0, 1) ** 0.9
    c[:, :3] = np.clip(c[:, :3] * occlusion, 0, 1)
    out = bpy.data.images.new(name, size, size); out.pixels = c.ravel().tolist()
    out.filepath_raw = os.path.join(TEXDIR, name + '.png'); out.file_format = 'PNG'; out.save()
    # Swap to one baked material on the bake UV only.
    m, n, l, b = principled(name)
    t = n.new('ShaderNodeTexImage'); t.image = out; l.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.6 if name == 'bench' else 0.85
    obj.data.materials.clear(); obj.data.materials.append(m)
    for layer in [x for x in obj.data.uv_layers if x.name != 'bake']: obj.data.uv_layers.remove(layer)

w = bpy.data.worlds.new('w'); w.use_nodes = True; sc.world = w
bench = join('bench', 'workshop-bench'); room = join('room', 'workshop-room'); metal = join('metal', 'workshop-metal')
bake(bench, 2048, 'bench')
bake(room, 4096, 'room')
for o in (bench, room, metal):
    o.select_set(True)
bpy.ops.object.select_all(action='DESELECT')
for o in (bench, room, metal): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB', export_image_format='JPEG',
                          export_jpeg_quality=88, export_yup=True, export_apply=True)
print('WROTE', OUT)
