import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Haste', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.p, Gesture.w, Gesture.p, Gesture.w, Gesture.w, 'clap'], SpellId.haste), isTrue);
    });

    test('effect / rules constants', () {
      expect(hasteTurns, 3);
    });
  });
}
