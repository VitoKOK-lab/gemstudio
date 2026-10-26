# Static housing of the faceting machine: plinth, splash pan, carriage rail, feet and trim.
# Dimensions match the procedural parts in app.js (lap centre x -0.65, base top y 0.44).
# Material names (base, dark, metal, brass, rubber) are swapped for the game's own materials on load.
# Usage: blender -b -P machine_base.py -- <out.glb>
import bpy, sys, math, mathutils
OUT = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
parts = []

def T(x, y, z): return (x, -z, y)
def mat(name, color, metal=0.0, rough=0.5):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough; return m
M = {k: mat(k, *v) for k, v in {'base': ((0.88, 0.87, 0.83), 0.3, 0.3), 'dark': ((0.2, 0.23, 0.24), 0.42, 0.4),
     'metal': ((0.79, 0.8, 0.83), 0.88, 0.27), 'brass': ((0.71, 0.6, 0.39), 0.82, 0.26), 'rubber': ((0.07, 0.08, 0.1), 0.0, 0.9)}.items()}

def keep(o, m, bevel=0.0, segs=3):
    o.data.materials.append(M[m]); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        b = o.modifiers.new('b', 'BEVEL'); b.width = bevel; b.segments = segs; b.limit_method = 'ANGLE'
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35)); parts.append(o); return o

def box(w, h, d, x, y, z, m, bevel=0.01, segs=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=T(x, y, z)); o = bpy.context.object; o.scale = (w, d, h); return keep(o, m, bevel, segs)

def cyl(r, h, x, y, z, m, verts=96, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=T(x, y, z)); return keep(bpy.context.object, m, bevel)

def torus(R, r, x, y, z, m):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=128, minor_segments=16, location=T(x, y, z)); return keep(bpy.context.object, m)

def lathe(profile, x, y, z, m, steps=128):
    """Spin an (r, y) profile around the vertical axis at three.js (x, y, z)."""
    me = bpy.data.meshes.new('lathe'); verts = [(r, 0, h) for r, h in profile]
    me.from_pydata(verts, [(i, i + 1) for i in range(len(verts) - 1)], []); o = bpy.data.objects.new('lathe', me)
    bpy.context.scene.collection.objects.link(o); bpy.context.view_layer.objects.active = o; o.select_set(True)
    sp = o.modifiers.new('spin', 'SCREW'); sp.steps = steps; sp.render_steps = steps; sp.use_merge_vertices = True; sp.use_normal_calculate = True
    o.location = T(x, y, z); return keep(o, m)

# Housing: a deep rounded plinth with a darker skirt, standing on rubber feet (base top at y 0.44).
box(4.78, 0.05, 3.68, 0.4, 0.225, 0, 'dark', 0.02)
box(4.7, 0.2, 3.6, 0.4, 0.34, 0, 'base', 0.09, 6)
box(4.42, 0.012, 3.32, 0.4, 0.444, 0, 'base', 0.004)
for x in (-1.5, 2.2):
    for z in (-1.3, 1.3):
        cyl(0.2, 0.06, x, 0.17, z, 'brass', 48, 0.01)
        cyl(0.17, 0.14, x, 0.07, z, 'rubber', 48, 0.02)
# Side vents and a brass maker's plate on the front face.
for i in range(7): box(0.022, 0.12, 0.02, 1.25 + i * 0.09, 0.34, 1.805, 'dark', 0.004)
box(0.9, 0.11, 0.015, -0.4, 0.34, 1.806, 'brass', 0.004)
for x, z in ((-1.75, -1.6), (2.55, -1.6), (-1.75, 1.6), (2.55, 1.6)): cyl(0.035, 0.012, x, 0.452, z, 'brass', 20)
# Splash pan: rolled lip, sloped floor and a brass trim ring around the lap.
lathe([(0.12, 0.70), (1.42, 0.69), (1.47, 0.70), (1.48, 0.76), (1.52, 0.79), (1.58, 0.78), (1.61, 0.74), (1.6, 0.45), (1.5, 0.44)], -0.65, 0, 0, 'dark')
torus(1.535, 0.018, -0.65, 0.775, 0, 'brass')
cyl(0.26, 0.04, -0.65, 0.72, 0, 'metal', 64, 0.01)
bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.38, vertices=24, location=T(-2.2, 0.56, 0.62), rotation=(0, math.radians(80), math.radians(-20)))
keep(bpy.context.object, 'metal')
# Carriage rail: dark bed with two polished ways and end stops.
box(2.4, 0.02, 0.55, 1.55, 0.45, 1.5, 'dark', 0.006)
for z in (1.3, 1.7): box(2.3, 0.014, 0.022, 1.55, 0.467, z, 'metal', 0.004)
for x in (0.38, 2.72): box(0.06, 0.06, 0.6, x, 0.48, 1.5, 'brass', 0.008)

bpy.ops.object.select_all(action='DESELECT')
for o in parts:
    o.select_set(True); bpy.context.view_layer.objects.active = o
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB', export_yup=True, export_apply=True)
print('WROTE', OUT)
