import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Lightning bolt (long)', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.d, Gesture.f, Gesture.f, Gesture.d, Gesture.d], SpellId.lightningBoltLong), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.damageFor(SpellId.lightningBoltLong), 5);
    });
  });
}
