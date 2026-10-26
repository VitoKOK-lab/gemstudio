// Damaged result card: knocks large fracture chips off the stone's outermost corners and frosts them white.
import * as THREE from 'three';
import {clip, dot, volume} from './geometry.js';
import {geometryFromFaces} from './gem-optics.js';

const unit = v => {
  const l = Math.hypot(...v) || 1;
  return v.map(x => x / l);
};
function polygonNormal(f) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < f.length; i++) {
    const a = f[i], b = f[(i + 1) % f.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return unit([x, y, z]);
}
// Returns the chipped stone and the new chip faces. `events` corners are chipped, three cuts each, never below half the volume.
export function fractureFaces(faces, events, seed = 7) {
  const pts = faces.flat(),
    c = [0, 1, 2].map(i => pts.reduce((s, p) => s + p[i], 0) / pts.length),
    rel = p => p.map((v, i) => v - c[i]);
  const extent = Math.max(...pts.map(p => Math.hypot(...rel(p))));
  const corners = [];
  for (const p of [...pts].sort((a, b) => Math.hypot(...rel(b)) - Math.hypot(...rel(a)))) {
    const d = unit(rel(p));
    if (corners.every(q => dot(q, d) < 0.55)) corners.push(d);
    if (corners.length >= events) break;
  }
  let out = faces, s = seed * 9301 + 49297;
  const planes = [], v0 = volume(faces), rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (const d of corners) {
    const t1 = unit(Math.abs(d[1]) < 0.9 ? [d[2], 0, -d[0]] : [1, 0, 0]),
      t2 = [d[1] * t1[2] - d[2] * t1[1], d[2] * t1[0] - d[0] * t1[2], d[0] * t1[1] - d[1] * t1[0]];
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + rnd() * 0.8, spread = 0.3 + rnd() * 0.25,
        n = unit(d.map((v, i) => v + (t1[i] * Math.cos(a) + t2[i] * Math.sin(a)) * spread));
      const top = Math.max(...out.flat().map(p => dot(p, n))),
        depth = extent * (0.2 + rnd() * 0.12) * (k ? 0.8 : 1),
        next = clip(out, n, top - depth);
      if (next.length >= 4 && volume(next) > v0 * 0.5) {
        out = next;
        planes.push({n, d: top - depth});
      }
    }
  }
  const chips = out.filter(f => {
    const n = polygonNormal(f);
    return planes.some(p => dot(n, p.n) > 0.999 && Math.abs(dot(f[0], p.n) - p.d) < 1e-4);
  });
  return {faces: out, chips};
}
function frostTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d'), img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 200 + Math.random() * 55;
    img.data[i] = v;
    img.data[i + 1] = v * 0.97;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// Adds the frosted chip faces and their dark rims to a viewer scene; returns a disposer.
export function addChipScars(scene, chips) {
  const tex = frostTexture(), geo = geometryFromFaces(chips);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: tex, bumpMap: tex, bumpScale: 0.05, emissive: 0x8a8290, roughness: 1, metalness: 0,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const scar = new THREE.Mesh(geo, mat),
    rim = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({color: 0x2a1d24, transparent: true, opacity: 0.8}));
  scene.add(scar, rim);
  return () => {
    scene.remove(scar, rim);
    geo.dispose(); mat.dispose(); tex.dispose(); rim.geometry.dispose(); rim.material.dispose();
  };
}
