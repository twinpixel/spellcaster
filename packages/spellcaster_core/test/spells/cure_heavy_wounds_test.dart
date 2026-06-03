import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Cure heavy wounds', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.d, Gesture.f, Gesture.p, Gesture.w], SpellId.cureHeavyWounds), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.cureFor(SpellId.cureHeavyWounds), 2);
    });
  });
}
