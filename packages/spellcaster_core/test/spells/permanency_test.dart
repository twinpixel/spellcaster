import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Permanency', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.s, Gesture.p, Gesture.f, Gesture.p, Gesture.s, Gesture.d, Gesture.w], SpellId.permanency), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellId.permanency.isEnchantment, isTrue);
    });
  });
}
