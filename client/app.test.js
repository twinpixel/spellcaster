// @vitest-environment jsdom
/**
 * Test del client. `app.js` è uno script classico (niente export): viene
 * caricato dentro una funzione che ne restituisce gli interni, così ogni test
 * parte da un’istanza pulita. Gli snapshot di partita sono quelli veri,
 * prodotti dal motore in server/shared.js.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGameService } from '../server/shared.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf-8');

const EXPORTS = [
  'state',
  'HAND_OPTIONS',
  'render',
  'renderHand',
  'gestureButtons',
  'ensureDefaultTargets',
  'resetTurnChoices',
  'collectTurnPrompts',
  'applyPromptValues',
  'buildTurnPayload',
  'targetOptions',
  'attackTargetOptions',
  'aiPickTurn',
  'spellVideoSlug',
  'castsVideoKey',
  'wizardHp',
  'handLabel',
  'handTitle',
  'shortName',
  'escapeHtml',
  'labelToCode',
  'actionToCode',
  'iAmCharmed',
  'controllingCharm',
  'iAmWaiting',
  'opponentJoined',
  'needsPoll',
  'inviteUrl',
  'SPELL_META_NAME',
  'setNickname',
  'getNickname',
  'showInfoModal',
  'statusBadges',
  'AUTHOR_NAME',
  'AUTHOR_URL',
  'AUTHOR_URL_LABEL',
];

/** Carica app.js in un contesto isolato e ne espone gli interni. */
function bootApp() {
  document.body.innerHTML = `
    <header><div id="appbar-left"></div><div id="appbar-title"></div><div id="appbar-right"></div></header>
    <main id="app"></main>
    <div id="toast"></div>
  `;
  // eslint-disable-next-line no-new-func
  const factory = new Function(`${SRC}\nreturn { ${EXPORTS.join(', ')} };`);
  return factory();
}

/** Snapshot reale prodotto dal motore, dopo i turni indicati. */
function snapshotAfter(turns = [], opts = {}) {
  const svc = createGameService();
  const snap = svc.createGame({ nameA: 'Alpha', nameB: 'Beta', ...opts });
  svc.joinGame(snap.id, 'b', 'Beta');
  let last = snap;
  for (const [a, b] of turns) {
    svc.submitTurn(snap.id, { playerId: 'a', ...a });
    last = svc.submitTurn(snap.id, { playerId: 'b', ...b });
  }
  return last;
}

let app;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  app = bootApp();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// --- helper puri -----------------------------------------------------------

describe('helper di presentazione', () => {
  it('wizardHp parte da 14 e non va sotto zero', () => {
    expect(app.wizardHp(0)).toBe(14);
    expect(app.wizardHp(5)).toBe(9);
    expect(app.wizardHp(14)).toBe(0);
    expect(app.wizardHp(99)).toBe(0);
    expect(app.wizardHp(undefined)).toBe(14);
  });

  it('handLabel e handTitle coprono tutti i codici', () => {
    expect(app.handLabel('F')).toBe('F');
    expect(app.handLabel('stab')).toBe('†');
    expect(app.handLabel(' ')).toBe('—');
    expect(app.handLabel(null)).toBe('—');
    expect(app.handTitle('C')).toBe('C · Clap');
    expect(app.handTitle(null)).toBe('non scelta');
  });

  it('labelToCode e actionToCode sono inversi delle etichette del server', () => {
    expect(app.labelToCode('—')).toBe(' ');
    expect(app.labelToCode('†')).toBe('stab');
    expect(app.labelToCode('C')).toBe('C');
    expect(app.labelToCode('W')).toBe('W');

    expect(app.actionToCode({ kind: 'nothing' })).toBe(' ');
    expect(app.actionToCode({ kind: 'stab' })).toBe('stab');
    expect(app.actionToCode({ kind: 'clap' })).toBe('C');
    expect(app.actionToCode({ kind: 'gesture', gesture: 'D' })).toBe('D');
    expect(app.actionToCode(null)).toBe(' ');
  });

  it('escapeHtml neutralizza i caratteri pericolosi', () => {
    expect(app.escapeHtml('<img src=x onerror="a">&')).toBe(
      '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;',
    );
  });

  it('SPELL_META_NAME conosce ogni incantesimo del catalogo', () => {
    const snap = snapshotAfter();
    expect(app.SPELL_META_NAME('lightningBoltShort')).toBe('Lightning*');
    expect(app.SPELL_META_NAME('sconosciuto')).toBe('sconosciuto');
    expect(snap.players.a.name).toBe('Alpha');
  });

  it('shortName accorcia i nomi lunghi', () => {
    app.state.game = snapshotAfter();
    app.state.game.players.a.name = 'Nomedavverolungo';
    expect(app.shortName('a')).toBe('Nomedav…');
    app.state.game.players.a.name = 'Corto';
    expect(app.shortName('a')).toBe('Corto');
  });

  it('inviteUrl produce un link con il parametro join', () => {
    expect(app.inviteUrl('abc123')).toContain('join=abc123');
  });
});

// --- clip video ------------------------------------------------------------

describe('clip incantesimi', () => {
  it('lo slug segue i titoli di docs/SPELL_VIDEO_PROMPTS.md', () => {
    expect(app.spellVideoSlug('magicMirror')).toBe('magic-mirror');
    expect(app.spellVideoSlug('removeEnchantment')).toBe('remove-enchantment');
    expect(app.spellVideoSlug('shield')).toBe('shield');
    expect(app.spellVideoSlug('lightningBoltShort')).toBe('lightning-bolt');
    expect(app.spellVideoSlug('nonEsiste')).toBe(null);
  });

  it('l’elementale sceglie lo slug dal tipo in campo', () => {
    const game = { monsters: [{ alive: true, elementalType: 'ice', controllerId: 'a' }] };
    expect(app.spellVideoSlug('summonElemental', game)).toBe('elemental-ice');
    expect(app.spellVideoSlug('summonElemental', { monsters: [] })).toBe('elemental-fire');
  });

  it('castsVideoKey distingue i turni', () => {
    expect(app.castsVideoKey(null)).toBe(null);
    expect(app.castsVideoKey({ turn: 3, lastTurnCasts: [] })).toBe(null);
    expect(app.castsVideoKey({ turn: 3, lastTurnCasts: [{ spell: 'shield' }] })).toBe('3|shield');
  });
});

// --- stato del turno -------------------------------------------------------

describe('scelte del turno', () => {
  beforeEach(() => {
    app.state.game = snapshotAfter();
    app.state.playerId = 'a';
    app.state.view = 'duel';
  });

  it('resetTurnChoices azzera mani, ordini e bersagli', () => {
    Object.assign(app.state, {
      left: 'P', right: 'S', left2: 'W', right2: 'D',
      releaseDelayed: true,
      monsterTargets: { m1: 'b' },
      spellTargetLeftExplicit: true,
      spellTargetRightExplicit: true,
      stabTarget: 'm1',
    });
    app.resetTurnChoices();
    expect(app.state.left).toBe(null);
    expect(app.state.right).toBe(null);
    expect(app.state.left2).toBe(null);
    expect(app.state.right2).toBe(null);
    expect(app.state.releaseDelayed).toBe(false);
    expect(app.state.monsterTargets).toEqual({});
    expect(app.state.spellTargetLeftExplicit).toBe(false);
    expect(app.state.spellTargetRightExplicit).toBe(false);
    expect(app.state.stabTarget).toBe(null);
  });

  it('ensureDefaultTargets precompila i gesti forzati da amnesia', () => {
    app.state.game.players.a.status.amnesia = true;
    app.state.game.players.a.status.lastAction = { left: 'W', right: '—' };
    app.ensureDefaultTargets();
    expect(app.state.left).toBe('W');
    expect(app.state.right).toBe(' ');
  });

  it('ensureDefaultTargets precompila la mano bloccata dalla paralisi', () => {
    app.state.game.players.a.status.paralysis = {
      hand: 'right',
      forced: { kind: 'gesture', gesture: 'D' },
    };
    app.ensureDefaultTargets();
    expect(app.state.right).toBe('D');
  });

  it('un giocatore charmed può comunque inviare il turno', () => {
    // regressione: la mano controllata era disabilitata e restava null,
    // bloccando per sempre il pulsante «Fine turno»
    app.state.game.players.a.status.charmPerson = { controllerId: 'b', hand: 'left' };
    expect(app.iAmCharmed()).toBe(true);
    app.ensureDefaultTargets();
    expect(app.state.left).toBe(' ');

    app.state.right = 'S';
    app.render();
    const btn = document.getElementById('btn-end');
    expect(btn.disabled).toBe(false);
  });

  it('buildTurnPayload manda solo i bersagli scelti esplicitamente', () => {
    app.state.left = 'S';
    app.state.right = ' ';
    let payload = app.buildTurnPayload();
    expect(payload).toMatchObject({ playerId: 'a', left: 'S', right: ' ' });
    expect(payload.spellTargets).toBeUndefined();

    app.state.spellTargetLeftExplicit = true;
    app.state.spellTargetLeft = 'm1';
    payload = app.buildTurnPayload();
    expect(payload.spellTargets).toEqual({ left: 'm1' });
  });

  it('buildTurnPayload aggiunge la seconda coppia solo con haste attiva', () => {
    app.state.left = 'P';
    app.state.right = ' ';
    app.state.left2 = 'S';
    app.state.right2 = ' ';
    expect(app.buildTurnPayload().left2).toBeUndefined();

    app.state.game.players.a.status.hasteTurns = 2;
    expect(app.buildTurnPayload().left2).toBe('S');
  });

  it('buildTurnPayload include charmForced solo per chi controlla', () => {
    app.state.left = 'P';
    app.state.right = ' ';
    expect(app.buildTurnPayload().charmForced).toBeUndefined();

    app.state.game.players.b.status.charmPerson = { controllerId: 'a', hand: 'left' };
    expect(app.controllingCharm()).toBe(true);
    expect(app.buildTurnPayload().charmForced).toBe('P');
  });
});

// --- domande prima dell’invio ---------------------------------------------

describe('domande prima dell’invio', () => {
  /** Partita in cui A ha evocato un goblin (S-F-W). */
  function withGoblin() {
    return snapshotAfter([
      [{ left: 'S', right: ' ' }, {}],
      [{ left: 'F', right: ' ' }, {}],
      [{ left: 'W', right: ' ' }, {}],
    ]);
  }

  it('con un solo bersaglio non chiede nulla e usa il default', () => {
    app.state.game = snapshotAfter();
    app.state.playerId = 'a';
    app.state.left = 'stab';
    app.state.right = ' ';
    const prompts = app.collectTurnPrompts();
    expect(prompts).toHaveLength(0);
    expect(app.state.stabTarget).toBe('b');
  });

  it('con creature in campo chiede ordini, stab e bersaglio incantesimo', () => {
    app.state.game = withGoblin();
    app.state.playerId = 'b'; // il goblin è di A: per B è un bersaglio in più
    app.state.left = 'stab';
    app.state.right = 'W';
    const kinds = app.collectTurnPrompts().map((p) => p.kind);
    expect(kinds).toContain('stab');
    expect(kinds).toContain('spellRight');
    expect(kinds).not.toContain('spellLeft'); // la mano che pugnala non lancia
  });

  it('chiede dove attacca la propria creatura solo se ci sono più bersagli', () => {
    app.state.game = withGoblin();
    app.state.playerId = 'a';
    app.state.left = ' ';
    app.state.right = ' ';
    // Un solo nemico (il mago B): nessuna domanda, bersaglio automatico
    expect(app.collectTurnPrompts().filter((p) => p.kind === 'monster')).toHaveLength(0);
    const goblin = app.state.game.monsters.find((m) => m.alive);
    expect(app.state.monsterTargets[goblin.id]).toBe('b');
  });

  it('il doppio clap chiede il tipo di elementale', () => {
    app.state.game = snapshotAfter();
    app.state.playerId = 'a';
    app.state.left = 'C';
    app.state.right = 'C';
    const elem = app.collectTurnPrompts().find((p) => p.kind === 'elemental');
    expect(elem.opts.map((o) => o.id)).toEqual(['fire', 'ice']);
  });

  it('charm: «nulla» è proposto solo se la regola è attiva', () => {
    app.state.game = snapshotAfter();
    app.state.playerId = 'a';
    app.state.left = 'P';
    app.state.right = ' ';
    app.state.game.players.b.status.charmPerson = { controllerId: 'a', hand: 'left' };

    let forced = app.collectTurnPrompts().find((p) => p.kind === 'charmForced');
    expect(forced.opts.map((o) => o.id)).not.toContain(' ');

    app.state.game.rules.allowCharmNothing = true;
    forced = app.collectTurnPrompts().find((p) => p.kind === 'charmForced');
    expect(forced.opts.map((o) => o.id)).toContain(' ');
  });

  it('chiede se rilasciare l’incantesimo in banca', () => {
    app.state.game = snapshotAfter();
    app.state.playerId = 'a';
    app.state.left = 'P';
    app.state.right = ' ';
    app.state.game.players.a.status.delayedBank = { spell: 'missile', targetId: 'b' };
    const p = app.collectTurnPrompts().find((x) => x.kind === 'releaseDelayed');
    expect(p.type).toBe('yesno');
  });

  it('applyPromptValues traduce «auto» in nessun bersaglio esplicito', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <select data-prompt="spellLeft"><option value="auto" selected>auto</option></select>
      <select data-prompt="spellRight"><option value="m2" selected>m2</option></select>
      <select data-prompt="stab"><option value="m1" selected>m1</option></select>
      <select data-prompt="monster" data-monster="m1"><option value="b" selected>b</option></select>
      <select data-prompt="elemental"><option value="ice" selected>ice</option></select>
      <input type="checkbox" data-prompt="releaseDelayed" checked />
    `;
    app.applyPromptValues(root);
    expect(app.state.spellTargetLeftExplicit).toBe(false);
    expect(app.state.spellTargetRightExplicit).toBe(true);
    expect(app.state.spellTargetRight).toBe('m2');
    expect(app.state.stabTarget).toBe('m1');
    expect(app.state.monsterTargets.m1).toBe('b');
    expect(app.state.elementalType).toBe('ice');
    expect(app.state.releaseDelayed).toBe(true);
  });
});

// --- bersagli --------------------------------------------------------------

describe('elenchi di bersagli', () => {
  it('attackTargetOptions esclude le proprie creature', () => {
    app.state.game = snapshotAfter([
      [{ left: 'S', right: ' ' }, {}],
      [{ left: 'F', right: ' ' }, {}],
      [{ left: 'W', right: ' ' }, {}],
    ]);
    app.state.playerId = 'a';
    expect(app.attackTargetOptions().map((o) => o.id)).toEqual(['b']);

    app.state.playerId = 'b';
    const ids = app.attackTargetOptions().map((o) => o.id);
    expect(ids[0]).toBe('a');
    expect(ids).toHaveLength(2); // mago A + goblin di A
  });

  it('targetOptions include entrambi i maghi e tutte le creature vive', () => {
    app.state.game = snapshotAfter([
      [{ left: 'S', right: ' ' }, {}],
      [{ left: 'F', right: ' ' }, {}],
      [{ left: 'W', right: ' ' }, {}],
    ]);
    app.state.playerId = 'a';
    expect(app.targetOptions().map((o) => o.id)).toEqual(['b', 'a', 'm1']);
  });
});

// --- rendering -------------------------------------------------------------

describe('rendering', () => {
  it('la schermata iniziale salva il nickname', () => {
    app.state.view = 'welcome';
    app.render();
    const input = document.getElementById('nick-input');
    input.value = 'Merlino';
    input.dispatchEvent(new Event('change'));
    expect(localStorage.getItem('spellcaster.nickname')).toBe('Merlino');
  });

  it('senza nickname il duello non parte', () => {
    app.state.view = 'welcome';
    app.render();
    document.getElementById('btn-new').click();
    expect(app.state.error).toMatch(/nickname/i);
  });

  it('mostra i punti vita e lo storico', () => {
    app.state.game = snapshotAfter([
      [{ left: 'S', right: ' ' }, {}],
      [{ left: 'D', right: ' ' }, {}],
    ]);
    app.state.playerId = 'a';
    app.state.view = 'duel';
    app.render();
    const hps = [...document.querySelectorAll('.hp')].map((e) => e.textContent.trim());
    expect(hps).toEqual(['14', '13']); // il missile ha tolto 1 a B
    expect(document.querySelectorAll('.history-row')).toHaveLength(2);
  });

  it('l’anteprima «resa» compare solo sulla coppia di mani interessata', () => {
    app.state.game = snapshotAfter();
    app.state.playerId = 'a';
    app.state.left = 'P';
    app.state.right = 'P';
    app.state.left2 = 'S';
    app.state.right2 = 'W';
    expect(app.renderHand('SX', 'left')).toContain('surrender.jpg');
    expect(app.renderHand('Haste SX', 'left2')).not.toContain('surrender.jpg');
  });

  it('fear disabilita C, D, F, S ma non P e W', () => {
    app.state.game = snapshotAfter();
    app.state.playerId = 'a';
    app.state.game.players.a.status.fear = true;
    const html = app.gestureButtons('left');
    const holder = document.createElement('div');
    holder.innerHTML = html;
    const disabled = [...holder.querySelectorAll('button')]
      .filter((b) => b.disabled)
      .map((b) => decodeURIComponent(b.getAttribute('data-code')));
    expect(disabled.sort()).toEqual(['C', 'D', 'F', 'S']);
  });

  it('la paralisi con posizione decisa blocca la mano', () => {
    app.state.game = snapshotAfter();
    app.state.playerId = 'a';
    app.state.game.players.a.status.paralysis = {
      hand: 'left',
      forced: { kind: 'gesture', gesture: 'P' },
    };
    const holder = document.createElement('div');
    holder.innerHTML = app.gestureButtons('left');
    expect([...holder.querySelectorAll('button')].every((b) => b.disabled)).toBe(true);

    holder.innerHTML = app.gestureButtons('right');
    expect([...holder.querySelectorAll('button')].some((b) => b.disabled)).toBe(false);
  });

  it('gli effetti in arrivo si distinguono da quelli attivi', () => {
    const badges = (st) => {
      const holder = document.createElement('div');
      holder.innerHTML = app.statusBadges(st);
      return [...holder.querySelectorAll('.sbadge')].map((b) => b.textContent);
    };
    expect(badges({ blindnessQueued: 3 })).toEqual(['Blind 3→']);
    expect(badges({ blindnessTurns: 2, blindnessQueued: 3 })).toEqual(['Blind 2']);
    expect(badges({ invisibilityQueued: 3 })).toEqual(['Invis 3→']);
    expect(badges({ hasteQueued: 3 })).toEqual(['Haste 3→']);
    expect(badges({})).toEqual([]);
  });

  it('la vista incantesimi raggruppa per sezione', () => {
    app.state.view = 'spells';
    app.state.spells = [
      { id: 'shield', name: 'Shield', gestures: 'P', section: 'protection' },
      { id: 'missile', name: 'Missile', gestures: 'S-D', section: 'damaging' },
    ];
    app.render();
    const titles = [...document.querySelectorAll('.spell-section')].map((e) => e.textContent);
    expect(titles).toEqual(['Protezione', 'Danno']);
  });
});

// --- dialog informazioni ---------------------------------------------------

describe('dialog informazioni', () => {
  it('il pulsante ⓘ è sempre nella barra in alto', () => {
    for (const view of ['welcome', 'nick', 'duel', 'spells']) {
      app.state.view = view;
      if (view === 'duel') {
        app.state.game = snapshotAfter();
        app.state.playerId = 'a';
      }
      app.render();
      expect(document.getElementById('btn-info')).toBeTruthy();
    }
  });

  it('autore e dominio sono quelli giusti', () => {
    expect(app.AUTHOR_NAME).toBe('Andrea Poltronieri');
    expect(app.AUTHOR_URL).toBe('https://www.andreapoltronieri.name');
    expect(app.AUTHOR_URL_LABEL).toBe('www.andreapoltronieri.name');
  });

  it('mostra autore e link cliccabile', () => {
    app.state.view = 'welcome';
    app.render();
    document.getElementById('btn-info').click();

    const modal = document.getElementById('info-modal');
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('Sviluppato da');
    expect(modal.textContent).toContain(app.AUTHOR_NAME);

    const link = document.getElementById('info-author-link');
    expect(link.getAttribute('href')).toBe(app.AUTHOR_URL);
    expect(link.textContent).toBe(app.AUTHOR_URL_LABEL);
    // apertura sicura in una nuova scheda
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('cita l’origine del regolamento', () => {
    app.showInfoModal();
    expect(document.getElementById('info-modal').textContent).toContain('Richard Bartle');
  });

  it('si chiude con il pulsante e toccando lo sfondo', () => {
    app.showInfoModal();
    document.getElementById('info-close').click();
    expect(document.getElementById('info-modal')).toBe(null);

    const wrap = app.showInfoModal();
    wrap.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('info-modal')).toBe(null);
  });

  it('non resta aperto in doppia copia', () => {
    app.showInfoModal();
    app.showInfoModal();
    expect(document.querySelectorAll('#info-modal')).toHaveLength(1);
  });
});

// --- polling ---------------------------------------------------------------

describe('polling', () => {
  it('non interroga il server in solo o a partita finita', () => {
    app.state.game = snapshotAfter();
    app.state.playerId = 'a';
    app.state.solo = true;
    expect(app.needsPoll()).toBe(false);

    app.state.solo = false;
    app.state.game.finished = true;
    expect(app.needsPoll()).toBe(false);
  });

  it('interroga il server mentre aspetta l’avversario', () => {
    app.state.game = snapshotAfter();
    app.state.playerId = 'a';
    app.state.solo = false;
    app.state.game.joined.b = false;
    expect(app.opponentJoined()).toBe(false);
    expect(app.needsPoll()).toBe(true);

    app.state.game.joined.b = true;
    app.state.game.pendingTurn = { submitted: ['a'], waitingFor: ['b'] };
    expect(app.iAmWaiting()).toBe(true);
    expect(app.needsPoll()).toBe(true);
  });
});

// --- IA --------------------------------------------------------------------

describe('IA solitaria', () => {
  it('produce sempre gesti accettati dal server', () => {
    const codes = new Set(app.HAND_OPTIONS.map((o) => o.code));
    const game = snapshotAfter();
    for (let i = 0; i < 300; i++) {
      app.state.aiPlan = null;
      const turn = app.aiPickTurn(game);
      expect(codes.has(turn.left)).toBe(true);
      expect(codes.has(turn.right)).toBe(true);
      if (turn.stabTarget) expect(turn.stabTarget).toBe('a');
    }
  });

  it('ordina alle proprie creature di attaccare l’umano', () => {
    const game = snapshotAfter();
    game.monsters = [{ id: 'm1', alive: true, controllerId: 'b', label: 'Goblin' }];
    app.state.aiPlan = { queue: [['S', ' ']], spell: 'missile', self: false };
    const turn = app.aiPickTurn(game);
    expect(turn.monsterOrders).toEqual([{ monsterId: 'm1', targetId: 'a' }]);
  });

  it('i turni dell’IA sono giocabili dal motore vero', () => {
    const svc = createGameService();
    const snap = svc.createGame({ nameA: 'Umano', nameB: 'Bot' });
    svc.joinGame(snap.id, 'b', 'Bot');
    let game = snap;
    for (let i = 0; i < 40 && !game.finished; i++) {
      svc.submitTurn(snap.id, { playerId: 'a', left: ' ', right: ' ' });
      const turn = app.aiPickTurn(game);
      game = svc.submitTurn(snap.id, { playerId: 'b', ...turn });
    }
    expect(game.turn).toBeGreaterThan(0);
  });
});
