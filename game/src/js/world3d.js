// world3d.js — Three.js мир: процедурные текстуры, квартира/улица/банк,
// FPS-контроллер, кинопролог и миссия «Флешка» от первого лица.
import * as THREE from '../vendor/three.module.js';
import { Engine } from './engine.js';

const V = THREE.Vector3;
function rand(a, b) { return a + Math.random() * (b - a); }

// ---------- процедурные canvas-текстуры ----------
function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, rx = 1, ry = 1) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; }
function woodTex() { const c = cvs(256, 256), x = c.getContext('2d'); x.fillStyle = '#5a3a22'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(${40 + Math.random() * 40},${25 + Math.random() * 25},10,.5)`; x.lineWidth = rand(0.5, 2); x.beginPath(); x.moveTo(0, i * 4 + rand(-2, 2)); x.bezierCurveTo(80, i * 4 + rand(-6, 6), 160, i * 4 + rand(-6, 6), 256, i * 4 + rand(-3, 3)); x.stroke(); } return c; }
function parquetTex() { const c = cvs(256, 256), x = c.getContext('2d'); for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 4; gx++) { const px = gx * 64, py = gy * 32; x.fillStyle = (gx + gy) % 2 ? '#6b4423' : '#7a4f2a'; x.fillRect(px, py, 64, 32); x.strokeStyle = 'rgba(0,0,0,.35)'; x.strokeRect(px + .5, py + .5, 63, 31); for (let i = 0; i < 6; i++) { x.strokeStyle = 'rgba(0,0,0,.08)'; x.beginPath(); x.moveTo(px, py + i * 5); x.lineTo(px + 64, py + i * 5 + rand(-2, 2)); x.stroke(); } } return c; }
function brickTex() { const c = cvs(256, 256), x = c.getContext('2d'); x.fillStyle = '#2a2a30'; x.fillRect(0, 0, 256, 256); for (let r = 0; r < 16; r++) { for (let b = 0; b < 8; b++) { const px = b * 32 + (r % 2 ? 16 : 0), py = r * 16; x.fillStyle = `rgb(${40 + Math.random() * 20},${40 + Math.random() * 18},${48 + Math.random() * 18})`; x.fillRect(px + 1, py + 1, 30, 14); } } return c; }
function marbleTex() { const c = cvs(256, 256), x = c.getContext('2d'); x.fillStyle = '#e9e7df'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 24; i++) { x.strokeStyle = `rgba(120,120,135,${rand(.1, .35)})`; x.lineWidth = rand(0.5, 2.5); x.beginPath(); let px = rand(0, 256), py = 0; x.moveTo(px, py); while (py < 256) { px += rand(-18, 18); py += rand(10, 24); x.lineTo(px, py); } x.stroke(); } return c; }
function codeTex() { const c = cvs(256, 256), x = c.getContext('2d'); x.fillStyle = '#04120a'; x.fillRect(0, 0, 256, 256); x.font = '11px monospace'; const ch = '01<>{}#$_/\\ абвmrakROOT'; for (let i = 0; i < 22; i++) { let s = ''; for (let j = 0; j < 30; j++) s += ch[Math.floor(Math.random() * ch.length)]; x.fillStyle = Math.random() < .12 ? '#9dff6a' : '#2fae3a'; x.fillText(s, 4, 12 + i * 11); } return c; }

// ---------- материалы ----------
let MAT = null;
function buildMats() {
  MAT = {
    wall: new THREE.MeshStandardMaterial({ map: tex(brickTex(), 3, 2), roughness: .95 }),
    parquet: new THREE.MeshStandardMaterial({ map: tex(parquetTex(), 6, 6), roughness: .8 }),
    wood: new THREE.MeshStandardMaterial({ map: tex(woodTex()), roughness: .7 }),
    marble: new THREE.MeshStandardMaterial({ map: tex(marbleTex(), 4, 4), roughness: .35, metalness: .1 }),
    marbleWall: new THREE.MeshStandardMaterial({ map: tex(marbleTex(), 2, 1), roughness: .4 }),
    screen: new THREE.MeshBasicMaterial({ map: tex(codeTex()) }),
    dark: new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: .6, metalness: .3 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x33363e, roughness: .4, metalness: .7 }),
    sofa: new THREE.MeshStandardMaterial({ color: 0x3a2b4a, roughness: .9 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc9a07a, roughness: .8 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x24303a, roughness: .9 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x224455, transparent: true, opacity: .35, roughness: .1, metalness: .2 })
  };
}

export const World3D = {
  ready: false, scene: null, cam: null, renderer: null, canvas: null,
  level: null, colliders: [], spots: [], npcs: [],
  keys: {}, yaw: 0, pitch: 0, pos: new V(0, 1.6, 4), vel: new V(),
  mode: 'idle', clock: null, t0: 0, dayT: 20, // dayT in hours (0..24)
  flash: null, nearSpot: null, locked: false,

  init(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.012);
    this.cam = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 200);
    buildMats();
    this.hemi = new THREE.HemisphereLight(0x6a7a9a, 0x20160f, 0.55); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe6c0, 0.6); this.sun.position.set(6, 12, 4); this.scene.add(this.sun);
    this.amb = new THREE.AmbientLight(0x404858, 0.5); this.scene.add(this.amb);
    this.level = new THREE.Group(); this.scene.add(this.level);
    this.clock = new THREE.Clock();
    addEventListener('resize', () => { this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); });
    this._input();
    this.ready = true;
    this._loop();
  },
  _input() {
    addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE') this._interact();
    });
    addEventListener('keyup', e => this.keys[e.code] = false);
    this.canvas.addEventListener('click', () => {
      if (Engine.desktop && Engine.desktop.visible) return;
      if (this.mode === 'play' || this.mode === 'flash') this.canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === this.canvas; this._cursor(); });
    addEventListener('mousemove', e => {
      if (!this.locked) return;
      if (Engine.desktop && Engine.desktop.visible) return;
      this.yaw -= e.movementX * 0.0024;
      this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - e.movementY * 0.0024));
    });
  },
  _cursor() { document.body.style.cursor = this.locked ? 'none' : 'default'; },
  releasePointer() { if (document.pointerLockElement) document.exitPointerLock(); },

  // ---------- строительные помощники ----------
  box(w, h, d, mat, x, y, z, collide) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); this.level.add(m);
    if (collide) this.colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    return m;
  },
  plane(w, d, mat, x, y, z, rx) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = rx != null ? rx : -Math.PI / 2; m.position.set(x, y, z); this.level.add(m); return m; },
  spot(x, z, r, label, fn) { this.spots.push({ x, z, r, label, fn }); },
  pointLight(x, y, z, color, int, dist) { const p = new THREE.PointLight(color, int, dist || 10); p.position.set(x, y, z); this.level.add(p); return p; },

  // простая сидящая/стоящая фигура
  figure(x, z, rotY, seated, shirt) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY || 0;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, seated ? 0.6 : 0.9, 10), shirt || MAT.cloth);
    body.position.y = seated ? 0.95 : 1.1; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 12), MAT.skin);
    head.position.y = seated ? 1.42 : 1.72; g.add(head);
    if (seated) { // бёдра вперёд (сидит)
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.5), MAT.cloth); legs.position.set(0, 0.62, 0.22); g.add(legs);
    } else {
      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 8), MAT.cloth); legs.position.y = 0.35; g.add(legs);
    }
    this.level.add(g); this.npcs.push(g); return g;
  },

  // ---------- очистка/загрузка сцен ----------
  clearLevel() {
    while (this.level.children.length) { const c = this.level.children.pop(); if (c.geometry) c.geometry.dispose(); this.level.remove(c); }
    this.colliders = []; this.spots = []; this.npcs = [];
  },
  loadScene(name) {
    this.clearLevel();
    this.sceneName = name;
    if (name === 'apartment') this.buildApartment();
    else if (name === 'street') this.buildStreet();
    else if (name === 'bank') this.buildBank();
    this.mode = 'play';
    this._fadeOut();
    Engine.audio && Engine.audio.ambient(name === 'bank' ? 'bank' : 'room');
    this._hud();
  },

  buildApartment() {
    const F = -9, Fx = 9, Fz = 6, Fzn = -6;
    this.plane(18, 12, MAT.parquet, 0, 0, 0);
    this.plane(18, 12, new THREE.MeshStandardMaterial({ color: 0x0c0d12, roughness: 1 }), 0, 3.2, 0, Math.PI / 2);
    // периметр
    const wh = 3.2;
    this.box(18, wh, 0.3, MAT.wall, 0, wh / 2, -6, true);   // север
    this.box(18, wh, 0.3, MAT.wall, 0, wh / 2, 6, true);    // юг
    this.box(0.3, wh, 12, MAT.wall, -9, wh / 2, 0, true);   // запад
    // восток со дверью (проём для двери на улицу)
    this.box(0.3, wh, 7, MAT.wall, 9, wh / 2, -2.5, true);
    this.box(0.3, wh, 3, MAT.wall, 9, wh / 2, 4.5, true);
    // перегородка (спальня слева / гостиная справа) с проёмом
    this.box(0.25, wh, 6, MAT.wall, 0, wh / 2, -3, true);
    // окна (север) — синие панели
    for (let i = -1; i <= 1; i += 2) this.box(2.4, 1.4, 0.05, MAT.glass, i * 4, 1.8, -5.85, false);

    // === спальня (левая половина) ===
    // тройной монитор на столе у северной стены
    this.box(2.6, 0.08, 0.8, MAT.wood, -5.5, 0.95, -5.2, true);
    this.box(0.1, 0.9, 0.1, MAT.metal, -6.6, 0.5, -5.2, false);
    for (let i = -1; i <= 1; i++) { const s = this.box(0.82, 0.5, 0.05, MAT.screen, -5.5 + i * 0.9, 1.4, -5.15, false); s.rotation.y = -i * 0.25; }
    this.box(1.2, 0.5, 0.05, MAT.screen, -5.5, 1.4, -5.15, false).visible = false;
    this.pcChair = this.box(0.5, 0.5, 0.5, MAT.dark, -5.5, 0.55, -4.3, false);
    // серверная стойка
    this.box(0.7, 2.2, 0.7, MAT.dark, -8, 1.1, -4.5, true);
    for (let i = 0; i < 6; i++) this.box(0.74, 0.04, 0.02, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x39ff14 : 0xff2a6d }), -8, 0.5 + i * 0.3, -4.15, false);
    // кровать (НЕ спавнить внутри!)
    const bedX = -6.5, bedZ = 3.2, bedW = 2.2, bedD = 3.2;
    this.box(bedW, 0.4, bedD, MAT.wood, bedX, 0.25, bedZ, true);
    this.box(bedW - 0.2, 0.25, bedD - 0.3, MAT.sofa, bedX, 0.55, bedZ, false);
    this.box(bedW - 0.2, 0.3, 0.5, new THREE.MeshStandardMaterial({ color: 0xcccccc }), bedX, 0.6, bedZ - 1.2, false);
    // неон
    const neon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2a6d })); neon.position.set(-8.7, 2, 0); this.level.add(neon);

    // === гостиная + кухня (правая половина) ===
    // диван + ТВ
    this.box(2.6, 0.6, 1, MAT.sofa, 5, 0.4, 3.5, true);
    this.box(2.4, 1.3, 0.1, MAT.dark, 5, 1.4, 5.6, true);
    this.box(2.1, 1.05, 0.06, MAT.screen, 5, 1.4, 5.5, false);
    // кухня: стол, бутылка, письмо
    this.box(1.4, 0.08, 0.9, MAT.wood, 6.5, 0.9, -3.8, true);
    const bottle = this.box(0.14, 0.5, 0.14, MAT.glass, 6.2, 1.2, -3.8, false);
    const letter = this.box(0.3, 0.02, 0.42, new THREE.MeshStandardMaterial({ color: 0xf2efe6 }), 6.9, 0.95, -3.7, false); letter.rotation.z = 0.05;
    // прихожая (у восточной двери)
    this.box(0.9, 2.2, 0.08, MAT.wood, 8.8, 1.1, 1, true); // дверь на улицу (панель)

    // освещение (≤6 PointLight всего)
    this.pointLight(-5.5, 2.4, -4, 0x39ff14, 0.7, 7);   // монитор-свет
    this.pointLight(-8.7, 2.2, 0, 0xff2a6d, 0.8, 7);    // неон
    this.pointLight(5, 2.6, 4, 0x6aa0ff, 0.6, 9);       // ТВ/гостиная
    this.pointLight(6.5, 2.4, -3.8, 0xffcc88, 0.5, 7);  // кухня

    // интеракции
    this.spot(-5.5, -4.1, 1.3, 'Сесть за ПК (E)', () => this.sitPC());
    this.spot(6.9, -3.7, 1.2, 'Прочитать письмо (E)', () => this.toast('«...в связи с сокращением штата». 19 лет — и одна бумажка.'));
    this.spot(8.6, 1, 1.4, 'Выйти во двор (E)', () => this.loadScene('street'));

    this.spawn(0, 2); this.yaw = Math.PI; // смотрит на север (мониторы)
    this.toast('Квартира Генри. WASD — ходьба, Shift — бег, мышь — осмотр, E — действие.');
  },

  buildStreet() {
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.03);
    this.plane(60, 60, new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 1 }), 0, 0, 0);
    // дорога
    this.plane(8, 60, new THREE.MeshStandardMaterial({ color: 0x0a0a0d, roughness: 1 }), 0, 0.01, 0);
    for (let z = -26; z < 26; z += 4) this.box(0.3, 0.02, 1.6, new THREE.MeshBasicMaterial({ color: 0xaaaa55 }), 0, 0.02, z, false);
    // дом Генри (слева)
    this.box(10, 7, 10, MAT.wall, -12, 3.5, -4, true);
    this.box(1.2, 2.2, 0.2, MAT.wood, -7, 1.1, -4, false);
    this.spot(-6.6, -4, 1.6, 'Войти домой (E)', () => this.loadScene('apartment'));
    // филиал ORLOV BANK (справа)
    this.box(12, 8, 12, MAT.marbleWall, 12, 4, 2, true);
    this.box(4, 3, 0.3, MAT.glass, 12, 1.5, -4.1, false);
    const sign = this.box(6, 0.9, 0.2, new THREE.MeshBasicMaterial({ color: 0x39ff14 }), 12, 6.5, -4.1, false);
    this.spot(12, -3.6, 2, 'Войти в ORLOV BANK (E)', () => this.loadScene('bank'));
    // фонари (point lights — держим бюджет)
    for (let i = -1; i <= 1; i++) { this.box(0.15, 4, 0.15, MAT.metal, -3, 2, i * 12, true); this.pointLight(-3, 4, i * 12, 0xffcc77, 0.7, 12); }
    this.pointLight(3, 4, 0, 0xffcc77, 0.7, 12); this.box(0.15, 4, 0.15, MAT.metal, 3, 2, 0, true);
    // машины, скамейка, киоск
    this.box(1.8, 0.7, 4, new THREE.MeshStandardMaterial({ color: 0x702030, roughness: .5, metalness: .4 }), -3.2, 0.5, 6, true);
    this.box(1.8, 0.7, 4, new THREE.MeshStandardMaterial({ color: 0x203050, roughness: .5, metalness: .4 }), -3.2, 0.5, -6, true);
    this.box(1.8, 0.4, 0.5, MAT.wood, 6, 0.4, -8, true);
    this.box(2, 2.4, 1.6, new THREE.MeshStandardMaterial({ color: 0x2a2f1a }), 7, 1.2, 8, true);
    this.hemi.intensity = 0.5;
    this.spawn(-6, 0); this.yaw = Math.PI / 2;
    this.toast('Двор. Слева — дом, справа — филиал ORLOV BANK.');
  },

  buildBank() {
    this.scene.fog = new THREE.FogExp2(0x0a0b10, 0.02);
    this.plane(24, 22, MAT.marble, 0, 0, 0);
    this.plane(24, 22, new THREE.MeshStandardMaterial({ color: 0xf0eee6, roughness: .9 }), 0, 5, 0, Math.PI / 2);
    const wh = 5;
    this.box(24, wh, 0.3, MAT.marbleWall, 0, wh / 2, -11, true);
    this.box(24, wh, 0.3, MAT.marbleWall, 0, wh / 2, 11, true);
    this.box(0.3, wh, 22, MAT.marbleWall, -12, wh / 2, 0, true);
    this.box(0.3, wh, 22, MAT.marbleWall, 12, wh / 2, 0, true);
    // вход (юг) проём — дверь
    this.box(4, 3, 0.1, MAT.glass, 0, 1.5, 10.9, false);
    // стойка ресепшн (север)
    this.box(8, 1.1, 1.4, MAT.wood, 0, 0.55, -9, true);
    this.figure(0, -9.8, 0, true, MAT.cloth); // ресепшн сидит
    // столы консультантов: СПРАВА Ирина, СЛЕВА Олег
    this._desk(6.5, -3, 'Ирина', 0xffffff, false);
    this.olegDesk = this._desk(-6.5, -3, 'Олег', 0x2b6a3a, true);
    // диваны ожидания (центр-юг)
    this.box(3, 0.5, 1, MAT.sofa, -2, 0.35, 6, true);
    this.box(3, 0.5, 1, MAT.sofa, 2, 0.35, 6, true);
    // банкоматы (у восточной стены)
    for (let i = -1; i <= 1; i++) this.box(1, 2, 0.8, MAT.metal, 10.8, 1, i * 2.5, true);
    this.atmPos = new V(10.8, 0, 0);
    // камеры (угол) — красные точки
    [[-11, -10], [11, -10], [11, 9]].forEach(([x, z]) => { this.box(0.3, 0.2, 0.3, MAT.dark, x, 4.4, z, false); const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2a2a })); d.position.set(x, 4.3, z); this.level.add(d); this.npcs.push(d); });
    // талон-автомат (у входа)
    this.box(0.5, 1.4, 0.4, MAT.metal, -3, 0.7, 8.5, true);
    // свет
    this.pointLight(0, 4.5, -6, 0xfff0d0, 0.6, 16);
    this.pointLight(0, 4.5, 6, 0xe8f0ff, 0.5, 16);
    this.hemi.intensity = 0.7; this.amb.intensity = 0.7;

    if (this.mode === 'flash') { this._flashSpots(); }
    else {
      this.spot(0, 9.6, 1.8, 'Выйти во двор (E)', () => this.loadScene('street'));
      this.spot(-3, 7.5, 1.4, 'Взять талон (E)', () => this.toast('Талон №А-14. Но сейчас не время — приходи по плану.'));
    }
    this.spawn(0, 9); this.yaw = Math.PI;
    this.toast(this.mode === 'flash' ? 'ORLOV BANK. Следуй меткам миссии (E). НЕ беги.' : 'Филиал ORLOV BANK. Осмотрись.');
  },
  _desk(x, z, name, color, isOleg) {
    const g = { x, z };
    this.box(1.8, 0.08, 0.9, MAT.wood, x, 0.78, z, true);
    this.box(0.5, 0.4, 0.05, MAT.screen, x, 1.1, z - 0.2, false); // монитор
    // системник под столом (TOWER)
    const tower = this.box(0.4, 0.7, 0.5, MAT.dark, x + (isOleg ? -0.6 : 0.6), 0.35, z + 0.2, true);
    if (isOleg) { tower.material = MAT.metal; this.olegTower = new V(x - 0.6, 0, z + 0.2); }
    this.figure(x, z - 1, 0, true, new THREE.MeshStandardMaterial({ color })); // консультант сидит лицом в зал
    return g;
  },

  // ---------- миссия «Флешка» ----------
  startFlash(done) {
    this.flash = { step: 0, done };
    this.loadScene('bank');
    this.mode = 'flash';
    this._flashSpots();
    this.toast('МИССИЯ: Флешка. Не беги. Жди сигналов команды.');
  },
  _flashSpots() {
    this.spots = [];
    const F = this.flash || (this.flash = { step: 0 });
    const steps = [
      { x: -3, z: 8.5, r: 1.6, label: 'Взять талон (E)', msg: 'Талон №А-14. Теперь сядь на диван и жди.' },
      { x: 2, z: 6, r: 1.6, label: 'Сесть ждать (E)', msg: 'Ждёшь. Присматриваешься к залу.' },
      { x: 10.5, z: 0, r: 3.0, label: 'Засечь камеры (E)', msg: '3 камеры. Питр глушит их на 40 секунд по сигналу.' },
      { x: this.olegTower ? this.olegTower.x : -7.1, z: 0.2 - 3, r: 1.8, label: 'Осмотреть системник Олега (E)', msg: 'Системник CONSULT-03 под столом слева. USB-порт спереди.' },
      { x: -6.5, z: -1.6, r: 1.8, label: 'Сесть к Олегу — диалог (E)', dialog: true },
      { x: -6.5, z: -1.6, r: 2.2, label: 'Подать сигнал Ариане (E)', msg: 'Ты киваешь. Ариана заходит и заводит разговор с Олегом. Окно открыто.' },
      { x: this.olegTower ? this.olegTower.x : -7.1, z: -2.8, r: 1.6, label: 'Вставить USB в TOWER (E)', msg: 'Флешка в порту. Тихий бэкдор пошёл. 3... 2... 1... готово.', usb: true },
      { x: 10.5, z: 0, r: 3.0, label: 'Сигнал Питру у банкоматов (E)', msg: 'Питр снимает глушилку. Камеры снова живы — но запись уже не важна.' },
      { x: 0, z: 9.6, r: 2.0, label: 'Выйти спокойно (E)', msg: 'Ты выходишь ровным шагом. Никто не обернулся.', exit: true }
    ];
    const s = steps[F.step];
    if (!s) return;
    this.spot(s.x, s.z, s.r, s.label, () => {
      if (s.dialog) { this._flashDialog(); return; }
      if (s.usb) Engine.audio && Engine.audio.sfx('usb');
      this.toast(s.msg);
      F.step++;
      if (s.exit) { this.mode = 'play'; setTimeout(() => F.done && F.done(), 1400); return; }
      this._flashSpots();
    });
  },
  _flashDialog() {
    const lines = [
      'Олег: «Здравствуйте, по вкладу?» — Генри: «Да, присматриваюсь к условиям.»',
      'Олег: «Есть сезонный, под хороший процент.» — Генри: «А резервный счёт у вас бывает?» (Олег напрягся)',
      'Генри: «Шучу. Расскажите про сезонный.» — Олег расслабился. Пора звать Ариану.'
    ];
    const F = this.flash; F.d = F.d || 0;
    this.toast(lines[F.d]);
    F.d++;
    if (F.d >= lines.length) { F.step++; this._flashSpots(); }
  },

  // ---------- сесть за ПК ----------
  sitPC() {
    this.releasePointer();
    this.mode = 'idle';
    Engine.desktop.open();
  },

  // ---------- кинопролог ----------
  playPrologue(done) {
    this.clearLevel();
    this.mode = 'cine';
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.02);
    this.plane(40, 40, new THREE.MeshStandardMaterial({ color: 0x0c0d12, roughness: 1 }), 0, 0, 0);
    this.amb.intensity = 0.8; this.hemi.intensity = 0.5;
    // мини-декор для 4 шотов
    // шот1: мальчик у мониторов (2012)
    const s1 = new V(-10, 0, 0);
    this.box(2.4, 0.08, 0.8, MAT.wood, s1.x, 0.95, s1.z - 2.2, false);
    for (let i = -1; i <= 1; i++) this.box(0.8, 0.5, 0.05, MAT.screen, s1.x + i * 0.85, 1.4, s1.z - 2.3, false);
    this.figure(s1.x, s1.z - 1.3, Math.PI, true, new THREE.MeshStandardMaterial({ color: 0x335577 })); // мальчик лицом к мониторам (−z)
    this.pointLight(s1.x, 2, s1.z - 1.8, 0x39ff14, 1, 7);
    // шот2: отец за стойкой банка
    const s2 = new V(0, 0, -12);
    this.box(4, 1.1, 1.2, MAT.wood, s2.x, 0.55, s2.z - 1, false);
    this.box(5, 0.8, 0.15, new THREE.MeshBasicMaterial({ color: 0x39ff14 }), s2.x, 2.6, s2.z - 1.6, false);
    this.figure(s2.x, s2.z, 0, true, MAT.cloth); // отец сидит лицом в зал (+z, к камере)
    this.pointLight(s2.x, 2.4, s2.z, 0xfff0d0, 0.9, 10);
    // шот3: кухня, письмо + бутылка
    const s3 = new V(10, 0, 0);
    this.box(1.4, 0.08, 0.9, MAT.wood, s3.x, 0.9, s3.z, false);
    this.box(0.14, 0.5, 0.14, MAT.glass, s3.x - 0.3, 1.2, s3.z, false);
    this.box(0.3, 0.02, 0.42, new THREE.MeshStandardMaterial({ color: 0xf2efe6 }), s3.x + 0.3, 0.95, s3.z, false);
    this.pointLight(s3.x, 2.2, s3.z, 0xffcc88, 0.8, 8);
    // шот4: Генри ночью у терминала
    const s4 = new V(0, 0, 12);
    this.box(2, 0.08, 0.8, MAT.wood, s4.x, 0.95, s4.z + 2, false);
    this.box(1.2, 0.6, 0.05, MAT.screen, s4.x, 1.4, s4.z + 2.1, false);
    this.figure(s4.x, s4.z + 1.1, 0, true, new THREE.MeshStandardMaterial({ color: 0x222228 })); // Генри лицом к монитору(+z)
    this.pointLight(s4.x, 2, s4.z + 1.6, 0xff2a6d, 1, 7);

    const shots = [
      { cam: new V(-10, 1.3, 3.2), look: s1.clone().add(new V(0, 1.2, -1)), spk: '2012', t: 'Мальчик Генри впервые садится к мониторам.' },
      { cam: new V(0, 1.4, -7.5), look: s2.clone().add(new V(0, 1.2, 0)), spk: 'ORLOV BANK', t: 'Отец — 19 лет за стойкой. Улыбается уставшим клиентам.' },
      { cam: new V(10, 1.3, 3), look: s3.clone().add(new V(0, 1, 0)), spk: 'Письмо', t: '«...в связи с сокращением штата». Пустая бутылка рядом.' },
      { cam: new V(0, 1.3, 16), look: s4.clone().add(new V(0, 1.2, 2)), spk: 'Клятва', t: '«Я узнаю, что вы прячете.» Рождается Mrak.' }
    ];
    let i = 0;
    this._cineGen = { active: true };
    const fade = document.getElementById('cineFade');
    const cap = document.getElementById('cineCap');
    const titleEl = document.getElementById('cineTitle'), subEl = document.getElementById('cineSub');
    cap.classList.remove('hidden'); document.getElementById('cineHint').style.display = '';
    fade.style.opacity = '1';
    const applyShot = () => {
      const s = shots[i];
      this.cam.position.copy(s.cam);
      this._cineLook = s.look; this._cineTo = s.cam.clone();
      titleEl.textContent = s.spk; subEl.textContent = s.t;
      Engine.audio && Engine.audio.speak(s.spk + '. ' + s.t);
      // лёгкий наезд
      this._cineFrom = s.cam.clone().add(new V(rand(-1, 1), 0.3, rand(1, 2)));
      this.cam.position.copy(this._cineFrom);
      this._cineP = 0;
      fade.style.opacity = '0';
    };
    const next = () => {
      if (!this._cineGen || !this._cineGen.active) return;
      i++;
      if (i >= shots.length) { this._endPrologue(done); return; }
      fade.style.opacity = '1';
      setTimeout(applyShot, 350);
    };
    this._cineAdvance = next;
    const onKey = (e) => {
      if (this.mode !== 'cine') return;
      if (e.code === 'Enter') next();
      else if (e.code === 'Escape') { i = shots.length - 1; this._endPrologue(done); }
    };
    this._cineKey = onKey; addEventListener('keydown', onKey);
    applyShot();
  },
  _endPrologue(done) {
    this._cineGen = { active: false };
    removeEventListener('keydown', this._cineKey);
    const fade = document.getElementById('cineFade');
    fade.style.opacity = '1';
    setTimeout(() => {
      // ОБЯЗАТЕЛЬНО снять оверлей и загрузить квартиру
      Engine.state.seenPrologue = true; Engine.save();
      this.loadScene('apartment');
      this.mode = 'play';
      document.getElementById('cineCap').classList.add('hidden');
      document.getElementById('cineTitle').textContent = '';
      document.getElementById('cineSub').textContent = '';
      fade.style.opacity = '0';
      done && done();
    }, 450);
  },

  // катсцена поверх 3D (для узлов 2,4,6,11)
  cineText(data, onDone) {
    this.mode = 'cine2';
    const fade = document.getElementById('cineFade');
    const cap = document.getElementById('cineCap');
    const titleEl = document.getElementById('cineTitle'), subEl = document.getElementById('cineSub');
    cap.classList.remove('hidden'); document.getElementById('cineHint').style.display = '';
    fade.style.opacity = '0.92';
    let i = 0;
    const show = () => {
      if (i >= data.length) { finish(); return; }
      const s = data[i++];
      titleEl.textContent = s.spk || '';
      subEl.textContent = s.t || s.text || '';
      Engine.audio && Engine.audio.speak(((s.spk ? s.spk + '. ' : '') + (s.t || s.text || '')));
    };
    const finish = () => {
      removeEventListener('keydown', onKey);
      cap.classList.add('hidden'); fade.style.opacity = '0';
      titleEl.textContent = ''; subEl.textContent = '';
      this.mode = 'play';
      onDone && onDone();
    };
    const onKey = (e) => { if (e.code === 'Enter') show(); else if (e.code === 'Escape') { i = data.length; show(); } };
    addEventListener('keydown', onKey); show();
  },
  _fadeOut() { const f = document.getElementById('cineFade'); if (f && this.mode !== 'cine' && this.mode !== 'cine2') { f.classList.remove('show'); f.style.opacity = '0'; } },

  // ---------- игровой цикл ----------
  spawn(x, z) { this.pos.set(x, 1.6, z); this.vel.set(0, 0, 0); }
  ,
  blocked(x, z) {
    const r = 0.35;
    for (const c of this.colliders) if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
    return false;
  },
  _interact() {
    if (this.mode === 'idle' || this.mode === 'cine' || this.mode === 'cine2') return;
    if (Engine.desktop && Engine.desktop.visible) return;
    if (this.nearSpot) { Engine.audio && Engine.audio.sfx('click'); this.nearSpot.fn(); }
  },
  update(dt) {
    if (this.mode === 'cine') {
      // наезд камеры
      if (this._cineP < 1) { this._cineP = Math.min(1, this._cineP + dt * 0.25); this.cam.position.lerpVectors(this._cineFrom, this._cineTo, this._cineP); }
      if (this._cineLook) this.cam.lookAt(this._cineLook);
      return;
    }
    if (this.mode === 'play' || this.mode === 'flash') {
      const run = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
      if (run && this.mode === 'flash') { if (!this._sprWarn || performance.now() - this._sprWarn > 2500) { this.toast('НЕ беги! Бегут только виноватые.'); this._sprWarn = performance.now(); } }
      const speed = (run && this.mode === 'play' ? 6 : 3) * dt;
      let fx = 0, fz = 0;
      if (this.keys['KeyW']) fz -= 1; if (this.keys['KeyS']) fz += 1;
      if (this.keys['KeyA']) fx -= 1; if (this.keys['KeyD']) fx += 1;
      const len = Math.hypot(fx, fz);
      if (len) {
        fx /= len; fz /= len;
        const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        const dx = (fx * cos - fz * sin) * speed, dz = (fx * sin + fz * cos) * speed;
        if (!this.blocked(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
        if (!this.blocked(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
        if (!this._stepT || performance.now() - this._stepT > (run ? 280 : 400)) { Engine.audio && Engine.audio.sfx('step'); this._stepT = performance.now(); }
      }
      // ближайшая интеракция
      this.nearSpot = null; let best = 1e9;
      for (const s of this.spots) { const d = Math.hypot(this.pos.x - s.x, this.pos.z - s.z); if (d < s.r && d < best) { best = d; this.nearSpot = s; } }
      const pr = document.getElementById('prompt');
      if (pr) { if (this.nearSpot) { pr.textContent = this.nearSpot.label; pr.classList.add('show'); } else pr.classList.remove('show'); }
    }
    // камера от первого лица
    this.cam.position.copy(this.pos);
    const dir = new V(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.cam.lookAt(this.pos.clone().add(dir));
    // цикл день/ночь (~90с), но читаемо
    this.dayT = (this.dayT + dt * (24 / 90)) % 24;
    const day = Math.max(0, Math.sin((this.dayT / 24) * Math.PI * 2 - Math.PI / 2));
    if (this.sceneName === 'apartment' || this.sceneName === 'street') {
      this.sun.intensity = 0.15 + day * 0.7;
      this.hemi.intensity = 0.35 + day * 0.4;      // ночью не чёрный экран
      this.amb.intensity = 0.4 + day * 0.3;
      const sky = new THREE.Color().setHSL(0.6, 0.5, 0.04 + day * 0.14);
      this.scene.fog.color = sky; this.renderer.setClearColor(sky);
    }
  },
  toast(msg) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(this._toastT); this._toastT = setTimeout(() => t.classList.remove('show'), 4200);
  },
  _hud() {
    const h = document.getElementById('hud'); if (h) h.textContent = (this.sceneName || '').toUpperCase();
    const cr = document.getElementById('crosshair'); if (cr) cr.style.display = (this.mode === 'play' || this.mode === 'flash') ? 'block' : 'none';
  },
  _loop() {
    const frame = () => {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, this.clock.getDelta());
      try { this.update(dt); } catch (e) { console.error(e); }
      this.renderer.render(this.scene, this.cam);
    };
    frame();
  }
};
window.MrakWorld = World3D;
