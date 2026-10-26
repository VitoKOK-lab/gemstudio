# Renders an equirectangular jewellery-studio HDRI for gem and metal reflections.
# Usage: blender -b -P studio_hdri.py -- <out.hdr>
import bpy, sys, math
out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def mat(name, color, strength=0.0, rough=0.6):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    if strength:
        b.inputs['Emission Color'].default_value = (*color, 1)
        b.inputs['Emission Strength'].default_value = strength
    return m

def box(name, size, loc, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = size; o.data.materials.append(m); return o

def plane(name, w, h, loc, rot, m):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = (w, h, 1); o.data.materials.append(m); return o

walls = mat('walls', (0.16, 0.14, 0.12), rough=0.85)
floor = mat('floor', (0.09, 0.06, 0.04), rough=0.5)
dark = mat('flag', (0.02, 0.02, 0.025), rough=0.9)
soft = mat('softbox', (1.0, 0.97, 0.92), 18)
strip = mat('strip', (0.92, 0.96, 1.0), 26)
sky = mat('window', (0.78, 0.88, 1.0), 9)
warm = mat('bulb', (1.0, 0.82, 0.55), 60)
frame = mat('mullion', (0.9, 0.86, 0.8), rough=0.7)

# Room shell (inside faces visible): 12 x 12 m, 5 m ceiling.
box('floor', (12, 12, 0.1), (0, 0, -1.25), floor)
box('ceiling', (12, 12, 0.1), (0, 0, 3.75), walls)
for x in (-6, 6): box('wall', (0.1, 12, 5), (x, 0, 1.25), walls)
for y in (-6, 6): box('wall', (12, 0.1, 5), (0, y, 1.25), walls)
# Big overhead softbox and two vertical strips: the long facet highlights.
plane('top-softbox', 3.2, 1.8, (0, 0, 3.6), (math.pi, 0, 0), soft)
plane('strip-left', 0.5, 3.0, (-3.2, 1.6, 1.2), (0, math.radians(90), math.radians(-25)), strip)
plane('strip-right', 0.5, 3.0, (3.0, -2.2, 1.4), (0, math.radians(-90), math.radians(30)), strip)
# Daylight window with mullions on the -Y wall (three.js -Z, matching the game's window).
plane('window', 4.4, 2.9, (0.7, -5.9, 1.5), (math.radians(90), 0, 0), sky)
for x in (-1.5, 0.7, 2.9): box('mullion', (0.08, 0.05, 3.0), (x, -5.85, 1.5), frame)
for z in (0.1, 1.5, 2.9): box('crossbar', (4.5, 0.05, 0.08), (0.7, -5.85, z), frame)
# Black flags give facets their dark contrast; warm bulbs add pinpoint fire.
box('flag-a', (0.05, 2.4, 3.0), (2.6, 2.4, 1.2), dark)
box('flag-b', (2.0, 0.05, 2.6), (-2.2, -2.8, 1.0), dark)
box('flag-floor', (3.0, 3.0, 0.02), (0, 0, -1.15), dark)
for x, y in ((-1.8, 2.8), (1.6, 3.4), (-3.5, -1.0), (3.8, 0.8)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.07, location=(x, y, 3.3)); bpy.context.object.data.materials.append(warm)

w = bpy.data.worlds.new('w'); w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.02, 0.02, 1); sc.world = w

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
cam.location = (0, 0, 0.6); cam.rotation_euler = (math.radians(90), 0, 0); sc.camera = cam
cam.data.type = 'PANO'
try: cam.data.panorama_type = 'EQUIRECTANGULAR'
except Exception: cam.data.cycles.panorama_type = 'EQUIRECTANGULAR'

sc.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'METAL'; prefs.refresh_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = 'GPU'
except Exception: pass
sc.cycles.samples = 256; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 2048, 1024
sc.render.image_settings.file_format = 'HDR'
sc.view_settings.view_transform = 'Standard'
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print('WROTE', out)
