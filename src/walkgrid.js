// Floor-plan grid for the apprentice: blocked cells come from the real geometry on the bench, then a path is found
// with A*, so she never walks through the machine, the lap rack or anything else standing on the table.
export function createGrid({ minX, maxX, minZ, maxZ, cell = 0.1 }) {
  const nx = Math.ceil((maxX - minX) / cell), nz = Math.ceil((maxZ - minZ) / cell);
  return { minX, minZ, cell, nx, nz, blocked: new Uint8Array(nx * nz) };
}
const cx = (g, x) => Math.floor((x - g.minX) / g.cell), cz = (g, z) => Math.floor((z - g.minZ) / g.cell);
const inside = (g, i, j) => i >= 0 && j >= 0 && i < g.nx && j < g.nz;
export const cellCenter = (g, i, j) => [g.minX + (i + 0.5) * g.cell, g.minZ + (j + 0.5) * g.cell];
export function isFree(g, x, z) {
  const i = cx(g, x), j = cz(g, z);
  return inside(g, i, j) && !g.blocked[j * g.nx + i];
}
function mark(g, i, j) {
  if (inside(g, i, j)) g.blocked[j * g.nx + i] = 1;
}
// Marks every cell the triangle touches (a, b, c are [x, z]); thin or edge-on triangles are covered by sampling their edges.
export function blockTriangle(g, a, b, c) {
  const pts = [a, b, c];
  for (let k = 0; k < 3; k++) {
    const p = pts[k], q = pts[(k + 1) % 3], n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / (g.cell * 0.5)));
    for (let s = 0; s <= n; s++) mark(g, cx(g, p[0] + ((q[0] - p[0]) * s) / n), cz(g, p[1] + ((q[1] - p[1]) * s) / n));
  }
  const i0 = cx(g, Math.min(a[0], b[0], c[0])), i1 = cx(g, Math.max(a[0], b[0], c[0]));
  const j0 = cz(g, Math.min(a[1], b[1], c[1])), j1 = cz(g, Math.max(a[1], b[1], c[1]));
  const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(d) < 1e-9) return;
  for (let j = Math.max(0, j0); j <= Math.min(g.nz - 1, j1); j++)
    for (let i = Math.max(0, i0); i <= Math.min(g.nx - 1, i1); i++) {
      const [x, z] = cellCenter(g, i, j);
      const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (z - c[1])) / d,
        v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (z - c[1])) / d, w = 1 - u - v;
      if (u >= 0 && v >= 0 && w >= 0) mark(g, i, j);
    }
}
// Blocks a disc (another character standing on the table).
export function blockDisc(g, x, z, r) {
  for (let j = cz(g, z - r); j <= cz(g, z + r); j++)
    for (let i = cx(g, x - r); i <= cx(g, x + r); i++) {
      const [px, pz] = cellCenter(g, i, j);
      if (Math.hypot(px - x, pz - z) <= r) mark(g, i, j);
    }
}
export function blockBox(g, x0, z0, x1, z1) {
  for (let j = cz(g, z0); j <= cz(g, z1); j++) for (let i = cx(g, x0); i <= cx(g, x1); i++) mark(g, i, j);
}
// A copy with every blocked cell grown by `radius` (her body), and the outer ring blocked so she never reaches the table edge.
export function inflate(g, radius, edge = 0.2) {
  const out = { ...g, blocked: new Uint8Array(g.blocked.length) }, r = Math.ceil(radius / g.cell), e = Math.ceil(edge / g.cell);
  for (let j = 0; j < g.nz; j++)
    for (let i = 0; i < g.nx; i++) {
      if (i < e || j < e || i >= g.nx - e || j >= g.nz - e) out.blocked[j * g.nx + i] = 1;
      if (!g.blocked[j * g.nx + i]) continue;
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) if (di * di + dj * dj <= r * r && inside(g, i + di, j + dj)) out.blocked[(j + dj) * g.nx + i + di] = 1;
    }
  return out;
}
// Nearest free cell centre to (x, z), searching outward; null if the whole grid is blocked.
export function nearestFree(g, x, z) {
  const i0 = cx(g, x), j0 = cz(g, z);
  let best = null, bd = Infinity;
  for (let r = 0; r < Math.max(g.nx, g.nz); r++) {
    for (let j = j0 - r; j <= j0 + r; j++)
      for (let i = i0 - r; i <= i0 + r; i++) {
        if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r || !inside(g, i, j) || g.blocked[j * g.nx + i]) continue;
        const [px, pz] = cellCenter(g, i, j), d = Math.hypot(px - x, pz - z);
        if (d < bd) (bd = d), (best = [px, pz]);
      }
    if (best && bd <= (r + 1) * g.cell) return best;
  }
  return best;
}
export function lineClear(g, a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (g.cell * 0.4)));
  for (let s = 0; s <= n; s++) if (!isFree(g, a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n)) return false;
  return true;
}
// A* over free cells (8 directions, no corner cutting), then straightened wherever the line of sight is clear.
export function findPath(g, from, to) {
  const s = isFree(g, ...from) ? from : nearestFree(g, ...from), t = isFree(g, ...to) ? to : nearestFree(g, ...to);
  if (!s || !t) return null;
  if (lineClear(g, s, t)) return [s, t];
  const idx = (i, j) => j * g.nx + i, start = idx(cx(g, s[0]), cz(g, s[1])), goal = idx(cx(g, t[0]), cz(g, t[1]));
  const cost = new Float32Array(g.blocked.length).fill(Infinity), from_ = new Int32Array(g.blocked.length).fill(-1), open = [[0, start]];
  cost[start] = 0;
  const h = (k) => Math.hypot((k % g.nx) - (goal % g.nx), Math.floor(k / g.nx) - Math.floor(goal / g.nx));
  while (open.length) {
    open.sort((p, q) => q[0] - p[0]);
    const [, k] = open.pop();
    if (k === goal) break;
    const i = k % g.nx, j = Math.floor(k / g.nx);
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (!inside(g, ni, nj) || g.blocked[idx(ni, nj)]) continue;
        if (di && dj && (g.blocked[idx(i + di, j)] || g.blocked[idx(i, j + dj)])) continue;
        const c = cost[k] + Math.hypot(di, dj), n = idx(ni, nj);
        if (c < cost[n]) {
          cost[n] = c;
          from_[n] = k;
          open.push([c + h(n), n]);
        }
      }
  }
  if (from_[goal] < 0 && goal !== start) return null;
  const cells = [];
  for (let k = goal; k >= 0; k = from_[k]) cells.push(cellCenter(g, k % g.nx, Math.floor(k / g.nx)));
  cells.reverse();
  const out = [s];
  let at = 0;
  while (at < cells.length - 1) {
    let far = cells.length - 1;
    while (far > at + 1 && !lineClear(g, cells[at], cells[far])) far--;
    out.push(cells[far]);
    at = far;
  }
  out.push(t);
  return out;
}
// Cells connected to `from` (flood fill, 8 directions, no corner cutting): where she can actually walk to.
export function reachable(g, from) {
  const seen = new Uint8Array(g.blocked.length), start = isFree(g, ...from) ? from : nearestFree(g, ...from);
  if (!start) return seen;
  const stack = [cz(g, start[1]) * g.nx + cx(g, start[0])];
  seen[stack[0]] = 1;
  while (stack.length) {
    const k = stack.pop(), i = k % g.nx, j = Math.floor(k / g.nx);
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const ni = i + di, nj = j + dj, n = nj * g.nx + ni;
        if ((!di && !dj) || !inside(g, ni, nj) || seen[n] || g.blocked[n]) continue;
        if (di && dj && (g.blocked[j * g.nx + ni] || g.blocked[nj * g.nx + i])) continue;
        seen[n] = 1;
        stack.push(n);
      }
  }
  return seen;
}
