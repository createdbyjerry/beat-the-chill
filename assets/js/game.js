/**
 * Beat the Chill — game module (Three.js r160).
 * Loaded as an ES module from index.html; "three" resolves via the import map there.
 * 3D models are streamed from Supabase storage (see ASSET_BASE).
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const CHARACTER_ANIM_SLOTS = ['idle', 'run', 'runBack', 'jump', 'chop', 'sit'];
const ASSET_BASE =
  'https://nuqolbrnwdymehykosvm.supabase.co/storage/v1/object/public/lumberjack%20chill%20assets/';
const MODEL_URLS = {
  idle: ASSET_BASE + 'idle.glb',
  run: ASSET_BASE + 'running.glb',
  runBack: ASSET_BASE + 'runningBack.glb',
  jump: ASSET_BASE + 'jumping.glb',
  chop: ASSET_BASE + 'chop.glb',
  sit: ASSET_BASE + 'sitting.glb',
  orb: '',
  tree: ASSET_BASE + 'tree.glb',
  wood: ASSET_BASE + 'wood.glb',
  fire: ASSET_BASE + 'fire.glb',
};
const ORB_RADIUS = 5.0;
const ORB_COLOR = 0x4a8f5c;
const TREE_COUNT = 14;
const STAND_HEIGHT = 0.02;
const WALK_SPEED = 3.2;
const TURN_SPEED = 2.6;
const FORWARD_ROLL_SIGN = 1;
const CHARACTER_SCALE = 0.6;
const CHOP_REACH = 0.6;
const CHOP_SOURCE_DURATION = 3.2;
const CHOP_TOTAL_FRAMES = 96;
const CHOP_IMPACT_FRAME = 33;
const CHOP_TARGET_FRAMES = 20;
const CHOP_FPS = CHOP_TOTAL_FRAMES / CHOP_SOURCE_DURATION;
const CHOP_TIME_SCALE = CHOP_TOTAL_FRAMES / CHOP_TARGET_FRAMES;
const CHOP_EASE_OUT_FRACTION = 0.72;
const CHOP_SLASH_RANGE = CHOP_REACH + 0.9;
const CHOP_SLASH_THICKNESS = CHOP_SLASH_RANGE * 0.28;
const CHOP_SLASH_ANGLE = THREE.MathUtils.degToRad(190);
const CHOP_SLASH_DURATION = 0.22;
const CHOP_DURATION = CHOP_TARGET_FRAMES / CHOP_FPS;
const CHOP_IMPACT_TIME = CHOP_DURATION * (CHOP_IMPACT_FRAME / CHOP_TOTAL_FRAMES);
const CHARACTER_TARGET_HEIGHT = 0.75 * 1.15 * 1.2;
const CHARACTER_RAW_HEIGHT = 5.74;
const MODEL_IMPORT_SCALE = CHARACTER_TARGET_HEIGHT / CHARACTER_RAW_HEIGHT;
const CHARACTER_GROUND_OFFSET = -0.07;
const CHARACTER_REST_Y = ORB_RADIUS + STAND_HEIGHT;
const CAM_BACK = 3.1;
const CAM_HEIGHT = 1.6;
const CAM_LOOK_AHEAD = 1.1;
const INTRO_ROTATE_DURATION = 2.4;
const INTRO_HOLD_DURATION = 0.9;
const INTRO_START_DIST = CAM_BACK * 0.35;
const INTRO_START_HEIGHT = CAM_HEIGHT * 0.45;
const OUTRO_ORBIT_DURATION = 6.0;
const OUTRO_ORBIT_TURNS = 1;
const FIRE_DIST_FROM_CHARACTER = 0.8;
const FIRE_GROUND_OFFSET = -0.06;
const UP = new THREE.Vector3(0, 1, 0);
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const DUSK_TO_MIDNIGHT_DURATION = 70;
const FOG_COLOR_DUSK = new THREE.Color(0x241a33);
const FOG_COLOR_MIDNIGHT = new THREE.Color(0x05060f);
scene.fog = new THREE.FogExp2(FOG_COLOR_DUSK.getHex(), 0.013);
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 8, 14);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
const SKY_STOPS_DUSK = [
  [0, '#0a0f2c'],
  [0.3, '#1c2150'],
  [0.46, '#4a3468'],
  [0.55, '#8a5a72'],
  [0.61, '#c98663'],
  [0.7, '#2c2038'],
  [1, '#05060f'],
];
const SKY_STOPS_MIDNIGHT = [
  [0, '#03040d'],
  [0.3, '#05081a'],
  [0.46, '#070a22'],
  [0.55, '#080b26'],
  [0.61, '#080b26'],
  [0.7, '#04050f'],
  [1, '#020207'],
];
function lerpHex(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16),
    b = parseInt(hexB.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t);
  const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t);
  const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}
function buildSkyTexture(t) {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  for (let i = 0; i < SKY_STOPS_DUSK.length; i++) {
    grad.addColorStop(SKY_STOPS_DUSK[i][0], lerpHex(SKY_STOPS_DUSK[i][1], SKY_STOPS_MIDNIGHT[i][1], t));
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const skyMesh = new THREE.Mesh(
  new THREE.SphereGeometry(480, 32, 16),
  new THREE.MeshBasicMaterial({ map: buildSkyTexture(0), side: THREE.BackSide, fog: false }),
);
scene.add(skyMesh);
const moonLightDir = new THREE.Vector3(30, 40, 20).normalize();
const moonPosition = moonLightDir.clone().multiplyScalar(220);
const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(9, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xe8eeff, fog: false }),
);
moonMesh.position.copy(moonPosition);
scene.add(moonMesh);
(function addMoonHalo() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(232,238,255,0.85)');
  g.addColorStop(0.4, 'rgba(214,224,255,0.30)');
  g.addColorStop(1, 'rgba(214,224,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }),
  );
  sprite.scale.set(46, 46, 1);
  sprite.position.copy(moonPosition);
  scene.add(sprite);
})();
scene.add(new THREE.AmbientLight(0x3d4a78, 0.42));
const moonLight = new THREE.DirectionalLight(0xcfe0ff, 1.05);
moonLight.position.copy(moonLightDir).multiplyScalar(40);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.left = -20;
moonLight.shadow.camera.right = 20;
moonLight.shadow.camera.top = 20;
moonLight.shadow.camera.bottom = -20;
moonLight.shadow.camera.far = 100;
moonLight.shadow.bias = -0.0008;
moonLight.shadow.normalBias = 0.03;
scene.add(moonLight);
scene.add(new THREE.HemisphereLight(0x3a4a7a, 0x05060a, 0.4));
const glow = new THREE.PointLight(ORB_COLOR, 1.1, ORB_RADIUS * 6);
glow.position.set(0, ORB_RADIUS * 1.5, 0);
scene.add(glow);
const STAR_OPACITY_DUSK = 0.55,
  STAR_OPACITY_MIDNIGHT = 1.0;
const starMat = new THREE.PointsMaterial({
  color: 0xcfe0ff,
  size: 0.65,
  sizeAttenuation: true,
  transparent: true,
  opacity: STAR_OPACITY_DUSK,
  fog: false,
});
(function buildStars() {
  const count = 2200;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 120 + Math.random() * 260;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.6;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, starMat));
})();
let lastEnvT = -1;
function updateEnvironment() {
  const t = Math.min(state.elapsed / DUSK_TO_MIDNIGHT_DURATION, 1);
  if (Math.abs(t - lastEnvT) < 0.01) return;
  lastEnvT = t;
  const oldMap = skyMesh.material.map;
  skyMesh.material.map = buildSkyTexture(t);
  skyMesh.material.needsUpdate = true;
  if (oldMap) oldMap.dispose();
  scene.fog.color.copy(FOG_COLOR_DUSK).lerp(FOG_COLOR_MIDNIGHT, t);
  starMat.opacity = THREE.MathUtils.lerp(STAR_OPACITY_DUSK, STAR_OPACITY_MIDNIGHT, t);
}
const gltfLoader = new GLTFLoader();
function fitAndCenter(object3d, targetSize) {
  const box = new THREE.Box3().setFromObject(object3d);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
  const scale = targetSize / maxDim;
  object3d.scale.setScalar(scale);
  object3d.position.sub(center.multiplyScalar(scale));
}
let assetsToLoad = 0,
  assetsLoaded = 0;
function markAssetDone() {
  assetsLoaded++;
  const pct = assetsToLoad ? Math.round((assetsLoaded / assetsToLoad) * 100) : 100;
  document.getElementById('loading-bar-fill').style.width = pct + '%';
  document.getElementById('loading-progress-text').textContent = `${assetsLoaded} / ${assetsToLoad} assets`;
  if (assetsLoaded >= assetsToLoad) {
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('start-overlay').classList.remove('hidden');
  }
}
function loadFromURL(url, onLoad) {
  if (!url) return;
  gltfLoader.load(
    url,
    (gltf) => {
      onLoad(gltf);
      markAssetDone();
    },
    undefined,
    (err) => {
      console.error('Failed to load model from', url, err);
      markAssetDone();
    },
  );
}
function stripBakedRootDrift(clip) {
  const rootHint = /hips|pelvis|root/i;
  clip.tracks.forEach((track) => {
    if (!track.name.endsWith('.position')) return;
    const boneName = track.name.slice(0, -'.position'.length);
    if (!rootHint.test(boneName)) return;
    const times = track.times;
    const v = track.values;
    const n = times.length;
    if (n < 2) return;
    const duration = times[n - 1] - times[0] || 1;
    const dx = v[(n - 1) * 3] - v[0];
    const dy = v[(n - 1) * 3 + 1] - v[1];
    const dz = v[(n - 1) * 3 + 2] - v[2];
    for (let i = 0; i < n; i++) {
      const frac = (times[i] - times[0]) / duration;
      v[i * 3] -= dx * frac;
      v[i * 3 + 1] -= dy * frac;
      v[i * 3 + 2] -= dz * frac;
    }
  });
  return clip;
}
const characterGroup = new THREE.Group();
let characterCustomModel = null;
const characterPlaceholder = new THREE.Group();
{
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc98b4a, roughness: 0.55, metalness: 0.05 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x3d5a3f, roughness: 0.7 });
  const beardMat = new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.9 });
  const FOOT_LIFT = 0.28;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.55, 6, 12), shirtMat);
  torso.position.y = 0.62 + FOOT_LIFT;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), bodyMat);
  head.position.y = 1.18 + FOOT_LIFT;
  head.castShadow = true;
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 10), beardMat);
  beard.position.set(0, 1.05 + FOOT_LIFT, 0.16);
  beard.rotation.x = Math.PI;
  const beltGeo = new THREE.TorusGeometry(0.36, 0.05, 8, 20);
  const belt = new THREE.Mesh(beltGeo, beardMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.4 + FOOT_LIFT;
  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.4, 4, 8), bodyMat);
  legL.position.set(-0.16, 0.05 + FOOT_LIFT, 0);
  legL.castShadow = true;
  const legR = legL.clone();
  legR.position.x = 0.16;
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 4, 8), shirtMat);
  armL.position.set(-0.44, 0.62 + FOOT_LIFT, 0);
  armL.castShadow = true;
  const armR = armL.clone();
  armR.position.x = 0.44;
  const axeHandleMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.85 });
  const axeHeadMat = new THREE.MeshStandardMaterial({ color: 0xb7bfc9, metalness: 0.6, roughness: 0.35 });
  const axeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), axeHandleMat);
  axeHandle.position.set(0, -0.34, 0.04);
  axeHandle.rotation.x = 0.25;
  const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.03), axeHeadMat);
  axeHead.position.set(0, -0.58, 0.1);
  armR.add(axeHandle, axeHead);
  characterPlaceholder.add(torso, head, beard, belt, legL, legR, armL, armR);
  characterPlaceholder.userData.legL = legL;
  characterPlaceholder.userData.legR = legR;
  characterPlaceholder.userData.armL = armL;
  characterPlaceholder.userData.armR = armR;
}
characterPlaceholder.scale.setScalar(CHARACTER_SCALE);
characterGroup.add(characterPlaceholder);
scene.add(characterGroup);
characterGroup.position.set(0, CHARACTER_REST_Y, 0);
function buildCrescentGeometry(midRadius, thickness, angleSpan, segments = 28) {
  const shape = new THREE.Shape();
  const half = angleSpan / 2;
  const edge = (i, sign) => {
    const a = -half + angleSpan * (i / segments);
    const taper = Math.cos((a / half) * (Math.PI / 2));
    const r = midRadius + sign * (thickness / 2) * taper;
    return [Math.sin(a) * r, Math.cos(a) * r];
  };
  for (let i = 0; i <= segments; i++) {
    const [x, y] = edge(i, 1);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = segments; i >= 0; i--) {
    const [x, y] = edge(i, -1);
    shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 1);
}
const slashMat = new THREE.MeshBasicMaterial({
  color: 0xfff4c2,
  transparent: true,
  opacity: 0,
  side: THREE.DoubleSide,
  depthWrite: false,
  fog: false,
});
const slashMesh = new THREE.Mesh(
  buildCrescentGeometry(CHOP_SLASH_RANGE - CHOP_SLASH_THICKNESS / 2, CHOP_SLASH_THICKNESS, CHOP_SLASH_ANGLE),
  slashMat,
);
slashMesh.rotation.x = Math.PI / 2;
slashMesh.position.y = 0.08;
slashMesh.visible = false;
characterGroup.add(slashMesh);
function triggerSlashEffect() {
  slashMesh.visible = true;
  slashMesh.scale.setScalar(0.001);
  slashMat.opacity = 0.95;
  state.slashT = 0;
}
let characterMixer = null;
let characterBaseReady = false;
const characterActions = {};
let activeCharacterAction = null;
function setCharacterAnim(slot) {
  if (state.animState === slot) return;
  state.animState = slot;
  const next = characterActions[slot];
  if (characterMixer && next) {
    next.reset().fadeIn(0.2).play();
    if (activeCharacterAction && activeCharacterAction !== next) activeCharacterAction.fadeOut(0.2);
    activeCharacterAction = next;
  }
}
function handleCharacterGLTF(slot, gltf) {
  if (!characterBaseReady) {
    const model = gltf.scene;
    model.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    model.scale.setScalar(MODEL_IMPORT_SCALE);
    model.position.y = CHARACTER_GROUND_OFFSET;
    characterPlaceholder.visible = false;
    characterCustomModel = model;
    characterGroup.add(model);
    characterMixer = new THREE.AnimationMixer(model);
    characterBaseReady = true;
  }
  if (gltf.animations && gltf.animations.length) {
    const clip = stripBakedRootDrift(gltf.animations[0].clone());
    clip.name = slot;
    const action = characterMixer.clipAction(clip);
    if (slot === 'chop') action.timeScale = CHOP_TIME_SCALE;
    characterActions[slot] = action;
    if (slot === 'idle') {
      action.play();
      characterMixer.update(0);
      activeCharacterAction = action;
      state.animState = 'idle';
    }
  }
}
function proceduralAnimate(dt, animState, chopProgress) {
  const l = characterPlaceholder.userData;
  if (animState === 'chop') {
    const swing = Math.sin(chopProgress * Math.PI * 2 * 3) * 0.9;
    l.armR.rotation.x = -1.2 + swing * 0.6;
    l.armL.rotation.x = 0.15;
    l.legL.rotation.x = 0.05;
    l.legR.rotation.x = -0.05;
    return;
  }
  const moving = animState === 'run' || animState === 'runBack';
  const dir = animState === 'runBack' ? -1 : 1;
  state.walkCycle += moving ? dt * 8 : dt * 2;
  const amt = moving ? 0.55 : 0.06;
  const swing = Math.sin(state.walkCycle) * amt * dir;
  l.legL.rotation.x = swing;
  l.legR.rotation.x = -swing;
  l.armL.rotation.x = -swing * 0.8;
  l.armR.rotation.x = swing * 0.8;
}
const spinGroup = new THREE.Group();
scene.add(spinGroup);
function sphericalToLocal(radius, theta, phi) {
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}
const sphereMat = new THREE.MeshStandardMaterial({
  color: ORB_COLOR,
  roughness: 0.6,
  metalness: 0.08,
  emissive: ORB_COLOR,
  emissiveIntensity: 0.06,
});
const spherePlaceholder = new THREE.Mesh(new THREE.IcosahedronGeometry(ORB_RADIUS, 3), sphereMat);
spherePlaceholder.castShadow = true;
spherePlaceholder.receiveShadow = true;
spinGroup.add(spherePlaceholder);
let customSphere = null;
function handleOrbGLTF(gltf) {
  const model = gltf.scene;
  model.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  fitAndCenter(model, ORB_RADIUS * 2);
  spherePlaceholder.visible = false;
  if (customSphere) spinGroup.remove(customSphere);
  customSphere = model;
  spinGroup.add(model);
}
let treeModelTemplate = null,
  woodModelTemplate = null,
  fireModelTemplate = null;
function buildPlaceholderTree() {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 0.8 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 8), trunkMat);
  trunk.position.y = 0.25;
  trunk.castShadow = true;
  const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.65, 10), leafMat);
  c1.position.y = 0.75;
  c1.castShadow = true;
  const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.55, 10), leafMat);
  c2.position.y = 1.05;
  c2.castShadow = true;
  const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 10), leafMat);
  c3.position.y = 1.32;
  c3.castShadow = true;
  g.add(trunk, c1, c2, c3);
  return g;
}
function buildPlaceholderWood() {
  const g = new THREE.Group();
  const logMat = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.85 });
  const endMat = new THREE.MeshStandardMaterial({ color: 0xd9b98a, roughness: 0.7 });
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.55, 10), logMat);
  log.rotation.z = Math.PI / 2;
  log.position.y = 0.14;
  log.castShadow = true;
  const endA = new THREE.Mesh(new THREE.CircleGeometry(0.12, 10), endMat);
  endA.position.set(-0.275, 0.14, 0);
  endA.rotation.y = -Math.PI / 2;
  const endB = endA.clone();
  endB.position.x = 0.275;
  endB.rotation.y = Math.PI / 2;
  g.add(log, endA, endB);
  return g;
}
function buildPlaceholderFire() {
  const g = new THREE.Group();
  const logMat = new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), logMat);
    l.rotation.z = Math.PI / 2;
    l.rotation.y = (i * Math.PI) / 2;
    l.position.y = 0.06;
    g.add(l);
  }
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xff8a2b,
    emissive: 0xff5500,
    emissiveIntensity: 1.4,
    roughness: 0.4,
  });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 10), flameMat);
  flame.position.y = 0.35;
  g.add(flame);
  g.userData.flame = flame;
  return g;
}
function applyTreeVisual(entry) {
  removeTreeHighlight(entry);
  while (entry.group.children.length) entry.group.remove(entry.group.children[0]);
  const mesh =
    entry.status === 'standing'
      ? treeModelTemplate
        ? treeModelTemplate.clone(true)
        : buildPlaceholderTree()
      : woodModelTemplate
        ? woodModelTemplate.clone(true)
        : buildPlaceholderWood();
  entry.group.add(mesh);
  entry.mesh = mesh;
  if (entry.status === 'standing') {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    entry.hitRadius = Math.max(size.x, size.z) * 0.5;
  }
}
let highlightedTree = null;
function addTreeHighlight(entry) {
  const highlight = entry.mesh.clone(true);
  highlight.position.copy(entry.mesh.position);
  highlight.quaternion.copy(entry.mesh.quaternion);
  highlight.scale.copy(entry.mesh.scale).multiplyScalar(1.06);
  highlight.traverse((n) => {
    if (n.isMesh) {
      n.material = new THREE.MeshBasicMaterial({
        color: 0xfff27a,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      n.castShadow = false;
      n.receiveShadow = false;
    }
  });
  entry.group.add(highlight);
  entry.highlightMesh = highlight;
}
function removeTreeHighlight(entry) {
  if (!entry.highlightMesh) return;
  entry.group.remove(entry.highlightMesh);
  entry.highlightMesh.traverse((n) => {
    if (n.isMesh) n.material.dispose();
  });
  entry.highlightMesh = null;
}
function setHighlightedTree(next) {
  if (highlightedTree === next) return;
  if (highlightedTree) removeTreeHighlight(highlightedTree);
  highlightedTree = next;
  if (highlightedTree) addTreeHighlight(highlightedTree);
}
function handleTreeGLTF(gltf) {
  treeModelTemplate = gltf.scene;
  treeModelTemplate.traverse((n) => {
    if (n.isMesh) n.castShadow = true;
  });
  treeModelTemplate.scale.setScalar(MODEL_IMPORT_SCALE);
  allTrees.forEach((t) => {
    if (t.status === 'standing') applyTreeVisual(t);
  });
}
function handleWoodGLTF(gltf) {
  woodModelTemplate = gltf.scene;
  woodModelTemplate.traverse((n) => {
    if (n.isMesh) n.castShadow = true;
  });
  woodModelTemplate.scale.setScalar(MODEL_IMPORT_SCALE);
  allTrees.forEach((t) => {
    if (t.status === 'wood') applyTreeVisual(t);
  });
}
function handleFireGLTF(gltf) {
  fireModelTemplate = gltf.scene;
  fireModelTemplate.traverse((n) => {
    if (n.isMesh) n.castShadow = true;
  });
  fireModelTemplate.scale.setScalar(MODEL_IMPORT_SCALE);
  if (fireGroup.visible) applyFireVisual();
}
const allTrees = [];
function makeTree(theta, phi) {
  const group = new THREE.Group();
  const normal = sphericalToLocal(1, theta, phi).normalize();
  group.position.copy(normal.clone().multiplyScalar(ORB_RADIUS));
  group.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal));
  spinGroup.add(group);
  const entry = { group, mesh: null, status: 'standing', hitRadius: 0, highlightMesh: null };
  applyTreeVisual(entry);
  allTrees.push(entry);
}
for (let i = 0; i < TREE_COUNT; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = THREE.MathUtils.degToRad(24 + Math.random() * 132);
  makeTree(theta, phi);
}
const TOTAL_TREES = allTrees.length;
const fireGroup = new THREE.Group();
fireGroup.visible = false;
spinGroup.add(fireGroup);
function applyFireVisual() {
  while (fireGroup.children.length) fireGroup.remove(fireGroup.children[0]);
  const mesh = fireModelTemplate ? fireModelTemplate.clone(true) : buildPlaceholderFire();
  fireGroup.add(mesh);
  fireGroup.userData.mesh = mesh;
  fireGroup.userData.flame = mesh.userData.flame || null;
  const light = new THREE.PointLight(0xff8a44, 3.4, 7, 2);
  light.position.y = CHARACTER_TARGET_HEIGHT * 0.4;
  fireGroup.add(light);
  fireGroup.userData.light = light;
}
function autoLoadModels() {
  const urls = [
    ...CHARACTER_ANIM_SLOTS.map((s) => MODEL_URLS[s]),
    MODEL_URLS.orb,
    MODEL_URLS.tree,
    MODEL_URLS.wood,
    MODEL_URLS.fire,
  ];
  assetsToLoad = urls.filter((u) => u).length;
  CHARACTER_ANIM_SLOTS.forEach((slot) => {
    loadFromURL(MODEL_URLS[slot], (gltf) => handleCharacterGLTF(slot, gltf));
  });
  loadFromURL(MODEL_URLS.orb, handleOrbGLTF);
  loadFromURL(MODEL_URLS.tree, handleTreeGLTF);
  loadFromURL(MODEL_URLS.wood, handleWoodGLTF);
  loadFromURL(MODEL_URLS.fire, handleFireGLTF);
  if (assetsToLoad === 0) {
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('start-overlay').classList.remove('hidden');
  }
}
autoLoadModels();
const state = {
  running: false,
  yaw: 0,
  collected: 0,
  elapsed: 0,
  finished: false,
  walkCycle: 0,
  intro: false,
  titleScreen: true,
  introT: 0,
  introGoShown: false,
  chopping: false,
  chopT: 0,
  chopTarget: null,
  chopStruck: false,
  slashT: 0,
  paused: false,
  outro: false,
  outroT: 0,
  manualYaw: 0,
  manualPitch: 0,
  animState: null,
};
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
let camInit = false;
const keys = { forward: false, back: false, left: false, right: false };
function setKey(code, val) {
  if (code === 'KeyW' || code === 'ArrowUp') keys.forward = val;
  if (code === 'KeyS' || code === 'ArrowDown') keys.back = val;
  if (code === 'KeyA' || code === 'ArrowLeft') keys.left = val;
  if (code === 'KeyD' || code === 'ArrowRight') keys.right = val;
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') {
    restartGame();
  }
  if (e.code === 'Space') {
    e.preventDefault();
    tryChop();
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    togglePause();
  }
  setKey(e.code, true);
});
window.addEventListener('keyup', (e) => setKey(e.code, false));
function togglePause() {
  if (!state.running || state.finished) return;
  state.paused = !state.paused;
  document.getElementById('pause-overlay').classList.toggle('hidden', !state.paused);
}
document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('resume-btn').addEventListener('click', togglePause);
function tryChop() {
  if (!state.running || state.finished || state.chopping) return;
  state.chopping = true;
  state.chopT = 0;
  state.chopTarget = highlightedTree;
  state.chopStruck = false;
  if (characterActions.chop) characterActions.chop.timeScale = CHOP_TIME_SCALE;
}
function bindHold(id, onDown, onUp) {
  const el = document.getElementById(id);
  const down = (e) => {
    e.preventDefault();
    onDown();
  };
  const up = (e) => {
    e.preventDefault();
    onUp();
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointerleave', up);
  el.addEventListener('pointercancel', up);
}
bindHold(
  'btn-up',
  () => (keys.forward = true),
  () => (keys.forward = false),
);
bindHold(
  'btn-down',
  () => (keys.back = true),
  () => (keys.back = false),
);
bindHold(
  'btn-left',
  () => (keys.left = true),
  () => (keys.left = false),
);
bindHold(
  'btn-right',
  () => (keys.right = true),
  () => (keys.right = false),
);
document.getElementById('btn-chop').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  tryChop();
});
document.querySelectorAll('.padbtn').forEach((b) => {
  const on = () => b.classList.add('is-pressed');
  const off = () => b.classList.remove('is-pressed');
  b.addEventListener('pointerdown', on);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, off));
});
let cameraDragging = false;
let lastDragX = 0,
  lastDragY = 0;
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!state.finished) return;
  cameraDragging = true;
  lastDragX = e.clientX;
  lastDragY = e.clientY;
  renderer.domElement.style.cursor = 'grabbing';
});
window.addEventListener('pointermove', (e) => {
  if (!cameraDragging) return;
  const dx = e.clientX - lastDragX;
  const dy = e.clientY - lastDragY;
  lastDragX = e.clientX;
  lastDragY = e.clientY;
  if (state.finished && !state.outro) {
    state.manualYaw -= dx * 0.006;
    state.manualPitch = THREE.MathUtils.clamp(state.manualPitch + dy * 0.003, -0.6, 0.6);
  }
});
window.addEventListener('pointerup', () => {
  cameraDragging = false;
  renderer.domElement.style.cursor = '';
});
const pickupLayer = document.getElementById('pickup-layer');
const _pickupProjectVec = new THREE.Vector3();
function spawnPickupPopup(worldPos) {
  _pickupProjectVec.copy(worldPos).project(camera);
  if (_pickupProjectVec.z > 1) return;
  const x = (_pickupProjectVec.x * 0.5 + 0.5) * window.innerWidth;
  const y = (1 - (_pickupProjectVec.y * 0.5 + 0.5)) * window.innerHeight;
  const el = document.createElement('div');
  el.className = 'pickup-popup';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.innerHTML =
    '<span class="sparkle s1"></span>' +
    '<span class="sparkle s2"></span>' +
    '<span class="sparkle s3"></span>' +
    '<div class="plus-text">+1</div>';
  pickupLayer.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}
function updateHUD() {
  document.getElementById('total-count').textContent = `${state.collected} / ${TOTAL_TREES}`;
}
function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m.toString().padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
}
function startGame() {
  document.getElementById('start-overlay').classList.add('hidden');
  document.body.classList.add('playing');
  beginIntro();
  updateHUD();
}
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', restartGame);
function beginIntro() {
  state.titleScreen = false;
  state.intro = true;
  state.introT = 0;
  state.introGoShown = false;
  state.running = false;
  camInit = false;
  document.getElementById('go-text').classList.remove('active');
}
function restartGame() {
  state.yaw = 0;
  state.collected = 0;
  state.elapsed = 0;
  state.finished = false;
  state.chopping = false;
  state.chopT = 0;
  state.chopTarget = null;
  state.chopStruck = false;
  state.outro = false;
  state.outroT = 0;
  state.manualYaw = 0;
  state.manualPitch = 0;
  state.slashT = 0;
  slashMesh.visible = false;
  state.paused = false;
  document.getElementById('pause-overlay').classList.add('hidden');
  spinGroup.quaternion.identity();
  characterGroup.rotation.set(0, 0, 0);
  characterGroup.position.y = CHARACTER_REST_Y;
  highlightedTree = null;
  allTrees.forEach((t) => {
    t.status = 'standing';
    t.group.visible = true;
    applyTreeVisual(t);
  });
  fireGroup.visible = false;
  state.animState = null;
  document.getElementById('win-bar').classList.add('hidden');
  document.body.classList.add('playing');
  beginIntro();
  updateHUD();
}
function finishGame() {
  state.finished = true;
  state.running = false;
  state.outro = true;
  state.outroT = 0;
  const forwardDir = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
  const rightDir = new THREE.Vector3().crossVectors(forwardDir, UP).normalize();
  const angle = FORWARD_ROLL_SIGN * (FIRE_DIST_FROM_CHARACTER / ORB_RADIUS);
  const deltaQuat = new THREE.Quaternion().setFromAxisAngle(rightDir, angle);
  const newSpinQuat = deltaQuat.clone().multiply(spinGroup.quaternion);
  const fireNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(newSpinQuat.clone().invert()).normalize();
  fireGroup.position.copy(fireNormal.clone().multiplyScalar(ORB_RADIUS + FIRE_GROUND_OFFSET));
  fireGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fireNormal);
  fireGroup.visible = true;
  applyFireVisual();
}
function findTreeInChopRange() {
  const charPos = characterGroup.position;
  let best = null,
    bestDist = Infinity;
  for (const t of allTrees) {
    if (t.status !== 'standing') continue;
    const wp = new THREE.Vector3();
    t.group.getWorldPosition(wp);
    const dist = wp.distanceTo(charPos);
    const reach = (t.hitRadius || 0.5) + CHOP_REACH;
    if (dist < reach && dist < bestDist) {
      best = t;
      bestDist = dist;
    }
  }
  return best;
}
const clock = new THREE.Clock();
function update() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.paused) {
    renderer.render(scene, camera);
    requestAnimationFrame(update);
    return;
  }
  if (state.intro) {
    state.introT += dt;
    if (state.introT >= INTRO_ROTATE_DURATION && !state.introGoShown) {
      state.introGoShown = true;
      document.getElementById('go-text').classList.add('active');
    }
    if (state.introT >= INTRO_ROTATE_DURATION + INTRO_HOLD_DURATION) {
      state.intro = false;
      state.running = true;
      document.getElementById('go-text').classList.remove('active');
    }
  }
  if (state.running && !state.finished) {
    state.elapsed += dt;
    if (state.chopping) {
      state.chopT += dt;
      if (characterActions.chop) {
        const progress = Math.min(state.chopT / CHOP_DURATION, 1);
        if (progress < CHOP_EASE_OUT_FRACTION) {
          characterActions.chop.timeScale = CHOP_TIME_SCALE;
        } else {
          const easeT = (progress - CHOP_EASE_OUT_FRACTION) / (1 - CHOP_EASE_OUT_FRACTION);
          const eased = easeT * easeT * (3 - 2 * easeT);
          characterActions.chop.timeScale = THREE.MathUtils.lerp(CHOP_TIME_SCALE, 1, eased);
        }
      }
      if (!state.chopStruck && state.chopT >= CHOP_IMPACT_TIME) {
        state.chopStruck = true;
        triggerSlashEffect();
        if (state.chopTarget) {
          state.chopTarget.status = 'wood';
          applyTreeVisual(state.chopTarget);
        }
      }
      if (state.chopT >= CHOP_DURATION) {
        state.chopping = false;
        if (state.chopTarget) {
          state.collected++;
          updateHUD();
          const wp = new THREE.Vector3();
          state.chopTarget.group.getWorldPosition(wp);
          spawnPickupPopup(wp);
          state.chopTarget.group.visible = false;
          if (state.collected >= TOTAL_TREES) {
            finishGame();
          }
        }
        state.chopTarget = null;
      }
    } else {
      if (keys.left) state.yaw += TURN_SPEED * dt;
      if (keys.right) state.yaw -= TURN_SPEED * dt;
      characterGroup.rotation.set(0, state.yaw, 0);
      const moving = keys.forward || keys.back;
      if (moving) {
        const forwardDir = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
        const rightDir = new THREE.Vector3().crossVectors(forwardDir, UP).normalize();
        const dirSign = keys.forward ? 1 : -1;
        const angle = FORWARD_ROLL_SIGN * dirSign * ((WALK_SPEED * dt) / ORB_RADIUS);
        const deltaQuat = new THREE.Quaternion().setFromAxisAngle(rightDir, angle);
        spinGroup.quaternion.premultiply(deltaQuat);
      }
    }
    characterGroup.position.y = CHARACTER_REST_Y;
    setHighlightedTree(state.chopping ? state.chopTarget : findTreeInChopRange());
  }
  document.getElementById('timer-value').textContent = formatTime(state.elapsed);
  if (!state.titleScreen) {
    let desiredAnim = 'idle';
    if (state.finished) desiredAnim = 'sit';
    else if (state.chopping) desiredAnim = 'chop';
    else if (state.running && keys.forward) desiredAnim = 'run';
    else if (state.running && keys.back) desiredAnim = 'runBack';
    setCharacterAnim(desiredAnim);
    proceduralAnimate(dt, desiredAnim, state.chopping ? Math.min(state.chopT / CHOP_DURATION, 1) : 0);
    if (characterMixer) characterMixer.update(dt);
  }
  const forwardDir = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
  if (state.titleScreen || (state.intro && state.introT < INTRO_ROTATE_DURATION)) {
    const ease = state.titleScreen
      ? 0
      : (() => {
          const t = state.introT / INTRO_ROTATE_DURATION;
          return t * t * (3 - 2 * t);
        })();
    const angle = THREE.MathUtils.lerp(Math.PI, 0, ease);
    const dist = THREE.MathUtils.lerp(INTRO_START_DIST, CAM_BACK, ease);
    const height = THREE.MathUtils.lerp(INTRO_START_HEIGHT, CAM_HEIGHT, ease);
    const orbitDir = forwardDir.clone().applyAxisAngle(UP, angle);
    camPos
      .copy(characterGroup.position)
      .add(orbitDir.multiplyScalar(-dist))
      .add(new THREE.Vector3(0, height, 0));
    camLook.copy(characterGroup.position).add(new THREE.Vector3(0, 0.9, 0));
    camInit = true;
  } else if (state.finished) {
    const fireWorldPos = new THREE.Vector3();
    fireGroup.getWorldPosition(fireWorldPos);
    const focusPoint = characterGroup.position.clone().add(fireWorldPos).multiplyScalar(0.5);
    focusPoint.y = characterGroup.position.y + 0.5;
    const dist = CAM_BACK * 0.55;
    if (state.outro) {
      state.outroT += dt;
      const t = Math.min(state.outroT / OUTRO_ORBIT_DURATION, 1);
      const angle = t * Math.PI * 2 * OUTRO_ORBIT_TURNS;
      const height = CAM_HEIGHT * 0.6;
      const orbitDir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      camPos
        .copy(focusPoint)
        .add(orbitDir.multiplyScalar(dist))
        .add(new THREE.Vector3(0, height, 0));
      camLook.copy(focusPoint);
      if (t >= 1) {
        state.outro = false;
        state.manualYaw = angle % (Math.PI * 2);
        state.manualPitch = 0;
        document.getElementById('final-time').textContent = `Final time  ${formatTime(state.elapsed)}`;
        document.getElementById('win-bar').classList.remove('hidden');
      }
    } else {
      const height = CAM_HEIGHT * 0.6 + state.manualPitch * dist;
      const orbitDir = new THREE.Vector3(Math.sin(state.manualYaw), 0, Math.cos(state.manualYaw));
      camPos
        .copy(focusPoint)
        .add(orbitDir.multiplyScalar(dist))
        .add(new THREE.Vector3(0, height, 0));
      camLook.copy(focusPoint);
    }
  } else {
    const desiredCamPos = characterGroup.position
      .clone()
      .add(forwardDir.clone().multiplyScalar(-CAM_BACK))
      .add(new THREE.Vector3(0, CAM_HEIGHT, 0));
    const desiredLook = characterGroup.position
      .clone()
      .add(forwardDir.clone().multiplyScalar(CAM_LOOK_AHEAD))
      .add(new THREE.Vector3(0, 0.6, 0));
    if (!camInit) {
      camPos.copy(desiredCamPos);
      camLook.copy(desiredLook);
      camInit = true;
    }
    camPos.lerp(desiredCamPos, 0.08);
    camLook.lerp(desiredLook, 0.08);
  }
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  updateEnvironment();
  characterPlaceholder.position.y = Math.sin(performance.now() * 0.002) * 0.02;
  if (fireGroup.visible) {
    const flame = fireGroup.userData.flame;
    const light = fireGroup.userData.light;
    if (flame) flame.scale.y = 1 + Math.sin(performance.now() * 0.01) * 0.08;
    if (light) light.intensity = 3.4 + Math.sin(performance.now() * 0.02) * 0.6 + Math.random() * 0.2;
  }
  if (slashMesh.visible) {
    state.slashT += dt;
    const t = Math.min(state.slashT / CHOP_SLASH_DURATION, 1);
    const growT = Math.min(t / 0.5, 1);
    const eased = growT * growT * (3 - 2 * growT);
    slashMesh.scale.setScalar(THREE.MathUtils.lerp(0.15, 1, eased));
    const fadeT = Math.max((t - 0.4) / 0.6, 0);
    slashMat.opacity = 0.95 * (1 - fadeT);
    if (t >= 1) slashMesh.visible = false;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(update);
}
update();
