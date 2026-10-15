import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const root = document.documentElement;
root.classList.add('js');

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth < 760;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

$('#year').textContent = new Date().getFullYear();

/* ---------- UI ---------- */
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
    const items = $$('.eyebrow, h1, h2, .lead, .actions, .tags li, .card, .mail, .foot', copy);
    items.forEach((el) => el.classList.add('reveal'));
    gsap.to(items, {
      opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: .09,
      scrollTrigger: { trigger: copy, start: 'top 80%', once: true },
    });
    const section = copy.closest('.station');
    if (section.id !== 'contact') {
      gsap.to(copy, {
        opacity: 0.08, y: -50, ease: 'none',
        scrollTrigger: { trigger: section, start: 'bottom 55%', end: 'bottom 5%', scrub: true },
      });
    }
  });
}

/* ---------- 3D scene ---------- */
const canvas = $('#scene');
const loader = $('#loader');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  root.classList.add('no-webgl');
  loader.classList.add('done');
  console.warn('WebGL unavailable', err);
}
if (renderer) start();

function start() {
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 200);

  const STEP = 16;
  const stations = $$('.station');

  // Soft warm studio light
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x8a7f70, 1.1));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.4);
  scene.add(sun);

  const clay = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.45, envMapIntensity: 0.55 });
  const bronze = () => new THREE.MeshStandardMaterial({ color: 0xb37a43, metalness: 1, roughness: 0.3, envMapIntensity: 1 });

  const objects = [];
  const add = (group, i) => { group.userData.i = i; scene.add(group); objects.push(group); return group; };

  // 0: soft torus knot with an orbiting bronze bead
  {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.3, 300, 48, 2, 3), clay(0xd8cbb6)));
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 32), bronze());
    g.add(bead); g.userData.orbit = { mesh: bead, r: 2.05, speed: 0.6 };
    add(g, 0);
  }
  // 1: staggered rounded blocks
  {
    const g = new THREE.Group();
    const tones = [0xd3c6b0, 0xe0d5c1, 0xcbbca5, 0xe4dac8];
    [[-0.7, -0.95, 0, 1.25], [0.55, -0.95, 0.2, 1.25], [-0.1, 0.25, 0, 1.25], [1.1, 0.25, -0.2, 1.0]].forEach(([x, y, z, s], k) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(s, s, s, 6, 0.14), clay(tones[k]));
      m.position.set(x, y, z); m.rotation.y = k * 0.18; g.add(m);
    });
    const cube = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.6, 0.6, 6, 0.1), bronze());
    cube.position.set(0.1, 1.35, 0.1); g.add(cube);
    add(g, 1);
  }
  // 2: lens — clay ring, bronze hairline ring and a dark core
  {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.3, 48, 120), clay(0xdcc3ae)));
    const hair = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.035, 24, 120), bronze()); g.add(hair);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 48), clay(0x3a322c)); g.add(core);
    g.userData.spin = [hair];
    add(g, 2);
  }
  // 3: smooth sphere with a bronze orbit ring
  {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 5), clay(0xc6cbb9)));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.025, 16, 160), bronze());
    ring.rotation.x = Math.PI / 2.4; g.add(ring);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 32), bronze()); g.add(bead);
    g.userData.orbit = { mesh: bead, r: 1.95, speed: 0.5, tilt: Math.PI / 2.4 };
    add(g, 3);
  }
  // 4: arc of floating slabs (a nod to the work cards)
  {
    const g = new THREE.Group();
    const tones = [0xd9cdb9, 0xd6bfae, 0xc4cab8, 0xcfc4d3, 0xd9cdb9];
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.8, 0.12, 6, 0.06), clay(tones[k]));
      m.position.set((k - 2) * 1.55, Math.sin(k * 1.2) * 0.25, -Math.abs(k - 2) * 0.45);
      m.rotation.y = (k - 2) * -0.22;
      g.add(m);
    }
    add(g, 4);
  }
  // 5: finale — warm sphere with fine bronze rings (sits on the dark section)
  {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.15, 96, 96), clay(0xe9dfcf)));
    for (let k = 0; k < 3; k++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.7 + k * 0.42, 0.014, 12, 180), bronze());
      r.rotation.set(k * 0.85 + 0.4, k * 0.5, 0); g.add(r);
    }
    add(g, 5);
  }

  // Soft contact shadow under each object
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadows = objects.map(() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.2, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; scene.add(m); return m;
  });

  function layout() {
    const mobile = isMobile();
    objects.forEach((o) => {
      const i = o.userData.i;
      const side = stations[i].classList.contains('side-end') ? 1 : stations[i].classList.contains('side-start') ? -1 : 0;
      // RTL: side-start text is on the right, so the object goes left and vice versa
      const x = mobile ? 0 : side * 3.0;
      const y = mobile ? 1.5 : 0.1;
      o.position.set(x, y, -i * STEP);
      let s = mobile ? 0.85 : (i === 0 ? 1.2 : i <= 3 ? 1.4 : 1);
      if (i === 4) { o.position.set(mobile ? 0 : -2.6, mobile ? 2.2 : 1.7, -i * STEP); s = mobile ? 0.55 : 0.6; }
      if (i === 5) { o.position.set(mobile ? 0 : -3.0, mobile ? 1.6 : 0.2, -i * STEP); s = mobile ? 0.85 : 1.3; }
      o.scale.setScalar(s);
      o.userData.baseY = o.position.y;
      o.userData.baseScale = s;
    });
  }

  function resize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile() ? 1.75 : 2));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    layout();
  }
  resize();
  addEventListener('resize', resize);

  // Scroll mapping by real section positions, so uneven section heights stay aligned with their object
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

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / innerWidth - .5) * 2;
    mouse.y = (e.clientY / innerHeight - .5) * 2;
  });

  // Page colour follows the active section
  const meta = document.querySelector('meta[name="theme-color"]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      root.style.setProperty('--bg', en.target.dataset.bg);
      root.dataset.tone = en.target.dataset.tone;
      if (meta) meta.content = en.target.dataset.bg;
    });
  }, { threshold: 0.5 });
  stations.forEach((s) => io.observe(s));

  const clock = new THREE.Clock();
  const camTarget = new THREE.Vector3();
  const lastZ = -(stations.length - 1) * STEP;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    current += (target - current) * (reduceMotion ? 1 : 1 - Math.pow(0.002, dt));
    const z = 9 + lastZ * current;
    mouse.sx += (mouse.x - mouse.sx) * 0.04;
    mouse.sy += (mouse.y - mouse.sy) * 0.04;

    camera.position.set(mouse.sx * 0.5, -mouse.sy * 0.3, z);
    camTarget.set(mouse.sx * 0.25, -mouse.sy * 0.15, z - 8);
    camera.lookAt(camTarget);
    sun.position.set(camera.position.x + 4 + mouse.sx * 4, camera.position.y + 6 - mouse.sy * 3, camera.position.z + 5);

    objects.forEach((o, idx) => {
      const d = Math.abs(camera.position.z - 9 - o.position.z) / STEP;
      const k = THREE.MathUtils.clamp(1 - d * 1.15, 0, 1);
      const e = k * k * (3 - 2 * k);
      o.visible = e > 0.001;
      const sc = o.userData.baseScale * (0.55 + 0.45 * e);
      o.scale.setScalar(sc);

      if (!reduceMotion) {
        o.rotation.y = t * 0.12 + idx * 0.7 + mouse.sx * 0.25;
        o.rotation.x = Math.sin(t * 0.3 + idx) * 0.12 - mouse.sy * 0.1;
        o.position.y = o.userData.baseY + Math.sin(t * 0.6 + idx) * 0.1;
        const orb = o.userData.orbit;
        if (orb) {
          const a = t * orb.speed;
          orb.mesh.position.set(Math.cos(a) * orb.r, orb.tilt ? Math.sin(a) * orb.r * Math.sin(orb.tilt) : Math.sin(a * 1.3) * 0.6, Math.sin(a) * orb.r * (orb.tilt ? Math.cos(orb.tilt) : 1));
        }
        if (o.userData.spin) o.userData.spin.forEach((m) => { m.rotation.z = t * 0.4; });
      }

      const sh = shadows[idx];
      sh.visible = o.visible;
      sh.position.set(o.position.x, o.userData.baseY - 2.4 * o.userData.baseScale, o.position.z);
      sh.scale.setScalar(o.userData.baseScale * (0.6 + 0.4 * e));
      sh.material.opacity = 0.2 * e;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(() => { frame(); loader.classList.add('done'); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) clock.getDelta(); });
}
