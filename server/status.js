/**
 * Full turn resolution + enchantment status for Spellcaster.
 * Inlined into the worker by server/build.js (after shared helpers it needs,
 * or before shared if shared imports these — build concatenates resolve then shared with imports stripped).
 */

export const MIND_GROUP = new Set([
  'amnesia',
  'confusion',
  'charmPerson',
  'charmMonster',
  'paralysis',
  'fear',
]);

export const ENCHANTMENT_SPELLS = new Set([
  ...MIND_GROUP,
  'antiSpell',
  'protectionFromEvil',
  'resistHeat',
  'resistCold',
  'disease',
  'poison',
  'blindness',
  'invisibility',
  'haste',
  'timeStop',
  'delayedEffect',
  'permanency',
]);

export const PERMANENCY_EXCLUDED = new Set([
  'antiSpell',
  'disease',
  'poison',
  'timeStop',
]);

export function emptyStatus() {
  return {
    antiSpellNextTurn: false,
    resistHeat: false,
    resistCold: false,
    protectionFromEvilTurns: 0,
    amnesia: false,
    confusion: false,
    fear: false,
    charmPerson: null, // { controllerId, hand }
    paralysis: null, // { hand: 'left'|'right' }
    diseaseTurns: 0,
    poisonTurns: 0,
    blindnessTurns: 0,
    invisibilityTurns: 0,
    hasteTurns: 0,
    hasteQueued: 0,
    delayedArmed: 0,
    delayedBank: null, // { spell, targetId, handIndex }
    permanencyArmed: 0,
    permanent: [], // spell ids kept forever where meaningful
    lastAction: null, // { left, right } HandAction-like
  };
}

export function clearEnchantments(wizard, { keepResists = false } = {}) {
  const s = wizard.status;
  s.amnesia = false;
  s.confusion = false;
  s.fear = false;
  s.charmPerson = null;
  s.paralysis = null;
  s.diseaseTurns = 0;
  s.poisonTurns = 0;
  s.blindnessTurns = 0;
  s.invisibilityTurns = 0;
  s.hasteTurns = 0;
  s.hasteQueued = 0;
  s.delayedArmed = 0;
  s.delayedBank = null;
  s.permanencyArmed = 0;
  s.permanent = [];
  s.protectionFromEvilTurns = 0;
  s.antiSpellNextTurn = false;
  if (!keepResists) {
    s.resistHeat = false;
    s.resistCold = false;
  }
}

export function statusJson(status) {
  if (!status) return {};
  return {
    antiSpellNextTurn: !!status.antiSpellNextTurn,
    resistHeat: !!status.resistHeat,
    resistCold: !!status.resistCold,
    protectionFromEvilTurns: status.protectionFromEvilTurns || 0,
    amnesia: !!status.amnesia,
    confusion: !!status.confusion,
    fear: !!status.fear,
    charmPerson: status.charmPerson || null,
    paralysis: status.paralysis || null,
    diseaseTurns: status.diseaseTurns || 0,
    poisonTurns: status.poisonTurns || 0,
    blindnessTurns: status.blindnessTurns || 0,
    invisibilityTurns: status.invisibilityTurns || 0,
    hasteTurns: status.hasteTurns || 0,
    hasteQueued: status.hasteQueued || 0,
    delayedArmed: status.delayedArmed || 0,
    delayedBank: status.delayedBank || null,
    permanencyArmed: status.permanencyArmed || 0,
    permanent: status.permanent || [],
    lastAction: status.lastAction
      ? {
          left: handLabelForHistory(status.lastAction.left),
          right: handLabelForHistory(status.lastAction.right),
        }
      : null,
  };
}

const CONFUSION_GESTURES = ['C', 'D', 'F', 'P', 'S', 'W'];

export function randomConfusionGesture() {
  return CONFUSION_GESTURES[Math.floor(Math.random() * CONFUSION_GESTURES.length)];
}

function cloneHand(h) {
  if (!h) return { kind: 'nothing' };
  if (h.kind === 'gesture') return { kind: 'gesture', gesture: h.gesture };
  return { kind: h.kind };
}

/**
 * Rewrite actions under active enchantments before they are recorded.
 * Mutates action in place. Returns notes for the log.
 */
export function applyPreTurnConstraints(wizard, action, opts = {}) {
  const notes = [];
  const s = wizard.status;
  if (!s) return notes;

  // Amnesia: must repeat last gestures
  if (s.amnesia && s.lastAction) {
    action.left = cloneHand(s.lastAction.left);
    action.right = cloneHand(s.lastAction.right);
    notes.push('amnesia');
    s.amnesia = false;
  }

  // Charm person: controller forces one hand (once)
  if (s.charmPerson) {
    if (opts.charmForced) {
      const hand = s.charmPerson.hand || opts.charmHand || 'left';
      const forced = opts.charmForced;
      const parsed =
        forced === 'stab'
          ? { kind: 'stab' }
          : forced === ' ' || forced === 'nothing'
            ? { kind: 'nothing' }
            : forced === 'C' || forced === 'c'
              ? { kind: 'clap' }
              : { kind: 'gesture', gesture: String(forced).toUpperCase() };
      if (hand === 'right') action.right = parsed;
      else action.left = parsed;
      notes.push('charm');
    }
    s.charmPerson = null;
  }

  // Paralysis: lock one hand with remapping
  if (s.paralysis?.hand) {
    const hand = s.paralysis.hand;
    const cur = hand === 'right' ? action.right : action.left;
    let next = cur;
    if (cur.kind === 'clap') next = { kind: 'gesture', gesture: 'F' };
    else if (cur.kind === 'gesture' && cur.gesture === 'S') next = { kind: 'gesture', gesture: 'F' };
    else if (cur.kind === 'gesture' && cur.gesture === 'W') next = { kind: 'gesture', gesture: 'P' };
    if (hand === 'right') action.right = next;
    else action.left = next;
    notes.push('paralysis');
    s.paralysis = null;
  }

  // Fear: forbid C, D, F, S → convert to nothing
  if (s.fear) {
    const ban = (h) => {
      if (h.kind === 'clap') return { kind: 'nothing' };
      if (h.kind === 'gesture' && ['C', 'D', 'F', 'S'].includes(h.gesture)) {
        return { kind: 'nothing' };
      }
      return h;
    };
    action.left = ban(action.left);
    action.right = ban(action.right);
    notes.push('fear');
    s.fear = false;
  }

  // Confusion: replace one random hand with random gesture
  if (s.confusion) {
    const hand = Math.random() < 0.5 ? 'left' : 'right';
    const g = randomConfusionGesture();
    const next =
      g === 'C' ? { kind: 'clap' } : { kind: 'gesture', gesture: g };
    if (hand === 'left') action.left = next;
    else action.right = next;
    notes.push(`confusion:${hand}:${g}`);
    s.confusion = false;
  }

  return notes;
}

export function tickEndOfTurn(state) {
  const deaths = [];
  for (const w of [state.wizardA, state.wizardB]) {
    const s = w.status;
    const permanent = new Set(s.permanent || []);

    if (s.protectionFromEvilTurns > 0 && !permanent.has('protectionFromEvil')) {
      s.protectionFromEvilTurns -= 1;
    }
    if (s.blindnessTurns > 0 && !permanent.has('blindness')) s.blindnessTurns -= 1;
    if (s.invisibilityTurns > 0 && !permanent.has('invisibility')) s.invisibilityTurns -= 1;
    if (s.hasteTurns > 0 && !permanent.has('haste')) s.hasteTurns -= 1;
    if (s.delayedArmed > 0) {
      s.delayedArmed -= 1;
      if (s.delayedArmed <= 0 && !s.delayedBank) s.delayedArmed = 0;
    }
    if (s.permanencyArmed > 0) s.permanencyArmed -= 1;

    if (s.diseaseTurns > 0 && !permanent.has('disease')) {
      s.diseaseTurns -= 1;
      if (s.diseaseTurns <= 0) {
        w.damage = 15;
        deaths.push(w.id);
      }
    }
    if (s.poisonTurns > 0 && !permanent.has('poison')) {
      s.poisonTurns -= 1;
      if (s.poisonTurns <= 0) {
        w.damage = 15;
        deaths.push(w.id);
      }
    }
  }
  return deaths;
}

export function handLabelForHistory(action) {
  if (!action) return '—';
  if (action.kind === 'nothing') return '—';
  if (action.kind === 'stab') return '†';
  if (action.kind === 'clap') return 'C';
  if (action.kind === 'gesture') return action.gesture;
  return '?';
}
