// =====================================================
//  TON – alles wird live erzeugt (keine Sounddateien)
//  Sfx.play('jump') spielt einen Effekt,
//  Sfx.ambient(true/false, boss) schaltet das düstere Hintergrund-Brummen.
// =====================================================
window.Sfx = (() => {
  let ctx = null, master = null, amb = null, muted = false, noiseBuf = null, creakTimer = null, bossMode = false;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  // Ton: Wellenform, Start- und End-Frequenz, Dauer, Lautstärke
  function tone(type, f0, f1, len, vol, delay) {
    const t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(master); o.start(t); o.stop(t + len + 0.02);
  }
  // Rauschen durch einen Filter (für Zischen, Krachen, Schritte)
  function noise(len, vol, type, f0, f1, q, delay) {
    const t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
  }
  const FX = {
    jump() { tone('sine', 260, 430, 0.12, 0.12); },
    jump2() { tone('sine', 360, 560, 0.12, 0.1); },
    land() { noise(0.08, 0.12, 'lowpass', 300, 80); },
    chip() { tone('triangle', 520, 520, 0.07, 0.1); tone('triangle', 780, 780, 0.12, 0.09, 0.07); },
    heart() { tone('sine', 330, 330, 0.12, 0.14); tone('sine', 440, 440, 0.12, 0.14, 0.1); tone('sine', 550, 550, 0.2, 0.14, 0.2); },
    hurt() { tone('sawtooth', 220, 60, 0.3, 0.22); noise(0.2, 0.2, 'lowpass', 900, 150); },
    die() { tone('sawtooth', 180, 30, 0.9, 0.25); noise(0.7, 0.2, 'lowpass', 600, 60); },
    stomp() { noise(0.12, 0.25, 'lowpass', 500, 90); tone('square', 150, 50, 0.15, 0.12); },
    bounce() { tone('triangle', 140, 240, 0.12, 0.16); },
    steam() { noise(0.9, 0.05, 'bandpass', 1800, 900, 0.7); },
    laser() { tone('sawtooth', 110, 105, 0.5, 0.03); },
    crumble() { noise(0.35, 0.14, 'lowpass', 400, 70); },
    check() { tone('triangle', 330, 330, 0.3, 0.1); tone('triangle', 415, 415, 0.3, 0.1, 0.08); tone('triangle', 495, 495, 0.5, 0.1, 0.16); },
    door() { tone('sawtooth', 80, 160, 0.9, 0.12); noise(0.9, 0.1, 'lowpass', 200, 700); },
    roar() { for (const d of [0, 7, -5]) { const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(95 + d, t); o.frequency.exponentialRampToValueAtTime(48, t + 1.2);
        l.frequency.value = 27; lg.gain.value = 14; l.connect(lg).connect(o.frequency);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
        o.connect(g).connect(master); o.start(t); l.start(t); o.stop(t + 1.35); l.stop(t + 1.35); }
      noise(1.1, 0.12, 'lowpass', 700, 150); },
    fart() { const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.45);
      l.type = 'square'; l.frequency.value = 34; lg.gain.value = 28; l.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g).connect(master); o.start(t); l.start(t); o.stop(t + 0.52); l.stop(t + 0.52); },
    splat() { noise(0.2, 0.18, 'lowpass', 700, 120); },
    quake() { noise(0.7, 0.4, 'lowpass', 160, 40); tone('sine', 70, 30, 0.6, 0.35); },
    whoosh() { noise(0.4, 0.16, 'bandpass', 300, 1200, 0.8); },
    bosshit() { tone('square', 200, 70, 0.35, 0.2); noise(0.3, 0.25, 'lowpass', 1200, 200); },
    win() { [262, 330, 392, 523].forEach((f, i) => tone('triangle', f, f, 0.5, 0.12, i * 0.16)); },
    heartbeat() { tone('sine', 62, 38, 0.16, 0.4); tone('sine', 56, 34, 0.16, 0.3, 0.2); },
    whisper() { for (let i = 0; i < 4; i++) noise(0.9 + Math.random() * 0.6, 0.05, 'bandpass', 1400 + Math.random() * 1600, 900 + Math.random() * 1500, 9, i * 0.25); },
    hiss() { noise(0.4, 0.12, 'bandpass', 3200, 1600, 1.5); },
    scream() { for (const f of [430, 520, 610, 745]) tone('sawtooth', f, f * 1.6, 0.7, 0.07); noise(0.7, 0.3, 'bandpass', 1800, 3200, 0.8); tone('sine', 80, 30, 0.6, 0.4); },
    powerdown() { tone('sawtooth', 240, 28, 1.1, 0.12); noise(0.3, 0.18, 'lowpass', 2500, 120); },
    powerup() { tone('sawtooth', 40, 140, 0.5, 0.05); noise(0.15, 0.08, 'bandpass', 3000, 3000, 2); },
    creak() { noise(1.4, 0.05, 'bandpass', 220 + Math.random() * 300, 120 + Math.random() * 200, 14); }
  };
  function play(name) { if (!ctx || muted || !FX[name]) return; try { FX[name](); } catch (e) {} }

  // Hintergrund: tiefes Brummen + ab und zu ein Knarren im Rumpf. Beim Boss kommt ein pochender Bass dazu.
  function ambient(on, boss) {
    init(); if (!ctx) return;
    bossMode = !!boss;
    if (!on) { if (amb) { amb.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3); const a = amb; setTimeout(() => { try { a.o1.stop(); a.o2.stop(); a.l.stop(); a.p.stop(); } catch (e) {} }, 1200); amb = null; } clearTimeout(creakTimer); return; }
    if (!amb) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 170; f.connect(g);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(); o1.type = o2.type = 'sawtooth'; o1.frequency.value = 43; o2.frequency.value = 43.6; o1.connect(f); o2.connect(f);
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.13; lg.gain.value = 60; l.connect(lg).connect(f.frequency);
      // pochender Bass (nur beim Boss hörbar)
      const p = ctx.createOscillator(), pg = ctx.createGain(), pl = ctx.createOscillator(), plg = ctx.createGain();
      p.type = 'triangle'; p.frequency.value = 55; pg.gain.value = 0; pl.type = 'square'; pl.frequency.value = 2.2; plg.gain.value = 0; pl.connect(plg).connect(pg.gain); p.connect(pg).connect(master);
      o1.start(); o2.start(); l.start(); p.start(); pl.start();
      amb = { g, o1, o2, l, p, plg };
      const creak = () => { play('creak'); creakTimer = setTimeout(creak, 6000 + Math.random() * 9000); };
      creakTimer = setTimeout(creak, 4000);
    }
    amb.g.gain.setTargetAtTime(0.16, ctx.currentTime, 0.8);
    amb.plg.gain.setTargetAtTime(bossMode ? 0.09 : 0, ctx.currentTime, 0.3);
  }
  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 1; }
  return { init, play, ambient, setMuted, get muted() { return muted; } };
})();
