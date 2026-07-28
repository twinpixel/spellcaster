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
      targetId: wizard.id,
      handIndex: 0,
    });
  }
  if (rightMatches.length) {
    casts.push({
      spell: chooseSpell(rightMatches, rightChoice),
      casterId: wizard.id,
      targetId: wizard.id,
      handIndex: 1,
    });
  }
  return casts;
}

function createWizard(id, name) {
  return {
    id,
    name,
    damage: 0,
    leftHand: emptyHand(),
    rightHand: emptyHand(),
    usedShortLightning: false,
    status: { antiSpellNextTurn: false, resistHeat: false, resistCold: false },
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
    return { state, castsA: [], castsB: [], message: 'Game already finished' };
  }

  state.turn += 1;

  if (isSurrender(actionA) && isSurrender(actionB)) {
    state.finished = true;
    state.isDraw = true;
    return { state, castsA: [], castsB: [], surrendered: true, draw: true };
  }

  if (!hasDoubleStab(actionA)) {
    recordFromAction(state.wizardA.leftHand, actionA.left, actionA);
    recordFromAction(state.wizardA.rightHand, actionA.right, actionA);
  }
  if (!hasDoubleStab(actionB)) {
    recordFromAction(state.wizardB.leftHand, actionB.left, actionB);
    recordFromAction(state.wizardB.rightHand, actionB.right, actionB);
  }

  const castsA = detectCasts(state.wizardA, choices.leftChoiceA, choices.rightChoiceA);
  const castsB = detectCasts(state.wizardB, choices.leftChoiceB, choices.rightChoiceB);

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

  return { state, castsA, castsB };
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

function handActionLabel(action) {
  if (!action) return '—';
  if (action.kind === 'nothing') return '—';
  if (action.kind === 'stab') return '†';
  if (action.kind === 'clap') return 'C';
  if (action.kind === 'gesture') return action.gesture;
  return '?';
}

function historyEntry(turn, actionA, actionB, casts) {
  return {
    turn,
    a: { left: handActionLabel(actionA.left), right: handActionLabel(actionA.right) },
    b: { left: handActionLabel(actionB.left), right: handActionLabel(actionB.right) },
    casts: (casts || []).map((c) => ({
      spell: c.spell,
      casterId: c.casterId,
      handIndex: c.handIndex,
    })),
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
    rules: { allowCharmNothing: s.rules.allowCharmNothing },
    joined: {
      a: !!(room.joined && room.joined.a),
      b: !!(room.joined && room.joined.b),
    },
    pendingTurn: submitted.length
      ? { submitted, waitingFor: submitted.includes('a') ? (submitted.includes('b') ? [] : ['b']) : ['a'] }
      : undefined,
    lastTurnCasts: room.lastTurnCasts || [],
    // newest first for the UI scroll list
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

export function submitTurnToRoom(room, { playerId, left, right, leftSpell, rightSpell } = {}) {
  if (room.state.finished) throw new Error('game_finished');
  if (playerId !== 'a' && playerId !== 'b') throw new Error('invalid_player');
  if (room.submitted[playerId]) throw new Error('already_submitted');

  const action = parseTurn(left, right);
  room.submitted[playerId] = action;
  room.lastTurnCasts = [];
  room.joined = room.joined || { a: false, b: false };
  room.joined[playerId] = true;

  const ids = [room.state.wizardA.id, room.state.wizardB.id];
  if (!room.submitted[ids[0]] || !room.submitted[ids[1]]) {
    return snapshot(room);
  }

  const a = room.submitted[ids[0]];
  const b = room.submitted[ids[1]];
  room.submitted = {};

  const result = playTurn(room.state, a, b, {
    leftChoiceA: leftSpell || null,
    rightChoiceA: rightSpell || null,
  });
  room.lastTurnCasts = [...result.castsA, ...result.castsB];
  room.history = room.history || [];
  room.history.push(historyEntry(room.state.turn, a, b, room.lastTurnCasts));
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
