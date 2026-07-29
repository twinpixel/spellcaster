'use strict';

/* =========================================================================
 * Spellcaster — avversari controllati dal computer.
 *
 * Quattro fasce di abilità, con i maghi raggruppati per «quanto sono forti»
 * nelle rispettive storie (vedi docs/WIZARDS.md per le fonti).
 *
 * Il cervello è uno solo: ricostruisce le sequenze di gesti di entrambi i
 * duellanti dallo storico, valuta tutte le 64 combinazioni di mani possibili
 * e sceglie la migliore. Le fasce basse lo usano peggio, di proposito.
 * ========================================================================= */

const AI_TIERS = [
  {
    level: 1,
    key: 'apprendista',
    label: 'Apprendista',
    blurb: 'Gesti confusi, incantesimi lasciati a metà.',
    wizards: [
      { name: 'Caspar', note: 'Uno dei Re Magi: astronomo, non incantatore' },
      { name: 'Melchior', note: 'Legge le stelle, non le piega' },
      { name: 'Balthazar', note: 'Porta doni, non maledizioni' },
      { name: 'Alatar', note: 'Stregone Blu: sparito a est senza gloria' },
      { name: 'Pallando', note: 'L’altro Blu: missione fallita' },
      { name: 'Radagast', note: 'Il più debole degli Istari, parla con le bestie' },
    ],
  },
  {
    level: 2,
    key: 'adepto',
    label: 'Adepto',
    blurb: 'Completa gli incantesimi semplici e si difende.',
    wizards: [
      { name: 'Rasputin', note: 'Fama di mistico più che poteri provati' },
      { name: 'Glinda', note: 'Strega Buona del Sud: potente ma gentile' },
      { name: 'Oberon', note: 'Re delle fate: magia di natura, non di studio' },
      { name: 'Titania', note: 'Regina delle fate, incantesimi di illusione' },
      { name: 'Viviana', note: 'Dama del Lago, allieva di Merlino' },
      { name: 'Nimue', note: 'L’altra Dama del Lago: astuta più che potente' },
    ],
  },
  {
    level: 3,
    key: 'maestro',
    label: 'Maestro',
    blurb: 'Legge i tuoi gesti e para le minacce.',
    wizards: [
      { name: 'Morgana', note: 'Grande Regina e Maga, signora di Avalon' },
      { name: 'Medea', note: 'Nipote di Circe, maestra di veleni' },
      { name: 'Prospero', note: 'Comanda tempeste e spiriti — poi spezza la bacchetta' },
      { name: 'Saruman', note: 'Il più potente degli Istari finché Gandalf non tornò' },
      { name: 'Mordenkainen', note: 'Il più forte mago mortale del Piano Materiale' },
      { name: 'Zatanna', note: 'Magia al contrario, livello Justice League' },
      { name: 'Tasha', note: 'Iggwilv, arcimaga leggendaria di D&D' },
      { name: 'Fistandantilus', note: 'Arcimago oscuro — poi Raistlin lo assorbì' },
    ],
  },
  {
    level: 4,
    key: 'arcimago',
    label: 'Arcimago',
    blurb: 'Gioco quasi perfetto. Non sbaglia un gesto.',
    wizards: [
      { name: 'Merlino', note: 'Il mago per definizione' },
      { name: 'Gandalf', note: 'Un Maia: non un mortale che lancia incantesimi' },
      { name: 'Circe', note: 'La più potente delle maghe, dea della magia' },
      { name: 'Elminster', note: 'Prescelto di Mystra, oltre Mordenkainen' },
      { name: 'Raistlin', note: 'Salì fino a minacciare gli dèi' },
    ],
  },
];

const AI_WIZARDS = AI_TIERS.flatMap((t) =>
  t.wizards.map((w) => ({ ...w, level: t.level, tier: t.label, tierKey: t.key })));

function aiWizardByName(name) {
  return AI_WIZARDS.find((w) => w.name === name) || null;
}

function aiTierByLevel(level) {
  return AI_TIERS.find((t) => t.level === level) || AI_TIERS[0];
}

function aiRandomWizard(level) {
  const pool = level ? AI_WIZARDS.filter((w) => w.level === level) : AI_WIZARDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* --- catalogo incantesimi ------------------------------------------------ */

const AI_CODES = ['F', 'P', 'S', 'W', 'D', 'C', 'stab', ' '];

/** «C-(w» → [{t:'clap'},{t:'both',g:'W'}]; «W-P-P / W-W-S» → due varianti. */
function parseSpellGestures(str) {
  return String(str).split('/').map((alt) => alt.trim().split('-').map((tok) => {
    const t = tok.trim();
    if (t === 'C') return { t: 'clap' };
    if (t.startsWith('(')) return { t: 'both', g: t.slice(1).toUpperCase() };
    return { t: 'single', g: t.toUpperCase() };
  })).filter((p) => p.length && p.every((s) => s.t === 'clap' || /^[FPSWD]$/.test(s.g)));
}

/** Trasforma la risposta di /spells nel formato usato dal cervello. */
function buildSpellBook(list) {
  return (list || []).map((s) => ({
    id: s.id,
    name: s.name,
    section: s.section,
    patterns: parseSpellGestures(s.gestures),
  })).filter((s) => s.patterns.length);
}

/* --- lettura delle mani -------------------------------------------------- */

function aiStepMatches(sym, step) {
  if (!sym) return false;
  if (step.t === 'single') return (sym.t === 'single' || sym.t === 'both') && sym.g === step.g;
  if (step.t === 'clap') return sym.t === 'clap';
  if (step.t === 'both') return sym.t === 'both' && sym.g === step.g;
  return false;
}

function aiMatchesSuffix(symbols, pattern) {
  if (symbols.length < pattern.length) return false;
  const off = symbols.length - pattern.length;
  for (let i = 0; i < pattern.length; i++) {
    if (!aiStepMatches(symbols[off + i], pattern[i])) return false;
  }
  return true;
}

/** Quanti gesti mancano al completamento, dato il buffer attuale. */
function aiRemaining(buffer, pattern) {
  const max = Math.min(buffer.length, pattern.length);
  for (let k = max; k >= 1; k--) {
    let ok = true;
    for (let i = 0; i < k; i++) {
      if (!aiStepMatches(buffer[buffer.length - k + i], pattern[i])) { ok = false; break; }
    }
    if (ok) return pattern.length - k;
  }
  return pattern.length;
}

/** Simbolo prodotto da una mano, viste entrambe (clap e «(x» sono a due mani). */
function aiSymbolFor(code, otherCode) {
  if (code === 'stab' || code === ' ') return null;
  if (code === 'C') return otherCode === 'C' ? { t: 'clap' } : null;
  return otherCode === code ? { t: 'both', g: code } : { t: 'single', g: code };
}

/**
 * Ricostruisce le sequenze in corso di un giocatore dallo storico.
 * Il conteggio `leftGestures`/`rightGestures` dello snapshot dice quanto è
 * lungo il buffer vero, così anche un anti-spell viene rispettato.
 */
function aiHandBuffers(game, playerId) {
  const hist = [...(game?.history || [])].reverse(); // dal più vecchio
  const buf = { left: [], right: [] };
  let blind = false;
  for (const h of hist) {
    const row = h?.[playerId];
    if (!row) continue;
    if (row.left === '?' || row.right === '?') { blind = true; continue; }
    const twoHanded = row.left === row.right;
    for (const hand of ['left', 'right']) {
      const lab = row[hand];
      const sym = lab === '—' || lab === '†'
        ? null
        : aiSymbolFor(lab === 'C' ? 'C' : lab, twoHanded ? lab : null);
      if (sym) buf[hand].push(sym);
      else buf[hand].length = 0;
    }
  }
  const p = game?.players?.[playerId] || {};
  const cut = (arr, n) => (Number.isInteger(n) && n >= 0 ? arr.slice(arr.length - n) : arr);
  return {
    left: cut(buf.left, p.leftGestures),
    right: cut(buf.right, p.rightGestures),
    blind,
  };
}

/* --- valutazione --------------------------------------------------------- */

/** Quanto vale completare ciascun incantesimo, a parità di contesto. */
const AI_SPELL_VALUE = {
  fingerOfDeath: 120,
  lightningBoltLong: 58, lightningBoltShort: 58,
  fireball: 52, causeHeavyWounds: 34, causeLightWounds: 23, missile: 13,
  fireStorm: 30, iceStorm: 30,
  summonGiant: 46, summonTroll: 35, summonOgre: 25, summonGoblin: 15, summonElemental: 26,
  shield: 2, counterSpell: 28, dispelMagic: 26, magicMirror: 22, removeEnchantment: 16,
  cureHeavyWounds: 18, cureLightWounds: 9, raiseDead: 22,
  amnesia: 20, confusion: 18, fear: 21, paralysis: 24, charmPerson: 27, charmMonster: 19,
  disease: 38, poison: 38, blindness: 24, invisibility: 23, haste: 30, timeStop: 30,
  antiSpell: 27, protectionFromEvil: 22, resistHeat: 11, resistCold: 11,
  delayedEffect: 11, permanency: 12,
};

/** Incantesimi che uno shield ferma (più mostri e pugnalate). */
const AI_SHIELDABLE = new Set(['missile']);
/** Danno stimato in arrivo, per pesare le minacce. */
const AI_THREAT_DAMAGE = {
  fingerOfDeath: 99, lightningBoltLong: 5, lightningBoltShort: 5, fireball: 5,
  causeHeavyWounds: 3, causeLightWounds: 2, missile: 1,
  fireStorm: 5, iceStorm: 5,
  summonGiant: 4, summonTroll: 3, summonOgre: 2, summonGoblin: 1, summonElemental: 3,
};

/** Incantesimi che una fascia bassa sa anche solo concepire. */
const AI_POOL_BY_LEVEL = {
  1: ['shield', 'missile', 'causeLightWounds', 'summonGoblin', 'cureLightWounds'],
  2: ['shield', 'missile', 'causeLightWounds', 'causeHeavyWounds', 'summonGoblin',
    'summonOgre', 'cureLightWounds', 'cureHeavyWounds', 'fear', 'amnesia', 'protectionFromEvil'],
};

function aiSpellValue(id, ctx) {
  let v = AI_SPELL_VALUE[id] ?? 8;

  // Curarsi conta solo se si è feriti
  if (id === 'cureLightWounds' || id === 'cureHeavyWounds' || id === 'raiseDead') {
    v *= Math.min(2.2, 0.25 + ctx.myDamage / 5);
  }
  // Le tempeste colpiscono anche chi le lancia
  if (id === 'fireStorm') v *= ctx.myResistHeat ? 2 : (ctx.oppDamage > ctx.myDamage + 4 ? 0.9 : 0.25);
  if (id === 'iceStorm') v *= ctx.myResistCold ? 2 : (ctx.oppDamage > ctx.myDamage + 4 ? 0.9 : 0.25);
  // L'elementale attacca chiunque, controllore compreso
  if (id === 'summonElemental') v *= (ctx.myResistHeat || ctx.myResistCold) ? 1.8 : 0.6;
  // Lo scudo vale in proporzione a ciò che sta arrivando
  if (id === 'shield') v += ctx.physicalThreat * 14;
  if (id === 'protectionFromEvil') v += ctx.physicalThreat * 10;
  // Il counter-spell vale se c'è davvero qualcosa da fermare
  if (id === 'counterSpell') v += Math.min(40, ctx.spellThreat * 1.6);
  // Il lampo corto si usa una volta sola: se è già speso, non vale niente
  if (id === 'lightningBoltShort' && ctx.usedShortLightning) v = 0;
  // Colpo di grazia
  if ((AI_THREAT_DAMAGE[id] || 0) >= ctx.oppHp) v += 90;
  return v;
}

/** Quanto si sconta un incantesimo per ogni gesto che manca ancora. */
const AI_PROGRESS_DECAY = 0.74;

/** Penalità per aver azzerato una mano che stava costruendo qualcosa. */
function aiWasteCost(before, after) {
  if (after.length > before.length) return 0; // sta proseguendo
  return before.length * 3;
}

/** Valore residuo di una mano: quanto promette la sequenza in corso. */
function aiProgressValue(buffer, book, ctx, pool) {
  let best = 0;
  for (const spell of book) {
    if (pool && !pool.has(spell.id)) continue;
    const base = aiSpellValue(spell.id, ctx);
    if (base <= 0) continue;
    for (const pattern of spell.patterns) {
      // aiRemaining vale già «quanti gesti mancano»: 0 se completo,
      // pattern.length se la sequenza va ricominciata da capo.
      const score = base * Math.pow(AI_PROGRESS_DECAY, aiRemaining(buffer, pattern));
      if (score > best) best = score;
    }
  }
  return best;
}

/** Incantesimi che l'avversario può completare al prossimo gesto. */
function aiIncomingThreats(oppBuffers, book) {
  const found = new Set();
  for (const hand of ['left', 'right']) {
    const buf = oppBuffers[hand];
    for (const code of AI_CODES) {
      for (const other of AI_CODES) {
        const sym = aiSymbolFor(code, other);
        const next = sym ? [...buf, sym] : [];
        if (!next.length) continue;
        for (const spell of book) {
          for (const pattern of spell.patterns) {
            if (aiMatchesSuffix(next, pattern)) found.add(spell.id);
          }
        }
      }
    }
  }
  return [...found];
}

/* --- scelta del turno ---------------------------------------------------- */

/**
 * Sceglie le mani per il turno.
 * @param {object} game snapshot della partita
 * @param {{level:number, playerId:string, book:Array}} opts
 * @returns {object} payload per POST /games/:id/turn
 */
function chooseAiTurn(game, opts = {}) {
  const level = Math.min(4, Math.max(1, opts.level || 1));
  const me = opts.playerId || 'b';
  const foe = me === 'a' ? 'b' : 'a';
  const book = opts.book || [];

  const mine = game?.players?.[me] || {};
  const theirs = game?.players?.[foe] || {};
  const myBuf = aiHandBuffers(game, me);
  const oppBuf = aiHandBuffers(game, foe);

  const myMonsters = (game?.monsters || []).filter((m) => m.alive && m.controllerId === me);
  const foeMonsters = (game?.monsters || []).filter((m) => m.alive && m.controllerId !== me);

  // Livello 1: sa a malapena cosa sta facendo
  if (level === 1 && Math.random() < 0.45) {
    return aiSloppyTurn(foe, myMonsters);
  }

  const threats = level >= 3 ? aiIncomingThreats(oppBuf, book) : [];
  const physicalThreat =
    (level >= 3 ? foeMonsters.length : 0) +
    threats.filter((t) => AI_SHIELDABLE.has(t)).length;
  const spellThreat = threats.reduce((n, t) => Math.max(n, AI_THREAT_DAMAGE[t] || 0), 0);

  const ctx = {
    myDamage: mine.damage || 0,
    oppDamage: theirs.damage || 0,
    oppHp: Math.max(1, 14 - (theirs.damage || 0)),
    myResistHeat: !!mine.status?.resistHeat,
    myResistCold: !!mine.status?.resistCold,
    usedShortLightning: !!mine.usedShortLightning,
    physicalThreat,
    spellThreat,
  };

  const poolIds = AI_POOL_BY_LEVEL[level];
  const pool = poolIds ? new Set(poolIds) : null;

  let best = null;
  for (const left of AI_CODES) {
    for (const right of AI_CODES) {
      if (left === 'P' && right === 'P') continue;   // resa involontaria: mai
      if (left === 'stab' && right === 'stab') continue;
      const option = aiScoreAction(left, right, { myBuf, book, ctx, pool });
      if (!best || option.score > best.score) best = option;
    }
  }
  if (!best) return aiSloppyTurn(foe, myMonsters);

  // Rumore: le fasce basse sbagliano di proposito
  const noise = { 1: 0.35, 2: 0.25, 3: 0.1, 4: 0 }[level];
  if (noise && Math.random() < noise) {
    return aiSloppyTurn(foe, myMonsters);
  }

  const payload = { left: best.left, right: best.right };
  if (best.leftSpell) payload.leftSpell = best.leftSpell;
  if (best.rightSpell) payload.rightSpell = best.rightSpell;

  // Bersagli: le creature nemiche prima del mago solo se c'è da ripulire
  if (myMonsters.length) {
    const target = foeMonsters.length && level >= 3 ? foeMonsters[0].id : foe;
    payload.monsterOrders = myMonsters.map((m) => ({ monsterId: m.id, targetId: target }));
  }
  if (best.left === 'stab' || best.right === 'stab') {
    payload.stabTarget = foeMonsters.length && level >= 2 ? foeMonsters[0].id : foe;
  }
  if (best.left === 'C' && best.right === 'C') {
    payload.elementalType = ctx.myResistCold && !ctx.myResistHeat ? 'ice' : 'fire';
  }
  return payload;
}

/** Punteggio di una singola combinazione di mani. */
function aiScoreAction(left, right, { myBuf, book, ctx, pool }) {
  const symL = aiSymbolFor(left, right);
  const symR = aiSymbolFor(right, left);
  const nextL = symL ? [...myBuf.left, symL] : [];
  const nextR = symR ? [...myBuf.right, symR] : [];

  const done = (buffer) => {
    let bestSpell = null;
    let bestVal = 0;
    for (const spell of book) {
      if (pool && !pool.has(spell.id)) continue;
      for (const pattern of spell.patterns) {
        if (!aiMatchesSuffix(buffer, pattern)) continue;
        const v = aiSpellValue(spell.id, ctx);
        if (v > bestVal) { bestVal = v; bestSpell = spell.id; }
      }
    }
    return { spell: bestSpell, value: bestVal };
  };

  const hitL = done(nextL);
  const hitR = done(nextR);

  // Un solo incantesimo per gesto e per mano: i due contributi si sommano
  let score = hitL.value + hitR.value;
  score += aiProgressValue(nextL, book, ctx, pool) * 0.9;
  score += aiProgressValue(nextR, book, ctx, pool) * 0.9;

  // La pugnalata fa 1 danno ma solo se non c'è uno scudo, e azzera la mano:
  // vale la pena solo se quella mano non stava costruendo nulla.
  if (left === 'stab' || right === 'stab') score += 2;
  // Non fare nulla è spreco puro
  if (left === ' ') score -= 4;
  if (right === ' ') score -= 4;
  // Un clap con una mano sola equivale a nulla e spezza la sequenza
  if ((left === 'C') !== (right === 'C')) score -= 6;
  // Buttare via una sequenza già avviata costa
  score -= aiWasteCost(myBuf.left, nextL) + aiWasteCost(myBuf.right, nextR);
  // Due mani su due incantesimi diversi valgono più che due volte lo stesso
  if (hitL.spell && hitL.spell === hitR.spell) score -= hitR.value * 0.6;

  return { left, right, score, leftSpell: hitL.spell, rightSpell: hitR.spell };
}

/** Turno raffazzonato: serve alle fasce basse per sbagliare in modo credibile. */
function aiSloppyTurn(foe, myMonsters) {
  const simple = ['F', 'P', 'S', 'W', 'D', ' ', ' '];
  const pick = () => simple[Math.floor(Math.random() * simple.length)];
  let left = pick();
  let right = pick();
  if (left === 'P' && right === 'P') right = ' ';
  const payload = { left, right };
  if (myMonsters.length) {
    payload.monsterOrders = myMonsters.map((m) => ({ monsterId: m.id, targetId: foe }));
  }
  return payload;
}
