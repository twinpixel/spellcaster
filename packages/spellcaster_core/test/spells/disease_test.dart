import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Disease', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.d, Gesture.s, Gesture.f, Gesture.f, Gesture.f, 'clap'], SpellId.disease), isTrue);
    });

    test('effect / rules constants', () {
      expect(diseaseTurns, 6);
    });
  });
}
