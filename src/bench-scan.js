// Turns the real scene into a walkable floor plan: every triangle between knee and head height that stands on the table
// blocks the cells under it. Built once and reused, because the machine and bench do not move.
import { createGrid, blockTriangle, inflate } from './walkgrid.js';

const IGNORE = /^(apprentice|tabletop|floor|rear-wall|side-wall|workshop-room|window|wall-dado|study|table-leg|rear-table|wall-mounted|preview)/;
const BODY = 0.2;
let cache = null;

export function scanBench(THREE, scene, now = performance.now(), stats = null) {
  let meshes = 0;
  scene.traverse((o) => o.isMesh && meshes++);
  if (cache && cache.scene === scene && cache.meshes === meshes && now - cache.at < 20000) return cache;
  scene.updateMatrixWorld(true);
  const raw = createGrid({ minX: -4.5, maxX: 4.5, minZ: -2.8, maxZ: 2.7, cell: 0.1 }), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || !o.geometry?.attributes.position) return;
    for (let p = o; p; p = p.parent) if (p.visible === false || p.userData.noCollide || IGNORE.test(p.name)) return;
    const pos = o.geometry.attributes.position, index = o.geometry.index, count = index ? index.count : pos.count;
    o.geometry.computeBoundingBox();
    const box = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    if (box.max.y < 0.05 || box.min.y > 1.1 || box.max.x - box.min.x > 7 || box.max.z - box.min.z > 7) return;
    const before = stats ? raw.blocked.reduce((n, v) => n + v, 0) : 0;
    for (let t = 0; t < count; t += 3) {
      const at = (k) => (index ? index.getX(t + k) : t + k);
      a.fromBufferAttribute(pos, at(0)).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, at(1)).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, at(2)).applyMatrix4(o.matrixWorld);
      if (Math.max(a.y, b.y, c.y) < 0.05 || Math.min(a.y, b.y, c.y) > 1.1) continue;
      blockTriangle(raw, [a.x, a.z], [b.x, b.z], [c.x, c.z]);
    }
    if (stats) stats.push({ name: o.name || o.parent?.name, parent: o.parent?.name, added: raw.blocked.reduce((n, v) => n + v, 0) - before, box: [box.min.toArray(), box.max.toArray()].map((v) => v.map((x) => +x.toFixed(1)).join(',')).join(' | ') });
  });
  cache = { scene, meshes, at: now, raw, grid: inflate(raw, BODY, 0.1) };
  return cache;
}
export const asciiMap = (g, mark = []) => {
  const rows = [];
  for (let j = 0; j < g.nz; j += 2) {
    let r = '';
    for (let i = 0; i < g.nx; i += 1) r += mark.find(([x, z]) => Math.abs(x - (g.minX + i * g.cell)) < 0.06 && Math.abs(z - (g.minZ + j * g.cell)) < 0.11) ? '@' : g.blocked[j * g.nx + i] ? '#' : '.';
    rows.push(r);
  }
  return rows.join('\n');
};
