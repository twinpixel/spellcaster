import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Cause heavy wounds', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.w, Gesture.p, Gesture.f, Gesture.d], SpellId.causeHeavyWounds), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.damageFor(SpellId.causeHeavyWounds), 3);
    });
  });
}
