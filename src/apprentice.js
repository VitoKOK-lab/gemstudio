// A workshop apprentice (Kenney Mini Characters, CC0). Two of them work the bench:
// - the dial hand turns the angle / index / height handwheels (by hand or by auto mode),
// - the pusher handles the dop stick and the laps: the stick swings down to her, she swaps the stone or the disc.
// Both stand on free floor (see walkgrid.js / bench-scan.js), never walk through anything, and "throw" a spark at the
// part instead of touching it. When a level is cleared they dance and throw confetti.
import { findPath, nearestFree, blockDisc, isFree, cellCenter, reachable } from './walkgrid.js';
import { scanBench } from './bench-scan.js';

const BASE = 'models/kenney/';
const WALK_SPEED = 1.9, TURN_RATE = 9, THROW_RELEASE = 0.38, FLIGHT = 0.6;
const CONFETTI = ['#ff5d8f', '#ffd447', '#4ad6c3', '#7a6bff', '#ff9a3c', '#8be15f'];

export function createApprentice({
  THREE, GLTFLoader, scene, name = 'apprentice', model = 'character-female-a.glb', home = [3.45, 1.05], scale = 1.6, stool = false, others = () => [],
}) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const root = new THREE.Group();
  root.name = name;
  root.userData.noCollide = true;
  root.position.set(home[0], 0, home[1]);
  scene.add(root);
  const loader = new GLTFLoader();
  let mixer = null, body = null, current = null, oneShotUntil = 0, yaw = 0, yawGoal = 0, handY = 0.55;
  const actions = {};

  if (stool)
    loader.load(BASE + 'stoolBar.glb', (g) => {
      const s = g.scene;
      s.scale.setScalar(1.2);
      s.position.set(home[0] + 0.45, 0, home[1] + 0.2);
      s.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = o.receiveShadow = true;
        if (o.material?.name === 'carpet') o.material.color.set('#6b2d4a');
        if (o.material?.name === 'wood') o.material.color.set('#7a5230');
      });
      scene.add(s);
    }, undefined, () => {});

  loader.load(BASE + model, (g) => {
    body = g.scene;
    body.scale.setScalar(scale);
    body.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
    root.add(body);
    mixer = new THREE.AnimationMixer(body);
    for (const clip of g.animations) actions[clip.name] = mixer.clipAction(clip);
    for (const n of ['interact-right', 'emote-yes', 'emote-no', 'pick-up', 'attack-melee-right']) {
      const a = actions[n];
      if (a) (a.setLoop(THREE.LoopOnce, 1), (a.clampWhenFinished = true));
    }
    play('idle');
    root.updateMatrixWorld(true);
    const hand = body.getObjectByName('arm-right');
    if (hand) handY = hand.getWorldPosition(V(0, 0, 0)).y;
    face(0.3, 0.8);
  }, undefined, () => {});

  function play(clip, fade = 0.25) {
    const next = actions[clip];
    if (!next || (next === current && next.loop !== THREE.LoopOnce)) return;
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (current && current !== next) current.fadeOut(fade);
    current = next;
    if (next.loop === THREE.LoopOnce) oneShotUntil = performance.now() + next.getClip().duration * 1000;
  }
  const face = (x, z) => (yawGoal = Math.atan2(x - root.position.x, z - root.position.z));

  // ---- floor plan -------------------------------------------------------------------------------------
  const plan = () => {
    const { grid, raw } = scanBench(THREE, scene), g = { ...grid, blocked: grid.blocked.slice() };
    for (const [x, z] of others()) blockDisc(g, x, z, 0.4);
    return { g, raw };
  };
  const here = () => [root.position.x, root.position.z];
  // Free spot near `target` (distance between min and max), the closest to where she is now.
  function spotFor(target, min = 0.9, max = 2.2, retry = true) {
    const { g } = plan(), [px, pz] = here(), ok = reachable(g, [px, pz]);
    let best = null, bd = Infinity;
    for (let j = 0; j < g.nz; j++)
      for (let i = 0; i < g.nx; i++) {
        if (g.blocked[j * g.nx + i] || !ok[j * g.nx + i]) continue;
        const [x, z] = cellCenter(g, i, j), d = Math.hypot(x - target[0], z - target[1]);
        if (d < min || d > max) continue;
        const cost = Math.hypot(x - px, z - pz) + Math.abs(d - (min + max) / 2) * 0.6;
        if (cost < bd) (bd = cost), (best = [x, z]);
      }
    // Nothing reachable in range: widen the range once, otherwise throw from where she stands.
    return best || (retry ? spotFor(target, min, max + 1.6, false) : here());
  }

  // ---- effects: a thrown spark and confetti ------------------------------------------------------------
  const MAX = 220, quads = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), MAX);
  quads.count = 0;
  quads.frustumCulled = false;
  quads.userData.noCollide = true;
  scene.add(quads);
  const bits = [], dummy = new THREE.Object3D();
  function burst(at, n, colors, speed, life, up = 1) {
    for (let k = 0; k < n && bits.length < MAX; k++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      bits.push({
        p: at.clone(), v: V(Math.cos(a) * s, (0.5 + Math.random()) * speed * up, Math.sin(a) * s), r: V(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        w: V(Math.random() * 9, Math.random() * 9, Math.random() * 9), t: 0, life: life * (0.7 + Math.random() * 0.6), c: new THREE.Color(colors[k % colors.length]),
      });
    }
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffd76a' }));
  ball.visible = false;
  ball.userData.noCollide = true;
  scene.add(ball);
  let flight = null;
  function stepEffects(dt) {
    if (flight) {
      flight.t += dt / FLIGHT;
      const u = Math.min(1, flight.t);
      ball.visible = true;
      ball.position.lerpVectors(flight.from, flight.to, u);
      ball.position.y += Math.sin(u * Math.PI) * 0.7;
      if (Math.random() < 0.8) burst(ball.position, 1, ['#ffd76a', '#fff3b0'], 0.25, 0.4, 0.3);
      if (u >= 1) {
        ball.visible = false;
        burst(flight.to, 18, ['#ffd76a', '#fff3b0', '#ffffff'], 1.6, 0.7);
        const done = flight.done;
        flight = null;
        done?.();
      }
    }
    for (let k = bits.length - 1; k >= 0; k--) {
      const b = bits[k];
      b.t += dt;
      b.v.y -= 4.5 * dt;
      b.v.multiplyScalar(1 - 0.9 * dt);
      b.p.addScaledVector(b.v, dt);
      b.r.addScaledVector(b.w, dt);
      if (b.t > b.life || b.p.y < 0.01) bits.splice(k, 1);
    }
    quads.count = bits.length;
    bits.forEach((b, k) => {
      dummy.position.copy(b.p);
      dummy.rotation.set(b.r.x, b.r.y, b.r.z);
      dummy.scale.setScalar(Math.max(0.05, 1 - Math.max(0, b.t / b.life - 0.7) * 3.3));
      dummy.updateMatrix();
      quads.setMatrixAt(k, dummy.matrix);
      quads.setColorAt(k, b.c);
    });
    quads.instanceMatrix.needsUpdate = true;
    if (quads.instanceColor) quads.instanceColor.needsUpdate = true;
  }

  // ---- jobs: a queue of small steps, run one at a time -------------------------------------------------
  let steps = [], job = null, thrown = 0, trespass = 0, dancing = null, lastTrespass = null;
  const go = (x, z) => ({ walk: [x, z] });
  const toss = (target, onLand, again) => ({ toss: target, onLand, again });
  const wait = (until, point, cap = 20000) => ({ wait: until, point, cap });
  const act = (fn) => ({ fn });
  function start(kind, list) {
    job = kind;
    steps = list;
  }
  function stepOnce(dt) {
    const s = steps[0];
    if (!s) {
      if (job && job !== 'dance') {
        const [hx, hz] = nearestFree(plan().g, home[0], home[1]) || here();
        job = null;
        steps = [go(hx, hz), act(() => face(0.3, 0.8))];
        return;
      }
      if (!dancing && performance.now() > oneShotUntil) play('idle');
      return;
    }
    if (s.fn) {
      s.fn();
      steps.shift();
      return;
    }
    if (s.walk) {
      if (!s.route) {
        const { g } = plan(), path = findPath(g, here(), s.walk);
        // No way through: stay where she is rather than cut across the machine.
        steps.splice(0, 1, ...(path ? path.slice(1) : []).map(([x, z]) => ({ walk: [x, z], route: true })));
        return;
      }
      const [tx, tz] = s.walk, dx = tx - root.position.x, dz = tz - root.position.z, dist = Math.hypot(dx, dz);
      if (dist < 0.04) return void steps.shift();
      face(tx, tz);
      play('walk');
      const m = Math.min(dist, WALK_SPEED * dt);
      root.position.x += (dx / dist) * m;
      root.position.z += (dz / dist) * m;
      return;
    }
    if (s.toss) {
      const target = typeof s.toss === 'function' ? s.toss() : s.toss;
      if (!s.t0) {
        s.t0 = performance.now();
        oneShotUntil = 0;
        play(actions['attack-melee-right'] ? 'attack-melee-right' : 'interact-right', 0.1);
      }
      face(target.x, target.z);
      if (!s.sent && performance.now() - s.t0 > THROW_RELEASE * 1000) {
        s.sent = true;
        thrown++;
        flight = { t: 0, from: V(root.position.x, handY, root.position.z), to: target.clone(), done: () => ((s.landed = true), s.onLand?.()) };
      }
      if (s.landed && performance.now() - s.t0 > 800) {
        if (s.again?.()) (s.t0 = 0), (s.sent = false), (s.landed = false);
        else steps.shift();
      }
      return;
    }
    if (s.wait) {
      s.t0 ||= performance.now();
      const p = s.point?.();
      if (p) face(p.x, p.z);
      if (performance.now() > oneShotUntil) play('idle');
      if (s.wait() || performance.now() - s.t0 > s.cap) steps.shift();
    }
  }
  let snapped = false;
  function update(dt) {
    if (!mixer) return;
    if (!snapped && scanBench(THREE, scene).meshes > 200) {
      snapped = true;
      const f = nearestFree(plan().g, root.position.x, root.position.z);
      if (f) root.position.set(f[0], 0, f[1]);
    }
    mixer.update(dt);
    if (dancing) dance(dt);
    else stepOnce(dt);
    stepEffects(dt);
    let d = yawGoal - yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    yaw += d * Math.min(1, TURN_RATE * dt);
    root.rotation.y = yaw;
    // For the tests: how often she stood on blocked floor (never, if the route works).
    if (snapped && !dancing && !isFree(scanBench(THREE, scene).raw, root.position.x, root.position.z)) (trespass++, (lastTrespass = [root.position.x, root.position.z, job]));
  }

  // ---- what the bench asks of her ----------------------------------------------------------------------
  let lastTurn = 0, turnAt = null;
  // A setting changed: stand clear of the machine and throw a spark at that handwheel while changes keep coming.
  function turn(point) {
    lastTurn = performance.now();
    turnAt = point.clone();
    if (job || !mixer) return;
    start('turn', [go(...spotFor([point.x, point.z], 1.0, 2.4)), toss(() => turnAt, null, () => performance.now() - lastTurn < 2200)]);
  }
  let operatorBusy = () => false, operatorPoint = () => null, stonePoint = null, lapPoint = null, stickLow = () => true;
  // The operator's stone flip or lap change waits for `ready`: the spark has to land on the part first.
  function request(kind, ready) {
    if (!mixer) return ready();
    const part = () => (kind === 'stone' ? stonePoint : lapPoint)?.() || V(0, 1, 0), at = part();
    start(kind, [
      go(...spotFor([at.x, at.z], 1.0, 2.4)),
      toss(part, null),
      // The stick swings down to her hands first (app.js lowers it while the stone job waits).
      wait(() => kind !== 'stone' || stickLow(), part, 9000),
      act(ready),
      wait(() => !operatorBusy(), () => operatorPoint() || part()),
    ]);
  }

  // ---- celebration -------------------------------------------------------------------------------------
  function celebrate() {
    if (!mixer) return;
    steps = [];
    job = 'dance';
    dancing = { t: 0, spin: yaw };
    if (actions.jump) (actions.jump.setLoop(THREE.LoopRepeat, Infinity), play('jump', 0.15));
    const top = V(root.position.x, 1.3, root.position.z);
    burst(top, 70, CONFETTI, 2.6, 3.2, 1.4);
    setTimeout(() => burst(top, 50, CONFETTI, 2.2, 3, 1.3), 700);
    setTimeout(() => burst(top, 50, CONFETTI, 2.4, 3, 1.3), 1500);
  }
  function dance(dt) {
    dancing.t += dt;
    yawGoal = yaw = dancing.spin + dancing.t * 7; // spin on the spot
    if (body) body.rotation.z = Math.sin(dancing.t * 9) * 0.18; // sway
    if (dancing.t > 3.2) {
      dancing = null;
      if (body) body.rotation.z = 0;
      current?.fadeOut(0.2);
      current = null;
      play('emote-yes', 0.2);
      job = null;
    }
  }
  function gesture(clip) {
    if (job || performance.now() < oneShotUntil - 150) return;
    play(clip, 0.15);
  }
  return {
    root,
    update,
    gesture,
    turn,
    request,
    celebrate,
    get job() {
      return job;
    },
    get ready() {
      return Boolean(mixer);
    },
    get stats() {
      return { thrown, trespass, lastTrespass, bits: bits.length };
    },
    attach({ busy, point, stone, lap, stickReady }) {
      operatorBusy = busy;
      operatorPoint = point;
      stonePoint = stone;
      lapPoint = lap;
      if (stickReady) stickLow = stickReady;
    },
  };
}
