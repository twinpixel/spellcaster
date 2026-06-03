import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Raise dead', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.d, Gesture.w, Gesture.w, Gesture.f, Gesture.w, 'clap'], SpellId.raiseDead), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.cureFor(SpellId.raiseDead), 5);
    });
  });
}
