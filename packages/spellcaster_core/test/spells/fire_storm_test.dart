import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Fire storm', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.s, Gesture.w, Gesture.w, 'clap'], SpellId.fireStorm), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.damageFor(SpellId.fireStorm), 5);
    });
  });
}
