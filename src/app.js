import { wallCD } from "./wall-cd.js";
import { jewelGlints } from "./jewel-glints.js";
import { settingsMotion } from "./settings-motion.js";
import { createOperator } from "./operator.js";
import { workHaptics } from "./work-haptics.js";
import { learningStages, cutTowards, demoFrames } from "./learning.js";
import { dragSetting } from "./precision-drag.js";
import { addWorkshop } from "./workshop.js";
import { contactEffects } from "./contact-fx.js";
import { leverResponse, impactChip } from "./lever.js";
import {
  materials,
  lessons as courses,
  exams,
  rawKinds,
  createRaw,
  carats,
  maxFit,
  fittedPlan,
  grade,
  passLesson,
  passExam,
  loadProfile,
  practiceIssue,
  isIntro,
  introSequence,
  introStageReady,
  advanceSurface,
  isIntroKind,
} from "./game.js";
import {
  opticalMaterial,
  bindOptics,
  geometryFromFaces,
  updateOpticalFaces,
  setOpticalEnvironment,
} from "./gem-optics.js";
import { RGBELoader } from "./vendor/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "./vendor/addons/loaders/GLTFLoader.js";
import * as THREE from "three";
import { blueprintGrants, addBlueprints } from "./rewards.js";
import { createBlueprintUI } from "./blueprint-ui.js";
import { fractureFaces, addChipScars } from "./chip-card.js";
import { impactSound, screenShake, armBounce, treasureChime } from "./impact-fx.js";
import { buildRoyalMachine } from "./royal-machine.js";
import { createApprentice } from "./apprentice.js";
import { screenConfetti } from "./confetti.js";
import { plans, buildPlan, planSVG, catalogPlanIds, specialistPlans } from "./plans.js";
import {
  LAP_Y,
  ARM_LENGTH,
  GEM_SCALE,
  mastY,
  lowestY,
  contactHeight,
  supportedAngle,
  faceNormal,
  normalKey,
} from "./contact.js";
import { catalog, cutIcon } from "./catalog.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { rough, clip, volume, dot } from "./geometry.js";
import { turnAngle, indicatedAngle } from "./mechanics.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
// Watchers that used to be separate timers and animation loops; animate() runs them every frame, or every `ms`.
const frameTasks = [];
function everyFrame(fn, ms = 0) {
  frameTasks.push({ fn, ms, at: -Infinity });
}
function runFrameTasks(now) {
  for (const t of frameTasks)
    if (now - t.at >= t.ms) {
      t.at = now;
      t.fn(now);
    }
}
const designs = plans;
$("#designSelect").innerHTML = Object.values(plans)
  .map((p) => `<option value="${p.id}">${p.family}</option>`)
  .join("");
let state = {
  gemSceneScale: GEM_SCALE,
  seed: 241,
  stone: 3,
  design: "learn-triangle",
  courseId: "first",
  mode: "course",
  rawKind: "intro",
  planScale: 1,
  originalFaces: createRaw(241, "intro"),
  step: 0,
  angle: 30,
  angleDrive: 30,
  index: 0,
  indexLocked: true,
  height: Number(introSequence()[0].targetHeight.toFixed(2)),
  machineVersion: 2,
  surfaces: {},
  locked: true,
  power: false,
  water: true,
  lap: "cut",
  rpm: 400,
  flip: false,
  faces: createRaw(241, "intro"),
  finish: {},
  log: [],
  touched: [],
  inspecting: false,
};
const stones = [
  {
    name: "海沫綠",
    material: "玻璃",
    color: 0x91c6b0,
    weight: 12.8,
    price: 18,
    seed: 241,
    shape: "厚實塊狀",
    css: "#84b7a0",
  },
  {
    name: "冰河藍",
    material: "玻璃",
    color: 0x90c3d4,
    weight: 10.4,
    price: 18,
    seed: 723,
    shape: "不規則稜角",
    css: "#89b5c6",
  },
  {
    name: "蜂蜜金",
    material: "玻璃",
    color: 0xd6b77b,
    weight: 14.2,
    price: 18,
    seed: 891,
    shape: "偏斜塊狀",
    css: "#c3a266",
  },
  {
    name: "玫瑰莓紅",
    material: "玻璃",
    color: 0xe34d9a,
    weight: 12.8,
    price: 18,
    seed: 111,
    shape: "不規則塊狀",
    css: "#cd4d91",
  },
];
const lessonDefault = structuredClone(state);
let previousVisit = null;
let storageOK = true,
  vault = [];
try {
  vault = JSON.parse(localStorage.getItem("facet-vault") || "[]");
  const saved = JSON.parse(localStorage.getItem("facet-session") || "null");
  if (saved?.courseId) previousVisit = { courseId: saved.courseId, step: saved.step || 0 };
  if (saved?.faces?.length && designs[saved.design])
    state = {
      ...state,
      ...saved,
      gemSceneScale: saved.gemSceneScale || 0.31,
      rawKind: saved.rawKind || "block",
      courseId: saved.courseId || null,
      machineVersion: saved.machineVersion || 0,
      power: false,
      inspecting: false,
      locked: true,
    };
} catch {
  storageOK = false;
}
// Keep paused side-mode work intact while this release focuses on lessons.
if (state.mode !== "course" && !(state.mode === "challenge" && state.courseId === "master")) {
  try {
    localStorage.setItem("facet-paused-side-session", JSON.stringify(state));
  } catch {}
  state = structuredClone(lessonDefault);
}
function migrateMachine() {
  if (state.planVersion !== 2) {
    state.step = 0;
    state.planVersion = 2;
  }
  state.step = Math.min(state.step, buildPlan(state.design).sequence.length - 1);
  if (!state.machineVersion) {
    state.height = (0.865 + 1.75 * Math.cos((state.angle * Math.PI) / 180) + state.height * 0.1) * 50;
  }
  state.machineVersion = 2;
  if (state.gemSceneScale !== GEM_SCALE) {
    const base = (LAP_Y + ARM_LENGTH * Math.cos((state.angle * Math.PI) / 180)) * 50;
    state.height = base + ((state.height - base) * GEM_SCALE) / (state.gemSceneScale || 0.31);
    state.gemSceneScale = GEM_SCALE;
  }
  state.surfaces ||= {};
  state.indexLocked ??= true;
}
migrateMachine();
if (state.mode === "challenge" && state.courseId === "master") {
  state.mode = "course";
  state.batchVersion = 0;
}
if (compactCourse() && !state.batchVersion) {
  state.step = 0;
  state.batchVersion = 1;
  state.batchFacet = 0;
  state.batchTime = 0;
  state.batchDone = false;
}
let grindFocus = null,
  grindZoom = 1,
  focusLocked = false,
  pendingInspection = false;
let leverPointerActive = false;
let leverTravel = 0,
  leverSpeed = 0,
  leverLastY = 0,
  leverLastTime = 0,
  impactPending = 0,
  contactFelt = false;
const renderRecovery = { lost: new Set(), losses: 0, restores: 0, detailFrames: 0 };
const completedFaceCues = new Set();
let completionCueCount = 0;
let noticedDamage = state.damageCount || 0;
function warnChipDamage() {
  const damage = state.damageCount || 0;
  if (damage < noticedDamage) {
    noticedDamage = damage;
    return;
  }
  if (damage === noticedDamage) return;
  noticedDamage = damage;
  hold = false;
  leverPointerActive = false;
  leverTravel = 0;
  impactPending = 0;
  pendingInspection = true;
  cutSoundUntil = 0;
  stop();
  toast("下壓太快，邊角出現缺口。放開檢查後重新開始。");
  onImpact();
}
everyFrame(warnChipDamage);
// Impact: crack and thud, a hard phone buzz, a full-screen shake, the arm springs off the lap (see animate) and the apprentice winces.
function onImpact() {
  impactAt = performance.now();
  if (!audioMuted && audioContext?.state === "running") impactSound(audioContext);
  screenShake();
  apprentice.gesture("emote-no");
  pusher.gesture("emote-no");
}
let activeSetupField = null;
let autoGuideKey = "",
  guideTimer,
  targetOutline = null,
  settingGesture = false;
let pendingToolRun = false;
let impactAt = -1e9;
let autoArmed = false,
  armedAdvance = false;
let autoIntroRun = false,
  autoIntroNext = null,
  autoFacetStart = 0;
let autoBatchRun = false;
let batchTransition = null,
  lastIndexClearance = null,
  indexChangeCount = 0;
let headAngle = 1.3,
  inspectionYaw = 0,
  inspectionPitch = 0,
  targetYaw = 0,
  targetPitch = 0,
  lastContactInfo = { supported: false, stopGap: 0, radial: 0 },
  cameraTransition = true;
let heightFine = true,
  fineAdjust = false,
  audioMuted = false,
  audioError = "",
  motorSpeed = 0,
  cutSoundUntil = 0,
  coachSeen = false,
  inspectedStep = -1;
let initialVolume = volume(state.originalFaces || rough(state.seed)),
  hold = false,
  pressure = 0.18,
  contact = 0,
  toastTimer,
  inspectDragging = false,
  returning = false,
  view = "work",
  lastCut = 0,
  ticks = 0,
  lastSave = 0,
  rotationSaved;
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
}
// After a finished stone's card is closed, this button says what to do next instead of leaving the bench silent.
const nextCourseCue = document.createElement("button");
nextCourseCue.id = "nextCourseCue";
nextCourseCue.type = "button";
nextCourseCue.hidden = true;
$(".stage").append(nextCourseCue);
nextCourseCue.addEventListener("pointerdown", (e) => e.stopPropagation());
function persist() {
  try {
    if (!entryAwaiting && state.mode === "course")
      localStorage.setItem(
        "facet-last-played",
        JSON.stringify({ courseId: state.courseId, step: state.step, updatedAt: Date.now() }),
      );
    // Saves keep the recent log only; the full log stays in memory for grading this run.
    const log = state.log?.length > 4000 ? state.log.slice(-4000) : state.log;
    localStorage.setItem("facet-session", JSON.stringify({ ...state, log, power: false, inspecting: false }));
    localStorage.setItem("facet-vault", JSON.stringify(vault));
  } catch {
    if (storageOK) toast("本機儲存空間不足，請先匯出備份。");
    storageOK = false;
  }
  $("#vaultCount").textContent = vault.length;
}
function compactCourse() {
  return state.mode === "course" && !isIntro(state);
}
function sequence() {
  const p = fittedPlan(state.design, state.planScale || 1);
  return isIntro(state) ? introSequence(state) : compactCourse() ? learningStages(p) : p.sequence;
}
function rawWeight() {
  return state.originalFaces ? carats(state.originalFaces, state.materialId || "glass") : stones[state.stone].weight;
}
function material() {
  return materials[state.materialId || "glass"];
}
function blueprintSVG() {
  const s = sequence()[state.step],
    i = isIntro(state)
      ? buildPlan(state.design).sequence.findIndex(
          (t) => t.angle === s.angle && t.index === s.index && t.flip === s.flip && t.lap === s.lap,
        )
      : state.step;
  return planSVG(state.design, i, s.flip ? "crown" : "pavilion");
}
function easyLesson() {
  return compactCourse() || (isIntro(state) && ["first", "ring"].includes(state.courseId));
}
function updateUI() {
  updateLapAppearance();
  $("#mobileSettings").hidden = easyLesson();
  $("#mobileSettings").disabled = easyLesson();
  document.body.classList.toggle("easy-lesson", easyLesson());
  document.body.classList.toggle("intro-lesson", isIntro(state));
  document.body.classList.toggle("intro-index", isIntro(state) && state.rawKind === "intro-index");
  state.locked = true;
  state.indexLocked = true;
  updateFacetTarget();
  document.body.classList.toggle("independent", ["exam", "challenge", "contest"].includes(state.mode));
  const d = designs[state.design],
    seq = sequence(),
    s = seq[state.step],
    stone = stones[state.stone];
  if ($("#chooseCut")) $("#chooseCut").innerHTML = cutIcon(d.shape) + `<span>${d.family}</span>`;
  $("#drawing").innerHTML = blueprintSVG();
  $("#designTitle").textContent = d.name;
  $("#designSelect").value = state.design;
  $("#stepCount").textContent = `${String(state.step + 1).padStart(2, "0")} / ${seq.length}`;
  $("#facetLabel").textContent = `${s.stage} · ${s.id}`;
  $("#targetAngle").textContent = s.angle.toFixed(1) + "°";
  $("#targetIndex").textContent = String(s.index).padStart(2, "0");
  $("#steps").innerHTML = ["腰圍", "底面", "亭部", "底尖", "冠部", "台面"]
    .filter((p) => seq.some((x) => x.part === p))
    .map(
      (p, i) =>
        `<div class="step ${s.part === p ? "active" : ""}"><span>0${i + 1}</span>${p}${p === "冠部" ? " · 先轉接翻面" : ""}</div>`,
    )
    .join("");
  $("#materialName").textContent = material().name;
  $("#rawWeight").textContent = rawWeight().toFixed(2) + " ct";
  $("#stoneTitle").textContent = state.materialId ? material().name : `${stone.name} · 練習${stone.material}`;
  $("#currentWeight").textContent = ((rawWeight() * volume(state.faces)) / initialVolume).toFixed(2);
  $("#angle").step = isIntro(state) ? "1" : ".1";
  $("#angle").value = state.angle.toFixed(isIntro(state) ? 0 : 1);
  $("#angleWheel .wheel-ticks").style.backgroundPositionX = `${state.angle * 8}px`;
  $("#index").value = state.index;
  $("#indexLock").textContent = state.indexLocked ? "鬆開定位" : "鎖定分度";
  $("#indexDial").style.setProperty("--index-rotation", `${-state.index * 3.75}deg`);
  $("#indexAdvice").textContent = state.indexLocked
    ? "分度已定位。需要換面時，先鬆開定位。"
    : "順時針或逆時針拖動齒盤，對準圖紙齒位後鎖定。";
  $("#height").value = state.height.toFixed(2);
  $("#heightAdvice").textContent = ["exam", "challenge", "contest"].includes(state.mode)
    ? "自行判斷深度。"
    : `練習設定：${s.targetHeight.toFixed(2)} mm。`;
  $("#lap").value = state.lap;
  $("#rpm").value = state.rpm;
  $("#angle").disabled = false;
  $("#lock").textContent = state.locked ? "🔒 鬆開角度鎖" : "🔓 鎖定角度";
  $("#lock").classList.toggle("unlocked", !state.locked);
  $("#angleFeedback").textContent = state.locked
    ? "角度已鎖住：先點上方「鬆開角度鎖」。"
    : `角度可調整：左右拖動或按 ＋／−。目前${fineAdjust ? "微調" : "粗調"}。`;
  $("#power").classList.toggle("on", state.power);
  $("#power").setAttribute("aria-pressed", state.power);
  $("#motorLabel").textContent = state.power ? "主軸運轉中" : "電源關閉";
  $("#water span").textContent = state.water ? "開啟" : "關閉";
  $("#water").setAttribute("aria-pressed", state.water);
  $("#transfer").textContent = state.flip ? "轉接黏石棒 · 回亭部" : "轉接黏石棒 · 翻面";
  $("#prevStep").disabled = state.step === 0;
  $("#nextStep").disabled = state.step === seq.length - 1;
  $("#vaultCount").textContent = vault.length;
  $("#mobileAngle").textContent =
    `${state.angle.toFixed(isIntro(state) ? 0 : 1)}° · ${isIntro(state) ? "96 分度" : `齒位 ${state.index} / 96`}`;
  $("#mobileFacet").textContent = faceTitle();
  $("#mobilePower").setAttribute("aria-label", state.power ? "關閉磨盤電源" : "開啟磨盤電源");
  $("#mobilePower").setAttribute("aria-pressed", String(state.power));
  $("#mobilePower").classList.toggle("running", state.power);
  updateGuide();
  updateCoach();
}
const viewport = $("#viewport"),
  scene = new THREE.Scene();
scene.background = new THREE.Color("#f4ead8");
scene.fog = new THREE.Fog("#f4ead8", 12, 30);
const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 70);
camera.position.set(-3.6, 6, 11.8);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  viewport.appendChild(renderer.domElement);
} catch (e) {
  $("#loadError").hidden = false;
  throw e;
}
const haptics = workHaptics({
  vibrate: typeof navigator.vibrate === "function" ? navigator.vibrate.bind(navigator) : undefined,
});
const cuttingFX = contactEffects(scene);
let lastFX = 0;
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.2, 1, 0);
controls.enableDamping = true;
controls.minDistance = 1;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.485;
controls.enablePan = false;
scene.add(new THREE.HemisphereLight(0xfffbef, 0xd1b88e, 1.35));
const key = new THREE.SpotLight(0xfff2d4, 95, 20, 0.78, 0.65, 1.3);
key.position.set(-2, 7, 3);
key.target.position.set(0, 0.7, 0);
scene.add(key.target);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 0.1, far: 22 });
key.shadow.camera.updateProjectionMatrix();
key.shadow.bias = -0.00008;
key.shadow.normalBias = 0.008;
key.shadow.radius = 2.5;
scene.add(key);
const fill = new THREE.SpotLight(0xffefd4, 42, 16, 0.7, 0.75, 1.4);
fill.position.set(4, 5, 2);
fill.target.position.set(0.4, 1, 0);
scene.add(fill, fill.target);
const envScene = new THREE.Scene();
envScene.background = new THREE.Color("#292730");
for (const [x, y, z, w, h] of [
  [0, 5, 0, 7, 3],
  [-5, 2, 0, 3, 6],
  [3, 3, -4, 3, 5],
]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  m.position.set(x, y, z);
  m.lookAt(0, 0, 0);
  envScene.add(m);
}
let environmentTarget = null;
// Blender-rendered studio HDRI once loaded (applyStudio), otherwise a small analytic room.
let studioHDR = null;
function refreshEnvironment() {
  if (studioHDR) return applyStudio();
  environmentTarget?.dispose();
  const pmrem = new THREE.PMREMGenerator(renderer);
  environmentTarget = pmrem.fromScene(envScene, 0.03);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.38;
  pmrem.dispose();
}
refreshEnvironment();
const mats = {
  base: new THREE.MeshPhysicalMaterial({
    color: "#e1dfd5",
    roughness: 0.3,
    metalness: 0.3,
    clearcoat: 0.45,
    clearcoatRoughness: 0.24,
  }),
  metal: new THREE.MeshStandardMaterial({ color: "#c9cdd3", metalness: 0.88, roughness: 0.27 }),
  dark: new THREE.MeshStandardMaterial({ color: "#343b3e", roughness: 0.4, metalness: 0.42 }),
  brass: new THREE.MeshStandardMaterial({ color: "#b59a63", metalness: 0.82, roughness: 0.26 }),
  rubber: new THREE.MeshStandardMaterial({ color: "#11151b", roughness: 0.9 }),
  lap: new THREE.MeshStandardMaterial({ color: "#a1a79d", metalness: 0.7, roughness: 0.5 }),
  wax: new THREE.MeshPhysicalMaterial({ color: "#b78239", roughness: 0.36, clearcoat: 0.35 }),
};
function updateLapAppearance() {
  const look =
    {
      cut: ["#657b90", 0.68, 0.65, "粗磨盤"],
      fine: ["#bc8150", 0.35, 0.72, "細磨盤"],
      polish: ["#7953a4", 0.65, 0.06, "拋光盤"],
    }[state.lap] || [];
  if (!look.length) return;
  mats.lap.color.set(look[0]);
  mats.lap.roughness = look[1];
  mats.lap.metalness = look[2];
  for (const child of lap.children) if (child.userData.lapGroove) child.visible = state.lap !== "polish";
  document.body.dataset.lap = state.lap;
  const badge = document.getElementById("lapBadge");
  if (badge) badge.textContent = look[3];
}
function mesh(geo, mat, parent = scene, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.castShadow = !(mat.transparent && mat.opacity < 1) && geo.type !== "PlaneGeometry";
  o.receiveShadow = !(mat.transparent && mat.opacity < 1);
  parent.add(o);
  return o;
}
function cyl(r, h, mat, parent, x, y, z) {
  return mesh(new THREE.CylinderGeometry(r, r, h, 64), mat, parent, x, y, z);
}
function cube(w, h, d, mat, parent, x, y, z) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z);
}
const workshop = addWorkshop(scene);
const royalSuite = workshop.getObjectByName("royal-suite");
const machine = new THREE.Group();
scene.add(machine);
const baseOutline = new THREE.Shape();
const bw = 4.7,
  bd = 3.6,
  br = 0.24;
baseOutline.moveTo(-bw / 2 + br, -bd / 2);
baseOutline.lineTo(bw / 2 - br, -bd / 2);
baseOutline.quadraticCurveTo(bw / 2, -bd / 2, bw / 2, -bd / 2 + br);
baseOutline.lineTo(bw / 2, bd / 2 - br);
baseOutline.quadraticCurveTo(bw / 2, bd / 2, bw / 2 - br, bd / 2);
baseOutline.lineTo(-bw / 2 + br, bd / 2);
baseOutline.quadraticCurveTo(-bw / 2, bd / 2, -bw / 2, bd / 2 - br);
baseOutline.lineTo(-bw / 2, -bd / 2 + br);
baseOutline.quadraticCurveTo(-bw / 2, -bd / 2, -bw / 2 + br, -bd / 2);
const baseGeo = new THREE.ExtrudeGeometry(baseOutline, {
  depth: 0.2,
  bevelEnabled: true,
  bevelSegments: 3,
  steps: 1,
  bevelSize: 0.045,
  bevelThickness: 0.04,
  curveSegments: 12,
});
baseGeo.rotateX(-Math.PI / 2);
mesh(baseGeo, mats.base, machine, 0.4, 0.2, 0);
const goldRim = mesh(new THREE.TorusGeometry(1.53, 0.018, 8, 96), mats.brass, machine, -0.65, 0.73, 0);
goldRim.rotation.x = Math.PI / 2;
for (const x of [-1.5, 2.2]) for (const z of [-1.3, 1.3]) cyl(0.18, 0.2, mats.rubber, machine, x, 0.1, z);
cyl(1.58, 0.25, mats.dark, machine, -0.65, 0.57, 0);
cyl(1.5, 0.13, mats.metal, machine, -0.65, 0.7, 0);
const bowl = mesh(new THREE.TorusGeometry(1.46, 0.075, 12, 100), mats.dark, machine, -0.65, 0.74, 0);
bowl.material = mats.dark.clone();
bowl.material.color.set("#373c40");
bowl.rotation.x = Math.PI / 2;
const lap = cyl(1.3, 0.09, mats.lap, machine, -0.65, 0.82, 0);
const lapY = 0.865;
for (let i = 1; i <= 13; i++) {
  const ring = mesh(
    new THREE.TorusGeometry(i * 0.092, 0.0016, 3, 96),
    new THREE.MeshStandardMaterial({ color: "#686f65", metalness: 0.4, roughness: 0.6 }),
    lap,
    0,
    0.047,
    0,
  );
  ring.userData.lapGroove = true;
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = false;
  ring.receiveShadow = false;
}
cyl(0.095, 0.22, mats.metal, machine, -0.65, 0.94, 0);
for (const [angle, length, width] of [
  [0, 0.35, 0.025],
  [1.8, 0.2, 0.018],
  [4.3, 0.27, 0.025],
]) {
  const stripe = cube(
    width,
    0.006,
    length,
    new THREE.MeshStandardMaterial({ color: "#655b70", roughness: 0.7 }),
    lap,
    Math.sin(angle) * 1.04,
    0.05,
    Math.cos(angle) * 1.04,
  );
  stripe.rotation.y = angle;
}
const marker = cube(0.012, 0.004, 0.95, mats.dark, lap, 0, 0.049, 0.7);
marker.material = marker.material.clone();
marker.material.transparent = true;
marker.material.opacity = 0.25;
marker.castShadow = false;
marker.receiveShadow = false;
const mastRig = new THREE.Group();
machine.add(mastRig);
cyl(0.26, 0.18, mats.dark, mastRig, 1.5, 0.55, 0);
cyl(0.18, 3.5, mats.metal, mastRig, 1.5, 2.3, 0);
cyl(0.23, 0.45, mats.metal, mastRig, 1.5, 3.7, 0);
for (let i = 0; i < 26; i++) cube(0.13, 0.008, 0.015, mats.dark, mastRig, 1.5, 0.8 + i * 0.11, 0.19);
cyl(0.12, 0.12, mats.brass, mastRig, 1.5, 4.08, 0);
cube(2.4, 0.02, 0.55, mats.dark, machine, 1.55, 0.45, 1.5);
for (const z of [1.3, 1.7]) cube(2.3, 0.012, 0.018, mats.metal, machine, 1.55, 0.467, z);
const guard = mesh(
  new THREE.CylinderGeometry(1.48, 1.48, 0.55, 64, 1, true, Math.PI * 0.5, Math.PI),
  new THREE.MeshPhysicalMaterial({
    color: "#cbd8d8",
    roughness: 0.12,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  }),
  machine,
  -0.65,
  1.02,
  0,
);
const lapNut = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.13, 6), mats.metal, machine, -0.65, 1.04, 0);
const carriage = new THREE.Group();
machine.add(carriage);
carriage.position.x = 1.5;
cube(0.55, 0.5, 0.52, mats.base, carriage, 0, 0, 0);
const knob = cyl(0.15, 0.15, mats.dark, carriage, 0.32, 0, 0);
knob.rotation.z = Math.PI / 2;
const pivot = new THREE.Group();
carriage.add(pivot);
pivot.position.x = -1.2;
pivot.position.z = 0.65;
const bridgeEnd = cube(0.18, 0.16, 0.8, mats.base, carriage, -1.2, 0, 0.3),
  bridge = cube(1, 0.12, 0.18, mats.metal, carriage, -0.6, 0, 0);
const dial = cyl(0.28, 0.12, mats.dark, pivot, 0, 0, 0.18);
dial.rotation.x = Math.PI / 2;
for (let i = 0; i < 36; i++) {
  const tick = cube(
    0.012,
    0.035,
    0.006,
    mats.metal,
    pivot,
    Math.sin((i * Math.PI) / 18) * 0.24,
    Math.cos((i * Math.PI) / 18) * 0.24,
    0.244,
  );
  tick.rotation.z = (-i * Math.PI) / 18;
}
cube(0.14, 0.48, 0.14, mats.base, pivot, 0, 0.02, 0.28);
cube(0.14, 0.48, 0.14, mats.base, pivot, 0, 0.02, -0.28);
const arm = new THREE.Group();
arm.userData.noCollide = true; // it swings across the bench; the apprentices' floor plan ignores it
pivot.add(arm);
cube(0.18, 0.48, 0.21, mats.dark, arm, 0, -0.18, 0);
cyl(0.035, 0.3, mats.metal, arm, 0, -0.5, 0);
cyl(0.1, 0.16, mats.brass, arm, 0, -0.48, 0);
const indexWheel = cyl(0.2, 0.065, mats.dark, arm, 0, -0.42, 0);
for (let i = 0; i < 96; i++) {
  const t = cube(
    0.006,
    0.07,
    0.018,
    mats.metal,
    indexWheel,
    Math.sin((i * Math.PI) / 48) * 0.19,
    0,
    Math.cos((i * Math.PI) / 48) * 0.19,
  );
  t.rotation.y = (i * Math.PI) / 48;
}
const stoneAssembly = new THREE.Group();
arm.add(stoneAssembly);
stoneAssembly.position.y = -1.75;
const dopShaft = cyl(0.018, 1, mats.brass, stoneAssembly, 0, 0.6, 0);
const dopEnd = cyl(0.02, 0.04, mats.brass, stoneAssembly, 0, 0.13, 0);
const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 1, 32), mats.wax);
stoneAssembly.add(wax);
wax.name = "cured-dop-adhesive";
wax.castShadow = true;
const gemFrame = new THREE.Group();
stoneAssembly.add(gemFrame);
const gemMat = new THREE.MeshPhysicalMaterial({
  color: stones[state.stone].color,
  metalness: 0,
  roughness: 0.6,
  transmission: 0.35,
  thickness: 1.2,
  ior: 1.52,
  clearcoat: 0.2,
  flatShading: true,
  envMapIntensity: 1.6,
});
const gem = new THREE.Mesh(new THREE.BufferGeometry(), gemMat);
gem.scale.setScalar(GEM_SCALE);
gem.castShadow = true;
gemFrame.add(gem);
const waterMount = new THREE.Group();
machine.add(waterMount);
waterMount.position.set(-1.75, 0, -1.25);
cyl(0.09, 3.2, mats.metal, waterMount, 0, 1.9, 0);
cyl(0.2, 0.12, mats.dark, waterMount, 0, 0.49, 0);
const reservoir = cyl(
  0.3,
  0.9,
  new THREE.MeshPhysicalMaterial({
    color: "#e9f1f1",
    transparent: true,
    opacity: 0.23,
    roughness: 0.12,
    side: THREE.DoubleSide,
  }),
  waterMount,
  0,
  3.25,
  0,
);
cyl(0.3, 0.08, mats.metal, waterMount, 0, 3.73, 0);
cyl(0.07, 0.12, mats.dark, waterMount, 0, 3.82, 0);
cyl(
  0.28,
  0.33,
  new THREE.MeshPhysicalMaterial({ color: "#e6d6aa", transparent: true, opacity: 0.3, roughness: 0.12 }),
  waterMount,
  0,
  2.99,
  0,
);
cyl(0.075, 0.12, mats.brass, waterMount, 0, 2.75, 0);
const tubeCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.75, 2.75, -1.25),
  new THREE.Vector3(-1.8, 2.2, -1.05),
  new THREE.Vector3(-1.6, 1.65, -0.45),
  new THREE.Vector3(-1.3, 1.45, -0.25),
]);
const waterArm = new THREE.Group();
waterArm.position.set(-1.75, 2.75, -1.25);
machine.add(waterArm);
const tubeMesh = mesh(new THREE.TubeGeometry(tubeCurve, 32, 0.022, 8, false), mats.metal, machine);
const tip = cyl(0.035, 0.1, mats.brass, machine, -1.3, 1.42, -0.25);
waterArm.attach(tubeMesh);
waterArm.attach(tip);
const dropGeo = new THREE.SphereGeometry(0.025, 12, 8),
  drops = [];
for (let i = 0; i < 5; i++)
  drops.push(
    mesh(
      dropGeo,
      new THREE.MeshPhysicalMaterial({
        color: "#bde8f4",
        transparent: true,
        opacity: 0.85,
        roughness: 0.08,
        metalness: 0.15,
      }),
      machine,
      -1.3,
      1.35 - i * 0.1,
      -0.25,
    ),
  );
// Two apprentices do the bench's hand work (see apprentice.js): one turns the dials, the other swaps stone and laps for the operator.
const apprentice = createApprentice({ THREE, GLTFLoader, scene, name: "apprentice-dial", home: [2.9, 2.1], stool: true, others: () => [[pusher.root.position.x, pusher.root.position.z]] });
const pusher = createApprentice({
  THREE, GLTFLoader, scene, name: "apprentice-pusher", model: "character-male-c.glb", home: [-3.3, 2.1],
  others: () => [[apprentice.root.position.x, apprentice.root.position.z]],
});
const operator = createOperator({
  scene,
  helper: pusher,
  arm,
  carriage,
  pivot,
  lap,
  waterArm,
  nut: lapNut,
  onSound: () => detent("lock"),
});
let openingStart = null,
  openingDone = false,
  entryAwaiting = true;
// Physical toggle, motor knob and name plate.
const switch3d = cube(0.17, 0.08, 0.24, mats.rubber, machine, 1.8, 0.49, 1.1);
const light3d = cyl(0.035, 0.01, new THREE.MeshBasicMaterial({ color: "#aa6d49" }), machine, 1.45, 0.45, 1.1);
cyl(0.15, 0.12, mats.dark, machine, 0.95, 0.5, 1.1);
const labelCanvas = document.createElement("canvas");
labelCanvas.width = 512;
labelCanvas.height = 128;
const lc = labelCanvas.getContext("2d");
lc.fillStyle = "#e4d0cc";
lc.fillRect(0, 0, 512, 128);
lc.fillStyle = "#755765";
lc.font = "36px sans-serif";
lc.fillText("tzg  01", 35, 58);
lc.font = "16px sans-serif";
lc.fillText("PRECISION FACETING INSTRUMENT", 35, 96);
const label = mesh(
  new THREE.PlaneGeometry(0.95, 0.24),
  new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(labelCanvas), roughness: 0.6 }),
  machine,
  -0.7,
  0.31,
  1.806,
);
const brushedCanvas = document.createElement("canvas");
brushedCanvas.width = 256;
brushedCanvas.height = 256;
const bx = brushedCanvas.getContext("2d");
bx.fillStyle = "#888";
bx.fillRect(0, 0, 256, 256);
for (let i = 0; i < 256; i++) {
  bx.fillStyle = i % 3 === 0 ? "#969696" : "#828282";
  bx.fillRect(0, i, 256, 1);
}
const brushedTexture = new THREE.CanvasTexture(brushedCanvas);
brushedTexture.wrapS = brushedTexture.wrapT = THREE.RepeatWrapping;
brushedTexture.repeat.set(2, 8);
mats.metal.bumpMap = brushedTexture;
mats.metal.bumpScale = 0.0007;
for (const z of [-0.27, 0.27])
  for (const y of [-0.16, 0.16]) {
    const screw = cyl(0.027, 0.012, mats.metal, carriage, 0.286, y, z);
    screw.rotation.z = Math.PI / 2;
  }
// Machined hardware: dark fasteners, steel column collars and a readable index wheel.
for (const z of [-1.3, 1.3])
  for (const x of [-1.5, 2.2]) {
    cyl(0.047, 0.015, mats.metal, machine, x, 0.445, z);
    const screw = cube(0.055, 0.003, 0.008, mats.rubber, machine, x, 0.454, z);
  }
for (const y of [0.68, 3.47]) cyl(0.193, 0.07, mats.metal, mastRig, 1.5, y, 0);
const gearCanvas = document.createElement("canvas");
gearCanvas.width = gearCanvas.height = 512;
const gx = gearCanvas.getContext("2d");
gx.fillStyle = "#292e31";
gx.fillRect(0, 0, 512, 512);
gx.translate(256, 256);
for (let i = 0; i < 96; i++) {
  gx.save();
  gx.rotate((i * Math.PI) / 48);
  gx.strokeStyle = "#dce0df";
  gx.lineWidth = i % 3 === 0 ? 3 : 1;
  gx.beginPath();
  gx.moveTo(0, -225);
  gx.lineTo(0, i % 3 === 0 ? -198 : -210);
  gx.stroke();
  if (i % 6 === 0) {
    gx.fillStyle = "#f2f0e9";
    gx.font = "22px sans-serif";
    gx.textAlign = "center";
    gx.fillText(String(i || 96), 0, -174);
  }
  gx.restore();
}
const gearTex = new THREE.CanvasTexture(gearCanvas);
gearTex.colorSpace = THREE.SRGBColorSpace;
const gearFace = mesh(
  new THREE.CircleGeometry(0.195, 96),
  new THREE.MeshStandardMaterial({ map: gearTex, roughness: 0.45, metalness: 0.35 }),
  indexWheel,
  0,
  0.034,
  0,
);
gearFace.rotation.x = -Math.PI / 2;
// One attached crystal: inspection lifts the same arm around its mechanical pivot.
function surfaceTexture(fine = false) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#8e8e8e";
  x.fillRect(0, 0, 256, 256);
  let seed = 731;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < (fine ? 170 : 450); i++) {
    const y = rand() * 256;
    x.strokeStyle = `rgba(255,255,255,${fine ? 0.09 : rand() * 0.25})`;
    x.lineWidth = fine ? 0.4 : 0.5 + rand();
    x.beginPath();
    x.moveTo(rand() * 40, y);
    x.lineTo(80 + rand() * 176, y + rand() * 4);
    x.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
const coarseTexture = surfaceTexture(),
  fineTexture = surfaceTexture(true),
  faceMaterials = [];
const rigMotion = settingsMotion(state);
let settingClickAt = 0;
const anglePointer = new THREE.Group();
pivot.add(anglePointer);
cube(0.018, 0.19, 0.012, mats.brass, anglePointer, 0, 0.1, 0.255);
const knobStripe = cube(0.008, 0.018, 0.23, mats.brass, knob, 0.078, 0, 0);
function updateRigPose() {
  const pose = rigMotion.value;
  const setting = (pose.angle * Math.PI) / 180,
    pivotX = -0.4 + ARM_LENGTH * Math.sin(setting);
  carriage.position.x = pivotX + 1.1;
  carriage.position.z = 1.5;
  mastRig.position.set(carriage.position.x - 1.5, 0, 1.5);
  pivot.position.set(-1.1, 0, -0.85);
  bridgeEnd.position.set(-1.1, 0, -0.425);
  bridgeEnd.scale.z = 0.85 / 0.8;
  bridge.position.set(-0.55, 0, 0);
  bridge.scale.x = 1.1;
  carriage.position.y = mastY(pose.height);
  arm.rotation.z = -headAngle;
  gemFrame.rotation.set(state.flip ? Math.PI : 0, (pose.index * Math.PI) / 48, 0);
  indexWheel.rotation.y = (pose.index * Math.PI) / 48;
  anglePointer.rotation.z = (-pose.angle * Math.PI) / 180;
  knob.rotation.y = pose.height * 0.75;
  const mount = dopDimensions(),
    attach = Math.max(...state.faces.flat().map((p) => (state.flip ? -p[1] : p[1]) * GEM_SCALE)),
    end = attach + mount.glue;
  dopShaft.position.y = (1.2 + end) / 2;
  dopShaft.scale.set(mount.radius / 0.018, Math.max(0.05, 1.2 - end), mount.radius / 0.018);
  dopEnd.position.y = end + 0.018;
  dopEnd.scale.set(mount.radius / 0.02, 0.9, mount.radius / 0.02);
  wax.position.y = attach + mount.glue / 2 - 0.002;
  wax.scale.set(mount.radius * 1.35, mount.glue, mount.radius * 1.35);
}
// Choose the dop from the planned stone size, keeping it stable throughout a cut.
function dopDimensions() {
  const points = fittedPlan(state.design, state.planScale || 1).faces.flat(),
    span = (k) => Math.max(...points.map((p) => p[k])) - Math.min(...points.map((p) => p[k])),
    width = Math.min(span(0), span(2)) * GEM_SCALE;
  const radius = THREE.MathUtils.clamp(width * 0.14, 0.025, 0.065);
  return { radius, glue: radius * 0.55 };
}
function rigContactReport() {
  scene.updateMatrixWorld(true);
  let minimum = Infinity,
    hits = [];
  carriage.traverse((o) => {
    if (!o.isMesh || o === gem || o.parent === gem) return;
    const points = o.geometry?.attributes?.position;
    if (!points) return;
    for (let i = 0; i < points.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(points, i).applyMatrix4(o.matrixWorld),
        r = Math.hypot(p.x + 0.65, p.z);
      const obstacle = r <= 1.3 ? LAP_Y : r >= 1.385 && r <= 1.535 ? 0.815 : null;
      if (obstacle !== null) {
        minimum = Math.min(minimum, p.y - obstacle);
        if (p.y < obstacle - 0.0001) {
          hits.push(o.name || o.geometry.type);
          break;
        }
      }
    }
  });
  return {
    hardwareClearance: Number.isFinite(minimum) ? minimum : null,
    hits: [...new Set(hits)],
    phase: batchTransition?.phase || "work",
    index: state.index,
    lastIndexClearance,
    indexChangeCount,
  };
}
function surfaceLevel(f) {
  return state.surfaces?.[normalKey(faceNormal(f))] || 0;
}
function facetMaterialIndex(f) {
  const level = surfaceLevel(f);
  if (level >= 2) return 2;
  if (level >= 1) return 1;
  const n = faceNormal(f),
    d = dot(n, f[0]),
    rawSupport = Math.max(...(state.originalFaces || state.faces).flat().map((p) => dot(n, p)));
  return rawSupport - d > 0.001 ? 3 : 0;
}
function gemstoneColor() {
  if ((state.materialId || "glass") === "glass")
    return (
      { first: 0x11bfc5, ring: 0xf0449d, firstgem: 0xffb52e }[state.courseId] ||
      [0x16c6b3, 0x399ef4, 0xf2b329, 0xef499e, 0x9863ee][Math.abs(state.seed || 0) % 5]
    );
  return material().color;
}
function rebuild() {
  const pos = [],
    uv = [],
    g = new THREE.BufferGeometry();
  if (!faceMaterials.length) {
    for (let stage = 0; stage < 4; stage++) {
      const m = gemMat.clone();
      m.roughness = [0.55, 0.1, 0.012, 0.26][stage];
      m.transmission = [0.06, 0.86, 1, 0.55][stage];
      m.thickness = [0.5, 0.6, 0.8, 0.6][stage];
      m.attenuationDistance = [0.9, 1.4, 2.2, 1.4][stage];
      m.dispersion = stage === 2 ? 1.2 : 0;
      m.specularIntensity = 1;
      m.clearcoat = stage === 2 ? 1 : stage === 3 ? 0.5 : 0.35;
      m.bumpMap = stage === 2 ? null : stage === 1 ? fineTexture : coarseTexture;
      m.bumpScale = stage === 1 ? 0.001 : stage === 3 ? 0.003 : 0.009;
      m.envMapIntensity = [1.2, 2, 2.8, 1.6][stage];
      faceMaterials.push(m);
    }
  }
  faceMaterials
    .filter((m) => m.color)
    .forEach((m) => {
      m.ior = material().ior;
      m.color.set(gemstoneColor()).lerp(new THREE.Color(0xffffff), 0.12);
      m.attenuationColor.set(gemstoneColor());
    });
  for (const f of state.faces) {
    const n = new THREE.Vector3(...faceNormal(f));
    const u = new THREE.Vector3()
        .crossVectors(Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0), n)
        .normalize(),
      v = new THREE.Vector3().crossVectors(n, u);
    const start = pos.length / 3;
    for (let i = 1; i < f.length - 1; i++)
      for (const p of [f[0], f[i], f[i + 1]]) {
        pos.push(...p);
        const vec = new THREE.Vector3(...p);
        uv.push(vec.dot(u) * 0.6, vec.dot(v) * 0.6);
      }
    const level = surfaceLevel(f);
    g.addGroup(start, pos.length / 3 - start, facetMaterialIndex(f));
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  gem.geometry.dispose();
  gem.geometry = g; // Polished facets use real transmission, so the lap and bench show through the stone; the gem gets its own bright studio reflections.
  const gemEnvironment = environmentTarget?.texture || null;
  faceMaterials.forEach((m) => {
    if (m.envMap !== gemEnvironment) {
      m.envMap = gemEnvironment;
      m.needsUpdate = true;
    }
  });
  gem.material = faceMaterials;
  bindOptics(gem);
}
function workSurface(normal, amount) {
  return advanceSurface(state, normal, state.lap, amount, isIntro(state));
}
rebuild();
function stop() {
  haptics.stop();
  cuttingFX.clear();
  hold = false;
  leverTravel = 0;
  pressure = 0.06;
  cutSoundUntil = 0;
  if (!state.power && audioContext)
    for (const node of [gain, motorOvertoneGain])
      if (node) {
        node.gain.cancelScheduledValues(audioContext.currentTime);
        node.gain.setTargetAtTime(0, audioContext.currentTime, 0.02);
      }
  if (noiseGain && audioContext) {
    noiseGain.gain.cancelScheduledValues(audioContext.currentTime);
    noiseGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.015);
  }
  $("#grind strong").textContent = "上下搬動拉桿";
}
function setupInspect(on) {
  if (hold || contact > 0.02 || focusLocked) return;
  stop();
  state.inspecting = on;
  if (on) {
    state.log.push({ type: "inspect" });
    state.inspectionCount = (state.inspectionCount || 0) + 1;
    inspectedStep = state.step;
    lessonEvent("inspect");
  }
  inspectionYaw = inspectionPitch = targetYaw = targetPitch = 0;
  returning = true;
  inspectDragging = false;
  machine.visible = true;
  controls.enabled = false;
  cameraTransition = true;
  $("#inspect").innerHTML = on ? "<span>↩</span> 放下切磨臂" : "<span>◈</span> 抬起檢查";
  $("#stageMode").textContent = on ? "抬臂 · 原位檢查" : "切磨工作台";
  $("#sceneHint").textContent = on ? "拖曳環繞觀察 · 放手回正" : "拖曳環繞觀察 · 雙指縮放";
  if (!on) setView("close");
  updateCoach();
}
// The view only changes by the player's own gestures: starting, stopping or inspecting never snaps the camera.
function setView(v) {
  if (state.inspecting && !hold && !focusLocked) setupInspect(false);
  view = v;
  cameraTransition = false;
}
let dragStart;
renderer.domElement.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" || !state.inspecting || focusLocked || hold) return;
  inspectDragging = true;
  returning = false;
  dragStart = { x: e.clientX, y: e.clientY, yaw: targetYaw, pitch: targetPitch };
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (!inspectDragging) return;
  targetYaw = dragStart.yaw + (e.clientX - dragStart.x) * 0.012;
  targetPitch = THREE.MathUtils.clamp(dragStart.pitch + (e.clientY - dragStart.y) * 0.008, -0.35, 1.0);
});
function releaseInspect() {
  inspectDragging = false;
  returning = true;
  targetYaw = targetPitch = 0;
}
renderer.domElement.addEventListener("pointerup", releaseInspect);
renderer.domElement.addEventListener("pointercancel", releaseInspect);
// Before play starts: the fixed entry view, then the opening fly-in.
function openingCamera() {
  if (entryAwaiting) {
    camera.position.set(-5.5, 6.8, 12.8);
    controls.target.set(0.4, 1.5, 0.45);
    camera.lookAt(controls.target);
    return;
  }
  if (!openingDone) {
    if (openingStart === null) openingStart = performance.now();
    const t = Math.min(1, (performance.now() - openingStart) / 6500);
    document.body.classList.add("cinematic");
    if (t < 0.68) {
      const u = t / 0.68,
        a = -0.95 + u * 0.65;
      camera.position.set(0.4 + Math.sin(a) * 14, 8, 0.45 + Math.cos(a) * 14);
      controls.target.set(0.4, 1.5, 0.45);
    } else {
      const u = (t - 0.68) / 0.32,
        e = u * u * (3 - 2 * u);
      camera.position.lerpVectors(
        new THREE.Vector3(0.4 + Math.sin(-0.3) * 14, 8, 0.45 + Math.cos(-0.3) * 14),
        new THREE.Vector3(-3.6, 6, 11.8),
        e,
      );
      controls.target.set(0.4, 1.5 + 0.2 * e, 0.45);
    }
    camera.lookAt(controls.target);
    if (t >= 1) {
      openingDone = true;
      document.body.classList.remove("cinematic");
    }
    return;
  }
}
let audioContext,
  osc,
  gain,
  noiseGain,
  noiseFilter,
  motorOvertone,
  motorOvertoneGain,
  lastDetent = 0;
function sound() {
  try {
    if (!audioContext) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw Error("此瀏覽器不支援聲音");
      audioContext = new AC();
      osc = audioContext.createOscillator();
      gain = audioContext.createGain();
      osc.type = "sine";
      osc.connect(gain).connect(audioContext.destination);
      gain.gain.value = 0;
      osc.start();
      motorOvertone = audioContext.createOscillator();
      motorOvertone.type = "sine";
      motorOvertoneGain = audioContext.createGain();
      motorOvertoneGain.gain.value = 0;
      motorOvertone.connect(motorOvertoneGain).connect(audioContext.destination);
      motorOvertone.start();
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate),
        data = buffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0;
      for (let i = 0; i < data.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        data[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
      }
      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noiseFilter = audioContext.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 650;
      noiseFilter.Q.value = 0.35;
      noiseGain = audioContext.createGain();
      noiseGain.gain.value = 0;
      noise.connect(noiseFilter).connect(noiseGain).connect(audioContext.destination);
      noise.start();
    }
    audioContext
      .resume()
      .then(() => {
        audioError = "";
        updateAudioLabel();
      })
      .catch(() => {
        audioError = "聲音暫不可用";
        updateAudioLabel();
      });
  } catch (e) {
    audioError = "此瀏覽器無法啟動聲音";
    updateAudioLabel();
  }
}
// Short mechanical detents; rate limited so dragging never becomes a continuous squeal.
function detent(kind = "turn") {
  if (audioMuted || !audioContext || audioContext.state !== "running") return;
  const t = audioContext.currentTime;
  if (t - lastDetent < 0.045) return;
  lastDetent = t;
  const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * 0.035), audioContext.sampleRate),
    d = buffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioContext.sampleRate * 0.005));
  const click = audioContext.createBufferSource(),
    filter = audioContext.createBiquadFilter(),
    g = audioContext.createGain();
  click.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = kind === "index" ? 1600 : 900;
  filter.Q.value = 0.7;
  g.gain.value = kind === "lock" ? 0.14 : 0.08;
  click.connect(filter).connect(g).connect(audioContext.destination);
  click.start(t);
  click.onended = () => {
    click.disconnect();
    filter.disconnect();
    g.disconnect();
  };
  const o = audioContext.createOscillator(),
    body = audioContext.createGain();
  o.frequency.setValueAtTime(kind === "lock" ? 190 : 250, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.025);
  body.gain.setValueAtTime(kind === "lock" ? 0.06 : 0.025, t);
  body.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  o.connect(body).connect(audioContext.destination);
  o.start(t);
  o.stop(t + 0.04);
  o.onended = () => {
    o.disconnect();
    body.disconnect();
  };
}
function updateAudioLabel() {
  $("#audioToggle").textContent = audioError || (audioMuted ? "聲音關閉" : "聲音開啟");
  $("#audioToggle").setAttribute("aria-pressed", !audioMuted);
}

$("#power").onclick = () => {
  if (operator.busy) return;
  detent("lock");
  state.power = !state.power;
  if (!state.power) {
    stop();
    if (audioContext)
      for (const node of [gain, noiseGain, motorOvertoneGain])
        if (node) {
          node.gain.cancelScheduledValues(audioContext.currentTime);
          node.gain.setTargetAtTime(0, audioContext.currentTime, 0.02);
        }
  }
  sound();
  updateUI();
};
$("#water").onclick = () => {
  detent("turn");
  state.water = !state.water;
  updateUI();
};
$("#lock").onclick = () => {
  if (hold || contact > 0.02) {
    toast("等切磨臂完全抬起，再鬆鎖。");
    return;
  }
  detent("lock");
  state.locked = !state.locked;
  if (state.locked) lessonEvent("angleLock");
  updateUI();
};
let indexClickQueue = 0,
  indexClickTimer = 0;
function indexDetent(steps = 1) {
  indexClickQueue = Math.min(24, indexClickQueue + Math.max(1, steps));
  if (indexClickTimer) return;
  const tick = () => {
    if (!indexClickQueue) {
      indexClickTimer = 0;
      return;
    }
    indexClickQueue--;
    detent("index");
    indexClickTimer = setTimeout(tick, indexClickQueue ? 52 : 0);
  };
  tick();
}
function change(key, value) {
  if (operator.busy || !openingDone) return;
  if (hold || contact > 0.02) {
    toast("先抬起切磨臂，再調整機台。");
    updateUI();
    return;
  }
  const limits = { angle: [0, 90], index: [0, 95], height: [45, 205] };
  if (!Number.isFinite(value)) {
    updateUI();
    return;
  }
  const previous = state[key];
  if (key === "angle") {
    if (isIntro(state)) {
      state.angle = state.angleDrive = Math.max(0, Math.min(90, Math.round(value)));
    } else {
      const delta = value - state.angle;
      Object.assign(
        state,
        turnAngle(state.angle, delta, Number.isFinite(state.angleDrive) ? state.angleDrive : state.angle),
      );
    }
  } else
    state[key] =
      key === "index"
        ? ((Math.round(value) % 96) + 96) % 96
        : Math.min(limits[key][1], Math.max(limits[key][0], value));
  if (state[key] !== previous) {
    operator.turn(key);
    if (key === "index") {
      const steps = Math.abs(((state.index - previous + 144) % 96) - 48);
      indexDetent(steps);
    } else detent("turn");
    if (key === "angle" || key === "index") lessonEvent(key);
  }
  updateUI();
  persist();
}
function updateGuide() {
  const s = sequence()[state.step];
  $(".guide-drawing").innerHTML = blueprintSVG();
  $("#guideTitle").textContent = `${s.stage} · ${s.part} ${s.id}`;
  $("#guideTarget").textContent =
    `${s.angle.toFixed(1)}° ／ 分度 ${String(s.index).padStart(2, "0")} ／ ${s.flip ? "翻面後" : "初始方向"} ／ 高度參考 ${s.targetHeight.toFixed(1)} mm`;
  const advice = [];
  if (state.flip !== s.flip) advice.push("先關機並轉接至圖紙方向");
  if (indicatedAngle(state.angle) !== s.angle) advice.push("鬆鎖、手轉旋鈕，觀察角度刻度");
  if (state.index !== s.index) advice.push("手動轉到指定分度");
  if (!state.locked) advice.push("試磨前鎖定角度");
  if (state.lap !== s.lap)
    advice.push(`關機後換${s.stage === "粗磨" ? "粗磨 #600" : s.stage === "細磨" ? "細磨 #3000" : "拋光盤"}`);
  $("#guideAdvice").textContent = (advice.length ? advice.join(" → ") + "。" : "") + s.inspect;
  $("#guidePrev").disabled = state.step === 0;
  $("#guideNext").disabled = state.step === sequence().length - 1;
}
$$("[data-adjust]").forEach(
  (b) =>
    (b.onclick = () => {
      const [k, v] = b.dataset.adjust.split(":");
      change(
        k,
        state[k] + (k === "angle" ? Math.sign(Number(v)) * (isIntro(state) ? 1 : fineAdjust ? 0.02 : 0.5) : Number(v)),
      );
    }),
);
["angle", "index", "height"].forEach((k) => ($("#" + k).onchange = (e) => change(k, Number(e.target.value))));
$("#rpm").onchange = (e) => {
  state.rpm = +e.target.value;
  detent("turn");
};
$("#lap").onchange = (e) => {
  if (state.power || motorSpeed > 10) {
    toast("換盤前請先關閉馬達。");
    e.target.value = state.lap;
    return;
  }
  const next = e.target.value;
  if (next === state.lap || operator.busy) return;
  e.target.value = state.lap;
  stop();
  closeSheets();
  operator.swap(state.lap, next, () => {
    state.lap = next;
    updateUI();
    updateLapAppearance();
    persist();
  });
  updateCoach();
};
$("#transfer").onclick = () => {
  if (operator.busy) return;
  if (state.power || motorSpeed > 10) {
    toast("先關機，等待磨盤停轉");
    return;
  }
  stop();
  closeSheets();
  state.inspecting = true;
  const next = !state.flip;
  operator.transfer(gemFrame, state.flip, next, () => {
    state.flip = next;
    state.log.push({ type: "transfer", flip: next, t: Date.now() });
    updateUI();
    persist();
  });
};
function leverStroke() {
  return 80;
}
let startY = 0;
function beginGrinding(e) {
  e.preventDefault();
  if (!openingDone || operator.busy || rigMotion.active || targetAcceptedRun !== state.runId) return;
  if (autoBatchRun || autoIntroRun) {
    autoBatchRun = false;
    autoIntroRun = false;
    autoIntroNext = null;
    pendingInspection = true;
    stop();
    return;
  }
  if (renderRecovery.lost.size) return;
  if (focusLocked && !hold) return;
  if (state.batchPause) {
    updateCoach();
    return;
  }
  if (guidedToolTask()) {
    updateCoach();
    return;
  }
  if (easyLesson()) {
    assistIntro();
    if (operator.busy) return;
    if (!state.power) {
      sound();
      state.power = true;
      updateUI();
    }
  }
  if (!validatePractice()) return;
  pendingInspection = false;
  if (state.inspecting) setupInspect(false);
  if (!state.power) {
    toast("請先開啟主軸馬達。");
    return;
  }
  if (!state.water && state.lap !== "polish") {
    toast("請開啟滴水供應，保持濕磨。");
    return;
  }
  sound();
  setView("close");
  const supported = supportedAngle(
    state.faces,
    (state.angle * Math.PI) / 180,
    mastY(state.height),
    state.index,
    state.flip,
  );
  const centerY = mastY(state.height) - 1.75 * Math.cos(supported);
  grindFocus = new THREE.Vector3(
    -0.4 + ARM_LENGTH * Math.sin((state.angle * Math.PI) / 180) - ARM_LENGTH * Math.sin(supported),
    (Math.max(centerY, LAP_Y + 0.22) + LAP_Y) / 2,
    0.65,
  );
  grindZoom = Math.max(1, (centerY - LAP_Y + 0.75) / 1.15);
  if (isIntro(state))
    grindZoom = Math.max(
      grindZoom,
      (((Math.max(...state.faces.flat().map((p) => Math.hypot(...p))) * GEM_SCALE) /
        (Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect))) *
        1.15) /
        2.1,
    );
  hold = true;
  leverPointerActive = true;
  leverTravel = 0;
  leverSpeed = 0;
  impactPending = 0;
  contactFelt = false;
  lockFocus();
  startY = leverLastY = e.clientY;
  leverLastTime = e.timeStamp;
  pressure = 0.06;
  if (e.pointerId !== undefined) e.currentTarget.setPointerCapture(e.pointerId);
  $("#grind strong").textContent = "慢慢下放";
}
$("#grind").addEventListener("pointerdown", beginGrinding);
function moveGrinding(e) {
  if (!hold) return;
  e.preventDefault();
  if (heldAutoAvailable()) {
    const r = $("#coachAction").getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      $("#coachAction").click();
      return;
    }
  }
  const dy = e.clientY - leverLastY,
    elapsed = Math.max(8, e.timeStamp - leverLastTime);
  leverSpeed = Math.max(0, dy / leverStroke() / (elapsed / 1000));
  if (
    ["challenge", "exam", "contest"].includes(state.mode) &&
    state.lap === "cut" &&
    leverTravel >= 1 &&
    contactFelt &&
    contact > 0.96 &&
    dy > 0
  ) {
    state.height = Math.max(45, state.height - dy * 0.01);
    $("#height").value = state.height.toFixed(2);
  }
  const before = leverTravel;
  leverTravel = THREE.MathUtils.clamp(leverTravel + dy / leverStroke(), 0, 1.5);
  if (before < 0.76 && leverTravel >= 0.76) impactPending = Math.min(12, leverSpeed);
  if (leverTravel < 0.6) impactPending = 0;
  leverLastY = e.clientY;
  leverLastTime = e.timeStamp;
  pressure = leverResponse(leverTravel).pressure;
  if (autoArmed && !armedAdvance && leverTravel >= 1) {
    autoArmed = false;
    autoIntroRun = isIntro(state);
    autoBatchRun = compactCourse();
    autoFacetStart = performance.now();
  }
  if (contactFelt && leverTravel < 0.08) {
    pendingInspection = true;
    releaseGrinding();
  }
}
$("#grind").addEventListener("pointermove", moveGrinding);
function releaseGrinding() {
  const wasAuto = autoBatchRun || autoIntroRun || autoIntroNext !== null;
  if (wasAuto) {
    autoArmed = true;
    armedAdvance = autoIntroNext !== null;
  }
  autoIntroRun = false;
  autoIntroNext = null;
  autoBatchRun = false;
  leverPointerActive = false;
  if ((hold && contactFelt) || wasAuto) pendingInspection = true;
  stop();
  updateCoach();
}
["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => $("#grind").addEventListener(ev, releaseGrinding));
window.addEventListener("blur", () => {
  autoBatchRun = false;
  autoIntroRun = false;
  autoIntroNext = null;
  leverPointerActive = false;
  state.power = false;
  stop();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    leverPointerActive = false;
    state.power = false;
    stop();
    updateUI();
    persist();
  }
});
$("#inspect").onclick = () => setupInspect(!state.inspecting);
$("#resetView").onclick = () => (state.inspecting ? (targetYaw = targetPitch = 0) : setView("work"));
function facetReady() {
  if (compactCourse()) return Boolean(state.batchDone);
  if (isIntro(state)) return introStageReady(state);
  const s = sequence()[state.step];
  if (!s) return false;
  const worked = state.log.some((e) => ["cut", "surface"].includes(e.type) && e.step === state.step);
  if (!worked) return false;
  if (s.lap === "cut") return Math.abs(Math.max(...state.faces.flat().map((v) => dot(v, s.normal))) - s.d) < 0.012;
  const faces = state.faces.filter((f) => dot(faceNormal(f), s.normal) > 0.999);
  return (
    faces.length > 0 &&
    Math.abs(Math.max(...state.faces.flat().map((v) => dot(v, s.normal))) - s.d) < 0.012 &&
    Math.max(...faces.map(surfaceLevel)) >= (s.lap === "fine" ? 1.75 : 2.8)
  );
}
function currentStepWorked() {
  if (state.mode === "course") return facetReady();
  if (isIntro(state)) return introStageReady(state);
  const s = sequence()[state.step];
  return state.log.some(
    (e) =>
      ["cut", "surface"].includes(e.type) &&
      (e.step === state.step ||
        (e.step === undefined &&
          e.lap === s.lap &&
          e.index === s.index &&
          e.flip === s.flip &&
          Math.abs(e.angle - s.angle) < 0.15)),
  );
}
$("#prevStep").onclick = () => showPlan(state.design, Math.max(0, state.step - 1));
$("#nextStep").onclick = () => {
  if (hold || !currentStepWorked()) {
    toast("先磨完這一面");
    return;
  }
  if (inspectedStep !== state.step) {
    toast("先抬起檢查");
    setupInspect(true);
    return;
  }
  state.step = Math.min(sequence().length - 1, state.step + 1);
  if (compactCourse()) {
    state.batchFacet = 0;
    state.batchTime = 0;
    state.batchDone = false;
    state.batchPause = false;
    state.batchNext = null;
    autoBatchRun = false;
    assistBatch();
  } else if (isIntro(state)) assistIntro();
  inspectedStep = -1;
  updateUI();
  persist();
};
function modal(html) {
  autoArmed = armedAdvance = false;
  autoBatchRun = false;
  autoIntroRun = false;
  autoIntroNext = null;
  viewerDispose?.();
  state.power = false;
  stop();
  $("#modalContent").innerHTML = html;
  $("#modal").showModal();
}
$("#closeModal").onclick = () => $("#modal").close();
$("#modal").addEventListener("click", (e) => {
  if (e.target === $("#modal")) $("#modal").close();
});
function blueModal() {
  if (state.mode === "course") {
    modal(
      `<h2>${courses.find((c) => c.id === state.courseId)?.name || "入門練習"}</h2><div class="intro-steps">${sequence()
        .map((s, i) => `<div class="${i === state.step ? "active" : ""}"><b>${i + 1}</b><span>${s.part}</span></div>`)
        .join("")}</div><p>照順序完成，磨好再換下一步。</p><button id="introBack" class="primary full">繼續</button>`,
    );
    $("#introBack").onclick = () => $("#modal").close();
    return;
  }
  showPlan(state.design, state.step);
}
function showPlan(id, step = 0, projection) {
  if (specialistPlans[id]) return academy();
  const p = fittedPlan(id, id === state.design ? state.planScale || 1 : 1),
    s = p.sequence[step];
  projection ||= s.flip ? "crown" : "pavilion";
  modal(
    `<h2>${p.family}</h2><div class="plan-view-tabs">${[
      ["crown", "上面"],
      ["pavilion", "底面"],
      ["side", "側面"],
    ]
      .map(([v, n]) => `<button data-projection="${v}" class="${projection === v ? "selected" : ""}">${n}</button>`)
      .join(
        "",
      )}</div><div class="plan-drawing">${planSVG(id, step, projection)}</div><div class="plan-step-head"><button id="planPrev" ${step === 0 ? "disabled" : ""}>←</button><strong>${step + 1} / ${p.sequence.length}</strong><button id="planNext" ${step === p.sequence.length - 1 ? "disabled" : ""}>→</button></div><div class="plan-values"><div><small>角度</small><b>${s.angle.toFixed(1)}°</b></div><div><small>轉向</small><b>${s.index}</b></div><div><small>高度</small><b>${["exam", "challenge", "contest"].includes(state.mode) ? "—" : s.targetHeight.toFixed(2) + "<em> mm</em>"}</b></div><div><small>磨盤</small><b>${s.stage}</b></div></div><div class="modal-actions"><button class="primary" id="adoptPlan">${id === state.design ? (state.step === 0 ? "開始第一面" : "繼續製作") : "從第一面開始"}</button></div><details class="plan-all"><summary>全部步驟</summary><div class="plan-table-wrap"><table><thead><tr><th>面</th><th>磨盤</th><th>角度</th><th>轉向</th><th></th></tr></thead><tbody>${p.sequence.map((r, i) => `<tr><td>${i + 1}</td><td>${r.stage}</td><td>${r.angle.toFixed(1)}°</td><td>${r.index}</td><td><button data-plan-step="${i}">查看</button></td></tr>`).join("")}</tbody></table></div></details>`,
  );
  $$("[data-projection]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#modal").close();
        showPlan(id, step, b.dataset.projection);
      }),
  );
  $("#planPrev").onclick = () => {
    $("#modal").close();
    showPlan(id, step - 1, projection);
  };
  $("#planNext").onclick = () => {
    $("#modal").close();
    showPlan(id, step + 1, projection);
  };
  $$("[data-plan-step]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#modal").close();
        showPlan(id, +b.dataset.planStep, projection);
      }),
  );
  $("#adoptPlan").onclick = () => {
    if (state.mode === "exam" && state.design !== id) {
      toast("考試開始後不能更換圖紙，請重考重新規劃。");
      return;
    }
    if (state.design !== id) {
      state.design = id;
      state.step = 0;
    }
    state.planVersion = 2;
    coachSeen = true;
    inspectedStep = -1;
    updateUI();
    persist();
    $("#modal").close();
    $("#mobileSettings").click();
  };
}
function showCraft(id, step = 0) {
  const p = specialistPlans[id],
    s = p.steps[step];
  modal(
    `<h2>${id === "cabochon" ? "弧面" : "凹雕"}</h2><div class="craft-diagram">${cutIcon(id)}</div><div class="plan-step-head"><button id="craftPrev" ${step === 0 ? "disabled" : ""}>←</button><strong>${step + 1} / ${p.steps.length}</strong><button id="craftNext" ${step === p.steps.length - 1 ? "disabled" : ""}>→</button></div><p>${(id === "cabochon" ? ["看原石，選方向。", "沿外圈修形。", "從邊緣往中央磨。", "細磨，去除刮痕。", "輕磨拋光。", "轉動檢查。"] : ["畫出葉形。", "磨出淺槽。", "少量加深。", "修整邊緣。", "局部拋光。", "檢查厚度。"])[step]}</p><button class="primary full" id="startCraft">開始</button>`,
  );
  $("#startCraft").onclick = () => craftStudio(id);
  $("#craftPrev").onclick = () => {
    $("#modal").close();
    showCraft(id, step - 1);
  };
  $("#craftNext").onclick = () => {
    $("#modal").close();
    showCraft(id, step + 1);
  };
}
$("#blueprintBtn").onclick = blueModal;
$("#designSelect").onchange = (e) => {
  state.design = e.target.value;
  state.step = 0;
  state.planVersion = 2;
  coachSeen = false;
  inspectedStep = -1;
  updateUI();
  persist();
  blueModal();
};
function chooseStone() {
  modal(
    `<span class="modal-eyebrow">THE ROUGH ROOM / 入門材料</span><h2>每一塊石頭，都有自己的可能。</h2><p>挑選一塊低成本練習玻璃，先練習讀圖與下壓手感。開始新作品前會把目前工作收入珠寶盒。</p><div class="stone-grid">${stones.map((s, i) => `<button class="stone-card" data-stone="${i}"><div class="crystal" style="color:${s.css}">⬡</div><b>${s.name}玻璃</b><small>${s.shape}<br>${s.weight.toFixed(2)} ct · 入門</small></button>`).join("")}</div><p class="modal-note">切型庫依入門、熟練、進階擴充。天然水晶、彩色寶石與鑽石材料尚未解鎖實作；不以換色代替材料物理。</p>`,
  );
  $$("[data-stone]").forEach(
    (b) =>
      (b.onclick = () => {
        if (state.log.length) savePiece(true);
        state.stone = +b.dataset.stone;
        state.seed = stones[state.stone].seed + Math.floor(Math.random() * 10000);
        state.faces = rough(state.seed);
        state.finish = {};
        state.log = [];
        state.touched = [];
        state.step = 0;
        state.flip = false;
        state.power = false;
        state.height = 120.8;
        state.machineVersion = 2;
        state.surfaces = {};
        initialVolume = volume(state.originalFaces || rough(state.seed));
        setupInspect(false);
        rebuild();
        updateUI();
        persist();
        $("#modal").close();
        blueModal();
      }),
  );
}
$("#stoneBtn").onclick = chooseStone;
$("#newBtn").onclick = chooseStone;
$("#worktab").onclick = () => {
  if ($("#modal").open) $("#modal").close();
};
function evaluate() {
  return grade(state);
}
function thumbnail() {
  const showcase = $("#resultViewer canvas");
  if (showcase) return showcase.toDataURL("image/jpeg", 0.7);
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL("image/jpeg", 0.7);
}
function savePiece(wip = false) {
  const ev = evaluate();
  const entry = {
    id: Date.now(),
    name: (state.materialId ? material().name : stones[state.stone].name) + " · " + designs[state.design].family,
    date: new Date().toISOString(),
    wip,
    ev,
    state: JSON.parse(JSON.stringify({ ...state, power: false, inspecting: false })),
    image: thumbnail(),
  };
  vault.unshift(entry);
  persist();
  return entry;
}
$("#finish").onclick = () => {
  const ev = evaluate();
  setupInspect(true);
  modal(
    `<span class="modal-eyebrow">WORKSHOP APPRAISAL</span><h2>${ev.rating}</h2><p>目前作品的初步加工評估。可繼續修整，或將此刻的作品收進珠寶盒。</p><div class="result-stats"><div><strong>${ev.weight.toFixed(2)}</strong><small>成品重量 ct</small></div><div><strong>${(ev.ratio * 100).toFixed(1)}%</strong><small>保留重量</small></div><div><strong>${ev.value}</strong><small>遊戲估值 G</small></div></div><p>符合初步角度、深度與磨盤紀錄的步驟 ${ev.completed} / ${ev.total}。${ev.completed < ev.total ? "仍有未加工的刻面，尚未完成圖紙。" : "請逐面檢查對稱與交會點。"}</p><p class="modal-note">原型評估依保重、加工角度覆蓋與表面加工紀錄計算，尚非競賽級切工鑑定，也不是市場價格。</p><div class="modal-actions"><button class="primary" id="saveResult">收入珠寶盒</button><button class="outline" id="continueWork">繼續加工</button></div>`,
  );
  $("#saveResult").onclick = () => {
    savePiece();
    $("#modal").close();
    toast(storageOK ? "作品已保存在這個瀏覽器。" : "保存失敗，請使用收藏庫匯出備份。");
  };
  $("#continueWork").onclick = () => {
    $("#modal").close();
    setupInspect(false);
  };
};
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function shareCard(entry) {
  const c = document.createElement("canvas");
  c.width = 1000;
  c.height = 1150;
  const x = c.getContext("2d");
  x.fillStyle = "#faf6f4";
  x.fillRect(0, 0, 1000, 1150);
  x.fillStyle = "#77506f";
  x.font = "36px sans-serif";
  x.fillText("tzg珠寶切磨工坊", 70, 95);
  const img = new Image();
  img.src = entry.image;
  await img.decode();
  x.drawImage(img, 70, 145, 860, 640);
  x.font = "32px sans-serif";
  x.fillText(entry.name, 70, 865);
  x.font = "24px sans-serif";
  x.fillText(`${entry.ev.weight.toFixed(2)} ct   ·   ${entry.ev.rating}`, 70, 923);
  x.fillText(`遊戲估值 ${entry.ev.value} G`, 70, 970);
  x.fillStyle = "#9c7b92";
  x.font = "18px sans-serif";
  x.fillText("親手切磨，讓光從石頭裡出現。", 70, 1080);
  c.toBlob(async (blob) => {
    const file = new File([blob], "facet-gem.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: entry.name });
      } catch (e) {
        if (e.name !== "AbortError") download(blob, "facet-gem.png");
      }
    } else download(blob, "facet-gem.png");
  });
}
function vaultModal() {
  academy();
}
$("#vaultBtn").onclick = academy;
function help() {
  if (easyLesson()) {
    modal("<h2>下拉磨，放手看</h2><p>從右側手勢提示往下滑動。放手抬起，再滑就繼續磨。</p>");
    return;
  }
  modal(
    `<h2>調整、觀察、輕磨</h2><ol class="checklist"><li>左右滑動設定頁，拖曳或輸入數值。</li><li>看金色輪廓，確認正在磨哪一面。</li><li>下拉研磨，放手抬起，再觀察交點。</li></ol><p>調好後，下拉研磨，放手觀察。</p><button class="primary" id="startPractice">開始這一面</button>`,
  );
  $("#startPractice").onclick = () => {
    $("#modal").close();
    coachSeen = true;
    guidePanel(["設定"]);
  };
}

$("#helpBtn").onclick = help;
$("#aboutBtn").onclick = () => modal(`<h2>tzg珠寶切磨工坊</h2><p>寶石切磨遊戲</p><p>圖紙與物理為遊戲模擬。</p>`);
const resize = () => {
  const { width, height } = viewport.getBoundingClientRect();
  if (width < 1 || height < 1) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = width < 500 ? 50 : 34;
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(viewport);
let prev = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  runFrameTasks(now);
  if (renderRecovery.lost.size) {
    prev = now;
    return;
  }
  const dt = Math.min((now - prev) / 1000, 1);
  prev = now;
  ticks++;
  const facesBefore = state.faces,
    surfaceBefore = Object.values(state.surfaces || {}).reduce((a, b) => a + b, 0);
  const lever = leverResponse(leverTravel);
  contact = THREE.MathUtils.damp(
    contact,
    hold && !batchTransition && !rigMotion.active ? lever.contact : 0,
    hold ? (contact > 0.8 ? 12 : 22) : 16,
    dt,
  );
  $("#grind").style.setProperty("--lever-y", `${Math.min(1, lever.handle) * leverStroke()}px`);
  $("#grind").classList.toggle("loaded", hold && contactFelt && leverTravel >= 0.76);
  $("#grind").classList.toggle("hand-moving", hold);
  $("#grind").style.setProperty("--hand-travel", `${Math.min(1, contact) * 65}px`);
  if ($(".hand-hint>span"))
    $(".hand-hint>span").textContent = hold
      ? contactFelt
        ? state.mode === "course" && facetReady()
          ? "已到位"
          : now < cutSoundUntil
            ? "研磨中"
            : "已接觸"
        : "再往下一點"
      : matchMedia("(pointer:fine)").matches
        ? "按住下拖"
        : "往下壓";
  if (compactCourse() && !rigMotion.active) tickBatch(dt, now);
  const wasAdjusting = rigMotion.active;
  rigMotion.update(state, dt, openingDone && !entryAwaiting);
  if (rigMotion.active && now - settingClickAt > 90) {
    settingClickAt = now;
    detent(rigMotion.changed.includes("index") ? "index" : "turn");
  }
  if (wasAdjusting && !rigMotion.active) detent("lock");
  const a = THREE.MathUtils.degToRad(state.angle);
  carriage.position.y = mastY(state.height);
  const restAngle = Math.max(
    a + 0.55,
    supportedAngle(state.faces, a, carriage.position.y, state.index, state.flip) + 0.25,
  );
  // A stone flip swings the dop stick down to where the apprentice can reach it; other jobs lift it out of the way.
  const lowered = operator.kind === "transfer" ? (serviceAngle ??= stickServiceAngle()) : (serviceAngle = null);
  const requested =
    state.inspecting || operator.busy || (rigMotion.active && !hold)
      ? (lowered ?? Math.PI - 0.1)
      : hold && (rigMotion.active || (contactFelt && leverTravel >= 1))
        ? THREE.MathUtils.degToRad(rigMotion.value.angle)
        : THREE.MathUtils.lerp(restAngle, a, contact);
  headAngle =
    hold && contact > 0.96 && !batchTransition && !rigMotion.active
      ? a
      : THREE.MathUtils.damp(headAngle, requested, hold ? 16 : 9, dt);
  const feedY = mastY(rigMotion.value.height);
  headAngle = supportedAngle(state.faces, headAngle, feedY, rigMotion.value.index, state.flip);
  updateRigPose();
  switch3d.rotation.x = state.power ? -0.2 : 0.2;
  light3d.material.color.set(state.power ? "#85b48a" : "#aa6d49");
  motorSpeed = THREE.MathUtils.damp(motorSpeed, state.power ? state.rpm : 0, 2.8, dt);
  lap.rotation.y += (motorSpeed / 60) * Math.PI * 2 * dt;
  drops.forEach((d, i) => {
    d.visible = state.water && state.power && !operator.busy;
    d.position.y = 1.37 - ((now * (state.lap === "polish" ? 0.00028 : 0.00065) + i * 0.105) % 0.5);
    d.scale.set(1, 1.5, 1);
  });
  let cutting = false;
  if (
    !compactCourse() &&
    hold &&
    state.power &&
    contact > 0.96 &&
    !state.inspecting &&
    !(state.mode === "course" && facetReady()) &&
    now - lastCut > 85
  ) {
    lastCut = now;
    scene.updateMatrixWorld(true);
    const q = gem.getWorldQuaternion(new THREE.Quaternion()),
      center = gem.getWorldPosition(new THREE.Vector3());
    const n = new THREE.Vector3(0, -1, 0).applyQuaternion(q.clone().invert());
    const normal = n.toArray(),
      threshold = (center.y - lapY) / GEM_SCALE,
      max = Math.max(...state.faces.flat().map((v) => dot(v, normal)));
    const radial = Math.hypot(center.x + 0.65, center.z),
      stopGap = lowestY(state.faces, a, mastY(state.height), state.index, state.flip) - lapY;
    let impactApplied = false;
    lastContactInfo = { supported: Math.abs(max - threshold) < 0.02, stopGap, radial };
    if (radial > 0.38 && radial < 1.26 && Math.abs(max - threshold) < 0.035 && !contactFelt) {
      contactFelt = true;
      detent("turn");
      if (impactPending > 2.2 && !easyLesson()) {
        const hit = impactChip(state.faces, normal, impactPending);
        if (hit) {
          cuttingFX.emit(new THREE.Vector3(center.x, lapY, center.z), pressure, true);
          impactApplied = true;
          state.faces = hit.faces;
          state.log.push({
            type: "impact",
            mechanicsVersion: 2,
            step: state.step,
            angle: state.angle,
            index: state.index,
            height: state.height,
            flip: state.flip,
            n: normal,
            speed: impactPending,
          });
          state.damageCount = (state.damageCount || 0) + 1;
          inspectedStep = -1;
          rebuild();
          updateWeight();
          $("#grind").classList.add("impact");
          setTimeout(() => $("#grind").classList.remove("impact"), 350);
          toast("碰撞崩角");
        }
      }
      impactPending = 0;
    }
    if (!impactApplied && stopGap < -0.0001 && state.faces.length && radial > 0.38 && radial < 1.26) {
      const delta =
        (((state.lap === "cut" ? 0.035 : state.lap === "fine" ? 0.008 : 0.0012) * (0.3 + pressure) * state.rpm) / 400) *
        material().hardness;
      const cutNormal = isIntro(state) ? sequence()[state.step].normal : normal;
      const liveMax = Math.max(...state.faces.flat().map((v) => dot(v, cutNormal)));
      const plane = liveMax - Math.min(delta, Math.max(0.0003, -stopGap / GEM_SCALE));
      const next = clip(state.faces, cutNormal, plane);
      if (next.length >= 4 && volume(next) > 0.012 && volume(next) < volume(state.faces) - 1e-9) {
        cutting = true;
        cutSoundUntil = now + 120;
        state.faces = next;
        inspectedStep = -1;
        lessonEvent("cut");
        workSurface(cutNormal, 0.08);
        rebuild();
        const key = `${state.flip}:${state.angle.toFixed(isIntro(state) ? 0 : 1)}:${state.index}`;
        if (state.lap === "polish") state.finish[key] = Math.min(1, (state.finish[key] || 0) + 0.02);
        else state.finish[key] = Math.max(0, (state.finish[key] || 0) - 0.01);
        if (!state.touched.some((t) => t.flip === state.flip && t.angle === state.angle && t.index === state.index))
          state.touched.push({ flip: state.flip, angle: state.angle, index: state.index });
        state.log.push({
          type: "cut",
          step: state.step,
          angle: state.angle,
          angleDrive: state.angleDrive,
          indicatedAngle: indicatedAngle(state.angle),
          mechanicsVersion: 2,
          index: state.index,
          height: state.height,
          lap: state.lap,
          flip: state.flip,
          n: cutNormal,
          d: plane,
          pressure,
          rpm: state.rpm,
        });
        if (state.log.length > 30000) state.log.splice(0, 1000);
        updateWeight();
      }
    } else if (
      !impactApplied &&
      state.lap !== "cut" &&
      Math.abs(max - threshold) < 0.035 &&
      radial > 0.38 &&
      radial < 1.26
    ) {
      const key = `${state.flip}:${state.angle.toFixed(isIntro(state) ? 0 : 1)}:${state.index}`;
      state.finish[key] = Math.min(1, (state.finish[key] || 0) + 0.015);
      const surfaceChanged = workSurface(normal, 0.08);
      if (surfaceChanged) rebuild();
      inspectedStep = -1;
      state.log.push({
        type: "surface",
        step: state.step,
        angle: state.angle,
        index: state.index,
        height: state.height,
        lap: state.lap,
        flip: state.flip,
        n: normal,
        t: Date.now(),
      });
      if (state.log.length > 30000) state.log.splice(0, 1000);
      cutting = surfaceChanged;
      if (surfaceChanged) cutSoundUntil = now + 120;
      else cutSoundUntil = 0;
    }
  }
  const actualWork =
    (state.faces !== facesBefore && volume(state.faces) < volume(facesBefore) - 1e-9) ||
    Object.values(state.surfaces || {}).reduce((a, b) => a + b, 0) > surfaceBefore + 1e-6;
  const stoppedAtDepth =
    contactFelt &&
    state.lap === "cut" &&
    lowestY(state.faces, (state.angle * Math.PI) / 180, mastY(state.height), state.index, state.flip) >= LAP_Y - 0.0001;
  const feedbackStopped =
    Boolean(state.batchPause) || (state.mode === "course" && facetReady()) || (!compactCourse() && stoppedAtDepth);
  if (actualWork && hold && state.power && !feedbackStopped && !state.inspecting) haptics.work();
  else if (
    !hold ||
    !state.power ||
    feedbackStopped ||
    contact < 0.96 ||
    state.inspecting ||
    (!actualWork && now - lastCut < 2 && !compactCourse())
  )
    haptics.stop();
  if (actualWork && !feedbackStopped) cutSoundUntil = now + 120;
  else if (feedbackStopped || !hold) cutSoundUntil = 0;
  else if (!actualWork && now - lastCut < 2 && !compactCourse()) cutSoundUntil = 0;
  if (hold && state.mode === "course" && facetReady() && contact > 0.96) contactFelt = true;
  if (feedbackStopped || !hold || now >= cutSoundUntil) cuttingFX.clear();
  if (actualWork && !feedbackStopped && hold && now - lastFX > 65) {
    lastFX = now;
    scene.updateMatrixWorld(true);
    const vertices = state.faces.flat().map((p) => gem.localToWorld(new THREE.Vector3(...p))),
      low = Math.min(...vertices.map((p) => p.y)),
      near = vertices.filter((p) => p.y < low + 0.015),
      spot = near.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / near.length);
    spot.y = LAP_Y;
    cuttingFX.emit(spot, pressure);
  }
  cuttingFX.update(Math.min(dt, 0.05));
  const polish = Object.values(state.finish).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(state.finish).length);
  $("#surfaceLabel").textContent = polish > 0.7 ? "拋光光澤" : polish > 0.2 ? "細磨表面" : "粗磨表面";
  if (state.mode === "course" && facetReady()) cutSoundUntil = 0;
  if (gain) {
    const audible = !audioMuted && state.power && motorSpeed > 2 && !feedbackStopped;
    const speed = Math.min(motorSpeed / 1100, 1);
    const t = audioContext.currentTime;
    gain.gain.setTargetAtTime(audible ? 0.12 * Math.min(motorSpeed / 250, 1) : 0, t, 0.12);
    osc.frequency.setTargetAtTime(48 + speed * 18, t, 0.12);
    motorOvertone.frequency.setTargetAtTime((48 + speed * 18) * 2, t, 0.12);
    motorOvertoneGain.gain.setTargetAtTime(audible ? 0.026 : 0, t, 0.12);
    const touching = hold && contact > 0.96 && !state.inspecting && state.power && audible && now < cutSoundUntil;
    noiseFilter.frequency.setTargetAtTime(
      (state.lap === "polish" ? 380 : state.lap === "fine" ? 650 : 950) + pressure * 650,
      t,
      0.08,
    );
    noiseGain.gain.setTargetAtTime(
      touching
        ? ((state.lap === "polish" ? 0.025 : state.lap === "fine" ? 0.05 : 0.075) + pressure * 0.045) *
            (0.94 + 0.06 * Math.sin(lap.rotation.y * 2))
        : 0,
      t,
      0.06,
    );
  }
  if (state.mode === "course" && hold && facetReady()) {
    const cueKey = `${state.runId || state.seed}:${state.design}:${state.step}`;
    if (!completedFaceCues.has(cueKey)) {
      completedFaceCues.add(cueKey);
      completionCueCount++;
      playCompletionCue();
    }
  }
  updateCoach();
  updateRigPose();
  lockFocus();
  if (pendingInspection && !focusLocked && !hold) {
    pendingInspection = false;
    setupInspect(true);
  }
  tickIntroAutomation(now);
  operator.update(now, { holding: hold, inspecting: state.inspecting });
  frameCamera(dt);
  if (!state.inspecting && view !== "close" && !focusLocked) controls.update();
  updateEasyView();
  updateTargetPreview();
  updateGestureCue();
  cdPlayer.update(
    camera,
    renderer.domElement.getBoundingClientRect(),
    dt,
    openingDone &&
      !entryAwaiting &&
      !hold &&
      !operator.busy &&
      !$("#modal").open &&
      targetAcceptedRun === state.runId &&
      !document.body.classList.contains("adjusting-face"),
  );
  if (!$("#modal").open) {
    const { lift, wobble } = armBounce((now - impactAt) / 1000);
    carriage.position.y += lift;
    arm.rotation.z += wobble;
    renderer.render(scene, camera);
    carriage.position.y -= lift;
    arm.rotation.z -= wobble;
  }
  if (now - lastSave > 3500 && !hold) {
    persist();
    lastSave = now;
  }
}
let serviceAngle = null;
// The arm angle that puts the stone at about hand height (0.95) for the apprentice.
function stickServiceAngle() {
  const saved = arm.rotation.z, at = new THREE.Vector3();
  let best = Math.PI - 0.1, bestGap = Infinity;
  for (let a = 0.3; a <= Math.PI - 0.1; a += 0.02) {
    arm.rotation.z = -a;
    scene.updateMatrixWorld(true);
    const gap = Math.abs(gem.getWorldPosition(at).y - 0.95);
    if (gap < bestGap) (bestGap = gap), (best = a);
  }
  arm.rotation.z = saved;
  scene.updateMatrixWorld(true);
  return best;
}
function updateWeight() {
  $("#currentWeight").textContent = ((rawWeight() * volume(state.faces)) / initialVolume).toFixed(2);
}
carriage.position.y = mastY(state.height);
headAngle = (state.angle * Math.PI) / 180 + 0.55;
arm.rotation.z = -headAngle;
gemFrame.rotation.set(state.flip ? Math.PI : 0, (state.index * Math.PI) / 48, 0);
updateUI();
resize();
setView("work");
requestAnimationFrame(animate);
persist();
updateAudioLabel();
window.addEventListener("pagehide", persist);
// Exposed read-only snapshots for geometry and interaction verification.
window.facetDebug = () => ({
  music: cdPlayer.state,
  state: JSON.parse(JSON.stringify(state)),
  volume: volume(state.faces),
  initialVolume,
  inspectionYaw,
  inspectionPitch,
  headAngle,
  mastY: carriage.position.y,
  attached: gem.parent === gemFrame && stoneAssembly.parent === arm,
  machineVisible: machine.visible,
  lowest: lowestY(state.faces, headAngle, carriage.position.y, state.index, state.flip),
  surfaceLevels: state.faces.map(surfaceLevel),
  materialGroups: gem.geometry.groups.map((g) => g.materialIndex),
  rendering: {
    contextLosses: renderRecovery.losses,
    contextRestores: renderRecovery.restores,
    lostContexts: [...renderRecovery.lost],
    detailFrames: renderRecovery.detailFrames,
    roughTransmission: faceMaterials[0]?.transmission,
    cutTransmission: faceMaterials[3]?.transmission,
    fineTransmission: faceMaterials[1]?.transmission,
    shadowMap: key.shadow.mapSize.x,
    normalBias: key.shadow.normalBias,
    transparentCasters: drops.filter((d) => d.castShadow).length,
  },
  effectParticles: cuttingFX.emitted,
  activeParticles: cuttingFX.active,
  lastContactInfo,
  leverTravel,
  leverSpeed,
  contactFelt,
  focusLocked,
  view,
  cameraPosition: camera.position.toArray(),
  cameraTarget: controls.target.toArray(),
  gemPosition: gem.getWorldPosition(new THREE.Vector3()).toArray(),
  renderedLowest: Math.min(...state.faces.flat().map((p) => gem.localToWorld(new THREE.Vector3(...p)).y)),
  learningStages: compactCourse() ? sequence().length : null,
  autoBatchRun,
  autoIntroRun,
  autoArmed,
  settingsMotion: { active: rigMotion.active, value: { ...rigMotion.value } },
  operator: {
    waterAngle: waterArm.rotation.y,
    busy: operator.busy,
    phase: operator.phase,
    handVisible: operator.handVisible,
    clearance: operator.clearance(),
    openingDone,
  },
  haptics: { supported: haptics.supported, active: haptics.active, pulses: haptics.pulses },
  stoneColor: new THREE.Color(gemstoneColor()).getHexString(),
  lapAppearance: lap.material.color.getHexString(),
  lapGrooves: lap.children.filter((c) => c.userData.lapGroove && c.visible).length,
  visibleDrops: drops.filter((d) => d.visible).length,
  dopMount: {
    ...dopDimensions(),
    adhesiveVisible: wax.visible,
    quaternion: gem.getWorldQuaternion(new THREE.Quaternion()).toArray(),
    previewQuaternion: detailAssembly.quaternion.toArray(),
    previewRadius: detailDop.scale.x * GEM_SCALE,
  },
  previewView: {
    expanded: detailBox.classList.contains("expanded"),
    yaw: detailYaw,
    pitch: detailPitch,
    camera: detailCamera.position.toArray(),
  },
  detailDop: {
    visible: detailDop.visible,
    position: detailDop.position.toArray(),
    length: detailDop.scale.y,
    flip: state.flip,
  },
  rig: rigContactReport(),
  benchAccessories: scene
    .getObjectByName("workshop")
    .children.filter((o) => o.userData.benchAccessory)
    .map((o) => ({ name: o.name, bottom: new THREE.Box3().setFromObject(o).min.y })),
  ticks,
  contact,
  pressure,
  motorSpeed,
  lapRotation: lap.rotation.y,
  audio: {
    completionCues: completionCueCount,
    state: audioContext?.state || "uninitialized",
    gain: gain?.gain.value || 0,
    frequency: osc?.frequency.value || 0,
    noise: noiseGain?.gain.value || 0,
    muted: audioMuted,
  },
  meshVertices: gem.geometry.attributes.position.count,
});

function closeSheets() {
  camera.clearViewOffset();
  document.body.classList.remove("adjusting-face");
  if (targetOutline) targetOutline.visible = false;
  $$(".panel").forEach((p) => p.classList.remove("sheet-open", "guided-mode", "swipe-settings"));
}
$("#mobileBlueprint").onclick = () => {
  stop();
  closeSheets();
  if (isIntro(state)) {
    blueModal();
    return;
  }
  $(".blueprint").classList.add("sheet-open");
};
$("#mobileSettings").onclick = () => {
  coachSeen = true;
  guidePanel(["調整"]);
};
$$(".sheet-close").forEach((b) => (b.onclick = closeSheets));
$("#mobilePower").onclick = () => $("#power").click();

$("#guidePrev").onclick = () => $("#prevStep").click();
$("#guideNext").onclick = () => $("#nextStep").click();
let angleDrag = null;
const wheel = $("#angleWheel");
wheel.addEventListener("pointerdown", (e) => {
  if (hold || contact > 0.02) return;
  e.preventDefault();
  angleDrag = { x: e.clientX, start: state.angle };
  wheel.setPointerCapture(e.pointerId);
});
wheel.addEventListener("pointermove", (e) => {
  if (!angleDrag) return;
  e.preventDefault();
  change(
    "angle",
    dragSetting("angle", angleDrag.start, e.clientX - angleDrag.x, { intro: isIntro(state), fine: fineAdjust }),
  );
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) =>
  wheel.addEventListener(ev, () => (angleDrag = null)),
);
wheel.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault();
    change("angle", state.angle + (e.key === "ArrowRight" ? 1 : -1) * (isIntro(state) ? 1 : 0.02));
  }
});

function setAdjustMode(fine) {
  fineAdjust = fine;
  $("#fineMode").classList.toggle("selected", fine);
  $("#coarseMode").classList.toggle("selected", !fine);
  updateUI();
}
$("#coarseMode").textContent = "快調";
$("#fineMode").textContent = "微調";
$("#coarseMode").onclick = () => setAdjustMode(false);
$("#fineMode").onclick = () => setAdjustMode(true);
function validatePractice() {
  if (compactCourse()) return true;
  const issue = practiceIssue(state);
  if (!issue) return true;
  coachSeen = true;
  guidePanel(["設定"]);
  toast(issue.text);
  return false;
}
function contactGuide() {
  const touch = contactHeight(state.faces, (state.angle * Math.PI) / 180, state.index, state.flip);
  return { touch, gap: state.height - touch };
}
function faceTitle() {
  const s = sequence()[state.step];
  if (compactCourse()) return `${s.part} · ${state.step + 1}/${sequence().length}`;
  if (isIntro(state)) return `${s.part} · ${state.step + 1}/${sequence().length}`;
  return (
    ({ 腰圍: "側面", 亭部: "底部", 冠部: "上部", 台面: "頂面", 底面: "底面", 底尖: "底尖" }[s.part] || s.part) +
    " " +
    (s.id.match(/\d+/)?.[0] || "")
  );
}
function heldAutoAvailable() {
  if (!hold || operator.busy) return false;
  if (state.batchPause) {
    const next = sequence()[state.step].batch[state.batchNext];
    return Boolean(next && Math.abs(next.angle - state.angle) < 0.001);
  }
  return isIntro(state) && facetReady() && sameIntroNext();
}
function guideStage() {
  if (operator.busy)
    return operator.phase === "helper-coming" ? ["工具", "學徒來幫忙", "她會搬梯子、爬上去處理，請稍候", ""] : ["工具", "學徒處理中", "請稍候", ""];
  if (autoArmed) return ["同角度自動研磨", "自動模式開啟", "手不要放開，放開就停", ""];
  if (heldAutoAvailable()) return ["按住自動", "這一面完成", "不用放手，滑到「同角度自動研磨」", "同角度自動研磨"];
  const s = sequence()[state.step],
    label = faceTitle(),
    tool = guidedToolTask();
  if (state.batchPause) {
    const next = s.batch[state.batchNext],
      same = Math.abs(next.angle - state.angle) < 0.001;
    return [
      "續組",
      same ? "第一面完成" : "這組角度完成",
      hold ? "放手看看切面" : same ? "同角度的切面，可以同角度自動研磨" : "換角度後，先自己磨一面",
      hold ? "" : same ? "同角度自動研磨" : "下一組角度",
    ];
  }
  // Tool steps never hide their button: one tap stops the motor, waits for the lap to spin down, then runs the tool.
  if (tool) {
    const waiting = pendingToolRun && (state.power || motorSpeed > 10);
    return ["工具", tool.title, waiting ? "磨盤停轉中，稍候自動進行" : tool.hint, waiting ? "停轉中…" : tool.action];
  }
  if (state.mode === "course" && state.inspecting && facetReady() && state.step === sequence().length - 1)
    return ["成品", "全部完成", "", "欣賞作品"];
  if (isIntro(state) && facetReady() && state.inspecting && sameIntroNext())
    return ["入門自動", `${s.part}完成`, "同角度的下一面，可以同角度自動研磨", "同角度自動研磨"];
  if (easyLesson()) {
    const ready = facetReady(),
      last = state.step === sequence().length - 1;
    return [
      ready && state.inspecting ? (last ? "成品" : "入門下一步") : "輕鬆研磨",
      ready
        ? `${s.part}完成`
        : compactCourse()
          ? `${s.part} · ${state.step + 1}/${sequence().length}`
          : s.lap === "cut"
            ? `磨出第 ${state.step + 1} 面`
            : s.part,
      "",
      ready && state.inspecting
        ? last
          ? "欣賞作品"
          : compactCourse()
            ? "下一階段"
            : "下一面"
        : state.power
          ? ""
          : "開始研磨",
    ];
  }
  if (state.mode === "course") return manualCourseGuide();
  if (isIntro(state)) {
    if (Math.round(state.angle) !== s.angle) return ["設定", `調到 ${s.angle}°`, "", "調整"];
    if (state.index !== s.index) return ["設定", `轉到 ${s.index} 齒`, "", "調整"];
    if (!state.power) return ["開機", label, "", "開機"];
    if (state.inspecting && introStageReady(state))
      return [
        state.step === sequence().length - 1 ? "成品" : "入門下一步",
        `${s.part}完成`,
        "",
        state.step === sequence().length - 1 ? "欣賞作品" : `開始${sequence()[state.step + 1].part}`,
      ];
    return ["入門研磨", label, "", ""];
  }
  if (["exam", "challenge", "contest"].includes(state.mode)) {
    if (document.body.classList.contains("adjusting-face"))
      return ["設定完成", label, "角度決定斜面，齒位決定方向", "回工作台"];
    if (state.inspecting && currentStepWorked())
      return [
        state.step === sequence().length - 1 ? "成品" : "繼續",
        label,
        "轉動檢查；還要磨就再往下拉",
        state.step === sequence().length - 1 ? "評估作品" : "下一面",
      ];
    if (!state.power) return ["開機", label, "先在選單調好本面，再開機", "開機"];
    return [
      "自由",
      label,
      lastContactInfo?.stopGap >= -0.0001 ? "繼續下拉，磨深一點" : "下拉研磨，放手檢查",
      "調整這一面",
    ];
  }
  if (!coachSeen) return ["讀圖", `準備 ${label}`, "", "開始"];
  const issue = practiceIssue(state);
  if (issue && !hold) return ["設定", issue.title, issue.text, "機台設定"];
  if (!state.power && !hold) return ["開機", "啟動馬達", "", "開機"];
  if (state.inspecting)
    return currentStepWorked() ? ["繼續", `觀察 ${label}`, "", "下一面"] : ["設定", `觀察 ${label}`, "", "機台設定"];
  const worked = state.touched.some(
    (t) => t.index === state.index && t.flip === state.flip && Math.abs(t.angle - state.angle) < 0.15,
  );
  if (worked && inspectedStep !== state.step && !hold)
    return ["觀察", `檢查 ${label}`, "磨一點，抬起看一次。", "看一眼"];
  if (currentStepWorked() && inspectedStep === state.step && !hold)
    return ["繼續", `${label} 到位了嗎？`, "可再調深度修磨，或換下一面。", "下一面"];
  return ["磨削", `研磨 ${label}`, "下放研磨，上提觀察。", "機台設定"];
}
function guidePanel(g) {
  if (operator.busy) {
    closeSheets();
    return;
  }
  if (state.mode === "course" && sequence()[state.step].lap !== "cut") {
    if (isIntro(state)) assistIntro();
    else assistBatch();
    closeSheets();
    updateUI();
    updateCoach();
    return;
  }
  if (g[0] === "設定" && !practiceIssue(state)) {
    closeSheets();
    updateCoach();
    return;
  }
  if (guidedToolTask()) {
    closeSheets();
    updateCoach();
    return;
  }
  if (easyLesson()) {
    closeSheets();
    return;
  }
  if (!$("#settingsCarousel")) return;
  stop();
  closeSheets();
  $(".machine").classList.add("sheet-open", "swipe-settings");
  document.body.classList.add("adjusting-face");
  setView("close");
  if (innerWidth < 761) {
    const bounds = viewport.getBoundingClientRect();
    camera.setViewOffset(bounds.width, bounds.height, 0, bounds.height * 0.29, bounds.width, bounds.height);
  }
  $("#settingFaceTitle").textContent = faceTitle();
  $("#settingFaceHint").textContent = ["exam", "challenge", "contest"].includes(state.mode)
    ? "金色輪廓是本面的規劃位置。"
    : "金色輪廓是這一步要磨的位置。";
  $("#settingsMiniPlan").innerHTML = blueprintSVG();
  const issue = practiceIssue(state);
  activeSetupField = issue?.field || "angle";
  $("#settingsCarousel").scrollTo({
    left: $("#settingsCarousel").clientWidth * (issue?.page ?? (g[0] === "高度" ? 2 : 0)),
    behavior: "smooth",
  });
  $("#settingFooter details").open = Boolean(issue?.tools);
  updateSettingLabels();
}
function updateCoach() {
  if ($("#settingsCarousel")) updateSettingLabels();
  const g = guideStage();
  if ($("#coachTitle").textContent !== g[1]) $("#coachTitle").textContent = g[1];
  if ($("#coachText").textContent !== g[2]) $("#coachText").textContent = g[2];
  $("#coachAction").textContent = g[3];
  const powerOnly = g[0] === "開機" || (g[0] === "輕鬆研磨" && !state.power) || g[3] === "先關機";
  $("#coachAction").hidden = powerOnly || !g[3] || (hold && !heldAutoAvailable());
  $("#coachAction").dataset.stage = g[0];
  const key = state.step + ":" + g[0];
  if (false) {
    autoGuideKey = key;
    clearTimeout(guideTimer);
    guideTimer = setTimeout(() => guidePanel(guideStage()), 180);
  }
}
$("#coachAction").onclick = () => {
  const g = guideStage();
  if (g[0] === "按住自動" || g[0] === "入門自動") {
    armAutoContinuation();
    return;
  }
  if (g[0] === "續組") {
    const stage = sequence()[state.step],
      next = stage.batch[state.batchNext],
      same = Math.abs(next.angle - state.angle) < 0.001;
    if (same) {
      armAutoContinuation();
      return;
    }
    state.batchFacet = state.batchNext;
    state.batchPause = false;
    state.batchNext = null;
    assistBatch();
    setupInspect(true);
    updateUI();
  } else if (g[0] === "設定下一項") {
    guidePanel(["設定"]);
  } else if (g[0] === "設定完成") {
    closeSheets();
    updateUI();
  } else if (g[0] === "工具") {
    performGuidedTool();
  } else if (g[0] === "輕鬆研磨") {
    sound();
    state.power = true;
    assistIntro();
    updateUI();
  } else if (g[0] === "成品") {
    finishAssessment();
  } else if (g[0] === "入門下一步") {
    $("#nextStep").click();
    setupInspect(true);
    if (practiceIssue(state)) guidePanel(["設定"]);
  } else if (g[0] === "開機") {
    $("#mobilePower").click();
  } else if (g[0] === "檢查") {
    setupInspect(false);
    updateUI();
  } else if (g[0] === "觀察") setupInspect(true);
  else if (g[0] === "繼續") {
    $("#nextStep").click();
    coachSeen = true;
    setupInspect(true);
    if (practiceIssue(state)) guidePanel(guideStage());
    else if (["exam", "challenge", "contest"].includes(state.mode) && !guidedToolTask()) guidePanel(["設定"]);
    else closeSheets();
  } else {
    coachSeen = true;
    guidePanel(g);
  }
};

$("#catalogBtn").onclick = () => {
  modal(
    `<h2>切割款式</h2><div class="cut-picker">${catalog.map((c, i) => `<button data-open-plan="${catalogPlanIds[i]}">${cutIcon(c[4])}<span>${c[1]}</span></button>`).join("")}</div>`,
  );
  $$("[data-open-plan]").forEach((b) => (b.onclick = () => showPlan(b.dataset.openPlan)));
};

function lockFocus() {
  const locked =
    operator.busy ||
    rigMotion.active ||
    hold ||
    contact > 0.02 ||
    (focusLocked && lowestY(state.faces, headAngle, carriage.position.y, state.index, state.flip) < LAP_Y + 0.015);
  if (locked !== focusLocked) {
    focusLocked = locked;
    document.body.classList.toggle("grinding-focus", locked);
  }
  $$(
    "[data-view],#resetView,#inspect,#coachAction,#mobileBlueprint,#mobileSettings,#stoneBtn,#vaultBtn,#newBtn,#worktab,#mainMenu,#finish",
  ).forEach(
    (b) =>
      (b.disabled =
        (locked && !(b.id === "coachAction" && heldAutoAvailable())) ||
        (b.id === "coachAction" && Boolean(guidedToolTask()) && !state.power && motorSpeed > 10) ||
        (easyLesson() && ["mobileSettings", "mobileBlueprint"].includes(b.id))),
  );
  controls.enabled = !locked && !state.inspecting && (view === "work" || view === "top");
  if (locked) {
    $("#sceneHint").textContent = hold ? "專心磨削 · 放手抬起" : "切磨臂抬起中";
    if (hold) $("#grind strong").textContent = contactFelt && leverTravel >= 0.76 ? "接觸 · 輕輕帶下" : "慢慢下放";
  } else $("#sceneHint").textContent = state.inspecting ? "拖曳環繞觀察 · 放手回正" : "下放研磨 · 上提觀察";
}

function unlockAudioFromGesture() {
  if (!audioMuted && (!audioContext || audioContext.state !== "running")) sound();
}
document.addEventListener("pointerdown", unlockAudioFromGesture, { capture: true, passive: true });
document.addEventListener("keydown", unlockAudioFromGesture, { capture: true });

function indexDialSVG() {
  let marks = "";
  for (let i = 0; i < 96; i++) {
    const a = (i * 2 * Math.PI) / 96;
    const r = i % 3 === 0 ? 76 : 82;
    marks += `<path d="M${100 + Math.sin(a) * r} ${100 - Math.cos(a) * r}L${100 + Math.sin(a) * 88} ${100 - Math.cos(a) * 88}"/>`;
    if (i % 3 === 0)
      marks += `<text x="${100 + Math.sin(a) * 67}" y="${104 - Math.cos(a) * 67}" text-anchor="middle">${i === 0 ? 96 : i}</text>`;
  }
  return `<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="94" fill="#272a32" stroke="#8f8592" stroke-width="3"/><g stroke="#e2dce5" stroke-width="1">${marks}</g><circle cx="100" cy="100" r="40" fill="#b5a6a3" stroke="#e8e0da" stroke-width="3"/><circle cx="100" cy="100" r="25" fill="#ac8a4e"/><style>text{fill:#f5edf4;stroke:none;font:10px sans-serif}</style></svg>`;
}
$("#indexDial").innerHTML = indexDialSVG();
$("#indexLock").onclick = () => {
  if (hold || focusLocked) return;
  detent("lock");
  state.indexLocked = !state.indexLocked;
  if (state.indexLocked) lessonEvent("indexLock");
  updateUI();
  persist();
};
let indexDrag = null;
$("#indexDial").addEventListener("pointerdown", (e) => {
  if (focusLocked) return;
  const b = e.currentTarget.getBoundingClientRect();
  const cx = b.x + b.width / 2,
    cy = b.y + b.height / 2;
  if (Math.hypot(e.clientX - cx, e.clientY - cy) < b.width * 0.28) return;
  e.preventDefault();
  indexDrag = {
    cx,
    cy,
    minRadius: b.width * 0.28,
    angle: Math.atan2(e.clientY - cy, e.clientX - cx),
    travel: 0,
    start: state.index,
  };
  e.currentTarget.setPointerCapture(e.pointerId);
});
$("#indexDial").addEventListener("pointermove", (e) => {
  if (!indexDrag) return;
  e.preventDefault();
  if (Math.hypot(e.clientX - indexDrag.cx, e.clientY - indexDrag.cy) < indexDrag.minRadius) {
    indexDrag.angle = null;
    return;
  }
  const a = Math.atan2(e.clientY - indexDrag.cy, e.clientX - indexDrag.cx);
  if (indexDrag.angle === null) {
    indexDrag.angle = a;
    return;
  }
  let delta = a - indexDrag.angle;
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  indexDrag.travel += delta;
  indexDrag.angle = a;
  change("index", indexDrag.start - Math.round((indexDrag.travel * 96) / (2 * Math.PI)));
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) =>
  $("#indexDial").addEventListener(ev, () => (indexDrag = null)),
);
$("#indexDial").addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault();
    change("index", state.index + (e.key === "ArrowRight" ? 1 : -1));
  }
});

// Local introductory quests record actual actions, not clicks on a completion button.
const lessons = [
  {
    name: "第一課 · 讓機台聽你的",
    text: "鬆開角度鎖，手動改變角度，再鎖回。聽聽旋鈕與鎖扣的差別。",
    reward: "獲得「穩穩的手」印記",
  },
  {
    name: "第二課 · 換一個面向光",
    text: "鬆開分度定位，轉到不同齒位，再鎖回。角度和分度是兩件不同的事。",
    reward: "獲得「尋光者」印記",
  },
  {
    name: "第三課 · 第一片光",
    text: "磨出真正的新刻面，放開下壓，再抬起檢查。材料必須實際減少才算完成。",
    reward: "獲得「第一片光」印記",
  },
];
function lessonEvent(event) {
  state.learning ||= { level: 0, actions: [] };
  const l = state.learning;
  if (l.level >= lessons.length) return;
  if (event === "angle") l.actions = l.actions.filter((x) => x !== "angleLock");
  if (event === "index") l.actions = l.actions.filter((x) => x !== "indexLock");
  if (!l.actions.includes(event)) l.actions.push(event);
  const requirements = [
    ["angle", "angleLock"],
    ["index", "indexLock"],
    ["cut", "inspect"],
  ][l.level];
  if (requirements.every((x) => l.actions.includes(x))) {
    const reward = lessons[l.level].reward;
    l.level++;
    l.actions = [];
    toast("✧ " + reward);
    document.body.classList.add("lesson-earned");
    setTimeout(() => document.body.classList.remove("lesson-earned"), 1400);
  }
  persist();
}
function journey() {
  const level = state.learning?.level || 0;
  modal(
    `<span class="modal-eyebrow">LITTLE MOMENTS, REAL CRAFT</span><h2>你的學徒旅程</h2><p>先收集三枚操作印記，再帶著手感開始完整作品。這是操作練習，並非認證考試。</p><div class="journey-list">${lessons.map((l, i) => `<article class="journey-card ${i < level ? "earned" : ""}"><span class="journey-seal">${i < level ? "✧" : String(i + 1).padStart(2, "0")}</span><div><h3>${l.name}</h3><p>${l.text}</p><small>${i < level ? l.reward : i === level ? "現在挑戰這一課" : "完成上一課後解鎖"}</small></div></article>`).join("")}</div><button class="primary full" id="lessonGo">${level < 3 ? "回工作台練習" : "開始完整切磨作品"} ↗</button><p class="modal-note">印記保存在此瀏覽器。完整分級考試、線上證書與競賽驗證尚未開放。</p>`,
  );
  $("#lessonGo").onclick = () => {
    $("#modal").close();
    if (level < 2) $("#mobileSettings").click();
    else if (level === 2) toast("先調整接觸高度，輕磨後抬起檢查。");
    else blueModal();
  };
}
$("#worktab").onclick = journey;

let profile = loadProfile(localStorage),
  viewerDispose = null,
  jewelRenderer = null;
$("#modal").addEventListener("close", () => {
  if (!$("#modal").open) viewerDispose?.();
});
function saveProfile() {
  try {
    localStorage.setItem("facet-profile", JSON.stringify(profile));
  } catch {
    toast("儲存失敗，請匯出備份。");
  }
}
function jewelViewer(
  container,
  faces,
  {
    raw = null,
    polished = true,
    materialId = state.materialId || "glass",
    displayColor = null,
    displayDesign = state.design,
    fracture = 0,
  } = {},
) {
  viewerDispose?.();
  // A damaged stone shows large frosted chips knocked off its corners.
  let chipFaces = null;
  if (fracture) ({ faces, chips: chipFaces } = fractureFaces(faces, fracture, state.log?.length || 7));
  if (!jewelRenderer) {
    jewelRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    watchRenderer(jewelRenderer, "showcase", () => {});
  }
  const r = jewelRenderer;
  r.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  const viewerHeight = container.clientHeight || 300;
  r.setSize(container.clientWidth, viewerHeight);
  container.appendChild(r.domElement);
  const sc = new THREE.Scene(),
    cam = new THREE.PerspectiveCamera(35, container.clientWidth / viewerHeight, 0.01, 40);
  const extent = Math.max(...faces.flat().map((p) => Math.hypot(...p)));
  const bounds = new THREE.Box3().setFromPoints(faces.flat().map((p) => new THREE.Vector3(...p))),
    center = bounds.getCenter(new THREE.Vector3());
  cam.position
    .copy(center)
    .add(
      new THREE.Vector3(
        extent * 0.52,
        extent * (plans[displayDesign]?.style === "learn" ? 2.4 : 1.28),
        extent * (plans[displayDesign]?.style === "learn" ? 3 : 3.6),
      ),
    );
  let mat = polished
    ? opticalMaterial(faces, {
        color:
          displayColor ??
          (materialId === (state.materialId || "glass") ? gemstoneColor() : materials[materialId].color),
        ior: materials[materialId].ior,
      })
    : new THREE.MeshStandardMaterial({ color: material().color, roughness: 0.4, flatShading: true });
  const obj = new THREE.Mesh(geometryFromFaces(faces), mat);
  sc.add(obj);
  const disposeChips = chipFaces?.length ? addChipScars(sc, chipFaces) : null;
  if (disposeChips) container.dataset.chips = chipFaces.length;
  bindOptics(obj);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x6b4865, 3));
  const light = new THREE.DirectionalLight(0xffffff, 4);
  light.position.set(3, 6, 4);
  sc.add(light);
  let wire;
  if (raw) {
    wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometryFromFaces(raw)),
      new THREE.LineBasicMaterial({ color: 0xa1899c, transparent: true, opacity: 0.5 }),
    );
    sc.add(wire);
  }
  const orbit = new OrbitControls(cam, r.domElement);
  orbit.target.copy(center);
  container.dataset.startView = "crown";
  orbit.enablePan = false;
  orbit.enableDamping = true;
  orbit.autoRotate = container.id === "resultViewer";
  orbit.autoRotateSpeed = 2.15;
  orbit.minDistance = extent * 1.8;
  orbit.maxDistance = extent * 7;
  const glints = polished ? jewelGlints(container, faces) : null;
  let frame;
  const run = () => {
    frame = requestAnimationFrame(run);
    orbit.update();
    r.render(sc, cam);
    glints?.update(cam, obj);
  };
  run();
  viewerDispose = () => {
    disposeChips?.();
    glints?.dispose();
    cancelAnimationFrame(frame);
    orbit.dispose();
    obj.geometry.dispose();
    mat.dispose();
    if (wire) {
      wire.geometry.dispose();
      wire.material.dispose();
    }
    r.renderLists.dispose();
    r.clear();
    r.domElement.remove();
    viewerDispose = null;
  };
  return {
    update(next, polish) {
      obj.geometry.dispose();
      obj.geometry = geometryFromFaces(next);
      mat.dispose();
      mat =
        polish >= 0.99
          ? opticalMaterial(next, { color: gemstoneColor(), ior: materials[materialId].ior })
          : new THREE.MeshPhysicalMaterial({
              color: gemstoneColor(),
              roughness: 0.65 * (1 - polish) + 0.04,
              transmission: polish * 0.8,
              thickness: 0.5,
              ior: materials[materialId].ior,
            });
      obj.material = mat;
    },
    orbit,
  };
}
async function startJob({
  mode = "course",
  courseId = null,
  examId = null,
  materialId = "glass",
  kind = "block",
  seed = Date.now() % 99991,
  design = "single",
  mount = 0,
  size = 1,
  fit = 0.9,
  advanced = false,
} = {}) {
  if (entryAwaiting) {
    sound();
    entryAwaiting = false;
    openingStart = null;
    openingDone = false;
    entryScreen.remove();
  }
  if (state.log.length && state.mode !== "course") savePiece(true);
  let cloudRun = null;
  if (cloudEnabled && (mode === "exam" || mode === "contest")) {
    try {
      cloudRun = await api("runs", { mode, courseId, examId, design, mount, fit });
      seed = cloudRun.config.seed;
      size = cloudRun.config.size;
    } catch (e) {
      toast(e.message);
      return;
    }
  }
  const raw = createRaw(seed, kind, size, mount);
  state = {
    ...state,
    gemSceneScale: GEM_SCALE,
    mode,
    courseId,
    examId,
    materialId,
    rawKind: kind,
    mount,
    size,
    seed,
    design,
    advanced,
    planScale: isIntroKind(kind) ? 1 : maxFit(raw, design) * fit,
    originalFaces: raw,
    faces: JSON.parse(JSON.stringify(raw)),
    batchVersion: 1,
    batchFacet: 0,
    batchTime: 0,
    batchDone: false,
    batchPause: false,
    batchNext: null,
    step: 0,
    angle: 38,
    angleDrive: 38,
    index: 0,
    indexLocked: true,
    locked: true,
    height: 120.8,
    flip: false,
    lap: "cut",
    water: true,
    power: false,
    inspecting: false,
    finish: {},
    surfaces: {},
    log: [],
    touched: [],
    inspectionCount: 0,
    cloudRunId: cloudRun?.id || null,
    damageCount: 0,
    runId: crypto.randomUUID(),
    planVersion: 2,
    machineVersion: 2,
  };
  document.body.classList.toggle("advanced-suite", advanced);
  batchTransition = null;
  autoArmed = armedAdvance = false;
  autoBatchRun = false;
  autoIntroRun = false;
  autoIntroNext = null;
  initialVolume = volume(raw);
  if (compactCourse()) assistBatch();
  if (isIntro(state)) {
    state.angle = state.angleDrive = 30;
    assistIntro();
  }
  coachSeen = false;
  autoGuideKey = "";
  inspectedStep = -1;
  closeSheets();
  $("#modal").close();
  setupInspect(false);
  setView("work");
  rebuild();
  updateUI();
  persist();
  if (mode !== "course" && ["challenge", "exam", "contest"].includes(mode)) guidePanel(["設定"]);
}
function planning(options) {
  if (options.mode === "course" && ["steps", "light"].includes(options.courseId)) {
    startJob({ ...options, mount: 0, fit: 0.9, size: 1 });
    return;
  }
  if (isIntroKind(options.kind)) {
    startJob({ ...options, mount: 0, fit: 1, size: 1 });
    return;
  }
  let mount = 0,
    fit = 0.9,
    design = options.design || "single";
  const seed = options.seed || Date.now() % 99991,
    size = options.size || (["course", "exam", "contest"].includes(options.mode) ? 1 : 0.8 + (seed % 7) / 10);
  function draw() {
    const raw = createRaw(seed, options.kind, size, mount),
      scale = maxFit(raw, design) * fit,
      target = fittedPlan(design, scale);
    modal(
      `<span class="modal-eyebrow">PLAN YOUR GEM</span><h2>${options.courseId === "choice" ? "選擇成品形狀" : options.courseId === "master" ? "留下更多寶石" : "先擺好原石"}</h2>${options.courseId === "master" ? "<p class=planning-purpose>選對角度，才能留下更大顆的寶石；切錯就越磨越小，這就是功夫的差別。</p>" : ""}<div id="planViewer" class="jewel-viewer"></div><p class="viewer-hint">360°</p>${options.courseId === "choice" ? '<p class="shape-choice-hint">原石不變，點下面圖案選成品形狀。</p>' : ""}<div class="planning-controls">${options.courseId === "choice" ? `<div class="shape-choices">${["single", "step", "brilliant"].map((id) => `<button data-shape-choice="${id}" aria-pressed="${design === id}">${cutIcon(plans[id].shape)}<span>${plans[id].family}</span></button>`).join("")}</div>` : ""}<button id="plannedDesign" class="chosen-cut" ${options.courseId === "choice" ? "hidden" : options.design ? "disabled" : ""}>${cutIcon(plans[design].shape)}<span>${plans[design].family}</span></button><div ${options.courseId === "choice" ? "hidden" : ""}><span>黏石方向 ${mount}°<small>轉動原石，選擇黏上棒子的方向</small></span><button id="mountLeft">↶ 45°</button><button id="mountRight">↷ 45°</button></div><div ${options.courseId === "choice" ? "hidden" : ""}><span>成品尺寸 ${Math.round(fit * 100)}%<small>100% 最貼近原石邊緣</small></span><button id="fitLess">− 5%</button><button id="fitMore">＋ 5%</button></div></div><p>原石 ${carats(raw, options.materialId).toFixed(3)} ct → 預估成品 ${carats(target.faces, options.materialId).toFixed(3)} ct</p><button id="mountStone" class="primary full">開始研磨</button>`,
    );
    jewelViewer($("#planViewer"), target.faces, { raw, materialId: options.materialId });
    $$("[data-shape-choice]").forEach(
      (b) =>
        (b.onclick = () => {
          design = b.dataset.shapeChoice;
          draw();
        }),
    );
    $("#plannedDesign").onclick = () =>
      selectCut((id) => {
        design = id;
        draw();
      });
    $("#mountLeft").onclick = () => {
      mount = (mount + 315) % 360;
      draw();
    };
    $("#mountRight").onclick = () => {
      mount = (mount + 45) % 360;
      draw();
    };
    $("#fitLess").onclick = () => {
      fit = Math.max(0.5, fit - 0.05);
      draw();
    };
    $("#fitMore").onclick = () => {
      fit = Math.min(1, fit + 0.05);
      draw();
    };
    $("#mountStone").onclick = () => startJob({ ...options, seed, size, mount, fit, design });
  }
  draw();
}
function academy() {
  modal(
    `<span class="modal-eyebrow">ROYAL GEM JOURNEY</span><h2>選擇關卡</h2><p class="modal-note">${lastVisit() ? `上次玩到第 ${Math.max(1, courses.findIndex((c) => c.id === lastVisit().courseId) + 1)} 關 · 第 ${(lastVisit().step || 0) + 1} 步` : "選一關，開始磨出光芒。"}</p><div class="course-list">${courses.map((c, i) => `${i === 0 ? "<h3>入門 · 玩出光澤</h3>" : i === 3 ? "<h3>進階 · 認識工藝</h3>" : i === 5 ? "<h3>選擇 · 留住原石</h3>" : i === 7 ? "<h3>花式切割進階 · 皇室工坊</h3>" : ""}<button data-course="${i}"><span>${profile.completed.includes(c.id) ? "✧" : String(i + 1).padStart(2, "0")}</span><img class="course-thumb" src="images/cuts/${c.id}.webp" alt="" loading="lazy" onerror="this.remove()"><div><b>${c.independent ? "留下更多藍寶石" : c.name}</b><small>${c.advanced ? "五顆裸石任選，自己決定方向與切面。" : c.detail}</small></div><em>${profile.completed.includes(c.id) ? "已通關 · 重玩" : lastVisit()?.courseId === c.id ? "上次玩到" : "開始"}</em></button>`).join("")}</div><details><summary>備份進度</summary><button id="exportProfile">下載備份</button><label>還原備份<input type="file" id="importProfile" accept="application/json"></label></details>`,
  );
  $$("[data-course]").forEach(
    (b) =>
      (b.onclick = () => {
        startCourse(+b.dataset.course);
      }),
  );
  $("#exportProfile").onclick = () =>
    download(new Blob([JSON.stringify({ version: 1, profile })], { type: "application/json" }), "facet-progress.json");
  $("#importProfile").onchange = async (e) => {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (data.version !== 1 || !Array.isArray(data.profile?.completed)) throw Error();
      profile = {
        ...profile,
        completed: data.profile.completed.filter((x) => courses.some((c) => c.id === x)),
        cards: Array.isArray(data.profile.cards)
          ? data.profile.cards
              .filter(
                (c) =>
                  courses.some((x) => x.id === c.courseId) &&
                  plans[c.design] &&
                  Array.isArray(c.faces) &&
                  c.faces.length,
              )
              .slice(0, courses.length)
          : profile.cards || [],
      };
      saveProfile();
      academy();
      toast("關卡進度已還原");
    } catch {
      toast("備份格式不正確。");
    }
  };
}
function challengeRoom() {
  academy();
}
function examRoom() {
  academy();
}
function certificate(c) {
  modal(
    `<div class="certificate"><span>TZG · GAME ACHIEVEMENT</span><div class="cert-emblem">◇</div><h2>${c.title}</h2><p>三場考試通過</p><strong>${(c.name || "刻面工房玩家").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</strong><p>${new Date(c.date).toLocaleDateString("zh-TW")}</p><small>${c.id}<br>遊戲成就 · 非專業資格</small></div><p>${c.id.startsWith("LOCAL-") ? "本機成就" : `查驗網址：${location.origin}/?certificate=${encodeURIComponent(c.id)}`}</p><label>證書署名<input id="certName" maxlength="30" placeholder="輸入你的名字"></label><button id="certSave" class="primary full">下載證書</button>`,
  );
  $("#certName").value = c.name || "";
  $("#certSave").onclick = () => {
    c.name = $("#certName").value.trim().slice(0, 30) || "刻面工房玩家";
    saveProfile();
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 900;
    const x = canvas.getContext("2d");
    x.fillStyle = "#fffaf4";
    x.fillRect(0, 0, 1200, 900);
    x.strokeStyle = "#b99b6d";
    x.lineWidth = 2;
    x.strokeRect(40, 40, 1120, 820);
    x.textAlign = "center";
    x.fillStyle = "#79576c";
    for (const [text, y, size] of [
      ["TZG · GAME ACHIEVEMENT", 145, 26],
      ["◇", 265, 80],
      [c.title, 365, 46],
      [c.name, 465, 36],
      ["通過三場寶石切磨遊戲考試", 550, 26],
      [new Date(c.date).toLocaleDateString("zh-TW"), 650, 24],
      [c.id, 715, 18],
      ["遊戲成就 · 非專業資格", 780, 20],
    ]) {
      x.font = `${size}px sans-serif`;
      x.fillText(text, 600, y);
    }
    canvas.toBlob((blob) => download(blob, "facet-certificate.png"));
  };
}
async function finishAssessment() {
  let verified = null;
  if (state.cloudRunId) {
    try {
      verified = await api("submit", { runId: state.cloudRunId, events: state.log });
      profile = verified.profile;
      saveProfile();
    } catch (e) {
      toast(e.message);
      return;
    }
  }
  const ev = verified?.score || evaluate(),
    course = courses.find((c) => c.id === state.courseId),
    exam = exams.find((e) => e.id === state.examId);
  let message = verified ? (verified.passed ? "✧ 雲端驗證通過。" : "雲端評估未通過，請重試。") : "";
  if (
    !verified &&
    course &&
    (compactCourse()
      ? state.step === sequence().length - 1 && facetReady()
      : passLesson(course, state, ev, state.inspectionCount > 0))
  ) {
    if (!profile.completed.includes(course.id)) profile.completed.push(course.id);
    message = "✧ 過關";
  }
  if (!verified && exam) {
    if (passExam(exam, ev)) {
      profile.exams[exam.id] = {
        score: ev.quality,
        weight: ev.weight,
        date: new Date().toISOString(),
        runId: state.runId,
      };
      message = "✧ 通過";
      if (exams.every((e) => profile.exams[e.id]) && !profile.certificates.length)
        profile.certificates.push({
          id: "LOCAL-" + crypto.randomUUID(),
          title: "寶石切磨工藝認證",
          date: new Date().toISOString(),
          name: "",
          exams: JSON.parse(JSON.stringify(profile.exams)),
        });
    } else message = "未通過";
  }
  profile.history = [
    { runId: state.runId, score: ev.score, quality: ev.quality, weight: ev.weight, date: new Date().toISOString() },
    ...profile.history.filter((h) => h.runId !== state.runId),
  ].slice(0, 50);
  saveProfile();
  state.power = false;
  stop();
  updateUI();
  if (course && state.mode === "course") {
    showPracticeResult(ev, course);
    return;
  }
  modal(
    `<span class="modal-eyebrow">YOUR CUT · YOUR LIGHT</span><h2>${isIntro(state) && ev.good ? (state.courseId === "first" ? "你的第一顆寶石" : state.courseId === "ring" ? "四方光完成" : "雙角光完成") : ev.rating}</h2><div id="resultViewer" class="jewel-viewer"></div><p class="viewer-hint">360°</p><p>${message}</p><div class="result-stats"><div><strong>${ev.quality.toFixed(1)}</strong><small>切工</small></div><div><strong>${ev.weight.toFixed(3)}</strong><small>成品 ct</small></div><div><strong>${(ev.ratio * 100).toFixed(1)}%</strong><small>保重率</small></div></div><p>${ev.value} G</p><details><summary>詳細評分</summary><p>刻面 ${ev.completed}/${ev.total} · 拋光 ${Math.round(ev.polish * 100)}%</p></details><div class="modal-actions"><button id="collectPiece" class="primary">收藏</button><button id="returnWork">繼續磨</button><button id="returnJourney">回旅程</button></div>`,
  );
  jewelViewer($("#resultViewer"), state.faces, { polished: compactCourse() ? facetReady() : ev.polish >= 0.7 });
  if (ev.good) $("#resultViewer").classList.add("celebrate");
  $("#collectPiece").onclick = () => {
    const piece = savePiece();
    if (cloudEnabled) api("pieces", piece).catch((e) => toast(e.message));
    toast("已收藏");
  };
  $("#returnWork").onclick = () => $("#modal").close();
  const next = courses.findIndex((c) => c.id === state.courseId) + 1;
  if (isIntro(state) && profile.completed.includes(state.courseId) && next < 3) {
    $("#returnJourney").textContent = "下一關";
    $("#returnJourney").onclick = () => startCourse(next);
  } else $("#returnJourney").onclick = academy;
}
$("#finish").onclick = finishAssessment;
$("#worktab").onclick = academy;
$("#stoneBtn").onclick = academy;
$("#newBtn").onclick = academy;
$("#modal").addEventListener("close", () => {
  if (!$("#modal").open) viewerDispose?.();
  autoGuideKey = "";
});

let cloudEnabled = false;
async function api(path, body) {
  const r = await fetch("/api/" + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await r.json();
  } catch {
    throw Error("雲端服務尚未連接。");
  }
  if (!r.ok) throw Error(data.error || "雲端服務不可用");
  return data;
}
function cloudRoom() {
  academy();
}
function demonstration(id = state.design) {
  const raw = id === state.design ? state.originalFaces || rough(state.seed) : createRaw(2401, "block", 1),
    plan = fittedPlan(id, id === state.design ? state.planScale || 1 : maxFit(raw, id) * 0.9),
    frames = demoFrames(raw, plan);
  modal(
    `<h2>自動示範 · ${plans[id].family}</h2><div id="demoViewer" class="jewel-viewer"></div><p id="demoStep">原石</p><div class="modal-actions"><button id="demoPause">暫停</button><button id="demoReplay">重播</button></div>`,
  );
  const view = jewelViewer($("#demoViewer"), raw, { polished: false });
  let index = 0,
    paused = false;
  const interval = Math.max(55, Math.min(220, 24000 / frames.length));
  const timer = setInterval(() => {
    if (paused || index >= frames.length - 1) return;
    const f = frames[++index];
    $("#demoViewer").dataset.frame = String(index);
    view.update(f.faces, f.polish);
    $("#demoStep").textContent = index === frames.length - 1 ? "完成 · 拖曳 360° 觀賞" : f.label;
    if (index === frames.length - 1) {
      $("#demoPause").hidden = true;
      playCompletionCue();
    }
  }, interval);
  $("#demoPause").onclick = () => {
    paused = !paused;
    $("#demoPause").textContent = paused ? "繼續" : "暫停";
  };
  $("#demoReplay").onclick = () => {
    index = 0;
    paused = false;
    $("#demoViewer").dataset.frame = "0";
    view.update(raw, 0);
    $("#demoStep").textContent = "原石";
    $("#demoPause").hidden = false;
    $("#demoPause").textContent = "暫停";
  };
  const cleanup = viewerDispose;
  viewerDispose = () => {
    clearInterval(timer);
    cleanup?.();
  };
  $("#modal").addEventListener(
    "close",
    () => {
      clearInterval(timer);
    },
    { once: true },
  );
}

function contestRoom() {
  academy();
}

function updateFacetTarget() {
  if (!targetOutline) return;
  const s = sequence()[state.step],
    f = clip(state.originalFaces || rough(state.seed), s.normal, s.d).find((f) =>
      f.every((p) => Math.abs(dot(p, s.normal) - s.d) < 1e-5),
    );
  if (!f) return;
  targetOutline.geometry.dispose();
  targetOutline.geometry = new THREE.BufferGeometry().setFromPoints(f.map((p) => new THREE.Vector3(...p)));
}
targetOutline = new THREE.LineLoop(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0xd4a455, depthTest: false, transparent: true, opacity: 0.85 }),
);
targetOutline.scale.setScalar(GEM_SCALE);
targetOutline.renderOrder = 10;
targetOutline.visible = false;
gemFrame.add(targetOutline);
updateFacetTarget();
function updateSettingLabels() {
  if (!$("#settingAngleGoal")) return;
  const s = sequence()[state.step],
    independent = ["exam", "challenge", "contest"].includes(state.mode);
  $("#settingAngleGoal").textContent = independent
    ? "角度 · 決定斜面"
    : `① 調到 ${s.angle.toFixed(isIntro(state) ? 0 : 1)}°`;
  const help = $("#settingStepHelp");
  if (help) {
    const ready = Math.abs(state.angle - s.angle) <= 0.051;
    help.textContent = ready
      ? "角度對好了。按下方「回工作台」，接著開啟電源。"
      : `先調角度：按右邊 ＋，或轉動旋鈕，讓數字變成 ${s.angle.toFixed(isIntro(state) ? 0 : 1)}°。`;
    help.classList.toggle("ready", ready);
  }
  $("#settingIndexGoal").textContent = independent ? "齒位 · 決定方向" : `轉到 ${s.index} 齒`;
  $("#settingDepthGoal").textContent = independent ? "高度 · 決定磨深多少" : `調到 ${s.targetHeight.toFixed(2)} mm`;
  $("#depthHint").textContent = independent ? "先輕碰，再下拉磨深；放手檢查。" : "輸入上方數值；設定正確才會進入研磨。";
}
function installSwipeSettings() {
  const panel = $(".machine"),
    angle = $("#angle").closest(".control-block"),
    index = $("#index").closest(".control-block"),
    height = $("#height").closest(".control-block"),
    tools = $(".two-controls"),
    power = $(".power-row"),
    water = $("#water"),
    transfer = $("#transfer");
  const head = document.createElement("div");
  head.id = "settingHeader";
  head.innerHTML =
    '<div id="settingsMiniPlan"></div><small>正在調整哪一面</small><h2 id="settingFaceTitle"></h2><p id="settingFaceHint"></p>';
  panel.prepend(head);
  const carousel = document.createElement("div");
  carousel.id = "settingsCarousel";
  const page = (id, title, content) => {
    const el = document.createElement("section");
    el.className = "setting-page";
    el.innerHTML = `<h3 id="${id}">${title}</h3>`;
    el.append(content);
    carousel.append(el);
    return el;
  };
  page("settingAngleGoal", "角度", angle);
  page("settingIndexGoal", "分度", index);
  const settingStepHelp = document.createElement("p");
  settingStepHelp.id = "settingStepHelp";
  carousel.children[0].querySelector("h3").after(settingStepHelp);
  const depth = page("settingDepthGoal", "深度", height);
  const modes = document.createElement("div");
  modes.className = "height-modes";
  modes.innerHTML =
    "<button id=heightCoarseMode aria-pressed=false>快調</button><button id=heightFineMode class=selected aria-pressed=true>微調</button>";
  depth.append(modes);
  for (const fine of [false, true])
    modes.children[Number(fine)].onclick = () => {
      heightFine = fine;
      for (const [i, b] of [...modes.children].entries()) {
        b.classList.toggle("selected", Boolean(i) === fine);
        b.setAttribute("aria-pressed", String(Boolean(i) === fine));
      }
      detent("turn");
    };
  const drag = document.createElement("div");
  drag.id = "depthWheel";
  drag.className = "angle-wheel";
  drag.innerHTML = '<span class="wheel-ticks"></span><span>左右拖動調高度 · 輕移微調</span>';
  depth.append(drag);
  const hint = document.createElement("p");
  hint.id = "depthHint";
  depth.append(hint);
  panel.append(carousel);
  const tabs = document.createElement("div");
  tabs.className = "setting-tabs";
  tabs.innerHTML = ["角度", "分度", "高度"].map((n, i) => `<button data-setting-page="${i}">${n}</button>`).join("");
  head.append(tabs);
  $$("[data-setting-page]").forEach(
    (b) =>
      (b.onclick = () =>
        carousel.scrollTo({ left: +b.dataset.settingPage * carousel.clientWidth, behavior: "smooth" })),
  );
  carousel.addEventListener("scroll", () => {
    const i = Math.round(carousel.scrollLeft / carousel.clientWidth);
    if (
      state.mode === "course" &&
      document.body.classList.contains("adjusting-face") &&
      activeSetupField !== ["angle", "index", "height"][i]
    ) {
      activeSetupField = ["angle", "index", "height"][i];
      updateCoach();
    }
    $$("[data-setting-page]").forEach((b, j) => b.classList.toggle("selected", i === j));
  });
  const footer = document.createElement("div");
  footer.id = "settingFooter";
  footer.innerHTML = '<details><summary>工具</summary><div id="otherTools"></div></details>';
  panel.append(footer);
  for (const e of [tools, water, transfer]) $("#otherTools").append(e);
  $(".mobile-tools").append(power);
  power.hidden = true;
  let depthDrag = null;
  drag.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    depthDrag = { x: e.clientX, start: state.height };
    drag.setPointerCapture(e.pointerId);
  });
  drag.addEventListener("pointermove", (e) => {
    if (!depthDrag) return;
    e.preventDefault();
    change("height", dragSetting("height", depthDrag.start, e.clientX - depthDrag.x, { fine: heightFine }));
  });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
    drag.addEventListener(ev, () => (depthDrag = null));
  updateSettingLabels();
}
installSwipeSettings();

function craftStudio() {
  academy();
}
function craftCollection() {
  academy();
}

const certificateId = new URLSearchParams(location.search).get("certificate");
if (certificateId) {
  api("certificates?id=" + encodeURIComponent(certificateId))
    .then((c) => {
      modal(
        `<span class="modal-eyebrow">VERIFIED GAME CERTIFICATE</span><h2>證書查驗通過</h2><p>寶石切磨工藝認證</p><p>${new Date(c.created_at).toLocaleDateString("zh-TW")}</p><div class="course-list">${exams.map((e) => `<div><b>${e.name}</b><p>${Number(c.results[e.id]?.score).toFixed(1)} 分 · ${Number(c.results[e.id]?.weight).toFixed(3)} ct</p></div>`).join("")}</div><p>這是遊戲成就認證，不是專業資格。</p>`,
      );
    })
    .catch((e) => modal(`<h2>無法查驗證書</h2><p>請確認查驗編號與雲端服務狀態。</p>`));
}

function selectCut(onSelect) {
  modal(
    `<h2>切割款式</h2><div class="cut-picker">${Object.values(plans)
      .map((p) => `<button data-select-cut="${p.id}">${cutIcon(p.shape)}<span>${p.family}</span></button>`)
      .join("")}</div>`,
  );
  $$("[data-select-cut]").forEach((b) => (b.onclick = () => onSelect(b.dataset.selectCut)));
}
const chooseCut = document.createElement("button");
chooseCut.id = "chooseCut";
chooseCut.className = "chosen-cut";
$("#designSelect").after(chooseCut);
$("#designSelect").hidden = true;
function refreshCutChoice() {
  chooseCut.innerHTML = cutIcon(plans[state.design].shape) + `<span>${plans[state.design].family}</span>`;
}
chooseCut.onclick = () =>
  selectCut((id) => {
    state.design = id;
    state.step = 0;
    coachSeen = false;
    updateUI();
    persist();
    refreshCutChoice();
    blueModal();
  });
refreshCutChoice();

$("#grind").addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
document.addEventListener(
  "touchmove",
  (e) => {
    if (hold) e.preventDefault();
  },
  { passive: false },
);

function assistIntro() {
  if (compactCourse()) {
    assistBatch();
    return;
  }
  const s = sequence()[state.step];
  if (easyLesson()) {
    state.angle = state.angleDrive = s.angle;
    state.index = s.index;
  }
  if (state.rawKind !== "intro-index") state.index = s.index;
  else state.angle = state.angleDrive = s.angle;
  state.height = Number(s.targetHeight.toFixed(2));
  state.flip = s.flip;
  if (state.lap !== s.lap && !operator.busy) {
    state.power = false;
    stop();
    operator.swap(state.lap, s.lap, () => {
      state.lap = s.lap;
      updateLapAppearance();
      updateUI();
      persist();
    });
  }
  state.water = true;
  state.rpm = 400;
  updateLapAppearance();
}

function assistBatch() {
  const stage = sequence()[state.step],
    s = stage.batch?.[state.batchFacet || 0] || stage;
  // Royal levels: the player dials each new angle once by hand, so the angle stays theirs until it locks.
  if (!pendingAngle()) state.angle = state.angleDrive = s.angle;
  state.index = s.index;
  state.height = s.targetHeight;
  state.water = true;
  state.rpm = 400;
}
// Keep the quill on the lap between consecutive facets. The player's held gesture is
// the only thing that keeps this routine running; releasing still calls stop().
function grindBatch(dt, now) {
  if (!hold || !state.power || state.inspecting || state.batchDone || guidedToolTask()) return;
  if (state.batchPause && state.batchNext !== null) state.batchFacet = state.batchNext;
  state.batchPause = false;
  state.batchNext = null;
  batchTransition = null;
  autoBatchRun = false;
  assistBatch();
  if (contact < 0.96 || lowestY(state.faces, headAngle, mastY(state.height), state.index, state.flip) > LAP_Y + 0.005)
    return;
  contactFelt = true;
  const stage = sequence()[state.step];
  state.batchTime = (state.batchTime || 0) + dt;
  if (stage.batch.length) {
    const facet = state.batchFacet || 0,
      step = stage.batch[facet];
    const support = Math.max(...state.faces.flat().map((p) => dot(p, step.normal)));
    const nextD = Math.max(step.d, support - Math.max(0.006, (support - step.d) * 0.25));
    state.faces = clip(state.faces, step.normal, state.batchTime >= 1 ? step.d : nextD);
    state.log.push({
      type: "cut",
      step: state.step,
      angle: step.angle,
      index: step.index,
      flip: step.flip,
      lap: "cut",
      n: step.normal,
      d: state.batchTime >= 1 ? step.d : nextD,
      facet,
      t: now,
      assisted: true,
    });
    if (state.batchTime >= 1) {
      const next = facet + 1;
      state.batchTime = 0;
      cutSoundUntil = 0;
      if (next >= stage.batch.length) {
        state.batchDone = true;
        state.batchFacet = stage.batch.length - 1;
        playCompletionCue();
      } else {
        state.batchFacet = next;
        assistBatch();
        updateUI();
      }
    }
  } else {
    const level =
      stage.lap === "fine" ? Math.min(1.85, state.batchTime * 0.7) : Math.min(3, 1.85 + state.batchTime * 0.45);
    for (const face of state.faces) state.surfaces[normalKey(faceNormal(face))] = level;
    state.finish.batch = stage.lap === "polish" ? Math.min(1, state.batchTime / 3) : 0.35;
    state.log.push({ type: "surface", step: state.step, lap: stage.lap, assisted: true });
    if (state.batchTime >= 3) {
      state.batchDone = true;
      cutSoundUntil = 0;
      playCompletionCue();
    }
  }
  rebuild();
  updateWeight();
}
const advancedRoughs = [
  { origin: "哥倫比亞 · 穆佐", name: "祖母綠裸石", material: "quartz", kind: "long", color: "#278f73" },
  { origin: "斯里蘭卡 · 拉特納普勒", name: "藍寶石裸石", material: "sapphire", kind: "wedge", color: "#4168bd" },
  { origin: "尚比亞 · 卡富布", name: "紫水晶裸石", material: "amethyst", kind: "block", color: "#8450a9" },
  { origin: "南非 · 金伯利", name: "無色晶體裸石", material: "diamond", kind: "block", color: "#9bc9df" },
  { origin: "坦尚尼亞 · 梅雷拉尼", name: "海藍晶體裸石", material: "quartz", kind: "skew", color: "#3ca8af" },
];
function advancedPlanning(course, i) {
  let chosen = null;
  const seed = 9100 + i * 977;
  function draw() {
    modal(
      `<div class="advanced-brief"><span>ROYAL FANCY CUT · ${String(i + 1).padStart(2, "0")}</span><h2>${course.name}</h2><p>選一顆裸石。沒有提示，憑你的眼光決定。</p><div class="rough-five">${advancedRoughs.map((r, n) => `<button data-rough="${n}" class="${chosen === n ? "selected" : ""}"><i style="--rough:${r.color}"></i><b>${r.origin}</b><small>${r.name}</small></button>`).join("")}</div><button id="advancedChoose" class="primary full" ${chosen === null ? "disabled" : ""}>帶到皇室工作台</button></div>`,
    );
    $$("[data-rough]").forEach(
      (b) =>
        (b.onclick = () => {
          chosen = +b.dataset.rough;
          draw();
        }),
    );
    $("#advancedChoose").onclick = () => {
      const r = advancedRoughs[chosen];
      startJob({
        mode: "course",
        courseId: course.id,
        materialId: r.material,
        kind: r.kind,
        design: course.design,
        seed: seed + chosen * 137,
        mount: 0,
        fit: 0.88,
        size: 1,
        advanced: true,
      });
    };
  }
  draw();
}
function startCourse(i) {
  nextCourseCue.hidden = true;
  const c = courses[i];
  if (c.advanced) {
    advancedPlanning(c, i);
    return;
  }
  planning({
    mode: "course",
    courseId: c.id,
    materialId: c.material,
    kind: c.kind,
    design: c.design,
    seed: 2401 + i * 731,
  });
}

// The first two lessons have one fixed action and a live view of the actual cut.
const easyBar = document.createElement("div");
easyBar.id = "easyBar";
easyBar.innerHTML = '<span id="easyHint"></span>';
$(".stage").after(easyBar);
easyBar.append($("#coachAction"));
const detailBox = document.createElement("div");
detailBox.id = "cutDetail";
detailBox.innerHTML = "<span>本面近看</span><i class=preview-zoom-hint aria-hidden=true>＋</i>";
detailBox.setAttribute("role", "button");
detailBox.setAttribute("aria-label", "放大寶石預覽");
detailBox.tabIndex = 0;
$(".stage").append(detailBox);
const detailRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
detailRenderer.toneMapping = THREE.ACESFilmicToneMapping;
detailRenderer.toneMappingExposure = 1;
detailRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
detailRenderer.setSize(180, 180);
detailBox.append(detailRenderer.domElement);
const detailScene = new THREE.Scene(),
  detailCamera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
const detailPMREM = new THREE.PMREMGenerator(detailRenderer),
  detailEnvironment = detailPMREM.fromScene(envScene, 0.03);
detailPMREM.dispose();
detailScene.environment = detailEnvironment.texture;
detailScene.environmentIntensity = 1;
detailScene.add(new THREE.HemisphereLight(0xffffff, 0x51475e, 1.1));
const detailLight = new THREE.DirectionalLight(0xffffff, 3);
detailLight.position.set(3, 4, 6);
detailScene.add(detailLight);
const detailMaterials = [
  new THREE.MeshStandardMaterial({ color: "#b77598", roughness: 0.6, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: "#ffe0ee", roughness: 0.23, metalness: 0.12, flatShading: true }),
];
const detailAssembly = new THREE.Group();
detailScene.add(detailAssembly);
const detailGlue = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 1, 32), mats.wax);
detailAssembly.add(detailGlue);
const detailDop = new THREE.Mesh(
  new THREE.CylinderGeometry(1, 1, 1, 24),
  new THREE.MeshStandardMaterial({ color: "#c7a366", metalness: 0.55, roughness: 0.32 }),
);
detailDop.name = "preview-dop";
detailAssembly.add(detailDop);
const detailCollar = new THREE.Mesh(
  new THREE.CylinderGeometry(1, 1, 1, 24),
  new THREE.MeshStandardMaterial({ color: "#aab5c6", metalness: 0.65, roughness: 0.26 }),
);
detailCollar.name = "preview-quill";
detailAssembly.add(detailCollar);
const detailGem = new THREE.Mesh(new THREE.BufferGeometry(), detailMaterials);
detailAssembly.add(detailGem);
let detailPoseKey = "",
  detailSource = null,
  detailStep = -1,
  detailYaw = 0,
  detailPitch = 0,
  detailLast = performance.now(),
  detailAutoKey = "";
function openDetail(auto = false) {
  if (hold || focusLocked || detailBox.classList.contains("expanded")) return;
  const phase = sequence()[state.step],
    facet = compactCourse() ? phase.batch[state.batchFacet || 0] || phase : phase,
    n = new THREE.Vector3(...facet.normal).applyQuaternion(gem.getWorldQuaternion(new THREE.Quaternion())).normalize();
  detailYaw = Math.atan2(n.x, n.z);
  detailPitch = THREE.MathUtils.clamp(Math.asin(n.y), -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
  detailBox.classList.add("expanded");
  detailBox.classList.toggle("rotate-cue", auto);
  detailBox.setAttribute("aria-expanded", "true");
  detailRenderer.setSize(360, 360);
  detailSource = null;
}
function updateEasyView() {
  if (!document.getElementById("easyBar")) return;
  easyBar.hidden = false;
  detailBox.hidden = false;
  if (hold || focusLocked) detailBox.classList.remove("expanded");
  detailBox.classList.toggle("inspectable", state.inspecting && !focusLocked);
  const detailKey = `${state.runId}:${state.step}:${state.batchFacet || 0}`;
  if (state.inspecting && facetReady() && !focusLocked && detailAutoKey !== detailKey) {
    detailAutoKey = detailKey;
  }
  const actionDock = $("#dockActions") || easyBar;
  if ($("#coachAction").parentElement !== actionDock) actionDock.append($("#coachAction"));
  const phase = sequence()[state.step],
    s = compactCourse() ? phase.batch[state.batchFacet || 0] || phase : phase;
  $("#easyHint").textContent = operator.busy
    ? guideStage()[1]
    : batchTransition
      ? "抬起換面"
      : guideStage()[2] ||
        guidedToolTask()?.hint ||
        (facetReady() ? (hold ? "完成了 · 上提或放手" : "這一面完成了") : "");
  const expanded = detailBox.classList.contains("expanded");
  const detailMoved = false;
  scene.updateMatrixWorld(true);
  const worldQ = gem.getWorldQuaternion(new THREE.Quaternion());
  const poseKey = [
    ...worldQ.toArray(),
    ...camera.position.toArray(),
    state.flip,
    state.index,
    state.angle,
    expanded,
    detailYaw,
    detailPitch,
  ].join(":");
  if (detailSource !== gem.geometry || detailStep !== state.step || detailMoved || detailPoseKey !== poseKey) {
    detailPoseKey = poseKey;
    const geometryChanged = detailSource !== gem.geometry || detailStep !== state.step;
    detailSource = gem.geometry;
    detailStep = state.step;
    detailMaterials[0].color.set(gemstoneColor());
    detailMaterials[1].color.set(gemstoneColor()).lerp(new THREE.Color("#ffffff"), 0.4);
    if (geometryChanged) {
      detailGem.geometry.dispose();
      detailGem.geometry = gem.geometry.clone();
    }
    detailGem.material = faceMaterials;
    bindOptics(detailGem);
    detailGem.geometry.groups.forEach((g, i) => {
      g.materialIndex = facetMaterialIndex(state.faces[i]);
    });
    detailGem.geometry.computeBoundingSphere();
    const sphere = detailGem.geometry.boundingSphere,
      normal = new THREE.Vector3(...s.normal),
      side = new THREE.Vector3()
        .crossVectors(normal, Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0))
        .normalize();
    const shaftSign = state.flip ? -1 : 1,
      attach = Math.max(...state.faces.flat().map((p) => p[1] * shaftSign)),
      rodLength = sphere.radius * 0.95,
      rodRadius = dopDimensions().radius / GEM_SCALE,
      glueHeight = dopDimensions().glue / GEM_SCALE;
    detailDop.scale.set(rodRadius, rodLength, rodRadius);
    detailDop.position.set(0, shaftSign * (attach + glueHeight + rodLength / 2), 0);
    detailCollar.scale.set(rodRadius * 1.45, sphere.radius * 0.32, rodRadius * 1.45);
    detailCollar.position.set(0, shaftSign * (attach + glueHeight + rodLength + sphere.radius * 0.16), 0);
    detailGlue.scale.set(rodRadius * 1.35, glueHeight, rodRadius * 1.35);
    detailGlue.position.set(0, shaftSign * (attach + glueHeight / 2 - 0.002 / GEM_SCALE), 0);
    detailGlue.rotation.z = state.flip ? Math.PI : 0;
    const transferring = ["lift-stone", "turn-stone", "seat-stone"].includes(operator.phase);
    detailDop.visible = detailCollar.visible = detailGlue.visible = !transferring;
    detailAssembly.quaternion.copy(worldQ);
    const center = sphere.center.clone().applyQuaternion(worldQ),
      viewDirection = camera.position.clone().sub(gem.getWorldPosition(new THREE.Vector3())).normalize();
    if (expanded)
      viewDirection.set(
        Math.sin(detailYaw) * Math.cos(detailPitch),
        Math.sin(detailPitch),
        Math.cos(detailYaw) * Math.cos(detailPitch),
      );
    detailCamera.up.copy(camera.up);
    detailCamera.position.copy(center).addScaledVector(viewDirection, sphere.radius * 5.8);
    detailCamera.lookAt(center);
    detailLight.position.copy(detailCamera.position);
    detailRenderer.render(detailScene, detailCamera);
    renderRecovery.detailFrames++;
  }
}
const targetBox = document.createElement("div");
targetBox.id = "targetPreview";
targetBox.hidden = true;
targetBox.setAttribute("role", "dialog");
targetBox.setAttribute("aria-modal", "true");
targetBox.setAttribute("aria-labelledby", "targetPaperTitle");
targetBox.innerHTML =
  '<section class="target-paper"><div class="paper-docline"><span>FACETING SPECIFICATION · REV A</span><span>DWG. NO. 01</span></div><div class="paper-head"><div><h2 id="targetPaperTitle">切割作業圖紙</h2><div class="paper-name"></div></div><div class="paper-stamp">96<br><small>INDEX</small></div></div><div class="paper-gem"><canvas width="360" height="360" aria-label="持續旋轉的目標寶石"></canvas><span class="gem-caption">3D TARGET · CROWN VIEW</span></div><div class="paper-drawings"></div><section class="paper-specs"><div><b>FACET COUNT</b><span id="paperFacetTotal">—</span></div><div><b>CUTTING STEPS</b><span id="paperStepTotal">—</span></div><div><b>ACTIVE ANGLE</b><span id="paperAngle">—</span></div><div><b>INDEX POSITION</b><span id="paperIndex">—</span></div></section><section class="paper-sequence"><b>CUTTING SCHEDULE</b><span>01 INDEX SET</span><span>02 ANGLE LOCK</span><span>03 LOWER QUILL</span><span>04 INSPECT FACET</span></section><section class="paper-notes"><b>NOTES</b><span>GIRDLE ALIGNMENT · TOL. ±0.02 mm</span><span>PAVILION / CROWN REFERENCE · WET LAP ONLY</span></section><button id="beginCraft" class="primary">開始製作</button></section>';
$(".stage").append(targetBox);
let targetAcceptedRun = null;
$("#beginCraft").onclick = () => {
  targetAcceptedRun = state.runId;
  targetBox.hidden = true;
  document.body.classList.remove("target-planning");
  if (state.mode === "course" && !easyLesson() && practiceIssue(state)) guidePanel(["設定"]);
  else $("#mobilePower").focus();
};
function targetSketch(faces, side = false) {
  const axes = side ? [0, 1] : [0, 2],
    points = faces.flat(),
    extent = (k) => [Math.min(...points.map((p) => p[k])), Math.max(...points.map((p) => p[k]))],
    x = extent(axes[0]),
    y = extent(axes[1]),
    scale = 86 / Math.max(x[1] - x[0], y[1] - y[0]),
    cx = (x[0] + x[1]) / 2,
    cy = (y[0] + y[1]) / 2,
    poly = faces
      .map(
        (f) =>
          `<polygon points="${f.map((p) => `${80 + (p[axes[0]] - cx) * scale},${67 - (p[axes[1]] - cy) * scale}`).join(" ")}" fill="none" stroke="currentColor" stroke-width=".55"/>`,
      )
      .join("");
  return `<div class="technical-view"><svg viewBox="0 0 160 150" aria-hidden="true"><path d="M12 67h136M80 9v117" stroke="currentColor" opacity=".22" stroke-dasharray="3 3"/>${poly}<path d="M23 126h114m-114-4v8m114-8v8M25 17h110m-110-4v8m110-4v8" stroke="currentColor" opacity=".7" stroke-width=".6"/><text x="80" y="14" text-anchor="middle" font-size="7">${side ? "PROFILE / A-A" : "TOP VIEW / FACET MAP"}</text><text x="80" y="142" text-anchor="middle" font-size="7">${side ? "DEPTH" : "WIDTH"} · ±0.02 mm</text></svg><small>${side ? "側面剖面與深度" : "俯視切面與定位"}</small></div>`;
}

const paperNote = document.createElement("p");
paperNote.className = "paper-note";
targetBox.querySelector(".paper-notes").append(paperNote);
const targetContext = targetBox.querySelector("canvas").getContext("2d");
let targetPreviewKey = "",
  targetStarted = 0,
  targetLastFrame = 0,
  targetMesh = null,
  targetScene = null,
  targetCamera = null;
function updatePaperDetails() {
  const s = sequence()[state.step],
    faces = fittedPlan(state.design, state.planScale || 1).faces;
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set("paperFacetTotal", `${faces.length} FACETS`);
  set("paperStepTotal", `${sequence().length} STAGES`);
  set("paperAngle", `${s.angle.toFixed(isIntro(state) ? 0 : 1)}°`);
  set("paperIndex", `${String(s.index).padStart(2, "0")} / 96`);
}
everyFrame(updatePaperDetails, 350);
function updateTargetPreview() {
  if (!openingDone || operator.busy || $("#modal").open) {
    targetBox.hidden = true;
    return;
  }
  const now = performance.now(),
    key = state.runId + ":" + state.design + ":" + state.planScale + ":" + gemstoneColor();
  if (key !== targetPreviewKey) {
    targetMesh?.geometry.dispose();
    targetMesh?.material.dispose();
    const faces = fittedPlan(state.design, state.planScale || 1).faces;
    targetScene = new THREE.Scene();
    const geometry = geometryFromFaces(faces),
      mat = opticalMaterial(faces, { color: gemstoneColor(), ior: material().ior });
    targetMesh = new THREE.Mesh(geometry, mat);
    bindOptics(targetMesh);
    geometry.computeBoundingSphere();
    const { center, radius } = geometry.boundingSphere;
    targetMesh.position.copy(center).multiplyScalar(-1);
    const mount = new THREE.Group();
    mount.add(targetMesh);
    mount.rotation.z = 0;
    targetScene.add(mount);
    targetCamera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    targetCamera.position
      .set(0.5, plans[state.design]?.style === "learn" ? 2.4 : 1.25, plans[state.design]?.style === "learn" ? 3 : 3.5)
      .multiplyScalar(radius);
    targetCamera.lookAt(0, 0, 0);
    targetStarted = now;
    targetPreviewKey = key;
    targetLastFrame = 0;
    targetBox.dataset.design = state.design;
    targetBox.dataset.orientation = "crown-up";
    targetBox.querySelector(".paper-name").textContent =
      plans[state.design]?.name || plans[state.design]?.family || "寶石切磨設計";
    targetBox.querySelector(".paper-note").textContent =
      state.rawKind === "intro-angle" ? "這一關學調角度：先對準角度，再下壓磨出切面。" : "從一顆原石，慢慢磨出光芒。";
    targetBox.querySelector(".paper-drawings").innerHTML = targetSketch(faces) + targetSketch(faces, true);
  }
  targetBox.hidden = targetAcceptedRun === state.runId;
  document.body.classList.toggle("target-planning", !targetBox.hidden);
  if (targetBox.hidden || now - targetLastFrame < 70) return;
  const firstTargetFrame = targetLastFrame === 0;
  targetLastFrame = now;
  targetScene.children[0].rotation.y = ((now - targetStarted) / 12000) * Math.PI * 2;
  detailRenderer.render(targetScene, targetCamera);
  targetContext.clearRect(0, 0, 360, 360);
  targetContext.drawImage(detailRenderer.domElement, 0, 0, 360, 360);
  if (firstTargetFrame) targetStarted = performance.now();
  detailRenderer.render(detailScene, detailCamera);
}
// Preserve saved work; assist its setup rather than replacing the stone.
if (easyLesson()) {
  assistIntro();
  carriage.position.y = mastY(state.height);
  headAngle = (state.angle * Math.PI) / 180 + 0.55;
  arm.rotation.z = -headAngle;
  closeSheets();
  updateUI();
  setView("work");
}

function cutterRank(ev) {
  const score = ev.quality * 0.72 + Math.min(1, ev.ratio / 0.28) * 28;
  return score >= 92 ? "GENIUS" : score >= 82 ? "MASTER" : score >= 68 ? "EXPERT" : "NOVICE";
}
function practiceCleared(ev, course) {
  return (
    !(state.damageCount || 0) &&
    (compactCourse() ? state.step === sequence().length - 1 && facetReady() : passLesson(course, state, ev, state.inspectionCount > 0))
  );
}
function practiceResultCard(ev, course) {
  const i = courses.findIndex((c) => c.id === course.id),
    damaged = (state.damageCount || 0) > 0,
    passed = practiceCleared(ev, course),
    hasNext = i + 1 < courses.length,
    rank = course.advanced ? cutterRank(ev) : null;
  if (passed) rememberCard(course, i);
  const heading = damaged ? "這顆有缺角" : passed ? plans[state.design].family : "抬起看看切面";
  const label = damaged ? "切磨太粗暴 · 需要重練" : passed ? "完成" : "再試一次";
  const action = damaged
    ? "重新開始這一關"
    : passed && hasNext
      ? `開始第 ${i + 2} 關`
      : passed
        ? "回到工作台"
        : "繼續研磨";
  const note = damaged ? '<p class="modal-note">下壓過快讓邊角崩落。這顆不會收入收藏，也不能算作通關成品。</p>' : "";
  const stamp = rank && passed ? `<span class="cutter-stamp">${rank}<small>ROYAL CUTTER</small></span>` : "";
  modal(
    `<div class="practice-result collectible-card ${damaged ? "damaged-card" : ""} ${course.advanced ? "advanced-card" : ""}" data-frame="${i < 2 ? "simple" : i < 4 ? "silver" : i < 6 ? "gold" : "prism"}" style="--card-hue:${[174, 334, 38, 211, 267, 189, 246][i] || 246}"><span class="card-edition">泰熙爾札娜 · ${String(i + 1).padStart(2, "0")}</span><span class="practice-label">第 ${i + 1} 關 · ${label}</span>${stamp}<h2>${heading}</h2><div id="resultViewer" class="jewel-viewer"></div>${note}<button id="practiceContinue" class="primary full">${action}</button></div>`,
  );
  jewelViewer($("#resultViewer"), state.faces, {
    polished: damaged || (compactCourse() ? facetReady() : ev.polish >= 0.7),
    fracture: damaged ? Math.max(3, state.damageCount + 2) : 0,
  });
  $("#practiceContinue").onclick = () => {
    if (damaged) startCourse(i);
    else if (passed && hasNext) startCourse(i + 1);
    else $("#modal").close();
  };
  // Closing the card without choosing leaves a clear button for what to do next.
  nextCourseCue.hidden = true;
  if (!passed) return;
  let advancing = false;
  $("#practiceContinue").addEventListener("click", () => (advancing = true), { capture: true });
  $("#modal").addEventListener(
    "close",
    () => {
      if (advancing) return;
      nextCourseCue.innerHTML = hasNext
        ? `<small>這一關完成了</small>開始第 ${i + 2} 關 <span>→</span>`
        : "<small>全部關卡完成</small>選擇關卡 <span>→</span>";
      nextCourseCue.onclick = () => {
        nextCourseCue.hidden = true;
        hasNext ? startCourse(i + 1) : academy();
      };
      nextCourseCue.hidden = false;
    },
    { once: true },
  );
}
// A clean pass of a royal-blueprint level first opens the treasure reveal, then the result card.
function showPracticeResult(ev, course) {
  const level = courses.findIndex((c) => c.id === course.id) + 1,
    passed = compactCourse() && !(state.damageCount || 0) && state.step === sequence().length - 1 && facetReady(),
    fresh = passed ? grantBlueprints(blueprintGrants(level, courses)) : [];
  const show = () => (fresh.length ? blueprintUI.reveal(fresh, () => practiceResultCard(ev, course)) : practiceResultCard(ev, course));
  // Cleared: both apprentices dance and confetti flies for a moment before the card opens.
  if (practiceCleared(ev, course)) {
    apprentice.celebrate();
    pusher.celebrate();
    screenConfetti();
    if (!audioMuted && audioContext?.state === "running") treasureChime(audioContext);
    setTimeout(show, 2800);
  } else show();
}

let previewDrag = null,
  previewDidDrag = false;
detailBox.addEventListener("pointerdown", (e) => {
  if (!detailBox.classList.contains("expanded") || focusLocked || hold) return;
  e.preventDefault();
  e.stopPropagation();
  detailBox.classList.remove("rotate-cue");
  previewDidDrag = false;
  previewDrag = { x: e.clientX, y: e.clientY, yaw: detailYaw, pitch: detailPitch };
  detailBox.setPointerCapture(e.pointerId);
});
detailBox.addEventListener("pointermove", (e) => {
  if (!previewDrag) return;
  e.preventDefault();
  e.stopPropagation();
  const dx = e.clientX - previewDrag.x,
    dy = e.clientY - previewDrag.y;
  if (Math.hypot(dx, dy) > 4) {
    previewDidDrag = true;
    detailBox.classList.remove("rotate-cue");
  }
  detailYaw = previewDrag.yaw - dx * 0.012;
  detailPitch = THREE.MathUtils.clamp(previewDrag.pitch + dy * 0.012, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
});
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
  detailBox.addEventListener(ev, () => {
    previewDrag = null;
  });

$("#grind").setAttribute("aria-label", "研磨手勢區：從這裡往下滑動，放手抬起");
const handHint = document.createElement("span");
handHint.className = "hand-hint";
handHint.innerHTML =
  '<svg viewBox="0 0 48 64" aria-hidden="true"><path d="M18 34V12a4 4 0 0 1 8 0v19-9a4 4 0 0 1 7 0v11-6a4 4 0 0 1 7 0v17c0 9-5 14-13 14-6 0-10-3-13-8L7 39a4 4 0 0 1 6-5l5 7M24 2v-1M5 15l5 2M38 10l4-3"/></svg><span>往下壓</span><span class="hand-arrow">↓</span>';
$("#grind").append(handHint);

function playCompletionCue() {
  if (audioMuted || !audioContext || audioContext.state !== "running") return;
  const t = audioContext.currentTime;
  for (const [offset, hz] of [
    [0, 660],
    [0.13, 880],
  ]) {
    const tone = audioContext.createOscillator(),
      level = audioContext.createGain();
    tone.type = "sine";
    tone.frequency.value = hz;
    level.gain.setValueAtTime(0, t + offset);
    level.gain.linearRampToValueAtTime(0.095, t + offset + 0.015);
    level.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.24);
    tone.connect(level).connect(audioContext.destination);
    tone.start(t + offset);
    tone.stop(t + offset + 0.26);
    tone.onended = () => {
      tone.disconnect();
      level.disconnect();
    };
  }
}

function guidedToolTask() {
  if (isIntro(state)) return null;
  const s = sequence()[state.step];
  if (state.flip !== s.flip)
    return {
      kind: "transfer",
      title: "珠寶換邊重黏",
      hint: "把珠寶換到另一支黏石棒，讓下一面朝向磨盤",
      action: "珠寶換邊重黏",
    };
  if (state.lap !== s.lap) {
    const name = { cut: "粗磨盤 #600", fine: "細磨盤 #3000", polish: "拋光盤" }[s.lap];
    return { kind: "lap", title: "更換磨盤", hint: `換成${name}`, action: "更換磨盤" };
  }
  if (!state.water && s.lap !== "polish")
    return { kind: "water", title: "開啟滴水", hint: "讓磨盤保持濕潤", action: "開啟滴水" };
  return null;
}
function runGuidedTool() {
  if (operator.busy) return;
  const task = guidedToolTask();
  if (!task || hold || focusLocked) return;
  if (state.power) {
    $("#power").click();
    return;
  }
  if (motorSpeed > 10) return;
  const s = sequence()[state.step];
  if (task.kind === "transfer") $("#transfer").click();
  else if (task.kind === "lap") {
    $("#lap").value = s.lap;
    $("#lap").dispatchEvent(new Event("change"));
  } else $("#water").click();
  closeSheets();
  updateUI();
  persist();
  if (
    !operator.busy &&
    !guidedToolTask() &&
    !easyLesson() &&
    sequence()[state.step].lap === "cut" &&
    practiceIssue(state)
  )
    guidePanel(["設定"]);
}
function wheelGrinding(e) {
  e.preventDefault();
  if (e.deltaY === 0) return;
  if (!hold) {
    if (e.deltaY < 0) return;
    beginGrinding({ preventDefault() {}, clientY: 0, timeStamp: performance.now(), currentTarget: $("#grind") });
    if (!hold) return;
  }
  const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
  if (
    ["challenge", "exam", "contest"].includes(state.mode) &&
    state.lap === "cut" &&
    leverTravel >= 1 &&
    contactFelt &&
    contact > 0.96 &&
    delta > 0
  ) {
    state.height = Math.max(45, state.height - Math.min(delta, 120) * 0.005);
    $("#height").value = state.height.toFixed(2);
  }
  leverTravel = THREE.MathUtils.clamp(leverTravel + delta / 160, 0, 1.5);
  pressure = leverResponse(leverTravel).pressure;
  if (leverTravel < 0.08) {
    pendingInspection = true;
    leverPointerActive = false;
    stop();
  }
}
$("#grind").addEventListener("wheel", wheelGrinding, { passive: false });
if (matchMedia("(pointer:fine)").matches) {
  $(".hand-hint>span").textContent = "按住下拖";
  $("#grind").setAttribute("aria-label", "按住滑鼠往下拖曳，或滾輪往下研磨、往上抬起");
}

renderer.domElement.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button === 0 && !document.body.classList.contains("adjusting-face"))
    beginGrinding(e);
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse") moveGrinding(e);
});
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
  renderer.domElement.addEventListener(ev, (e) => {
    if (e.pointerType === "mouse") releaseGrinding();
  });
renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    if (!document.body.classList.contains("adjusting-face")) wheelGrinding(e);
  },
  { passive: false },
);
function settingInstruction(field) {
  const s = sequence()[state.step];
  return {
    angle: {
      name: "角度",
      goal: `${s.angle.toFixed(isIntro(state) ? 0 : 1)}°`,
      hint: "轉動旋鈕，對準角度",
      ready: Math.abs(state.angle - s.angle) <= 0.051,
    },
    index: { name: "齒位", goal: String(s.index), hint: "轉動旋鈕，對準齒位", ready: state.index === s.index },
    height: {
      name: "高度",
      goal: Number(s.targetHeight.toFixed(2)) + " mm",
      hint: "轉動旋鈕，調到接觸高度",
      ready: Math.abs(state.height - Number(s.targetHeight.toFixed(2))) <= 0.011,
    },
  }[field];
}
function manualCourseGuide() {
  const issue = practiceIssue(state),
    open = document.body.classList.contains("adjusting-face"),
    field = open ? activeSetupField : issue?.field,
    setting = settingInstruction(field);
  if (open && setting) {
    if (!setting.ready) return ["設定中", `${faceTitle()} · ${setting.name} ${setting.goal}`, setting.hint, ""];
    const next = settingInstruction(issue?.field);
    return next
      ? ["設定下一項", `${setting.name}已對準`, `接著調${next.name} ${next.goal}`, "下一項：" + next.name]
      : ["設定完成", "設定完成", "回工作台，往下拖曳研磨", "回工作台"];
  }
  if (issue && setting)
    return ["設定", `${faceTitle()} · ${setting.name} ${setting.goal}`, setting.hint, "調" + setting.name];
  if (!state.power) return ["開機", faceTitle(), "② 點亮左下電源圖示，再往下拖曳研磨", "開機"];
  if (facetReady() && state.inspecting)
    return [
      state.step === sequence().length - 1 ? "成品" : isIntro(state) ? "入門下一步" : "繼續",
      "這一面完成了",
      "",
      state.step === sequence().length - 1 ? "欣賞作品" : "下一面",
    ];
  return [
    "研磨",
    faceTitle(),
    facetReady()
      ? "已到位，上提或放手"
      : matchMedia("(pointer:fine)").matches
        ? "在工作台按住滑鼠往下拖"
        : "往下滑動研磨",
    "",
  ];
}

// Context loss can happen on memory-constrained phones; never keep cutting blind.
function watchRenderer(r, name, restore) {
  const canvas = r.domElement,
    extension = r.getContext().getExtension("WEBGL_lose_context");
  let retry = null,
    fallback = null;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    renderRecovery.losses++;
    renderRecovery.lost.add(name);
    leverPointerActive = false;
    pendingInspection = false;
    stop();
    state.power = false;
    contact = 0;
    focusLocked = false;
    document.body.classList.remove("grinding-focus");
    for (const node of [gain, noiseGain, motorOvertoneGain])
      if (node && audioContext) node.gain.setTargetAtTime(0, audioContext.currentTime, 0.02);
    persist();
    $("#loadError").textContent = "畫面恢復中 · 進度已保留";
    $("#loadError").hidden = false;
    retry = setTimeout(() => {
      try {
        extension?.restoreContext();
      } catch {}
    }, 250);
    fallback = setTimeout(() => {
      if (!renderRecovery.lost.has(name)) return;
      let canReload = false;
      try {
        const last = Number(sessionStorage.getItem("facet-render-reload") || 0);
        canReload = Date.now() - last > 60000;
        if (canReload) sessionStorage.setItem("facet-render-reload", String(Date.now()));
      } catch {}
      if (canReload) {
        persist();
        location.reload();
      } else {
        $("#loadError").textContent = "進度已保留 · 點此恢復畫面";
        $("#loadError").onclick = () => location.reload();
      }
    }, 8000);
  });
  canvas.addEventListener("webglcontextrestored", () => {
    clearTimeout(retry);
    clearTimeout(fallback);
    restore();
    renderRecovery.lost.delete(name);
    renderRecovery.restores++;
    if (!renderRecovery.lost.size) {
      $("#loadError").hidden = true;
      $("#loadError").onclick = null;
      updateUI();
    }
  });
}
watchRenderer(renderer, "workbench", () => {
  refreshEnvironment();
  key.shadow.map?.dispose();
  key.shadow.map = null;
  key.shadow.needsUpdate = true;
  rebuild();
  resize();
});
watchRenderer(detailRenderer, "detail", () => {
  detailSource = null;
  detailStep = -1;
  targetPreviewKey = "";
});
window.addEventListener("pageshow", () => {
  resize();
  detailSource = null;
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    resize();
    detailSource = null;
  }
});

const dockActions = document.createElement("div");
dockActions.id = "dockActions";
easyBar.append(dockActions);
const mainMenu = document.createElement("button");
mainMenu.id = "mainMenu";
mainMenu.innerHTML =
  '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3 5h18M3 12h18M3 19h18" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
mainMenu.setAttribute("aria-label", "開啟遊戲選單");
$(".stage").append(mainMenu);
dockActions.append($("#mobileSettings"), $("#mobilePower"), $("#coachAction"));
$("#mobileSettings").textContent = "調整";
mainMenu.onclick = () => {
  modal(
    `<h2>選單</h2><div class="game-menu"><button id="menuCourses">選擇關卡</button><button id="menuCards">收藏牌卡</button>${!easyLesson() ? '<button id="menuAdjust">調整機台</button>' : ""}${document.fullscreenEnabled ? '<button id="menuFullscreen">全螢幕</button>' : ""}</div>`,
  );
  $("#menuCourses").onclick = academy;
  $("#menuCards").onclick = () => cardCollection();
  if ($("#menuAdjust"))
    $("#menuAdjust").onclick = () => {
      $("#modal").close();
      guidePanel(["設定"]);
    };
  if ($("#menuFullscreen"))
    $("#menuFullscreen").onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.().catch(() => {});
      $("#modal").close();
    };
};

detailBox.addEventListener("click", (e) => {
  if (hold || focusLocked) return;
  e.stopPropagation();
  if (previewDidDrag) {
    previewDidDrag = false;
    return;
  }
  openDetail(false);
});
detailBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    detailBox.click();
  }
});
let suppressPreviewClick = false;
document.addEventListener(
  "click",
  (e) => {
    if (suppressPreviewClick) {
      suppressPreviewClick = false;
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true,
);
document.addEventListener(
  "pointerdown",
  (e) => {
    if (detailBox.classList.contains("expanded") && !detailBox.contains(e.target)) {
      detailBox.classList.remove("expanded", "rotate-cue");
      previewDrag = null;
      previewDidDrag = false;
      detailBox.setAttribute("aria-expanded", "false");
      detailRenderer.setSize(180, 180);
      detailSource = null;
      suppressPreviewClick = true;
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true,
);
const lapBadge = document.createElement("span");
lapBadge.id = "lapBadge";
$(".mobile-context").append(lapBadge);
updateLapAppearance();

function sameIntroNext() {
  if (!isIntro(state)) return false;
  const seq = sequence(),
    s = seq[state.step],
    n = seq[state.step + 1];
  return Boolean(n && s.lap === "cut" && n.lap === "cut" && s.angle === n.angle && s.flip === n.flip);
}
// Same-angle continuation is truly continuous: never arm the old lift-and-release routine.
function armAutoContinuation() {
  autoArmed = false;
  armedAdvance = false;
  autoBatchRun = false;
  autoIntroRun = false;
  autoIntroNext = null;
  updateCoach();
}
function tickIntroAutomation(now) {
  if (isIntro(state) && continueHeldGrinding()) return;
  if (autoArmed && armedAdvance && !hold && !focusLocked && state.inspecting) {
    if (state.batchPause) {
      state.batchFacet = state.batchNext;
      state.batchPause = false;
      state.batchNext = null;
      assistBatch();
    } else $("#nextStep").click();
    armedAdvance = false;
    setupInspect(true);
    updateUI();
    return;
  }
  if (document.hidden || $("#modal").open || !leverPointerActive) {
    autoIntroRun = false;
    autoIntroNext = null;
    return;
  }
  if (autoIntroNext !== null && !hold && !focusLocked && state.inspecting) {
    autoIntroNext = null;
    autoIntroRun = false;
    $("#nextStep").click();
    setupInspect(false);
    beginGrinding({ preventDefault() {}, clientY: 0, timeStamp: now, currentTarget: $("#grind") });
    leverTravel = 1;
    autoIntroRun = hold;
    autoFacetStart = now;
    return;
  }
  if (!autoIntroRun || !hold || !facetReady() || now - autoFacetStart < 1000) return;
  if (sameIntroNext()) autoIntroNext = state.step + 1;
  else {
    autoIntroRun = false;
    playCompletionCue();
  }
  pendingInspection = true;
  stop();
}

const entryScreen = document.createElement("section");
entryScreen.id = "entryScreen";
entryScreen.setAttribute("aria-label", "遊戲入口");
entryScreen.innerHTML = `<video class="entry-video" src="images/waiting-loop.mp4" poster="images/royal-workshop-cover.png" autoplay muted loop playsinline aria-hidden="true"></video><div class="entry-content"><span class="entry-eyebrow">ROYAL JEWEL ATELIER</span><h1>泰熙爾札娜</h1><h2>珠寶切磨工坊</h2><p>皇室工匠</p><button id="enterWorkshop">從第一關開始 <span>→</span></button><button id="entryCourses">選擇關卡</button><button id="entryCards">收藏牌卡</button></div>`;
document.body.append(entryScreen);
document.body.classList.add("cinematic");
$("#enterWorkshop").onclick = () => startCourse(0);
$("#entryCourses").onclick = academy;
$("#entryCards").onclick = () => cardCollection();

const gestureCue = document.createElement("div");
gestureCue.id = "gestureCue";
gestureCue.setAttribute("role", "button");
gestureCue.setAttribute("aria-label", "按住往下拖動研磨");
gestureCue.innerHTML =
  '<svg viewBox="0 0 48 94" aria-hidden="true"><circle class="press-ring" cx="24" cy="18" r="13"/><circle class="drag-dot" cx="24" cy="18" r="5"/><path class="drag-path" d="M24 36v43m-9-9 9 10 9-10"/></svg>';
$(".stage").append(gestureCue);
gestureCue.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  beginGrinding(e);
});
gestureCue.addEventListener("pointermove", moveGrinding);
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  gestureCue.addEventListener(event, releaseGrinding);
function updateGestureCue() {
  const visible = openingDone && !entryAwaiting && !operator.busy && !$("#modal").open && (!facetReady() || autoArmed);
  gestureCue.style.opacity = visible ? (hold ? ".25" : "1") : "0";
  gestureCue.style.pointerEvents = visible ? "auto" : "none";
  if (!visible) return;
  arm.updateWorldMatrix(true, false);
  const point = arm.localToWorld(new THREE.Vector3(0, -0.7, 0)).project(camera),
    box = renderer.domElement.getBoundingClientRect(),
    stage = $(".stage").getBoundingClientRect();
  gestureCue.style.left =
    Math.max(8, Math.min(stage.width - 60, box.left - stage.left + ((point.x + 1) * box.width) / 2 + 18)) + "px";
  gestureCue.style.top =
    Math.max(85, Math.min(stage.height - 160, box.top - stage.top + ((1 - point.y) * box.height) / 2 - 35)) + "px";
}

function lastVisit() {
  try {
    return JSON.parse(localStorage.getItem("facet-last-played") || "null") || previousVisit;
  } catch {
    return previousVisit;
  }
}
function rememberCard(course, i) {
  profile.cards ||= [];
  const card = {
    courseId: course.id,
    level: i + 1,
    runId: state.runId || String(state.seed),
    design: state.design,
    materialId: state.materialId || "glass",
    color: gemstoneColor(),
    faces: structuredClone(state.faces),
    createdAt: Date.now(),
  };
  const at = profile.cards.findIndex((c) => c.courseId === course.id);
  if (at >= 0) profile.cards[at] = card;
  else profile.cards.push(card);
  saveProfile();
}
function collectedCards() {
  return courses.flatMap((course, i) => {
    const card = profile.cards?.find((c) => c.courseId === course.id);
    if (card?.faces?.length) return [card];
    if (!profile.completed.includes(course.id)) return [];
    const design = course.design || "single";
    return [
      {
        courseId: course.id,
        level: i + 1,
        design,
        materialId: course.material,
        faces: fittedPlan(design, 1).faces,
        legacy: true,
      },
    ];
  });
}
function cardCollection(index = 0) {
  const cards = collectedCards();
  if (!cards.length) {
    modal(
      '<h2>收藏牌卡</h2><p>完成一關，就能收藏會旋轉的寶石牌卡。</p><button id="cardsChoose" class="primary full">選擇關卡</button>',
    );
    $("#cardsChoose").onclick = academy;
    return;
  }
  index = Math.max(0, Math.min(cards.length - 1, index));
  const card = cards[index],
    i = card.level - 1;
  modal(
    `<div class="practice-result collectible-card" data-frame="${i < 2 ? "simple" : i < 4 ? "silver" : i < 6 ? "gold" : "prism"}" style="--card-hue:${[174, 334, 38, 211, 267, 189, 246][i] || 246}"><span class="card-edition">泰熙爾札娜 · ${String(card.level).padStart(2, "0")}</span><span class="practice-label">第 ${card.level} 關 · ${card.legacy ? "通關紀念" : "我的作品"}</span><h2>${plans[card.design].family}</h2><div id="resultViewer" class="jewel-viewer"></div><div class="card-pager"><button id="cardPrev" aria-label="上一張" ${index === 0 ? "disabled" : ""}>←</button><span>${index + 1} / ${cards.length}</span><button id="cardNext" aria-label="下一張" ${index === cards.length - 1 ? "disabled" : ""}>→</button></div><button id="cardReplay" class="primary full">重玩第 ${card.level} 關</button></div>`,
  );
  jewelViewer($("#resultViewer"), card.faces, {
    polished: true,
    materialId: card.materialId,
    displayColor: card.color,
    displayDesign: card.design,
  });
  $("#cardPrev").onclick = () => cardCollection(index - 1);
  $("#cardNext").onclick = () => cardCollection(index + 1);
  $("#cardReplay").onclick = () => startCourse(i);
}

const daylightReadout = document.createElement("style");
daylightReadout.textContent =
  "body .stage .mobile-context,body .stage .mobile-context span,body .stage #mobileAngle,body .stage #mobileFacet,body .stage #lapBadge{color:#27233d!important;text-shadow:0 1px 0 #fff8,0 0 8px #fff8!important;font-weight:700}";
document.head.append(daylightReadout);
const cdPlayer = wallCD({ scene, stage: $(".stage") });
const royalMachine = buildRoyalMachine();
machine.add(royalMachine);
// Royal (advanced) levels: gold trim, dark base and the royal suite; synced only when the level type changes.
let royalShown = null;
function syncRoyalTheme() {
  const royal = Boolean(state.advanced);
  if (royal === royalShown) return;
  royalShown = royal;
  royalSuite.visible = royalMachine.visible = royal;
  mats.base.color.set(royal ? "#31323a" : "#e1dfd5");
  mats.metal.color.set(royal ? "#bca46f" : "#c9cdd3");
  mats.brass.color.set(royal ? "#d2a952" : "#b59a63");
}
syncRoyalTheme();
everyFrame(syncRoyalTheme);
// The canvas is for looking around. Grinding starts only from the dedicated down-press control.
for (const event of ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"])
  renderer.domElement.addEventListener(
    event,
    (e) => {
      if (e.pointerType === "mouse") e.stopImmediatePropagation();
    },
    true,
  );
// Camera: two fingers pinch to zoom from the bench overview to the stone and drag to orbit (±90° sideways, pitch limited).
// One finger (or the left mouse button) anywhere on the scene pulls the lever down. Mouse: right-drag orbits, trackpad pinch zooms.
// Players start on the far bench view; zooming in is their own choice.
const camRig = { zoom: 0, yaw: 0, pitch: 0.36 };
try {
  Object.assign(camRig, JSON.parse(localStorage.getItem("facet-camera-v2") || "{}"));
} catch {}
const camLive = { ...camRig },
  CAM_YAW = -0.326,
  YAW_LIMIT = Math.PI / 2,
  PITCH_MIN = 0.1,
  PITCH_MAX = 1.2;
function clampCamRig() {
  camRig.zoom = THREE.MathUtils.clamp(camRig.zoom, 0, 1);
  camRig.yaw = THREE.MathUtils.clamp(camRig.yaw, -YAW_LIMIT, YAW_LIMIT);
  camRig.pitch = THREE.MathUtils.clamp(camRig.pitch, PITCH_MIN, PITCH_MAX);
}
function saveCamRig() {
  try {
    localStorage.setItem("facet-camera-v2", JSON.stringify(camRig));
  } catch {}
}
clampCamRig();
Object.assign(camLive, camRig);
const benchTarget = new THREE.Vector3(0.35, 1.25, 0.1),
  stoneFocus = new THREE.Vector3(),
  camTarget = new THREE.Vector3();
let stoneFocusReady = false,
  stoneRadius = 0,
  stoneRadiusRun = null,
  stoneRadiusFaces = null,
  adjustBlend = 0,
  adjustField = "angle",
  adjustTargetReady = false;
const adjustTarget = new THREE.Vector3();
const adjustParts = {
  angle: { object: dial, offset: new THREE.Vector3(0.5, 0.45, 2.3) },
  index: { object: indexWheel, offset: new THREE.Vector3(0.5, 1.05, 1.85) },
  height: { object: knob, offset: new THREE.Vector3(1.9, 0.5, 1.3) },
};
function frameCamera(dt) {
  if (!openingDone || entryAwaiting) {
    stoneFocusReady = false;
    openingCamera();
    return;
  }
  controls.enabled = false;
  const e = 1 - Math.exp(-10 * dt);
  for (const k of ["zoom", "yaw", "pitch"]) camLive[k] += (camRig[k] - camLive[k]) * e;
  // Frame the stone by its starting size for the whole run, so grinding never changes how big it looks.
  if (stoneRadiusRun !== state.runId) {
    stoneRadiusRun = state.runId;
    stoneRadius = 0;
  }
  if (stoneRadiusFaces !== state.faces) {
    stoneRadiusFaces = state.faces;
    for (const p of state.faces.flat()) stoneRadius = Math.max(stoneRadius, Math.hypot(...p));
  }
  scene.updateMatrixWorld(true);
  const center = gem.getWorldPosition(new THREE.Vector3());
  if (!stoneFocusReady) {
    stoneFocus.copy(center);
    stoneFocusReady = true;
  } else stoneFocus.lerp(center, 1 - Math.exp(-6 * dt));
  const tanHalf = Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect),
    near = Math.max(1.2, ((stoneRadius * GEM_SCALE) / tanHalf) * 1.7),
    far = 13.2 * THREE.MathUtils.clamp(0.8 / camera.aspect, 1, 1.35),
    z = camLive.zoom,
    s = z * z * (3 - 2 * z),
    dist = Math.exp(THREE.MathUtils.lerp(Math.log(far), Math.log(near), z)),
    yaw = CAM_YAW + camLive.yaw,
    pitch = camLive.pitch;
  camTarget.lerpVectors(benchTarget, stoneFocus, s);
  camera.position.set(
    camTarget.x + Math.sin(yaw) * Math.cos(pitch) * dist,
    camTarget.y + Math.sin(pitch) * dist,
    camTarget.z + Math.cos(yaw) * Math.cos(pitch) * dist,
  );
  // While a setting is open, glide to the real part on the machine: the angle dial, the index wheel or the height knob.
  const adjusting = document.body.classList.contains("adjusting-face");
  adjustBlend += ((adjusting ? 1 : 0) - adjustBlend) * (1 - Math.exp(-5 * dt));
  if (adjusting) adjustField = activeSetupField || adjustField || "angle";
  if (adjustBlend > 0.001) {
    const part = adjustParts[adjustField] || adjustParts.angle,
      p = part.object.getWorldPosition(new THREE.Vector3()),
      b = adjustBlend * adjustBlend * (3 - 2 * adjustBlend);
    adjustTarget.lerp(p, adjustTargetReady ? 1 - Math.exp(-6 * dt) : 1);
    adjustTargetReady = true;
    camera.position.lerp(adjustTarget.clone().add(part.offset), b);
    camTarget.lerp(adjustTarget, b);
  } else adjustTargetReady = false;
  if (camera.position.y < 0.35) camera.position.y = 0.35;
  controls.target.copy(camTarget);
  camera.lookAt(camTarget);
}
const canvasEl = renderer.domElement,
  camPointers = new Map();
let camGesture = null;
function gestureSnapshot() {
  const pts = [...camPointers.values()],
    mx = pts.reduce((a, p) => a + p.x, 0) / pts.length,
    my = pts.reduce((a, p) => a + p.y, 0) / pts.length,
    d = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
  return { mx, my, d, zoom: camRig.zoom, yaw: camRig.yaw, pitch: camRig.pitch };
}
function cancelLever() {
  if (!hold) return;
  leverTravel = 0;
  pressure = 0;
  releaseGrinding();
}
document.addEventListener(
  "pointerdown",
  (e) => {
    if (e.target !== canvasEl || document.body.classList.contains("adjusting-face") || $("#modal").open) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    camPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      canvasEl.setPointerCapture(e.pointerId);
    } catch {}
    const orbitButton = e.pointerType === "mouse" && (e.button === 2 || e.shiftKey);
    if (camPointers.size >= 2 || orbitButton) {
      if (camGesture?.mode === "pending") clearTimeout(camGesture.timer);
      else if (camGesture?.mode !== "view") cancelLever();
      camGesture = { mode: "view", ...gestureSnapshot() };
      return;
    }
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // A finger waits a moment (or a few pixels of travel) before taking the lever, so a pinch's first finger never starts the motor.
    const startLever = () => {
      if (camGesture?.mode !== "pending") return;
      clearTimeout(camGesture.timer);
      const p = camGesture.start;
      camGesture = { mode: "lever" };
      beginGrinding({
        preventDefault() {},
        clientX: p.x,
        clientY: p.y,
        timeStamp: performance.now(),
        currentTarget: canvasEl,
      });
    };
    if (e.pointerType === "mouse") {
      camGesture = { mode: "pending", start: { x: e.clientX, y: e.clientY } };
      startLever();
      return;
    }
    camGesture = {
      mode: "pending",
      start: { x: e.clientX, y: e.clientY },
      timer: setTimeout(startLever, 90),
      startLever,
    };
  },
  true,
);
document.addEventListener(
  "pointermove",
  (e) => {
    if (!camPointers.has(e.pointerId)) return;
    e.stopImmediatePropagation();
    camPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (
      camGesture?.mode === "pending" &&
      Math.hypot(e.clientX - camGesture.start.x, e.clientY - camGesture.start.y) > 6
    )
      camGesture.startLever();
    if (camGesture?.mode === "lever") {
      moveGrinding(e);
      return;
    }
    if (camGesture?.mode !== "view") return;
    const g = gestureSnapshot(),
      start = camGesture;
    if (start.d && g.d) camRig.zoom = start.zoom + Math.log(g.d / start.d) * 1.1;
    camRig.yaw = start.yaw - (g.mx - start.mx) * 0.008;
    camRig.pitch = start.pitch + (g.my - start.my) * 0.006;
    clampCamRig();
  },
  true,
);
function endCamPointer(e) {
  if (!camPointers.has(e.pointerId)) return;
  e.stopImmediatePropagation();
  camPointers.delete(e.pointerId);
  if (camGesture?.mode === "pending") {
    clearTimeout(camGesture.timer);
    camGesture = null;
    return;
  }
  if (camGesture?.mode === "lever") {
    camGesture = null;
    releaseGrinding();
    return;
  }
  if (camGesture?.mode === "view") {
    if (camPointers.size) camGesture = { mode: "view", ...gestureSnapshot() };
    else {
      camGesture = null;
      saveCamRig();
    }
  }
}
for (const ev of ["pointerup", "pointercancel"]) document.addEventListener(ev, endCamPointer, true);
canvasEl.addEventListener("contextmenu", (e) => e.preventDefault());
canvasEl.style.touchAction = "none";
// Trackpad pinch arrives as ctrl+wheel; plain wheel keeps lowering and lifting the lever.
canvasEl.addEventListener(
  "wheel",
  (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    camRig.zoom -= e.deltaY * 0.01;
    clampCamRig();
    saveCamRig();
  },
  { capture: true, passive: false },
);
// Holding the lever carries straight on to the next stage at its new angle when no flip or lap change is needed.
function continueHeldGrinding() {
  if (!hold || !state.power || state.inspecting || operator.busy || !facetReady()) return false;
  const seq = sequence(),
    s = seq[state.step],
    n = seq[state.step + 1];
  if (!n || s.lap !== "cut" || n.lap !== "cut" || s.flip !== n.flip || (compactCourse() && !n.batch?.length))
    return false;
  state.step++;
  inspectedStep = -1;
  autoIntroRun = false;
  autoIntroNext = null;
  if (compactCourse()) {
    state.batchFacet = 0;
    state.batchTime = 0;
    state.batchDone = false;
    state.batchPause = false;
    state.batchNext = null;
    batchTransition = null;
  }
  // assistIntro only loads the new depth on manual levels; the angle and index must move with it or the old angle cuts far too deep.
  assistIntro();
  if (!compactCourse()) {
    state.angle = state.angleDrive = n.angle;
    state.index = n.index;
  }
  updateUI();
  persist();
  return true;
}
// Assisted cutting used to log every frame; keep one entry per facet so saves and step checks stay fast.
function compactAssistLog() {
  const log = state.log,
    n = log.length;
  if (n < 2) return;
  const a = log[n - 2],
    b = log[n - 1];
  if (a.assisted && b.assisted && a.type === b.type && a.step === b.step && a.facet === b.facet && a.lap === b.lap)
    log.splice(n - 2, 1);
}
function performGuidedTool() {
  if (operator.busy || hold || focusLocked || !guidedToolTask()) return;
  if (state.power || motorSpeed > 10) {
    pendingToolRun = true;
    if (state.power) $("#power").click();
    updateCoach();
    return;
  }
  pendingToolRun = false;
  runGuidedTool();
}
everyFrame(() => {
  if (!pendingToolRun) return;
  if (state.power || !guidedToolTask()) {
    pendingToolRun = false;
    updateCoach();
    return;
  }
  if (motorSpeed <= 10 && !operator.busy && !hold && !focusLocked) {
    pendingToolRun = false;
    performGuidedTool();
    updateCoach();
  }
}, 100);
// Drop render resolution while frames are slow, and restore it once they recover.
const sharpestPixelRatio = Math.min(devicePixelRatio, 1.5);
let livePixelRatio = sharpestPixelRatio,
  frameSamples = [],
  lastFrameAt = 0;
everyFrame((t) => {
  if (document.hidden || !lastFrameAt) {
    lastFrameAt = t;
    return;
  }
  frameSamples.push(t - lastFrameAt);
  lastFrameAt = t;
  if (frameSamples.length < 45) return;
  const avg = frameSamples.reduce((a, b) => a + b, 0) / frameSamples.length;
  frameSamples = [];
  const next =
    avg > 24
      ? Math.max(0.75, livePixelRatio - 0.25)
      : avg < 13
        ? Math.min(sharpestPixelRatio, livePixelRatio + 0.25)
        : livePixelRatio;
  if (next !== livePixelRatio) {
    livePixelRatio = next;
    renderer.setPixelRatio(next);
    resize();
  }
});
// Blender-rendered studio HDRI (blender/studio_hdri.py): gem reflections, metal reflections and the ray-traced previews all see the same room.
function applyStudio() {
  if (!studioHDR) return;
  const pm = new THREE.PMREMGenerator(renderer),
    target = pm.fromEquirectangular(studioHDR);
  pm.dispose();
  environmentTarget?.dispose();
  environmentTarget = target;
  scene.environment = target.texture;
  scene.environmentIntensity = 0.55;
  faceMaterials.forEach((m) => {
    if (m.isMeshPhysicalMaterial) {
      m.envMap = target.texture;
      m.needsUpdate = true;
    }
  });
  const dm = new THREE.PMREMGenerator(detailRenderer);
  detailScene.environment = dm.fromEquirectangular(studioHDR).texture;
  dm.dispose();
}
new RGBELoader().load(
  "env/studio.hdr",
  (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    studioHDR = t;
    setOpticalEnvironment(t, 1.9);
    applyStudio();
  },
  undefined,
  () => {},
);
// Blender-built atelier (blender/workshop_room.py): baked colour + occlusion replaces the block room once it loads.
const keepProcedural = new Set(["royal-suite", "window-daylight", "lamp-diffuser"]);
new GLTFLoader().load(
  "models/workshop.glb",
  (gltf) => {
    const model = gltf.scene;
    model.name = "workshop-model";
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const m = o.material;
      if (o.name.includes("bench")) {
        m.roughness = 0.6;
        m.color.setScalar(0.64);
      } else if (o.name.includes("room")) {
        m.roughness = 0.88;
        m.color.setScalar(0.9);
        o.castShadow = false;
      }
      if (m.map) m.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    });
    for (const child of workshop.children) if (!keepProcedural.has(child.name)) child.visible = false;
    const sky = workshop.getObjectByName("window-daylight");
    sky.position.set(0.7, 2.8, -4.8);
    sky.scale.set(1.06, 1.09, 1);
    workshop.add(model);
    scene.getObjectByName("wall-mounted-cd-player")?.position.setX(4.55);
  },
  undefined,
  () => {},
);
// Blender machine housing (blender/machine_base.py) replaces the static block parts; the lap, mast, arm and switch stay live.
new GLTFLoader().load(
  "models/machine-base.glb",
  (gltf) => {
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      const name = o.material.name;
      if (mats[name]) o.material = mats[name];
    });
    const near = (o, x, y, z) =>
      Math.abs(o.position.x - x) < 0.01 && Math.abs(o.position.y - y) < 0.01 && Math.abs(o.position.z - z) < 0.01;
    for (const o of machine.children) {
      if (!o.isMesh) continue;
      const g = o.geometry,
        p = g.parameters || {};
      if (
        g.type === "ExtrudeGeometry" ||
        (g.type === "TorusGeometry" && [1.53, 1.46].includes(p.radius)) ||
        (g.type === "CylinderGeometry" &&
          ((p.radiusTop === 0.18 && near(o, o.position.x, 0.1, o.position.z)) ||
            (p.radiusTop === 1.58 && near(o, -0.65, 0.57, 0)) ||
            (p.radiusTop === 1.5 && near(o, -0.65, 0.7, 0)))) ||
        (g.type === "BoxGeometry" && ((p.width === 2.4 && p.depth === 0.55) || (p.width === 2.3 && p.depth === 0.018)))
      )
        o.visible = false;
    }
    machine.add(gltf.scene);
  },
  undefined,
  () => {},
);

// Each finished pass on the lap gives the magnifier a small pulse, so players notice they can check the stone there.
let passTouched = false;
everyFrame(() => {
  if (hold && contactFelt) passTouched = true;
  else if (!hold && passTouched) {
    passTouched = false;
    detailBox.classList.remove("pass-pulse");
    void detailBox.offsetWidth;
    detailBox.classList.add("pass-pulse");
  }
});
detailBox.addEventListener("animationend", (e) => {
  if (e.animationName === "pass-pulse") detailBox.classList.remove("pass-pulse");
});

// Each setting is turned with a small rotary knob, like the real machine's handwheels, instead of a long ruler.
function settingKnob(field, anchor) {
  const el = document.createElement("div");
  el.className = "mini-knob";
  el.dataset.field = field;
  el.setAttribute("role", "slider");
  el.tabIndex = 0;
  el.setAttribute("aria-label", { angle: "角度旋鈕", index: "分度旋鈕", height: "高度旋鈕" }[field]);
  el.innerHTML =
    '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" class="knob-ring"/>' +
    Array.from({ length: 24 }, (_, i) => {
      const a = (i * Math.PI) / 12,
        r1 = i % 6 ? 50 : 46;
      return `<line x1="${60 + Math.sin(a) * r1}" y1="${60 - Math.cos(a) * r1}" x2="${60 + Math.sin(a) * 54}" y2="${60 - Math.cos(a) * 54}"/>`;
    }).join("") +
    '<g class="knob-cap"><circle cx="60" cy="60" r="38"/>' +
    Array.from({ length: 16 }, (_, i) => {
      const a = (i * Math.PI) / 8;
      return `<line x1="${60 + Math.sin(a) * 31}" y1="${60 - Math.cos(a) * 31}" x2="${60 + Math.sin(a) * 37}" y2="${60 - Math.cos(a) * 37}"/>`;
    }).join("") +
    '<circle cx="60" cy="31" r="5" class="knob-dot"/></g></svg><span>轉動</span>';
  anchor.after(el);
  let turn = 0,
    drag = null;
  const cap = el.querySelector(".knob-cap");
  const paint = () => cap.setAttribute("transform", `rotate(${(turn * 180) / Math.PI} 60 60)`);
  const apply = (total) => {
    if (field === "index") {
      const v = (((drag.start + Math.round((total / (2 * Math.PI)) * 24)) % 96) + 96) % 96;
      if (v !== state.index) change("index", v);
      return;
    }
    const opts = field === "height" ? { fine: heightFine } : { intro: isIntro(state), fine: fineAdjust };
    change(field, dragSetting(field, drag.start, total * 55, opts));
  };
  el.addEventListener("pointerdown", (e) => {
    if (hold || contact > 0.02 || focusLocked) return;
    e.preventDefault();
    e.stopPropagation();
    const r = el.getBoundingClientRect();
    drag = {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      last: null,
      total: 0,
      start: state[field],
      base: turn,
    };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
    el.classList.add("turning");
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag) return;
    e.preventDefault();
    const dx = e.clientX - drag.cx,
      dy = e.clientY - drag.cy;
    if (Math.hypot(dx, dy) < 8) return;
    const a = Math.atan2(dy, dx);
    if (drag.last === null) {
      drag.last = a;
      return;
    }
    let d = a - drag.last;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    drag.last = a;
    drag.total += d;
    turn = drag.base + drag.total;
    paint();
    apply(drag.total);
  });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
    el.addEventListener(ev, () => {
      if (drag) {
        drag = null;
        el.classList.remove("turning");
        detent("turn");
      }
    });
  el.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const dir = ["ArrowRight", "ArrowUp"].includes(e.key) ? 1 : -1;
    if (field === "index") change("index", (((state.index + dir) % 96) + 96) % 96);
    else
      change(
        field,
        +(
          state[field] +
          dir * (field === "height" ? (heightFine ? 0.01 : 0.2) : isIntro(state) ? 1 : fineAdjust ? 0.02 : 0.5)
        ).toFixed(3),
      );
    turn += dir * 0.2;
    paint();
  });
  return el;
}
settingKnob("angle", $("#angleWheel"));
settingKnob("height", $("#depthWheel"));
settingKnob("index", $("#indexDial").closest(".index-instrument") || $("#indexDial"));



// Royal fancy courses: the player dials the angle for the first facet of each angle; later facets at that angle index automatically.
function royalRun() {
  return compactCourse() && Boolean(courses.find((c) => c.id === state.courseId)?.advanced);
}
function pendingAngle() {
  if (!royalRun() || state.batchDone) return null;
  const stage = sequence()[state.step],
    s = stage?.batch?.[state.batchFacet || 0];
  if (!s) return null;
  if (state.angleSet?.run !== state.runId) state.angleSet = { run: state.runId, keys: [] };
  const key = `${s.flip ? 1 : 0}:${s.angle.toFixed(1)}`;
  return state.angleSet.keys.includes(key) ? null : { key, s };
}
let anglePromptAt = 0;
function tickBatch(dt, now) {
  const p = pendingAngle();
  if (p) {
    if (hold) {
      hold = false;
      leverPointerActive = false;
      leverTravel = 0;
      stop();
    }
    if (performance.now() - anglePromptAt > 2500) {
      anglePromptAt = performance.now();
      toast(`先轉角度旋鈕到 ${p.s.angle.toFixed(1)}°`);
    }
    return;
  }
  grindBatch(dt, now);
  compactAssistLog();
  continueHeldGrinding();
}
const anglePanel = document.createElement("div");
anglePanel.id = "royalAngle";
anglePanel.hidden = true;
anglePanel.innerHTML =
  '<div class="royal-angle-text"><b>調角度</b><span id="royalAngleTarget"></span><small id="royalAngleNow"></small><em>這個角度只要調一次，之後同角度的面會自動</em></div><i id="royalAngleAnchor"></i>';
easyBar.before(anglePanel);
settingKnob("angle", $("#royalAngleAnchor"));
everyFrame(() => {
  const p = pendingAngle();
  anglePanel.hidden = !p;
  document.body.classList.toggle("royal-angle", Boolean(p));
  if (!p) return;
  const diff = state.angle - p.s.angle;
  $("#royalAngleTarget").textContent = `目標 ${p.s.angle.toFixed(1)}°`;
  $("#royalAngleNow").textContent =
    `現在 ${state.angle.toFixed(1)}°  ${Math.abs(diff) <= 0.4 ? "" : diff > 0 ? "↓ 轉小一點" : "↑ 轉大一點"}`;
  if (Math.abs(diff) <= 0.4 && !hold) {
    state.angle = state.angleDrive = p.s.angle;
    state.angleSet.keys.push(p.key);
    assistBatch();
    detent("turn");
    toast(`角度 ${p.s.angle.toFixed(1)}° 鎖定，同角度的面會自動分度`);
    updateUI();
    persist();
  }
}, 120);

// Auto mode banner: while facets run on their own, remind the player to keep holding.
const autoBanner = document.createElement("div");
autoBanner.id = "autoBanner";
autoBanner.hidden = true;
autoBanner.innerHTML = '<i aria-hidden="true">✋</i><b>自動模式開啟，手不要放開</b>';
$(".stage").append(autoBanner);
function autoModeOn() {
  if (autoArmed) return true;
  if (!royalRun() || pendingAngle() || state.batchDone) return false;
  const stage = sequence()[state.step];
  return Boolean(stage?.batch?.length);
}
let autoWasOn = false;
everyFrame(() => {
  const on = autoModeOn() && !$("#modal").open;
  autoBanner.hidden = !on;
  autoBanner.classList.toggle("holding", on && hold);
  if (on && !autoWasOn) toast("自動模式開啟，手不要放開");
  autoWasOn = on;
}, 150);

// Royal blueprints: rules in rewards.js, screens in blueprint-ui.js.
function ownedBlueprints() {
  return (profile.blueprints ||= []);
}
function grantBlueprints(levels) {
  const fresh = addBlueprints(ownedBlueprints(), levels);
  if (fresh.length) saveProfile();
  return fresh;
}
courses.forEach((c, i) => {
  if (profile.completed?.includes(c.id)) grantBlueprints(blueprintGrants(i + 1, courses));
});
const blueprintUI = createBlueprintUI({
  modal,
  $,
  $$,
  lessons: courses,
  materials,
  plans,
  buildPlan,
  owned: ownedBlueprints,
  chime: () => {
    if (!audioMuted && audioContext?.state === "running") treasureChime(audioContext);
  },
});
mainMenu.addEventListener("click", () => {
  const cards = $("#menuCards");
  if (cards && !$("#menuBlueprints")) {
    const b = document.createElement("button");
    b.id = "menuBlueprints";
    b.textContent = `圖紙收藏${ownedBlueprints().length ? ` · ${ownedBlueprints().length}` : ""}`;
    b.onclick = blueprintUI.collection;
    cards.after(b);
  }
});
if ($("#entryCards")) {
  const b = document.createElement("button");
  b.id = "entryBlueprints";
  b.textContent = "圖紙收藏";
  b.onclick = blueprintUI.collection;
  $("#entryCards").after(b);
}

// Workshop apprentice: walks to the handwheel for any setting change (the player's or auto mode's),
// does the stone flips and lap changes for the operator, nods at each finished facet (impacts: onImpact).
const worldPos = (o) => o.getWorldPosition(new THREE.Vector3());
pusher.attach({
  busy: () => operator.busy,
  point: () => operator.workPoint,
  stone: () => worldPos(gem),
  lap: () => worldPos(lap),
  stickReady: () => serviceAngle !== null && Math.abs(headAngle - serviceAngle) < 0.08,
});
const handwheels = { angle: dial, index: indexWheel, height: knob };
let apprenticeSeen = { angle: state.angle, index: state.index, height: state.height, facet: state.batchFacet, step: state.step },
  apprenticeLast = performance.now();
everyFrame((now) => {
  const dt = Math.min(1, (now - apprenticeLast) / 1000); // their motion is time-based, so a slow frame never stalls a job
  apprentice.update(dt);
  pusher.update(dt);
  apprenticeLast = now;
  const s = apprenticeSeen;
  const turned = Math.abs(state.angle - s.angle) > 0.01 ? "angle" : state.index !== s.index ? "index" : Math.abs(state.height - s.height) > 0.005 ? "height" : null;
  if (turned && openingDone && !entryAwaiting) apprentice.turn(worldPos(handwheels[turned]));
  else if (state.step !== s.step || (state.batchFacet !== s.facet && state.batchFacet > 0)) (apprentice.gesture("emote-yes"), pusher.gesture("emote-yes"));
  apprenticeSeen = { angle: state.angle, index: state.index, height: state.height, facet: state.batchFacet, step: state.step };
});

// Test hook: #debug exposes the scene and game entry points for headless checks.
if (location.hash === "#debug")
  window.__dbg = {
    scene,
    camera,
    renderer,
    THREE,
    gem,
    apprentice,
    pusher,
    celebrate: () => (apprentice.celebrate(), pusher.celebrate(), screenConfetti()),
    courses,
    startCourse,
    st: () => state,
    profile: () => profile,
    grantBlueprints,
    treasureReveal: blueprintUI.reveal,
    blueprintCollection: blueprintUI.collection,
    chipCard() {
      state.damageCount = Math.max(1, state.damageCount || 0);
      showPracticeResult({ quality: 50, ratio: 0.1, polish: 0, weight: 0 }, courses.find((c) => c.id === state.courseId) || courses[0]);
    },
  };
