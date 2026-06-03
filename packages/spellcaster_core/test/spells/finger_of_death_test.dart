import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Finger of death', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.p, Gesture.w, Gesture.p, Gesture.f, Gesture.s, Gesture.s, Gesture.s, Gesture.d], SpellId.fingerOfDeath), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.isKillSpell(SpellId.fingerOfDeath), isTrue);
    });
  });
}
