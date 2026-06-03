import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Charm person', () {
    test('gesture pattern completes', () {
      expect(
        spellCompletes(
          [Gesture.p, Gesture.s, Gesture.d, Gesture.f],
          SpellId.charmPerson,
        ),
        isTrue,
      );
    });

    test('default rules disallow forcing nothing', () {
      expect(GameRules.standard.allowCharmNothing, isFalse);
      expect(
        CharmPersonRules.isValidForcedAction(
          const HandAction.nothing(),
          GameRules.standard,
        ),
        isFalse,
      );
      expect(
        CharmPersonRules.isValidForcedAction(
          const HandAction.gesture(Gesture.f),
          GameRules.standard,
        ),
        isTrue,
      );
      expect(
        CharmPersonRules.isValidForcedAction(
          const HandAction.stab(),
          GameRules.standard,
        ),
        isTrue,
      );
    });

    test('optional rules allow nothing', () {
      const rules = GameRules(allowCharmNothing: true);
      expect(
        CharmPersonRules.isValidForcedAction(
          const HandAction.nothing(),
          rules,
        ),
        isTrue,
      );
    });

    test('engine rejects nothing under default rules', () {
      final engine = GameEngine();
      final state = engine.newGame(nameA: 'A', nameB: 'B');
      expect(
        () => engine.validateCharmPersonGesture(
          state,
          const HandAction.nothing(),
        ),
        throwsA(isA<CharmPersonInvalidGesture>()),
      );
    });
  });
}
