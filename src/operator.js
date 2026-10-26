import * as THREE from "three";
// World-space hands share the actual machine pivots. No screen-space gesture hand.
function hand() {
  const root = new THREE.Group(),
    glove = new THREE.MeshPhysicalMaterial({ color: "#cdb9ed", roughness: 0.55, clearcoat: 0.15 }),
    cuff = new THREE.MeshStandardMaterial({ color: "#fff1dc", roughness: 0.8 }),
    sleeve = new THREE.MeshStandardMaterial({ color: "#a6c9c8", roughness: 0.8 });
  const ell = (p, scale, m = glove) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), m);
    o.position.set(...p);
    o.scale.set(...scale);
    o.castShadow = true;
    root.add(o);
  };
  const finger = (points, r) => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
      o = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, r, 10, false), glove);
    o.castShadow = true;
    root.add(o);
    ell(points.at(-1), [r, r, r]);
  };
  ell([0.19, 0, 0.06], [0.23, 0.26, 0.14]);
  ell([0.45, 0, 0.07], [0.16, 0.18, 0.16], cuff);
  ell([0.73, 0.01, 0.08], [0.32, 0.17, 0.17], sleeve);
  for (let i = 0; i < 4; i++) {
    const y = -0.17 + i * 0.115;
    finger(
      [
        [0.12, y, 0.09],
        [-0.07, y, 0.1],
        [-0.16, y, -0.03],
        [-0.06, y, -0.16],
      ],
      0.054,
    );
  }
  finger(
    [
      [0.27, -0.17, 0.09],
      [0.11, -0.29, 0.09],
      [-0.07, -0.23, -0.04],
    ],
    0.075,
  );
  return root;
}

// `helper` (the workshop apprentice) is called before each job; the job waits until she is in place, then runs.
export function createOperator({ scene, arm, carriage, pivot, lap, nut, waterArm, helper = null, onSound = () => {} }) {
  const grip = hand();
  grip.name = "quill-gripping-hand";
  scene.add(grip);
  grip.visible = false;
  const adjust = hand();
  adjust.name = "adjusting-hand";
  scene.add(adjust);
  adjust.visible = false;
  let turnUntil = 0,
    turnField = "height";
  const movingHand = hand();
  scene.add(movingHand);
  movingHand.visible = false;
  const metal = new THREE.MeshStandardMaterial({ color: "#a7b0ba", metalness: 0.8, roughness: 0.24 }),
    rubber = new THREE.MeshStandardMaterial({ color: "#1b2025", roughness: 0.88 });
  const wrench = new THREE.Group();
  const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 8, 24, Math.PI * 1.55), metal);
  jaw.rotation.x = Math.PI / 2;
  wrench.add(jaw);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.035, 0.085), metal);
  handle.position.x = 0.43;
  wrench.add(handle);
  wrench.position.set(3.15, 0.12, 1.35);
  scene.add(wrench);
  const rack = new THREE.Group();
  rack.name = "vertical-lap-and-abrasive-rack";
  rack.position.set(-3.6, 0, -0.45);
  scene.add(rack);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.1, 2.6),
    new THREE.MeshStandardMaterial({ color: "#44474e", metalness: 0.4, roughness: 0.5 }),
  );
  base.position.y = 0.05;
  rack.add(base);
  const colors = { cut: "#657b90", fine: "#bc8150", polish: "#7953a4" },
    slots = { cut: 0, fine: 0.42, polish: 0.84 };
  const discs = {};
  for (const [kind, z] of Object.entries(slots)) {
    const d = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.3, 0.065, 64),
      new THREE.MeshStandardMaterial({
        color: colors[kind],
        roughness: kind === "polish" ? 0.65 : 0.45,
        metalness: kind === "polish" ? 0.06 : 0.55,
      }),
    );
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.071, 32), rubber);
    bore.position.y = 0.002;
    d.add(bore);
    d.rotation.x = Math.PI / 2;
    d.position.set(0, 1.36, z - 0.8);
    d.castShadow = true;
    rack.add(d);
    discs[kind] = d;
  }
  for (let i = 0; i < 3; i++) {
    const sheet = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.85, 0.012),
      new THREE.MeshStandardMaterial({ color: ["#a08665", "#786957", "#575866"][i], roughness: 1 }),
    );
    sheet.position.set(0.15, 0.55, 0.6 + i * 0.13);
    sheet.rotation.x = -0.13;
    rack.add(sheet);
  }
  discs.cut.visible = false;
  lap.userData.activeKind = "cut";
  const mover = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.3, 0.09, 64),
    new THREE.MeshStandardMaterial({ color: colors.cut, roughness: 0.5, metalness: 0.4 }),
  );
  const moverBore = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.096, 32), rubber);
  moverBore.position.y = 0.002;
  mover.add(moverBore);
  mover.visible = false;
  mover.castShadow = true;
  scene.add(mover);
  let job = null,
    lastPhase = "idle";
  const home = new THREE.Vector3(-0.65, 0.82, 0),
    rackPoint = new THREE.Vector3(-3.6, 1.36, -0.45);
  function swap(from, to, commit) {
    if (job) return false;
    job = { from, to, commit, start: performance.now(), elapsed: 0, last: performance.now() };
    lastPhase = "swing-water-away";
    grip.visible = false;
    callHelper("lap");
    return true;
  }
  function callHelper(kind) {
    if (!helper) return;
    const mine = job;
    mine.waiting = performance.now();
    lastPhase = "helper-coming";
    helper.request(kind, () => {
      if (job !== mine || !mine.waiting) return;
      mine.waiting = 0;
      mine.last = performance.now();
    });
  }
  // Keep the wrist on the upper side of the quill instead of inheriting its downward roll.
  function upperGrip(h, target, offset) {
    target.updateWorldMatrix(true, false);
    h.position.copy(target.localToWorld(offset));
    const y = new THREE.Vector3(0, 1, 0).applyQuaternion(target.getWorldQuaternion(new THREE.Quaternion())).normalize(),
      x = new THREE.Vector3(0, 1, 0).addScaledVector(y, -y.y);
    if (x.lengthSq() < 0.01) x.set(1, 0, 0).addScaledVector(y, -y.x);
    x.normalize();
    const z = new THREE.Vector3().crossVectors(x, y).normalize();
    h.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  }
  function clearTable(h) {
    if (!h.visible) return;
    h.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(h);
    if (bounds.min.y < 0.06) h.position.y += 0.06 - bounds.min.y;
  }
  function clearance() {
    return [grip, adjust, movingHand]
      .filter((h) => h.visible)
      .map((h) => ({ name: h.name || "moving-hand", bottom: new THREE.Box3().setFromObject(h).min.y }));
  }
  function update(now, { holding = false, inspecting = false } = {}) {
    grip.visible = false;
    adjust.visible = false;
    movingHand.visible = false;
    if (grip.visible) {
      upperGrip(grip, arm, new THREE.Vector3(0, -0.22, 0.03));
      clearTable(grip);
    }
    if (adjust.visible) {
      const target = turnField === "height" ? carriage : turnField === "index" ? arm : pivot;
      target.updateWorldMatrix(true, false);
      const offset =
        turnField === "height"
          ? new THREE.Vector3(0.36, 0, 0)
          : turnField === "index"
            ? new THREE.Vector3(0, -0.42, 0)
            : new THREE.Vector3(0, 0, 0.25);
      upperGrip(adjust, target, offset);
      adjust.rotateY(Math.sin(now * 0.009) * 0.25);
      clearTable(adjust);
    }
    if (!job) return;
    // Still waiting for the apprentice (never longer than 60 s, so a stuck helper cannot block the game).
    if (job.waiting) {
      if (performance.now() - job.waiting < 60000) return;
      job.waiting = 0;
      job.last = now;
    }
    if (job.kind === "transfer") {
      job.elapsed += Math.min(100, Math.max(0, now - job.last));
      job.last = now;
      const t = Math.min(1, job.elapsed / 3600),
        u = Math.max(0, Math.min(1, (t - 0.25) / 0.5)),
        ease = u * u * (3 - 2 * u);
      lastPhase = t < 0.25 ? "lift-stone" : t < 0.75 ? "turn-stone" : "seat-stone";
      job.frame.rotation.x = THREE.MathUtils.lerp(job.from ? Math.PI : 0, job.to ? Math.PI : 0, ease);
      job.frame.position.y = -Math.sin(Math.PI * t) * 0.16;
      job.frame.updateWorldMatrix(true, false);
      movingHand.position.copy(job.frame.getWorldPosition(new THREE.Vector3()));
      movingHand.position.x += 0.12;
      movingHand.rotation.set(0, 0, Math.PI / 2);
      clearTable(movingHand);
      if (t >= 1) {
        job.frame.position.y = 0;
        job.commit();
        job = null;
        lastPhase = "idle";
        movingHand.visible = false;
        onSound();
      }
      return;
    }
    job.elapsed += Math.min(100, Math.max(0, now - job.last));
    job.last = now;
    const swing = 800,
      total = 8400;
    if (job.elapsed < swing || job.elapsed > 7600) {
      const returning = job.elapsed > 7600,
        u = Math.min(1, returning ? (job.elapsed - 7600) / swing : job.elapsed / swing),
        e = u * u * (3 - 2 * u);
      if (waterArm) waterArm.rotation.y = Math.PI * (returning ? 1 - e : e);
      lastPhase = returning ? "return-water" : "swing-water-away";
      movingHand.visible = false;
      if (returning) {
        wrench.position.set(3.15, 0.12, 1.35);
        wrench.rotation.set(0, 0, 0);
      }
      if (!returning || job.elapsed < total) return;
    } else if (waterArm) waterArm.rotation.y = Math.PI;
    const t = Math.min(1, Math.max(0, (job.elapsed - swing) / 6800)),
      phase = Math.min(7, Math.floor(t * 8)),
      u = t * 8 - phase,
      e = u * u * (3 - 2 * u);
    const names = ["loosen", "lift-old", "turn-old", "store-old", "lift-new", "turn-new", "seat-new", "tighten"];
    lastPhase = names[phase];
    wrench.visible = phase === 0 || phase === 7;
    nut.visible = phase === 0 || phase === 7;
    lap.visible = phase === 0 || phase === 7;
    mover.visible = phase > 0 && phase < 7;
    if (phase === 0 || phase === 7) {
      wrench.position.set(-0.65, 1.12, 0);
      wrench.rotation.set(0, Math.sin(u * Math.PI * 4) * 0.55, 0);
      movingHand.position.set(-0.65 + Math.cos(wrench.rotation.y) * 0.72, 1.13, -Math.sin(wrench.rotation.y) * 0.72);
      movingHand.rotation.set(0, wrench.rotation.y, Math.PI / 2);
      if (phase === 7) nut.position.y = 1.04;
    } else {
      const lift = new THREE.Vector3(0, 1.6, 0),
        raised = home.clone().add(lift);
      mover.scale.setScalar(1);
      rack.updateWorldMatrix(true, true);
      const slot = (k) => discs[k].getWorldPosition(new THREE.Vector3()),
        carry = (k, v) => {
          const end = slot(k),
            over = new THREE.Vector3(end.x, raised.y, end.z);
          return v < 0.6 ? raised.clone().lerp(over, v / 0.6) : over.lerp(end, (v - 0.6) / 0.4);
        };
      if (phase === 1) {
        mover.material.color.set(colors[job.from]);
        mover.position.copy(home).addScaledVector(lift, e);
        mover.rotation.set(0, 0, 0);
      }
      if (phase === 2) {
        mover.material.color.set(colors[job.from]);
        mover.position.copy(raised);
        mover.rotation.set(Math.PI * 0.5 * e, 0, 0);
      }
      if (phase === 3) {
        mover.material.color.set(colors[job.from]);
        mover.position.copy(carry(job.from, e));
        mover.rotation.set(Math.PI * 0.5, 0, 0);
      }
      if (phase === 4) {
        mover.material.color.set(colors[job.to]);
        mover.position.copy(carry(job.to, 1 - e));
        mover.rotation.set(Math.PI * 0.5, 0, 0);
      }
      if (phase === 5) {
        mover.material.color.set(colors[job.to]);
        mover.position.copy(raised);
        mover.rotation.set(Math.PI * 0.5 * (1 - e), 0, 0);
      }
      if (phase === 6) {
        mover.material.color.set(colors[job.to]);
        mover.position.copy(home).addScaledVector(lift, 1 - e);
        mover.rotation.set(0, 0, 0);
      }
      discs[job.to].visible = phase < 4;
      discs[job.from].visible = phase >= 4;
    }
    clearTable(movingHand);
    if (phase === 7 && !job.seated) {
      job.seated = true;
      lap.userData.activeKind = job.to;
      job.commit();
      onSound();
    }
    if (job.elapsed >= 8400) {
      if (waterArm) waterArm.rotation.y = 0;
      job = null;
      lastPhase = "idle";
      lap.visible = true;
      nut.visible = true;
      mover.visible = false;
      mover.scale.setScalar(1);
      movingHand.visible = false;
      wrench.visible = true;
      wrench.position.set(3.15, 0.12, 1.35);
      wrench.rotation.set(0, 0, 0);
      for (const [kind, d] of Object.entries(discs)) d.visible = kind !== lap.userData.activeKind;
    }
  }
  return {
    update,
    swap,
    clearance,
    transfer(frame, from, to, commit) {
      if (job) return false;
      job = { kind: "transfer", frame, from, to, commit, elapsed: 0, last: performance.now() };
      lastPhase = "lift-stone";
      callHelper("stone");
      return true;
    },
    turn(field) {
      turnField = field;
      turnUntil = performance.now() + 850;
    },
    get busy() {
      return Boolean(job);
    },
    get phase() {
      return lastPhase;
    },
    // Where hands would hold the work right now: the stone, the wrench handle or the carried lap.
    get workPoint() {
      if (!job || job.waiting) return null;
      if (job.kind === "transfer" || ["loosen", "tighten"].includes(lastPhase)) return movingHand.position;
      if (mover.visible) return mover.position;
      return null;
    },
    get handVisible() {
      return grip.visible || adjust.visible || movingHand.visible;
    },
    rack,
    wrench,
  };
}
