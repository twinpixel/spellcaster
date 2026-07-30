/**
 * Test del worker realmente distribuito: esegue server/build.js, importa
 * dist/worker.js e lo interroga con un Durable Object simulato.
 * Copre routing, same-origin, persistenza e propagazione degli errori.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { allSpellIds } from './shared.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://spellcaster.test';

let worker;
let GameRoom;

/** Durable Object namespace finto: una istanza per nome, storage in memoria. */
function makeEnv(extra = {}) {
  const rooms = new Map();
  const env = {
    REQUIRE_SAME_ORIGIN: 'true',
    ...extra,
  };
  env.GAME = {
    idFromName: (name) => name,
    get: (name) => {
      if (!rooms.has(name)) {
        const store = new Map();
        const ctx = {
          storage: {
            async get(k) { return store.get(k); },
            async put(k, v) { store.set(k, v); },
          },
        };
        rooms.set(name, new GameRoom(ctx, env));
      }
      return rooms.get(name);
    },
  };
  env._rooms = rooms;
  return env;
}

function call(env, pathname, init) {
  return worker.fetch(new Request(BASE + pathname, init), env);
}

function post(env, pathname, body, headers = {}) {
  return call(env, pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body ?? {}),
  });
}

async function json(res) {
  return res.json();
}

async function newGame(env, body) {
  return json(await post(env, '/games', body ?? {}));
}

beforeAll(async () => {
  execFileSync(process.execPath, [path.join(ROOT, 'server', 'build.js')], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  const mod = await import(pathToFileURL(path.join(ROOT, 'dist', 'worker.js')).href);
  worker = mod.default;
  GameRoom = mod.GameRoom;
});

describe('worker · rotte pubbliche', () => {
  it('/health', async () => {
    const res = await call(makeEnv(), '/health');
    expect(res.status).toBe(200);
    await expect(json(res)).resolves.toEqual({ status: 'ok', service: 'spellcaster' });
  });

  it('/spells espone tutto il catalogo', async () => {
    const list = await json(await call(makeEnv(), '/spells'));
    expect(list).toHaveLength(allSpellIds().length);
    expect(new Set(list.map((s) => s.id))).toEqual(new Set(allSpellIds()));
    for (const s of list) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.gestures).toBeTruthy();
      expect(['protection', 'summons', 'damaging', 'enchantment']).toContain(s.section);
    }
  });

  it('OPTIONS risponde 204 senza corpo con gli header CORS', async () => {
    const res = await call(makeEnv(), '/games', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('OPTIONS funziona anche sulle rotte di partita (preflight)', async () => {
    const env = makeEnv();
    const game = await newGame(env);
    const res = await call(env, `/games/${game.id}/turn`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://altro.test' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('le richieste non-API finiscono agli ASSETS', async () => {
    const env = makeEnv({ ASSETS: { fetch: async () => new Response('css', { status: 200 }) } });
    const res = await call(env, '/styles.css');
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe('css');
  });

  it('senza ASSETS le rotte sconosciute danno 404', async () => {
    const res = await call(makeEnv(), '/qualcosa');
    expect(res.status).toBe(404);
  });
});

describe('worker · same-origin', () => {
  it('blocca POST cross-origin quando REQUIRE_SAME_ORIGIN=true', async () => {
    const env = makeEnv();
    const res = await post(env, '/games', {}, { Origin: 'https://evil.test' });
    expect(res.status).toBe(403);
    await expect(json(res)).resolves.toEqual({ error: 'forbidden_origin' });
  });

  it('accetta POST same-origin', async () => {
    const env = makeEnv();
    const res = await post(env, '/games', {}, { Origin: BASE });
    expect(res.status).toBe(200);
  });

  it('lascia passare le GET cross-origin', async () => {
    const env = makeEnv();
    const game = await newGame(env);
    const res = await call(env, `/games/${game.id}`, { headers: { Origin: 'https://evil.test' } });
    expect(res.status).toBe(200);
  });

  it('con REQUIRE_SAME_ORIGIN diverso da "true" non blocca nulla', async () => {
    const env = makeEnv({ REQUIRE_SAME_ORIGIN: 'false' });
    const res = await post(env, '/games', {}, { Origin: 'https://evil.test' });
    expect(res.status).toBe(200);
  });
});

describe('worker · ciclo di vita partita', () => {
  it('crea, entra, gioca e conserva lo stato tra le richieste', async () => {
    const env = makeEnv();
    const game = await newGame(env, { playerA: 'Alpha', playerB: 'Beta' });
    expect(game.id).toBeTruthy();
    expect(game.players.a.name).toBe('Alpha');
    expect(game.joined).toEqual({ a: true, b: false });

    const snap = await json(await call(env, `/games/${game.id}`));
    expect(snap.id).toBe(game.id);
    expect(snap.turn).toBe(0);

    const joined = await json(await post(env, `/games/${game.id}/join`, { playerId: 'b', name: 'Beta' }));
    expect(joined.joined.b).toBe(true);
    expect(joined.players.b.name).toBe('Beta');

    // S-D = missile
    const pending = await json(await post(env, `/games/${game.id}/turn`, { playerId: 'a', left: 'S', right: ' ' }));
    expect(pending.pendingTurn.submitted).toEqual(['a']);
    expect(pending.pendingTurn.waitingFor).toEqual(['b']);

    await post(env, `/games/${game.id}/turn`, { playerId: 'b', left: ' ', right: ' ' });
    await post(env, `/games/${game.id}/turn`, { playerId: 'a', left: 'D', right: ' ' });
    const done = await json(await post(env, `/games/${game.id}/turn`, { playerId: 'b', left: ' ', right: ' ' }));

    expect(done.turn).toBe(2);
    expect(done.pendingTurn).toBeUndefined();
    expect(done.players.b.damage).toBe(1);
    expect(done.lastTurnCasts.some((c) => c.spell === 'missile')).toBe(true);
    expect(done.history).toHaveLength(2);
    expect(done.history[0].turn).toBe(2);
  });

  it('propaga gli errori del motore come 400', async () => {
    const env = makeEnv();
    const game = await newGame(env);

    const badGesture = await post(env, `/games/${game.id}/turn`, { playerId: 'a', left: 'X', right: ' ' });
    expect(badGesture.status).toBe(400);
    expect((await json(badGesture)).error).toMatch(/invalid_gesture/);

    const badPlayer = await post(env, `/games/${game.id}/turn`, { playerId: 'z', left: 'P', right: ' ' });
    expect(badPlayer.status).toBe(400);
    expect((await json(badPlayer)).error).toBe('invalid_player');

    expect((await post(env, `/games/${game.id}/turn`, { playerId: 'a', left: 'P', right: ' ' })).status).toBe(200);
    const twice = await post(env, `/games/${game.id}/turn`, { playerId: 'a', left: 'P', right: ' ' });
    expect(twice.status).toBe(400);
    expect((await json(twice)).error).toBe('already_submitted');
  });

  it('richiede playerId sul turno e JSON valido', async () => {
    const env = makeEnv();
    const game = await newGame(env);

    const noPlayer = await post(env, `/games/${game.id}/turn`, { left: 'P', right: ' ' });
    expect(noPlayer.status).toBe(400);
    expect((await json(noPlayer)).error).toBe('playerId required');

    const broken = await call(env, `/games/${game.id}/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'non-json',
    });
    expect(broken.status).toBe(400);
    expect((await json(broken)).error).toBe('invalid_json');
  });

  it('rifiuta l’ingresso a partita finita e a posto occupato', async () => {
    const env = makeEnv();
    const game = await newGame(env);

    const first = await json(await post(env, `/games/${game.id}/join`, { playerId: 'b', name: 'Beta' }));
    expect(first.playerToken).toBeTruthy();

    const intruso = await post(env, `/games/${game.id}/join`, { playerId: 'b', name: 'Intruso' });
    expect(intruso.status).toBe(400);
    expect((await json(intruso)).error).toBe('seat_taken');

    // ma il legittimo rientra col token
    const back = await post(env, `/games/${game.id}/join`,
      { playerId: 'b', name: 'Beta', token: first.playerToken });
    expect(back.status).toBe(200);

    // a partita finita nessuno entra più
    await post(env, `/games/${game.id}/turn`, { playerId: 'a', left: 'P', right: 'P' });
    await post(env, `/games/${game.id}/turn`, { playerId: 'b', left: ' ', right: ' ' });
    const dopo = await post(env, `/games/${game.id}/join`,
      { playerId: 'b', name: 'Beta', token: first.playerToken });
    expect(dopo.status).toBe(400);
    expect((await json(dopo)).error).toBe('game_finished');
  });

  it('il token non compare nello snapshot pubblico', async () => {
    const env = makeEnv();
    const game = await newGame(env);
    const { playerToken } = await json(
      await post(env, `/games/${game.id}/join`, { playerId: 'b', name: 'Beta' }));
    const snap = await (await call(env, `/games/${game.id}`)).text();
    expect(snap).not.toContain(playerToken);
  });

  it('rifiuta join con playerId non valido', async () => {
    const env = makeEnv();
    const game = await newGame(env);
    const res = await post(env, `/games/${game.id}/join`, { playerId: 'c' });
    expect(res.status).toBe(400);
    expect((await json(res)).error).toBe('invalid_player');
  });

  it('404 su partita inesistente', async () => {
    const env = makeEnv();
    const res = await call(env, '/games/non-esiste');
    expect(res.status).toBe(404);
    await expect(json(res)).resolves.toEqual({ error: 'not_found' });
  });

  it('rifiuta i turni a partita conclusa', async () => {
    const env = makeEnv();
    const game = await newGame(env);
    // Resa: P su entrambe le mani
    await post(env, `/games/${game.id}/turn`, { playerId: 'a', left: 'P', right: 'P' });
    const end = await json(await post(env, `/games/${game.id}/turn`, { playerId: 'b', left: ' ', right: ' ' }));
    expect(end.finished).toBe(true);
    expect(end.winnerId).toBe('b');

    const after = await post(env, `/games/${game.id}/turn`, { playerId: 'a', left: 'P', right: ' ' });
    expect(after.status).toBe(400);
    expect((await json(after)).error).toBe('game_finished');
  });

  it('lo stato sopravvive a una nuova istanza del Durable Object', async () => {
    const env = makeEnv();
    const game = await newGame(env);
    await post(env, `/games/${game.id}/turn`, { playerId: 'a', left: 'S', right: ' ' });
    await post(env, `/games/${game.id}/turn`, { playerId: 'b', left: ' ', right: ' ' });

    // Simula l’eviction: la stanza viene ricreata e ricarica da storage
    const room = env._rooms.get(game.id);
    room.room = null;

    const snap = await json(await call(env, `/games/${game.id}`));
    expect(snap.turn).toBe(1);
    expect(snap.players.a.leftGestures).toBe(1);
  });

  it('propaga allowCharmNothing alla partita', async () => {
    const env = makeEnv();
    const game = await newGame(env, { allowCharmNothing: true });
    expect(game.rules.allowCharmNothing).toBe(true);
    const plain = await newGame(env, {});
    expect(plain.rules.allowCharmNothing).toBe(false);
  });

  it('gestisce id di partita con caratteri da codificare', async () => {
    const env = makeEnv();
    const stub = env.GAME.get('a b/c');
    const created = await stub.fetch(new Request(`${BASE}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'a b/c' }),
    }));
    expect(created.status).toBe(200);
    const res = await call(env, `/games/${encodeURIComponent('a b/c')}`);
    expect(res.status).toBe(200);
    expect((await json(res)).id).toBe('a b/c');
  });
});
