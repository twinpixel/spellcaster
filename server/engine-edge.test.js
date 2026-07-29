/**
 * Casi limite del motore: bersagli mostro, cancellazioni combinate, time stop,
 * errori del room service e helper HTTP.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SPELL_PATTERNS,
  allSpellIds,
  spellListJson,
  parseHand,
  parseTurn,
  isSurrender,
  isClap,
  bothHands,
  hasDoubleStab,
  normalizeDoubleStab,
  matchHand,
  newGame,
  playTurn,
  createRoom,
  joinRoom,
  submitTurnToRoom,
  snapshot,
  createGameService,
  isSameOrigin,
  jsonResponse,
  textResponse,
  WIZARD_MAX_DAMAGE,
} from './shared.js';
import {
  emptyStatus,
  statusJson,
  clearEnchantments,
  applyPreTurnConstraints,
  paralyzedPosition,
  handLabelForHistory,
  randomConfusionGesture,
  tickEndOfTurn,
} from './status.js';

function freshState() {
  const st = newGame({ nameA: 'Alpha', nameB: 'Beta' });
  st.wizardA.status.antiSpellNextTurn = false;
  st.wizardB.status.antiSpellNextTurn = false;
  return st;
}

function unlock(st) {
  st.wizardA.status.antiSpellNextTurn = false;
  st.wizardB.status.antiSpellNextTurn = false;
  return st;
}

/** Precarica il pattern tranne l’ultimo gesto sulla mano sinistra. */
function preload(wizard, pattern) {
  wizard.leftHand.symbols = [];
  wizard.rightHand.symbols = [];
  for (const step of pattern.slice(0, -1)) {
    if (step.t === 'clap') {
      wizard.leftHand.symbols.push({ t: 'clap' });
      wizard.rightHand.symbols.push({ t: 'clap' });
    } else if (step.t === 'both') {
      wizard.leftHand.symbols.push({ t: 'both', g: step.g });
      wizard.rightHand.symbols.push({ t: 'both', g: step.g });
    } else {
      wizard.leftHand.symbols.push({ t: 'single', g: step.g });
    }
  }
}

function lastAction(pattern) {
  const step = pattern[pattern.length - 1];
  if (step.t === 'clap') return parseTurn('C', 'C');
  if (step.t === 'both') return parseTurn(step.g, step.g);
  return parseTurn(step.g, ' ');
}

/** Lancia `spell` da A in un solo turno, con bersaglio e scelte date. */
function castA(st, spell, { targetId, choices = {}, foe = parseTurn(' ', ' ') } = {}) {
  unlock(st);
  const pattern = SPELL_PATTERNS[spell][0];
  preload(st.wizardA, pattern);
  return playTurn(st, lastAction(pattern), foe, {
    leftChoiceA: spell,
    ...(targetId ? { spellTargetA: { left: targetId, right: targetId } } : {}),
    ...choices,
  });
}

function summonGoblin(st) {
  castA(st, 'summonGoblin');
  return st.monsters[st.monsters.length - 1];
}

afterEach(() => {
  vi.restoreAllMocks();
});

// --- parsing e catalogo ----------------------------------------------------

describe('parsing dei gesti', () => {
  it('accetta tutte le forme previste', () => {
    expect(parseHand('f')).toEqual({ kind: 'gesture', gesture: 'F' });
    expect(parseHand(' ')).toEqual({ kind: 'nothing' });
    expect(parseHand('-')).toEqual({ kind: 'nothing' });
    expect(parseHand('nothing')).toEqual({ kind: 'nothing' });
    expect(parseHand(null)).toEqual({ kind: 'nothing' });
    expect(parseHand('STAB')).toEqual({ kind: 'stab' });
    expect(parseHand('clap')).toEqual({ kind: 'clap' });
    expect(parseHand('c')).toEqual({ kind: 'clap' });
  });

  it('rifiuta i gesti sconosciuti', () => {
    expect(() => parseHand('X')).toThrow(/invalid_gesture/);
    expect(() => parseTurn('P', 'Z')).toThrow(/invalid_gesture/);
  });

  it('riconosce resa, clap, gesti a due mani e doppia pugnalata', () => {
    expect(isSurrender(parseTurn('P', 'P'))).toBe(true);
    expect(isSurrender(parseTurn('P', ' '))).toBe(false);
    expect(isClap(parseTurn('C', 'C'))).toBe(true);
    expect(isClap(parseTurn('C', ' '))).toBe(false);
    expect(bothHands(parseTurn('W', 'W'), 'W')).toBe(true);
    expect(bothHands(parseTurn('W', 'S'), 'W')).toBe(false);
    expect(hasDoubleStab(parseTurn('stab', 'stab'))).toBe(true);

    const a = parseTurn('stab', 'stab');
    expect(normalizeDoubleStab(a)).toBe(true);
    expect(a.right).toEqual({ kind: 'nothing' });
    expect(normalizeDoubleStab(parseTurn('stab', ' '))).toBe(false);
  });

  it('spellListJson rispecchia il catalogo', () => {
    const list = spellListJson();
    expect(list).toHaveLength(allSpellIds().length);
    expect(list.every((s) => s.id && s.name && s.gestures && s.section)).toBe(true);
  });

  it('un clap con una mano sola azzera la sequenza di quella mano', () => {
    const st = freshState();
    st.wizardA.leftHand.symbols = [{ t: 'single', g: 'S' }];
    playTurn(st, parseTurn('C', ' '), parseTurn(' ', ' '));
    expect(st.wizardA.leftHand.symbols).toHaveLength(0);
  });

  it('matchHand riconosce entrambe le varianti del counter-spell', () => {
    expect(matchHand({ symbols: [
      { t: 'single', g: 'W' }, { t: 'single', g: 'P' }, { t: 'single', g: 'P' },
    ] }, 0).some((m) => m.id === 'counterSpell' && m.patternIndex === 0)).toBe(true);
    expect(matchHand({ symbols: [
      { t: 'single', g: 'W' }, { t: 'single', g: 'W' }, { t: 'single', g: 'S' },
    ] }, 0).some((m) => m.id === 'counterSpell' && m.patternIndex === 1)).toBe(true);
  });
});

// --- incantesimi sui mostri ------------------------------------------------

describe('incantesimi con bersaglio mostro', () => {
  it('finger of death uccide un mostro', () => {
    const st = freshState();
    const m = summonGoblin(st);
    castA(st, 'fingerOfDeath', { targetId: m.id });
    expect(st.monsters.find((x) => x.id === m.id).alive).toBe(false);
  });

  it('raise dead riporta in vita un mostro con PV pieni', () => {
    const st = freshState();
    const m = summonGoblin(st);
    m.alive = false;
    m.hp = 0;
    castA(st, 'raiseDead', { targetId: m.id });
    const after = st.monsters.find((x) => x.id === m.id);
    expect(after.alive).toBe(true);
    expect(after.hp).toBe(after.maxHp);
  });

  it('resist heat distrugge un elementale di fuoco, resist cold uno di ghiaccio', () => {
    const fireSt = freshState();
    castA(fireSt, 'summonElemental', { choices: { elementalTypeA: 'fire' } });
    const fire = fireSt.monsters[0];
    castA(fireSt, 'resistHeat', { targetId: fire.id });
    expect(fireSt.monsters.find((x) => x.id === fire.id).alive).toBe(false);

    const iceSt = freshState();
    castA(iceSt, 'summonElemental', { choices: { elementalTypeA: 'ice' } });
    const ice = iceSt.monsters[0];
    castA(iceSt, 'resistCold', { targetId: ice.id });
    expect(iceSt.monsters.find((x) => x.id === ice.id).alive).toBe(false);
  });

  it('confusion su un mostro lo fa attaccare a caso nello stesso turno', () => {
    // «If the subject of the spell is a monster, it attacks at random that turn»
    const st = freshState();
    const m = summonGoblin(st);
    const dmgA = st.wizardA.damage;
    // random = 0 → primo bersaglio della lista, cioè il mago A (il controllore)
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const res = castA(st, 'confusion', { targetId: m.id });
    expect(res.castsA.some((c) => c.spell === 'confusion')).toBe(true);
    expect(st.wizardA.damage).toBe(dmgA + m.attack);
    expect(st.monsters.find((x) => x.id === m.id).confused).toBe(false);
  });

  it('invisibility e blindness distruggono un mostro dopo il suo attacco', () => {
    for (const spell of ['invisibility', 'blindness']) {
      const st = freshState();
      const m = summonGoblin(st);
      const before = st.wizardB.damage;
      castA(st, spell, { targetId: m.id });
      expect(st.monsters.find((x) => x.id === m.id).alive).toBe(false);
      expect(st.wizardB.damage).toBe(before + 1); // ha comunque attaccato
    }
  });

  it('charm monster non funziona sugli elementali', () => {
    const st = freshState();
    castA(st, 'summonElemental', { choices: { elementalTypeA: 'fire' } });
    const elem = st.monsters[0];
    unlock(st);
    preload(st.wizardB, SPELL_PATTERNS.charmMonster[0]);
    playTurn(st, parseTurn(' ', ' '), parseTurn('D', ' '), {
      leftChoiceB: 'charmMonster',
      spellTargetB: { left: elem.id },
    });
    expect(st.monsters.find((x) => x.id === elem.id).controllerId).toBe('a');
  });

  it('un bersaglio inesistente non rompe la risoluzione', () => {
    const st = freshState();
    expect(() => castA(st, 'missile', { targetId: 'm999' })).not.toThrow();
    expect(st.wizardA.damage).toBe(0);
    expect(st.wizardB.damage).toBe(0);
  });

  it('lo shield para l’attacco di un mostro', () => {
    const st = freshState();
    summonGoblin(st);
    const before = st.wizardB.damage;
    unlock(st);
    preload(st.wizardB, SPELL_PATTERNS.shield[0]);
    const res = playTurn(st, parseTurn(' ', ' '), parseTurn('P', ' '), { leftChoiceB: 'shield' });
    expect(st.wizardB.damage).toBe(before);
    expect(Object.values(res.monsterLog).some((l) => l.text === '🛡')).toBe(true);
  });

  it('un mostro non colpisce un mago invisibile', () => {
    const st = freshState();
    summonGoblin(st);
    st.wizardB.status.invisibilityTurns = 2;
    const before = st.wizardB.damage;
    unlock(st);
    const res = playTurn(st, parseTurn(' ', ' '), parseTurn(' ', ' '));
    expect(st.wizardB.damage).toBe(before);
    expect(Object.values(res.monsterLog).some((l) => l.text === 'invis')).toBe(true);
  });

  it('un elementale non colpisce un mago invisibile', () => {
    const st = freshState();
    castA(st, 'summonElemental', { choices: { elementalTypeA: 'fire' } });
    st.wizardB.status.invisibilityTurns = 2;
    const dmgB = st.wizardB.damage;
    const dmgA = st.wizardA.damage;
    unlock(st);
    playTurn(st, parseTurn(' ', ' '), parseTurn(' ', ' '));
    expect(st.wizardB.damage).toBe(dmgB);
    expect(st.wizardA.damage).toBe(dmgA + 3); // il controllore non è invisibile
  });

  it('un mostro può essere mandato contro un altro mostro', () => {
    const st = freshState();
    const mine = summonGoblin(st);
    unlock(st);
    preload(st.wizardB, SPELL_PATTERNS.summonOgre[0]);
    playTurn(st, parseTurn(' ', ' '), parseTurn('W', ' '), { leftChoiceB: 'summonOgre' });
    const ogre = st.monsters.find((m) => m.type === 'ogre');

    unlock(st);
    const res = playTurn(st, parseTurn(' ', ' '), parseTurn(' ', ' '), {
      monsterOrdersA: [{ monsterId: mine.id, targetId: ogre.id }],
    });
    expect(st.monsters.find((m) => m.id === ogre.id).hp).toBe(1);
    expect(res.monsterLog[mine.id].text).toContain('Ogre');
  });
});

describe('fireball e tempeste sui mostri', () => {
  it('il fireball fa 5 a un mostro e incenerisce un elementale di ghiaccio', () => {
    const st = freshState();
    const goblin = summonGoblin(st);
    goblin.hp = 5;
    goblin.maxHp = 5;
    castA(st, 'fireball', { targetId: goblin.id });
    expect(st.monsters.find((m) => m.id === goblin.id).alive).toBe(false);

    const st2 = freshState();
    castA(st2, 'summonElemental', { choices: { elementalTypeA: 'ice' } });
    const ice = st2.monsters[0];
    castA(st2, 'fireball', { targetId: ice.id });
    expect(st2.monsters.find((m) => m.id === ice.id).alive).toBe(false);
  });

  it('la fire storm brucia il proprio elementale, i mostri e i maghi', () => {
    const st = freshState();
    castA(st, 'summonElemental', { choices: { elementalTypeA: 'fire' } });
    const fire = st.monsters[0];
    unlock(st);
    preload(st.wizardB, SPELL_PATTERNS.summonOgre[0]);
    playTurn(st, parseTurn(' ', ' '), parseTurn('W', ' '), { leftChoiceB: 'summonOgre' });
    const ogre = st.monsters.find((m) => m.type === 'ogre');

    const dmgB = st.wizardB.damage;
    castA(st, 'fireStorm');
    expect(st.monsters.find((m) => m.id === fire.id).alive).toBe(false);
    expect(st.monsters.find((m) => m.id === ogre.id).alive).toBe(false); // 2 PV < 5
    expect(st.wizardB.damage).toBe(dmgB + 5);
  });

  it('chi resiste al calore ignora la fire storm', () => {
    const st = freshState();
    st.wizardB.status.resistHeat = true;
    castA(st, 'fireStorm');
    expect(st.wizardB.damage).toBe(0);
    expect(st.wizardA.damage).toBe(5);
  });

  it('la fire storm ferisce senza uccidere i mostri più robusti', () => {
    const st = freshState();
    const goblin = summonGoblin(st);
    goblin.hp = 9;
    goblin.maxHp = 9;
    castA(st, 'fireStorm');
    expect(st.monsters.find((m) => m.id === goblin.id).hp).toBe(4);
    expect(st.monsters.find((m) => m.id === goblin.id).alive).toBe(true);
  });

  it('un mostro protetto da counter-spell ignora la tempesta', () => {
    // «a fire storm could kill off a monster but not if it was simultaneously
    //  the subject of a counter-spell»
    const st = freshState();
    const goblin = summonGoblin(st);
    unlock(st);
    preload(st.wizardA, SPELL_PATTERNS.fireStorm[0]);
    preload(st.wizardB, SPELL_PATTERNS.counterSpell[0]);
    playTurn(st, parseTurn('C', 'C'), parseTurn('P', ' '), {
      leftChoiceA: 'fireStorm',
      leftChoiceB: 'counterSpell',
      spellTargetB: { left: goblin.id },
    });
    expect(st.monsters.find((m) => m.id === goblin.id).alive).toBe(true);
  });

  it('un elementale colpisce anche i mostri normali', () => {
    const st = freshState();
    unlock(st);
    preload(st.wizardB, SPELL_PATTERNS.summonOgre[0]);
    playTurn(st, parseTurn(' ', ' '), parseTurn('W', ' '), { leftChoiceB: 'summonOgre' });
    const ogre = st.monsters.find((m) => m.type === 'ogre');
    expect(ogre.hp).toBe(2);

    castA(st, 'summonElemental', { choices: { elementalTypeA: 'fire' } });
    expect(st.monsters.find((m) => m.id === ogre.id).alive).toBe(false); // 3 danni su 2 PV
  });

  it('una creatura evocata attacca anche senza ordini espliciti', () => {
    const st = freshState();
    const first = summonGoblin(st);
    const dmgB = st.wizardB.damage;
    // Ordini solo per la creatura già in campo: la nuova usa il default
    unlock(st);
    preload(st.wizardA, SPELL_PATTERNS.summonOgre[0]);
    playTurn(st, parseTurn('W', ' '), parseTurn(' ', ' '), {
      leftChoiceA: 'summonOgre',
      monsterOrdersA: [{ monsterId: first.id, targetId: 'b' }],
    });
    expect(st.wizardB.damage).toBe(dmgB + 1 + 2);
  });

  it('dispel magic segna «dispel» sui mostri che non hanno attaccato', () => {
    const st = freshState();
    castA(st, 'summonElemental', { choices: { elementalTypeA: 'fire' } });
    const elem = st.monsters[0];
    // Entrambi protetti: l’elementale non ha bersagli validi
    st.wizardA.status.protectionFromEvilTurns = 3;
    st.wizardB.status.protectionFromEvilTurns = 3;
    const dmgA = st.wizardA.damage;
    const dmgB = st.wizardB.damage;

    const res = castA(st, 'dispelMagic', { targetId: 'a' });
    expect(st.wizardA.damage).toBe(dmgA);
    expect(st.wizardB.damage).toBe(dmgB);
    expect(st.monsters.find((m) => m.id === elem.id).alive).toBe(false);
    expect(res.monsterLog[elem.id].text).toBe('dispel');
  });

  it('dispel magic distrugge i mostri dopo che hanno attaccato', () => {
    const st = freshState();
    summonGoblin(st);
    const dmgB = st.wizardB.damage;
    const res = castA(st, 'dispelMagic', { targetId: 'a' });
    expect(st.monsters.every((m) => !m.alive)).toBe(true);
    expect(st.wizardB.damage).toBe(dmgB + 1);
    expect(Object.values(res.monsterLog).some((l) => l.text.includes('dispel')
      || l.text.includes('→'))).toBe(true);
  });
});

// --- cancellazioni combinate ----------------------------------------------

describe('cancellazioni', () => {
  it('dispel magic annulla gli altri incantesimi del turno', () => {
    const st = freshState();
    preload(st.wizardA, SPELL_PATTERNS.dispelMagic[0]);
    preload(st.wizardB, SPELL_PATTERNS.missile[0]);
    const res = playTurn(st, parseTurn('W', ' '), parseTurn('D', ' '), {
      leftChoiceA: 'dispelMagic',
      leftChoiceB: 'missile',
    });
    expect(res.castsA.some((c) => c.spell === 'dispelMagic')).toBe(true);
    expect(res.castsB.some((c) => c.spell === 'missile')).toBe(false);
    expect(st.wizardA.damage).toBe(0);
  });

  it('il mirror non riflette se il soggetto ha anche un counter-spell', () => {
    const st = freshState();
    preload(st.wizardA, SPELL_PATTERNS.missile[0]);
    st.wizardB.leftHand.symbols = [{ t: 'clap' }];
    st.wizardB.rightHand.symbols = [
      { t: 'single', g: 'W' }, { t: 'single', g: 'P' },
    ];
    const res = playTurn(st, parseTurn('D', ' '), parseTurn('W', 'P'), {
      leftChoiceA: 'missile',
      leftChoiceB: 'magicMirror',
      rightChoiceB: 'counterSpell',
      spellTargetB: { left: 'b', right: 'b' },
    });
    expect(res.castsB.some((c) => c.spell === 'counterSpell')).toBe(true);
    expect(st.wizardA.damage).toBe(0); // niente riflesso
    expect(st.wizardB.damage).toBe(0); // e niente danno
  });

  it('il counter-spell sul soggetto disattiva il mirror anche per il finger of death', () => {
    // Il FoD ignora il counter-spell, ma «It is countered totally … if the
    // subject is the simultaneous subject of a counter-spell»: niente riflesso.
    const st = freshState();
    preload(st.wizardA, SPELL_PATTERNS.fingerOfDeath[0]);
    st.wizardA.rightHand.symbols = [{ t: 'single', g: 'W' }, { t: 'single', g: 'P' }];
    st.wizardB.leftHand.symbols = [{ t: 'clap' }];
    st.wizardB.rightHand.symbols = [{ t: 'clap' }];

    playTurn(st, parseTurn('D', 'P'), parseTurn('W', 'W'), {
      leftChoiceA: 'fingerOfDeath',
      rightChoiceA: 'counterSpell',
      spellTargetA: { left: 'b', right: 'b' },
      leftChoiceB: 'magicMirror',
      rightChoiceB: 'magicMirror',
    });
    expect(st.wizardA.damage).toBe(0); // non riflesso sul lanciatore
    expect(st.wizardB.damage).toBeGreaterThan(WIZARD_MAX_DAMAGE); // il FoD arriva
  });

  it('due counter-spell sullo stesso soggetto valgono come uno', () => {
    const st = freshState();
    preload(st.wizardA, SPELL_PATTERNS.missile[0]);
    st.wizardB.leftHand.symbols = [{ t: 'single', g: 'W' }, { t: 'single', g: 'P' }];
    st.wizardB.rightHand.symbols = [{ t: 'single', g: 'W' }, { t: 'single', g: 'P' }];
    playTurn(st, parseTurn('D', ' '), parseTurn('P', 'P'), {
      leftChoiceA: 'missile',
      leftChoiceB: 'counterSpell',
      rightChoiceB: 'counterSpell',
    });
    expect(st.wizardB.damage).toBe(0);
  });
});

// --- delayed effect / permanency -------------------------------------------

describe('delayed effect e permanency', () => {
  it('la banca tiene un solo incantesimo alla volta', () => {
    const st = freshState();
    castA(st, 'delayedEffect', { targetId: 'a' });
    castA(st, 'missile');
    expect(st.wizardA.status.delayedBank.spell).toBe('missile');

    const before = st.wizardB.damage;
    castA(st, 'causeLightWounds');
    expect(st.wizardA.status.delayedBank.spell).toBe('missile');
    expect(st.wizardB.damage).toBe(before + 2); // il secondo parte normalmente
  });

  it('con la banca piena un nuovo incantesimo non viene messo da parte', () => {
    const st = freshState();
    castA(st, 'delayedEffect', { targetId: 'a' });
    castA(st, 'missile');
    expect(st.wizardA.status.delayedBank.spell).toBe('missile');

    // Riarma il delayed effect: la banca è già occupata
    castA(st, 'delayedEffect', { targetId: 'a' });
    st.wizardA.status.delayedBank = { spell: 'missile', targetId: 'b', handIndex: 0 };
    st.wizardA.status.delayedArmed = 3;
    const before = st.wizardB.damage;
    castA(st, 'causeLightWounds');
    expect(st.wizardA.status.delayedBank.spell).toBe('missile');
    expect(st.wizardB.damage).toBe(before + 2);
  });

  it('rilasciare a banca vuota non fa nulla', () => {
    const st = freshState();
    const res = playTurn(st, parseTurn(' ', ' '), parseTurn(' ', ' '), { releaseDelayedA: true });
    expect(res.castsA).toHaveLength(0);
  });

  it('delayedArmed scade dopo 3 turni senza incantesimi', () => {
    const st = freshState();
    castA(st, 'delayedEffect', { targetId: 'a' });
    expect(st.wizardA.status.delayedArmed).toBe(2);
    for (let i = 0; i < 3; i++) {
      unlock(st);
      playTurn(st, parseTurn(' ', ' '), parseTurn(' ', ' '));
    }
    expect(st.wizardA.status.delayedArmed).toBe(0);
    expect(st.wizardA.status.delayedBank).toBe(null);
  });

  it('un enchantment reso permanente non scade', () => {
    const st = freshState();
    st.wizardA.status.permanencyArmed = 3;
    castA(st, 'blindness');
    expect(st.wizardB.status.permanent).toContain('blindness');
    const turns = st.wizardB.status.blindnessTurns;
    unlock(st);
    playTurn(st, parseTurn(' ', ' '), parseTurn(' ', ' '));
    expect(st.wizardB.status.blindnessTurns).toBe(turns);
  });

  it('permanency non si applica agli incantesimi esclusi', () => {
    const st = freshState();
    st.wizardA.status.permanencyArmed = 3;
    castA(st, 'disease');
    expect(st.wizardB.status.permanent).not.toContain('disease');
  });
});

// --- haste, time stop, fine partita ---------------------------------------

describe('haste, time stop e fine partita', () => {
  it('haste permette di completare un incantesimo con la seconda coppia', () => {
    const st = freshState();
    st.wizardA.status.hasteTurns = 2;
    st.wizardA.leftHand.symbols = [{ t: 'single', g: 'S' }];
    const res = playTurn(st, parseTurn(' ', ' '), parseTurn(' ', ' '), {
      left2A: 'S',
      right2A: ' ',
      leftChoice2A: 'missile',
    });
    // S (nothing azzera) → poi S…: la coppia extra viene comunque registrata
    expect(st.wizardA.leftHand.symbols.map((s) => s.g)).toEqual(['S']);
    expect(res.castsA).toHaveLength(0);

    const st2 = freshState();
    st2.wizardA.status.hasteTurns = 2;
    const res2 = playTurn(st2, parseTurn('S', ' '), parseTurn(' ', ' '), {
      left2A: 'D',
      right2A: ' ',
      leftChoice2A: 'missile',
    });
    expect(res2.castsA.some((c) => c.spell === 'missile')).toBe(true);
  });

  it('la seconda coppia è ignorata se incompleta o non valida', () => {
    const st = freshState();
    st.wizardA.status.hasteTurns = 2;
    st.wizardA.leftHand.symbols = [{ t: 'single', g: 'S' }];
    playTurn(st, parseTurn(' ', ' '), parseTurn(' ', ' '), { left2A: 'D', right2A: null });
    expect(st.wizardA.leftHand.symbols).toHaveLength(0);

    const st2 = freshState();
    st2.wizardA.status.hasteTurns = 2;
    st2.wizardA.leftHand.symbols = [{ t: 'single', g: 'S' }];
    playTurn(st2, parseTurn(' ', ' '), parseTurn(' ', ' '), { left2A: 'X', right2A: ' ' });
    expect(st2.wizardA.leftHand.symbols).toHaveLength(0);
  });

  it('hasteQueued diventa hasteTurns al turno successivo', () => {
    const st = freshState();
    castA(st, 'haste', { targetId: 'a' });
    expect(st.wizardA.status.hasteQueued).toBe(3);
    expect(st.wizardA.status.hasteTurns).toBe(0);
    unlock(st);
    playTurn(st, parseTurn(' ', ' '), parseTurn(' ', ' '));
    expect(st.wizardA.status.hasteTurns).toBeGreaterThan(0);
  });

  it('time stop dà un turno extra solo al soggetto', () => {
    const room = createRoom('t1');
    joinRoom(room, 'b', 'Beta');
    unlock(room.state);
    room.state.wizardA.status.antiSpellNextTurn = false;
    preload(room.state.wizardA, SPELL_PATTERNS.timeStop[0]);
    submitTurnToRoom(room, { playerId: 'a', left: 'C', right: 'C', leftSpell: 'timeStop', spellTargets: { left: 'a' } });
    let snap = submitTurnToRoom(room, { playerId: 'b', left: ' ', right: ' ' });
    expect(snap.extraTurnFor).toBe('a');

    expect(() => submitTurnToRoom(room, { playerId: 'b', left: 'P', right: ' ' }))
      .toThrow(/time_stop_wait/);

    snap = submitTurnToRoom(room, { playerId: 'a', left: 'P', right: ' ' });
    expect(snap.extraTurnFor).toBe(null);
    expect(snap.turn).toBe(2);
  });

  it('morte simultanea = pareggio', () => {
    const st = freshState();
    st.wizardA.damage = 14;
    st.wizardB.damage = 14;
    preload(st.wizardA, SPELL_PATTERNS.missile[0]);
    preload(st.wizardB, SPELL_PATTERNS.missile[0]);
    playTurn(st, parseTurn('D', ' '), parseTurn('D', ' '), {
      leftChoiceA: 'missile',
      leftChoiceB: 'missile',
    });
    expect(st.finished).toBe(true);
    expect(st.isDraw).toBe(true);
    expect(st.winnerId).toBe(null);
  });

  it('chi si arrende perde, ma vince se uccide nello stesso turno', () => {
    const st = freshState();
    st.wizardB.damage = WIZARD_MAX_DAMAGE;
    preload(st.wizardA, SPELL_PATTERNS.missile[0]);
    playTurn(st, parseTurn('D', ' '), parseTurn('P', 'P'), { leftChoiceA: 'missile' });
    expect(st.finished).toBe(true);
    expect(st.winnerId).toBe('a');
  });

  it('chi arriva a 15 danni perde, in entrambe le direzioni', () => {
    const stA = freshState();
    stA.wizardA.damage = WIZARD_MAX_DAMAGE;
    preload(stA.wizardB, SPELL_PATTERNS.missile[0]);
    playTurn(stA, parseTurn(' ', ' '), parseTurn('D', ' '), { leftChoiceB: 'missile' });
    expect(stA.finished).toBe(true);
    expect(stA.winnerId).toBe('b');

    const stB = freshState();
    stB.wizardB.damage = WIZARD_MAX_DAMAGE;
    preload(stB.wizardA, SPELL_PATTERNS.missile[0]);
    playTurn(stB, parseTurn('D', ' '), parseTurn(' ', ' '), { leftChoiceA: 'missile' });
    expect(stB.finished).toBe(true);
    expect(stB.winnerId).toBe('a');
  });

  it('a partita conclusa playTurn non fa nulla', () => {
    const st = freshState();
    st.finished = true;
    const res = playTurn(st, parseTurn('P', ' '), parseTurn(' ', ' '));
    expect(res.message).toBe('Game already finished');
    expect(st.turn).toBe(0);
  });

  it('il veleno uccide allo scadere', () => {
    const st = freshState();
    st.wizardB.status.poisonTurns = 1;
    expect(tickEndOfTurn(st)).toContain('b');
    expect(st.wizardB.damage).toBe(WIZARD_MAX_DAMAGE + 1);
  });
});

// --- room service ----------------------------------------------------------

describe('room service', () => {
  it('valida il giocatore in join e submit', () => {
    const room = createRoom('r1');
    expect(() => joinRoom(room, 'c')).toThrow(/invalid_player/);
    expect(() => submitTurnToRoom(room, { playerId: 'c', left: 'P', right: ' ' }))
      .toThrow(/invalid_player/);
  });

  it('il nome viene ripulito e troncato', () => {
    const room = createRoom('r2');
    joinRoom(room, 'b', `  ${'x'.repeat(60)}  `);
    expect(room.state.wizardB.name).toHaveLength(40);
    joinRoom(room, 'b', '   ');
    expect(room.state.wizardB.name).toHaveLength(40); // nome vuoto: resta il precedente
  });

  it('rifiuta i turni dopo la fine', () => {
    const room = createRoom('r3');
    submitTurnToRoom(room, { playerId: 'a', left: 'P', right: 'P' });
    submitTurnToRoom(room, { playerId: 'b', left: ' ', right: ' ' });
    expect(room.state.finished).toBe(true);
    expect(() => submitTurnToRoom(room, { playerId: 'a', left: 'P', right: ' ' }))
      .toThrow(/game_finished/);
  });

  it('un giocatore non può inviare due volte lo stesso turno', () => {
    const room = createRoom('r3b');
    joinRoom(room, 'b', 'Beta');
    submitTurnToRoom(room, { playerId: 'a', left: 'P', right: ' ' });
    expect(() => submitTurnToRoom(room, { playerId: 'a', left: 'S', right: ' ' }))
      .toThrow(/already_submitted/);
  });

  it('lo snapshot descrive l’attesa del turno', () => {
    const room = createRoom('r4');
    expect(snapshot(room).pendingTurn).toBeUndefined();
    submitTurnToRoom(room, { playerId: 'b', left: 'P', right: ' ' });
    expect(snapshot(room).pendingTurn).toEqual({ submitted: ['b'], waitingFor: ['a'] });
  });

  it('lo snapshot regge uno stato privo di regole (partite vecchie)', () => {
    const room = createRoom('r5');
    delete room.state.rules;
    expect(snapshot(room).rules).toEqual({ allowCharmNothing: false });
  });

  it('il charm forzato arriva solo dal vero controllore', () => {
    const room = createRoom('r6');
    joinRoom(room, 'b', 'Beta');
    room.state.wizardB.status.charmPerson = { controllerId: 'a', hand: 'left' };
    submitTurnToRoom(room, { playerId: 'a', left: ' ', right: ' ', charmForced: 'F' });
    const snap = submitTurnToRoom(room, { playerId: 'b', left: 'W', right: 'W' });
    expect(snap.history[0].b.left).toBe('F');
    expect(snap.history[0].b.right).toBe('W');
  });

  it('createGameService segnala le partite inesistenti', () => {
    const svc = createGameService();
    expect(svc.getGame('nope')).toBe(null);
    expect(() => svc.joinGame('nope', 'a')).toThrow(/not_found/);
    expect(() => svc.submitTurn('nope', { playerId: 'a', left: 'P', right: ' ' }))
      .toThrow(/not_found/);
  });

  it('lo storico registra un simbolo per ogni tipo di mano', () => {
    const svc = createGameService();
    const { id } = svc.createGame();
    svc.submitTurn(id, { playerId: 'a', left: 'stab', right: 'C' });
    const snap = svc.submitTurn(id, { playerId: 'b', left: 'W', right: ' ' });
    // Il clap con una mano sola si annota comunque, pur valendo come «nulla»
    expect(snap.history[0].a).toEqual({ left: '†', right: 'C' });
    expect(snap.history[0].b).toEqual({ left: 'W', right: '—' });
    expect(snap.players.a.rightGestures).toBe(0);
  });
});

// --- helper HTTP -----------------------------------------------------------

describe('helper HTTP', () => {
  const req = (url, origin) =>
    new Request(url, origin ? { headers: { Origin: origin } } : undefined);

  it('isSameOrigin accetta assenza di Origin e stesso origin', () => {
    expect(isSameOrigin(req('https://a.test/x'))).toBe(true);
    expect(isSameOrigin(req('https://a.test/x', 'https://a.test'))).toBe(true);
    expect(isSameOrigin(req('https://a.test/x', 'https://b.test'))).toBe(false);
    expect(isSameOrigin(req('https://a.test/x', 'non-un-url'))).toBe(false);
  });

  it('jsonResponse imposta CORS e omette il corpo sugli stati che non lo ammettono', async () => {
    const ok = jsonResponse({ a: 1 });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Content-Type')).toBe('application/json');
    await expect(ok.json()).resolves.toEqual({ a: 1 });

    for (const status of [204, 205, 304]) {
      expect(jsonResponse({}, status).body).toBe(null);
    }
    expect(jsonResponse({}, 200, { 'X-Test': 'y' }).headers.get('X-Test')).toBe('y');
  });

  it('textResponse restituisce testo con CORS', async () => {
    const res = textResponse('Not found', 404);
    expect(res.status).toBe(404);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    await expect(res.text()).resolves.toBe('Not found');
  });
});

// --- status.js -------------------------------------------------------------

describe('status', () => {
  it('statusJson tollera uno stato assente', () => {
    expect(statusJson(null)).toEqual({});
    expect(statusJson(emptyStatus()).permanent).toEqual([]);
  });

  it('statusJson traduce lastAction in etichette', () => {
    const s = emptyStatus();
    s.lastAction = { left: { kind: 'stab' }, right: { kind: 'clap' } };
    expect(statusJson(s).lastAction).toEqual({ left: '†', right: 'C' });
  });

  it('handLabelForHistory copre tutti i casi', () => {
    expect(handLabelForHistory(null)).toBe('—');
    expect(handLabelForHistory({ kind: 'nothing' })).toBe('—');
    expect(handLabelForHistory({ kind: 'stab' })).toBe('†');
    expect(handLabelForHistory({ kind: 'clap' })).toBe('C');
    expect(handLabelForHistory({ kind: 'gesture', gesture: 'W' })).toBe('W');
    expect(handLabelForHistory({ kind: 'boh' })).toBe('?');
  });

  it('paralyzedPosition applica C→F, S→D, W→P e lascia il resto', () => {
    expect(paralyzedPosition({ kind: 'clap' })).toEqual({ kind: 'gesture', gesture: 'F' });
    expect(paralyzedPosition({ kind: 'gesture', gesture: 'S' })).toEqual({ kind: 'gesture', gesture: 'D' });
    expect(paralyzedPosition({ kind: 'gesture', gesture: 'W' })).toEqual({ kind: 'gesture', gesture: 'P' });
    expect(paralyzedPosition({ kind: 'gesture', gesture: 'P' })).toEqual({ kind: 'gesture', gesture: 'P' });
    expect(paralyzedPosition({ kind: 'stab' })).toEqual({ kind: 'stab' });
    expect(paralyzedPosition(null)).toEqual({ kind: 'nothing' });
  });

  it('randomConfusionGesture resta nell’insieme previsto', () => {
    const allowed = new Set(['C', 'D', 'F', 'P', 'S', 'W']);
    for (let i = 0; i < 60; i++) expect(allowed.has(randomConfusionGesture())).toBe(true);
  });

  it('senza status non applica vincoli', () => {
    const action = parseTurn('W', 'S');
    expect(applyPreTurnConstraints({}, action)).toEqual([]);
    expect(action.left).toEqual({ kind: 'gesture', gesture: 'W' });
  });

  it('il charm può controllare la mano destra e imporre una pugnalata', () => {
    const w = { status: emptyStatus() };
    w.status.charmPerson = { controllerId: 'b', hand: 'right' };
    const action = parseTurn('W', 'S');
    applyPreTurnConstraints(w, action, { charmForced: 'stab' });
    expect(action.right).toEqual({ kind: 'stab' });
    expect(action.left).toEqual({ kind: 'gesture', gesture: 'W' });
  });

  it('il charm può imporre un clap', () => {
    const w = { status: emptyStatus() };
    w.status.charmPerson = { controllerId: 'b', hand: 'left' };
    const action = parseTurn('W', 'S');
    applyPreTurnConstraints(w, action, { charmForced: 'C' });
    expect(action.left).toEqual({ kind: 'clap' });
  });

  it('fear azzera anche il clap e lascia passare P e W', () => {
    const w = { status: emptyStatus() };
    w.status.fear = true;
    const action = parseTurn('C', 'P');
    applyPreTurnConstraints(w, action);
    expect(action.left).toEqual({ kind: 'nothing' });
    expect(action.right).toEqual({ kind: 'gesture', gesture: 'P' });
    expect(w.status.fear).toBe(false);
  });

  it('confusion sostituisce la mano sinistra o destra secondo il caso', () => {
    const left = { status: emptyStatus() };
    left.status.confusion = true;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const a1 = parseTurn('W', 'S');
    expect(applyPreTurnConstraints(left, a1)).toContain('confusion:left:C');
    expect(a1.left).toEqual({ kind: 'clap' });

    const right = { status: emptyStatus() };
    right.status.confusion = true;
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const a2 = parseTurn('W', 'S');
    expect(applyPreTurnConstraints(right, a2)[0]).toMatch(/^confusion:right:/);
  });

  it('clearEnchantments può preservare le resistenze', () => {
    const w = { status: emptyStatus() };
    w.status.resistHeat = true;
    w.status.amnesia = true;
    clearEnchantments(w, { keepResists: true });
    expect(w.status.resistHeat).toBe(true);
    expect(w.status.amnesia).toBe(false);

    w.status.resistHeat = true;
    clearEnchantments(w);
    expect(w.status.resistHeat).toBe(false);
  });
});
