import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Missile', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.s, Gesture.d], SpellId.missile), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.damageFor(SpellId.missile), 1);
    });
  });
}
