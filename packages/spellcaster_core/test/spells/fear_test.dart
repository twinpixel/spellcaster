import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Fear', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.s, Gesture.w, Gesture.d], SpellId.fear), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellId.fear.isEnchantment, isTrue);
    });
  });
}
