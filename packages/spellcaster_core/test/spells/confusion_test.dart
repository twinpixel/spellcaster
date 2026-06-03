import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Confusion', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.d, Gesture.s, Gesture.f], SpellId.confusion), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.enchantmentGroupCancels([SpellId.amnesia, SpellId.confusion]), isTrue);
    });
  });
}
