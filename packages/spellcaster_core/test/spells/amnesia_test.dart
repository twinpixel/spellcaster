import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Amnesia', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.d, Gesture.p, Gesture.p], SpellId.amnesia), isTrue);
    });

    test('effect / rules constants', () {
      expect(conflictingEnchantments.contains(SpellId.amnesia), isTrue);
    });
  });
}
