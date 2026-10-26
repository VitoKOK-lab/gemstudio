// The workshop apprentice (Kenney Mini Characters, CC0) does the bench's hand work:
// - turns the angle / index / height handwheel whenever a setting changes (also during auto mode),
// - fetches the step ladder, climbs it and lifts the stone off the dop to flip it,
// - carries the laps between the machine and the rack,
// - nods at each finished facet and winces at an impact.
// Jobs from the operator wait until she is in place (`request(kind, ready)`); settings are just watched.
const BASE = 'models/kenney/';
const WALK_SPEED = 1.9, CLIMB_TIME = 1.1, TURN_RATE = 9;

// `keepOut` circles ([x, z, radius]) are the machine parts she walks around: the lap and splash pan, and the mast.
export function createApprentice({THREE, GLTFLoader, scene, home = [3.45, 0, 1.05], ladderPark = [3.6, 0, -1.6], scale = 1.6, keepOut = [[-0.65, 0, 1.72], [2.25, 0.1, 0.55]]}) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const root = new THREE.Group();
  root.name = 'apprentice';
  root.position.set(...home);
  scene.add(root);
  const homeSpot = V(...home), parkSpot = V(...ladderPark);
  const loader = new GLTFLoader();
  let mixer = null, actions = {}, current = null, oneShotUntil = 0, body = null;
  let handHeight = 1, reach = 0.35; // measured from the model once it loads

  // Stool she waits beside.
  loader.load(BASE + 'stoolBar.glb', g => {
    const s = g.scene;
    s.scale.setScalar(1.2);
    s.position.set(home[0] + 0.45, 0, home[2] + 0.2);
    s.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      if (o.material?.name === 'carpet') o.material.color.set('#6b2d4a');
      if (o.material?.name === 'wood') o.material.color.set('#7a5230');
    });
    scene.add(s);
  }, undefined, () => {});

  // A wooden step ladder: two rails, rungs and a top platform she stands on.
  const ladder = new THREE.Group();
  ladder.name = 'apprentice-ladder';
  const wood = new THREE.MeshStandardMaterial({color: '#9a6b3c', roughness: 0.7});
  let ladderTop = 1.2;
  function buildLadder(height) {
    ladder.clear();
    ladderTop = height;
    const rail = (x, z, lean) => {
      const len = height / Math.cos(lean), m = new THREE.Mesh(new THREE.BoxGeometry(0.07, len, 0.07), wood);
      m.position.set(x, height / 2, z);
      m.rotation.x = lean;
      ladder.add(m);
    };
    const spread = 0.32;
    for (const x of [-0.28, 0.28]) {
      rail(x, spread / 2, -Math.atan2(spread / 2, height));
      rail(x, -spread / 2, Math.atan2(spread / 2, height));
    }
    const rungs = Math.max(2, Math.round(height / 0.32));
    for (let i = 1; i < rungs; i++) {
      const y = (height * i) / rungs, r = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.12), wood);
      r.position.set(0, y, spread / 2 * (1 - y / height) + 0.02);
      ladder.add(r);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.46), wood);
    top.position.y = height;
    ladder.add(top);
    ladder.traverse(o => o.isMesh && (o.castShadow = o.receiveShadow = true));
  }
  buildLadder(ladderTop);
  ladder.position.copy(parkSpot);
  scene.add(ladder);
  let ladderHeld = false;

  loader.load(BASE + 'character-female-a.glb', g => {
    body = g.scene;
    body.scale.setScalar(scale);
    body.traverse(o => o.isMesh && (o.castShadow = o.receiveShadow = true));
    root.add(body);
    mixer = new THREE.AnimationMixer(body);
    for (const clip of g.animations) actions[clip.name] = mixer.clipAction(clip);
    for (const n of ['interact-right', 'emote-yes', 'emote-no', 'pick-up']) {
      const a = actions[n];
      if (a) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
    }
    play('idle');
    root.updateMatrixWorld(true);
    const hand = body.getObjectByName('arm-right'), size = new THREE.Box3().setFromObject(body).getSize(V());
    handHeight = hand ? hand.getWorldPosition(V()).y - root.position.y : size.y * 0.5;
    reach = Math.max(0.25, size.z * 0.6);
    face(V(0.3, 0, 0.8));
  }, undefined, () => {});

  function play(name, fade = 0.25) {
    const next = actions[name];
    if (!next || (next === current && next.loop !== THREE.LoopOnce)) return;
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (current && current !== next) current.fadeOut(fade);
    current = next;
    if (next.loop === THREE.LoopOnce) oneShotUntil = performance.now() + next.getClip().duration * 1000;
  }
  let yaw = 0, yawGoal = 0, lean = 0;
  function face(p) {
    yawGoal = Math.atan2(p.x - root.position.x, p.z - root.position.z);
  }

  // ---- task runner: a queue of small steps, run one at a time -------------------------------------
  let steps = [], job = null, idleAnim = 'idle';
  const go = (to, anim = 'walk') => ({walk: to.clone().setY(0), anim});
  const climb = up => ({climb: up, t: 0});
  const doNow = fn => ({fn});
  const work = (anim, until, point) => ({work: anim, until, point});
  const circles = keepOut.map(([x, z, r]) => ({c: V(x, 0, z), r})), center = circles[0].c;
  const blocked = (x, z, pad = 0) => circles.find(k => Math.hypot(x - k.c.x, z - k.c.z) < k.r + pad);
  // Where to stand so the hands reach `p`: `reach` out from it, then pushed clear of the machine.
  function standFor(p) {
    const at = V(p.x, 0, p.z);
    let side = at.clone().sub(center);
    if (side.lengthSq() < 1e-4) side.set(0.3, 0, 1);
    at.addScaledVector(side.normalize(), reach);
    for (let i = 0; i < 4; i++) {
      const k = blocked(at.x, at.z, 0.08);
      if (!k) break;
      const out = at.clone().sub(k.c).setY(0);
      if (out.lengthSq() < 1e-4) out.set(0, 0, 1);
      at.copy(k.c).addScaledVector(out.normalize(), k.r + 0.1);
    }
    return at;
  }
  // Straight line if it clears the machine, otherwise detour around the part in the way.
  function route(from, to, depth = 0) {
    for (let i = 1; i < 30; i++) {
      const t = i / 30, x = from.x + (to.x - from.x) * t, z = from.z + (to.z - from.z) * t, k = blocked(x, z);
      if (!k || depth > 3) continue;
      const mid = V(x, 0, z), out = mid.clone().sub(k.c);
      if (out.lengthSq() < 1e-4) out.set(-(to.z - from.z), 0, to.x - from.x);
      const via = k.c.clone().addScaledVector(out.normalize(), k.r + 0.35);
      return [...route(from, via, depth + 1), ...route(via, to, depth + 1)];
    }
    return [to];
  }
  function step(dt) {
    const s = steps[0];
    if (!s) {
      if (job) {
        job = null;
        steps = [go(homeSpot), doNow(() => face(V(0.3, 0, 0.8)))];
        return;
      }
      play(performance.now() < oneShotUntil ? current?.getClip().name : idleAnim);
      return;
    }
    if (s.fn) {
      s.fn();
      steps.shift();
      return;
    }
    if (s.walk && !s.routed) {
      s.routed = true;
      const legs = route(V(root.position.x, 0, root.position.z), s.walk);
      steps.splice(0, 1, ...legs.map(p => ({walk: p, anim: s.anim, routed: true})));
      return;
    }
    if (s.walk) {
      const to = s.walk, here = root.position, flat = V(to.x - here.x, 0, to.z - here.z), dist = flat.length();
      if (dist < 0.03) {
        steps.shift();
        return;
      }
      face(to);
      play(s.anim);
      here.addScaledVector(flat.normalize(), Math.min(dist, WALK_SPEED * dt));
      return;
    }
    if ('climb' in s) {
      s.t = Math.min(1, s.t + dt / CLIMB_TIME);
      play('walk');
      root.position.y = (s.climb ? s.t : 1 - s.t) * ladderTop;
      if (s.t >= 1) steps.shift();
      return;
    }
    if (s.work) {
      if (s.point) face(typeof s.point === 'function' ? s.point() : s.point);
      if (s.work === 'interact-right') {
        if (performance.now() > oneShotUntil - 120) play('interact-right', 0.12);
      } else if (actions[s.work]?.loop !== THREE.LoopOnce) play(s.work);
      if (s.until()) steps.shift();
    }
  }

  // ---- jobs ---------------------------------------------------------------------------------------
  // The ladder stays wherever it was last used; `ladderAt` is its floor spot.
  let ladderAt = parkSpot.clone(), onLadder = false;
  // Steps that bring the ladder under `spot` at the right height and put her on top of it.
  function ladderUp(spot, height) {
    const list = [];
    if (onLadder) list.push(climb(false), doNow(() => (onLadder = false)));
    const moved = ladderAt.distanceTo(spot) > 0.05 || Math.abs(ladderTop - height) > 0.05;
    if (moved) {
      const side = ladderAt.clone().sub(center).setY(0).setLength(0.45), aside = spot.clone().sub(center).setY(0).setLength(0.45);
      list.push(
        go(ladderAt.clone().add(side)),
        doNow(() => (face(ladderAt), play('pick-up', 0.15))),
        work('pick-up', () => performance.now() > oneShotUntil - 200, () => ladderAt),
        doNow(() => (ladderHeld = true)),
        go(spot.clone().add(aside)),
        doNow(() => {
          ladderHeld = false;
          buildLadder(height);
          ladderAt.copy(spot);
          ladder.position.copy(spot);
        }),
      );
    }
    list.push(go(spot), climb(true), doNow(() => (onLadder = true)));
    return list;
  }
  const down = () => [climb(false), doNow(() => (onLadder = false))];
  const reachHeight = p => Math.max(0, p.y - handHeight);

  let lastTurn = 0, turnPoint = null;
  // A setting changed: take the ladder to that handwheel and keep turning while changes keep coming.
  function turn(point) {
    lastTurn = performance.now();
    turnPoint = point;
    if (job || !mixer) return;
    const spot = standFor(point), h = reachHeight(point), idle = () => performance.now() - lastTurn > 2200;
    start('turn', [
      ...(h > 0.15 ? ladderUp(spot, h) : [go(spot)]),
      doNow(() => face(turnPoint)),
      work('interact-right', idle, () => turnPoint),
      ...(h > 0.15 ? down() : []),
    ]);
  }
  // Operator jobs: the stone flip (on the ladder) and the lap change (carried). `ready` starts the machine.
  let operatorBusy = () => false, operatorPoint = () => null, stonePoint = null, lapPoint = null;
  function request(kind, ready) {
    if (!mixer) return ready();
    if (ladderHeld) {
      ladderHeld = false;
      ladder.position.copy(ladderAt);
    }
    const p = (kind === 'stone' ? stonePoint : lapPoint)?.() || V(0, 1, 0);
    if (kind === 'stone') {
      const spot = standFor(p);
      start('stone', [
        ...ladderUp(spot, Math.max(0.3, reachHeight(p))),
        doNow(() => (face(p), ready())),
        work('holding-both', () => !operatorBusy(), () => operatorPoint() || p),
        ...down(),
      ]);
    } else {
      start('lap', [
        ...(onLadder ? down() : []),
        go(standFor(p)),
        doNow(() => (face(p), ready())),
        // Follow the wrench and the carried disc, hands out in front.
        work('holding-both', () => {
          const w = operatorPoint();
          if (w) {
            const to = standFor(w);
            root.position.lerp(V(to.x, 0, to.z), 0.06);
            face(w);
          }
          return !operatorBusy();
        }),
      ]);
    }
  }
  // A job (re)starts from the ground unless she is already on the ladder.
  function start(kind, list) {
    job = kind;
    if (!onLadder) root.position.y = 0;
    steps = list;
  }

  function update(dt) {
    if (!mixer) return;
    mixer.update(dt);
    step(dt);
    let d = yawGoal - yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    yaw += d * Math.min(1, TURN_RATE * dt);
    root.rotation.y = yaw;
    // Lean toward work that is beyond arm's length (up to ~30°).
    const target = steps[0]?.work && steps[0].point ? (typeof steps[0].point === 'function' ? steps[0].point() : steps[0].point) : null;
    let leanGoal = 0;
    if (target) {
      const gap = Math.hypot(target.x - root.position.x, target.z - root.position.z) - reach * 0.6;
      leanGoal = Math.max(0, Math.min(0.55, gap * 0.6));
    }
    lean += (leanGoal - lean) * Math.min(1, 5 * dt);
    if (body) body.rotation.x = lean;
    if (ladderHeld) {
      // Carried upright beside her.
      ladder.position.set(root.position.x + Math.cos(yaw) * 0.35, 0.25, root.position.z - Math.sin(yaw) * 0.35);
      ladder.rotation.y = yaw;
    }
  }
  // Short reactions that never interrupt a job.
  function gesture(name) {
    if (job && job !== 'turn') return;
    if (performance.now() < oneShotUntil - 150) return;
    if (!job) play(name, 0.15);
  }
  return {
    root,
    ladder,
    update,
    gesture,
    turn,
    request,
    get job() {
      return job;
    },
    // Tells her where the work is: the stone, the lap, the operator's live hand point and which side is "out".
    attach({busy, point, stone, lap}) {
      operatorBusy = busy;
      operatorPoint = point;
      stonePoint = stone;
      lapPoint = lap;
    },
  };
}
