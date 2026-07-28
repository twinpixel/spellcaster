/**
 * Spellcaster API – Cloudflare Worker + Durable Object per partita
 * Rigenera con: npm run build:worker
 */

/* __EMBED_DATA__ */

function gameStub(env, gameId) {
  const id = env.GAME.idFromName(gameId);
  return env.GAME.get(id);
}

async function forwardToRoom(env, gameId, request) {
  const stub = gameStub(env, gameId);
  return stub.fetch(request);
}

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.room = null;
  }

  async load() {
    if (this.room) return this.room;
    const stored = await this.ctx.storage.get('room');
    this.room = stored || null;
    return this.room;
  }

  async save() {
    if (this.room) await this.ctx.storage.put('room', this.room);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return jsonResponse({}, 204);
    }

    // POST /internal/create
    if (path.endsWith('/create') && request.method === 'POST') {
      let body = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const id = body.id;
      if (!id) return jsonResponse({ error: 'id required' }, 400);
      this.room = createRoom(id, {
        nameA: body.playerA || 'Giocatore A',
        nameB: body.playerB || 'Giocatore B',
        allowCharmNothing: !!body.allowCharmNothing,
      });
      await this.save();
      return jsonResponse(snapshot(this.room));
    }

    await this.load();
    if (!this.room) return jsonResponse({ error: 'not_found' }, 404);

    if (request.method === 'GET') {
      return jsonResponse(snapshot(this.room));
    }

    if (path.endsWith('/join') && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'invalid_json' }, 400);
      }
      try {
        const snap = joinRoom(this.room, body.playerId, body.name);
        await this.save();
        return jsonResponse(snap);
      } catch (e) {
        return jsonResponse({ error: e?.message || String(e) }, 400);
      }
    }

    if (path.endsWith('/turn') && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'invalid_json' }, 400);
      }
      if (!body?.playerId) {
        return jsonResponse({ error: 'playerId required' }, 400);
      }
      try {
        const snap = submitTurnToRoom(this.room, {
          playerId: body.playerId,
          left: body.left ?? ' ',
          right: body.right ?? ' ',
          left2: body.left2,
          right2: body.right2,
          leftSpell: body.leftSpell,
          rightSpell: body.rightSpell,
          spellTargets: body.spellTargets,
          monsterOrders: body.monsterOrders,
          stabTarget: body.stabTarget,
          elementalType: body.elementalType,
          charmForced: body.charmForced,
          charmHand: body.charmHand,
          paralysisHand: body.paralysisHand,
          releaseDelayed: body.releaseDelayed,
        });
        await this.save();
        return jsonResponse(snap);
      } catch (e) {
        const msg = e?.message || String(e);
        return jsonResponse({ error: msg }, 400);
      }
    }

    return jsonResponse({ error: 'not_found' }, 404);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return jsonResponse({}, 204);
    }

    if (path === '/health') {
      return jsonResponse({ status: 'ok', service: 'spellcaster' });
    }

    if (path === '/spells' && request.method === 'GET') {
      return jsonResponse(spellListJson());
    }

    if (path === '/games' && request.method === 'POST') {
      if (env.REQUIRE_SAME_ORIGIN === 'true' && !isSameOrigin(request)) {
        return jsonResponse({ error: 'forbidden_origin' }, 403);
      }
      let body = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const stub = gameStub(env, id);
      const createReq = new Request(new URL('/create', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          playerA: body.playerA || 'Giocatore A',
          playerB: body.playerB || 'Giocatore B',
          allowCharmNothing: !!body.allowCharmNothing,
        }),
      });
      return stub.fetch(createReq);
    }

    const gameMatch = path.match(/^\/games\/([^/]+)(?:\/(turn|join))?$/);
    if (gameMatch) {
      if (env.REQUIRE_SAME_ORIGIN === 'true' && request.method !== 'GET' && !isSameOrigin(request)) {
        return jsonResponse({ error: 'forbidden_origin' }, 403);
      }
      const gameId = decodeURIComponent(gameMatch[1]);
      const action = gameMatch[2];
      const internalPath = action ? `/${action}` : '/';
      const forwarded = new Request(new URL(internalPath, request.url), request);
      return forwardToRoom(env, gameId, forwarded);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return textResponse('Not found', 404);
  },
};
