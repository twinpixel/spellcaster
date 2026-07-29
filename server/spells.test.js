/**
 * Suite effetti: ogni magia, mostri, enchantment, cancellazioni, stab/resa.
 */
import { describe, expect, it } from 'vitest';
import {
  SPELL_PATTERNS,
  SPELL_META,
  allSpellIds,
  createGameService,
  newGame,
  playTurn,
  parseTurn,
} from './shared.js';
import { tickEndOfTurn, applyPreTurnConstraints, emptyStatus } from './status.js';

// --- helpers ---------------------------------------------------------------

function stepToHands(step) {
  if (step.t === 'single') return { left: step.g, right: ' ' };
  if (step.t === 'clap') return { left: 'C', right: 'C' };
  if (step.t === 'both') return { left: step.g, right: step.g };
  throw new Error(`unknown step ${JSON.stringify(step)}`);
}

function pass() {
  return { left: ' ', right: ' ' };
}

function playTurns(svc, gameId, turnsA, turnsB = []) {
  const n = Math.max(turnsA.length, turnsB.length);
  let snap;
  for (let i = 0; i < n; i++) {
    const a = { ...pass(), ...(turnsA[i] || {}) };
    const b = { ...pass(), ...(turnsB[i] || {}) };
    svc.submitTurn(gameId, { playerId: 'a', ...a });
    snap = svc.submitTurn(gameId, { playerId: 'b', ...b });
  }
  return snap;
}

/** Precarica tutti i gesti tranne l’ultimo, poi gioca un solo turno (evita cast intermedi). */
function preloadPattern(wizard, pattern, dropLast = true) {
  const steps = dropLast ? pattern.slice(0, -1) : pattern;
  wizard.leftHand.symbols = [];
  wizard.rightHand.symbols = [];
  for (const step of steps) {
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

function lastStepAction(pattern) {
  return stepToHands(pattern[pattern.length - 1]);
}

/**
 * Completa un incantesimo in un unico playTurn (mani precaricate).
 */
function castInstant(spellId, {
  caster = 'a',
  targetId,
  patternIndex = 0,
  state,
  foeAction,
  elementalType,
  choices = {},
} = {}) {
  const st = state || newGame({ nameA: 'Alpha', nameB: 'Beta' });
  st.wizardA.status.antiSpellNextTurn = false;
  st.wizardB.status.antiSpellNextTurn = false;
  const pattern = SPELL_PATTERNS[spellId][patternIndex];
  const wizard = caster === 'a' ? st.wizardA : st.wizardB;
  preloadPattern(wizard, pattern, true);
  const hands = lastStepAction(pattern);
  const actionCaster = parseTurn(hands.left, hands.right);
  const actionFoe = foeAction || parseTurn(' ', ' ');
  const actionA = caster === 'a' ? actionCaster : actionFoe;
  const actionB = caster === 'b' ? actionCaster : actionFoe;

  const spellTargetsKey = caster === 'a' ? 'spellTargetA' : 'spellTargetB';
  const leftChoiceKey = caster === 'a' ? 'leftChoiceA' : 'leftChoiceB';
  const elemKey = caster === 'a' ? 'elementalTypeA' : 'elementalTypeB';
  const ch = {
    [leftChoiceKey]: spellId,
    ...(targetId
      ? { [spellTargetsKey]: { left: targetId, right: targetId } }
      : {}),
    ...(elementalType ? { [elemKey]: elementalType } : {}),
    ...choices,
  };
  const result = playTurn(st, actionA, actionB, ch);
  return { state: st, result };
}

function castSpell(svc, spellId, opts = {}) {
  const {
    caster = 'a',
    patternIndex = 0,
    targetId,
    elementalType,
    charmHand,
    paralysisHand,
    charmForced,
    releaseDelayed,
    left2,
    right2,
  } = opts;
  const patterns = SPELL_PATTERNS[spellId];
  if (!patterns?.[patternIndex]) throw new Error(`no pattern for ${spellId}`);
  const steps = patterns[patternIndex].map(stepToHands);
  const mapped = steps.map((h, i) => {
    const row = { ...h, leftSpell: spellId };
    if (i === steps.length - 1) {
      if (targetId) row.spellTargets = { left: targetId, right: targetId };
      if (elementalType) row.elementalType = elementalType;
      if (charmHand) row.charmHand = charmHand;
      if (paralysisHand) row.paralysisHand = paralysisHand;
      if (charmForced) row.charmForced = charmForced;
      if (releaseDelayed) row.releaseDelayed = true;
      if (left2 != null) row.left2 = left2;
      if (right2 != null) row.right2 = right2;
    }
    return row;
  });

  const turnsA = mapped.map(() => pass());
  const turnsB = mapped.map(() => pass());
  const mine = caster === 'a' ? turnsA : turnsB;
  for (let i = 0; i < mapped.length; i++) mine[i] = mapped[i];
  return playTurns(svc, opts.gameId, turnsA, turnsB);
}

function fresh() {
  const svc = createGameService();
  const snap = svc.createGame({ nameA: 'Alpha', nameB: 'Beta' });
  return { svc, id: snap.id, snap };
}

function hasCast(snap, spell, casterId = 'a') {
  return (snap.lastTurnCasts || []).some(
    (c) => c.spell === spell && (!casterId || c.casterId === casterId),
  );
}

// --- detection ------------------------------------------------------------

describe('spell detection (tutti i pattern)', () => {
  for (const id of allSpellIds()) {
    const patterns = SPELL_PATTERNS[id];
    patterns.forEach((_, pi) => {
      const label = patterns.length > 1 ? `${id} #${pi}` : id;
      it(`completa ${label} (${SPELL_META[id].gestures})`, () => {
        const { result } = castInstant(id, { patternIndex: pi });
        const casts = [...result.castsA, ...result.castsB];
        expect(casts.some((c) => c.spell === id)).toBe(true);
      });
    });
  }
});

describe('gesti a due mani', () => {
  it('un gesto fatto con entrambe le mani vale per la sequenza di ciascuna mano', () => {
    // Spellcaster.html, partita d’esempio: «Black does 2 F gestures» completa
    // sia la blindness (mano destra) sia la resist cold (mano sinistra).
    const { svc, id } = fresh();
    playTurns(svc, id, [{ left: 'S', right: 'S' }], []);
    const snap = playTurns(svc, id, [{ left: 'D', right: 'D' }], []);
    const missiles = (snap.lastTurnCasts || []).filter(
      (c) => c.spell === 'missile' && c.casterId === 'a',
    );
    expect(missiles).toHaveLength(2);
    expect(snap.players.b.damage).toBe(2);
  });

  it('i passi «(x» richiedono comunque entrambe le mani', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    st.wizardA.leftHand.symbols = [{ t: 'clap' }];
    const result = playTurn(st, parseTurn('W', ' '), parseTurn(' ', ' '));
    expect(result.castsA.some((c) => c.spell === 'magicMirror')).toBe(false);
  });
});

// --- protezione -----------------------------------------------------------

describe('protection', () => {
  it('shield blocca missile', () => {
    const { svc, id } = fresh();
    playTurns(svc, id, [{ left: 'S', right: ' ', leftSpell: 'missile' }], []);
    const snap = playTurns(
      svc,
      id,
      [{ left: 'D', right: ' ', leftSpell: 'missile' }],
      [{ left: 'P', right: ' ', leftSpell: 'shield' }],
    );
    expect(snap.players.b.damage).toBe(0);
    expect(hasCast(snap, 'shield', 'b')).toBe(true);
  });

  it('counter-spell annulla missile sul soggetto', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st.wizardA, SPELL_PATTERNS.missile[0]);
    preloadPattern(st.wizardB, SPELL_PATTERNS.counterSpell[0]);
    const result = playTurn(
      st,
      parseTurn('D', ' '),
      parseTurn('P', ' '),
      {
        leftChoiceA: 'missile',
        leftChoiceB: 'counterSpell',
        spellTargetB: { left: 'b' },
      },
    );
    expect(result.castsA.some((c) => c.spell === 'missile')).toBe(false);
    expect(st.wizardB.damage).toBe(0);
  });

  it('magic mirror riflette missile sul lanciatore', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st.wizardA, SPELL_PATTERNS.missile[0]);
    preloadPattern(st.wizardB, SPELL_PATTERNS.magicMirror[0]);
    playTurn(
      st,
      parseTurn('D', ' '),
      parseTurn('W', 'W'),
      {
        leftChoiceA: 'missile',
        leftChoiceB: 'magicMirror',
        spellTargetB: { left: 'b' },
      },
    );
    expect(st.wizardA.damage).toBe(1);
    expect(st.wizardB.damage).toBe(0);
  });

  it('cure light cura 1, cure heavy cura 2 e disease', () => {
    const state = newGame();
    state.wizardA.status.antiSpellNextTurn = false;
    state.wizardB.status.antiSpellNextTurn = false;
    state.wizardA.damage = 5;
    state.wizardA.status.diseaseTurns = 4;
    castInstant('cureLightWounds', { state, targetId: 'a' });
    expect(state.wizardA.damage).toBe(4);

    state.wizardA.status.antiSpellNextTurn = false;
    state.wizardB.status.antiSpellNextTurn = false;
    castInstant('cureHeavyWounds', { state, targetId: 'a' });
    expect(state.wizardA.damage).toBe(2);
    expect(state.wizardA.status.diseaseTurns).toBe(0);
  });

  it('raise dead su vivente cura fino a 5', () => {
    const state = newGame();
    state.wizardA.status.antiSpellNextTurn = false;
    state.wizardB.status.antiSpellNextTurn = false;
    state.wizardA.damage = 8;
    castInstant('raiseDead', { state, targetId: 'a' });
    expect(state.wizardA.damage).toBe(3);
  });

  it('raise dead resuscita mago morto nello stesso playTurn', () => {
    const state = newGame();
    state.wizardA.status.antiSpellNextTurn = false;
    state.wizardB.status.antiSpellNextTurn = false;
    state.wizardB.damage = 15;
    castInstant('raiseDead', { state, targetId: 'b' });
    expect(state.wizardB.damage).toBe(0);
    expect(state.finished).toBe(false);
  });

  it('remove enchantment toglie disease; su mostro lo uccide dopo attacco', () => {
    const state = newGame();
    state.wizardA.status.antiSpellNextTurn = false;
    state.wizardB.status.antiSpellNextTurn = false;
    castInstant('summonGoblin', { state });
    const mid = state.monsters[0].id;
    const dmgBefore = state.wizardB.damage;
    state.wizardA.status.antiSpellNextTurn = false;
    state.wizardB.status.antiSpellNextTurn = false;
    castInstant('removeEnchantment', { state, targetId: mid });
    expect(state.monsters.find((m) => m.id === mid).alive).toBe(false);
    expect(state.wizardB.damage).toBe(dmgBefore + 1);

    state.wizardB.status.diseaseTurns = 5;
    state.wizardA.status.antiSpellNextTurn = false;
    state.wizardB.status.antiSpellNextTurn = false;
    castInstant('removeEnchantment', { state, targetId: 'b' });
    expect(state.wizardB.status.diseaseTurns).toBe(0);
  });

  it('counter-spell non ferma raise dead su un cadavere', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    st.wizardB.damage = 15;
    preloadPattern(st.wizardA, SPELL_PATTERNS.raiseDead[0]);
    preloadPattern(st.wizardB, SPELL_PATTERNS.counterSpell[0]);
    const result = playTurn(st, parseTurn('C', 'C'), parseTurn('P', ' '), {
      leftChoiceA: 'raiseDead',
      leftChoiceB: 'counterSpell',
      spellTargetA: { left: 'b' },
      spellTargetB: { left: 'b' },
    });
    expect(result.castsA.some((c) => c.spell === 'raiseDead')).toBe(true);
    expect(st.wizardB.damage).toBe(0);
    expect(st.finished).toBe(false);
  });

  it('dispel magic distrugge mostri', () => {
    const state = newGame();
    state.wizardA.status.antiSpellNextTurn = false;
    state.wizardB.status.antiSpellNextTurn = false;
    castInstant('summonGoblin', { state });
    state.wizardA.status.antiSpellNextTurn = false;
    state.wizardB.status.antiSpellNextTurn = false;
    castInstant('dispelMagic', { state, targetId: 'a' });
    expect(state.monsters.every((m) => !m.alive)).toBe(true);
  });
});

// --- danno ----------------------------------------------------------------

describe('damaging spells', () => {
  it('missile fa 1 danno', () => {
    const { state } = castInstant('missile');
    expect(state.wizardB.damage).toBe(1);
  });

  it('cause light 2 ignora shield; cause heavy 3', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st.wizardA, SPELL_PATTERNS.causeLightWounds[0]);
    playTurn(st, parseTurn('P', ' '), parseTurn('P', ' '), {
      leftChoiceA: 'causeLightWounds',
      leftChoiceB: 'shield',
    });
    expect(st.wizardB.damage).toBe(2);

    const st2 = newGame();
    st2.wizardA.status.antiSpellNextTurn = false;
    st2.wizardB.status.antiSpellNextTurn = false;
    castInstant('causeHeavyWounds', { state: st2 });
    expect(st2.wizardB.damage).toBe(3);
  });

  it('lightning long fa 5; short una sola volta', () => {
    const { state } = castInstant('lightningBoltLong');
    expect(state.wizardB.damage).toBe(5);

    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('lightningBoltShort', { state: st });
    expect(st.wizardB.damage).toBe(5);
    expect(st.wizardA.usedShortLightning).toBe(true);
    const dmg = st.wizardB.damage;
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('lightningBoltShort', { state: st });
    expect(st.wizardB.damage).toBe(dmg);
  });

  it('fireball 5; resist heat blocca', () => {
    const { state } = castInstant('fireball');
    expect(state.wizardB.damage).toBe(5);

    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('resistHeat', { state: st, caster: 'b', targetId: 'b' });
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('fireball', { state: st });
    expect(st.wizardB.damage).toBe(0);
  });

  it('ice storm annulla il fireball solo sul suo soggetto', () => {
    // «the subject of the fireball is instead not harmed by either spell,
    //  although the storm will affect others as normal»
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st.wizardA, SPELL_PATTERNS.fireball[0]);
    preloadPattern(st.wizardB, SPELL_PATTERNS.iceStorm[0]);
    const result = playTurn(st, parseTurn('D', ' '), parseTurn('C', 'C'), {
      leftChoiceA: 'fireball',
      leftChoiceB: 'iceStorm',
    });
    expect(result.castsA.some((c) => c.spell === 'fireball')).toBe(false);
    expect(st.wizardB.damage).toBe(0); // soggetto del fireball: illeso
    expect(st.wizardA.damage).toBe(5); // colpito dalla tempesta come tutti
  });

  it('due fire storm contano come una sola', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st.wizardA, SPELL_PATTERNS.fireStorm[0]);
    preloadPattern(st.wizardB, SPELL_PATTERNS.fireStorm[0]);
    playTurn(st, parseTurn('C', 'C'), parseTurn('C', 'C'), {
      leftChoiceA: 'fireStorm',
      leftChoiceB: 'fireStorm',
    });
    expect(st.wizardA.damage).toBe(5);
    expect(st.wizardB.damage).toBe(5);
  });

  it('counter-spell protegge solo il soggetto dalla tempesta', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st.wizardA, SPELL_PATTERNS.fireStorm[0]);
    preloadPattern(st.wizardB, SPELL_PATTERNS.counterSpell[0]);
    const result = playTurn(st, parseTurn('C', 'C'), parseTurn('P', ' '), {
      leftChoiceA: 'fireStorm',
      leftChoiceB: 'counterSpell',
      spellTargetB: { left: 'b' },
    });
    expect(result.castsA.some((c) => c.spell === 'fireStorm')).toBe(true);
    expect(st.wizardB.damage).toBe(0);
    expect(st.wizardA.damage).toBe(5);
  });

  it('una cura simultanea sottrae al danno del turno', () => {
    // «as if that point had not been inflicted»
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st.wizardA, SPELL_PATTERNS.lightningBoltLong[0]);
    preloadPattern(st.wizardB, SPELL_PATTERNS.cureLightWounds[0]);
    playTurn(st, parseTurn('D', ' '), parseTurn('W', ' '), {
      leftChoiceA: 'lightningBoltLong',
      leftChoiceB: 'cureLightWounds',
      spellTargetB: { left: 'b' },
    });
    expect(st.wizardB.damage).toBe(4);
  });

  it('nessuna cura riporta in vita chi subisce finger of death', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st.wizardA, SPELL_PATTERNS.fingerOfDeath[0]);
    preloadPattern(st.wizardB, SPELL_PATTERNS.cureLightWounds[0]);
    playTurn(st, parseTurn('D', ' '), parseTurn('W', ' '), {
      leftChoiceA: 'fingerOfDeath',
      leftChoiceB: 'cureLightWounds',
      spellTargetB: { left: 'b' },
    });
    expect(st.finished).toBe(true);
    expect(st.winnerId).toBe('a');
  });

  it('fire storm e ice storm si annullano', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st.wizardA, SPELL_PATTERNS.fireStorm[0]);
    preloadPattern(st.wizardB, SPELL_PATTERNS.iceStorm[0]);
    const result = playTurn(st, parseTurn('C', 'C'), parseTurn('C', 'C'), {
      leftChoiceA: 'fireStorm',
      leftChoiceB: 'iceStorm',
    });
    expect(result.castsA.some((c) => c.spell === 'fireStorm')).toBe(false);
    expect(result.castsB.some((c) => c.spell === 'iceStorm')).toBe(false);
    expect(st.wizardA.damage).toBe(0);
    expect(st.wizardB.damage).toBe(0);
  });

  it('finger of death uccide', () => {
    const { state } = castInstant('fingerOfDeath');
    expect(state.wizardB.damage).toBeGreaterThan(14);
    expect(state.finished).toBe(true);
    expect(state.winnerId).toBe('a');
  });

  it('finger of death e raise dead sullo stesso soggetto si annullano', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st.wizardA, SPELL_PATTERNS.fingerOfDeath[0]);
    preloadPattern(st.wizardB, SPELL_PATTERNS.raiseDead[0]);
    const result = playTurn(st, parseTurn('D', ' '), parseTurn('C', 'C'), {
      leftChoiceA: 'fingerOfDeath',
      leftChoiceB: 'raiseDead',
      spellTargetA: { left: 'b' },
      spellTargetB: { left: 'b' },
    });
    expect(result.castsA.some((c) => c.spell === 'fingerOfDeath')).toBe(false);
    expect(result.castsB.some((c) => c.spell === 'raiseDead')).toBe(false);
    expect(st.wizardB.damage).toBeLessThanOrEqual(14);
    expect(st.finished).toBe(false);
  });
});

// --- evocazioni -----------------------------------------------------------

describe('summons', () => {
  const cases = [
    ['summonGoblin', 'goblin', 1],
    ['summonOgre', 'ogre', 2],
    ['summonTroll', 'troll', 3],
    ['summonGiant', 'giant', 4],
  ];

  for (const [spell, type, atk] of cases) {
    it(`${spell} crea ${type} ATK ${atk}`, () => {
      const { state } = castInstant(spell);
      const m = state.monsters.find((x) => x.type === type && x.alive);
      expect(m).toBeTruthy();
      expect(m.attack).toBe(atk);
      expect(m.controllerId).toBe('a');
      expect(state.wizardB.damage).toBe(atk);
    });
  }

  it('elemental fuoco fa 3; resist heat blocca', () => {
    const { state } = castInstant('summonElemental', { elementalType: 'fire' });
    expect(state.monsters.some((m) => m.elementalType === 'fire' && m.alive)).toBe(true);
    expect(state.wizardB.damage).toBe(3);

    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('resistHeat', { state: st, caster: 'b', targetId: 'b' });
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('summonElemental', { state: st, elementalType: 'fire' });
    expect(st.wizardB.damage).toBe(0);
  });

  it('un elementale colpisce chiunque non resista, controllore incluso', () => {
    const { state } = castInstant('summonElemental', { elementalType: 'fire' });
    expect(state.wizardA.damage).toBe(3);
    expect(state.wizardB.damage).toBe(3);
  });

  it('un elementale di ghiaccio neutralizza la fire storm e viene distrutto', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('summonElemental', { state: st, caster: 'b', elementalType: 'ice' });
    const dmgA = st.wizardA.damage;
    const dmgB = st.wizardB.damage;

    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('fireStorm', { state: st });
    expect(st.monsters.every((m) => !m.alive)).toBe(true);
    expect(st.wizardA.damage).toBe(dmgA);
    expect(st.wizardB.damage).toBe(dmgB);
  });

  it('due elementali dello stesso tipo si fondono in uno solo', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st.wizardA, SPELL_PATTERNS.summonElemental[0]);
    preloadPattern(st.wizardB, SPELL_PATTERNS.summonElemental[0]);
    playTurn(st, parseTurn('S', ' '), parseTurn('S', ' '), {
      leftChoiceA: 'summonElemental',
      leftChoiceB: 'summonElemental',
      elementalTypeA: 'fire',
      elementalTypeB: 'fire',
    });
    expect(st.monsters.filter((m) => m.alive)).toHaveLength(1);
  });

  it('elementali opposti si annullano', () => {
    const st2 = newGame();
    st2.wizardA.status.antiSpellNextTurn = false;
    st2.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st2.wizardA, SPELL_PATTERNS.summonElemental[0]);
    preloadPattern(st2.wizardB, SPELL_PATTERNS.summonElemental[0]);
    playTurn(st2, parseTurn('S', ' '), parseTurn('S', ' '), {
      leftChoiceA: 'summonElemental',
      leftChoiceB: 'summonElemental',
      elementalTypeA: 'fire',
      elementalTypeB: 'ice',
    });
    expect(st2.monsters.filter((m) => m.alive)).toHaveLength(0);
  });

  it('charm monster trasferisce il controllo', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('summonGoblin', { state: st });
    const mid = st.monsters[0].id;
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('charmMonster', { state: st, caster: 'b', targetId: mid });
    expect(st.monsters.find((m) => m.id === mid).controllerId).toBe('b');
  });

  it('paralysis su mostro salta un attacco', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('summonGoblin', { state: st });
    const mid = st.monsters[0].id;
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('paralysis', { state: st, caster: 'b', targetId: mid });
    const dmg = st.wizardB.damage;
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    playTurn(st, parseTurn(' ', ' '), parseTurn(' ', ' '));
    expect(st.wizardB.damage).toBe(dmg);
  });
});

// --- enchantments ---------------------------------------------------------

describe('enchantments', () => {
  it('amnesia ripete i gesti del turno precedente', () => {
    const { svc, id } = fresh();
    playTurns(svc, id, [pass()], [{ left: 'W', right: 'S' }]);
    const room = svc._games.get(id);
    room.state.wizardA.status.antiSpellNextTurn = false;
    room.state.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(room.state.wizardA, SPELL_PATTERNS.amnesia[0]);
    svc.submitTurn(id, {
      playerId: 'a',
      left: 'P',
      right: ' ',
      leftSpell: 'amnesia',
      spellTargets: { left: 'b' },
    });
    let snap = svc.submitTurn(id, { playerId: 'b', left: 'W', right: 'D' });
    expect(hasCast(snap, 'amnesia')).toBe(true);
    expect(snap.players.b.status.amnesia).toBe(true);

    svc.submitTurn(id, { playerId: 'a', left: ' ', right: ' ' });
    snap = svc.submitTurn(id, { playerId: 'b', left: 'F', right: 'F' });
    expect(snap.history[0].b.left).toBe('W');
    expect(snap.history[0].b.right).toBe('D');
  });

  it('fear vieta C D F S', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('fear', { state: st });
    expect(st.wizardB.status.fear).toBe(true);
    playTurn(st, parseTurn(' ', ' '), parseTurn('F', 'D'));
    expect(st.wizardB.status.lastAction.left.kind).toBe('nothing');
    expect(st.wizardB.status.lastAction.right.kind).toBe('nothing');
  });

  it('confusion altera un gesto', () => {
    const state = newGame();
    state.wizardA.status.confusion = true;
    const action = parseTurn('P', 'P');
    const notes = applyPreTurnConstraints(state.wizardA, action, {});
    expect(notes.some((n) => n.startsWith('confusion:'))).toBe(true);
    expect(state.wizardA.status.confusion).toBe(false);
  });

  it('charm person forza il gesto del controllore', () => {
    const { svc, id } = fresh();
    const room = svc._games.get(id);
    room.state.wizardA.status.antiSpellNextTurn = false;
    room.state.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(room.state.wizardA, SPELL_PATTERNS.charmPerson[0]);
    svc.submitTurn(id, {
      playerId: 'a',
      left: 'F',
      right: ' ',
      leftSpell: 'charmPerson',
      charmHand: 'left',
      spellTargets: { left: 'b' },
    });
    let snap = svc.submitTurn(id, { playerId: 'b', left: ' ', right: ' ' });
    expect(snap.players.b.status.charmPerson.controllerId).toBe('a');

    svc.submitTurn(id, { playerId: 'a', left: ' ', right: ' ', charmForced: 'F' });
    snap = svc.submitTurn(id, { playerId: 'b', left: 'W', right: 'W' });
    expect(snap.history[0].b.left).toBe('F');
    expect(snap.history[0].b.right).toBe('W');
  });

  it('paralysis blocca la mano nella posizione del turno di lancio (S→D)', () => {
    // «that hand is paralyzed into the position it is in this turn»,
    // con C, S, W trasformati rispettivamente in F, D, P.
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('paralysis', {
      state: st,
      foeAction: parseTurn('S', 'W'),
      choices: { paralysisHandA: 'left' },
    });
    expect(st.wizardB.status.paralysis).toEqual({
      hand: 'left',
      forced: { kind: 'gesture', gesture: 'D' },
    });

    playTurn(st, parseTurn(' ', ' '), parseTurn('P', 'W'));
    expect(st.wizardB.status.lastAction.left).toEqual({ kind: 'gesture', gesture: 'D' });
    expect(st.wizardB.status.lastAction.right).toEqual({ kind: 'gesture', gesture: 'W' });
    expect(st.wizardB.status.lastParalyzedHand).toBe(null);
  });

  it('una nuova paralisi ricade sulla stessa mano già paralizzata', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    st.wizardB.status.paralysis = { hand: 'right', forced: { kind: 'gesture', gesture: 'P' } };
    // Il lanciatore chiede «left», ma la mano già paralizzata è la destra
    castInstant('paralysis', {
      state: st,
      foeAction: parseTurn('F', 'W'),
      choices: { paralysisHandA: 'left' },
    });
    expect(st.wizardB.status.paralysis.hand).toBe('right');
  });

  it('anti-spell azzera i buffer al turno successivo', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    st.wizardB.leftHand.symbols = [{ t: 'single', g: 'S' }];
    castInstant('antiSpell', { state: st, targetId: 'b' });
    expect(st.wizardB.status.antiSpellNextTurn).toBe(true);
    playTurn(st, parseTurn(' ', ' '), parseTurn('D', ' '));
    expect(st.wizardA.damage).toBe(0);
  });

  it('protection from evil blocca stab per più turni', () => {
    const { state } = castInstant('protectionFromEvil', { targetId: 'a' });
    expect(state.wizardA.status.protectionFromEvilTurns).toBeGreaterThan(0);
    const turns = state.wizardA.status.protectionFromEvilTurns;
    playTurn(state, parseTurn(' ', ' '), parseTurn('stab', ' '));
    expect(state.wizardA.damage).toBe(0);
    expect(state.wizardA.status.protectionFromEvilTurns).toBe(turns - 1);
  });

  it('resist heat / cold', () => {
    let { state } = castInstant('resistHeat', { targetId: 'a' });
    expect(state.wizardA.status.resistHeat).toBe(true);
    ({ state } = castInstant('resistCold', { targetId: 'a' }));
    expect(state.wizardA.status.resistCold).toBe(true);
  });

  it('disease/poison countdown; cure heavy cura solo disease', () => {
    let { state } = castInstant('disease');
    expect(state.wizardB.status.diseaseTurns).toBeGreaterThan(0);
    expect(state.wizardB.status.diseaseTurns).toBeLessThanOrEqual(6);

    ({ state } = castInstant('poison'));
    expect(state.wizardB.status.poisonTurns).toBeGreaterThan(0);

    state.wizardB.status.diseaseTurns = 3;
    state.wizardA.status.antiSpellNextTurn = false;
    state.wizardB.status.antiSpellNextTurn = false;
    castInstant('cureHeavyWounds', { state, targetId: 'b' });
    expect(state.wizardB.status.diseaseTurns).toBe(0);
    expect(state.wizardB.status.poisonTurns).toBeGreaterThan(0);
  });

  it('disease a 0 turni uccide', () => {
    const state = newGame();
    state.wizardA.status.diseaseTurns = 1;
    const deaths = tickEndOfTurn(state);
    expect(deaths).toContain('a');
    expect(state.wizardA.damage).toBe(15);
  });

  it('blindness e invisibility partono dal turno dopo e durano 3 turni', () => {
    // «For the next 3 turns not including the one in which the spell was cast»
    const { state } = castInstant('blindness');
    expect(state.wizardB.status.blindnessTurns).toBe(0);
    expect(state.wizardB.status.blindnessQueued).toBe(3);

    // «cieco in questo turno» = contatore attivo o in arrivo prima di giocarlo
    const blindDuringTurn = [];
    for (let i = 0; i < 4; i++) {
      const s = state.wizardB.status;
      blindDuringTurn.push(s.blindnessTurns > 0 || s.blindnessQueued > 0);
      state.wizardA.status.antiSpellNextTurn = false;
      state.wizardB.status.antiSpellNextTurn = false;
      playTurn(state, parseTurn(' ', ' '), parseTurn(' ', ' '));
    }
    expect(blindDuringTurn).toEqual([true, true, true, false]);

    const inv = castInstant('invisibility', { targetId: 'a' }).state;
    expect(inv.wizardA.status.invisibilityTurns).toBe(0);
    expect(inv.wizardA.status.invisibilityQueued).toBe(3);
    playTurn(inv, parseTurn(' ', ' '), parseTurn(' ', ' '));
    // il primo turno di invisibilità è appena stato giocato: ne restano 2
    expect(inv.wizardA.status.invisibilityQueued).toBe(0);
    expect(inv.wizardA.status.invisibilityTurns).toBe(2);
  });

  it('blindness distrugge un mostro', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('summonGoblin', { state: st });
    const mid = st.monsters[0].id;
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('blindness', { state: st, caster: 'b', targetId: mid });
    expect(st.monsters.find((m) => m.id === mid).alive).toBe(false);
  });

  it('invisibility blocca mostri avversari', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('summonGoblin', { state: st, caster: 'b' });
    st.wizardA.status.invisibilityTurns = 2;
    const dmg = st.wizardA.damage;
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    playTurn(st, parseTurn(' ', ' '), parseTurn(' ', ' '));
    expect(st.wizardA.damage).toBe(dmg);
  });

  it('haste dal turno dopo accetta seconda coppia', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('haste', { state: st, targetId: 'a' });
    expect(st.wizardA.status.hasteQueued).toBe(3);
    playTurn(st, parseTurn('P', ' '), parseTurn(' ', ' '), {
      left2A: 'S',
      right2A: ' ',
    });
    expect(st.wizardA.status.hasteTurns).toBeGreaterThan(0);
  });

  it('time stop concede extraTurnFor', () => {
    const { state } = castInstant('timeStop', { targetId: 'a' });
    expect(state.extraTurnFor).toBe('a');
  });

  it('delayed effect banca e rilascia missile', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('delayedEffect', { state: st, targetId: 'a' });
    expect(st.wizardA.status.delayedArmed).toBeGreaterThan(0);
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    castInstant('missile', { state: st });
    expect(st.wizardB.damage).toBe(0);
    expect(st.wizardA.status.delayedBank?.spell).toBe('missile');
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    playTurn(st, parseTurn(' ', ' '), parseTurn(' ', ' '), {
      releaseDelayedA: true,
    });
    expect(st.wizardB.damage).toBe(1);
  });

  it('permanency marca il prossimo enchantment idoneo', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    st.wizardA.status.permanencyArmed = 3;
    castInstant('fear', { state: st });
    expect(st.wizardB.status.fear).toBe(true);
    expect(st.wizardB.status.permanent).toContain('fear');
  });

  it('due mind-spell sullo stesso soggetto si annullano', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    preloadPattern(st.wizardA, SPELL_PATTERNS.fear[0]);
    preloadPattern(st.wizardB, SPELL_PATTERNS.amnesia[0]);
    const result = playTurn(st, parseTurn('D', ' '), parseTurn('P', ' '), {
      leftChoiceA: 'fear',
      leftChoiceB: 'amnesia',
      spellTargetA: { left: 'b' },
      spellTargetB: { left: 'b' },
    });
    expect(result.castsA.some((c) => c.spell === 'fear')).toBe(false);
    expect(result.castsB.some((c) => c.spell === 'amnesia')).toBe(false);
    expect(st.wizardB.status.fear).toBe(false);
    expect(st.wizardB.status.amnesia).toBe(false);
  });
});

// --- non-spells -----------------------------------------------------------

describe('non-spells', () => {
  it('stab fa 1, shield blocca', () => {
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    playTurn(st, parseTurn('stab', ' '), parseTurn(' ', ' '));
    expect(st.wizardB.damage).toBe(1);
    playTurn(st, parseTurn('stab', ' '), parseTurn('P', ' '), {
      leftChoiceB: 'shield',
    });
    expect(st.wizardB.damage).toBe(1);
  });

  it('doppia pugnalata: un solo danno e sequenze azzerate', () => {
    // «The wizard only has one knife so can only stab with one hand in any turn»
    const st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    st.wizardA.leftHand.symbols = [{ t: 'single', g: 'S' }];
    st.wizardA.rightHand.symbols = [{ t: 'single', g: 'S' }];
    playTurn(st, parseTurn('stab', 'stab'), parseTurn(' ', ' '));
    expect(st.wizardB.damage).toBe(1);
    expect(st.wizardA.leftHand.symbols).toHaveLength(0);
    expect(st.wizardA.rightHand.symbols).toHaveLength(0);
  });

  it('resa P-P perde; doppia resa = pareggio', () => {
    let st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    playTurn(st, parseTurn('P', 'P'), parseTurn(' ', ' '));
    expect(st.finished).toBe(true);
    expect(st.winnerId).toBe('b');

    st = newGame();
    st.wizardA.status.antiSpellNextTurn = false;
    st.wizardB.status.antiSpellNextTurn = false;
    playTurn(st, parseTurn('P', 'P'), parseTurn('P', 'P'));
    expect(st.finished).toBe(true);
    expect(st.isDraw).toBe(true);
  });
});

describe('regole opzionali', () => {
  it('charm person non può imporre «nulla» salvo regola attiva', () => {
    const state = newGame();
    state.wizardA.status.charmPerson = { controllerId: 'b', hand: 'left' };
    const action = parseTurn('W', 'S');
    const notes = applyPreTurnConstraints(state.wizardA, action, { charmForced: ' ' });
    expect(notes).toContain('charm:rifiutato');
    expect(action.left).toEqual({ kind: 'gesture', gesture: 'W' });

    state.wizardA.status.charmPerson = { controllerId: 'b', hand: 'left' };
    const action2 = parseTurn('W', 'S');
    const notes2 = applyPreTurnConstraints(state.wizardA, action2, {
      charmForced: ' ',
      allowCharmNothing: true,
    });
    expect(notes2).toContain('charm');
    expect(action2.left).toEqual({ kind: 'nothing' });
  });

  it('allowCharmNothing viaggia da createGame allo snapshot', () => {
    const svc = createGameService();
    const snap = svc.createGame({ allowCharmNothing: true });
    expect(snap.rules.allowCharmNothing).toBe(true);
    expect(createGameService().createGame().rules.allowCharmNothing).toBe(false);
  });
});

describe('status helpers', () => {
  it('emptyStatus ha i campi attesi', () => {
    const s = emptyStatus();
    expect(s).toHaveProperty('amnesia');
    expect(s).toHaveProperty('diseaseTurns');
    expect(s).toHaveProperty('delayedBank');
  });

  it('catalogo: ogni spell ha meta e almeno un pattern', () => {
    for (const id of allSpellIds()) {
      expect(SPELL_META[id]).toBeTruthy();
      expect(SPELL_PATTERNS[id]?.length).toBeGreaterThan(0);
    }
  });
});
