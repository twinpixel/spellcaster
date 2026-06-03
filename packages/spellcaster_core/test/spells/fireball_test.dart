import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Fireball', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.f, Gesture.s, Gesture.s, Gesture.d, Gesture.d], SpellId.fireball), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.damageFor(SpellId.fireball), 5);
    });
  });
}
