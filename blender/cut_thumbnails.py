# Cycles renders of each level's finished target cut (refraction, dispersion, studio HDRI) for the level picker.
# Usage: blender -b -P cut_thumbnails.py -- <cuts.json> <studio.hdr> <out-dir>
import bpy, sys, json, math, os
cuts_path, hdr, out_dir = sys.argv[sys.argv.index('--') + 1:][:3]
cuts = json.load(open(cuts_path))
GLASS_COLORS = {'first': 0x11bfc5, 'ring': 0xf0449d, 'firstgem': 0xffb52e}  # gemstoneColor() for the glass lessons

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'METAL'; prefs.refresh_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = 'GPU'
except Exception: pass
sc.cycles.samples = 384; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 24; sc.cycles.transmission_bounces = 24; sc.cycles.glossy_bounces = 16
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = 512
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'

w = bpy.data.worlds.new('studio'); w.use_nodes = True; sc.world = w
env = w.node_tree.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(hdr)
w.node_tree.links.new(env.outputs['Color'], w.node_tree.nodes['Background'].inputs['Color'])
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.4

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 85
target = bpy.data.objects.new('target', None); sc.collection.objects.link(target)
track = cam.constraints.new('TRACK_TO'); track.target = target

def hex_rgb(h):
    return tuple(((h >> s) & 255) / 255 for s in (16, 8, 0))

def gem_material(color, ior):
    m = bpy.data.materials.new('gem'); m.use_nodes = True; n, l = m.node_tree.nodes, m.node_tree.links
    b = n['Principled BSDF']
    b.inputs['Base Color'].default_value = (*[0.55 + 0.45 * c for c in color], 1)
    b.inputs['Roughness'].default_value = 0.0; b.inputs['IOR'].default_value = ior
    b.inputs['Transmission Weight'].default_value = 1.0
    if 'Dispersion' in b.inputs: b.inputs['Dispersion'].default_value = 0.6 if ior > 2 else 0.25
    vol = n.new('ShaderNodeVolumeAbsorption'); vol.inputs['Color'].default_value = (*color, 1); vol.inputs['Density'].default_value = 1.2
    l.new(vol.outputs['Volume'], n['Material Output'].inputs['Volume'])
    return m

os.makedirs(out_dir, exist_ok=True)
for cut in cuts:
    for o in [o for o in sc.objects if o.type == 'MESH']: bpy.data.objects.remove(o)
    verts, faces = [], []
    for f in cut['faces']:
        idx = []
        for x, y, z in f:
            verts.append((x, -z, y)); idx.append(len(verts) - 1)
        faces.append(idx)
    me = bpy.data.meshes.new(cut['id']); me.from_pydata(verts, [], faces); me.validate()
    o = bpy.data.objects.new(cut['id'], me); sc.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=1e-5); bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    color = hex_rgb(GLASS_COLORS.get(cut['id'], cut['color']))
    o.data.materials.append(gem_material(color, cut['ior']))
    o.rotation_euler = (0, 0, math.radians(28))
    bpy.context.view_layer.update()
    xs = [o.matrix_world @ v.co for v in me.vertices]
    lo = [min(v[i] for v in xs) for i in range(3)]; hi = [max(v[i] for v in xs) for i in range(3)]
    cx, cy, cz = [(lo[i] + hi[i]) / 2 for i in range(3)]
    size = max(((v.x - cx) ** 2 + (v.y - cy) ** 2 + (v.z - cz) ** 2) ** 0.5 for v in xs)
    target.location = (cx, cy, cz)
    dist = size * 6.4
    cam.location = (cx, cy - dist * math.cos(math.radians(38)), cz + dist * math.sin(math.radians(38)))
    sc.render.filepath = os.path.join(out_dir, cut['id'] + '.png')
    bpy.ops.render.render(write_still=True)
    print('WROTE', sc.render.filepath)
