import '../gesture.dart';
import '../hand_buffer.dart';
import '../models/game_state.dart';
import '../models/turn_action.dart';
import '../models/wizard.dart';
import '../spell_id.dart';
import '../spell_matcher.dart';
import '../effects/spell_effects.dart';

/// A spell cast this turn with caster, target, and hand.
class CastSpell {
  CastSpell({
    required this.spell,
    required this.casterId,
    required this.targetId,
    required this.handIndex,
  });

  final SpellId spell;
  final String casterId;
  final String targetId;
  final int handIndex;
}

/// Resolves one turn: gestures, completed spells, damage.
class TurnResolver {
  TurnResolver({SpellMatcher? matcher}) : _matcher = matcher ?? const SpellMatcher();

  final SpellMatcher _matcher;

  void applyGestures(GameState state, String wizardId, TurnAction action) {
    final w = state.wizard(wizardId);
    if (action.hasDoubleStab) return;
    w.leftHand.recordFromAction(action.left, action);
    w.rightHand.recordFromAction(action.right, action);
  }

  List<CastSpell> detectCasts(
    Wizard wizard, {
    required SpellId? leftChoice,
    required SpellId? rightChoice,
  }) {
    final leftMatches = _matcher.matchHand(wizard.leftHand, handIndex: 0);
    final rightMatches = _matcher.matchHand(wizard.rightHand, handIndex: 1);
    final casts = <CastSpell>[];

    if (leftMatches.isNotEmpty) {
      final id = leftChoice != null
          ? SpellMatcher.chooseSpell(leftMatches, leftChoice)
          : leftMatches.first.id;
      casts.add(CastSpell(
        spell: id,
        casterId: wizard.id,
        targetId: wizard.id,
        handIndex: 0,
      ));
    }
    if (rightMatches.isNotEmpty) {
      final id = rightChoice != null
          ? SpellMatcher.chooseSpell(rightMatches, rightChoice)
          : rightMatches.first.id;
      casts.add(CastSpell(
        spell: id,
        casterId: wizard.id,
        targetId: wizard.id,
        handIndex: 1,
      ));
    }
    return casts;
  }

  void applyDamage(Wizard target, int amount) {
    if (amount >= 999) {
      target.damage = 15;
      return;
    }
    target.damage = (target.damage + amount).clamp(0, 99);
  }

  void applyCure(Wizard target, int amount) {
    target.damage = (target.damage - amount).clamp(0, 14);
  }

  bool resolveSurrender(TurnAction a, TurnAction b) {
    if (a.isSurrender && b.isSurrender) return true;
    return a.isSurrender || b.isSurrender;
  }
}
