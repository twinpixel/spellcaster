import { describe, expect, it } from 'vitest';
import {
  parseTurn,
  isSurrender,
  isClap,
  newGame,
  playTurn,
  matchHand,
  createGameService,
} from './shared.js';

describe('parseTurn', () => {
  it('parses gestures and nothing', () => {
    const t = parseTurn('P', ' ');
    expect(t.left).toEqual({ kind: 'gesture', gesture: 'P' });
    expect(t.right).toEqual({ kind: 'nothing' });
  });

  it('detects surrender', () => {
    expect(isSurrender(parseTurn('P', 'P'))).toBe(true);
  });

  it('detects clap', () => {
    expect(isClap(parseTurn('C', 'c'))).toBe(true);
  });
});

describe('engine', () => {
  it('creates a fresh game', () => {
    const g = newGame({ nameA: 'A', nameB: 'B' });
    expect(g.wizardA.damage).toBe(0);
    expect(g.turn).toBe(0);
  });

  it('casts shield after P on one hand', () => {
    const state = newGame();
    const a = parseTurn('P', ' ');
    const b = parseTurn(' ', ' ');
    const result = playTurn(state, a, b);
    expect(result.castsA.some((c) => c.spell === 'shield')).toBe(true);
    expect(state.turn).toBe(1);
  });

  it('casts missile after S then D', () => {
    const state = newGame();
    playTurn(state, parseTurn('S', ' '), parseTurn(' ', ' '));
    const result = playTurn(state, parseTurn('D', ' '), parseTurn(' ', ' '));
    expect(result.castsA.some((c) => c.spell === 'missile')).toBe(true);
  });

  it('matchHand finds shield on single P', () => {
    const hand = { symbols: [{ t: 'single', g: 'P' }] };
    const m = matchHand(hand, 0);
    expect(m.some((x) => x.id === 'shield')).toBe(true);
  });
});

describe('GameService', () => {
  it('creates and resolves a solo-style turn barrier', () => {
    const svc = createGameService();
    const snap = svc.createGame({ nameA: 'Tu', nameB: 'Bot' });
    expect(snap.id).toBeTruthy();

    let after = svc.submitTurn(snap.id, { playerId: 'a', left: 'P', right: ' ' });
    expect(after.pendingTurn?.submitted).toContain('a');
    expect(after.pendingTurn?.waitingFor).toContain('b');

    after = svc.submitTurn(snap.id, { playerId: 'b', left: ' ', right: ' ' });
    expect(after.pendingTurn).toBeUndefined();
    expect(after.turn).toBe(1);
    expect(after.lastTurnCasts.some((c) => c.spell === 'shield')).toBe(true);
  });

  it('marks player B as joined', () => {
    const svc = createGameService();
    const snap = svc.createGame({ nameA: 'Host', nameB: 'Guest' });
    expect(snap.joined.b).toBe(false);
    const joined = svc.joinGame(snap.id, 'b', 'Ospite');
    expect(joined.joined.b).toBe(true);
    expect(joined.players.b.name).toBe('Ospite');
  });

  it('records turn history newest-first in snapshot', () => {
    const svc = createGameService();
    const snap = svc.createGame();
    svc.submitTurn(snap.id, { playerId: 'a', left: 'S', right: ' ' });
    svc.submitTurn(snap.id, { playerId: 'b', left: ' ', right: ' ' });
    svc.submitTurn(snap.id, { playerId: 'a', left: 'D', right: ' ' });
    const after = svc.submitTurn(snap.id, { playerId: 'b', left: ' ', right: ' ' });
    expect(after.history).toHaveLength(2);
    expect(after.history[0].turn).toBe(2);
    expect(after.history[0].a.left).toBe('D');
    expect(after.history[1].turn).toBe(1);
    expect(after.history[1].a.left).toBe('S');
  });

  it('applies missile damage to the opponent', () => {
    const svc = createGameService();
    const snap = svc.createGame();
    svc.submitTurn(snap.id, { playerId: 'a', left: 'S', right: ' ' });
    svc.submitTurn(snap.id, { playerId: 'b', left: ' ', right: ' ' });
    svc.submitTurn(snap.id, { playerId: 'a', left: 'D', right: ' ' });
    const after = svc.submitTurn(snap.id, { playerId: 'b', left: ' ', right: ' ' });
    expect(after.players.b.damage).toBe(1);
    expect(after.players.a.damage).toBe(0);
    expect(after.lastTurnCasts.some((c) => c.spell === 'missile' && c.targetId === 'b')).toBe(true);
  });

  it('shield blocks missile', () => {
    const svc = createGameService();
    const snap = svc.createGame();
    svc.submitTurn(snap.id, { playerId: 'a', left: 'S', right: ' ' });
    svc.submitTurn(snap.id, { playerId: 'b', left: ' ', right: ' ' });
    svc.submitTurn(snap.id, { playerId: 'a', left: 'D', right: ' ' });
    const after = svc.submitTurn(snap.id, { playerId: 'b', left: 'P', right: ' ' });
    expect(after.players.b.damage).toBe(0);
    expect(after.lastTurnCasts.some((c) => c.spell === 'shield')).toBe(true);
  });

  it('stab deals 1 damage unless shielded', () => {
    const svc = createGameService();
    const snap = svc.createGame();
    svc.submitTurn(snap.id, { playerId: 'a', left: 'stab', right: ' ' });
    const after = svc.submitTurn(snap.id, { playerId: 'b', left: ' ', right: ' ' });
    expect(after.players.b.damage).toBe(1);

    const snap2 = svc.createGame();
    svc.submitTurn(snap2.id, { playerId: 'a', left: 'stab', right: ' ' });
    const blocked = svc.submitTurn(snap2.id, { playerId: 'b', left: 'P', right: ' ' });
    expect(blocked.players.b.damage).toBe(0);
  });

  it('summon goblin attacks opponent for 1', () => {
    const svc = createGameService();
    const snap = svc.createGame();
    // S-F-W
    svc.submitTurn(snap.id, { playerId: 'a', left: 'S', right: ' ' });
    svc.submitTurn(snap.id, { playerId: 'b', left: ' ', right: ' ' });
    svc.submitTurn(snap.id, { playerId: 'a', left: 'F', right: ' ' });
    svc.submitTurn(snap.id, { playerId: 'b', left: ' ', right: ' ' });
    svc.submitTurn(snap.id, { playerId: 'a', left: 'W', right: ' ' });
    const after = svc.submitTurn(snap.id, { playerId: 'b', left: ' ', right: ' ' });
    expect(after.monsters.some((m) => m.type === 'goblin' && m.alive)).toBe(true);
    expect(after.players.b.damage).toBe(1);
    expect(after.monsterColumns.length).toBe(1);
    expect(after.history[0].monsters[after.monsterColumns[0].id].text).toMatch(/→/);
  });
});
