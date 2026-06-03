import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Delayed effect', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.d, Gesture.w, Gesture.s, Gesture.s, Gesture.s, Gesture.p], SpellId.delayedEffect), isTrue);
    });

    test('effect / rules constants', () {
      expect(bankingWindowTurns, 3);
    });
  });
}
