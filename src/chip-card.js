// Damaged result card: knocks ragged fracture chips off the stone's outermost corners, then makes the damage ugly:
// a cracked, frosted break surface, dark crack lines running out over the good faces and milky fractures inside the gem.
import * as THREE from 'three';
import { clip, dot, volume } from './geometry.js';

const unit = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
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
const centroid = (f) => [0, 1, 2].map((i) => f.reduce((s, p) => s + p[i], 0) / f.length);
const seeded = (seed) => {
  let s = seed * 9301 + 49297;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
};

// Returns the chipped stone and the new chip faces. `events` corners are broken: three big bites each, then three smaller
// ragged ones around them, so the break is jagged instead of one clean flat cut. Never takes more than half the volume.
export function fractureFaces(faces, events, seed = 7) {
  const pts = faces.flat(), c = [0, 1, 2].map((i) => pts.reduce((s, p) => s + p[i], 0) / pts.length), rel = (p) => p.map((v, i) => v - c[i]);
  const extent = Math.max(...pts.map((p) => Math.hypot(...rel(p))));
  const corners = [];
  for (const p of [...pts].sort((a, b) => Math.hypot(...rel(b)) - Math.hypot(...rel(a)))) {
    const d = unit(rel(p));
    if (corners.every((q) => dot(q, d) < 0.55)) corners.push(d);
    if (corners.length >= events) break;
  }
  let out = faces;
  const planes = [], v0 = volume(faces), rnd = seeded(seed);
  for (const d of corners) {
    const t1 = unit(Math.abs(d[1]) < 0.9 ? [d[2], 0, -d[0]] : [1, 0, 0]), t2 = cross(d, t1);
    for (let k = 0; k < 6; k++) {
      const big = k < 3, a = k * 2.1 + rnd() * 0.9, spread = big ? 0.3 + rnd() * 0.3 : 0.55 + rnd() * 0.6;
      const n = unit(d.map((v, i) => v + (t1[i] * Math.cos(a) + t2[i] * Math.sin(a)) * spread));
      const top = Math.max(...out.flat().map((p) => dot(p, n))), depth = extent * (big ? 0.24 + rnd() * 0.2 : 0.07 + rnd() * 0.1) * (k % 3 ? 0.85 : 1);
      const next = clip(out, n, top - depth);
      if (next.length >= 4 && volume(next) > v0 * 0.5) {
        out = next;
        planes.push({ n, d: top - depth });
      }
    }
  }
  const chips = out.filter((f) => {
    const n = polygonNormal(f);
    return planes.some((p) => dot(n, p.n) > 0.999 && Math.abs(dot(f[0], p.n) - p.d) < 1e-4);
  });
  return { faces: out, chips };
}

// Flat-shaded geometry for the chip faces, with planar UVs so the crack texture can be mapped onto them.
function chipGeometry(chips, scale) {
  const pos = [], nor = [], uv = [];
  for (const f of chips) {
    const n = polygonNormal(f), u = unit(cross(Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], n)), v = cross(n, u);
    for (let i = 1; i < f.length - 1; i++)
      for (const p of [f[0], f[i], f[i + 1]]) {
        pos.push(...p);
        nor.push(...n);
        uv.push(dot(p, u) / scale, dot(p, v) / scale);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// Break-surface texture: mottled grey-white frost, gouges, and a branching network of dark cracks with pale edges.
function crackTexture(rnd) {
  const S = 512, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#b4abb2';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S, y = rnd() * S, r = 14 + rnd() * 70, light = rnd() < 0.55, grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, light ? 'rgba(255,255,255,0.45)' : 'rgba(70,55,70,0.38)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const img = g.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 60;
    img.data[i] += n;
    img.data[i + 1] += n * 0.95;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  // Branching cracks: a random walk that forks, drawn pale first (the lifted lip) then dark on top.
  const cracks = [];
  const walk = (x, y, ang, len, width, depth) => {
    const pts = [[x, y]];
    for (let s = 0; s < len; s++) {
      ang += (rnd() - 0.5) * 1.1;
      x += Math.cos(ang) * (5 + rnd() * 9);
      y += Math.sin(ang) * (5 + rnd() * 9);
      pts.push([x, y]);
      if (depth < 3 && rnd() < 0.09) walk(x, y, ang + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.8), Math.floor(len * 0.6), width * 0.7, depth + 1);
    }
    cracks.push({ pts, width });
  };
  for (let i = 0; i < 30; i++) walk(rnd() * S, rnd() * S, rnd() * 6.3, 16 + Math.floor(rnd() * 30), 4 + rnd() * 4, 0);
  g.lineCap = g.lineJoin = 'round';
  for (const [color, grow, dx] of [['rgba(255,255,255,0.8)', 2.4, 1.4], ['#1b0f17', 0, 0]]) {
    g.strokeStyle = color;
    for (const c of cracks) {
      g.lineWidth = c.width + grow;
      g.beginPath();
      c.pts.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dx) : g.moveTo(x + dx, y + dx)));
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const insidePolygon = (f, n, p) => {
  const u = unit(cross(Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], n)), v = cross(n, u);
  const P = (q) => [dot(q, u), dot(q, v)], [px, py] = P(p);
  let inside = false;
  for (let i = 0, j = f.length - 1; i < f.length; j = i++) {
    const [xi, yi] = P(f[i]), [xj, yj] = P(f[j]);
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

// Adds the cracked break surface, its dark rim, cracks running out over the good faces and milky fractures inside the gem.
// `faces` is the whole broken stone (chips included). Returns a disposer.
export function addChipScars(scene, chips, faces, seed = 11) {
  const rnd = seeded(seed), extent = Math.max(...faces.flat().map((p) => Math.hypot(...p))) || 1;
  const tex = crackTexture(rnd), geo = chipGeometry(chips, extent * 0.7);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: tex, bumpMap: tex, bumpScale: 1.6, emissive: 0x6d6470, emissiveMap: tex, roughness: 1, metalness: 0,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const scar = new THREE.Mesh(geo, mat), disposables = [geo, mat, tex];
  const rim = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: 0x120a10 }));
  disposables.push(rim.geometry, rim.material);
  scene.add(scar, rim);
  const extras = [];

  // Cracks that run out from the chip over the faces that survived.
  const good = faces.filter((f) => !chips.includes(f)), segs = [];
  for (const chip of chips) {
    const cc = centroid(chip);
    for (let k = 0; k < 4; k++) {
      let p = chip[Math.floor(rnd() * chip.length)];
      const f = good.find((g) => g.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) < 1e-4));
      if (!f) continue;
      const n = polygonNormal(f);
      let dir = unit(p.map((v, i) => v - cc[i]));
      dir = unit(dir.map((v, i) => v - n[i] * dot(dir, n)));
      let at = p.slice(), ang = 0;
      const u = dir, w = cross(n, u);
      for (let s = 0, len = 5 + Math.floor(rnd() * 7); s < len; s++) {
        ang += (rnd() - 0.5) * 1.2;
        const step = extent * (0.03 + rnd() * 0.06);
        const d2 = unit(u.map((v, i) => v * Math.cos(ang) + w[i] * Math.sin(ang)));
        const next = at.map((v, i) => v + d2[i] * step);
        if (!insidePolygon(f, n, next)) break;
        segs.push(...at.map((v, i) => v + n[i] * extent * 0.003), ...next.map((v, i) => v + n[i] * extent * 0.003));
        at = next;
      }
    }
  }
  if (segs.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x1b0f17, transparent: true, opacity: 0.9 }));
    extras.push(lines);
    disposables.push(g, lines.material);
  }

  // Milky fractures inside the gem: jagged planes fanning in from each chip. Every point is pulled back until it is inside the stone.
  const planesOf = faces.map((f) => {
    const n = polygonNormal(f);
    return [n, dot(f[0], n)];
  });
  const inStone = (p) => planesOf.every(([n, d]) => dot(p, n) <= d + 1e-6);
  const pull = (p, anchor) => {
    for (let t = 1; t > 0; t -= 0.12) {
      const q = anchor.map((v, i) => v + (p[i] - v) * t);
      if (inStone(q)) return q;
    }
    return anchor;
  };
  const veils = [], veilLines = [];
  for (const chip of chips) {
    const n = polygonNormal(chip), cc = centroid(chip), t1 = unit(cross(Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], n)), t2 = cross(n, t1);
    for (let k = 0; k < 3; k++) {
      const a = rnd() * 3.14, side = [0, 1, 2].map((i) => t1[i] * Math.cos(a) + t2[i] * Math.sin(a)), reach = extent * (0.18 + rnd() * 0.25), pts = [];
      for (let s = 0; s <= 7; s++) {
        const along = (s / 7 - 0.5) * extent * 0.5, into = reach * (0.35 + rnd() * 0.65);
        pts.push(pull(cc.map((v, i) => v + side[i] * along - n[i] * into * Math.sin((s / 7) * 3.14)), cc.map((v, i) => v - n[i] * extent * 0.01)));
      }
      const anchor = cc.map((v, i) => v - n[i] * extent * 0.01), base = pull(cc.map((v, i) => v + side[i] * (-0.25 * extent)), anchor);
      const rim0 = [base, ...pts, pull(cc.map((v, i) => v + side[i] * 0.25 * extent), anchor)];
      for (let i = 1; i < rim0.length - 1; i++) veils.push(...rim0[0], ...rim0[i], ...rim0[i + 1]);
      for (let i = 0; i < pts.length - 1; i++) veilLines.push(...pts[i], ...pts[i + 1]);
    }
  }
  if (veils.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(veils, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xf4eefa, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    const gl = new THREE.BufferGeometry();
    gl.setAttribute('position', new THREE.Float32BufferAttribute(veilLines, 3));
    const l = new THREE.LineSegments(gl, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }));
    extras.push(m, l);
    disposables.push(g, m.material, gl, l.material);
  }
  scene.add(...extras);
  return () => {
    scene.remove(scar, rim, ...extras);
    disposables.forEach((d) => d.dispose());
  };
}
