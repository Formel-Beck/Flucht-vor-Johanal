// =====================================================
//  FLUCHT VOR JOHANAL – Jump-and-Run im Raumschiff Marienfeld
//
//  Aufbau dieser Datei:
//    1. Grundlagen (Bildschirm, Speichern, Eingabe)
//    2. Level laden
//    3. Physik (Spieler, Gegner, Fallen)
//    4. Bosskampf gegen Johanal
//    5. Zeichnen (Welt, Dunkelheit, Figuren)
//    6. Menü und Ablauf
//  Die Levels stehen in levels.js, die Figuren in chars.js, der Ton in audio.js.
// =====================================================
(() => {
  // ---------- 1. Grundlagen ----------
  const T = 32, ROWS = 12, VH = ROWS * T;            // Feldgrösse, Zeilen, sichtbare Höhe
  const GRAV = 1900, STEP = 1 / 120;                 // Schwerkraft, Rechenschritt
  const $ = id => document.getElementById(id);
  const fl = Math.floor, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7 + a * b * 0.37) * 43758.5453; return s - fl(s); };
  const cv = $('cv'), ctx = cv.getContext('2d');
  const lc = document.createElement('canvas'), lctx = lc.getContext('2d');   // Dunkelheits-Ebene
  let VW = 800, SC = 1;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    SC = cv.height / VH; VW = cv.width / SC;
    lc.width = Math.ceil(VW / 2); lc.height = VH / 2;
    $('rotate').style.display = innerHeight > innerWidth ? 'flex' : 'none';
  }
  addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200)); resize();

  // Blutschrift an den Wänden (zufällig gewählt, pro Stelle immer gleich)
  const WRITING = ['ER SIEHT DICH', 'LAUF', 'NICHT UMDREHEN', 'WIR HABEN ES GEWECKT', 'BECK GROUP LÜGT', 'ES IST IN DEN WÄNDEN',
    'ZÄHL DIE LICHTER', 'ER WAR EINER VON UNS', 'HILFE', 'NICHT INS DUNKLE', 'ER HÖRT DICH', 'KEINER KOMMT RAUS'];
  // Todes-Sprüche: nach jedem Tod wird zufällig einer gewählt (nie zweimal derselbe hintereinander)
  const DEATH_TEXTS = [
    'Du wurdest von Johanal aufgegessen',
    'Johanals Gase haben dich verätzt',
    'Die Tentakel ist da rein, wo du sie nicht haben wolltest',
    'Du bist in Johanals Schiss stecken geblieben',
    'Johanal hat dich mit dem Rüssel zum Frühstück geschlürft',
    'Du wurdest Teil der Wucherung',
    'Die Beck Group bedankt sich für deine Dienste',
    'Johanal hat dich zwischen seinen Kiefer-Zähnen vergessen',
    'Der Schatten hat dich umarmt. Für immer.',
    'Du riechst jetzt genauso wie Johanal',
    'Die Krabbler haben ein Festmahl',
    'Johanal hat sich auf dich gesetzt',
    'Deine Leiche dekoriert jetzt Deck 3',
    'Johanal hat dich in seinen Haarknoten geflochten',
    'Ein Zweig aus Johanals Rücken wächst jetzt aus dir',
    'Du bist im Dunkeln falsch abgebogen',
    'Die Säure hat dich zu Suppe gemacht',
    'Johanal hat einen Furz in deine Richtung gelassen. Das war genug.',
    'Der Lauerer hat lange auf diesen Moment gewartet',
    'Du hättest nicht umdrehen sollen',
    'Johanal sammelt jetzt deine Zähne',
    'Die Marienfeld hat eine neue Passagierin – dich, als Fleck an der Wand',
    'Du wurdest offiziell aus der Crew-Liste gestrichen',
    'Johanal hat dich als Zahnstocher benutzt',
    'Die Wände haben dich eingeatmet'
  ];
  let lastDeathText = -1;
  function pickDeathText() {
    let i; do { i = fl(Math.random() * DEATH_TEXTS.length); } while (i === lastDeathText);
    lastDeathText = i; return DEATH_TEXTS[i];
  }
  let deathText = '';
  // Farben pro Deck
  const THEMES = {
    cargo:   { bg: ['#0b1016', '#141c22'], wall: '#27313a', edge: '#5d6f78', rib: '#0f161c', glow: '#ffcf8a', acid: '#7dff5a' },
    maint:   { bg: ['#0a100d', '#121c17'], wall: '#243028', edge: '#5a7564', rib: '#0d1511', glow: '#c8ffd9', acid: '#7dff5a' },
    reactor: { bg: ['#140a0a', '#22100e'], wall: '#33211f', edge: '#8a4a3a', rib: '#190d0c', glow: '#ff8a5a', acid: '#ffb02e' },
    growth:  { bg: ['#100a12', '#1b1020'], wall: '#2c2230', edge: '#6e4a6e', rib: '#150d18', glow: '#e7a6ff', acid: '#b6ff5a', grow: true },
    bridge:  { bg: ['#080c14', '#101826'], wall: '#222c3c', edge: '#5a6f96', rib: '#0c121d', glow: '#a8c8ff', acid: '#7dff5a', grow: true }
  };

  // Spielstand (bleibt auf dem Gerät gespeichert)
  let save = { unlocked: 1, best: {}, char: 'orla', mute: false, chips: 0 };
  try { Object.assign(save, JSON.parse(localStorage.getItem('flucht-save') || '{}')); } catch (e) {}
  const store = () => { try { localStorage.setItem('flucht-save', JSON.stringify(save)); } catch (e) {} };
  Sfx.setMuted(save.mute);

  // Eingabe: Tastatur und Touch-Knöpfe
  const keys = { l: false, r: false, j: false }; let jPressed = false;
  const KEYMAP = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'j', w: 'j', W: 'j', ' ': 'j' };
  addEventListener('keydown', e => { const k = KEYMAP[e.key]; if (k) { if (k === 'j' && !keys.j) jPressed = true; keys[k] = true; e.preventDefault(); }
    if (e.key === 'Escape' || e.key === 'p') togglePause(); });
  addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) keys[k] = false; });
  // Steuerkreuz: linke Hälfte = links, rechte Hälfte = rechts (Daumen kann rutschen)
  const pad = $('pad');
  const padMove = e => { const r = pad.getBoundingClientRect(), left = e.clientX < r.left + r.width / 2; keys.l = left; keys.r = !left; pad.dataset.d = left ? 'l' : 'r'; e.preventDefault(); };
  const padEnd = e => { keys.l = keys.r = false; pad.dataset.d = ''; e.preventDefault(); };
  pad.addEventListener('pointerdown', e => { pad.setPointerCapture(e.pointerId); padMove(e); });
  pad.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') padMove(e); });
  pad.addEventListener('pointerup', padEnd); pad.addEventListener('pointercancel', padEnd);
  const jb = $('jumpBtn');
  jb.addEventListener('pointerdown', e => { if (!keys.j) jPressed = true; keys.j = true; jb.classList.add('on'); e.preventDefault(); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) jb.addEventListener(ev, e => { keys.j = false; jb.classList.remove('on'); });
  document.addEventListener('contextmenu', e => e.preventDefault());

  // ---------- 2. Level laden ----------
  let L = null, levelIdx = 0, theme = THEMES.cargo, grid = [], W = 0;
  let decor = [], checks = [], checkAt = null, scareNext = 0, stalker = null, stalkT = 0, hbT = 0, blackT = 0, blackout = 0, scareT = 0, glitch = 0;
  let p = null, ch = CHARS[0], items = [], lamps = [], enemies = [], plats = [], vents = [], lasers = [], tents = [], crumble = {}, parts = [];
  let boss = null, spawn = { x: 0, y: 0 }, lastSafe = { x: 0, y: 0 }, camX = 0, time = 0, deaths = 0, chips = 0, chipsTotal = 0;
  let phase = 'menu', phaseT = 0, shake = 0, hurtFlash = 0, introT = 0, god = false;

  const tile = (c, r) => (c < 0 || c >= W || r < 0) ? '#' : r >= ROWS ? ' ' : grid[r][c];
  const solid = (c, r) => { const t = tile(c, r); return t === '#' || t === 'S' || t === 't' || t === 'Z' || (t === 'x' && !(crumble[c + ',' + r] && crumble[c + ',' + r].gone)); };

  function loadLevel(i) {
    levelIdx = i; L = LEVELS[i]; theme = THEMES[L.theme];
    const rows = Array.from({ length: ROWS }, () => '');
    for (const name of L.chunks) { const c = CHUNKS[name]; if (!c) throw new Error('Level-Stück fehlt: ' + name); for (let r = 0; r < ROWS; r++) rows[r] += c[r]; }
    W = rows[0].length; grid = rows.map(r => r.split(''));
    for (let r = 0; r < ROWS; r++) { grid[r][0] = '#'; grid[r][W - 1] = '#'; }      // Wände an beiden Enden
    items = []; lamps = []; enemies = []; plats = []; vents = []; lasers = []; tents = []; crumble = {}; parts = []; boss = null;
    decor = []; checks = []; checkAt = null; scareNext = 30 + Math.random() * 35; stalker = null; stalkT = 14 + Math.random() * 8; blackT = 10 + Math.random() * 10; blackout = 0; scareT = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < W; c++) {
      const t = grid[r][c], x = c * T, y = r * T;
      if ('PohKElcdMBjubwJC'.includes(t)) grid[r][c] = ' ';
      if (t === 'P') spawn = { x: x + 6, y: y };
      else if (t === 'o' || t === 'h' || t === 'K' || t === 'E') items.push({ type: t, x: x + T / 2, y: y + T / 2, on: false });
      else if (t === 'l') lamps.push({ x: x + T / 2, y: T + 6, broken: hash(c, i) < 0.3 });
      else if (t === 'c') enemies.push({ type: 'c', x: x + 3, y: y + T - 18, w: 26, h: 18, vy: 0, dir: -1, home: x, alive: true });
      else if (t === 'j') enemies.push({ type: 'j', x: x + 4, y: y + T - 20, w: 24, h: 20, vx: 0, vy: 0, cd: 0.5, dir: -1, alive: true });
      else if (t === 'u') enemies.push({ type: 'u', x: x + 4, y: T, hy: T, w: 24, h: 20, vy: 0, dir: -1, st: 'hang', alive: true });
      else if (t === 'b') decor.push({ type: 'b', x: x + T / 2, y: y + T, col: ['#e86a2a', '#556b2f', '#8a96a4', '#6b4a8a'][fl(hash(c, i) * 4)] });
      else if (t === 'w') decor.push({ type: 'w', x: x + T / 2, y: y + T / 2, txt: WRITING[fl(hash(c, i + 3) * WRITING.length)] });
      else if (t === 'C') checks.push({ x: x + T / 2, y: y + T, on: false });
      else if (t === 'd') enemies.push({ type: 'd', x: x, y: y + 6, w: 26, h: 18, hx: x, hy: y + 6, ph: c, alive: true });
      else if (t === 'M') plats.push({ x: x, y: y, w: 64, h: 12, hx: x, range: 96, ph: c * 0.7, dx: 0 });
      else if (t === 'S') vents.push({ c, r });
      else if (t === 't') tents.push({ c, r });
      else if (t === 'Z') { let rr2 = r + 1; while (rr2 < ROWS && !solid(c, rr2)) rr2++; lasers.push({ c, r, len: (rr2 - r - 1) * T }); }
      else if (t === 'B') boss = makeBoss(x, y);
    }
    chipsTotal = items.filter(it => it.type === 'o').length; chips = 0; deaths = 0; time = 0;
    resetPlayer(spawn); camX = 0; introT = 3.2;
    $('lvlName').textContent = (i + 1) + ' · ' + L.name; $('bossBar').style.display = L.boss ? 'block' : 'none';
  }
  function resetPlayer(at) {
    ch = CHARS.find(c => c.id === save.char) || CHARS[0];
    const h = ch.h || 28;
    p = { x: at.x, y: at.y + T - h - 0.01, w: 18, h, vx: 0, vy: 0, ground: false, dir: 1, coy: 0, buf: 0, jumps: 0, hp: ch.hp || 5, inv: 1, ride: null, runT: 0, safeT: 0 };
    lastSafe = { x: p.x, y: p.y };
  }

  // ---------- 3. Physik ----------
  // Kasten bewegen und an Wänden/Böden stoppen. Gitter (=) halten nur von oben.
  function moveBox(e, dx, dy) {
    let hitX = false, land = false, bonk = false;
    if (dx) {
      e.x += dx; const r0 = fl(e.y / T), r1 = fl((e.y + e.h - 0.02) / T);
      const c = dx > 0 ? fl((e.x + e.w) / T) : fl(e.x / T);
      for (let r = r0; r <= r1; r++) if (solid(c, r)) { e.x = dx > 0 ? c * T - e.w - 0.01 : (c + 1) * T + 0.01; hitX = true; break; }
    }
    if (dy) {
      const prevB = e.y + e.h; e.y += dy; const c0 = fl(e.x / T), c1 = fl((e.x + e.w - 0.02) / T);
      if (dy > 0) { const r = fl((e.y + e.h) / T);
        for (let c = c0; c <= c1; c++) if (solid(c, r) || (tile(c, r) === '=' && prevB <= r * T + 0.5)) { e.y = r * T - e.h - 0.01; land = true; e.landC = c; e.landR = r; break; }
      } else { const r = fl(e.y / T); for (let c = c0; c <= c1; c++) if (solid(c, r)) { e.y = (r + 1) * T + 0.01; bonk = true; break; } }
    }
    return { hitX, land, bonk };
  }
  const overlap = (a, x, y, w, h) => a.x < x + w && a.x + a.w > x && a.y < y + h && a.y + a.h > y;
  function burst(x, y, n, color, sp, g) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = (sp || 120) * (0.3 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.4 + Math.random() * 0.5, color, size: 2 + Math.random() * 2, g: g == null ? 500 : g }); } }

  function hurt(fromX, back) {
    if (p.inv > 0 || god || phase !== 'play') return false;
    p.hp--; p.inv = 1.3; shake = 0.25; hurtFlash = 0.35; updateHud();
    burst(p.x + p.w / 2, p.y + p.h / 2, 10, '#c0392b', 140);
    if (p.hp <= 0) { die(); return true; }
    Sfx.play('hurt');
    if (back) { p.x = lastSafe.x; p.y = lastSafe.y; p.vx = p.vy = 0; }
    else { p.vy = -330; p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 200; }
    return true;
  }
  function die() { Sfx.play('die'); deaths++; deathText = pickDeathText(); phase = 'dead'; phaseT = 2.0; stalker = null; }
  // Alle Leben verloren: Auswahl – am Checkpoint weiter, Level neu oder Hauptmenü
  function showDeathMenu() {
    phase = 'gameover';
    $('overTitle').textContent = deathText; $('overTitle').classList.add('deathT');
    $('overText').textContent = checkAt ? 'Du kannst am letzten Checkpoint weitermachen.' : (L.boss ? 'Johanal wartet.' : 'Noch kein Checkpoint erreicht.');
    $('overNext').style.display = 'none'; $('overResume').style.display = 'none';
    $('overCheck').style.display = checkAt ? '' : 'none'; $('overRetry').style.display = ''; $('overRetry').textContent = L.boss ? 'Bosskampf neu' : 'Level neu starten';
    $('over').style.display = 'flex'; $('touch').style.display = 'none';
  }
  // Am Checkpoint weiter: Spieler mit vollen Leben dorthin, der Rest des Levels bleibt wie er war
  function respawnAtCheck() {
    resetPlayer(checkAt); stalker = null; stalkT = 12 + Math.random() * 8; blackout = 0; scareT = 0;
    camX = clamp(p.x - VW * 0.42, 0, Math.max(0, W * T - VW));
    phase = 'play'; $('over').style.display = 'none'; $('touch').style.display = 'block'; updateHud();
  }


  function stepPlayer(dt) {
    if (p.ride) { p.x += p.ride.dx; }
    // Laufen
    const want = ((keys.r ? 1 : 0) - (keys.l ? 1 : 0)) * (ch.speed || 200), acc = (p.ground ? 2400 : 1500) * dt;
    p.vx += clamp(want - p.vx, -acc, acc); if (want) p.dir = Math.sign(want);
    // Springen (mit etwas Toleranz: kurz nach der Kante und kurz vor dem Landen zählt auch)
    if (jPressed) p.buf = 0.12; jPressed = false; p.buf -= dt; p.coy = p.ground ? 0.1 : p.coy - dt;
    if (p.buf > 0) {
      if (p.coy > 0) { p.vy = -(ch.jump || 660); p.buf = 0; p.coy = 0; p.jumps = 1; Sfx.play('jump'); burst(p.x + p.w / 2, p.y + p.h, 4, '#667', 60); }
      else if (ch.dbl && p.jumps < 2) { p.vy = -(ch.jump || 660) * 0.88; p.buf = 0; p.jumps = 2; Sfx.play('jump2'); burst(p.x + p.w / 2, p.y + p.h, 6, '#9f9', 80); }
    }
    if (!keys.j && p.vy < -260) p.vy = -260;                       // Sprung loslassen = kürzerer Sprung
    p.vy = Math.min(900, p.vy + GRAV * dt);
    if (ch.glide && keys.j && p.vy > 70) p.vy = 70;                 // Geist: schweben
    const prevB = p.y + p.h, wasGround = p.ground;
    const mx = moveBox(p, p.vx * dt, 0); if (mx.hitX) p.vx = 0;
    const my = moveBox(p, 0, p.vy * dt);
    p.ground = my.land; p.ride = null;
    if (my.bonk) p.vy = 0;
    // schwebende Plattformen
    if (p.vy >= 0) for (const pl of plats) if (prevB <= pl.y + 1.5 && p.y + p.h >= pl.y && p.x + p.w > pl.x && p.x < pl.x + pl.w) { p.y = pl.y - p.h - 0.01; p.ground = true; p.ride = pl; }
    if (p.ground) {
      if (!wasGround && p.vy > 250) { Sfx.play('land'); burst(p.x + p.w / 2, p.y + p.h, 4, '#667', 50); }
      p.vy = 0; p.jumps = 0;
      // bröckelnde Platten auslösen, sicheren Stand merken
      const r = fl((p.y + p.h + 2) / T), c0 = fl((p.x + 1) / T), c1 = fl((p.x + p.w - 1) / T); let safe = !p.ride;
      for (let c = c0; c <= c1; c++) { const t = tile(c, r);
        if (t === 'x') { const k = c + ',' + r; if (!crumble[k]) { crumble[k] = { t: 0, gone: false }; Sfx.play('crumble'); } safe = false; }
        if (t !== '#') safe = false; }
      p.safeT -= dt; if (safe && p.inv <= 0 && p.safeT <= 0) { lastSafe = { x: p.x, y: p.y }; p.safeT = 0.15; }
    }
    if (Math.abs(p.vx) > 20 && p.ground) p.runT += dt;
    p.inv -= dt;
    if (p.y > VH + 60) { if (god) { p.x = lastSafe.x; p.y = lastSafe.y; p.vy = 0; } else if (!hurt(0, true)) { p.x = lastSafe.x; p.y = lastSafe.y; p.vy = 0; } }   // in die Tiefe gefallen
  }

  // Fallen: an (true) / Warnung / aus – abhängig von der Zeit, jede Spalte leicht versetzt
  const cyc = (c, len) => (time + c * 0.45) % len;
  const ventOn = v => { const t = cyc(v.c, 2.8); return t < 0.5 ? 'warn' : t < 1.5 ? 'on' : 'off'; };
  const laserOn = l => { const t = cyc(l.c, 2.6); return t < 0.4 ? 'warn' : t < 1.6 ? 'on' : 'off'; };
  const tentH = t => { const s = cyc(t.c, 3.0); return s < 0.6 ? 6 + Math.sin(time * 30) * 2 : s < 1.6 ? 74 * Math.min(1, (s - 0.6) / 0.15, (1.6 - s) / 0.15) : 0; };

  function stepWorld(dt) {
    for (const pl of plats) { const nx = pl.hx + Math.sin(time * 1.1 + pl.ph) * pl.range; pl.dx = nx - pl.x; pl.x = nx; }
    for (const k in crumble) { const s = crumble[k]; s.t += dt; if (!s.gone && s.t > 0.45) { s.gone = true; const [c, r] = k.split(',').map(Number); burst(c * T + 16, r * T + 8, 6, '#555', 80); } if (s.t > 3.6) delete crumble[k]; }
    // Gegner
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.type === 'c') {
        e.vy = Math.min(900, e.vy + GRAV * dt);
        const m = moveBox(e, e.dir * 46 * dt, 0), my = moveBox(e, 0, e.vy * dt); if (my.land) e.vy = 0;
        const fc = fl((e.x + (e.dir > 0 ? e.w + 2 : -2)) / T), fr = fl((e.y + e.h + 4) / T);
        if (m.hitX || (my.land && !solid(fc, fr)) || Math.abs(e.x - e.home) > 4.5 * T && Math.sign(e.x - e.home) === e.dir) e.dir = -e.dir;
        if (e.y > VH + 40) e.alive = false;
      } else if (e.type === 'j') {                      // Springer: lauert und springt dich an
        e.vy = Math.min(900, e.vy + GRAV * dt); e.cd -= dt;
        if (moveBox(e, e.vx * dt, 0).hitX) e.vx = 0;
        const my = moveBox(e, 0, e.vy * dt); e.ground = my.land; if (my.land) { e.vy = 0; e.vx = 0; }
        const dxp = (p.x + p.w / 2) - (e.x + e.w / 2); e.dir = Math.sign(dxp) || 1;
        if (e.ground && e.cd <= 0 && Math.abs(dxp) < 180 && Math.abs(p.y - e.y) < 130 && phase === 'play') { e.vy = -560; e.vx = e.dir * 200; e.cd = 1.5; Sfx.play('hiss'); }
        if (e.y > VH + 40) e.alive = false;
      } else if (e.type === 'u') {                      // Lauerer: hängt an der Decke und lässt sich fallen
        if (e.st === 'hang') { e.y = e.hy + Math.sin(time * 2 + e.x) * 3;
          if (Math.abs((p.x + p.w / 2) - (e.x + e.w / 2)) < 46 && p.y > e.y && phase === 'play') { e.st = 'fall'; Sfx.play('hiss'); } }
        else { e.vy = Math.min(900, e.vy + GRAV * dt); const my = moveBox(e, 0, e.vy * dt);
          if (my.land) { e.vy = 0; if (e.st === 'fall') { e.st = 'crawl'; e.dir = p.x < e.x ? -1 : 1; Sfx.play('land'); } }
          if (e.st === 'crawl') { const m = moveBox(e, e.dir * 75 * dt, 0), fc = fl((e.x + (e.dir > 0 ? e.w + 2 : -2)) / T), fr = fl((e.y + e.h + 4) / T);
            if (m.hitX || (my.land && !solid(fc, fr))) e.dir = -e.dir; }
          if (e.y > VH + 40) e.alive = false; }
      } else { e.x = e.hx + Math.sin(time * 1.2 + e.ph) * 90; e.y = e.hy + Math.sin(time * 2.6 + e.ph) * 10; }
      if (phase === 'play' && overlap(p, e.x, e.y, e.w, e.h)) {
        if (p.vy > 60 && p.y + p.h - p.vy * dt * 2 <= e.y + 10) {            // von oben = besiegt
          e.alive = false; p.vy = keys.j ? -560 : -400; p.jumps = 1; Sfx.play('stomp'); burst(e.x + e.w / 2, e.y + e.h / 2, 12, e.type === 'd' ? '#f5c542' : '#7a2a3a', 150);
        } else hurt(e.x + e.w / 2);
      }
    }
    if (phase !== 'play') return;
    // Stacheln und Säure (Felder, die der Spieler berührt)
    const c0 = fl(p.x / T), c1 = fl((p.x + p.w) / T), r0 = fl(p.y / T), r1 = fl((p.y + p.h) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const t = tile(c, r);
      if (t === '^' && overlap(p, c * T + 4, r * T + 14, T - 8, 18)) { if (hurt(c * T + 16)) p.vy = -420; }
      else if (t === '~' && overlap(p, c * T, r * T + 8, T, 24)) { burst(p.x + 9, p.y + p.h, 10, theme.acid, 120); if (!hurt(0, true)) { p.x = lastSafe.x; p.y = lastSafe.y; p.vx = p.vy = 0; } return; } }
    for (const v of vents) { const s = ventOn(v); if (s === 'on' && overlap(p, v.c * T + 6, (v.r - 3) * T, 20, 3 * T)) hurt(v.c * T + 16);
      if (s === 'on' && cyc(v.c, 2.8) < 0.5 + dt * 1.5 && Math.abs(v.c * T - p.x) < 420) Sfx.play('steam'); }
    for (const l of lasers) if (laserOn(l) === 'on' && overlap(p, l.c * T + 12, (l.r + 1) * T, 8, l.len)) hurt(l.c * T + 16);
    for (const t of tents) { const h = tentH(t); if (h > 20 && overlap(p, t.c * T + 9, t.r * T - h, 14, h)) hurt(t.c * T + 16); }
    // Checkpoints
    for (const c of checks) if (!c.on && overlap(p, c.x - 14, c.y - 60, 28, 60)) {
      for (const o of checks) o.on = false; c.on = true; checkAt = { x: c.x - 9, y: c.y - T };
      Sfx.play('check'); burst(c.x, c.y - 44, 16, '#8affc1', 130, 0); toast('Checkpoint');
    }
    // Dinge einsammeln
    for (const it of items) {
      if (it.on || !overlap(p, it.x - 10, it.y - 12, 20, 26)) continue;
      if (it.type === 'o') { it.on = true; chips++; Sfx.play('chip'); burst(it.x, it.y, 6, '#6fe3ff', 90, 0); updateHud(); }
      else if (it.type === 'h') { if (p.hp < (ch.hp || 5)) { it.on = true; p.hp++; Sfx.play('heart'); burst(it.x, it.y, 8, '#ff5a6e', 90, 0); updateHud(); } }
      else if (it.type === 'K') { it.on = true; p.hp = ch.hp || 5; Sfx.play('check'); burst(it.x, it.y, 14, '#ff5a6e', 120, 0); toast('Med-Station: Herzen aufgefüllt'); updateHud(); }
      else if (it.type === 'E') { levelDone(); return; }
    }
  }

  // ---------- Horror ----------
  // "Der Schatten": taucht hinter dir auf und verfolgt dich. Man kann ihn nicht besiegen –
  // nur weglaufen oder ihn ins Licht einer Lampe locken, dort löst er sich auf.
  function spawnStalker() {
    stalker = { x: camX - 50, y: p.y - 30, life: 11, fade: 0, dying: false };
    Sfx.play('whisper'); glitch = 0.4;
  }
  function stepHorror(dt) {
    // Schatten
    if (L.stalker && !boss && phase === 'play') {
      if (!stalker) { stalkT -= dt; if (stalkT <= 0 && introT <= 0) spawnStalker(); }
      else {
        const s = stalker, tx = p.x + p.w / 2 - 14, ty = p.y + p.h - 70;
        if (!s.dying) {
          const sp = 108 + levelIdx * 14, dx = tx - s.x;
          s.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt); s.y += (ty - s.y) * Math.min(1, dt * 2.5);
          s.life -= dt; if (s.life <= 0) s.dying = true;
          if (blackout <= 0) for (const l of lamps) if (!l.broken && Math.abs(l.x - (s.x + 14)) < 50) { s.dying = true; Sfx.play('hiss'); burst(s.x + 14, s.y + 35, 20, '#000', 120, -60); }
          if (overlap(p, s.x + 4, s.y + 6, 20, 64)) { hurt(s.x + 14); s.dying = true; Sfx.play('scream'); glitch = 0.5; }
          if (Math.abs(dx) < 260) glitch = Math.max(glitch, 0.08);
        } else { s.fade += dt * 1.6; if (s.fade >= 1) { stalker = null; stalkT = 15 + Math.random() * 12; } }
      }
    }
    // Herzklopfen: wenn der Schatten nah ist oder nur noch 1 Herz
    hbT -= dt;
    const near = stalker && !stalker.dying ? Math.abs(stalker.x - p.x) : 1e9;
    if (hbT <= 0 && (near < 600 || (p.hp === 1 && phase === 'play'))) { Sfx.play('heartbeat'); hbT = clamp(near / 450, 0.38, 0.95); }
    // Stromausfall: alle Lampen gehen kurz aus
    if (introT <= 0 && phase === 'play' && (!boss || bossPhase(boss) >= 2)) {
      blackT -= dt;
      if (blackT <= 0) { blackout = boss ? 1.0 : 1.4 + Math.random() * 0.8; blackT = boss ? 7 + Math.random() * 5 : 15 + Math.random() * 15; Sfx.play('powerdown'); }
    }
    if (blackout > 0) { blackout -= dt; if (blackout <= 0) Sfx.play('powerup'); }
    // Jumpscare-Stellen
    // Jumpscares kommen zufällig (nicht im ersten Abschnitt, nicht beim Boss): etwa alle 30–75 Sekunden
    if (!boss && phase === 'play' && introT <= 0 && p.x > 14 * T) {
      scareNext -= dt;
      if (scareNext <= 0 && Math.random() < dt * 3) { scareT = 0.5; shake = 0.7; blackout = 1.3; Sfx.play('scream'); scareNext = 30 + Math.random() * 45; }
    }
    scareT -= dt; glitch = Math.max(0, glitch - dt);
  }

  // ---------- 4. Bosskampf: Johanal ----------
  // Ablauf: Er greift an (Rüssel-Schlag, Schiss-Wurf, Stampfer, Ansturm). Nach den
  // meisten Angriffen ist er kurz erschöpft – dann auf den Kopf springen!
  // 6 Treffer, ab 4 und ab 2 Treffern Rest wird er schneller und bekommt neue Angriffe.
  function makeBoss(x, y) {
    return { sx: x, sy: y, x: x - 20, y: 10 * T - 92, w: 74, h: 92, dir: -1, hp: 6, st: 'intro', t: 0, vy: 0, vx: 0, inv: 0, last: '', sweep: 0,
      blobs: [], pools: [], waves: [], rocks: [], thrown: 0, dead: false };
  }
  const FLOOR = 10 * T;
  const bossPhase = b => b.hp > 4 ? 1 : b.hp > 2 ? 2 : 3;
  function bossSet(b, st) { b.st = st; b.t = 0; }
  function dropRocks(b, n) { for (let i = 0; i < n; i++) b.rocks.push({ x: T * 1.5 + Math.random() * (W - 3) * T, y: -30, t: -0.8 - i * 0.25 }); }
  function stepBoss(dt) {
    const b = boss; if (!b) return; b.t += dt; b.inv -= dt;
    const ph = bossPhase(b), px = p.x + p.w / 2, cx = b.x + b.w / 2;
    const H = b.st === 'tired' || b.st === 'hit' ? 70 : b.st === 'charge' ? 64 : 92;
    if (b.st !== 'jump') { b.h = H; b.y = FLOOR - H; }
    if (b.st === 'intro') { if (b.t > 0.3 && b.t - dt <= 0.3) { Sfx.play('roar'); shake = 0.6; } if (b.t > 1.8) bossSet(b, 'idle'); }
    else if (b.st === 'idle') {
      b.dir = px < cx ? -1 : 1;
      if (Math.abs(px - cx) > 170) b.x += b.dir * 34 * dt;
      if (b.t > [1.3, 1.0, 0.75][ph - 1]) {
        const opts = ['trunk', 'throw']; if (ph >= 2) opts.push('jump'); if (ph >= 3) opts.push('charge', 'charge');
        let a; do { a = opts[fl(Math.random() * opts.length)]; } while (a === b.last && opts.length > 1); b.last = a;
        bossSet(b, a === 'trunk' ? 'trunkWind' : a === 'throw' ? 'throw' : a === 'jump' ? 'jumpWind' : 'chargeWind'); b.thrown = 0;
        if (a === 'charge') Sfx.play('roar');
      }
    }
    else if (b.st === 'trunkWind') { if (b.t > (ph === 3 ? 0.5 : 0.7)) { bossSet(b, 'trunkSweep'); Sfx.play('whoosh'); } }
    else if (b.st === 'trunkSweep') {
      b.sweep = Math.min(1, b.t / 0.22) * 330;
      const x0 = b.dir > 0 ? b.x + b.w : b.x - b.sweep;
      if (overlap(p, x0, FLOOR - 20, b.sweep, 20)) hurt(cx);
      if (b.t > 0.6) { b.sweep = 0; bossSet(b, 'tired'); b.tired = ph === 3 ? 1.3 : 1.7; }
    }
    else if (b.st === 'throw') {
      const n = ph === 1 ? 3 : 4;
      if (b.thrown < n && b.t > 0.35 + b.thrown * 0.28) {
        const tx = px + (b.thrown - 1) * 70 + (Math.random() - 0.5) * 40, sx = cx + b.dir * 30, sy = b.y + 20;
        b.blobs.push({ x: sx, y: sy, vx: (tx - sx) / 0.95, vy: -520 }); b.thrown++; Sfx.play('fart');
      }
      if (b.t > 0.35 + n * 0.28 + 0.5) bossSet(b, 'idle');
    }
    else if (b.st === 'jumpWind') { if (b.t > 0.45) { bossSet(b, 'jump'); b.vy = -780; b.vx = clamp((px - cx) / 0.82, -300, 300); } }
    else if (b.st === 'jump') {
      b.vy += GRAV * dt; b.y += b.vy * dt; b.x += b.vx * dt;
      if (b.y + b.h >= FLOOR && b.vy > 0) {
        b.y = FLOOR - b.h; shake = 0.5; Sfx.play('quake');
        b.waves.push({ x: cx, dir: -1, life: 1.3 }, { x: cx, dir: 1, life: 1.3 }); dropRocks(b, ph === 3 ? 5 : 3);
        bossSet(b, 'tired'); b.tired = 1.5;
      }
    }
    else if (b.st === 'chargeWind') { b.dir = px < cx ? -1 : 1; if (b.t > 0.8) bossSet(b, 'charge'); }
    else if (b.st === 'charge') {
      b.x += b.dir * (ph === 3 ? 470 : 420) * dt;
      if (Math.random() < 0.5) parts.push({ x: cx - b.dir * 30, y: FLOOR - 4, vx: -b.dir * 60, vy: -40, life: 0.4, color: '#556', size: 3, g: 0 });
      if (b.x <= T || b.x + b.w >= (W - 1) * T) { shake = 0.6; Sfx.play('quake'); dropRocks(b, 2); bossSet(b, 'tired'); b.tired = 2.0; }
    }
    else if (b.st === 'tired') { if (b.t > b.tired) bossSet(b, 'idle'); }
    else if (b.st === 'hit') { if (b.t > 0.7) { bossSet(b, 'idle'); if (b.hp === 4 || b.hp === 2) { Sfx.play('roar'); shake = 0.5; toast(b.hp === 4 ? '«Jetzt reicht\'s!»' : '«ICH BIN DIE BECK GROUP!»'); } } }
    else if (b.st === 'dying') {
      if (Math.random() < 0.4) burst(b.x + Math.random() * b.w, b.y + Math.random() * b.h, 6, ['#c0392b', '#f5c542', '#7a2a3a'][fl(Math.random() * 3)], 160);
      shake = Math.max(shake, 0.15);
      if (b.t > 2.6) { b.dead = true; levelDone(); }
    }
    b.x = clamp(b.x, T, (W - 1) * T - b.w);
    // Wurfgeschosse → Pfützen
    for (const o of b.blobs) { o.vy += 1100 * dt; o.x += o.vx * dt; o.y += o.vy * dt;
      if (overlap(p, o.x - 8, o.y - 8, 16, 16)) { hurt(o.x); o.dead = true; }
      if (o.y >= FLOOR - 4 || o.x < T || o.x > (W - 1) * T) { o.dead = true; if (o.y >= FLOOR - 4) { b.pools.push({ x: clamp(o.x, T + 20, (W - 1) * T - 20), t: 3.2 }); Sfx.play('splat'); burst(o.x, FLOOR - 4, 6, '#6b4a1e', 90); } } }
    b.blobs = b.blobs.filter(o => !o.dead);
    for (const o of b.pools) { o.t -= dt; if (o.t > 0.3 && overlap(p, o.x - 18, FLOOR - 8, 36, 8)) hurt(o.x); }
    b.pools = b.pools.filter(o => o.t > 0);
    for (const o of b.waves) { o.x += o.dir * 340 * dt; o.life -= dt; if (overlap(p, o.x - 11, FLOOR - 26, 22, 26)) hurt(o.x - o.dir * 20); }
    b.waves = b.waves.filter(o => o.life > 0 && o.x > T && o.x < (W - 1) * T);
    for (const o of b.rocks) { o.t += dt; if (o.t > 0) { o.y += 520 * dt; if (overlap(p, o.x - 11, o.y - 11, 22, 22)) { hurt(o.x); o.dead = true; }
        if (o.y > FLOOR - 8) { o.dead = true; burst(o.x, FLOOR - 6, 8, '#778', 120); Sfx.play('land'); } } }
    b.rocks = b.rocks.filter(o => !o.dead);
    // Berührung mit Johanal
    if (phase === 'play' && b.st !== 'dying' && overlap(p, b.x + 6, b.y, b.w - 12, b.h)) {
      if (p.vy > 0 && p.y + p.h - p.vy * dt * 2 <= b.y + 20) {
        if (b.st === 'tired' && b.inv <= 0) {
          b.hp--; b.inv = 0.9; p.vy = -620; p.vx = (px < cx ? -1 : 1) * 260; p.jumps = 1; shake = 0.4; Sfx.play('bosshit');
          burst(px, b.y, 16, '#f5c542', 200); updateBossBar();
          if (b.hp <= 0) { bossSet(b, 'dying'); Sfx.play('roar'); b.blobs = []; b.waves = []; b.rocks = []; b.pools = []; } else bossSet(b, 'hit');
        } else { p.vy = -520; p.vx = (px < cx ? -1 : 1) * 240; p.jumps = 1; Sfx.play('bounce'); }
      } else hurt(cx);
    }
  }
  function updateBossBar() { if (boss) $('bossFill').style.width = (boss.hp / 6 * 100) + '%'; }

  // ---------- 5. Zeichnen ----------
  function drawTile(t, c, r) {
    const x = c * T, y = r * T, h = hash(c, r);
    if (t === '#' || t === 'S' || t === 't' || t === 'Z') {
      ctx.fillStyle = theme.wall; ctx.fillRect(x, y, T + 0.5, T + 0.5);
      ctx.fillStyle = 'rgba(0,0,0,' + (h * 0.2) + ')'; ctx.fillRect(x, y, T, T);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
      if (h > 0.6) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 4, y + 4, 2, 2); ctx.fillRect(x + T - 6, y + T - 6, 2, 2); }
      if (!solid(c, r - 1) && r > 0) { ctx.fillStyle = theme.edge; ctx.fillRect(x, y, T + 0.5, 3);
        if (h < 0.18) { ctx.fillStyle = '#c9a227'; for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 8, y, 4, 3); } }
      if (theme.grow && h < 0.16) {                                  // Wucherung mit Auge
        ctx.fillStyle = '#7a3350'; ctx.beginPath(); ctx.arc(x + 16, y + 16, 9 + Math.sin(time * 2 + c) * 1.2, 0, 7); ctx.fill();
        ctx.fillStyle = '#e9d8c8'; ctx.beginPath(); ctx.arc(x + 16, y + 16, 4, 0, 7); ctx.fill();
        const a = Math.atan2(p.y - y, p.x - x); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + 16 + Math.cos(a) * 1.6, y + 16 + Math.sin(a) * 1.6, 1.8, 0, 7); ctx.fill();
      }
      if (t === 'S') { ctx.fillStyle = '#0a0d10'; ctx.fillRect(x + 6, y, 20, 5); ctx.fillStyle = '#777'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 8 + i * 5, y + 1, 2, 3); }
      if (t === 't') { ctx.fillStyle = '#3a1226'; ctx.beginPath(); ctx.ellipse(x + 16, y + 2, 11, 4, 0, 0, 7); ctx.fill(); }
      if (t === 'Z') { ctx.fillStyle = '#111'; ctx.fillRect(x + 9, y + T - 6, 14, 6); ctx.fillStyle = '#ff3b3b'; ctx.fillRect(x + 13, y + T - 3, 6, 3); }
    } else if (t === '=') {
      ctx.fillStyle = '#4a5560'; ctx.fillRect(x, y, T + 0.5, 7); ctx.fillStyle = '#0b0e12'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * 8, y + 2, 4, 3);
      ctx.fillStyle = theme.edge; ctx.fillRect(x, y, T + 0.5, 1.5);
    } else if (t === '^') {
      for (let i = 0; i < 4; i++) { ctx.fillStyle = '#9aa3ab'; ctx.beginPath(); ctx.moveTo(x + i * 8, y + T); ctx.lineTo(x + i * 8 + 4, y + 12); ctx.lineTo(x + i * 8 + 8, y + T); ctx.fill();
        ctx.fillStyle = '#8a1c1c'; ctx.beginPath(); ctx.moveTo(x + i * 8 + 2.5, y + 18); ctx.lineTo(x + i * 8 + 4, y + 12); ctx.lineTo(x + i * 8 + 5.5, y + 18); ctx.fill(); }
    } else if (t === '~') {
      ctx.fillStyle = theme.acid; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(x, y + T);
      for (let i = 0; i <= 4; i++) ctx.lineTo(x + i * 8, y + 8 + Math.sin(time * 3 + (x + i * 8) * 0.2) * 2);
      ctx.lineTo(x + T, y + T); ctx.fill(); ctx.globalAlpha = 1;
      const bt = (time * 0.7 + h * 3) % 1; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x + 6 + h * 20, y + T - bt * 20, 1.5, 0, 7); ctx.fill();
    } else if (t === 'x') {
      const s = crumble[c + ',' + r]; if (s && s.gone) return;
      const j = s ? (Math.random() - 0.5) * 3 : 0;
      ctx.fillStyle = '#4b4f55'; ctx.fillRect(x + j, y + j, T + 0.5, 12); ctx.strokeStyle = '#1a1c20'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 6 + j, y + j); ctx.lineTo(x + 12 + j, y + 6 + j); ctx.lineTo(x + 9 + j, y + 12 + j); ctx.moveTo(x + 22 + j, y + j); ctx.lineTo(x + 18 + j, y + 12 + j); ctx.stroke();
    }
  }

  function drawBoss(b) {
    const cx = b.x + b.w / 2, tired = b.st === 'tired' || b.st === 'hit', charge = b.st === 'charge' || b.st === 'chargeWind';
    // Rüssel am Boden (Schlag)
    if (b.st === 'trunkSweep') { const x0 = b.dir > 0 ? b.x + b.w : b.x - b.sweep;
      ctx.fillStyle = '#b98a78'; rr(ctx, x0, FLOOR - 20, b.sweep, 18, 9); ctx.fill(); ctx.strokeStyle = '#7a5548'; ctx.lineWidth = 1;
      for (let i = 12; i < b.sweep; i += 12) { ctx.beginPath(); ctx.moveTo(x0 + i, FLOOR - 19); ctx.lineTo(x0 + i, FLOOR - 3); ctx.stroke(); } }
    ctx.save(); ctx.translate(cx, b.y + b.h); ctx.scale(b.dir, 1);
    if (b.inv > 0 && fl(time * 20) % 2) ctx.globalAlpha = 0.5;
    const sq = tired ? 0.78 : charge ? 0.72 : 1, wob = Math.sin(time * 3) * 1.5;
    if (charge) ctx.rotate(0.28);
    ctx.scale(1, sq);
    // Zweige und Wucherung am Rücken
    ctx.strokeStyle = '#4a2f1c'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-26, -50 - i * 6); ctx.lineTo(-48 - i * 3, -66 - i * 12 + wob); ctx.lineTo(-56 - i * 2, -62 - i * 14); ctx.stroke(); }
    ctx.fillStyle = '#c99a8a'; ctx.beginPath(); ctx.ellipse(-30, -62, 17, 15 + wob * 0.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1a1a'; for (const [ex, ey] of [[-36, -68], [-27, -58], [-38, -56], [-25, -70]]) { ctx.beginPath(); ctx.arc(ex, ey, 2, 0, 7); ctx.fill(); }
    // Füsse, Körper (Anzug)
    ctx.fillStyle = '#b98a78'; ctx.fillRect(-22, -6, 14, 6); ctx.fillRect(8, -6, 14, 6);
    ctx.fillStyle = '#1f2f55'; ctx.beginPath(); ctx.ellipse(0, -40, 35, 36, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.moveTo(8, -74); ctx.lineTo(22, -68); ctx.lineTo(14, -44); ctx.fill();
    ctx.fillStyle = '#12203f'; ctx.beginPath(); ctx.moveTo(13, -70); ctx.lineTo(18, -66); ctx.lineTo(14, -46); ctx.lineTo(10, -52); ctx.fill();
    // Kopf, Haarknoten
    ctx.fillStyle = '#d6a493'; ctx.beginPath(); ctx.ellipse(8, -84, 15, 14, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 2.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(2, -97); ctx.lineTo(-4 + i * 3, -108 - (i % 2) * 3); ctx.stroke(); }
    // Glubschaugen
    const ang = Math.atan2((p.y - (b.y + 10)), (p.x - cx) * b.dir);
    for (const ex of [6, 17]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, -88, 5, 0, 7); ctx.fill();
      if (tired) { ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ex - 3, -91); ctx.lineTo(ex + 3, -85); ctx.moveTo(ex + 3, -91); ctx.lineTo(ex - 3, -85); ctx.stroke(); }
      else { ctx.fillStyle = b.st === 'chargeWind' || b.st === 'trunkWind' ? '#d00' : '#111'; ctx.beginPath(); ctx.arc(ex + Math.cos(ang) * 2, -88 + Math.sin(ang) * 2, 1.8, 0, 7); ctx.fill(); } }
    // Kiefer-Platte mit Zähnen
    const jaw = b.st === 'intro' || b.st === 'dying' || b.st === 'throw' ? 5 : 0;
    ctx.fillStyle = '#c89382'; rr(ctx, 6, -80 + jaw, 30, 13, 2); ctx.fill();
    ctx.fillStyle = '#f3ead2'; for (let i = 0; i < 6; i++) ctx.fillRect(9 + i * 4.4, -80 + jaw, 3.4, 5);
    ctx.fillStyle = '#5a1f1f'; if (jaw) ctx.fillRect(8, -81, 26, jaw + 1);
    // Rüsselarm
    const up = b.st === 'trunkWind' ? -1 : b.st === 'throw' ? -0.6 + Math.sin(b.t * 22) * 0.4 : b.st === 'trunkSweep' ? 1.2 : 0.75 + Math.sin(time * 2) * 0.1;
    ctx.strokeStyle = '#b98a78'; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(22, -58);
    const ex2 = 22 + Math.cos(up) * 42, ey2 = -58 + Math.sin(up) * 42;
    ctx.quadraticCurveTo(22 + Math.cos(up) * 26 + 6, -58 + Math.sin(up) * 16, ex2, ey2); ctx.stroke();
    ctx.fillStyle = '#5a2a2a'; ctx.beginPath(); ctx.arc(ex2, ey2, 4, 0, 7); ctx.fill();
    ctx.restore();
    if (tired && b.st === 'tired') { ctx.fillStyle = '#ffe36e'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) ctx.fillText('★', cx + Math.cos(time * 5 + i * 2.1) * 22, b.y - 8 + Math.sin(time * 5 + i * 2.1) * 5);
      ctx.fillStyle = '#8affc1'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('▼ JETZT!', cx, b.y - 26 + Math.sin(time * 8) * 3); }
    for (const o of b.blobs) { ctx.fillStyle = '#6b4a1e'; ctx.beginPath(); ctx.arc(o.x, o.y, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#8a6a2e'; ctx.beginPath(); ctx.arc(o.x - 2, o.y - 2, 3, 0, 7); ctx.fill(); }
    for (const o of b.pools) { ctx.globalAlpha = Math.min(1, o.t); ctx.fillStyle = '#6b4a1e'; ctx.beginPath(); ctx.ellipse(o.x, FLOOR - 2, 20, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(160,200,90,.5)'; ctx.beginPath(); ctx.arc(o.x + Math.sin(time * 3 + o.x) * 8, FLOOR - 12 - ((time * 20 + o.x) % 18), 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    for (const o of b.waves) { ctx.fillStyle = 'rgba(200,210,255,' + Math.min(1, o.life) + ')'; ctx.beginPath(); ctx.moveTo(o.x - 12, FLOOR); ctx.quadraticCurveTo(o.x, FLOOR - 40, o.x + 12, FLOOR); ctx.fill(); }
    for (const o of b.rocks) { if (o.t < 0) { ctx.fillStyle = 'rgba(255,60,60,' + (0.3 + 0.3 * Math.sin(time * 25)) + ')'; ctx.fillRect(o.x - 12, FLOOR - 3, 24, 3); ctx.fillRect(o.x - 1, T, 2, 10); }
      else { ctx.fillStyle = '#6b7480'; ctx.beginPath(); ctx.moveTo(o.x - 11, o.y); ctx.lineTo(o.x - 4, o.y - 11); ctx.lineTo(o.x + 9, o.y - 7); ctx.lineTo(o.x + 11, o.y + 6); ctx.lineTo(o.x - 3, o.y + 11); ctx.fill(); } }
  }

  // Dunkelheit: schwarze Ebene, in die Lichter "Löcher" schneiden
  const lights = [];
  const light = (x, y, r, a) => lights.push([x, y, r, a == null ? 1 : a]);
  function drawDark() {
    lctx.setTransform(0.5, 0, 0, 0.5, 0, 0); lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, VW, VH); lctx.fillStyle = 'rgba(2,3,8,' + (blackout > 0 ? 0.97 : L.dark) + ')'; lctx.fillRect(0, 0, VW + 2, VH);
    lctx.globalCompositeOperation = 'destination-out';
    for (const [x, y, r, a] of lights) { const sx = x - camX; if (sx < -r || sx > VW + r) continue;
      const g = lctx.createRadialGradient(sx, y, 0, sx, y, r); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(0.45, 'rgba(0,0,0,' + a * 0.8 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g; lctx.fillRect(sx - r, y - r, r * 2, r * 2); }
    ctx.drawImage(lc, 0, 0, lc.width, lc.height, 0, 0, lc.width * 2, VH);
  }

  function draw() {
    ctx.setTransform(SC, 0, 0, SC, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, theme.bg[0]); g.addColorStop(1, theme.bg[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    const sx = shake > 0 ? (Math.random() - 0.5) * shake * 16 : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * 16 : 0;
    const cam = camX + sx; lights.length = 0;
    // Hintergrund: Rippen, Rohre, Bullaugen (bewegt sich langsamer = wirkt weiter weg)
    const px = cam * 0.4; ctx.fillStyle = theme.rib;
    for (let i = fl(px / 150) - 1; i < (px + VW) / 150 + 1; i++) { ctx.fillRect(i * 150 - px, 0, 22, VH);
      if (hash(i, levelIdx) < 0.3) { const wx = i * 150 - px + 86, wy = 120; ctx.fillStyle = '#04060c'; ctx.beginPath(); ctx.arc(wx, wy, 26, 0, 7); ctx.fill();
        ctx.fillStyle = '#cfe0ff'; for (let s = 0; s < 6; s++) ctx.fillRect(wx - 18 + hash(i, s) * 36, wy - 18 + hash(s, i) * 36, 1.2, 1.2);
        ctx.strokeStyle = theme.rib; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(wx, wy, 27, 0, 7); ctx.stroke(); ctx.fillStyle = theme.rib; } }
    ctx.fillRect(0, 60, VW, 7); ctx.fillRect(0, 76, VW, 4); ctx.fillRect(0, 250, VW, 9);
    ctx.save(); ctx.translate(-cam, sy);
    const c0 = Math.max(0, fl(cam / T) - 1), c1 = Math.min(W - 1, fl((cam + VW) / T) + 1);
    for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) { const t = grid[r][c]; if (t !== ' ') drawTile(t, c, r); if (t === '~') light(c * T + 16, r * T + 6, 70, 0.55); }
    // Lampen
    for (const l of lamps) { let on = l.broken ? (hash(fl(time * 9), l.x) > 0.45 ? 1 : 0.15) : 0.92 + Math.sin(time * 40 + l.x) * 0.04;
      if (stalker && Math.abs(stalker.x - l.x) < 240 && hash(fl(time * 22), l.x) < 0.55) on *= 0.06;   // Lampen flackern, wenn der Schatten nah ist
      if (blackout > 0) on = 0;
      ctx.fillStyle = '#111'; ctx.fillRect(l.x - 1, T, 2, 8); ctx.fillStyle = '#333'; ctx.fillRect(l.x - 9, T + 6, 18, 5);
      ctx.fillStyle = theme.glow; ctx.globalAlpha = on; ctx.fillRect(l.x - 7, T + 10, 14, 3);
      const cg = ctx.createLinearGradient(0, T + 12, 0, FLOOR); cg.addColorStop(0, theme.glow); cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = on * 0.13; ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(l.x - 7, T + 12); ctx.lineTo(l.x + 7, T + 12); ctx.lineTo(l.x + 90, FLOOR); ctx.lineTo(l.x - 90, FLOOR); ctx.fill(); ctx.globalAlpha = 1;
      light(l.x, T + 90, 200, on * 0.9); }
    // Fallen
    for (const v of vents) { const s = ventOn(v), x = v.c * T + 16, y = v.r * T;
      if (s === 'warn') { ctx.fillStyle = 'rgba(220,230,240,.5)'; for (let i = 0; i < 3; i++) ctx.fillRect(x - 6 + hash(i, fl(time * 20)) * 12, y - 4 - hash(fl(time * 20), i) * 14, 2, 2); }
      if (s === 'on') { for (let i = 0; i < 9; i++) { const yy = y - ((time * 260 + i * 11) % 96); ctx.fillStyle = 'rgba(220,230,240,' + (0.16 + 0.3 * (1 - (y - yy) / 96)) + ')'; ctx.beginPath(); ctx.arc(x + Math.sin(i * 3 + time * 9) * 5, yy, 6 + (y - yy) / 14, 0, 7); ctx.fill(); } light(x, y - 40, 70, 0.3); } }
    for (const l of lasers) { const s = laserOn(l), x = l.c * T + 16, y = (l.r + 1) * T;
      if (s === 'warn') { ctx.fillStyle = 'rgba(255,60,60,' + (0.2 + 0.3 * Math.sin(time * 50)) + ')'; ctx.fillRect(x - 0.5, y, 1, l.len); }
      if (s === 'on') { ctx.fillStyle = 'rgba(255,40,40,.35)'; ctx.fillRect(x - 5, y, 10, l.len); ctx.fillStyle = '#ffd0d0'; ctx.fillRect(x - 1.5, y, 3, l.len); light(x, y + l.len / 2, 120, 0.6); light(x, y + l.len, 60, 0.6); } }
    for (const t of tents) { const h = tentH(t), x = t.c * T + 16, y = t.r * T; if (h < 1) continue;
      ctx.strokeStyle = '#8a3358'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.sin(time * 7 + t.c) * 10, y - h / 2, x + Math.sin(time * 5 + t.c) * 6, y - h); ctx.stroke();
      ctx.strokeStyle = '#c96a8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.quadraticCurveTo(x + Math.sin(time * 7 + t.c) * 10 - 2, y - h / 2, x + Math.sin(time * 5 + t.c) * 6 - 2, y - h); ctx.stroke(); }
    for (const pl of plats) { ctx.fillStyle = '#56626e'; rr(ctx, pl.x, pl.y, pl.w, pl.h, 3); ctx.fill(); ctx.fillStyle = '#7fd8ff'; ctx.fillRect(pl.x + 6, pl.y + pl.h - 2, 8, 3); ctx.fillRect(pl.x + pl.w - 14, pl.y + pl.h - 2, 8, 3);
      light(pl.x + pl.w / 2, pl.y + 12, 60, 0.5); }
    // Dinge
    for (const it of items) {
      if (it.type === 'o') { if (it.on) continue; const y = it.y + Math.sin(time * 4 + it.x) * 3; ctx.fillStyle = '#6fe3ff'; rr(ctx, it.x - 5, y - 6, 10, 12, 2); ctx.fill(); ctx.fillStyle = '#0c2a36'; ctx.fillRect(it.x - 3, y - 3, 6, 2); ctx.fillRect(it.x - 3, y + 1, 6, 2); light(it.x, y, 34, 0.55); }
      else if (it.type === 'h') { if (it.on) continue; const y = it.y + Math.sin(time * 3) * 2; ctx.fillStyle = '#ff5a6e'; ctx.beginPath(); ctx.arc(it.x - 4, y - 2, 5, 0, 7); ctx.arc(it.x + 4, y - 2, 5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(it.x - 9, y); ctx.lineTo(it.x, y + 10); ctx.lineTo(it.x + 9, y); ctx.fill(); light(it.x, y, 46, 0.6); }
      else if (it.type === 'K') { ctx.fillStyle = it.on ? '#3a3f46' : '#c9ced6'; rr(ctx, it.x - 13, it.y - 18, 26, 34, 3); ctx.fill(); ctx.fillStyle = it.on ? '#55303a' : '#d43a3a'; ctx.fillRect(it.x - 3, it.y - 12, 6, 18); ctx.fillRect(it.x - 9, it.y - 6, 18, 6); light(it.x, it.y, it.on ? 30 : 80, 0.7); }
      else if (it.type === 'E') { ctx.fillStyle = '#0a0d12'; rr(ctx, it.x - 15, it.y - 36, 30, 52, 4); ctx.fill(); ctx.strokeStyle = '#8affc1'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(138,255,193,' + (0.25 + 0.15 * Math.sin(time * 3)) + ')'; ctx.fillRect(it.x - 11, it.y - 32, 22, 44); ctx.fillStyle = '#8affc1'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('EXIT', it.x, it.y - 40); light(it.x, it.y - 10, 110, 0.8); } }
    // Checkpoints: Signalmast, leuchtet grün, wenn aktiv
    for (const c of checks) { ctx.fillStyle = '#2a3038'; ctx.fillRect(c.x - 2, c.y - 54, 4, 54); ctx.fillRect(c.x - 9, c.y - 4, 18, 4);
      const col = c.on ? '#8affc1' : '#7a3030', pulse = c.on ? 0.8 + 0.2 * Math.sin(time * 4) : 0.4 + 0.4 * (fl(time * 2) % 2);
      ctx.globalAlpha = pulse; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(c.x, c.y - 56, 6, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      if (c.on) { ctx.fillStyle = 'rgba(138,255,193,.85)'; ctx.beginPath(); ctx.moveTo(c.x + 2, c.y - 50); ctx.lineTo(c.x + 20 + Math.sin(time * 5) * 2, c.y - 45); ctx.lineTo(c.x + 2, c.y - 40); ctx.fill(); }
      light(c.x, c.y - 50, c.on ? 110 : 50, 0.7); }
    // Leichen der Crew und Blutschrift (nur im Licht zu sehen)
    for (const d of decor) {
      if (d.x < cam - 150 || d.x > cam + VW + 150) continue;
      if (d.type === 'b') {
        ctx.fillStyle = 'rgba(70,6,8,.85)'; ctx.beginPath(); ctx.ellipse(d.x + 2, d.y - 1, 30, 4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(70,6,8,.6)'; ctx.fillRect(d.x + 18, d.y - 2, 26, 2);
        ctx.fillStyle = '#14161b'; ctx.fillRect(d.x - 27, d.y - 6, 13, 5);
        ctx.fillStyle = d.col; rr(ctx, d.x - 15, d.y - 9, 24, 8, 3); ctx.fill();
        ctx.fillStyle = '#a89a8c'; ctx.beginPath(); ctx.arc(d.x + 13, d.y - 5, 5, 0, 7); ctx.fill();
        ctx.fillStyle = d.col; ctx.save(); ctx.translate(d.x + 2, d.y - 8); ctx.rotate(-0.6); ctx.fillRect(0, -2, 14, 4); ctx.restore();
      } else {
        ctx.save(); ctx.font = 'bold 17px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#7d1010'; ctx.globalAlpha = 0.9;
        ctx.translate(d.x, d.y); ctx.rotate(-0.04); ctx.fillText(d.txt, 0, 0);
        const w = ctx.measureText(d.txt).width;
        for (let i = 0; i < d.txt.length; i++) { const hh = hash(i, d.x) ; if (hh < 0.45) ctx.fillRect(-w / 2 + (i + 0.5) * w / d.txt.length - 1, 2, 2, 4 + hh * 22); }
        ctx.restore();
      }
    }
    // Gegner
    for (const e of enemies) { if (!e.alive) continue; const x = e.x + e.w / 2;
      if (e.type === 'j') { const sq = e.ground ? 1 : 1.25;
        ctx.fillStyle = '#c9b2a4'; ctx.beginPath(); ctx.ellipse(x, e.y + e.h - 9 * sq, 13 / sq, 10 * sq, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#8a6a60'; for (const lx of [-9, -4, 4, 9]) ctx.fillRect(x + lx - 1, e.y + e.h - 4, 2, 4 + (e.ground ? 0 : 3));
        ctx.fillStyle = '#3a0a0a'; ctx.beginPath(); ctx.ellipse(x + e.dir * 4, e.y + e.h - 9, 6, e.ground ? 2 : 5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#f3ead2'; for (let i = -2; i <= 2; i++) ctx.fillRect(x + e.dir * 4 + i * 2.2 - 0.6, e.y + e.h - 11, 1.2, 2.5);
        ctx.fillStyle = '#111'; ctx.fillRect(x + e.dir * 6 - 1, e.y + e.h - 17, 2.5, 2.5); light(x, e.y + 10, 22, 0.35); continue; }
      if (e.type === 'u') { const hang = e.st === 'hang';
        if (hang) { ctx.strokeStyle = 'rgba(200,190,200,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, e.y + 4); ctx.stroke(); }
        ctx.strokeStyle = '#2a1430'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const k = Math.sin(time * (hang ? 3 : 14) + i) * 3;
          ctx.beginPath(); ctx.moveTo(x, e.y + 10); ctx.lineTo(x + sd * (8 + i * 2), e.y + 4 + i * 3 + k); ctx.lineTo(x + sd * (12 + i * 2), e.y + (hang ? -2 : 20)); ctx.stroke(); }
        ctx.fillStyle = '#3d1b45'; ctx.beginPath(); ctx.ellipse(x, e.y + 10, 10, 9, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#e9d8c8'; ctx.beginPath(); ctx.arc(x, e.y + (hang ? 13 : 8), 4, 0, 7); ctx.fill();
        ctx.fillStyle = '#b00'; ctx.beginPath(); ctx.arc(x + (p.x > x ? 1.3 : -1.3), e.y + (hang ? 14 : 8), 1.8, 0, 7); ctx.fill(); continue; }
      if (e.type === 'c') { ctx.fillStyle = '#5a1e2c'; ctx.beginPath(); ctx.ellipse(x, e.y + 10, 13, 9, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(e.x, e.y + 9, e.w, 5);
        ctx.strokeStyle = '#3a1019'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const lx = e.x + 3 + i * 6.5, k = Math.sin(time * 14 + i * 1.6) * 3; ctx.beginPath(); ctx.moveTo(lx, e.y + 13); ctx.lineTo(lx + k, e.y + 18); ctx.stroke(); }
        ctx.fillStyle = '#ff4040'; ctx.fillRect(x + e.dir * 6 - 1.5, e.y + 6, 3, 3); ctx.fillRect(x + e.dir * 1 - 1.5, e.y + 6, 3, 3); light(x, e.y + 6, 26, 0.5); }
      else { ctx.fillStyle = '#39424c'; rr(ctx, e.x, e.y + 3, e.w, 12, 5); ctx.fill(); ctx.fillStyle = '#f5c542'; ctx.beginPath(); ctx.arc(x, e.y + 9, 4, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(200,220,255,.5)'; ctx.fillRect(e.x - 3, e.y + (fl(time * 30) % 2), 12, 2); ctx.fillRect(e.x + e.w - 9, e.y + (fl(time * 30 + 1) % 2), 12, 2); light(x, e.y + 9, 46, 0.6); } }
    if (stalker) { const s = stalker, a = 1 - s.fade, jit = () => (Math.random() - 0.5) * 2;
      ctx.globalAlpha = a * 0.92; ctx.fillStyle = '#020204';
      ctx.beginPath(); ctx.moveTo(s.x + 14 + jit(), s.y); ctx.quadraticCurveTo(s.x + 30, s.y + 20, s.x + 24 + jit(), s.y + 72);
      ctx.lineTo(s.x + 4 + jit(), s.y + 72); ctx.quadraticCurveTo(s.x - 2, s.y + 20, s.x + 14, s.y); ctx.fill();
      ctx.beginPath(); ctx.arc(s.x + 14 + jit(), s.y + 2, 8, 0, 7); ctx.fill();
      ctx.strokeStyle = '#020204'; ctx.lineWidth = 3; const reach = Math.sign(p.x - s.x) || 1;
      for (const k of [0, 1]) { ctx.beginPath(); ctx.moveTo(s.x + 14, s.y + 18); ctx.quadraticCurveTo(s.x + 14 + reach * 20, s.y + 22 + k * 8, s.x + 14 + reach * (38 + k * 4) + jit() * 2, s.y + 30 + k * 10 + Math.sin(time * 9 + k) * 4); ctx.stroke(); }
      ctx.globalAlpha = 1; }
    if (boss && !boss.dead) { drawBoss(boss); if (blackout <= 0) light(boss.x + boss.w / 2, boss.y + 30, 190, 0.75); }
    // Spieler
    if (phase !== 'dead' && (p.inv <= 0 || fl(time * 18) % 2 || phase !== 'play')) drawChar(ctx, ch, p.x + p.w / 2, p.y + p.h, p.dir, p.runT, { run: p.ground && Math.abs(p.vx) > 20, air: !p.ground });
    const lampK = blackout > 0 ? 0.5 + 0.15 * Math.sin(time * 37) : 1;
    light(p.x + p.w / 2, p.y + p.h / 2 - 4, (ch.light || 105) * lampK, 0.95); light(p.x + p.w / 2 + p.dir * 70, p.y + p.h / 2, (ch.light || 105) * 0.8 * lampK, 0.5);
    for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life * 2); ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); } ctx.globalAlpha = 1;
    ctx.restore();
    drawDark();
    // Augen, die im Dunkeln leuchten: der Schatten und Johanal beim Stromausfall
    if (stalker) { const s = stalker, a = (1 - s.fade) * (0.75 + 0.25 * Math.sin(time * 11)); ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
      const ex = s.x + 14 - cam, ey = s.y + 1; ctx.fillRect(ex - 5, ey, 3, 2); ctx.fillRect(ex + 2, ey, 3, 2); }
    if (boss && !boss.dead && blackout > 0) { ctx.fillStyle = '#ff2020'; const bx = boss.x + boss.w / 2 - cam;
      for (const ox of [6, 17]) ctx.fillRect(bx + boss.dir * ox - 2, boss.y + boss.h - 88 * (boss.h / 92) - 2, 4, 4); }
    // Augen im Dunkeln (verschwinden, wenn man näher kommt)
    for (let i = fl(cam / 260); i < (cam + VW) / 260 + 1; i++) { if (hash(i, levelIdx + 7) > 0.5) continue; const ex = i * 260 + hash(i, 3) * 200, ey = 110 + hash(i, 5) * 150, d = Math.abs(ex - p.x);
      if (d < 190 || fl(time * 0.4 + hash(i, 9) * 9) % 5 === 0) continue; ctx.fillStyle = 'rgba(255,40,40,' + Math.min(0.75, (d - 190) / 200) + ')'; ctx.fillRect(ex - cam, ey, 2.5, 2); ctx.fillRect(ex - cam + 7, ey, 2.5, 2); }
    // Rand abdunkeln, Treffer-Blitz, Level-Titel
    const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
    if (hurtFlash > 0) { ctx.fillStyle = 'rgba(190,20,20,' + hurtFlash + ')'; ctx.fillRect(0, 0, VW, VH); }
    if (p.hp === 1 && phase === 'play') { ctx.fillStyle = 'rgba(160,0,0,' + (0.1 + 0.08 * Math.sin(time * 6)) + ')'; ctx.fillRect(0, 0, VW, VH); }
    // Filmkorn
    ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 140; i++) ctx.fillRect(Math.random() * VW, Math.random() * VH, 1, 1);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 60; i++) ctx.fillRect(Math.random() * VW, Math.random() * VH, 1.5, 1.5);
    // Bildstörung, wenn der Schatten nah ist
    if (glitch > 0 && Math.random() < 0.6) { ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < 3; i++) { const y = Math.random() * cv.height, h = 4 + Math.random() * 30; ctx.drawImage(cv, 0, y, cv.width, h, (Math.random() - 0.5) * 40, y, cv.width, h); }
      ctx.setTransform(SC, 0, 0, SC, 0, 0); }
    if (scareT > 0) drawScare();
    if (phase === 'dead' || phase === 'gameover') { const k = phase === 'gameover' ? 1 : Math.min(1, (2.0 - phaseT) / 0.6); ctx.fillStyle = 'rgba(25,0,0,' + Math.min(0.9, k) + ')'; ctx.fillRect(0, 0, VW, VH);
      ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.fillStyle = '#c0392b'; ctx.font = 'bold 30px Georgia, serif'; if (phase === 'dead') { ctx.font = 'bold 22px Georgia, serif'; const words = deathText.split(' '), lines = [''];
        for (const w of words) { const t = (lines[lines.length - 1] + ' ' + w).trim(); if (ctx.measureText(t).width > VW * 0.8 && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t; }
        lines.forEach((ln, i) => ctx.fillText(ln, VW / 2 + (Math.random() - 0.5) * 3, VH * 0.45 + (i - (lines.length - 1) / 2) * 28)); }
      ctx.globalAlpha = 1; }
    if (introT > 0) { const a = Math.min(1, introT / 0.8, (3.2 - introT) / 0.4); ctx.globalAlpha = a; ctx.textAlign = 'center';
      ctx.fillStyle = '#d8dde6'; ctx.font = 'bold 26px Georgia, serif'; ctx.fillText(L.name, VW / 2, VH * 0.36);
      ctx.fillStyle = '#9aa3b3'; ctx.font = '12px Georgia, serif'; ctx.fillText(L.sub.toUpperCase(), VW / 2, VH * 0.36 - 30);
      ctx.fillStyle = '#b55'; ctx.font = 'italic 13px Georgia, serif'; ctx.fillText(L.text, VW / 2, VH * 0.36 + 26); ctx.globalAlpha = 1; }
  }

  // Jumpscare: Johanals Gesicht füllt kurz den Bildschirm
  function drawScare() {
    const k = Math.min(1, scareT / 0.08), cx = VW / 2 + (Math.random() - 0.5) * 26, cy = VH * 0.55 + (Math.random() - 0.5) * 16, S = VH / 170;
    ctx.fillStyle = 'rgba(8,0,0,' + 0.92 * k + ')'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(S, S); ctx.globalAlpha = k; ctx.rotate((Math.random() - 0.5) * 0.06);
    // Kopf mit harter Seitenbeleuchtung
    const fg = ctx.createRadialGradient(-30, -40, 10, 0, -10, 95); fg.addColorStop(0, '#d9a898'); fg.addColorStop(0.55, '#8a5a50'); fg.addColorStop(1, '#1a0806');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(0, -10, 82, 80, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a1410'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 5, -88); ctx.lineTo(-24 + i * 9, -118 - (i % 2) * 8); ctx.stroke(); }   // Haarknoten
    // tiefe Augenhöhlen, blutunterlaufene Glubschaugen, winzige Pupillen
    for (const ex of [-33, 33]) {
      ctx.fillStyle = 'rgba(20,0,0,.85)'; ctx.beginPath(); ctx.ellipse(ex, -30, 34, 30, 0, 0, 7); ctx.fill();
      const eg = ctx.createRadialGradient(ex, -30, 4, ex, -30, 26); eg.addColorStop(0, '#fffaf0'); eg.addColorStop(0.7, '#f0d8c8'); eg.addColorStop(1, '#a03030');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, -30, 25, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(170,0,0,.8)'; ctx.lineWidth = 1.2;
      for (let v = 0; v < 9; v++) { const a = v / 9 * 6.28 + ex; ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * 24, -30 + Math.sin(a) * 24); ctx.quadraticCurveTo(ex + Math.cos(a + 0.3) * 15, -30 + Math.sin(a + 0.3) * 15, ex + Math.cos(a) * 9, -30 + Math.sin(a) * 9); ctx.stroke(); }
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + (Math.random() - 0.5) * 4, -29, 3.5, 0, 7); ctx.fill();
    }
    // aufgerissene Kiefer-Platte, schief
    ctx.save(); ctx.rotate(0.06); ctx.fillStyle = '#7a4a40'; rr(ctx, -72, 18, 144, 70, 6); ctx.fill();
    ctx.fillStyle = '#120202'; ctx.fillRect(-64, 20, 128, 44);
    ctx.fillStyle = '#d8ccae'; for (let i = 0; i < 10; i++) { ctx.fillRect(-62 + i * 12.6, 20, 9, 14 + hash(i, 1) * 6); ctx.fillRect(-62 + i * 12.6, 50 - hash(i, 2) * 6, 9, 14 + hash(i, 2) * 6); }
    ctx.fillStyle = 'rgba(110,0,0,.7)'; for (let i = 0; i < 5; i++) ctx.fillRect(-55 + i * 27, 34, 3, 10 + hash(i, 4) * 26);
    ctx.restore();
    ctx.restore(); ctx.globalAlpha = 1;
    // Rotstich, Streifen, Rauschen
    ctx.fillStyle = 'rgba(140,0,0,' + 0.25 * k + ')'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < VH; y += 3) ctx.fillRect(0, y, VW, 1);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 300; i++) ctx.fillRect(Math.random() * VW, Math.random() * VH, 1.5, 1.5);
  }

  // ---------- 6. Menü und Ablauf ----------
  function step(dt) {
    time += dt; shake = Math.max(0, shake - dt); hurtFlash = Math.max(0, hurtFlash - dt); introT -= dt;
    if (phase === 'play') stepPlayer(dt);
    stepWorld(dt);
    if (phase === 'play' || phase === 'dead') stepBoss(dt);
    stepHorror(dt);
    if (phase === 'dead') { phaseT -= dt; if (phaseT <= 0) showDeathMenu(); }
    for (const q of parts) { q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    if (parts.length > 300) parts.splice(0, parts.length - 300);
    parts = parts.filter(q => q.life > 0);
    const levelW = W * T, tx = p.x + p.w / 2 - VW * 0.42 + p.dir * 30;
    camX = levelW <= VW ? (levelW - VW) / 2 : clamp(camX + (tx - camX) * Math.min(1, dt * 6), 0, levelW - VW);
  }
  let last = 0, accT = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (phase === 'play' || phase === 'dead') { accT += dt; while (accT >= STEP) { step(STEP); accT -= STEP; } }
    if (L) draw();
    if (phase === 'gameover') time += dt;
  }
  function updateHud() { $('hearts').textContent = '♥'.repeat(Math.max(0, p.hp)) + '♡'.repeat(Math.max(0, (ch.hp || 5) - p.hp)); $('chips').textContent = chipsTotal ? '▣ ' + chips + '/' + chipsTotal : ''; }
  let toastT = null;
  function toast(txt) { const t = $('toast'); t.textContent = txt; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }
  const fmt = s => fl(s / 60) + ':' + String(fl(s % 60)).padStart(2, '0') + '.' + fl(s * 10 % 10);

  function startLevel(i) {
    Sfx.init(); loadLevel(i); updateHud(); updateBossBar();
    $('menu').style.display = 'none'; $('over').style.display = 'none'; $('hud').style.display = 'flex'; $('touch').style.display = 'block';
    phase = 'play'; Sfx.ambient(true, L.boss); Sfx.play('door');
  }
  function levelDone() {
    phase = 'done'; Sfx.play(L.boss ? 'win' : 'door'); Sfx.ambient(true, false);
    const best = save.best[levelIdx], isBest = !best || time < best; if (isBest) save.best[levelIdx] = time;
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, levelIdx + 2)); store();
    const lastLvl = levelIdx === LEVELS.length - 1;
    $('overTitle').classList.remove('deathT'); $('overTitle').textContent = lastLvl ? 'Johanal ist besiegt' : 'Deck geschafft';
    $('overText').innerHTML = (lastLvl ? 'Die Marienfeld ist still. Für den Moment.<br><br>' : '') +
      'Zeit: <b>' + fmt(time) + '</b>' + (isBest ? ' (Bestzeit!)' : '') + '<br>Datenchips: <b>' + chips + ' / ' + chipsTotal + '</b><br>Tode: <b>' + deaths + '</b>';
    $('overNext').style.display = lastLvl ? 'none' : ''; $('overResume').style.display = 'none'; $('overRetry').style.display = ''; $('overCheck').style.display = 'none'; $('overRetry').textContent = 'Nochmal';
    $('over').style.display = 'flex'; $('touch').style.display = 'none';
  }
  function togglePause() {
    if (phase === 'play') { phase = 'pause'; $('overTitle').classList.remove('deathT'); $('overTitle').textContent = 'Pause'; $('overText').textContent = L.name + ' · ' + L.sub;
      $('overNext').style.display = 'none'; $('overResume').style.display = ''; $('overRetry').style.display = ''; $('overCheck').style.display = 'none'; $('overRetry').textContent = 'Nochmal'; $('over').style.display = 'flex'; }
    else if (phase === 'pause') { phase = 'play'; $('over').style.display = 'none'; }
  }
  function showMenu() {
    phase = 'menu'; Sfx.ambient(false); $('over').style.display = 'none'; $('hud').style.display = 'none'; $('touch').style.display = 'none'; $('menu').style.display = 'flex';
    const cg = $('charGrid'); cg.innerHTML = '';
    for (const c of CHARS) { const b = document.createElement('button'); b.className = 'card' + (c.id === save.char ? ' sel' : '');
      const cn = document.createElement('canvas'); cn.width = 96; cn.height = 96; const g = cn.getContext('2d'); g.scale(2.4, 2.4); drawChar(g, c, 19, 37, 1, 0, { run: false, air: false });
      b.appendChild(cn); b.insertAdjacentHTML('beforeend', '<b>' + c.name + '</b><small>' + c.info + '</small>');
      b.onclick = () => { save.char = c.id; store(); showMenu(); }; cg.appendChild(b); }
    const lg = $('lvlGrid'); lg.innerHTML = '';
    LEVELS.forEach((lv, i) => { const b = document.createElement('button'), open = i < save.unlocked; b.className = 'lvl' + (open ? '' : ' locked') + (lv.boss ? ' boss' : '');
      b.innerHTML = '<span>' + (open ? i + 1 : '🔒') + '</span><b>' + lv.name + '</b><small>' + lv.sub + (save.best[i] ? ' · ' + fmt(save.best[i]) : '') + '</small>';
      if (open) b.onclick = () => startLevel(i); lg.appendChild(b); });
    $('muteBtn').textContent = save.mute ? '🔇' : '🔊';
  }
  $('overNext').onclick = () => startLevel(levelIdx + 1);
  $('overRetry').onclick = () => startLevel(levelIdx);
  $('overCheck').onclick = respawnAtCheck;
  $('overResume').onclick = togglePause;
  $('overMenu').onclick = showMenu;
  $('pauseBtn').onclick = togglePause;
  $('muteBtn').onclick = () => { save.mute = !save.mute; Sfx.setMuted(save.mute); store(); $('muteBtn').textContent = save.mute ? '🔇' : '🔊'; };
  document.addEventListener('visibilitychange', () => { if (document.hidden && phase === 'play') togglePause(); });

  // Hintergrund fürs Menü: erstes Level, ohne Spieler-Steuerung
  loadLevel(0); showMenu(); requestAnimationFrame(frame);

  // Für Tests
  window.__g = { start: startLevel, sim(n, k) { Object.assign(keys, { l: false, r: false, j: false }, k || {}); for (let i = 0; i < n; i++) step(STEP); },
    press() { jPressed = true; }, get p() { return p; }, get boss() { return boss; }, get phase() { return phase; }, get W() { return W; }, tile, solid,
    get plats() { return plats; }, get items() { return items; }, set god(v) { god = v; }, get time() { return time; }, get deaths() { return deaths; }, get stalker() { return stalker; }, get enemies() { return enemies; }, spawnStalker, get checkAt() { return checkAt; }, get checks() { return checks; }, respawnAtCheck, get scareT() { return scareT; }, scare() { scareT = 0.5; }, black(v) { blackout = v; }, keys };
})();
