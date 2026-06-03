import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Counter-spell W-P-P', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.w, Gesture.p, Gesture.p], SpellId.counterSpell), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.blockedByCounterSpell(SpellId.missile), isTrue);
    });
  });
}
