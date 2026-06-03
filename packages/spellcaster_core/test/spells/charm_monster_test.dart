import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Charm monster', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.p, Gesture.s, Gesture.d, Gesture.d], SpellId.charmMonster), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellId.charmMonster.isEnchantment, isTrue);
    });
  });
}
