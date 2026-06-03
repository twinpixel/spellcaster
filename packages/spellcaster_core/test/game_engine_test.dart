import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import 'helpers/spell_test_helpers.dart';

void main() {
  group('GameEngine', () {
    test('pre-battle clears resistances and applies anti-spell', () {
      final engine = GameEngine();
      final state = engine.newGame(nameA: 'Black', nameB: 'White');
      expect(state.wizardA.status.antiSpellNextTurn, isTrue);
      expect(state.wizardB.status.resistHeat, isFalse);
    });

    test('wizard dies at 15 damage', () {
      final w = Wizard(id: 'a', name: 'A', damage: 14);
      final resolver = TurnResolver();
      resolver.applyDamage(w, 1);
      expect(w.isDead, isTrue);
    });

    test('simultaneous surrender is draw', () {
      final engine = GameEngine();
      final state = engine.newGame(nameA: 'A', nameB: 'B');
      final result = engine.playTurn(
        state,
        actionA: turn(g(Gesture.p), g(Gesture.p)),
        actionB: turn(g(Gesture.p), g(Gesture.p)),
      );
      expect(result.draw, isTrue);
      expect(state.finished, isTrue);
    });

    test('detects shield after P gesture', () {
      final w = Wizard(id: 'a', name: 'A');
      w.leftHand.recordSingle(Gesture.p);
      final casts = TurnResolver().detectCasts(w);
      expect(casts.single.spell, SpellId.shield);
    });
  });
}
