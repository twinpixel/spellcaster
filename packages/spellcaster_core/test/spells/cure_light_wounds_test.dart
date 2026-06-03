import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Cure light wounds', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.d, Gesture.f, Gesture.w], SpellId.cureLightWounds), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.cureFor(SpellId.cureLightWounds), 1);
    });
  });
}
