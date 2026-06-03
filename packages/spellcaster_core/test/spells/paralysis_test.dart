import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Paralysis', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.f, Gesture.f, Gesture.f], SpellId.paralysis), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.paralysisSubstitute(Gesture.s), Gesture.f);
    });
  });
}
