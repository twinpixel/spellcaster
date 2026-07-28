'use strict';

const HAND_OPTIONS = [
  { code: 'F', label: 'F', title: 'Dita', img: 'img/fingers.jpg' },
  { code: 'P', label: 'P', title: 'Palmo', img: 'img/palm.jpg' },
  { code: 'S', label: 'S', title: 'Snap', img: 'img/snap.jpg' },
  { code: 'W', label: 'W', title: 'Onda', img: 'img/wave.jpg' },
  { code: 'D', label: 'D', title: 'Dito', img: 'img/finger.jpg' },
  { code: 'C', label: 'C', title: 'Clap', img: 'img/clap.jpg' },
  { code: 'stab', label: '†', title: 'Stab', img: 'img/stab.jpg' },
  { code: ' ', label: '—', title: 'Nulla', img: 'img/nulla.jpg' },
];

const GESTURE_BY_LABEL = Object.fromEntries(
  HAND_OPTIONS.map((o) => [o.label, o]),
);
// History uses same labels as handActionLabel on server
GESTURE_BY_LABEL['†'] = HAND_OPTIONS.find((o) => o.code === 'stab');
GESTURE_BY_LABEL['C'] = HAND_OPTIONS.find((o) => o.code === 'C');
GESTURE_BY_LABEL['—'] = HAND_OPTIONS.find((o) => o.code === ' ');


const SESSION_KEY = 'spellcaster.session';
const NICK_KEY = 'spellcaster.nickname';

const state = {
  view: 'welcome', // welcome | nick | duel | spells
  game: null,
  playerId: 'a',
  left: null,
  right: null,
  left2: null,
  right2: null,
  loading: false,
  error: null,
  spells: null,
  solo: false,
  waitingSubmit: false,
  pendingJoinId: null,
  /** @type {Record<string, string>} monsterId -> targetId */
  monsterTargets: {},
  stabTarget: null,
  spellTargetLeft: null,
  spellTargetRight: null,
  elementalType: 'fire',
  charmHand: 'left',
  paralysisHand: 'left',
  charmForced: 'P',
  releaseDelayed: false,
  /** @type {{ queue: string[][], spell: string|null, self: boolean }|null} */
  aiPlan: null,
};

let pollTimer = null;

const app = document.getElementById('app');
const titleEl = document.getElementById('appbar-title');
const leftBar = document.getElementById('appbar-left');
const rightBar = document.getElementById('appbar-right');
const toastEl = document.getElementById('toast');

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function handLabel(code) {
  if (code == null) return '—';
  const o = HAND_OPTIONS.find((x) => x.code === code);
  return o ? o.label : code;
}

function handTitle(code) {
  if (code == null) return 'non scelta';
  const o = HAND_OPTIONS.find((x) => x.code === code);
  return o ? `${o.label} · ${o.title}` : code;
}

function gestureThumb(codeOrLabel, { selected = false, compact = false } = {}) {
  const byCode = HAND_OPTIONS.find((x) => x.code === codeOrLabel);
  const o = byCode || GESTURE_BY_LABEL[codeOrLabel] || null;
  const cls = `gesture-thumb${compact ? ' compact' : ''}${selected ? ' selected' : ''}${o?.img ? '' : ' empty'}`;
  if (!o) {
    return `<span class="${cls}" title="${escapeHtml(String(codeOrLabel))}"><span class="gesture-letter">${escapeHtml(String(codeOrLabel))}</span></span>`;
  }
  if (o.img) {
    return `<span class="${cls}" title="${escapeHtml(o.title)}"><img src="${o.img}" alt="${escapeHtml(o.title)}" /><span class="gesture-letter">${escapeHtml(o.label)}</span></span>`;
  }
  return `<span class="${cls}" title="${escapeHtml(o.title)}"><span class="gesture-letter">${escapeHtml(o.label)}</span></span>`;
}

function saveSession() {
  if (!state.game) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    gameId: state.game.id,
    playerId: state.playerId,
    solo: state.solo,
  }));
}

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function getNickname() {
  try {
    return (localStorage.getItem(NICK_KEY) || '').trim();
  } catch {
    return '';
  }
}

function setNickname(nick) {
  const clean = String(nick || '').trim().slice(0, 24);
  try {
    if (clean) localStorage.setItem(NICK_KEY, clean);
  } catch {
    // ignore quota / private mode
  }
  return clean;
}

function requireNickname() {
  const nick = getNickname();
  if (nick) return nick;
  state.error = 'Scegli un nickname prima di entrare.';
  render();
  return null;
}

function inviteUrl(gameId) {
  const u = new URL(location.href);
  u.search = '';
  u.hash = '';
  u.searchParams.set('join', gameId);
  return u.toString();
}

function parseJoinFromUrl() {
  const params = new URLSearchParams(location.search);
  return params.get('join');
}

function clearJoinFromUrl() {
  const u = new URL(location.href);
  if (!u.searchParams.has('join')) return;
  u.searchParams.delete('join');
  history.replaceState({}, '', u.pathname + u.search + u.hash);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) throw new Error(data?.error || res.statusText || 'request_failed');
  return data;
}

/** Poll solo quando serve un aggiornamento dall’altro giocatore.
 *  Su Cloudflare Worker/DO non c’è comunque nulla “sempre acceso”:
 *  rispondono solo alle richieste e poi tornano idle. */
function needsPoll() {
  if (!state.game || state.solo || state.game.finished) return false;
  if (state.playerId === 'a' && !opponentJoined()) return true; // attesa ingresso B
  if (iAmWaiting()) return true; // attesa turno avversario
  return false;
}

function stopPoll() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function schedulePoll(delayMs = 2000) {
  stopPoll();
  if (!needsPoll()) return;
  pollTimer = setTimeout(async () => {
    pollTimer = null;
    await refreshGame();
    if (needsPoll()) schedulePoll(2000);
  }, delayMs);
}

function syncPoll() {
  if (needsPoll()) schedulePoll(iAmWaiting() ? 1500 : 2500);
  else stopPoll();
}

function iAmWaiting() {
  const g = state.game;
  if (!g || g.finished) return false;
  const pending = g.pendingTurn;
  if (!pending) return false;
  return (pending.submitted || []).includes(state.playerId);
}

function opponentJoined() {
  const g = state.game;
  if (!g) return false;
  if (state.playerId === 'a') return !!g.joined?.b;
  return !!g.joined?.a;
}

async function refreshGame() {
  if (!state.game) return;
  try {
    const prevTurn = state.game.turn;
    const prevCasts = JSON.stringify(state.game.lastTurnCasts || []);
    const prevJoined = !!state.game.joined?.b;
    const game = await api(`/games/${encodeURIComponent(state.game.id)}`);
    state.game = game;
    if (iAmWaiting()) state.waitingSubmit = true;
    else if (game.turn !== prevTurn || JSON.stringify(game.lastTurnCasts || []) !== prevCasts) {
      state.waitingSubmit = false;
      state.left = null;
      state.right = null;
      if (game.lastTurnCasts?.length) {
        toast(`Incantesimi: ${game.lastTurnCasts.map((c) => c.spell).join(', ')}`);
      }
    }
    if (state.playerId === 'a' && !prevJoined && game.joined?.b) {
      toast(`${state.game.players?.b?.name || 'Secondo giocatore'} è entrato`);
    }
    saveSession();
    render();
  } catch {
    // rete momentanea: riprova al prossimo tick
  }
}

async function createGame({ solo = false } = {}) {
  const nick = requireNickname();
  if (!nick) return;
  state.loading = true;
  state.error = null;
  state.aiPlan = null;
  render();
  try {
    let game = await api('/games', {
      method: 'POST',
      body: JSON.stringify({
        playerA: nick,
        playerB: solo ? 'IA' : '…',
      }),
    });
    if (solo) {
      game = await api(`/games/${encodeURIComponent(game.id)}/join`, {
        method: 'POST',
        body: JSON.stringify({ playerId: 'b', name: 'IA' }),
      });
    }
    state.game = game;
    state.playerId = 'a';
    state.solo = solo;
    state.left = null;
    state.right = null;
    state.waitingSubmit = false;
    state.pendingJoinId = null;
    state.view = 'duel';
    saveSession();
    clearJoinFromUrl();
    syncPoll();
  } catch (e) {
    state.error = String(e.message || e);
  } finally {
    state.loading = false;
    render();
  }
}

async function joinGame(gameId) {
  const nick = getNickname();
  if (!nick) {
    state.pendingJoinId = gameId;
    state.view = 'nick';
    state.error = null;
    render();
    return;
  }
  state.loading = true;
  state.error = null;
  render();
  try {
    const game = await api(`/games/${encodeURIComponent(gameId)}/join`, {
      method: 'POST',
      body: JSON.stringify({ playerId: 'b', name: nick }),
    });
    state.game = game;
    state.playerId = 'b';
    state.solo = false;
    state.left = null;
    state.right = null;
    state.waitingSubmit = false;
    state.pendingJoinId = null;
    state.view = 'duel';
    saveSession();
    clearJoinFromUrl();
    syncPoll();
    toast('Sei entrato nella partita');
  } catch (e) {
    state.error = String(e.message || e);
    state.view = 'welcome';
    state.pendingJoinId = null;
  } finally {
    state.loading = false;
    render();
  }
}

async function resumeSession() {
  const joinId = parseJoinFromUrl();
  if (joinId) {
    await joinGame(joinId);
    return;
  }
  const sess = loadSession();
  if (!sess?.gameId) return;
  try {
    const game = await api(`/games/${encodeURIComponent(sess.gameId)}`);
    state.game = game;
    state.playerId = sess.playerId === 'b' ? 'b' : 'a';
    state.solo = !!sess.solo;
    state.view = 'duel';
    state.waitingSubmit = iAmWaiting();
    syncPoll();
    render();
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

/** Piano IA debole: spell facili, tanti pass/errori, niente combo letali. */
const AI_WEAK_SPELLS = [
  { id: 'shield', steps: [['P', ' ']] },
  { id: 'missile', steps: [['S', ' '], ['D', ' ']] },
  { id: 'causeLightWounds', steps: [['W', ' '], ['F', ' '], ['P', ' ']] },
  { id: 'summonGoblin', steps: [['S', ' '], ['F', ' '], ['W', ' ']] },
  { id: 'fear', steps: [['S', ' '], ['W', ' '], ['D', ' ']] },
  { id: 'cureLightWounds', steps: [['D', ' '], ['F', ' '], ['W', ' ']], self: true },
  { id: 'amnesia', steps: [['D', ' '], ['P', ' '], ['P', ' ']] },
];

const AI_GESTURES = ['F', 'P', 'S', 'W', 'D', ' '];

function aiSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function aiRandomPair() {
  const left = AI_GESTURES[Math.floor(Math.random() * AI_GESTURES.length)];
  let right = AI_GESTURES[Math.floor(Math.random() * AI_GESTURES.length)];
  // evita resa accidentale troppo spesso
  if (left === 'P' && right === 'P' && Math.random() < 0.85) right = ' ';
  return { left, right };
}

function aiPickTurn(game) {
  const aiId = 'b';
  const humanId = 'a';
  if (!state.aiPlan) state.aiPlan = { queue: [], spell: null, self: false };

  const plan = state.aiPlan;
  const st = game.players?.[aiId]?.status || {};

  // Fear / amnesia: lascia al server; l’IA prova comunque gesti banali
  if (!plan.queue.length) {
    const roll = Math.random();
    if (st.diseaseTurns > 0 || st.poisonTurns > 0 || (game.players[aiId]?.damage || 0) >= 8) {
      // un po’ più incline a curarsi
      if (Math.random() < 0.55) {
        const cure = AI_WEAK_SPELLS.find((s) => s.id === 'cureLightWounds');
        plan.queue = cure.steps.map((s) => [...s]);
        plan.spell = cure.id;
        plan.self = true;
      }
    } else if (roll < 0.28) {
      return { left: ' ', right: ' ' };
    } else if (roll < 0.38) {
      return { left: 'stab', right: ' ', stabTarget: humanId };
    } else if (roll < 0.52) {
      return aiRandomPair();
    } else {
      const spell = AI_WEAK_SPELLS[Math.floor(Math.random() * AI_WEAK_SPELLS.length)];
      plan.queue = spell.steps.map((s) => [...s]);
      plan.spell = spell.id;
      plan.self = !!spell.self;
      // 15% di “sbagliare” il piano a metà: lascia coda corta
      if (Math.random() < 0.15 && plan.queue.length > 1) {
        plan.queue = plan.queue.slice(0, 1);
        plan.spell = null;
      }
    }
  }

  if (!plan.queue.length) return { left: ' ', right: ' ' };

  const step = plan.queue.shift();
  const last = plan.queue.length === 0;
  const payload = {
    left: step[0],
    right: step[1],
  };
  if (last && plan.spell) {
    payload.leftSpell = plan.spell;
    payload.spellTargets = {
      left: plan.self ? aiId : humanId,
      right: plan.self ? aiId : humanId,
    };
  }
  // 10% confonde le mani
  if (Math.random() < 0.1 && payload.left !== 'C') {
    const t = payload.left;
    payload.left = payload.right;
    payload.right = t;
  }

  const monsters = (game.monsters || []).filter((m) => m.alive && m.controllerId === aiId);
  if (monsters.length) {
    payload.monsterOrders = monsters.map((m) => ({
      monsterId: m.id,
      targetId: humanId,
    }));
  }
  if (payload.left === 'stab' || payload.right === 'stab') {
    payload.stabTarget = humanId;
  }
  return payload;
}

async function autoPlayAi(game) {
  const pending = game?.pendingTurn;
  if (!pending?.waitingFor?.length) return game;
  const opponent = pending.waitingFor[0];
  if (opponent === state.playerId) return game;

  await aiSleep(450 + Math.floor(Math.random() * 550));
  const turn = aiPickTurn(game);
  return api(`/games/${encodeURIComponent(game.id)}/turn`, {
    method: 'POST',
    body: JSON.stringify({ playerId: opponent, ...turn }),
  });
}

async function switchToAiOpponent() {
  if (!state.game || state.solo) return;
  state.loading = true;
  state.error = null;
  render();
  try {
    const game = await api(`/games/${encodeURIComponent(state.game.id)}/join`, {
      method: 'POST',
      body: JSON.stringify({ playerId: 'b', name: 'IA' }),
    });
    state.game = game;
    state.solo = true;
    state.aiPlan = null;
    saveSession();
    toast('Partita contro IA');
    syncPoll();
  } catch (e) {
    state.error = String(e.message || e);
  } finally {
    state.loading = false;
    render();
  }
}

function myMonsters(game = state.game) {
  return (game?.monsters || []).filter((m) => m.alive && m.controllerId === state.playerId);
}

function oppId() {
  return state.playerId === 'a' ? 'b' : 'a';
}

function playerName(id, game = state.game) {
  const p = game?.players?.[id];
  if (p?.name) return p.name;
  return id === 'a' ? 'Giocatore A' : 'Giocatore B';
}

/** Nome corto per colonne strette (storico). */
function shortName(id, game = state.game) {
  const n = playerName(id, game).trim();
  if (n.length <= 8) return n;
  return `${n.slice(0, 7)}…`;
}

function targetOptions() {
  const g = state.game;
  if (!g) return [];
  const other = oppId();
  const opts = [
    { id: other, label: playerName(other, g) },
    { id: state.playerId, label: playerName(state.playerId, g) },
  ];
  for (const m of g.monsters || []) {
    if (!m.alive) continue;
    opts.push({
      id: m.id,
      label: `${m.label} (${playerName(m.controllerId, g)}) ${m.hp}/${m.maxHp}`,
    });
  }
  return opts;
}

function ensureDefaultTargets() {
  const other = oppId();
  if (!state.stabTarget) state.stabTarget = other;
  if (!state.spellTargetLeft) state.spellTargetLeft = other;
  if (!state.spellTargetRight) state.spellTargetRight = other;
  for (const m of myMonsters()) {
    if (!state.monsterTargets[m.id]) state.monsterTargets[m.id] = other;
  }
  // Amnesia: show forced gestures from last turn
  const st = myStatus();
  if (st.amnesia && st.lastAction) {
    const map = { '—': ' ', '†': 'stab', C: 'C' };
    const toCode = (lab) => map[lab] || lab;
    if (state.left == null) state.left = toCode(st.lastAction.left);
    if (state.right == null) state.right = toCode(st.lastAction.right);
  }
}

function myStatus() {
  return state.game?.players?.[state.playerId]?.status || {};
}

function oppStatus() {
  return state.game?.players?.[oppId()]?.status || {};
}

function statusBadges(st, { mine = false } = {}) {
  if (!st) return '';
  const badges = [];
  if (st.resistHeat) badges.push(['Resist heat', 'ok']);
  if (st.resistCold) badges.push(['Resist cold', 'ok']);
  if (st.protectionFromEvilTurns > 0) badges.push([`Prot. evil ${st.protectionFromEvilTurns}`, 'ok']);
  if (st.amnesia) badges.push(['Amnesia', 'warn']);
  if (st.confusion) badges.push(['Confusion', 'warn']);
  if (st.fear) badges.push(['Fear', 'warn']);
  if (st.charmPerson) badges.push([mine ? 'Charmed' : 'Charm attivo', 'warn']);
  if (st.paralysis) badges.push([`Paralisi ${st.paralysis.hand === 'right' ? 'DX' : 'SX'}`, 'warn']);
  if (st.diseaseTurns > 0) badges.push([`Disease ${st.diseaseTurns}`, 'bad']);
  if (st.poisonTurns > 0) badges.push([`Poison ${st.poisonTurns}`, 'bad']);
  if (st.blindnessTurns > 0) badges.push([`Blind ${st.blindnessTurns}`, 'warn']);
  if (st.invisibilityTurns > 0) badges.push([`Invis ${st.invisibilityTurns}`, 'ok']);
  if (st.hasteTurns > 0) badges.push([`Haste ${st.hasteTurns}`, 'ok']);
  if (st.delayedArmed > 0) badges.push([`Delayed ${st.delayedArmed}`, 'ok']);
  if (st.delayedBank) badges.push([`Banca: ${st.delayedBank.spell}`, 'ok']);
  if (st.permanencyArmed > 0) badges.push([`Permanency ${st.permanencyArmed}`, 'ok']);
  if (st.antiSpellNextTurn) badges.push(['Anti-spell', 'warn']);
  if (!badges.length) return '';
  return `<div class="status-badges">${badges.map(([t, k]) => `<span class="sbadge ${k}">${escapeHtml(t)}</span>`).join('')}</div>`;
}

function fearBlocks(code) {
  return ['C', 'D', 'F', 'S'].includes(code);
}

function controllingCharm() {
  const opp = oppStatus();
  return !!(opp.charmPerson && opp.charmPerson.controllerId === state.playerId);
}

function iAmCharmed() {
  const me = myStatus();
  return !!(me.charmPerson && me.charmPerson.controllerId !== state.playerId);
}

function buildTurnPayload() {
  ensureDefaultTargets();
  const monsterOrders = myMonsters().map((m) => ({
    monsterId: m.id,
    targetId: state.monsterTargets[m.id] || (state.playerId === 'a' ? 'b' : 'a'),
  }));
  const payload = {
    playerId: state.playerId,
    left: state.left,
    right: state.right,
    spellTargets: {
      left: state.spellTargetLeft,
      right: state.spellTargetRight,
    },
    monsterOrders,
    stabTarget: state.stabTarget,
    elementalType: state.elementalType,
    charmHand: state.charmHand,
    paralysisHand: state.paralysisHand,
    releaseDelayed: !!state.releaseDelayed,
  };
  if (myStatus().hasteTurns > 0 && state.left2 != null && state.right2 != null) {
    payload.left2 = state.left2;
    payload.right2 = state.right2;
  }
  if (controllingCharm()) {
    payload.charmForced = state.charmForced;
  }
  return payload;
}

async function endTurn() {
  if (!state.game || state.left == null || state.right == null) return;

  const prompts = collectTurnPrompts();
  if (prompts.length) {
    const ok = await showOrdersModal(prompts);
    if (!ok) return;
  }

  state.loading = true;
  state.error = null;
  render();
  try {
    let game = await api(`/games/${encodeURIComponent(state.game.id)}/turn`, {
      method: 'POST',
      body: JSON.stringify(buildTurnPayload()),
    });
    if (state.solo) game = await autoPlayAi(game);
    state.game = game;
    if (game.pendingTurn) {
      state.waitingSubmit = true;
    } else {
      state.waitingSubmit = false;
      state.left = null;
      state.right = null;
      state.left2 = null;
      state.right2 = null;
      state.releaseDelayed = false;
      state.monsterTargets = {};
      ensureDefaultTargets();
      if (game.lastTurnCasts?.length) {
        toast(`Incantesimi: ${game.lastTurnCasts.map((c) => c.spell).join(', ')}`);
      }
      const myNew = (game.monsters || []).filter((m) => m.alive && m.controllerId === state.playerId);
      if (myNew.length) toast(`Creature: ${myNew.map((m) => m.label).join(', ')}`);
    }
    saveSession();
    syncPoll();
  } catch (e) {
    state.error = String(e.message || e);
  } finally {
    state.loading = false;
    render();
  }
}

async function copyInvite() {
  if (!state.game) return;
  const url = inviteUrl(state.game.id);
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copiato');
  } catch {
    prompt('Copia questo link e passalo all’avversario:', url);
  }
}

async function loadSpells() {
  if (state.spells) return;
  try {
    state.spells = await api('/spells');
  } catch {
    state.spells = [];
  }
}

async function restartNewGame() {
  const solo = state.solo;
  stopPoll();
  state.game = null;
  state.left = null;
  state.right = null;
  state.waitingSubmit = false;
  state.error = null;
  sessionStorage.removeItem(SESSION_KEY);
  clearJoinFromUrl();
  await createGame({ solo });
}

function leaveToHome() {
  stopPoll();
  state.view = 'welcome';
  state.game = null;
  state.left = null;
  state.right = null;
  state.waitingSubmit = false;
  state.error = null;
  state.aiPlan = null;
  state.solo = false;
  sessionStorage.removeItem(SESSION_KEY);
  clearJoinFromUrl();
  render();
}

function renderAppBar() {
  titleEl.textContent = 'Spellcaster';
  leftBar.innerHTML = '';
  rightBar.innerHTML = '';

  if (state.view === 'duel' || state.view === 'spells') {
    const back = document.createElement('button');
    back.className = 'btn btn-ghost';
    back.textContent = state.view === 'spells' ? '← Duello' : 'Esci';
    back.onclick = () => {
      if (state.view === 'spells') {
        state.view = 'duel';
        render();
      } else {
        leaveToHome();
      }
    };
    leftBar.appendChild(back);

    if (state.view === 'duel') {
      const neu = document.createElement('button');
      neu.className = 'btn btn-ghost';
      neu.id = 'btn-restart';
      neu.textContent = state.loading ? '…' : 'Nuova partita';
      neu.disabled = !!state.loading;
      neu.onclick = () => restartNewGame();
      leftBar.appendChild(neu);
    }
  }

  if (state.view === 'duel') {
    const ref = document.createElement('button');
    ref.className = 'btn btn-ghost';
    ref.textContent = 'Incantesimi';
    ref.onclick = async () => {
      state.view = 'spells';
      render();
      await loadSpells();
      render();
    };
    rightBar.appendChild(ref);
  }
}

function renderWelcome() {
  const nick = getNickname();
  app.innerHTML = `
    <section class="hero">
      <h1>Spellcaster</h1>
      <p>Sfida un amico con un link, oppure gioca contro un’IA (non troppo forte).</p>
      <label class="nick-field">
        <span>Il tuo nickname</span>
        <input id="nick-input" type="text" maxlength="24" placeholder="es. Merlin" value="${escapeHtml(nick)}" autocomplete="nickname" />
      </label>
      <button class="btn btn-primary" id="btn-new" ${state.loading ? 'disabled' : ''}>
        ${state.loading ? 'Creazione…' : 'Sfida un amico'}
      </button>
      <button class="btn btn-ghost btn-block" id="btn-solo" ${state.loading ? 'disabled' : ''}>
        Gioca contro IA
      </button>
      ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ''}
    </section>
  `;
  const input = document.getElementById('nick-input');
  const persist = () => setNickname(input.value);
  input.addEventListener('change', persist);
  input.addEventListener('blur', persist);
  document.getElementById('btn-new').onclick = () => {
    setNickname(input.value);
    createGame({ solo: false });
  };
  document.getElementById('btn-solo').onclick = () => {
    setNickname(input.value);
    createGame({ solo: true });
  };
}

function renderNickGate() {
  const nick = getNickname();
  app.innerHTML = `
    <section class="hero">
      <h1>Entra in partita</h1>
      <p>Scegli un nickname per unirti all’avversario.</p>
      <label class="nick-field">
        <span>Il tuo nickname</span>
        <input id="nick-input" type="text" maxlength="24" placeholder="es. Morgana" value="${escapeHtml(nick)}" autocomplete="nickname" />
      </label>
      <button class="btn btn-primary" id="btn-join" ${state.loading ? 'disabled' : ''}>
        ${state.loading ? 'Ingresso…' : 'Entra'}
      </button>
      ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ''}
    </section>
  `;
  const input = document.getElementById('nick-input');
  document.getElementById('btn-join').onclick = () => {
    const saved = setNickname(input.value);
    if (!saved) {
      state.error = 'Scegli un nickname prima di entrare.';
      render();
      return;
    }
    joinGame(state.pendingJoinId);
  };
}

function gestureButtons(handKey) {
  const selected = state[handKey];
  const disabledBase = state.waitingSubmit || state.loading || state.game?.finished;
  const st = myStatus();
  const fear = !!st.fear;
  const amnesia = !!st.amnesia;
  const charmHand = iAmCharmed() ? (st.charmPerson?.hand || 'left') : null;
  const paraHand = st.paralysis?.hand || null;

  return HAND_OPTIONS.map((o) => {
    const sel = selected === o.code ? 'selected' : '';
    let disabled = disabledBase;
    let reason = '';
    if (amnesia) {
      disabled = true;
      reason = 'Amnesia: gesti forzati';
    }
    if (fear && fearBlocks(o.code)) {
      disabled = true;
      reason = 'Fear: gesto vietato';
    }
    const isLeft = handKey === 'left' || handKey === 'left2';
    const handSide = isLeft ? 'left' : 'right';
    if (charmHand === handSide) {
      disabled = true;
      reason = 'Charm: mano controllata';
    }
    if (paraHand === handSide && (handKey === 'left' || handKey === 'right')) {
      // still selectable but server remaps — hint via title
      reason = reason || 'Paralisi: gesto modificato';
    }
    const thumb = o.img
      ? `<img src="${o.img}" alt="${escapeHtml(o.title)}" /><span class="gesture-letter">${escapeHtml(o.label)}</span>`
      : `<span class="gesture-letter">${escapeHtml(o.label)}</span>`;
    return `<button type="button" class="gesture ${sel}${o.img ? '' : ' empty'}${disabled && !disabledBase ? ' locked' : ''}" title="${escapeHtml(reason || o.title)}" data-hand="${handKey}" data-code="${encodeURIComponent(o.code)}" ${disabled ? 'disabled' : ''}>${thumb}</button>`;
  }).join('');
}

function renderHand(title, handKey) {
  const selected = state[handKey];
  const ready = selected != null;
  const bothPalm = state.left === 'P' && state.right === 'P';
  let preview;
  if (bothPalm) {
    preview = `<span class="gesture-thumb selected" title="Resa"><img src="img/surrender.jpg" alt="Resa" /><span class="gesture-letter">PP</span></span>`;
  } else if (ready) {
    preview = gestureThumb(selected, { selected: true });
  } else {
    preview = `<span class="gesture-thumb empty preview"><span class="gesture-letter">?</span></span>`;
  }
  return `
    <section class="hand-block">
      <div class="hand-head">
        <h2>${title}</h2>
        <span class="chip ${ready ? 'ready' : ''}">${ready ? escapeHtml(handTitle(selected)) : 'non scelta'}</span>
      </div>
      <div class="hand-preview">${preview}</div>
      <div class="gestures">${gestureButtons(handKey)}</div>
    </section>
  `;
}

function renderInviteBox() {
  if (state.solo || state.playerId !== 'a') return '';
  if (opponentJoined()) return '';
  const url = inviteUrl(state.game.id);
  return `
    <section class="invite">
      <div class="invite-title">Invita l’avversario</div>
      <p class="invite-hint">Copia il link, oppure gioca subito contro l’IA.</p>
      <div class="invite-row">
        <input class="invite-input" id="invite-url" readonly value="${escapeHtml(url)}" />
        <button type="button" class="btn btn-ghost" id="btn-copy">Copia</button>
      </div>
      <button type="button" class="btn btn-primary btn-block" id="btn-vs-ai" ${state.loading ? 'disabled' : ''} style="margin-top:12px">
        Gioca contro IA
      </button>
    </section>
  `;
}

function renderHistory() {
  const g = state.game;
  const history = g.history || [];
  const me = state.playerId;
  const other = oppId();
  const cols = g.monsterColumns || [];
  const blind = (myStatus().blindnessTurns || 0) > 0;
  const meShort = shortName(me, g);
  const oppShort = shortName(other, g);

  if (!history.length) {
    return `
      <section class="history">
        <div class="history-title">Storico turni</div>
        <p class="history-empty">Nessun turno ancora.</p>
      </section>
    `;
  }

  const colTemplate = `2.2rem repeat(4, minmax(0, 1fr))${cols.map(() => ' minmax(3.2rem, 1fr)').join('')} minmax(0, 1.4fr)`;

  const headMonsters = cols.map((c) => {
    const mine = c.controllerId === me;
    return `<div class="history-cell ${mine ? 'me' : ''}" title="${escapeHtml(c.label)} · ${escapeHtml(playerName(c.controllerId, g))}">${escapeHtml(c.label)}</div>`;
  }).join('');

  const fog = `<span class="gesture-thumb compact empty" title="Blindness"><span class="gesture-letter">?</span></span>`;

  const rows = history.map((h) => {
    const mine = h[me];
    const theirs = h[other];
    const castNote = (h.casts || []).length
      ? `<span class="history-casts">${h.casts.map((c) => c.spell).join(', ')}</span>`
      : '';
    const monsterCells = cols.map((c) => {
      const entry = (h.monsters && h.monsters[c.id]) || { text: '—' };
      return `<div class="history-cell monster-cell" title="${escapeHtml(entry.label || c.label)}">${escapeHtml(entry.text || '—')}</div>`;
    }).join('');
    return `
      <div class="history-row" style="grid-template-columns:${colTemplate}">
        <div class="history-turn">T${h.turn}</div>
        <div class="history-cell me">${gestureThumb(mine.left, { compact: true })}</div>
        <div class="history-cell me">${gestureThumb(mine.right, { compact: true })}</div>
        <div class="history-cell">${blind ? fog : gestureThumb(theirs.left, { compact: true })}</div>
        <div class="history-cell">${blind ? fog : gestureThumb(theirs.right, { compact: true })}</div>
        ${monsterCells}
        ${castNote ? `<div class="history-cast-cell">${castNote}</div>` : '<div class="history-cast-cell"></div>'}
      </div>
    `;
  }).join('');

  return `
    <section class="history">
      <div class="history-title">Storico turni${blind ? ' · cecità' : ''}</div>
      <div class="history-head" style="grid-template-columns:${colTemplate}">
        <div class="history-turn">#</div>
        <div class="history-cell me" title="${escapeHtml(playerName(me, g))} sinistra">${escapeHtml(meShort)} SX</div>
        <div class="history-cell me" title="${escapeHtml(playerName(me, g))} destra">${escapeHtml(meShort)} DX</div>
        <div class="history-cell" title="${escapeHtml(playerName(other, g))} sinistra">${escapeHtml(oppShort)} SX</div>
        <div class="history-cell" title="${escapeHtml(playerName(other, g))} destra">${escapeHtml(oppShort)} DX</div>
        ${headMonsters}
        <div class="history-cast-cell">Incantesimi</div>
      </div>
      <div class="history-scroll">${rows}</div>
    </section>
  `;
}

function renderTargetSelect(id, value, opts) {
  return `
    <select class="target-select" id="${id}">
      ${opts.map((o) => `
        <option value="${escapeHtml(o.id)}" ${o.id === value ? 'selected' : ''}>${escapeHtml(o.label)}</option>
      `).join('')}
    </select>
  `;
}

/** Domande da fare prima di inviare il turno (solo se servono). */
function collectTurnPrompts() {
  ensureDefaultTargets();
  const prompts = [];
  const opts = targetOptions();
  const monsters = myMonsters();
  const hasStab = state.left === 'stab' || state.right === 'stab'
    || state.left2 === 'stab' || state.right2 === 'stab';
  const st = myStatus();

  for (const m of monsters) {
    prompts.push({
      kind: 'monster',
      id: `mt-${m.id}`,
      monsterId: m.id,
      label: `Dove attacca ${m.label}?`,
      type: 'target',
      value: state.monsterTargets[m.id],
      opts,
    });
  }

  if (hasStab) {
    prompts.push({
      kind: 'stab',
      id: 'stab-target',
      label: 'Stab verso chi?',
      type: 'target',
      value: state.stabTarget,
      opts,
    });
  }

  if (controllingCharm()) {
    const forcedOpts = HAND_OPTIONS.filter((o) => {
      if (o.code === ' ') return !!state.game?.rules?.allowCharmNothing;
      return true;
    }).map((o) => ({ id: o.code, label: o.title }));
    prompts.push({
      kind: 'charmForced',
      id: 'charm-forced',
      label: `Che gesto imponi a ${playerName(oppId())}?`,
      type: 'select',
      value: state.charmForced,
      opts: forcedOpts,
    });
  }

  if (st.delayedBank) {
    prompts.push({
      kind: 'releaseDelayed',
      id: 'release-delayed',
      label: `Rilasci «${st.delayedBank.spell}» dalla banca?`,
      type: 'yesno',
      value: !!state.releaseDelayed,
    });
  }

  // Clap su entrambe → possibile elemental: chiedi tipo
  if (state.left === 'C' && state.right === 'C') {
    prompts.push({
      kind: 'elemental',
      id: 'elem-type',
      label: 'Tipo elementale (se evochi)',
      type: 'select',
      value: state.elementalType,
      opts: [
        { id: 'fire', label: 'Fuoco' },
        { id: 'ice', label: 'Ghiaccio' },
      ],
    });
  }

  return prompts;
}

function applyPromptValues(root) {
  for (const el of root.querySelectorAll('[data-prompt]')) {
    const kind = el.getAttribute('data-prompt');
    const val = el.type === 'checkbox' ? el.checked : el.value;
    if (kind === 'monster') {
      state.monsterTargets[el.getAttribute('data-monster')] = val;
    } else if (kind === 'stab') state.stabTarget = val;
    else if (kind === 'charmForced') state.charmForced = val;
    else if (kind === 'releaseDelayed') state.releaseDelayed = !!val;
    else if (kind === 'spellLeft') state.spellTargetLeft = val;
    else if (kind === 'spellRight') state.spellTargetRight = val;
    else if (kind === 'elemental') state.elementalType = val;
    else if (kind === 'charmHand') state.charmHand = val;
    else if (kind === 'paralysisHand') state.paralysisHand = val;
  }
}

/**
 * Mostra popup con le sole domande necessarie.
 * @returns {Promise<boolean>} true se conferma, false se annulla
 */
function showOrdersModal(prompts) {
  return new Promise((resolve) => {
    const existing = document.getElementById('orders-modal');
    if (existing) existing.remove();

    const fields = prompts.map((p) => {
      if (p.type === 'yesno') {
        return `
          <label class="order-check modal-field">
            <input type="checkbox" data-prompt="${p.kind}" id="${p.id}" ${p.value ? 'checked' : ''} />
            ${escapeHtml(p.label)}
          </label>
        `;
      }
      const opts = p.opts || [];
      return `
        <div class="order-row modal-field">
          <span class="order-label">${escapeHtml(p.label)}</span>
          <select class="target-select" data-prompt="${p.kind}" ${p.kind === 'monster' ? `data-monster="${escapeHtml(p.monsterId)}"` : ''} id="${p.id}">
            ${opts.map((o) => `
              <option value="${escapeHtml(o.id)}" ${o.id === p.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>
            `).join('')}
          </select>
        </div>
      `;
    }).join('');

    const wrap = document.createElement('div');
    wrap.id = 'orders-modal';
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="orders-modal-title">
        <div class="modal-title" id="orders-modal-title">Conferma scelte</div>
        <div class="modal-body">${fields}</div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="modal-cancel">Annulla</button>
          <button type="button" class="btn btn-primary" id="modal-ok">Conferma</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const close = (ok) => {
      if (ok) applyPromptValues(wrap);
      wrap.remove();
      resolve(ok);
    };

    wrap.querySelector('#modal-cancel').onclick = () => close(false);
    wrap.querySelector('#modal-ok').onclick = () => close(true);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) close(false);
    });
  });
}

function renderMonstersScore() {
  const list = (state.game.monsters || []).filter((m) => m.alive);
  if (!list.length) return '';
  return `
    <div class="monsters-bar">
      ${list.map((m) => `
        <div class="monster-chip ${m.controllerId === state.playerId ? 'mine' : ''}">
          <strong>${escapeHtml(m.label)}</strong>
          <span>${m.hp}/${m.maxHp} · ATK ${m.attack}</span>
          <span class="muted">${escapeHtml(playerName(m.controllerId))}${m.paralyzed ? ' · paralisi' : ''}${m.confused ? ' · confuso' : ''}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderEffectHints() {
  const st = myStatus();
  const hints = [];
  if (st.amnesia) hints.push('Amnesia: ripeterai i gesti del turno scorso.');
  if (st.fear) hints.push('Fear: non puoi usare C, D, F, S.');
  if (st.confusion) hints.push('Confusion: un gesto sarà sostituito a caso.');
  if (iAmCharmed()) hints.push(`Charm: la mano ${st.charmPerson?.hand === 'right' ? 'destra' : 'sinistra'} è controllata.`);
  if (st.paralysis) hints.push(`Paralisi: la mano ${st.paralysis.hand === 'right' ? 'destra' : 'sinistra'} verrà rimappata.`);
  if (st.hasteTurns > 0) hints.push('Haste: puoi fare una seconda coppia di gesti.');
  if (state.game?.extraTurnFor === state.playerId) hints.push('Time stop: turno extra solo per te.');
  if (!hints.length) return '';
  return `<ul class="effect-hints">${hints.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`;
}

function renderDuel() {
  const g = state.game;
  const me = g.players[state.playerId];
  const otherId = oppId();
  const opp = g.players[otherId];
  const haste = (me.status?.hasteTurns || 0) > 0;
  const hasteReady = !haste || (state.left2 != null && state.right2 != null);
  const canSubmit =
    !state.loading &&
    !state.waitingSubmit &&
    state.left != null &&
    state.right != null &&
    hasteReady &&
    !g.finished;
  ensureDefaultTargets();

  let finished = '';
  if (g.finished) {
    const msg = g.isDraw
      ? 'Pareggio'
      : g.winnerId === state.playerId
        ? `Vince ${me.name}`
        : `Vince ${opp.name}`;
    finished = `<div class="finished-banner">${escapeHtml(msg)}</div>`;
  }

  const status = state.waitingSubmit
    ? `<p class="status wait">Turno inviato — in attesa di ${escapeHtml(playerName(otherId))}…</p>`
    : (!state.solo && state.playerId === 'a' && !opponentJoined()
      ? `<p class="status">In attesa che ${escapeHtml(playerName(otherId))} apra il link…</p>`
      : g.extraTurnFor === state.playerId
        ? `<p class="status wait">Time stop — turno extra di ${escapeHtml(me.name)}</p>`
        : '');

  app.innerHTML = `
    ${finished}
    ${renderInviteBox()}
    <div class="score">
      <div class="score-card you">
        <div class="name">${escapeHtml(me.name)}</div>
        <div class="hp">${me.damage} / 14</div>
        ${statusBadges(me.status, { mine: true })}
      </div>
      <div class="score-card">
        <div class="name">${escapeHtml(opp.name)}</div>
        <div class="hp">${opp.damage} / 14</div>
        ${statusBadges(opp.status)}
      </div>
    </div>
    ${renderMonstersScore()}
    <p class="meta">Turno ${g.turn}${g.extraTurnFor ? ' · time stop' : ''}</p>
    ${status}
    ${renderEffectHints()}
    ${g.finished ? '' : `
      <p class="hint">Scegli i gesti, poi Fine turno</p>
      <div class="hands-row">
        ${renderHand('Mano sinistra', 'left')}
        ${renderHand('Mano destra', 'right')}
      </div>
      ${haste ? `
        <p class="hint haste-hint">Seconda coppia (Haste)</p>
        <div class="hands-row haste-row">
          ${renderHand('Haste SX', 'left2')}
          ${renderHand('Haste DX', 'right2')}
        </div>
      ` : ''}
      <div class="actions">
        <button class="btn btn-primary" id="btn-end" ${canSubmit ? '' : 'disabled'}>
          ${state.loading ? 'Invio…' : state.waitingSubmit ? 'In attesa…' : 'Fine turno'}
        </button>
        ${state.left == null || state.right == null || (haste && (state.left2 == null || state.right2 == null))
          ? '<p class="meta">Seleziona tutte le mani richieste prima di inviare.</p>'
          : ''}
        ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ''}
      </div>
    `}
    ${renderHistory()}
  `;

  app.querySelectorAll('.gesture').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.waitingSubmit) return;
      const hand = btn.getAttribute('data-hand');
      const code = decodeURIComponent(btn.getAttribute('data-code'));
      state[hand] = code;
      render();
    });
  });

  const endBtn = document.getElementById('btn-end');
  if (endBtn) endBtn.onclick = endTurn;

  const copyBtn = document.getElementById('btn-copy');
  if (copyBtn) copyBtn.onclick = copyInvite;

  const vsAiBtn = document.getElementById('btn-vs-ai');
  if (vsAiBtn) vsAiBtn.onclick = switchToAiOpponent;
}

function renderSpells() {
  const list = state.spells || [];
  const sections = {
    protection: 'Protezione',
    summons: 'Evocazioni',
    damaging: 'Danno',
    enchantment: 'Enchantments',
  };
  const bySection = {};
  for (const s of list) {
    const key = s.section || 'other';
    if (!bySection[key]) bySection[key] = [];
    bySection[key].push(s);
  }
  app.innerHTML = `
    <div class="spell-ref">
      <h3>Incantesimi</h3>
      ${list.length === 0 ? '<p class="meta">Caricamento…</p>' : ''}
      ${Object.entries(sections).map(([key, title]) => {
        const items = bySection[key] || [];
        if (!items.length) return '';
        return `
          <h4 class="spell-section">${escapeHtml(title)}</h4>
          ${items.map((s) => `
            <div class="spell-item">
              <span>${escapeHtml(s.name)}</span>
              <span class="g">${escapeHtml(s.gestures)}</span>
            </div>
          `).join('')}
        `;
      }).join('')}
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render() {
  renderAppBar();
  if (state.view === 'welcome') renderWelcome();
  else if (state.view === 'nick') renderNickGate();
  else if (state.view === 'spells') renderSpells();
  else renderDuel();
}

render();
resumeSession();
