// A new look for every level: wall and light colours, furniture, food and little animals (all Kenney, CC0).
// Each theme is plain data; slots below say where things go, so a theme only names what stands in each slot.
import { findPath, nearestFree, blockDisc, cellCenter, reachable } from './walkgrid.js';
import { scanBench } from './bench-scan.js';

const PROPS = 'models/kenney/props/', PETS = 'models/kenney/pets/';
const PI = Math.PI;

// Where things can stand. Floor slots sit on the room floor (y -3.6), table slots on the bench top (y 0).
// p = [x, y, z], s = scale, r = turn around the up axis.
export const SLOTS = {
  rug: { p: [0, -3.59, 7], s: 5.5 },
  center: { p: [0, -3.6, 7], s: 3 },
  seat: { p: [0, -3.6, 10], s: 3.2, r: PI },
  sideL: { p: [-4.6, -3.6, 8.4], s: 3, r: 0.5 },
  sideR: { p: [4.6, -3.6, 8.4], s: 3, r: -0.5 },
  wallR1: { p: [6.1, -3.6, 5.2], s: 3.2, r: -PI / 2 },
  wallR2: { p: [6.1, -3.6, 8.6], s: 3.2, r: -PI / 2 },
  wallL1: { p: [-6.6, -3.6, 5.2], s: 3.2, r: PI / 2 },
  wallL2: { p: [-6.6, -3.6, 8.6], s: 3.2, r: PI / 2 },
  t1: { p: [-1.5, 0, -2.5], s: 1.5 },
  t2: { p: [0.3, 0, -2.5], s: 1.5 },
  t3: { p: [2.1, 0, -2.5], s: 1.5 },
  t4: { p: [3.9, 0, -2.4], s: 1.5 },
  t5: { p: [4.05, 0, -0.6], s: 1.5, r: -PI / 2 },
};

// Prop sets: slot -> model name. A level picks one set and a colour mood.
const SETS = {
  home: { rug: 'rugRound', center: 'tableCoffee', seat: 'loungeSofa', sideL: 'lampRoundFloor', sideR: 'pottedPlant', wallR1: 'bookcaseOpen', wallL1: 'cabinetTelevision', t1: 'plantSmall1', t2: 'cup-coffee', t3: 'croissant', t4: 'loaf-baguette' },
  sweets: { rug: 'rugRectangle', center: 'tableRound', seat: 'loungeDesignSofa', sideL: 'lampRoundFloor', sideR: 'plantSmall3', wallR1: 'cabinetBedDrawer', t1: 'cake-birthday', t2: 'cupcake', t3: 'donut-sprinkles', t4: 'cookie', t5: 'ice-cream-cup' },
  study: { rug: 'rugSquare', center: 'tableCross', seat: 'loungeChair', sideL: 'lampSquareFloor', sideR: 'pottedPlant', wallR1: 'bookcaseClosedWide', wallR2: 'bookcaseOpen', wallL1: 'desk', wallL2: 'chairDesk', t1: 'books', t2: 'laptop', t3: 'lampSquareTable', t4: 'cup-tea' },
  kitchen: { rug: 'rugDoormat', center: 'kitchenBar', seat: 'stoolBar', sideL: 'kitchenFridge', sideR: 'plantSmall2', wallR1: 'kitchenCabinet', wallR2: 'kitchenStove', wallL1: 'kitchenCabinetUpperDouble', t1: 'fish', t2: 'maki-salmon', t3: 'bowl-soup', t4: 'kitchenCoffeeMachine' },
  snack: { rug: 'rugRounded', center: 'tableCoffeeSquare', seat: 'loungeSofaLong', sideL: 'speaker', sideR: 'trashcan', wallR1: 'kitchenBarEnd', wallL1: 'televisionVintage', t1: 'pizza', t2: 'burger-cheese', t3: 'fries', t4: 'hot-dog', t5: 'soda-can' },
  lounge: { rug: 'rugRound', center: 'tableCoffeeGlass', seat: 'loungeSofaCorner', sideL: 'lampSquareFloor', sideR: 'plantSmall1', wallR1: 'televisionModern', wallR2: 'speaker', wallL1: 'sideTableDrawers', t1: 'radio', t2: 'pillowBlue', t3: 'glass-wine', t4: 'grapes' },
  palace: { rug: 'rugRounded', center: 'tableGlass', seat: 'loungeDesignSofa', sideL: 'lampRoundFloor', sideR: 'pottedPlant', wallR1: 'bookcaseClosedDoors', wallL1: 'cabinetBedDrawerTable', t1: 'cake', t2: 'glass-wine', t3: 'pie', t4: 'cheese', t5: 'bowl' },
  garden: { rug: 'rugSquare', center: 'tableRound', seat: 'bench', sideL: 'plantSmall3', sideR: 'pottedPlant', wallR1: 'coatRackStanding', wallL1: 'bookcaseOpenLow', t1: 'pear', t2: 'apple', t3: 'orange', t4: 'banana', t5: 'carrot' },
};

// colour mood: wall = tint on the room (multiplies the baked colours), sky/ground = ambient light, key = main lamp, day = window light
const mood = (wall, sky, ground, key, day) => ({ wall, sky, ground, key, day });
const M = {
  morning: mood('#fff0dc', '#fffbef', '#d1b88e', '#fff2d4', '#fff4d9'),
  candy: mood('#ffd9e6', '#fff0f6', '#d9a3b5', '#ffe6ee', '#ffe9f1'),
  forest: mood('#d9f0d2', '#f2fff0', '#9bbf8a', '#f3ffe0', '#eaffd0'),
  coast: mood('#d3eef4', '#effcff', '#8fb7c4', '#eaffff', '#dff7ff'),
  market: mood('#ffdcc0', '#fff3e3', '#c99a6b', '#ffe0b8', '#ffd9a8'),
  starry: mood('#d4d2f4', '#ece8ff', '#7d79b3', '#e1dcff', '#cbc6ff'),
  ruby: mood('#f5c6cf', '#fff0f2', '#b97482', '#ffe3e6', '#ffd0d6'),
  emerald: mood('#c5ecd5', '#effff5', '#6fae8a', '#e3ffee', '#c9ffe0'),
  sapphire: mood('#c8d7f7', '#eef3ff', '#6f87bd', '#e0eaff', '#c3d7ff'),
  amethyst: mood('#ddc9f3', '#f7eeff', '#9a78bd', '#f0e0ff', '#e2c9ff'),
  topaz: mood('#f8e2b4', '#fff8e6', '#c6a45f', '#fff0c8', '#ffe7a8'),
  aqua: mood('#c0ebf1', '#eafdff', '#6fb0bb', '#dcfaff', '#bdf3ff'),
  rose: mood('#f8d1e4', '#fff0f8', '#c487a6', '#ffe4f1', '#ffcfe6'),
  peridot: mood('#e0f1bb', '#f8ffe6', '#9cb764', '#f2ffcf', '#e5ffa8'),
  citrine: mood('#faeab0', '#fffbe6', '#c9b05c', '#fff4c4', '#ffeb9c'),
  diamond: mood('#eef2fa', '#ffffff', '#a8b0c4', '#ffffff', '#f2f6ff'),
};

// One theme per level (index = level - 1). `pets` are the animals that wander the bench.
export const THEMES = [
  { name: '晨光工坊', mood: M.morning, set: SETS.home, pets: ['chick', 'bunny'] },
  { name: '晨光工坊', mood: M.morning, set: SETS.home, pets: ['chick', 'bunny'] },
  { name: '糖果午茶', mood: M.candy, set: SETS.sweets, pets: ['pig', 'cat'] },
  { name: '森林書房', mood: M.forest, set: SETS.study, pets: ['koala', 'deer'] },
  { name: '海岸廚房', mood: M.coast, set: SETS.kitchen, pets: ['penguin', 'crab'] },
  { name: '夜市小吃', mood: M.market, set: SETS.snack, pets: ['fox', 'dog'] },
  { name: '星空客廳', mood: M.starry, set: SETS.lounge, pets: ['panda', 'monkey'] },
  { name: '紅寶石宮廷', mood: M.ruby, set: SETS.palace, pets: ['lion', 'bee'] },
  { name: '祖母綠花園', mood: M.emerald, set: SETS.garden, pets: ['beaver', 'caterpillar'] },
  { name: '藍寶石書院', mood: M.sapphire, set: SETS.study, pets: ['polar', 'penguin'] },
  { name: '紫水晶沙龍', mood: M.amethyst, set: SETS.lounge, pets: ['cat', 'parrot'] },
  { name: '黃玉廚房', mood: M.topaz, set: SETS.kitchen, pets: ['giraffe', 'cow'] },
  { name: '海藍寶水閣', mood: M.aqua, set: SETS.sweets, pets: ['fish', 'crab'] },
  { name: '玫瑰石茶室', mood: M.rose, set: SETS.home, pets: ['bunny', 'hog'] },
  { name: '橄欖石花房', mood: M.peridot, set: SETS.garden, pets: ['elephant', 'chick'] },
  { name: '黃水晶市集', mood: M.citrine, set: SETS.snack, pets: ['tiger', 'monkey'] },
  { name: '鑽石大廳', mood: M.diamond, set: SETS.palace, pets: ['polar', 'deer'] },
];
// Every model a theme can ask for, so the build step and tests can check the files exist.
export const allProps = () => [...new Set(Object.values(SETS).flatMap((s) => Object.values(s)))];
export const allPets = () => [...new Set(THEMES.flatMap((th) => th.pets))];

export function createScenery({ THREE, GLTFLoader, scene, lights, others = () => [] }) {
  const loader = new GLTFLoader(), V = (x, y, z) => new THREE.Vector3(x, y, z);
  let group = null, current = -1, stamp = 0;
  const wanderers = [], tint = { from: null, to: null, t: 1 };
  const load = (url) => new Promise((ok) => loader.load(url, ok, undefined, () => ok(null)));

  // Room materials and the window light are found once the Blender room has loaded.
  let roomMats = null, windowMat = null;
  function findRoom() {
    if (roomMats) return true;
    const model = scene.getObjectByName('workshop-model');
    if (!model) return false;
    roomMats = [];
    model.traverse((o) => o.isMesh && /room/.test(o.name) && roomMats.push(o.material));
    windowMat = scene.getObjectByName('window-daylight')?.material || null;
    return roomMats.length > 0;
  }
  const colors = (m) => ({ wall: new THREE.Color(m.wall), sky: new THREE.Color(m.sky), ground: new THREE.Color(m.ground), key: new THREE.Color(m.key), day: new THREE.Color(m.day) });
  let shown = colors(THEMES[0].mood);
  function paint(c) {
    if (findRoom()) roomMats.forEach((m) => m.color.copy(c.wall).multiplyScalar(0.92));
    lights.hemi.color.copy(c.sky);
    lights.hemi.groundColor.copy(c.ground);
    lights.key.color.copy(c.key);
    lights.fill.color.copy(c.key);
    windowMat?.color?.copy(c.day);
  }

  async function addProp(into, name, slot, delay) {
    const g = await load(PROPS + name + '.glb');
    if (!g) return;
    const o = g.scene, s = SLOTS[slot];
    o.position.set(...s.p);
    o.rotation.y = s.r || 0;
    o.userData.grow = { to: s.s, at: performance.now() + delay };
    o.scale.setScalar(0.001);
    o.traverse((m) => m.isMesh && (m.castShadow = m.receiveShadow = true));
    into.add(o);
  }
  async function addPet(into, name, myStamp) {
    const g = await load(PETS + 'animal-' + name + '.glb');
    if (!g || myStamp !== stamp) return;
    const root = new THREE.Group(), body = g.scene, scale = 0.26;
    body.scale.setScalar(scale);
    body.traverse((m) => m.isMesh && (m.castShadow = true));
    root.add(body);
    root.userData.noCollide = true;
    const mixer = new THREE.AnimationMixer(body), clips = {};
    for (const c of g.animations) clips[c.name] = mixer.clipAction(c);
    const { raw, grid } = scanBench(THREE, scene), reach = reachable(grid, [3.2, 2.1]);
    const spots = [];
    for (let j = 0; j < grid.nz; j++) for (let i = 0; i < grid.nx; i++) if (reach[j * grid.nx + i]) spots.push(cellCenter(grid, i, j));
    const start = spots.length ? spots[Math.floor(Math.random() * spots.length)] : [3.2, 2.1];
    root.position.set(start[0], 0, start[1]);
    into.add(root);
    const pet = { root, mixer, clips, mode: 'idle', until: 0, path: [], current: null, bob: Math.random() * 6, dance: 0 };
    play(pet, 'idle');
    wanderers.push(pet);
  }
  function play(p, name) {
    const a = p.clips[name] || p.clips.idle;
    if (!a || a === p.current) return;
    a.reset().fadeIn(0.2).play();
    p.current?.fadeOut(0.2);
    p.current = a;
  }
  function wander(p, now) {
    const { grid } = scanBench(THREE, scene), g = { ...grid, blocked: grid.blocked.slice() };
    for (const [x, z] of others()) blockDisc(g, x, z, 0.45);
    const ok = reachable(g, [p.root.position.x, p.root.position.z]), options = [];
    for (let j = 0; j < g.nz; j += 2) for (let i = 0; i < g.nx; i += 2) if (ok[j * g.nx + i]) options.push(cellCenter(g, i, j));
    const far = options.filter(([x, z]) => Math.hypot(x - p.root.position.x, z - p.root.position.z) > 1.2);
    const goal = (far.length ? far : options)[Math.floor(Math.random() * (far.length ? far.length : options.length))];
    const path = goal && findPath(g, [p.root.position.x, p.root.position.z], goal);
    if (path && path.length > 1) {
      p.path = path.slice(1);
      p.mode = 'walk';
    } else {
      p.mode = 'idle';
      p.until = now + 2500;
    }
  }
  function stepPet(p, dt, now) {
    p.mixer.update(dt);
    if (p.dance > 0) {
      p.dance -= dt;
      play(p, 'dance');
      p.root.rotation.y += dt * 5;
      p.root.position.y = Math.abs(Math.sin(now / 160)) * 0.18;
      if (p.dance <= 0) (p.root.position.y = 0), (p.mode = 'idle'), (p.until = now + 800);
      return;
    }
    if (p.mode === 'idle') {
      play(p, 'idle');
      if (now > p.until) wander(p, now);
      return;
    }
    const next = p.path[0];
    if (!next) {
      p.mode = 'idle';
      p.until = now + 2500 + Math.random() * 4500;
      return;
    }
    const dx = next[0] - p.root.position.x, dz = next[1] - p.root.position.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return void p.path.shift();
    play(p, 'walk');
    const m = Math.min(d, 0.55 * dt);
    p.root.position.x += (dx / d) * m;
    p.root.position.z += (dz / d) * m;
    const want = Math.atan2(dx, dz);
    let diff = want - p.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    p.root.rotation.y += diff * Math.min(1, 8 * dt);
  }

  function setTheme(index) {
    index = Math.max(0, Math.min(THEMES.length - 1, index));
    if (index === current) return false;
    current = index;
    stamp++;
    const th = THEMES[index];
    if (group) {
      scene.remove(group);
      wanderers.length = 0;
    }
    group = new THREE.Group();
    group.name = 'scenery';
    group.userData.noCollide = false;
    scene.add(group);
    let k = 0;
    for (const [slot, name] of Object.entries(th.set)) addProp(group, name, slot, 150 * k++);
    for (const pet of th.pets) addPet(group, pet, stamp);
    tint.from = shown;
    tint.to = colors(th.mood);
    tint.t = 0;
    return true;
  }
  function update(dt, now) {
    if (tint.t < 1 && findRoom()) {
      tint.t = Math.min(1, tint.t + dt / 1.4);
      const k = tint.t * tint.t * (3 - 2 * tint.t);
      shown = {};
      for (const key of ['wall', 'sky', 'ground', 'key', 'day']) shown[key] = tint.from[key].clone().lerp(tint.to[key], k);
      paint(shown);
    }
    if (!group) return;
    for (const o of group.children) {
      const gr = o.userData.grow;
      if (gr && o.scale.x < gr.to) {
        const u = Math.min(1, Math.max(0, (now - gr.at) / 450)), c1 = 1.70158, back = 1 + (c1 + 1) * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); // ease-out with a small overshoot
        o.scale.setScalar(Math.max(0.001, gr.to * (u > 0 ? back : 0)));
        if (u >= 1) o.scale.setScalar(gr.to);
      }
    }
    for (const p of wanderers) stepPet(p, dt, now);
  }
  // Everyone dances for a moment when a level is cleared.
  function celebrate() {
    for (const p of wanderers) p.dance = 3.2;
  }
  return { setTheme, update, celebrate, get positions() { return wanderers.map((p) => [p.root.position.x, p.root.position.z]); }, get index() { return current; }, get pets() { return wanderers.length; }, get name() { return THEMES[current]?.name; } };
}
