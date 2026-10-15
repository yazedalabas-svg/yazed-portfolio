import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.documentElement;
root.classList.add('js');

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth < 760;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

$('#year').textContent = new Date().getFullYear();

/* ---------- UI: menu, progress, reveal, counters, tilt ---------- */
const nav = $('#nav');
const menuBtn = $('#menuBtn');
menuBtn.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true';
  menuBtn.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
});
nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) { menuBtn.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); }
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('open')) { menuBtn.click(); menuBtn.focus(); }
});

if (window.gsap && window.ScrollTrigger && !reduceMotion) {
  gsap.registerPlugin(ScrollTrigger);
  $$('.copy').forEach((copy) => {
    const items = $$('.eyebrow, h1, h2, .lead, .actions, .chips li, .proof, .card, .foot', copy);
    items.forEach((el) => el.classList.add('reveal'));
    gsap.to(items, {
      opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .08,
      scrollTrigger: { trigger: copy, start: 'top 78%', once: true },
    });
  });
  $$('[data-count]').forEach((el) => {
    const end = +el.dataset.count;
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 2, ease: 'power2.out', delay: .6, onUpdate: () => { el.textContent = Math.round(o.v) + '+'; } });
  });
} else {
  $$('[data-count]').forEach((el) => { el.textContent = el.dataset.count + '+'; });
}

// Card tilt (pointer devices only)
if (matchMedia('(hover: hover)').matches && !reduceMotion) {
  $$('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.setProperty('--ry', `${x * 14}deg`);
      card.style.setProperty('--rx', `${-y * 14}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

/* ---------- 3D scene ---------- */
const canvas = $('#scene');
const loader = $('#loader');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile(), alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  root.classList.add('no-webgl');
  loader.classList.add('done');
  console.warn('WebGL unavailable', err);
}

if (renderer) start();

function start() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.022);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);

  const STEP = 16;
  const stations = $$('.station');
  const accents = stations.map((s) => new THREE.Color(s.dataset.accent));
  const accentLive = accents[0].clone();

  // Lights follow the live accent colour
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.PointLight(accentLive, 60, 40, 1.6);
  const rim = new THREE.PointLight(0xffffff, 25, 40, 1.6);
  scene.add(key, rim);

  const solid = (color = 0xffffff) => new THREE.MeshStandardMaterial({ color, metalness: 0.92, roughness: 0.22, envMapIntensity: 1.2 });
  const wire = () => new THREE.MeshBasicMaterial({ color: accentLive, wireframe: true, transparent: true, opacity: 0.22 });

  // One hero object per station
  const objects = [];
  const add = (group, i) => { group.userData.i = i; scene.add(group); objects.push(group); return group; };

  // 0: torus knot
  {
    const g = new THREE.Group();
    const geo = new THREE.TorusKnotGeometry(1, 0.34, 220, 32);
    g.add(new THREE.Mesh(geo, solid(0xbfefff)));
    const w = new THREE.Mesh(geo, wire()); w.scale.setScalar(1.06); g.add(w);
    add(g, 0);
  }
  // 1: blocky cluster (games)
  {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const spots = [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 1, 1], [-1, -1, -1]];
    spots.forEach(([x, y, z]) => {
      const m = new THREE.Mesh(geo, solid(0xd9ccff)); m.position.set(x * 1.05, y * 1.05, z * 1.05); g.add(m);
      const w = new THREE.Mesh(geo, wire()); w.position.copy(m.position); w.scale.setScalar(1.04); g.add(w);
    });
    add(g, 1);
  }
  // 2: lens / film ring (video)
  {
    const g = new THREE.Group();
    const ring = new THREE.TorusGeometry(1.25, 0.2, 32, 100);
    g.add(new THREE.Mesh(ring, solid(0xffd9c4)));
    const inner = new THREE.TorusGeometry(0.8, 0.06, 16, 80);
    const im = new THREE.Mesh(inner, solid(0xffffff)); g.add(im);
    const core = new THREE.OctahedronGeometry(0.42, 0);
    const cm = new THREE.Mesh(core, solid(0xffffff)); g.add(cm);
    const w = new THREE.Mesh(core, wire()); w.scale.setScalar(1.5); g.add(w);
    g.userData.spin = [im, cm];
    add(g, 2);
  }
  // 3: icosahedron (3D / Blender)
  {
    const g = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(1.35, 1);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xc8ffe8, metalness: 0.85, roughness: 0.3, flatShading: true }));
    g.add(m);
    const w = new THREE.Mesh(geo, wire()); w.scale.setScalar(1.12); g.add(w);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2, 0.02, 8, 120), new THREE.MeshBasicMaterial({ color: accentLive }));
    orbit.rotation.x = Math.PI / 2.3; g.add(orbit);
    add(g, 3);
  }
  // 4: floating gallery shards (work)
  {
    const g = new THREE.Group();
    const geo = new THREE.OctahedronGeometry(0.5, 0);
    for (let k = 0; k < 14; k++) {
      const m = new THREE.Mesh(geo, solid(0xffd0e6));
      const a = (k / 14) * Math.PI * 2;
      m.position.set(Math.cos(a) * 3.4, Math.sin(k * 1.7) * 1.4, Math.sin(a) * 3.4);
      m.rotation.set(k, k * 2, 0);
      m.scale.setScalar(0.5 + (k % 4) * 0.2);
      g.add(m);
    }
    add(g, 4);
  }
  // 5: finale sphere + rings (contact)
  {
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.SphereGeometry(1.1, 64, 64), solid(0xffffff));
    g.add(s);
    for (let k = 0; k < 3; k++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.7 + k * 0.45, 0.018, 8, 160), new THREE.MeshBasicMaterial({ color: accentLive, transparent: true, opacity: 0.8 - k * 0.2 }));
      r.rotation.set(k * 0.9 + 0.4, k * 0.5, 0); g.add(r);
    }
    add(g, 5);
  }

  // Particles
  const COUNT = isMobile() ? 700 : 1800;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - .5) * 36;
    pos[i * 3 + 1] = (Math.random() - .5) * 20;
    pos[i * 3 + 2] = 12 - Math.random() * (STEP * stations.length + 24);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({ color: accentLive, size: 0.045, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(pGeo, pMat));

  // Layout objects relative to the camera path (responsive)
  function layout() {
    const mobile = isMobile();
    objects.forEach((o) => {
      const i = o.userData.i;
      const side = stations[i]?.classList.contains('side-end') ? 1 : stations[i]?.classList.contains('side-start') ? -1 : 0;
      // RTL: side-start text sits on the right, so the object goes left (negative x) and vice versa
      const x = mobile ? 0 : (side === -1 ? -3.1 : side === 1 ? 3.1 : 0);
      const y = mobile ? 1.7 : 0;
      o.position.set(x, y, -i * STEP);
      o.scale.setScalar(mobile ? 0.9 : (i >= 1 && i <= 3 ? 1.45 : 1.1));
      if (i === 4) { o.position.set(0, mobile ? 2.4 : 2.3, -i * STEP); o.scale.setScalar(mobile ? 0.55 : 0.8); }
      if (i === 5) { o.position.set(0, mobile ? 1.7 : 1.4, -i * STEP); o.scale.setScalar(mobile ? 0.9 : 1.3); }
      o.userData.baseY = o.position.y;
      o.userData.baseScale = o.scale.x;
    });
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, isMobile() ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    layout();
  }
  resize();
  addEventListener('resize', resize);

  // Scroll mapping: piecewise by real section positions, so uneven section heights stay aligned with their object
  let target = 0, current = 0, tops = [];
  function measure() { tops = stations.map((s) => s.offsetTop); }
  function readScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const y = scrollY;
    let f = stations.length - 1;
    for (let i = 0; i < tops.length - 1; i++) {
      if (y < tops[i + 1]) { f = i + Math.max(0, (y - tops[i]) / (tops[i + 1] - tops[i])); break; }
    }
    if (max > 0 && y >= max - 2) f = stations.length - 1;
    target = f / (stations.length - 1);
    $('#progressBar').style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  }
  measure(); readScroll();
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', () => { measure(); readScroll(); });
  addEventListener('load', () => { measure(); readScroll(); });

  // Mouse parallax
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / innerWidth - .5) * 2;
    mouse.y = (e.clientY / innerHeight - .5) * 2;
  });

  // Accent colour follows the active section
  let activeAccent = 0;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        activeAccent = stations.indexOf(en.target);
        root.style.setProperty('--accent', en.target.dataset.accent);
      }
    });
  }, { threshold: 0.5 });
  stations.forEach((s) => io.observe(s));

  const clock = new THREE.Clock();
  const camTarget = new THREE.Vector3();
  const lastZ = -(stations.length - 1) * STEP;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    current += (target - current) * (reduceMotion ? 1 : 1 - Math.pow(0.001, dt));
    const z = 9 + (lastZ - 0) * current; // camera travels from z=9 down the stations
    mouse.sx += (mouse.x - mouse.sx) * 0.05;
    mouse.sy += (mouse.y - mouse.sy) * 0.05;

    camera.position.set(mouse.sx * 0.6, -mouse.sy * 0.4, z);
    camTarget.set(mouse.sx * 0.3, -mouse.sy * 0.2, z - 8);
    camera.lookAt(camTarget);

    // Accent colour blend
    accentLive.lerp(accents[activeAccent], 1 - Math.pow(0.01, dt));
    key.color.copy(accentLive);
    key.position.set(camera.position.x + 3, camera.position.y + 3, camera.position.z + 2);
    rim.position.set(camera.position.x - 4, camera.position.y - 2, camera.position.z - 3);

    // Only the object of the current station is shown; neighbours scale in/out as the camera flies by
    objects.forEach((o) => {
      const d = Math.abs(camera.position.z - 9 - o.position.z) / STEP; // 0 = at its station
      const k = THREE.MathUtils.clamp(1 - d * 1.15, 0, 1);
      const e = k * k * (3 - 2 * k);
      o.visible = e > 0.001;
      o.scale.setScalar(o.userData.baseScale * (0.4 + 0.6 * e));
    });

    if (!reduceMotion) {
      objects.forEach((o) => {
        const i = o.userData.i;
        o.rotation.y = t * (0.25 + i * 0.03) + mouse.sx * 0.4;
        o.rotation.x = Math.sin(t * 0.4 + i) * 0.25 - mouse.sy * 0.2;
        if (o.userData.spin) { o.userData.spin[0].rotation.z = t * 0.8; o.userData.spin[1].rotation.y = -t * 1.2; }
        // gentle float around the laid-out base height
        o.position.y = o.userData.baseY + Math.sin(t * 0.8 + i) * 0.12;
      });
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(() => {
    frame();
    loader.classList.add('done');
  });

  // Free GPU memory on page hide is handled by the browser; pause explicit work when tab hidden
  document.addEventListener('visibilitychange', () => { if (!document.hidden) clock.getDelta(); });
}
