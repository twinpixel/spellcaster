import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Dispel magic', () {
    test('gesture pattern completes', () {
      expect(spellCompletes(['clap', Gesture.d, Gesture.p, Gesture.w], SpellId.dispelMagic), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.blockedByDispelMagic(SpellId.missile), isTrue);
    });
  });
}
