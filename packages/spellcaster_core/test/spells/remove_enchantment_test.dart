import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Remove enchantment', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.p, Gesture.d, Gesture.w, Gesture.p], SpellId.removeEnchantment), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.damageFor(SpellId.removeEnchantment), 0);
    });
  });
}
