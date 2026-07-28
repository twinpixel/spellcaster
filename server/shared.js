/**
 * Spellcaster core — gesti, buffer mani, catalogo, matching, room service.
 * Inlined nel worker da server/build.js (export rimossi).
 */

export const WIZARD_MAX_DAMAGE = 14;

export const GESTURES = ['F', 'P', 'S', 'W', 'D'];

export const SPELL_META = {
  shield: { name: 'Shield', gestures: 'P', section: 'protection' },
  removeEnchantment: { name: 'Remove enchantment', gestures: 'P-D-W-P', section: 'protection' },
  magicMirror: { name: 'Magic mirror', gestures: 'C-(w', section: 'protection' },
  counterSpell: { name: 'Counter-spell', gestures: 'W-P-P / W-W-S', section: 'protection' },
  dispelMagic: { name: 'Dispel magic', gestures: 'C-D-P-W', section: 'protection' },
  raiseDead: { name: 'Raise dead', gestures: 'D-W-W-F-W-C', section: 'protection' },
  cureLightWounds: { name: 'Cure light wounds', gestures: 'D-F-W', section: 'protection' },
  cureHeavyWounds: { name: 'Cure heavy wounds', gestures: 'D-F-P-W', section: 'protection' },
  summonGoblin: { name: 'Summon goblin', gestures: 'S-F-W', section: 'summons' },
  summonOgre: { name: 'Summon ogre', gestures: 'P-S-F-W', section: 'summons' },
  summonTroll: { name: 'Summon troll', gestures: 'F-P-S-F-W', section: 'summons' },
  summonGiant: { name: 'Summon giant', gestures: 'W-F-P-S-F-W', section: 'summons' },
  summonElemental: { name: 'Summon elemental', gestures: 'C-S-W-W-S', section: 'summons' },
  missile: { name: 'Missile', gestures: 'S-D', section: 'damaging' },
  fingerOfDeath: { name: 'Finger of death', gestures: 'P-W-P-F-S-S-S-D', section: 'damaging' },
  lightningBoltLong: { name: 'Lightning bolt (long)', gestures: 'D-F-F-D-D', section: 'damaging' },
  lightningBoltShort: { name: 'Lightning bolt (short)', gestures: 'W-D-D-C', section: 'damaging' },
  causeLightWounds: { name: 'Cause light wounds', gestures: 'W-F-P', section: 'damaging' },
  causeHeavyWounds: { name: 'Cause heavy wounds', gestures: 'W-P-F-D', section: 'damaging' },
  fireball: { name: 'Fireball', gestures: 'F-S-S-D-D', section: 'damaging' },
  fireStorm: { name: 'Fire storm', gestures: 'S-W-W-C', section: 'damaging' },
  iceStorm: { name: 'Ice storm', gestures: 'W-S-S-C', section: 'damaging' },
  amnesia: { name: 'Amnesia', gestures: 'D-P-P', section: 'enchantment' },
  confusion: { name: 'Confusion', gestures: 'D-S-F', section: 'enchantment' },
  charmPerson: { name: 'Charm person', gestures: 'P-S-D-F', section: 'enchantment' },
  charmMonster: { name: 'Charm monster', gestures: 'P-S-D-D', section: 'enchantment' },
  paralysis: { name: 'Paralysis', gestures: 'F-F-F', section: 'enchantment' },
  fear: { name: 'Fear', gestures: 'S-W-D', section: 'enchantment' },
  antiSpell: { name: 'Anti-spell', gestures: 'S-P-F', section: 'enchantment' },
  protectionFromEvil: { name: 'Protection from evil', gestures: 'W-W-P', section: 'enchantment' },
  resistHeat: { name: 'Resist heat', gestures: 'W-W-F-P', section: 'enchantment' },
  resistCold: { name: 'Resist cold', gestures: 'S-S-F-P', section: 'enchantment' },
  disease: { name: 'Disease', gestures: 'D-S-F-F-F-C', section: 'enchantment' },
  poison: { name: 'Poison', gestures: 'D-W-W-F-W-D', section: 'enchantment' },
  blindness: { name: 'Blindness', gestures: 'D-W-F-F-(d', section: 'enchantment' },
  invisibility: { name: 'Invisibility', gestures: 'P-P-(w-(s', section: 'enchantment' },
  haste: { name: 'Haste', gestures: 'P-W-P-W-W-C', section: 'enchantment' },
  timeStop: { name: 'Time stop', gestures: 'S-P-P-C', section: 'enchantment' },
  delayedEffect: { name: 'Delayed effect', gestures: 'D-W-S-S-S-P', section: 'enchantment' },
  permanency: { name: 'Permanency', gestures: 'S-P-F-P-S-D-W', section: 'enchantment' },
};

/** Pattern steps: 'F'|'P'|… single, 'C' clap, '(w' both-hands. */
const S = (g) => ({ t: 'single', g });
const C = { t: 'clap' };
const B = (g) => ({ t: 'both', g });

export const SPELL_PATTERNS = {
  shield: [[S('P')]],
  removeEnchantment: [[S('P'), S('D'), S('W'), S('P')]],
  magicMirror: [[C, B('W')]],
  counterSpell: [
    [S('W'), S('P'), S('P')],
    [S('W'), S('W'), S('S')],
  ],
  dispelMagic: [[C, S('D'), S('P'), S('W')]],
  raiseDead: [[S('D'), S('W'), S('W'), S('F'), S('W'), C]],
  cureLightWounds: [[S('D'), S('F'), S('W')]],
  cureHeavyWounds: [[S('D'), S('F'), S('P'), S('W')]],
  summonGoblin: [[S('S'), S('F'), S('W')]],
  summonOgre: [[S('P'), S('S'), S('F'), S('W')]],
  summonTroll: [[S('F'), S('P'), S('S'), S('F'), S('W')]],
  summonGiant: [[S('W'), S('F'), S('P'), S('S'), S('F'), S('W')]],
  summonElemental: [[C, S('S'), S('W'), S('W'), S('S')]],
  missile: [[S('S'), S('D')]],
  fingerOfDeath: [[S('P'), S('W'), S('P'), S('F'), S('S'), S('S'), S('S'), S('D')]],
  lightningBoltLong: [[S('D'), S('F'), S('F'), S('D'), S('D')]],
  lightningBoltShort: [[S('W'), S('D'), S('D'), C]],
  causeLightWounds: [[S('W'), S('F'), S('P')]],
  causeHeavyWounds: [[S('W'), S('P'), S('F'), S('D')]],
  fireball: [[S('F'), S('S'), S('S'), S('D'), S('D')]],
  fireStorm: [[S('S'), S('W'), S('W'), C]],
  iceStorm: [[S('W'), S('S'), S('S'), C]],
  amnesia: [[S('D'), S('P'), S('P')]],
  confusion: [[S('D'), S('S'), S('F')]],
  charmPerson: [[S('P'), S('S'), S('D'), S('F')]],
  charmMonster: [[S('P'), S('S'), S('D'), S('D')]],
  paralysis: [[S('F'), S('F'), S('F')]],
  fear: [[S('S'), S('W'), S('D')]],
  antiSpell: [[S('S'), S('P'), S('F')]],
  protectionFromEvil: [[S('W'), S('W'), S('P')]],
  resistHeat: [[S('W'), S('W'), S('F'), S('P')]],
  resistCold: [[S('S'), S('S'), S('F'), S('P')]],
  disease: [[S('D'), S('S'), S('F'), S('F'), S('F'), C]],
  poison: [[S('D'), S('W'), S('W'), S('F'), S('W'), S('D')]],
  blindness: [[S('D'), S('W'), S('F'), S('F'), B('D')]],
  invisibility: [[S('P'), S('P'), B('W'), B('S')]],
  haste: [[S('P'), S('W'), S('P'), S('W'), S('W'), C]],
  timeStop: [[S('S'), S('P'), S('P'), C]],
  delayedEffect: [[S('D'), S('W'), S('S'), S('S'), S('S'), S('P')]],
  permanency: [[S('S'), S('P'), S('F'), S('P'), S('S'), S('D'), S('W')]],
};

export function allSpellIds() {
  return Object.keys(SPELL_META);
}

export function spellListJson() {
  return allSpellIds().map((id) => ({
    id,
    name: SPELL_META[id].name,
    gestures: SPELL_META[id].gestures,
    section: SPELL_META[id].section,
  }));
}

export function parseHand(raw) {
  const t = String(raw ?? '').trim().toLowerCase();
  if (!t || t === '-' || t === 'nothing') return { kind: 'nothing' };
  if (t === 'stab') return { kind: 'stab' };
  if (t === 'c' || t === 'clap') return { kind: 'clap' };
  const upper = String(raw).trim().toUpperCase();
  if (GESTURES.includes(upper)) return { kind: 'gesture', gesture: upper };
  throw new Error(`invalid_gesture: ${raw}`);
}

export function parseTurn(left, right) {
  return { left: parseHand(left), right: parseHand(right) };
}

export function isSurrender(action) {
  return (
    action.left.kind === 'gesture' &&
    action.right.kind === 'gesture' &&
    action.left.gesture === 'P' &&
    action.right.gesture === 'P'
  );
}

export function isClap(action) {
  return action.left.kind === 'clap' && action.right.kind === 'clap';
}

export function bothHands(action, g) {
  return (
    action.left.kind === 'gesture' &&
    action.right.kind === 'gesture' &&
    action.left.gesture === g &&
    action.right.gesture === g
  );
}

export function hasDoubleStab(action) {
  return action.left.kind === 'stab' && action.right.kind === 'stab';
}

function emptyHand() {
  return { symbols: [] };
}

function recordFromAction(hand, handAction, turn) {
  if (handAction.kind === 'stab' || handAction.kind === 'nothing') {
    hand.symbols = [];
    return;
  }
  if (isClap(turn)) {
    if (handAction.kind === 'clap') hand.symbols.push({ t: 'clap' });
    return;
  }
  if (handAction.kind === 'clap') {
    hand.symbols = [];
    return;
  }
  if (handAction.kind === 'gesture') {
    const g = handAction.gesture;
    if (bothHands(turn, g)) hand.symbols.push({ t: 'both', g });
    else hand.symbols.push({ t: 'single', g });
  }
}

function stepMatches(symbol, step) {
  if (step.t === 'single') return symbol.t === 'single' && symbol.g === step.g;
  if (step.t === 'clap') return symbol.t === 'clap';
  if (step.t === 'both') return symbol.t === 'both' && symbol.g === step.g;
  return false;
}

function matchesSuffix(symbols, pattern) {
  if (symbols.length < pattern.length) return false;
  const offset = symbols.length - pattern.length;
  for (let i = 0; i < pattern.length; i++) {
    if (!stepMatches(symbols[offset + i], pattern[i])) return false;
  }
  return true;
}

export function matchHand(hand, handIndex) {
  const results = [];
  for (const id of allSpellIds()) {
    const patterns = SPELL_PATTERNS[id] || [];
    for (let pi = 0; pi < patterns.length; pi++) {
      if (matchesSuffix(hand.symbols, patterns[pi])) {
        results.push({ id, handIndex, patternIndex: pi });
      }
    }
  }
  return results;
}

function chooseSpell(candidates, preferred) {
  if (preferred && candidates.some((c) => c.id === preferred)) return preferred;
  return candidates[0].id;
}

export function detectCasts(wizard, leftChoice, rightChoice) {
  const leftMatches = matchHand(wizard.leftHand, 0);
  const rightMatches = matchHand(wizard.rightHand, 1);
  const casts = [];
  if (leftMatches.length) {
    casts.push({
      spell: chooseSpell(leftMatches, leftChoice),
      casterId: wizard.id,
      handIndex: 0,
    });
  }
  if (rightMatches.length) {
    casts.push({
      spell: chooseSpell(rightMatches, rightChoice),
      casterId: wizard.id,
      handIndex: 1,
    });
  }
  return casts;
}

/** Spells that by default target the opponent (wizard or ordered target). */
const DAMAGING_SPELLS = new Set([
  'missile',
  'fingerOfDeath',
  'lightningBoltLong',
  'lightningBoltShort',
  'causeLightWounds',
  'causeHeavyWounds',
  'fireball',
]);

const SUMMON_SPELLS = {
  summonGoblin: { type: 'goblin', label: 'Goblin', attack: 1, hp: 1 },
  summonOgre: { type: 'ogre', label: 'Ogre', attack: 2, hp: 2 },
  summonTroll: { type: 'troll', label: 'Troll', attack: 3, hp: 3 },
  summonGiant: { type: 'giant', label: 'Giant', attack: 4, hp: 4 },
  summonElemental: { type: 'elemental', label: 'Elemental', attack: 3, hp: 3 },
};

function defaultTarget(spell, casterId, foeId) {
  if (DAMAGING_SPELLS.has(spell) || spell === 'fireStorm' || spell === 'iceStorm') return foeId;
  if (SUMMON_SPELLS[spell]) return casterId; // subject = controller
  return casterId;
}

function applyDamage(wizard, amount) {
  if (amount >= 999) {
    wizard.damage = WIZARD_MAX_DAMAGE + 1;
    return;
  }
  wizard.damage = Math.min(99, wizard.damage + amount);
}

function applyCure(wizard, amount) {
  wizard.damage = Math.max(0, wizard.damage - amount);
}

function wizardById(state, id) {
  if (id === state.wizardA.id) return state.wizardA;
  if (id === state.wizardB.id) return state.wizardB;
  return null;
}

function opponentId(state, id) {
  return id === state.wizardA.id ? state.wizardB.id : state.wizardA.id;
}

function monsterById(state, id) {
  return (state.monsters || []).find((m) => m.id === id) || null;
}

function livingMonsters(state) {
  return (state.monsters || []).filter((m) => m.alive);
}

function nextMonsterId(state) {
  state.monsterSeq = (state.monsterSeq || 0) + 1;
  return `m${state.monsterSeq}`;
}

function createMonster(state, spell, controllerId, elementalType) {
  const def = SUMMON_SPELLS[spell];
  if (!def) return null;
  const isElem = spell === 'summonElemental';
  const type = isElem ? (elementalType === 'ice' ? 'ice' : 'fire') : def.type;
  const label = isElem
    ? (type === 'ice' ? 'Ice Elem' : 'Fire Elem')
    : def.label;
  const monster = {
    id: nextMonsterId(state),
    type,
    label,
    controllerId,
    attack: def.attack,
    hp: def.hp,
    maxHp: def.hp,
    alive: true,
    elementalType: isElem ? type : null,
  };
  state.monsters = state.monsters || [];
  state.monsters.push(monster);
  state.monsterColumns = state.monsterColumns || [];
  state.monsterColumns.push({ id: monster.id, label: monster.label, controllerId });
  return monster;
}

function hurtMonster(monster, amount) {
  if (!monster || !monster.alive) return;
  monster.hp -= amount;
  if (monster.hp <= 0) {
    monster.hp = 0;
    monster.alive = false;
  }
}

function isWizardId(id) {
  return id === 'a' || id === 'b';
}

function resolveTargetHit(state, targetId, amount, shielded, opts = {}) {
  if (!targetId) return;
  if (isWizardId(targetId)) {
    if (!opts.ignoreShield && shielded.has(targetId)) return;
    const w = wizardById(state, targetId);
    if (w) applyDamage(w, amount);
    return;
  }
  const m = monsterById(state, targetId);
  if (m && m.alive) hurtMonster(m, amount);
}

/**
 * Resolve casts, summons, monster attacks, stabs.
 * choices: {
 *   leftChoiceA/B, rightChoiceA/B,
 *   spellTargetA/B: { left?, right? },
 *   monsterOrdersA/B: [{ monsterId, targetId }],
 *   stabTargetA/B,
 *   elementalTypeA/B: 'fire'|'ice',
 * }
 */
export function resolveEffects(state, castsA, castsB, actionA, actionB, choices = {}) {
  const foe = (id) => opponentId(state, id);

  function withTargets(casts, spellTargets, casterId) {
    return casts.map((c) => {
      const handKey = c.handIndex === 0 ? 'left' : 'right';
      const ordered = spellTargets?.[handKey];
      return {
        ...c,
        targetId: ordered || defaultTarget(c.spell, casterId, foe(casterId)),
      };
    });
  }

  const all = [
    ...withTargets(castsA, choices.spellTargetA, state.wizardA.id),
    ...withTargets(castsB, choices.spellTargetB, state.wizardB.id),
  ];
  const active = all.map((c) => ({ ...c, cancelled: false }));

  const hasDispel = active.some((c) => c.spell === 'dispelMagic' && !c.cancelled);
  if (hasDispel) {
    for (const c of active) {
      if (c.spell !== 'dispelMagic') c.cancelled = true;
    }
  }

  const countered = new Set(
    active.filter((c) => c.spell === 'counterSpell' && !c.cancelled).map((c) => c.targetId),
  );
  for (const c of active) {
    if (c.cancelled) continue;
    if (c.spell === 'counterSpell' || c.spell === 'dispelMagic' || c.spell === 'fingerOfDeath') continue;
    if (isWizardId(c.targetId) && countered.has(c.targetId)) c.cancelled = true;
  }

  const mirrored = new Set(
    active.filter((c) => c.spell === 'magicMirror' && !c.cancelled).map((c) => c.targetId),
  );
  for (const c of active) {
    if (c.cancelled) continue;
    if (!['missile', 'lightningBoltLong', 'lightningBoltShort'].includes(c.spell)) continue;
    if (isWizardId(c.targetId) && mirrored.has(c.targetId) && !countered.has(c.targetId)) {
      c.targetId = c.casterId;
    }
  }

  const shielded = new Set();
  for (const c of active) {
    if (c.cancelled) continue;
    if (
      c.spell === 'shield' ||
      c.spell === 'counterSpell' ||
      c.spell === 'dispelMagic' ||
      c.spell === 'protectionFromEvil'
    ) {
      if (isWizardId(c.targetId)) shielded.add(c.targetId);
    }
  }
  for (const w of [state.wizardA, state.wizardB]) {
    if (w.status.protectionFromEvilTurns > 0) shielded.add(w.id);
  }

  const monsterLog = {}; // id -> { label, text }
  for (const m of state.monsters || []) {
    monsterLog[m.id] = { label: m.label, text: m.alive ? '—' : '☠' };
  }

  const pendingSummons = [];
  let destroyAllMonstersAfterAttack = hasDispel;

  for (const c of active) {
    if (c.cancelled) continue;
    const caster = wizardById(state, c.casterId);
    const targetWizard = isWizardId(c.targetId) ? wizardById(state, c.targetId) : null;

    switch (c.spell) {
      case 'missile':
        resolveTargetHit(state, c.targetId, 1, shielded);
        break;
      case 'fingerOfDeath':
        if (isWizardId(c.targetId)) applyDamage(targetWizard, 999);
        else hurtMonster(monsterById(state, c.targetId), 999);
        break;
      case 'lightningBoltLong':
        resolveTargetHit(state, c.targetId, 5, shielded, { ignoreShield: true });
        break;
      case 'lightningBoltShort':
        if (caster && !caster.usedShortLightning) {
          caster.usedShortLightning = true;
          resolveTargetHit(state, c.targetId, 5, shielded, { ignoreShield: true });
        }
        break;
      case 'causeLightWounds':
        resolveTargetHit(state, c.targetId, 2, shielded, { ignoreShield: true });
        break;
      case 'causeHeavyWounds':
        resolveTargetHit(state, c.targetId, 3, shielded, { ignoreShield: true });
        break;
      case 'fireball':
        if (isWizardId(c.targetId)) {
          if (targetWizard && !targetWizard.status.resistHeat) applyDamage(targetWizard, 5);
        } else {
          const m = monsterById(state, c.targetId);
          if (m?.alive) {
            if (m.elementalType === 'ice') hurtMonster(m, 999);
            else hurtMonster(m, 5);
          }
        }
        break;
      case 'fireStorm':
        for (const w of [state.wizardA, state.wizardB]) {
          if (!w.status.resistHeat) applyDamage(w, 5);
        }
        for (const m of livingMonsters(state)) {
          if (m.elementalType === 'ice') hurtMonster(m, 999);
          else if (m.elementalType !== 'fire') hurtMonster(m, 5);
        }
        break;
      case 'iceStorm':
        for (const w of [state.wizardA, state.wizardB]) {
          if (!w.status.resistCold) applyDamage(w, 5);
        }
        for (const m of livingMonsters(state)) {
          if (m.elementalType === 'fire') hurtMonster(m, 999);
          else if (m.elementalType !== 'ice') hurtMonster(m, 5);
        }
        break;
      case 'cureLightWounds':
        if (targetWizard) applyCure(targetWizard, 1);
        break;
      case 'cureHeavyWounds':
        if (targetWizard) applyCure(targetWizard, 2);
        break;
      case 'raiseDead':
        if (targetWizard) {
          if (targetWizard.damage > WIZARD_MAX_DAMAGE) targetWizard.damage = 0;
          else applyCure(targetWizard, 5);
        }
        break;
      case 'resistHeat':
        if (targetWizard) targetWizard.status.resistHeat = true;
        for (const m of livingMonsters(state)) {
          if (m.elementalType === 'fire' && m.controllerId !== c.casterId) {
            // resist heat on caster destroys opposing fire elemental if targeted? rules: on fire elemental destroys it when cast on it
          }
        }
        if (!isWizardId(c.targetId)) {
          const m = monsterById(state, c.targetId);
          if (m?.elementalType === 'fire') hurtMonster(m, 999);
        }
        break;
      case 'resistCold':
        if (targetWizard) targetWizard.status.resistCold = true;
        if (!isWizardId(c.targetId)) {
          const m = monsterById(state, c.targetId);
          if (m?.elementalType === 'ice') hurtMonster(m, 999);
        }
        break;
      case 'protectionFromEvil':
        if (targetWizard) {
          targetWizard.status.protectionFromEvilTurns = 4;
          shielded.add(targetWizard.id);
        }
        break;
      case 'antiSpell':
        if (targetWizard) targetWizard.status.antiSpellNextTurn = true;
        break;
      case 'removeEnchantment':
        if (!isWizardId(c.targetId)) {
          const m = monsterById(state, c.targetId);
          if (m?.alive) {
            // still attacks this turn
            m._dieAfterAttack = true;
          }
        }
        break;
      case 'summonGoblin':
      case 'summonOgre':
      case 'summonTroll':
      case 'summonGiant':
      case 'summonElemental':
        pendingSummons.push(c);
        break;
      case 'dispelMagic':
        destroyAllMonstersAfterAttack = true;
        break;
      default:
        break;
    }
  }

  // Create summons (subject = targetId = controller)
  const newMonsters = [];
  for (const c of pendingSummons) {
    const controllerId = isWizardId(c.targetId) ? c.targetId : c.casterId;
    const elemType =
      c.casterId === state.wizardA.id ? choices.elementalTypeA : choices.elementalTypeB;
    const m = createMonster(state, c.spell, controllerId, elemType || 'fire');
    if (m) {
      newMonsters.push(m);
      monsterLog[m.id] = { label: m.label, text: 'evocato' };
    }
  }

  // Opposing elementals annihilate
  const fires = livingMonsters(state).filter((m) => m.elementalType === 'fire');
  const ices = livingMonsters(state).filter((m) => m.elementalType === 'ice');
  if (fires.length && ices.length) {
    for (const m of [...fires, ...ices]) {
      hurtMonster(m, 999);
      monsterLog[m.id] = { label: m.label, text: 'annullato' };
    }
  }

  function orderTarget(orders, monsterId, controllerId) {
    const hit = (orders || []).find((o) => o.monsterId === monsterId);
    if (hit?.targetId) return hit.targetId;
    return foe(controllerId);
  }

  // Monster attacks (existing + newly summoned), then apply delayed deaths
  for (const m of [...livingMonsters(state)]) {
    const orders =
      m.controllerId === state.wizardA.id ? choices.monsterOrdersA : choices.monsterOrdersB;
    let targetId = orderTarget(orders, m.id, m.controllerId);
    // Newly summoned without explicit order: attack opponent of controller
    if (newMonsters.includes(m) && !(orders || []).some((o) => o.monsterId === m.id)) {
      targetId = foe(m.controllerId);
    }

    // Elemental vs resist
    if (m.elementalType === 'fire' && isWizardId(targetId)) {
      const w = wizardById(state, targetId);
      if (w?.status.resistHeat) {
        monsterLog[m.id] = { label: m.label, text: 'resist' };
        continue;
      }
    }
    if (m.elementalType === 'ice' && isWizardId(targetId)) {
      const w = wizardById(state, targetId);
      if (w?.status.resistCold) {
        monsterLog[m.id] = { label: m.label, text: 'resist' };
        continue;
      }
    }

    if (isWizardId(targetId) && shielded.has(targetId)) {
      monsterLog[m.id] = { label: m.label, text: '🛡' };
      continue;
    }

    resolveTargetHit(state, targetId, m.attack, shielded, { ignoreShield: true });
    const name =
      isWizardId(targetId)
        ? (targetId === state.wizardA.id ? state.wizardA.name : state.wizardB.name)
        : (monsterById(state, targetId)?.label || targetId);
    monsterLog[m.id] = { label: m.label, text: `→${name}` };
  }

  if (destroyAllMonstersAfterAttack) {
    for (const m of livingMonsters(state)) {
      m.alive = false;
      m.hp = 0;
      if (!monsterLog[m.id] || monsterLog[m.id].text === '—' || monsterLog[m.id].text === 'evocato') {
        monsterLog[m.id] = {
          label: m.label,
          text: monsterLog[m.id]?.text === 'evocato' ? 'evocato☠' : 'dispel',
        };
      }
    }
  }
  for (const m of state.monsters || []) {
    if (m._dieAfterAttack) {
      m.alive = false;
      m.hp = 0;
      delete m._dieAfterAttack;
      monsterLog[m.id] = { label: m.label, text: `${monsterLog[m.id]?.text || '—'}☠` };
    }
  }

  // Stab
  function resolveStab(action, attackerId, stabTarget) {
    if (action.left.kind !== 'stab' && action.right.kind !== 'stab') return;
    const targetId = stabTarget || foe(attackerId);
    resolveTargetHit(state, targetId, 1, shielded);
  }
  resolveStab(actionA, state.wizardA.id, choices.stabTargetA);
  resolveStab(actionB, state.wizardB.id, choices.stabTargetB);

  for (const w of [state.wizardA, state.wizardB]) {
    if (w.status.protectionFromEvilTurns > 0) w.status.protectionFromEvilTurns -= 1;
  }

  return {
    casts: active.filter((c) => !c.cancelled).map((c) => ({
      spell: c.spell,
      casterId: c.casterId,
      targetId: c.targetId,
      handIndex: c.handIndex,
    })),
    monsterLog,
  };
}

function createWizard(id, name) {
  return {
    id,
    name,
    damage: 0,
    leftHand: emptyHand(),
    rightHand: emptyHand(),
    usedShortLightning: false,
    status: {
      antiSpellNextTurn: false,
      resistHeat: false,
      resistCold: false,
      protectionFromEvilTurns: 0,
    },
  };
}

export function newGame({ nameA = 'Player A', nameB = 'Player B', allowCharmNothing = false } = {}) {
  const state = {
    turn: 0,
    finished: false,
    winnerId: null,
    isDraw: false,
    rules: { allowCharmNothing: !!allowCharmNothing },
    wizardA: createWizard('a', nameA),
    wizardB: createWizard('b', nameB),
    monsters: [],
    monsterColumns: [],
    monsterSeq: 0,
  };
  for (const w of [state.wizardA, state.wizardB]) {
    w.status.resistHeat = false;
    w.status.resistCold = false;
    w.status.antiSpellNextTurn = true;
    w.leftHand.symbols = [];
    w.rightHand.symbols = [];
  }
  return state;
}

function wizardAlive(w) {
  return w.damage <= WIZARD_MAX_DAMAGE;
}

export function playTurn(state, actionA, actionB, choices = {}) {
  if (state.finished) {
    return { state, castsA: [], castsB: [], monsterLog: {}, message: 'Game already finished' };
  }

  state.turn += 1;

  for (const w of [state.wizardA, state.wizardB]) {
    if (w.status.antiSpellNextTurn) {
      w.leftHand.symbols = [];
      w.rightHand.symbols = [];
      w.status.antiSpellNextTurn = false;
    }
  }

  if (isSurrender(actionA) && isSurrender(actionB)) {
    state.finished = true;
    state.isDraw = true;
    return { state, castsA: [], castsB: [], monsterLog: {}, surrendered: true, draw: true };
  }

  if (!hasDoubleStab(actionA)) {
    recordFromAction(state.wizardA.leftHand, actionA.left, actionA);
    recordFromAction(state.wizardA.rightHand, actionA.right, actionA);
  }
  if (!hasDoubleStab(actionB)) {
    recordFromAction(state.wizardB.leftHand, actionB.left, actionB);
    recordFromAction(state.wizardB.rightHand, actionB.right, actionB);
  }

  // Attach per-hand spell targets onto cast detection choices via resolveEffects
  const castsA = detectCasts(state.wizardA, choices.leftChoiceA, choices.rightChoiceA);
  const castsB = detectCasts(state.wizardB, choices.leftChoiceB, choices.rightChoiceB);

  const { casts: resolved, monsterLog } = resolveEffects(
    state,
    castsA,
    castsB,
    actionA,
    actionB,
    choices,
  );
  const resolvedA = resolved.filter((c) => c.casterId === state.wizardA.id);
  const resolvedB = resolved.filter((c) => c.casterId === state.wizardB.id);

  const deadA = !wizardAlive(state.wizardA);
  const deadB = !wizardAlive(state.wizardB);
  if (deadA && deadB) {
    state.finished = true;
    state.isDraw = true;
  } else if (deadA) {
    state.finished = true;
    state.winnerId = state.wizardB.id;
  } else if (deadB) {
    state.finished = true;
    state.winnerId = state.wizardA.id;
  } else if (isSurrender(actionA)) {
    state.finished = true;
    state.winnerId = state.wizardB.id;
  } else if (isSurrender(actionB)) {
    state.finished = true;
    state.winnerId = state.wizardA.id;
  }

  return { state, castsA: resolvedA, castsB: resolvedB, monsterLog };
}

function wizardJson(w) {
  return {
    id: w.id,
    name: w.name,
    damage: w.damage,
    alive: wizardAlive(w),
    usedShortLightning: w.usedShortLightning,
    leftGestures: w.leftHand.symbols.length,
    rightGestures: w.rightHand.symbols.length,
  };
}

function monsterJson(m) {
  return {
    id: m.id,
    type: m.type,
    label: m.label,
    controllerId: m.controllerId,
    attack: m.attack,
    hp: m.hp,
    maxHp: m.maxHp,
    alive: m.alive,
    elementalType: m.elementalType,
  };
}

function handActionLabel(action) {
  if (!action) return '—';
  if (action.kind === 'nothing') return '—';
  if (action.kind === 'stab') return '†';
  if (action.kind === 'clap') return 'C';
  if (action.kind === 'gesture') return action.gesture;
  return '?';
}

function historyEntry(turn, actionA, actionB, casts, monsterLog, monsterColumns) {
  const monsters = {};
  for (const col of monsterColumns || []) {
    monsters[col.id] = monsterLog?.[col.id] || { label: col.label, text: '—' };
  }
  return {
    turn,
    a: { left: handActionLabel(actionA.left), right: handActionLabel(actionA.right) },
    b: { left: handActionLabel(actionB.left), right: handActionLabel(actionB.right) },
    casts: (casts || []).map((c) => ({
      spell: c.spell,
      casterId: c.casterId,
      targetId: c.targetId,
      handIndex: c.handIndex,
    })),
    monsters,
  };
}

export function createRoom(id, opts = {}) {
  return {
    id,
    state: newGame(opts),
    submitted: {},
    lastTurnCasts: [],
    history: [],
    joined: { a: true, b: false },
  };
}

export function snapshot(room) {
  const s = room.state;
  const submitted = Object.keys(room.submitted || {});
  return {
    id: room.id,
    turn: s.turn,
    finished: s.finished,
    winnerId: s.winnerId,
    isDraw: s.isDraw,
    players: {
      [s.wizardA.id]: wizardJson(s.wizardA),
      [s.wizardB.id]: wizardJson(s.wizardB),
    },
    monsters: (s.monsters || []).map(monsterJson),
    monsterColumns: s.monsterColumns || [],
    rules: { allowCharmNothing: s.rules.allowCharmNothing },
    joined: {
      a: !!(room.joined && room.joined.a),
      b: !!(room.joined && room.joined.b),
    },
    pendingTurn: submitted.length
      ? { submitted, waitingFor: submitted.includes('a') ? (submitted.includes('b') ? [] : ['b']) : ['a'] }
      : undefined,
    lastTurnCasts: room.lastTurnCasts || [],
    history: [...(room.history || [])].reverse(),
  };
}

export function joinRoom(room, playerId, name) {
  if (playerId !== 'a' && playerId !== 'b') throw new Error('invalid_player');
  room.joined = room.joined || { a: false, b: false };
  room.joined[playerId] = true;
  if (name && typeof name === 'string') {
    const w = playerId === 'a' ? room.state.wizardA : room.state.wizardB;
    w.name = name.trim().slice(0, 40) || w.name;
  }
  return snapshot(room);
}

export function submitTurnToRoom(room, payload = {}) {
  const {
    playerId,
    left,
    right,
    leftSpell,
    rightSpell,
    spellTargets,
    monsterOrders,
    stabTarget,
    elementalType,
  } = payload;

  if (room.state.finished) throw new Error('game_finished');
  if (playerId !== 'a' && playerId !== 'b') throw new Error('invalid_player');
  if (room.submitted[playerId]) throw new Error('already_submitted');

  const action = parseTurn(left, right);
  room.submitted[playerId] = {
    action,
    spellTargets: spellTargets || {},
    monsterOrders: monsterOrders || [],
    stabTarget: stabTarget || null,
    elementalType: elementalType || null,
    leftSpell: leftSpell || null,
    rightSpell: rightSpell || null,
  };
  room.lastTurnCasts = [];
  room.joined = room.joined || { a: false, b: false };
  room.joined[playerId] = true;

  const ids = [room.state.wizardA.id, room.state.wizardB.id];
  if (!room.submitted[ids[0]] || !room.submitted[ids[1]]) {
    return snapshot(room);
  }

  const subA = room.submitted[ids[0]];
  const subB = room.submitted[ids[1]];
  room.submitted = {};

  const result = playTurn(room.state, subA.action, subB.action, {
    leftChoiceA: subA.leftSpell,
    rightChoiceA: subA.rightSpell,
    leftChoiceB: subB.leftSpell,
    rightChoiceB: subB.rightSpell,
    spellTargetA: subA.spellTargets,
    spellTargetB: subB.spellTargets,
    monsterOrdersA: subA.monsterOrders,
    monsterOrdersB: subB.monsterOrders,
    stabTargetA: subA.stabTarget,
    stabTargetB: subB.stabTarget,
    elementalTypeA: subA.elementalType,
    elementalTypeB: subB.elementalType,
  });
  room.lastTurnCasts = [...result.castsA, ...result.castsB];
  room.history = room.history || [];
  room.history.push(
    historyEntry(
      room.state.turn,
      subA.action,
      subB.action,
      room.lastTurnCasts,
      result.monsterLog,
      room.state.monsterColumns,
    ),
  );
  return snapshot(room);
}

/** In-memory multi-room service (tests / fallback senza DO). */
export function createGameService() {
  const games = new Map();

  function createGame(opts = {}) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const room = createRoom(id, opts);
    games.set(id, room);
    return snapshot(room);
  }

  function getGame(id) {
    const room = games.get(id);
    return room ? snapshot(room) : null;
  }

  function joinGame(id, playerId, name) {
    const room = games.get(id);
    if (!room) throw new Error('not_found');
    return joinRoom(room, playerId, name);
  }

  function submitTurn(id, payload) {
    const room = games.get(id);
    if (!room) throw new Error('not_found');
    return submitTurnToRoom(room, payload);
  }

  return { createGame, getGame, joinGame, submitTurn, _games: games };
}

export function isSameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...extraHeaders,
    },
  });
}

export function textResponse(text, status = 200) {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
