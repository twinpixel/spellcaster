import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Ice storm', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.w, Gesture.s, Gesture.s, 'clap'], SpellId.iceStorm), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.damageFor(SpellId.iceStorm), 5);
    });
  });
}
