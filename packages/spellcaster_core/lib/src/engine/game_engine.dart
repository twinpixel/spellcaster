import '../models/game_state.dart';
import '../models/turn_action.dart';
import '../models/wizard.dart';
import '../spell_id.dart';
import 'turn_resolver.dart';

/// High-level duel controller: pre-battle setup and turn submission.
class GameEngine {
  GameEngine({TurnResolver? resolver})
      : _resolver = resolver ?? TurnResolver();

  final TurnResolver _resolver;

  GameState newGame({
    required String nameA,
    required String nameB,
    String idA = 'a',
    String idB = 'b',
  }) {
    final state = GameState(
      wizardA: Wizard(id: idA, name: nameA),
      wizardB: Wizard(id: idB, name: nameB),
    );
    _applyPreBattleDispel(state);
    return state;
  }

  /// Referee casts dispel magic + anti-spell before battle (rules).
  void _applyPreBattleDispel(GameState state) {
    for (final w in state.wizards) {
      w.status.resistHeat = false;
      w.status.resistCold = false;
      w.status.antiSpellNextTurn = true;
      w.leftHand.clear();
      w.rightHand.clear();
    }
  }

  /// Submit both wizards' turns; returns updated state summary.
  TurnResult playTurn(
    GameState state, {
    required TurnAction actionA,
    required TurnAction actionB,
    SpellId? leftChoiceA,
    SpellId? rightChoiceA,
    SpellId? leftChoiceB,
    SpellId? rightChoiceB,
  }) {
    if (state.finished) {
      return TurnResult(state: state, message: 'Game already finished');
    }

    state.turn++;

    if (actionA.isSurrender && actionB.isSurrender) {
      state.finished = true;
      state.isDraw = true;
      return TurnResult(state: state, surrendered: true, draw: true);
    }

    _resolver.applyGestures(state, state.wizardA.id, actionA);
    _resolver.applyGestures(state, state.wizardB.id, actionB);

    final castsA = _resolver.detectCasts(
      state.wizardA,
      leftChoice: leftChoiceA,
      rightChoice: rightChoiceA,
    );
    final castsB = _resolver.detectCasts(
      state.wizardB,
      leftChoice: leftChoiceB,
      rightChoice: rightChoiceB,
    );

    _checkWinner(state, actionA, actionB);

    return TurnResult(
      state: state,
      castsA: castsA,
      castsB: castsB,
    );
  }

  void _checkWinner(GameState state, TurnAction a, TurnAction b) {
    if (state.wizardA.isDead && state.wizardB.isDead) {
      state.finished = true;
      state.isDraw = true;
    } else if (state.wizardA.isDead) {
      state.finished = true;
      state.winnerId = state.wizardB.id;
    } else if (state.wizardB.isDead) {
      state.finished = true;
      state.winnerId = state.wizardA.id;
    } else if (a.isSurrender) {
      state.finished = true;
      state.winnerId = state.wizardB.id;
    } else if (b.isSurrender) {
      state.finished = true;
      state.winnerId = state.wizardA.id;
    }
  }
}

class TurnResult {
  TurnResult({
    required this.state,
    this.castsA = const [],
    this.castsB = const [],
    this.message,
    this.surrendered = false,
    this.draw = false,
  });

  final GameState state;
  final List<CastSpell> castsA;
  final List<CastSpell> castsB;
  final String? message;
  final bool surrendered;
  final bool draw;
}
