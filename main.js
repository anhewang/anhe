// main.js — 将 chuspeeism/iphone-duo（MIT）的 Three.js 折叠演示改造为简历首屏的
// 滚动展开引导：初始完全合盖（外屏锁屏朝向观众），随页面滚动逐步展开，
// 最终内屏展示"简历主屏"，配合 HTML 文字层完成首屏引导。
// 折叠变形与屏幕投影着色器保持原实现，仅将交互由"滑块/播放"改为"滚动驱动"。

import * as THREE from 'three';
import { USDLoader } from 'three/addons/loaders/USDLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadDefaultUIs } from './ui.js';

const section = document.querySelector('#foldSection');
const viewport = document.querySelector('#viewport');
const wallpaperEl = document.querySelector('#wallpaper');
const overlay = document.querySelector('#heroOverlay');
const loadingEl = document.querySelector('#heroLoading');
const fallbackEl = document.querySelector('#heroFallback');
const hintEl = document.querySelector('#scrollHint');

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = t => t * t * (3 - 2 * t);
const damp = (dt, k) => 1 - Math.exp(-k * dt);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- 滚动进度（独立于 3D，保证降级时页面仍可用） ----------

let rawP = 0;
function readScroll() {
  const top = section.getBoundingClientRect().top + scrollY; // 折叠区在文档中的绝对位置
  const travel = section.offsetHeight - innerHeight;
  rawP = travel > 0 ? clamp((scrollY - top) / travel, 0, 1) : 0;
}
function onUpdate() {
  hintEl.classList.toggle('hidden', rawP > .03);
  wallpaperEl.style.transform = `scale(${1 + rawP * .08})`;
}
addEventListener('scroll', () => { readScroll(); onUpdate(); }, { passive: true });

// ---------- 运镜状态 ----------

const rig = {
  p: 0,        // 平滑后的滚动进度
  fold: 0,     // 平滑后的展开进度：0 合盖 → 1 展开
  parallaxX: 0, parallaxY: 0, parallaxTX: 0, parallaxTY: 0,
  dragYaw: 0, dragPitch: 0, dragYawT: 0, dragPitchT: 0,
  dragging: false,
};

// 拖拽环视：桌面鼠标全向拖拽；触屏左右拖拽旋转视角（纵向保留页面滚动）
let touchDrag = null;
viewport.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') {
    rig.dragging = true;
    viewport.classList.add('dragging');
    viewport.setPointerCapture(e.pointerId);
  } else {
    touchDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, locked: false };
  }
});
viewport.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') {
    if (rig.dragging) {
      rig.dragYawT = clamp(rig.dragYawT - e.movementX * .005, -1.1, 1.1);
      rig.dragPitchT = clamp(rig.dragPitchT + e.movementY * .004, -.45, .55);
    } else {
      rig.parallaxTX = (e.clientX / innerWidth - .5) * .09;
      rig.parallaxTY = (e.clientY / innerHeight - .5) * -.05;
    }
    return;
  }
  if (!touchDrag || e.pointerId !== touchDrag.id) return;
  const dx = e.clientX - touchDrag.x;
  const dy = e.clientY - touchDrag.y;
  if (!touchDrag.locked) {
    // 首个明显位移为横向时锁定为拖拽；纵向滑动则交还页面滚动
    if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      touchDrag.locked = true;
      touchDrag.x = e.clientX;
      rig.dragging = true;
      viewport.classList.add('dragging');
      viewport.setPointerCapture(e.pointerId);
    } else if (Math.abs(dy) > 14) {
      touchDrag = null;
    }
  } else {
    rig.dragYawT = clamp(rig.dragYawT - dx * .006, -1.1, 1.1);
    touchDrag.x = e.clientX;
  }
});
function endDrag() {
  rig.dragging = false;
  touchDrag = null;
  viewport.classList.remove('dragging');
}
addEventListener('pointerup', endDrag);
addEventListener('pointercancel', endDrag);
viewport.addEventListener('pointerleave', () => {
  rig.parallaxTX = 0;
  rig.parallaxTY = 0;
});

// ---------- 着色器（源自 iphone-duo，MIT） ----------

const screenShader = `
uniform float foldAngle;
uniform vec2 uiPixel;
uniform vec4 uiFrame;
uniform vec2 uiGradient;
uniform vec3 uiReferenceEye;
varying vec3 vUIPosition;
vec3 screenColor() {
  // Intersect the fixed front-view ray with the unfolded inner-screen plane.
  float depth = (0.24948 - uiReferenceEye.z) / (vUIPosition.z - uiReferenceEye.z);
  vec2 projected = uiReferenceEye.xy + (vUIPosition.xy - uiReferenceEye.xy) * depth;
  vec2 sourceUV = (projected - uiFrame.xy) / uiFrame.zw;
  #ifdef INNER_UI
    float progress = clamp(foldAngle / 1.570796327, 0.0, 1.0);
  #else
    // Anchor the image to the projected hinge-side edge of the outer screen.
    float c = cos(foldAngle), s = sin(foldAngle);
    vec2 hingeEdge = vec2(-0.23396, -0.27463 - 0.275454);
    vec2 foldedEdge = vec2(c * hingeEdge.x + s * hingeEdge.y,
      -s * hingeEdge.x + c * hingeEdge.y + 0.275454);
    float edgeDepth = (0.24948 - uiReferenceEye.z) / (foldedEdge.y - uiReferenceEye.z);
    float anchorX = uiReferenceEye.x + (foldedEdge.x - uiReferenceEye.x) * edgeDepth;
    sourceUV.x = uiGradient.x + (projected.x - anchorX) / uiFrame.z;
    float progress = clamp((3.141592654 - foldAngle) / 1.570796327, 0.0, 1.0);
  #endif
  float edge = (sourceUV.x - uiGradient.x) / (uiGradient.y - uiGradient.x);
  float motion = smoothstep(0.0, 1.0, progress);
  float blurGradient = clamp(edge, 0.0, 1.0);
  float darkenGradient = clamp((edge - 0.2) / 0.8, 0.0, 1.0);
  float effect = motion * pow(darkenGradient, 1.35);
  float radius = 72.0 * motion * pow(blurGradient, 1.35);
  vec2 aa = max(fwidth(sourceUV), uiPixel * 0.5);
  vec2 dx = dFdx(sourceUV) / uiPixel;
  vec2 dy = dFdy(sourceUV) / uiPixel;
  float baseLod = log2(max(1.0, max(length(dx), length(dy))));
  vec2 coverage = smoothstep(-aa, aa, sourceUV)
    * (1.0 - smoothstep(vec2(1.0) - aa, vec2(1.0) + aa, sourceUV));
  vec3 color = textureLod(map, clamp(sourceUV, vec2(0.0), vec2(1.0)), baseLod).rgb * coverage.x * coverage.y;
  if (radius > 0.0) {
    // Use the same mip level at zero blur, then increase it continuously.
    float lod = max(baseLod, log2(max(1.0, radius)));
    vec2 footprint = max(aa, uiPixel * radius * 0.75);
    color = vec3(0.0);
    for (int y = -2; y <= 2; y++) {
      for (int x = -2; x <= 2; x++) {
        float wx = x == 0 ? 6.0 : (abs(x) == 1 ? 4.0 : 1.0);
        float wy = y == 0 ? 6.0 : (abs(y) == 1 ? 4.0 : 1.0);
        vec2 sampleUV = sourceUV + vec2(float(x), float(y)) * uiPixel * radius;
        // Blur the image and its coverage together so color spreads into the black margin.
        vec2 coverage = smoothstep(-footprint, footprint, sampleUV)
          * (1.0 - smoothstep(vec2(1.0) - footprint, vec2(1.0) + footprint, sampleUV));
        color += textureLod(map, clamp(sampleUV, vec2(0.0), vec2(1.0)), lod).rgb
          * coverage.x * coverage.y * wx * wy / 256.0;
      }
    }
  }
  return color * (1.0 - min(1.0, effect * 2.0));
}
`;
// The camera half stays in its original transform. Only the cover half rotates.
const foldShader = `
uniform float foldAngle;
vec2 rotateHinge(vec2 p) {
  float c = cos(foldAngle), s = sin(foldAngle);
  p.y -= 0.275454;
  return vec2(c * p.x + s * p.y, -s * p.x + c * p.y + 0.275454);
}
#ifdef FLEXIBLE_SCREEN
vec4 bendStrip(vec3 p) {
  float halfWidth = 0.35;
  if (p.x >= halfWidth) return vec4(p.x, p.z, 1.0, 0.0);
  if (p.x <= -halfWidth) return vec4(rotateHinge(p.xz), cos(foldAngle), -sin(foldAngle));
  float t = (p.x + halfWidth) / (2.0 * halfWidth);
  float t2 = t*t, t3 = t2*t;
  vec2 a = rotateHinge(vec2(-halfWidth, p.z));
  vec2 b = vec2(halfWidth, p.z);
  vec2 ta = 2.0 * halfWidth * vec2(cos(foldAngle), -sin(foldAngle));
  vec2 tb = vec2(2.0 * halfWidth, 0.0);
  vec2 point = (2.0*t3-3.0*t2+1.0)*a + (t3-2.0*t2+t)*ta + (-2.0*t3+3.0*t2)*b + (t3-t2)*tb;
  vec2 tangent = normalize((6.0*t2-6.0*t)*a + (3.0*t2-4.0*t+1.0)*ta + (-6.0*t2+6.0*t)*b + (3.0*t2-2.0*t)*tb);
  return vec4(point, tangent);
}
#endif
`;

// ---------- 3D 初始化 ----------

async function init() {
  readScroll();
  rig.p = rawP;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 250);
  const TARGET = new THREE.Vector3(0, 0, .275454);
  camera.position.set(0, 0, 40);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  viewport.appendChild(renderer.domElement);

  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environment, .04).texture;
  environment.dispose();
  pmrem.dispose();
  scene.environmentIntensity = 1.35;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb5baa8, 1.8));
  const key = new THREE.DirectionalLight(0xfffcf5, 2.6);
  key.position.set(-15, 25, 30);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe8edf5, 2);
  rim.position.set(15, 5, -15);
  scene.add(rim);

  const phone = new THREE.Group();
  scene.add(phone);
  const bend = { value: Math.PI };
  const screens = {};
  const uiReferenceEye = new THREE.Vector3(0, 0, 40);
  const innerUIFrame = new THREE.Vector4(-7.89935, .34562 - 5.8974, 15.7987, 11.1035);
  const outerUIFrame = new THREE.Vector4(.23396, .27173 - 5.8974, 7.73936, 11.2513)
    .multiplyScalar((uiReferenceEye.z - .24948) / (uiReferenceEye.z - .825538));

  // 屏幕界面：外屏锁屏 / 内屏简历主屏
  const { themes: defaultUIs, redraw: redrawUI } = await loadDefaultUIs();
  const uiTextures = [];
  for (const kind of ['inner', 'outer']) {
    const texture = new THREE.CanvasTexture(defaultUIs.wallpaper[kind]);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    uiTextures.push(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    screens[kind] = {
      material,
      frame: { value: (kind === 'inner' ? innerUIFrame : outerUIFrame).clone() },
      gradient: { value: new THREE.Vector2(kind === 'inner' ? .5 : 0, kind === 'inner' ? 0 : 1) },
      pixel: { value: new THREE.Vector2(1 / defaultUIs.wallpaper[kind].width, 1 / defaultUIs.wallpaper[kind].height) },
    };
  }
  // 屏幕时钟每 30 秒刷新
  setInterval(() => {
    redrawUI();
    uiTextures.forEach(texture => texture.needsUpdate = true);
  }, 30000);

  // ---------- 模型加载与折叠网格（源自 iphone-duo） ----------

  const model = await new USDLoader().loadAsync('./assets/iPhone_Duo_Render.usdc');
  model.scale.multiplyScalar(100);
  model.updateMatrixWorld(true);
  model.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    geometry.translate(0, -5.8974, 0);
    let ancestor = object;
    while (ancestor && !['upTUAKvMVkPOMKq', 'SiftyleUEEZwLhF'].includes(ancestor.name)) ancestor = ancestor.parent;
    const moving = ancestor?.name === 'upTUAKvMVkPOMKq';
    const flexible = ['JnJdTkxbQgUtLwU', 'xdyyaajWsatVNxN', 'UXtsBZYlaUvHoEh', 'MvKPXGSdYDVvSpk'].includes(object.name);
    const kind = object.name === 'UXtsBZYlaUvHoEh' ? 'inner' : object.name === 'hhgAIoCGsHXeDPY' ? 'outer' : null;
    const material = kind ? screens[kind].material : object.material.clone();
    if (kind) {
      const p = geometry.attributes.position;
      const uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) {
        uv[i * 2] = kind === 'inner' ? (p.getX(i) + 7.89935) / 15.7987 : (-.23396 - p.getX(i)) / 7.73936;
        uv[i * 2 + 1] = kind === 'inner' ? (p.getY(i) + 5.8974 - .34562) / 11.1035 : (p.getY(i) + 5.8974 - .27173) / 11.2513;
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    if (moving || flexible) {
      material.onBeforeCompile = shader => {
        shader.uniforms.foldAngle = bend;
        if (kind) {
          shader.uniforms.uiFrame = screens[kind].frame;
          shader.uniforms.uiGradient = screens[kind].gradient;
          shader.uniforms.uiReferenceEye = { value: uiReferenceEye };
          shader.uniforms.uiPixel = screens[kind].pixel;
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_pars_fragment>', `
            #include <map_pars_fragment>
            ${kind === 'inner' ? '#define INNER_UI' : ''}
            ${screenShader}
          `).replace('#include <map_fragment>', 'diffuseColor.rgb *= screenColor();');
          shader.vertexShader = `varying vec3 vUIPosition;\n${shader.vertexShader}`;
          shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
            vUIPosition = transformed;
            #include <project_vertex>
          `);
        }
        shader.vertexShader = `${flexible ? '#define FLEXIBLE_SCREEN\n' : ''}${foldShader}\n${shader.vertexShader}`;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', flexible ? `
          vec4 folded = bendStrip(position);
          vec3 transformed = vec3(folded.x, position.y, folded.y);
        ` : `
          vec2 folded = rotateHinge(position.xz);
          vec3 transformed = vec3(folded.x, position.y, folded.y);
        `);
        shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
          vec3 objectNormal = vec3(normal);
          ${flexible ? 'vec4 strip = bendStrip(position); float a = atan(-strip.w, strip.z);' : 'float a = foldAngle;'}
          objectNormal.x = cos(a) * normal.x + sin(a) * normal.z;
          objectNormal.z = -sin(a) * normal.x + cos(a) * normal.z;
        `);
      };
      material.customProgramCacheKey = () => `${flexible ? 'fold-flexible' : 'fold-cover'}-${kind || 'body'}`;
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = object.name;
    mesh.frustumCulled = false;
    phone.add(mesh);
  });

  function setAngle(value) {
    bend.value = (180 - value) / 180 * Math.PI;
    screens.outer.material.color.setScalar(value >= 180 ? 0 : 1);
  }

  // ---------- 尺寸自适应 ----------

  function resize() {
    const { width, height } = viewport.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(viewport);

  // ---------- 渲染循环：滚动 → 展开 ----------

  let running = true;
  new IntersectionObserver(([entry]) => { running = entry.isIntersecting; }).observe(section);

  let lastTime = performance.now();
  renderer.setAnimationLoop(now => {
    const dt = Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    if (!running) return;

    // 进度与展开度平滑
    const k = damp(dt, reduceMotion ? 30 : 9);
    rig.p += (rawP - rig.p) * k;
    const foldRaw = smoothstep(clamp((rig.p - .04) / .54, 0, 1));
    rig.fold += (foldRaw - rig.fold) * k;

    setAngle(rig.fold * 180);
    // 合盖后设备偏在铰链对侧，整体平移保持居中
    phone.position.x = -3.95 * Math.max(0, -Math.cos(bend.value));

    // 视差与拖拽回弹：横向视角松手后缓慢回正，保留观察时间
    if (!rig.dragging) {
      rig.dragYawT *= Math.exp(-dt * .3);
      rig.dragPitchT *= Math.exp(-dt * .6);
    }
    rig.parallaxX += (rig.parallaxTX - rig.parallaxX) * damp(dt, 6);
    rig.parallaxY += (rig.parallaxTY - rig.parallaxY) * damp(dt, 6);
    rig.dragYaw += (rig.dragYawT - rig.dragYaw) * damp(dt, 10);
    rig.dragPitch += (rig.dragPitchT - rig.dragPitch) * damp(dt, 10);

    // 运镜：合盖时侧 3/4 视角，折叠中段带角度展示弯折，展开后回到正视图
    const t = rig.fold;
    const drift = reduceMotion ? 0 : 1;
    const yaw = (0.30 * (1 - t) + 0.42 * Math.sin(Math.PI * t)) * drift + rig.parallaxX + rig.dragYaw;
    const pitch = (0.12 * (1 - t) + 0.16 * Math.sin(Math.PI * t)) * drift + rig.parallaxY + rig.dragPitch;
    const dist = 40;
    camera.position.set(
      TARGET.x + dist * Math.cos(pitch) * Math.sin(yaw),
      TARGET.y + dist * Math.sin(pitch),
      TARGET.z + dist * Math.cos(pitch) * Math.cos(yaw));
    camera.lookAt(TARGET);

    // 视野随展开变化：合盖取近景，展开取全景
    const w = viewport.clientWidth, h = viewport.clientHeight;
    const wide = w < 760;
    const frameW = lerp(wide ? 13 : 12.5, wide ? 19.5 : 23, t);
    const frameH = lerp(14, 16.5, t);
    const ppu = Math.min(w / frameW, h / frameH);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / ppu / 2 / dist));
    camera.updateProjectionMatrix();

    // 展开完成后淡入文字层
    overlay.classList.toggle('visible', rig.p > .52);

    renderer.render(scene, camera);
  });

  loadingEl.classList.add('hidden');
}

init().catch(error => {
  console.error(error);
  loadingEl.classList.add('hidden');
  fallbackEl.classList.add('show');
});
