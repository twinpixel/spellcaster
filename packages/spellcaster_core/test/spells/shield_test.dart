import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Shield', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.p], SpellId.shield), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.blockedByShield(SpellId.missile), isTrue);
    });
  });
}
