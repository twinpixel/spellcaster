import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Cause light wounds', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.w, Gesture.f, Gesture.p], SpellId.causeLightWounds), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.damageFor(SpellId.causeLightWounds), 2);
    });
  });
}
