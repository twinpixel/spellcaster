import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Counter-spell W-W-S', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.w, Gesture.w, Gesture.s], SpellId.counterSpell), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.blockedByCounterSpell(SpellId.fireball), isTrue);
    });
  });
}
