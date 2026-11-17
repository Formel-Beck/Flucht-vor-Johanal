// =====================================================
//  SPIELFIGUREN – die Crew der Marienfeld
//
//  Jede Figur hat eine kleine Besonderheit:
//    light = wie weit ihre Lampe leuchtet (Standard 105)
//    jump  = Sprungkraft (Standard 660)
//    speed = Lauftempo (Standard 200)
//    hp    = Herzen (Standard 3)
//    dbl   = Doppelsprung, glide = Schweben (Sprung halten)
//    h     = Körperhöhe für Kollisionen (Standard 28)
// =====================================================
window.CHARS = [
  { id: 'orla', name: 'Orla Venn', info: 'Funkerin. Ihre Stirnlampe leuchtet viel weiter.', color: '#e86a2a', light: 170 },
  { id: 'locken', name: 'Der Lockenkopf', info: 'Springt am höchsten.', color: '#8e44ad', jump: 730 },
  { id: 'waechter', name: 'Der Wächter', info: 'Hält 5 Treffer aus, ist aber langsamer.', color: '#6b8e23', hp: 5, speed: 172 },
  { id: 'maske', name: 'Der Maskierte', info: 'Rennt am schnellsten.', color: '#3a3d46', speed: 240 },
  { id: 'katze', name: 'Die grüne Katze', info: 'Klein und kann in der Luft ein zweites Mal springen.', color: '#43a047', dbl: true, h: 20 },
  { id: 'geist', name: 'Der Geist', info: 'Sprung gedrückt halten = langsam schweben.', color: '#9fc4e0', glide: true }
];

// Abgerundetes Rechteck (funktioniert auch auf älteren Handys)
window.rr = (g, x, y, w, h, r) => {
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
};

// Figur zeichnen. x = Mitte, y = Füsse. dir = 1 (rechts) oder -1 (links).
// st = { run: läuft, air: in der Luft }
window.drawChar = (g, ch, x, y, dir, t, st) => {
  g.save(); g.translate(x, y); g.scale(dir, 1);
  const run = st.run ? Math.sin(t * 16) : 0, air = st.air;
  if (ch.id === 'katze') {
    const lg = air ? 2 : run * 3;
    g.strokeStyle = '#2e7d32'; g.lineWidth = 3; g.lineCap = 'round';           // Schwanz
    g.beginPath(); g.moveTo(-9, -9); g.quadraticCurveTo(-17, -14, -13, -22 + Math.sin(t * 5) * 2); g.stroke();
    g.fillStyle = '#2e7d32';                                                    // Beine
    for (const [lx, s] of [[-7, 1], [-3, -1], [3, 1], [7, -1]]) g.fillRect(lx + lg * s * 0.6 - 1.5, -5, 3, 5);
    g.fillStyle = ch.color; g.beginPath(); g.ellipse(0, -9, 11, 6, 0, 0, 7); g.fill();   // Körper
    g.beginPath(); g.arc(8, -15, 7, 0, 7); g.fill();                            // Kopf
    g.beginPath(); g.moveTo(3, -19); g.lineTo(4, -26); g.lineTo(8, -21); g.moveTo(9, -21); g.lineTo(13, -26); g.lineTo(14, -19); g.fill();
    g.fillStyle = '#05070a'; g.beginPath(); g.arc(6, -15, 2.6, 0, 7); g.arc(12, -15, 2.6, 0, 7); g.fill();  // grosse Augen
    g.fillStyle = '#fff'; g.fillRect(6.5, -16.5, 1, 1); g.fillRect(12.5, -16.5, 1, 1);
  } else if (ch.id === 'geist') {
    const bob = Math.sin(t * 3) * 2;
    g.globalAlpha = 0.85; g.fillStyle = ch.color;
    g.beginPath(); g.moveTo(-9, -4 + bob); g.lineTo(-9, -20 + bob); g.quadraticCurveTo(-9, -33 + bob, 0, -33 + bob);
    g.quadraticCurveTo(9, -33 + bob, 9, -20 + bob); g.lineTo(9, -4 + bob);
    for (let i = 0; i < 4; i++) g.quadraticCurveTo(9 - i * 4.5 - 2.25, (i % 2 ? -8 : 0) + bob + Math.sin(t * 6 + i) * 1.5, 9 - (i + 1) * 4.5, -4 + bob);
    g.fill(); g.globalAlpha = 1;
    g.fillStyle = '#0a0d14'; g.beginPath(); g.ellipse(1, -24 + bob, 1.8, 3, 0, 0, 7); g.ellipse(6, -24 + bob, 1.8, 3, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(3.5, -17 + bob, 2, air ? 3 : 1.5, 0, 0, 7); g.fill();
  } else {
    const wide = ch.id === 'waechter' ? 1.25 : 1, leg = air ? 3 : run * 4;
    g.fillStyle = '#14161b'; g.fillRect(-6 + leg * 0.6, -9, 4, 9); g.fillRect(2 - leg * 0.6, -9, 4, 9);   // Beine
    g.fillStyle = ch.color; rr(g, -8 * wide, -22, 16 * wide, 15, 4); g.fill();                              // Körper
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(-2 + (air ? 2 : -run * 3), -19, 4, 9);                      // Arm
    const skin = ch.id === 'maske' ? '#0c0d10' : '#d8b89c';
    if (ch.id === 'orla') { g.fillStyle = '#7b241c'; g.beginPath(); g.arc(-1, -27, 7.5, 0, 7); g.fill(); }  // Haare
    g.fillStyle = skin; g.beginPath(); g.arc(1, -27, 6.5, 0, 7); g.fill();                                  // Kopf
    if (ch.id === 'orla') {
      g.strokeStyle = '#222'; g.lineWidth = 1.5; g.beginPath(); g.arc(1, -27, 7.2, Math.PI * 1.1, Math.PI * 1.9); g.stroke();   // Kopfhörer
      g.beginPath(); g.moveTo(-5, -31); g.lineTo(-7, -40); g.stroke(); g.fillStyle = '#222'; g.fillRect(-7, -29, 3, 5);
      g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(6, -31, 2, 0, 7); g.fill();                              // Stirnlampe
    } else if (ch.id === 'locken') {
      g.fillStyle = '#5b3a1e';
      for (let i = 0; i < 7; i++) { const a = Math.PI * (1.05 + i * 0.15); g.beginPath(); g.arc(1 + Math.cos(a) * 7, -28 + Math.sin(a) * 7, 4, 0, 7); g.fill(); }
      g.fillStyle = '#3a0d0d'; g.beginPath(); g.ellipse(5, -24, 1.5, air ? 2.5 : 1, 0, 0, 7); g.fill();     // Mund
    } else if (ch.id === 'waechter') {
      g.fillStyle = '#39441c'; g.beginPath(); g.arc(1, -28, 7.5, Math.PI, 0); g.fill(); g.fillRect(-6.5, -29, 15, 2.5);  // Helm
      g.fillStyle = '#ffb347'; g.fillRect(2, -27, 6, 1.6);                                                    // Visier
    } else if (ch.id === 'maske') {
      g.strokeStyle = '#e8e8e8'; g.lineWidth = 1.2; g.beginPath(); g.arc(2, -28, 1.8, 0, 7); g.stroke(); g.beginPath(); g.arc(6.5, -28, 1.8, 0, 7); g.stroke();
      g.fillStyle = '#c0392b'; g.beginPath(); g.ellipse(5, -23.5, 2.2, 1.3, 0, 0, 7); g.fill();
    }
    if (ch.id !== 'maske' && ch.id !== 'waechter') { g.fillStyle = '#fff'; g.fillRect(3, -29, 3.5, 3); g.fillStyle = '#111'; g.fillRect(5, -28.5, 1.6, 2); }  // Auge
  }
  g.restore();
};
