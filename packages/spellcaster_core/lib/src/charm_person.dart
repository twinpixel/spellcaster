import 'gesture.dart';
import 'game_rules.dart';

/// Validation for [SpellId.charmPerson] forced gestures.
abstract final class CharmPersonRules {
  /// Whether the charmer may assign this action to the subject's named hand.
  static bool isValidForcedAction(HandAction action, GameRules rules) {
    return switch (action.kind) {
      HandActionKind.gesture || HandActionKind.stab => true,
      HandActionKind.nothing => rules.allowCharmNothing,
      HandActionKind.clap => false,
    };
  }

  /// Throws [CharmPersonInvalidGesture] if invalid.
  static void validateForcedAction(HandAction action, GameRules rules) {
    if (!isValidForcedAction(action, rules)) {
      throw CharmPersonInvalidGesture(action, rules.allowCharmNothing);
    }
  }
}

class CharmPersonInvalidGesture implements Exception {
  CharmPersonInvalidGesture(this.action, this.allowCharmNothing);

  final HandAction action;
  final bool allowCharmNothing;

  @override
  String toString() => allowCharmNothing
      ? 'Invalid charm person gesture: ${action.kind}'
      : 'Charm person cannot force nothing (nulla); use F, P, S, W, D, or stab.';
}
