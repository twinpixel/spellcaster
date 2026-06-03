import 'dart:convert';

import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

/// Serializable game snapshot for API/WebSocket.
class GameSnapshot {
  GameSnapshot({
    required this.id,
    required this.turn,
    required this.finished,
    required this.players,
    required this.rules,
    this.winnerId,
    this.isDraw = false,
    this.pendingTurn,
    this.lastTurnCasts = const [],
  });

  final String id;
  final int turn;
  final bool finished;
  final String? winnerId;
  final bool isDraw;
  final Map<String, dynamic> players;
  final Map<String, dynamic> rules;
  final Map<String, dynamic>? pendingTurn;
  final List<Map<String, dynamic>> lastTurnCasts;

  Map<String, dynamic> toJson() => {
        'id': id,
        'turn': turn,
        'finished': finished,
        'winnerId': winnerId,
        'isDraw': isDraw,
        'players': players,
        'rules': rules,
        if (pendingTurn != null) 'pendingTurn': pendingTurn,
        if (lastTurnCasts.isNotEmpty) 'lastTurnCasts': lastTurnCasts,
      };
}

class _GameRoom {
  _GameRoom(this.id, this.state, this.engine);

  final String id;
  final GameState state;
  final GameEngine engine;
  final Map<String, TurnAction?> submitted = {};
  List<Map<String, dynamic>> lastTurnCasts = [];
}

class GameService {
  final Map<String, _GameRoom> _games = {};
  final Map<String, List<WebSocketChannel>> _subscribers = {};

  GameSnapshot createGame({
    required String playerA,
    required String playerB,
    bool allowCharmNothing = false,
  }) {
    final id = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
    final rules = GameRules(allowCharmNothing: allowCharmNothing);
    final engine = GameEngine(rules: rules);
    final state = engine.newGame(nameA: playerA, nameB: playerB, rules: rules);
    _games[id] = _GameRoom(id, state, engine);
    return _snapshot(_games[id]!);
  }

  GameSnapshot? getGame(String id) {
    final room = _games[id];
    return room == null ? null : _snapshot(room);
  }

  GameSnapshot submitTurn(
    String id, {
    required String playerId,
    required String left,
    required String right,
    String? leftSpell,
    String? rightSpell,
    String? charmForced,
  }) {
    final room = _games[id];
    if (room == null) throw StateError('not_found');
    if (room.state.finished) throw StateError('game_finished');

    if (charmForced != null) {
      room.engine.validateCharmPersonGesture(
        room.state,
        _parseHand(charmForced),
      );
    }

    final action = _parseTurn(left, right);
    room.submitted[playerId] = action;
    room.lastTurnCasts = [];

    final ids = [room.state.wizardA.id, room.state.wizardB.id];
    if (!room.submitted.containsKey(ids[0]) || !room.submitted.containsKey(ids[1])) {
      return _snapshot(room);
    }

    final a = room.submitted[ids[0]]!;
    final b = room.submitted[ids[1]]!;
    room.submitted.clear();

    final leftA = _parseSpell(leftSpell);
    final rightA = _parseSpell(rightSpell);
    final result = room.engine.playTurn(
      room.state,
      actionA: a,
      actionB: b,
      leftChoiceA: ids[0] == room.state.wizardA.id ? leftA : null,
      rightChoiceA: ids[0] == room.state.wizardA.id ? rightA : null,
      leftChoiceB: ids[1] == room.state.wizardB.id ? leftA : null,
      rightChoiceB: ids[1] == room.state.wizardB.id ? rightA : null,
    );
    room.lastTurnCasts = [
      ...result.castsA.map(_castJson),
      ...result.castsB.map(_castJson),
    ];

    return _snapshot(room);
  }

  void subscribe(String gameId, WebSocketChannel channel) {
    _subscribers.putIfAbsent(gameId, () => []).add(channel);
  }

  void broadcast(String gameId, Map<String, dynamic> payload) {
    final msg = jsonEncode(payload);
    final list = _subscribers[gameId];
    if (list == null) return;
    for (final ch in List<WebSocketChannel>.from(list)) {
      ch.sink.add(msg);
    }
  }

  TurnAction _parseTurn(String left, String right) {
    return TurnAction(left: _parseHand(left), right: _parseHand(right));
  }

  HandAction _parseHand(String raw) {
    final t = raw.trim().toLowerCase();
    if (t.isEmpty || t == ' ' || t == '-' || t == 'nothing') {
      return const HandAction.nothing();
    }
    if (t == 'stab') return const HandAction.stab();
    if (t == 'c' || t == 'clap') return const HandAction.clap();
    final g = Gesture.parse(raw);
    if (g != null) return HandAction.gesture(g);
    throw StateError('invalid_gesture: $raw');
  }

  SpellId? _parseSpell(String? name) {
    if (name == null || name.isEmpty) return null;
    for (final id in SpellId.values) {
      if (id.name == name) return id;
    }
    return null;
  }

  GameSnapshot _snapshot(_GameRoom room) {
    final s = room.state;
    return GameSnapshot(
      id: room.id,
      turn: s.turn,
      finished: s.finished,
      winnerId: s.winnerId,
      isDraw: s.isDraw,
      players: {
        s.wizardA.id: _wizardJson(s.wizardA),
        s.wizardB.id: _wizardJson(s.wizardB),
      },
      rules: {
        'allowCharmNothing': s.rules.allowCharmNothing,
      },
      pendingTurn: room.submitted.isEmpty
          ? null
          : {'waiting': room.submitted.keys.toList()},
      lastTurnCasts: List<Map<String, dynamic>>.from(room.lastTurnCasts),
    );
  }

  Map<String, dynamic> _castJson(CastSpell c) => {
        'spell': c.spell.name,
        'casterId': c.casterId,
        'targetId': c.targetId,
        'handIndex': c.handIndex,
      };

  Map<String, dynamic> _wizardJson(Wizard w) => {
        'id': w.id,
        'name': w.name,
        'damage': w.damage,
        'alive': w.isAlive,
        'usedShortLightning': w.usedShortLightning,
        'leftGestures': w.leftHand.symbols.length,
        'rightGestures': w.rightHand.symbols.length,
      };
}
