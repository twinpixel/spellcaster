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
      toast('L’avversario è entrato');
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
  render();
  try {
    const game = await api('/games', {
      method: 'POST',
      body: JSON.stringify({
        playerA: nick,
        playerB: solo ? 'Avversario' : 'In attesa…',
      }),
    });
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

async function autoPassOpponent(game) {
  const pending = game?.pendingTurn;
  if (!pending?.waitingFor?.length) return game;
  const opponent = pending.waitingFor[0];
  if (opponent === state.playerId) return game;
  return api(`/games/${encodeURIComponent(game.id)}/turn`, {
    method: 'POST',
    body: JSON.stringify({ playerId: opponent, left: ' ', right: ' ' }),
  });
}

function myMonsters(game = state.game) {
  return (game?.monsters || []).filter((m) => m.alive && m.controllerId === state.playerId);
}

function targetOptions() {
  const g = state.game;
  if (!g) return [];
  const oppId = state.playerId === 'a' ? 'b' : 'a';
  const opts = [
    { id: oppId, label: `Avversario (${g.players[oppId].name})` },
    { id: state.playerId, label: `Tu (${g.players[state.playerId].name})` },
  ];
  for (const m of g.monsters || []) {
    if (!m.alive) continue;
    opts.push({
      id: m.id,
      label: `${m.label} [${m.controllerId === state.playerId ? 'tuo' : 'avv'}] ${m.hp}/${m.maxHp}`,
    });
  }
  return opts;
}

function ensureDefaultTargets() {
  const oppId = state.playerId === 'a' ? 'b' : 'a';
  if (!state.stabTarget) state.stabTarget = oppId;
  if (!state.spellTargetLeft) state.spellTargetLeft = oppId;
  if (!state.spellTargetRight) state.spellTargetRight = oppId;
  for (const m of myMonsters()) {
    if (!state.monsterTargets[m.id]) state.monsterTargets[m.id] = oppId;
  }
}

function buildTurnPayload() {
  ensureDefaultTargets();
  const monsterOrders = myMonsters().map((m) => ({
    monsterId: m.id,
    targetId: state.monsterTargets[m.id] || (state.playerId === 'a' ? 'b' : 'a'),
  }));
  return {
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
  };
}

async function endTurn() {
  if (!state.game || state.left == null || state.right == null) return;
  state.loading = true;
  state.error = null;
  render();
  try {
    let game = await api(`/games/${encodeURIComponent(state.game.id)}/turn`, {
      method: 'POST',
      body: JSON.stringify(buildTurnPayload()),
    });
    if (state.solo) game = await autoPassOpponent(game);
    state.game = game;
    if (game.pendingTurn) {
      state.waitingSubmit = true;
    } else {
      state.waitingSubmit = false;
      state.left = null;
      state.right = null;
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
      <p>Crea una partita e passa il link all’avversario. Oppure gioca da solo contro un bot che passa.</p>
      <label class="nick-field">
        <span>Il tuo nickname</span>
        <input id="nick-input" type="text" maxlength="24" placeholder="es. Merlin" value="${escapeHtml(nick)}" autocomplete="nickname" />
      </label>
      <button class="btn btn-primary" id="btn-new" ${state.loading ? 'disabled' : ''}>
        ${state.loading ? 'Creazione…' : 'Nuova partita (2 giocatori)'}
      </button>
      <button class="btn btn-ghost btn-block" id="btn-solo" ${state.loading ? 'disabled' : ''}>
        Gioca da solo
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
  const disabled = state.waitingSubmit || state.loading || state.game?.finished;
  return HAND_OPTIONS.map((o) => {
    const sel = selected === o.code ? 'selected' : '';
    const thumb = o.img
      ? `<img src="${o.img}" alt="${escapeHtml(o.title)}" /><span class="gesture-letter">${escapeHtml(o.label)}</span>`
      : `<span class="gesture-letter">${escapeHtml(o.label)}</span>`;
    return `<button type="button" class="gesture ${sel}${o.img ? '' : ' empty'}" title="${escapeHtml(o.title)}" data-hand="${handKey}" data-code="${encodeURIComponent(o.code)}" ${disabled ? 'disabled' : ''}>${thumb}</button>`;
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
      <p class="invite-hint">Copia il link e passalo al secondo giocatore.</p>
      <div class="invite-row">
        <input class="invite-input" id="invite-url" readonly value="${escapeHtml(url)}" />
        <button type="button" class="btn btn-ghost" id="btn-copy">Copia</button>
      </div>
    </section>
  `;
}

function renderHistory() {
  const g = state.game;
  const history = g.history || [];
  const me = state.playerId;
  const opp = me === 'a' ? 'b' : 'a';
  const cols = g.monsterColumns || [];

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
    return `<div class="history-cell ${mine ? 'me' : ''}" title="${escapeHtml(c.label)}">${escapeHtml(c.label)}</div>`;
  }).join('');

  const rows = history.map((h) => {
    const mine = h[me];
    const theirs = h[opp];
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
        <div class="history-cell">${gestureThumb(theirs.left, { compact: true })}</div>
        <div class="history-cell">${gestureThumb(theirs.right, { compact: true })}</div>
        ${monsterCells}
        ${castNote ? `<div class="history-cast-cell">${castNote}</div>` : '<div class="history-cast-cell"></div>'}
      </div>
    `;
  }).join('');

  return `
    <section class="history">
      <div class="history-title">Storico turni</div>
      <div class="history-head" style="grid-template-columns:${colTemplate}">
        <div class="history-turn">#</div>
        <div class="history-cell me">Tu SX</div>
        <div class="history-cell me">Tu DX</div>
        <div class="history-cell">Avv SX</div>
        <div class="history-cell">Avv DX</div>
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

function renderOrdersPanel() {
  ensureDefaultTargets();
  const opts = targetOptions();
  const monsters = myMonsters();
  const hasStab = state.left === 'stab' || state.right === 'stab';

  const monsterRows = monsters.map((m) => `
    <div class="order-row">
      <span class="order-label">${escapeHtml(m.label)} (${m.hp}/${m.maxHp}) attacca</span>
      ${renderTargetSelect(`mt-${m.id}`, state.monsterTargets[m.id], opts)}
    </div>
  `).join('');

  return `
    <section class="orders">
      <div class="orders-title">Bersagli</div>
      <p class="orders-hint">Per regolamento dichiari chi colpiscono mostri e attacchi. Default: avversario.</p>
      ${monsterRows || '<p class="meta">Nessuna creatura sotto il tuo controllo.</p>'}
      <div class="order-row">
        <span class="order-label">Bersaglio gesti SX (se offensivo)</span>
        ${renderTargetSelect('spell-left', state.spellTargetLeft, opts)}
      </div>
      <div class="order-row">
        <span class="order-label">Bersaglio gesti DX (se offensivo)</span>
        ${renderTargetSelect('spell-right', state.spellTargetRight, opts)}
      </div>
      ${hasStab ? `
        <div class="order-row">
          <span class="order-label">Stab verso</span>
          ${renderTargetSelect('stab-target', state.stabTarget, opts)}
        </div>
      ` : ''}
      <div class="order-row">
        <span class="order-label">Elementale (se evochi)</span>
        <select class="target-select" id="elem-type">
          <option value="fire" ${state.elementalType === 'fire' ? 'selected' : ''}>Fuoco</option>
          <option value="ice" ${state.elementalType === 'ice' ? 'selected' : ''}>Ghiaccio</option>
        </select>
      </div>
    </section>
  `;
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
          <span class="muted">${m.controllerId === state.playerId ? 'tuo' : 'avv'}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function wireOrderSelects() {
  document.querySelectorAll('select.target-select').forEach((el) => {
    el.addEventListener('change', () => {
      const id = el.id;
      const val = el.value;
      if (id === 'spell-left') state.spellTargetLeft = val;
      else if (id === 'spell-right') state.spellTargetRight = val;
      else if (id === 'stab-target') state.stabTarget = val;
      else if (id === 'elem-type') state.elementalType = val;
      else if (id.startsWith('mt-')) state.monsterTargets[id.slice(3)] = val;
    });
  });
}

function renderDuel() {
  const g = state.game;
  const me = g.players[state.playerId];
  const oppId = state.playerId === 'a' ? 'b' : 'a';
  const opp = g.players[oppId];
  const canSubmit = !state.loading && !state.waitingSubmit && state.left != null && state.right != null && !g.finished;
  ensureDefaultTargets();

  let finished = '';
  if (g.finished) {
    const msg = g.isDraw
      ? 'Pareggio'
      : g.winnerId === state.playerId
        ? 'Hai vinto'
        : 'Hai perso';
    finished = `<div class="finished-banner">${msg}</div>`;
  }

  const status = state.waitingSubmit
    ? `<p class="status wait">Turno inviato — in attesa dell’avversario…</p>`
    : (!state.solo && state.playerId === 'a' && !opponentJoined()
      ? `<p class="status">In attesa che l’avversario apra il link…</p>`
      : '');

  app.innerHTML = `
    ${finished}
    ${renderInviteBox()}
    <div class="score">
      <div class="score-card you">
        <div class="label">Tu (${state.playerId === 'a' ? 'A' : 'B'})</div>
        <div class="name">${escapeHtml(me.name)}</div>
        <div class="hp">${me.damage} / 14</div>
      </div>
      <div class="score-card">
        <div class="label">Avversario</div>
        <div class="name">${escapeHtml(opp.name)}</div>
        <div class="hp">${opp.damage} / 14</div>
      </div>
    </div>
    ${renderMonstersScore()}
    <p class="meta">Turno ${g.turn}</p>
    ${status}
    ${g.finished ? `
      <div class="actions">
        <button class="btn btn-primary" id="btn-restart" ${state.loading ? 'disabled' : ''}>
          ${state.loading ? 'Creazione…' : 'Nuova partita'}
        </button>
      </div>
    ` : `
      <p class="hint">1. Scegli i gesti · 2. Imposta i bersagli · 3. Fine turno</p>
      <div class="hands-row">
        ${renderHand('Mano sinistra', 'left')}
        ${renderHand('Mano destra', 'right')}
      </div>
      ${renderOrdersPanel()}
      <div class="actions">
        <button class="btn btn-primary" id="btn-end" ${canSubmit ? '' : 'disabled'}>
          ${state.loading ? 'Invio…' : state.waitingSubmit ? 'In attesa…' : 'Fine turno'}
        </button>
        <button class="btn btn-ghost btn-block" id="btn-restart" ${state.loading ? 'disabled' : ''}>
          Nuova partita
        </button>
        ${state.left == null || state.right == null
          ? '<p class="meta">Seleziona entrambe le mani prima di inviare.</p>'
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

  wireOrderSelects();

  const endBtn = document.getElementById('btn-end');
  if (endBtn) endBtn.onclick = endTurn;

  const restartBtn = document.getElementById('btn-restart');
  if (restartBtn) restartBtn.onclick = restartNewGame;

  const copyBtn = document.getElementById('btn-copy');
  if (copyBtn) copyBtn.onclick = copyInvite;
}

function renderSpells() {
  const list = state.spells || [];
  app.innerHTML = `
    <div class="spell-ref">
      <h3>Incantesimi</h3>
      ${list.length === 0 ? '<p class="meta">Caricamento…</p>' : ''}
      ${list.map((s) => `
        <div class="spell-item">
          <span>${escapeHtml(s.name)}</span>
          <span class="g">${escapeHtml(s.gestures)}</span>
        </div>
      `).join('')}
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
