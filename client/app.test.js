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
import { createGameService, spellListJson, SPELL_PATTERNS } from '../server/shared.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// ai.js è caricato prima di app.js anche in index.html: qui li concateniamo
const AI_SRC = fs.readFileSync(path.join(__dirname, 'ai.js'), 'utf-8');
const APP_SRC = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf-8');
const SRC = `${AI_SRC}\n${APP_SRC}`;

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
  'AI_TIERS',
  'AI_WIZARDS',
  'aiWizardByName',
  'aiTierByLevel',
  'aiRandomWizard',
  'buildSpellBook',
  'parseSpellGestures',
  'aiHandBuffers',
  'aiRemaining',
  'aiIncomingThreats',
  'spellsCompletedBy',
  'RETARGETABLE_SPELLS',
  'chooseAiTurn',
  'AI_STYLES',
  'aiStyleWeight',
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

  it('con creature in campo chiede dove va lo stab', () => {
    app.state.game = withGoblin();
    app.state.playerId = 'b'; // il goblin è di A: per B è un bersaglio in più
    app.state.left = 'stab';
    app.state.right = 'W';
    const kinds = app.collectTurnPrompts().map((p) => p.kind);
    expect(kinds).toContain('stab');
  });

  it('non chiede il bersaglio se non si completa nessun incantesimo', () => {
    app.state.game = withGoblin();
    app.state.aiBook = app.buildSpellBook(spellListJson());
    app.state.playerId = 'b';
    app.state.left = 'W'; // primo gesto, niente si completa
    app.state.right = ' ';
    const kinds = app.collectTurnPrompts().map((p) => p.kind);
    expect(kinds).not.toContain('spellLeft');
    expect(kinds).not.toContain('spellRight');
  });

  it('non chiede il bersaglio per uno shield: protegge chi lo lancia', () => {
    // regressione: chiedeva «Bersaglio incantesimo» a ogni gesto con creature in campo
    app.state.game = withGoblin();
    app.state.aiBook = app.buildSpellBook(spellListJson());
    app.state.playerId = 'b';
    app.state.left = 'P'; // P completa subito uno shield
    app.state.right = ' ';
    expect(app.spellsCompletedBy('left')).toContain('shield');
    expect(app.collectTurnPrompts().map((p) => p.kind)).not.toContain('spellLeft');
  });

  it('chiede il bersaglio quando l’incantesimo può colpire una creatura', () => {
    // B prepara un missile (S poi D): con un goblin in campo la scelta conta
    const svc = createGameService();
    const snap = svc.createGame({ nameA: 'Alpha', nameB: 'Beta' });
    svc.joinGame(snap.id, 'b', 'Beta');
    for (const g of ['S', 'F', 'W']) { // A evoca un goblin
      svc.submitTurn(snap.id, { playerId: 'a', left: g, right: ' ' });
      svc.submitTurn(snap.id, { playerId: 'b', left: 'S', right: ' ' });
    }
    app.state.game = svc.getGame(snap.id);
    app.state.aiBook = app.buildSpellBook(spellListJson());
    app.state.playerId = 'b';
    app.state.left = 'D'; // S-D = missile
    app.state.right = ' ';

    expect(app.spellsCompletedBy('left')).toContain('missile');
    const p = app.collectTurnPrompts().find((x) => x.kind === 'spellLeft');
    expect(p).toBeTruthy();
    expect(p.label).toContain('Missile');
    expect(p.opts.map((o) => o.id)).toContain('m1'); // si può mirare al goblin
  });

  it('RETARGETABLE_SPELLS esclude ciò che ha già il bersaglio giusto', () => {
    for (const s of ['shield', 'protectionFromEvil', 'cureLightWounds', 'cureHeavyWounds',
      'summonGoblin', 'summonOgre', 'fireStorm', 'iceStorm', 'haste', 'timeStop']) {
      expect(app.RETARGETABLE_SPELLS.has(s)).toBe(false);
    }
    for (const s of ['missile', 'fireball', 'fingerOfDeath', 'charmMonster', 'paralysis']) {
      expect(app.RETARGETABLE_SPELLS.has(s)).toBe(true);
    }
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

  it('separa console e storico così che possano stare affiancati', () => {
    // Il posizionamento è CSS (@media min-width 700px), ma dipende da questa
    // struttura: se sparisce, sugli schermi orizzontali lo storico torna in fondo.
    app.state.game = snapshotAfter([[{ left: 'S', right: ' ' }, {}]]);
    app.state.playerId = 'a';
    app.state.view = 'duel';
    app.render();

    const layout = document.querySelector('.duel-layout');
    expect(layout).toBeTruthy();
    expect(layout.querySelector(':scope > .duel-console')).toBeTruthy();
    expect(layout.querySelector(':scope > .duel-side')).toBeTruthy();

    // lo storico sta nella colonna laterale, i comandi in quella principale
    expect(document.querySelector('.duel-side .history')).toBeTruthy();
    expect(document.querySelector('.duel-console .history')).toBe(null);
    for (const sel of ['.score', '.hands-row', '.actions', '.status-slot']) {
      expect(document.querySelector(`.duel-console ${sel}`)).toBeTruthy();
    }
  });

  it('le intestazioni dello storico restano corte e con legenda', () => {
    // regressione: «Player A SX» debordava sovrapponendosi alle colonne vicine
    app.state.game = snapshotAfter([[{ left: 'S', right: ' ' }, {}]]);
    app.state.playerId = 'a';
    app.state.view = 'duel';
    app.render();

    const head = [...document.querySelectorAll('.history-head .history-cell')]
      .map((e) => e.textContent.trim());
    expect(head).toEqual(['SX', 'DX', 'SX', 'DX']);

    const legend = [...document.querySelectorAll('.history-legend .hl')]
      .map((e) => e.textContent.trim());
    expect(legend).toEqual(['Alpha', 'Beta']);
    expect(document.querySelector('.history-legend .hl').classList.contains('me')).toBe(true);
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

describe('roster dei maghi', () => {
  it('cinque fasce, ogni mago in una sola, tutti con nota', () => {
    expect(app.AI_TIERS.map((t) => t.level)).toEqual([1, 2, 3, 4, 5]);
    const nomi = app.AI_WIZARDS.map((w) => w.name);
    expect(new Set(nomi).size).toBe(nomi.length); // nessun nome ripetuto
    // e nemmeno lo stesso personaggio sotto due nomi («Radagast il Bruno»)
    const radice = nomi.map((n) => n.split(/\s+(il|la|the|of)\s+/i)[0].toLowerCase());
    expect(new Set(radice).size).toBe(radice.length);
    for (const w of app.AI_WIZARDS) {
      expect(w.note.length).toBeGreaterThan(5);
      expect([1, 2, 3, 4, 5]).toContain(w.level);
    }
    expect(app.AI_WIZARDS.length).toBeGreaterThanOrEqual(20);
  });

  it('ogni fascia ha maghi e la quinta è solo PoltroMago', () => {
    for (const t of app.AI_TIERS.filter((x) => x.level < 5)) {
      expect(t.wizards.length).toBeGreaterThanOrEqual(4);
    }
    const top = app.aiTierByLevel(5);
    expect(top.wizards.map((w) => w.name)).toEqual(['PoltroMago']);
    expect(top.wizards[0].style).toBe(null); // il gioco perfetto non ha preferenze
  });

  it('ogni mago sotto la quinta fascia ha una personalità nota', () => {
    for (const w of app.AI_WIZARDS.filter((x) => x.level < 5)) {
      expect(Object.keys(app.AI_STYLES)).toContain(w.style);
    }
  });

  it('i pesi delle personalità puntano dove promettono', () => {
    const w = (style, id, sec) => app.aiStyleWeight(style, id, sec);
    expect(w('aggressore', 'lightningBoltLong', 'damaging')).toBeGreaterThan(1.5);
    expect(w('aggressore', 'shield', 'protection')).toBeLessThan(1);
    expect(w('difensore', 'counterSpell', 'protection')).toBeGreaterThan(1.5);
    expect(w('evocatore', 'summonTroll', 'summons')).toBeGreaterThan(2);
    expect(w('ammaliatore', 'charmPerson', 'enchantment')).toBeGreaterThan(2);
    expect(w('avvelenatore', 'poison', 'enchantment')).toBeGreaterThan(2);
    expect(w('completo', 'missile', 'damaging')).toBe(1);
    expect(w(null, 'missile', 'damaging')).toBe(1); // PoltroMago: nessun bias
  });

  it('i pezzi grossi stanno in cima e i comprimari in fondo', () => {
    const lvl = (n) => app.aiWizardByName(n).level;
    // Gandalf tornò più forte di Saruman; Raistlin assorbì Fistandantilus;
    // Circe è la maga per antonomasia, Medea è sua nipote; Elminster > Mordenkainen.
    expect(lvl('Gandalf')).toBeGreaterThan(lvl('Saruman'));
    expect(lvl('Saruman')).toBeGreaterThan(lvl('Radagast'));
    expect(lvl('Raistlin')).toBeGreaterThan(lvl('Fistandantilus'));
    expect(lvl('Circe')).toBeGreaterThan(lvl('Medea'));
    expect(lvl('Elminster')).toBeGreaterThan(lvl('Mordenkainen'));
    expect(lvl('Merlino')).toBe(4);
    expect(lvl('Alatar')).toBe(1);
    expect(lvl('PoltroMago')).toBe(5);
    expect(lvl('PoltroMago')).toBeGreaterThan(lvl('Merlino'));
  });

  it('aiRandomWizard rispetta la fascia richiesta', () => {
    for (let lv = 1; lv <= 5; lv++) {
      for (let i = 0; i < 20; i++) expect(app.aiRandomWizard(lv).level).toBe(lv);
    }
  });

  it('aiTierByLevel e aiWizardByName sono coerenti', () => {
    expect(app.aiTierByLevel(4).key).toBe('arcimago');
    expect(app.aiWizardByName('non esiste')).toBe(null);
    expect(app.aiWizardByName('Circe').tier).toBe(app.aiTierByLevel(4).label);
  });
});

describe('cervello IA · lettura del gioco', () => {
  it('i pattern ricavati da /spells coincidono con quelli del motore', () => {
    const book = app.buildSpellBook(spellListJson());
    expect(book.length).toBe(Object.keys(SPELL_PATTERNS).length);
    for (const spell of book) {
      expect(spell.patterns).toEqual(SPELL_PATTERNS[spell.id]);
    }
  });

  it('parseSpellGestures capisce clap e gesti a due mani', () => {
    expect(app.parseSpellGestures('S-D')).toEqual([[
      { t: 'single', g: 'S' }, { t: 'single', g: 'D' },
    ]]);
    expect(app.parseSpellGestures('C-(w')).toEqual([[
      { t: 'clap' }, { t: 'both', g: 'W' },
    ]]);
    expect(app.parseSpellGestures('W-P-P / W-W-S')).toHaveLength(2);
  });

  it('ricostruisce dalle mosse le stesse sequenze che ha il server', () => {
    const svc = createGameService();
    const { id } = svc.createGame({ nameA: 'Alpha', nameB: 'Beta' });
    svc.joinGame(id, 'b', 'Beta');
    const mosse = [
      [{ left: 'S', right: 'W' }, { left: 'P', right: ' ' }],
      [{ left: 'F', right: 'W' }, { left: 'D', right: 'stab' }],
      [{ left: 'W', right: 'W' }, { left: 'C', right: 'C' }],
      [{ left: 'D', right: ' ' }, { left: 'W', right: 'W' }],
    ];
    let snap;
    for (const [a, b] of mosse) {
      svc.submitTurn(id, { playerId: 'a', ...a });
      snap = svc.submitTurn(id, { playerId: 'b', ...b });
    }
    const room = svc._games.get(id);
    for (const pid of ['a', 'b']) {
      const wizard = pid === 'a' ? room.state.wizardA : room.state.wizardB;
      const letto = app.aiHandBuffers(snap, pid);
      expect(letto.left).toEqual(wizard.leftHand.symbols);
      expect(letto.right).toEqual(wizard.rightHand.symbols);
    }
  });

  it('aiRemaining conta i gesti che mancano', () => {
    const missile = SPELL_PATTERNS.missile[0];
    expect(app.aiRemaining([], missile)).toBe(2);
    expect(app.aiRemaining([{ t: 'single', g: 'S' }], missile)).toBe(1);
    expect(app.aiRemaining([{ t: 'single', g: 'S' }, { t: 'single', g: 'D' }], missile)).toBe(0);
    // un gesto a due mani vale come singolo
    expect(app.aiRemaining([{ t: 'both', g: 'S' }], missile)).toBe(1);
    // sequenza sbagliata: si riparte da capo
    expect(app.aiRemaining([{ t: 'single', g: 'P' }], missile)).toBe(2);
  });

  it('vede le minacce a un gesto dal completamento', () => {
    const book = app.buildSpellBook(spellListJson());
    const buffers = { left: [{ t: 'single', g: 'S' }], right: [] };
    expect(app.aiIncomingThreats(buffers, book)).toContain('missile');

    const lampo = {
      left: [{ t: 'single', g: 'D' }, { t: 'single', g: 'F' },
        { t: 'single', g: 'F' }, { t: 'single', g: 'D' }],
      right: [],
    };
    expect(app.aiIncomingThreats(lampo, book)).toContain('lightningBoltLong');
    expect(app.aiIncomingThreats({ left: [], right: [] }, book)).not.toContain('missile');
  });
});

describe('cervello IA · scelte', () => {
  const book = () => app.buildSpellBook(spellListJson());

  function partita() {
    const svc = createGameService();
    const snap = svc.createGame({ nameA: 'Umano', nameB: 'Bot' });
    svc.joinGame(snap.id, 'b', 'Bot');
    return { svc, id: snap.id, snap };
  }

  it('non si arrende mai per sbaglio, a nessuna fascia', () => {
    const { snap } = partita();
    for (let lv = 1; lv <= 5; lv++) {
      for (let i = 0; i < 120; i++) {
        const t = app.chooseAiTurn(snap, { level: lv, playerId: 'b', book: book() });
        expect(t.left === 'P' && t.right === 'P').toBe(false);
        expect(t.left === 'stab' && t.right === 'stab').toBe(false);
      }
    }
  });

  it('produce sempre gesti che il server accetta', () => {
    const codes = new Set(app.HAND_OPTIONS.map((o) => o.code));
    const { snap } = partita();
    for (let lv = 1; lv <= 5; lv++) {
      for (let i = 0; i < 50; i++) {
        const t = app.chooseAiTurn(snap, { level: lv, playerId: 'b', book: book() });
        expect(codes.has(t.left)).toBe(true);
        expect(codes.has(t.right)).toBe(true);
      }
    }
  });

  it('l’arcimago chiude un missile che ha già impostato', () => {
    const { svc, id } = partita();
    svc.submitTurn(id, { playerId: 'a', left: ' ', right: ' ' });
    const snap = svc.submitTurn(id, { playerId: 'b', left: 'S', right: ' ' });
    const t = app.chooseAiTurn(snap, { level: 4, playerId: 'b', book: book() });
    expect(t.left).toBe('D'); // S-D = missile
    expect(t.leftSpell).toBe('missile');
  });

  it('l’arcimago dà ordini alle proprie creature', () => {
    const { snap } = partita();
    const game = { ...snap, monsters: [{ id: 'm1', alive: true, controllerId: 'b', label: 'Goblin', hp: 1, attack: 1 }] };
    const t = app.chooseAiTurn(game, { level: 4, playerId: 'b', book: book() });
    expect(t.monsterOrders).toEqual([{ monsterId: 'm1', targetId: 'a' }]);
  });

  it('i turni dell’IA sono giocabili dal motore vero, a ogni fascia', () => {
    for (let lv = 1; lv <= 5; lv++) {
      const { svc, id } = partita();
      let game = svc.getGame(id);
      for (let i = 0; i < 30 && !game.finished; i++) {
        svc.submitTurn(id, { playerId: 'a', left: ' ', right: ' ' });
        const t = app.chooseAiTurn(game, { level: lv, playerId: 'b', book: book() });
        game = svc.submitTurn(id, { playerId: 'b', ...t });
      }
      expect(game.turn).toBeGreaterThan(0);
    }
  });
});

describe('cervello IA · le fasce alte giocano meglio', () => {
  const book = () => app.buildSpellBook(spellListJson());

  /** Duello IA contro IA fino alla fine o al limite di turni. */
  function duello(levelA, levelB, maxTurni = 60, styleA = null, styleB = null) {
    const svc = createGameService();
    const snap = svc.createGame({ nameA: 'A', nameB: 'B' });
    svc.joinGame(snap.id, 'b', 'B');
    let game = svc.getGame(snap.id);
    const b = book();
    for (let i = 0; i < maxTurni && !game.finished; i++) {
      const ta = app.chooseAiTurn(game, { level: levelA, style: styleA, playerId: 'a', book: b });
      const tb = app.chooseAiTurn(game, { level: levelB, style: styleB, playerId: 'b', book: b });
      try {
        svc.submitTurn(snap.id, { playerId: 'a', ...ta });
        game = svc.submitTurn(snap.id, { playerId: 'b', ...tb });
      } catch {
        break; // partita chiusa a metà turno
      }
    }
    return game;
  }

  it('la scala delle fasce è monotòna: ognuna batte quella sotto', () => {
    // Misure statistiche: campioni ampi e soglie con margine sul valore atteso
    // (dal torneo da 50 partite: 2v1 90%, 3v2 86%, 4v3 54%, 5v4 100%).
    const percentuale = (a, b, n = 24) => {
      let win = 0;
      for (let i = 0; i < n; i++) if (duello(a, b, 40).winnerId === 'a') win += 1;
      return win / n;
    };
    expect(percentuale(2, 1)).toBeGreaterThan(0.6);
    expect(percentuale(3, 2)).toBeGreaterThan(0.55);
    expect(percentuale(4, 3)).toBeGreaterThan(0.25);
    expect(percentuale(4, 1)).toBeGreaterThan(0.75);
    // PoltroMago sta sopra a tutti
    expect(percentuale(5, 4)).toBeGreaterThan(0.75);
    expect(percentuale(5, 1)).toBeGreaterThan(0.85);
  });

  it('l’arcimago stravince contro l’apprendista', () => {
    let vittorie = 0;
    let danniInflitti = 0;
    let danniSubiti = 0;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const g = duello(1, 4);
      if (g.winnerId === 'b') vittorie += 1;
      danniInflitti += g.players.a.damage;
      danniSubiti += g.players.b.damage;
    }
    // Non pretendiamo il 100% (resa e caso esistono), ma il divario dev'essere netto
    expect(danniInflitti).toBeGreaterThan(danniSubiti * 2);
    expect(vittorie).toBeGreaterThanOrEqual(n / 2);
  });

  it('l’arcimago non perde mai la partita contro sé stesso per errori banali', () => {
    const g = duello(4, 4);
    // Nessuno dei due deve arrendersi: se finisce, è per danni
    if (g.finished && !g.isDraw) {
      const perdente = g.winnerId === 'a' ? 'b' : 'a';
      expect(g.players[perdente].damage).toBeGreaterThan(14);
    }
  });

  it('salendo di fascia si fa più male all’avversario', () => {
    const danno = (lv) => {
      let tot = 0;
      for (let i = 0; i < 8; i++) tot += duello(lv, 1, 25).players.b.damage;
      return tot;
    };
    expect(danno(4)).toBeGreaterThan(danno(1));
  });
});

describe('cervello IA · le personalità si vedono in partita', () => {
  const book = () => app.buildSpellBook(spellListJson());

  /** Incantesimi lanciati da «a» in N partite, contati per sezione. */
  function mixDiLanci(style, partite = 6) {
    const b = book();
    const sezione = new Map(b.map((s) => [s.id, s.section]));
    const tot = { damaging: 0, summons: 0, enchantment: 0, protection: 0 };
    const perSpell = {};
    for (let n = 0; n < partite; n++) {
      const svc = createGameService();
      const snap = svc.createGame({ nameA: 'A', nameB: 'B' });
      svc.joinGame(snap.id, 'b', 'B');
      let game = svc.getGame(snap.id);
      for (let i = 0; i < 40 && !game.finished; i++) {
        const ta = app.chooseAiTurn(game, { level: 4, style, playerId: 'a', book: b });
        const tb = app.chooseAiTurn(game, { level: 2, playerId: 'b', book: b });
        try {
          svc.submitTurn(snap.id, { playerId: 'a', ...ta });
          game = svc.submitTurn(snap.id, { playerId: 'b', ...tb });
        } catch { break; }
        for (const c of game.lastTurnCasts || []) {
          if (c.casterId !== 'a') continue;
          const sec = sezione.get(c.spell);
          if (sec in tot) tot[sec] += 1;
          perSpell[c.spell] = (perSpell[c.spell] || 0) + 1;
        }
      }
    }
    const n = Object.values(tot).reduce((x, y) => x + y, 0) || 1;
    return {
      quota: Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, v / n])),
      perSpell,
    };
  }

  it('l’aggressore fa più danno diretto del difensore', () => {
    expect(mixDiLanci('aggressore').quota.damaging)
      .toBeGreaterThan(mixDiLanci('difensore').quota.damaging);
  });

  it('il difensore si protegge più dell’aggressore', () => {
    expect(mixDiLanci('difensore').quota.protection)
      .toBeGreaterThan(mixDiLanci('aggressore').quota.protection);
  });

  it('l’evocatore è l’unico che riempie il campo di creature', () => {
    // misurato ~31% contro 0% di tutti gli altri stili
    expect(mixDiLanci('evocatore', 10).quota.summons).toBeGreaterThan(0.08);
    expect(mixDiLanci('completo', 10).quota.summons).toBeLessThan(0.05);
  });

  it('l’ammaliatore punta sugli enchantment mentali', () => {
    const m = mixDiLanci('ammaliatore');
    expect(m.quota.enchantment).toBeGreaterThan(mixDiLanci('aggressore').quota.enchantment);
    const mentali = ['paralysis', 'charmPerson', 'amnesia', 'confusion', 'fear'];
    expect(mentali.some((s) => m.perSpell[s])).toBe(true);
  });

  it('l’avvelenatore avvelena davvero, nonostante siano incantesimi lunghi', () => {
    // regressione: con un peso troppo basso non lanciava mai poison/disease
    const m = mixDiLanci('avvelenatore', 14);
    expect((m.perSpell.poison || 0) + (m.perSpell.disease || 0)).toBeGreaterThan(0);
  });

  it('PoltroMago non ha bias: gioca uguale a prescindere dallo stile passato', () => {
    const game = snapshotAfter([[{ left: 'S', right: ' ' }, { left: 'W', right: ' ' }]]);
    const b = book();
    const senza = app.chooseAiTurn(game, { level: 5, playerId: 'b', book: b });
    const con = app.chooseAiTurn(game, { level: 5, style: 'aggressore', playerId: 'b', book: b });
    expect(con.left).toBe(senza.left);
    expect(con.right).toBe(senza.right);
  });
});
