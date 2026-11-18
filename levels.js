// =====================================================
//  LEVELS
//
//  Ein Level besteht aus aneinandergereihten "Stücken" (CHUNKS).
//  Jedes Stück ist 12 Felder hoch (1 Feld = 32 Pixel):
//    Zeile 0 = Decke, Zeilen 1–9 = Luft, Zeilen 10–11 = Boden.
//
//  Zeichen:
//    #  Wand/Boden          =  Gitter (von unten durchspringbar)
//    ^  Stacheln            ~  Säure
//    S  Dampfdüse (im Boden, bläst regelmässig nach oben)
//    t  Tentakel-Loch (im Boden)      Z  Laser (in der Decke)
//    M  schwebende Plattform (fährt hin und her)
//    x  bröckelnde Platte
//    c  Krabbler   d  Drohne          (draufspringen = besiegt)
//    C  Checkpoint (nach dem Tod hier weitermachen)
//    j  Springer (springt dich an)   u  Lauerer (hängt an der Decke, fällt herunter)
//    b  Leiche     w  Blutschrift   (Schreckmomente kommen zufällig)
//    o  Datenchip  h  Herz   K  Med-Station (füllt alle Herzen)   E  Ausgang
//    l  Lampe      P  Start  B  Johanal
//
//  mk(Breite, {Zeile: 'Inhalt'}, [Bodenzeile 10, Bodenzeile 11], Decke)
//  Faustregel, damit es schaffbar bleibt: Lücken höchstens 3 Felder,
//  Stufen höchstens 2 Felder hoch.
// =====================================================
(() => {
  const mk = (w, rows, floor, ceil) => {
    const out = [];
    for (let r = 0; r < 12; r++) {
      let s = r === 0 ? (ceil || '') : r >= 10 ? ((floor && floor[r - 10]) || '') : ((rows && rows[r]) || '');
      const fill = r === 0 || r >= 10 ? '#' : ' ';
      out.push((s + fill.repeat(w)).slice(0, w));
    }
    return out;
  };
  const full = '#'.repeat(40);

  window.CHUNKS = {
    start:      mk(9,  { 2: '    l', 9: '  P' }),
    gang:       mk(10, { 2: '    l', 8: '  o o o' }),
    kisten:     mk(13, { 7: '       o', 8: '       #  o', 9: '   #  ##  #' }),
    grube:      mk(9,  { 7: '   ooo' }, ['###   ###', '###   ###']),
    grubeBreit: mk(12, { 7: '     oo', 9: '     ==' }, ['###      ###', '###      ###']),
    saeure:     mk(10, { 6: '   ooo' }, ['###~~~####', full]),
    saeureBreit:mk(13, { 6: '   oo  oo', 8: '   ==  ==' }, ['##~~~~~~~~###', full]),
    stacheln:   mk(9,  { 7: '   oo', 9: '   ^^' }),
    stachelKisten: mk(12, { 6: '   ooo', 9: '  #^^^#' }),
    krabbler:   mk(13, { 2: '      l', 9: ' #    c    #' }),
    krabbler2:  mk(14, { 2: '      l', 9: '   c     c' }),
    dampf:      mk(11, { 2: '     l' }, ['###S#S#S###', full]),
    laser:      mk(12, { 8: '     o' }, null, '###Z###Z####'),
    schwebe:    mk(14, { 8: '      o' }, ['###   M    ###', '###        ###']),
    broeckel:   mk(12, { 7: '    ooo' }, ['###xxxxxx###', '###      ###']),
    drohne:     mk(12, { 2: '  l', 6: '     d' }),
    drohneGrube:mk(11, { 5: '     d' }, ['####   ####', '####   ####']),
    tentakel:   mk(10, { 2: '    l' }, ['###t##t###', full]),
    tunnel:     mk(12, { 1: full, 2: full, 3: full, 4: full, 5: full, 6: full, 9: '     c' }),
    plateau:    mk(14, { 6: '      oo', 8: '    ######', 9: '  ########' }),
    hochweg:    mk(14, { 4: '      oo', 6: '      ==', 8: '   ==    ==', 9: '   ^^^^^^^^' }),
    checkpoint: mk(10, { 2: '    l', 9: '  C    K' }),   // Checkpoint + Med-Station
    // --- dichtere Stücke mit neuen Gegnern und Horror ---
    leichenhalle: mk(15, { 1: '     u     u', 4: '   w', 9: '  b    c     b' }),
    lauerGang:  mk(14, { 1: '  u    u    u', 8: '      o', 9: '  c         c' }),
    springerGrube: mk(13, { 7: '     oo', 9: '  j        j' }, ['#####  ######', '#####  ######']),
    dampfKrabbler: mk(14, { 9: '    c     c' }, ['##S####S####S#', full]),
    laserDrohne: mk(14, { 5: '     d', 8: '        o' }, null, '####Z#####Z###'),
    saeureSpringer: mk(15, { 6: '   oo   oo', 8: '   ==   ==', 9: '            j' }, ['##~~~~~~~~~~###', full]),
    tentakelGrube: mk(14, { 1: '      u', 9: '' }, ['##t#t####t#t##', full]),
    turm:       mk(15, { 3: '         oo', 4: '         ==', 6: '     ==     d', 8: '  ==' }, ['##^^^^^^^^^####', full]),
    stachelGang: mk(14, { 7: '    o    o', 9: '  c ^^ c ^^  j' }),
    schatten:   mk(16, { 3: '       w', 9: '  b            b' }),
    gruft:      mk(15, { 1: '   u       u', 5: '         w', 9: '   j   b   c' }, ['######   ######', '######   ######']),
    herz:       mk(7,  { 7: '   h', 8: '   =' }),
    ziel:       mk(9,  { 2: '     l', 9: '     E' }),
    bossarena:  mk(26, { 2: '    l        l        l', 4: '           w', 7: '     ===          ===', 9: '  bP                  B b' })
  };

  //  dark  = wie dunkel es ist (0 = hell, 1 = stockfinster)
  //  theme = Farben (siehe THEMES in game.js)
  window.LEVELS = [
    { name: 'Frachtraum', sub: 'Deck 3', theme: 'cargo', dark: 0.7,
      text: 'Das Licht ist ausgefallen. Irgendwo über dir schleift etwas über den Boden.',
      chunks: ['start', 'gang', 'kisten', 'krabbler', 'grube', 'stacheln', 'leichenhalle', 'krabbler2', 'springerGrube', 'checkpoint',
               'kisten', 'grubeBreit', 'lauerGang', 'stachelGang', 'herz', 'saeure', 'checkpoint', 'schatten', 'krabbler', 'plateau', 'gruft', 'ziel'] },
    { name: 'Wartungsschächte', sub: 'Deck 2', theme: 'maint', dark: 0.74,
      text: 'Die Leitungen zischen. Etwas atmet hinter dir.', stalker: true,
      chunks: ['start', 'gang', 'dampf', 'lauerGang', 'tunnel', 'grube', 'schwebe', 'dampfKrabbler', 'checkpoint', 'stachelKisten', 'drohne',
               'schatten', 'broeckel', 'springerGrube', 'herz', 'checkpoint', 'hochweg', 'turm', 'gruft', 'dampfKrabbler', 'ziel'] },
    { name: 'Reaktor', sub: 'Deck 2 – Kern', theme: 'reactor', dark: 0.72,
      text: 'Der Reaktor läuft noch. Niemand hat ihn eingeschaltet.', stalker: true,
      chunks: ['start', 'laser', 'saeure', 'laserDrohne', 'schwebe', 'drohne', 'checkpoint', 'saeureSpringer', 'leichenhalle', 'laser', 'broeckel',
               'drohneGrube', 'herz', 'laserDrohne', 'turm', 'schatten', 'plateau', 'checkpoint', 'schwebe', 'stachelGang', 'lauerGang', 'gruft', 'ziel'] },
    { name: 'Die Wucherung', sub: 'Deck 1 – Quartiere', theme: 'growth', dark: 0.8,
      text: 'Die Wände atmen. Er weiss, dass du kommst.', stalker: true,
      chunks: ['start', 'tentakel', 'krabbler2', 'schatten', 'hochweg', 'tentakelGrube', 'lauerGang', 'checkpoint', 'drohneGrube', 'broeckel', 'tunnel',
               'leichenhalle', 'tentakel', 'saeureSpringer', 'herz', 'checkpoint', 'laserDrohne', 'schwebe', 'tentakelGrube', 'springerGrube',
               'stachelGang', 'checkpoint', 'dampfKrabbler', 'gruft', 'schatten', 'ziel'] },
    { name: 'Die Brücke', sub: 'Deck 1 – Johanal', theme: 'bridge', dark: 0.62, boss: true,
      text: '«Du bist spät dran.»',
      chunks: ['bossarena'] }
  ];
})();
