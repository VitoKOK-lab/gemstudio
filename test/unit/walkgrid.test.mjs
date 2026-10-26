import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGrid, blockBox, blockTriangle, inflate, findPath, isFree, lineClear, nearestFree} from '../../src/walkgrid.js';

const table = () => createGrid({minX: -4, maxX: 4, minZ: -3, maxZ: 3, cell: 0.1});
const walk = (g, path) => path.slice(1).every((p, i) => lineClear(g, path[i], p));

test('a straight line is used when nothing is in the way', () => {
  const g = inflate(table(), 0.25);
  assert.deepEqual(findPath(g, [-2, 0], [2, 0]).length, 2);
});
test('the route goes around a wall and never touches a blocked cell', () => {
  const raw = table();
  blockBox(raw, -0.2, -2, 0.2, 1.5);
  const g = inflate(raw, 0.25), path = findPath(g, [-2, 0], [2, 0]);
  assert.ok(path && path.length > 2, 'detour exists');
  assert.ok(walk(g, path), 'every leg clear');
  assert.ok(path.every(([x, z]) => isFree(g, x, z)));
});
test('no route when the goal is walled in', () => {
  const raw = table();
  blockBox(raw, -4, -0.2, 4, 0.2);
  assert.equal(findPath(inflate(raw, 0.25), [0, -2], [0, 2]), null);
});
test('triangles block the cells they cover, including edge-on slivers', () => {
  const g = table();
  blockTriangle(g, [0, 0], [1, 0], [0, 1]);
  assert.ok(!isFree(g, 0.2, 0.2) && isFree(g, 0.9, 0.9));
  blockTriangle(g, [-2, -1], [-2, 1], [-2, 1]);
  assert.ok(!isFree(g, -2, 0));
});
test('a start inside an obstacle is moved to the nearest free spot', () => {
  const raw = table();
  blockBox(raw, -1, -1, 1, 1);
  const g = inflate(raw, 0.25), p = nearestFree(g, 0, 0);
  assert.ok(isFree(g, ...p));
  assert.ok(findPath(g, [0, 0], [3, 2]));
});

test('reachable() only covers the side she is on', async () => {
  const {reachable} = await import('../../src/walkgrid.js');
  const raw = table();
  blockBox(raw, -4, -0.2, 4, 0.2);
  const g = inflate(raw, 0.2), seen = reachable(g, [0, -2]);
  assert.ok(seen[Math.floor((-2 + 3) / 0.1) * g.nx + Math.floor((0 + 4) / 0.1)]);
  assert.ok(!seen[Math.floor((2 + 3) / 0.1) * g.nx + Math.floor((0 + 4) / 0.1)]);
});
