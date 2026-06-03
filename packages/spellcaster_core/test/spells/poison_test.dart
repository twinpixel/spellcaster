import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Poison', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.d, Gesture.w, Gesture.w, Gesture.f, Gesture.w, Gesture.d], SpellId.poison), isTrue);
    });

    test('effect / rules constants', () {
      expect(permanencyExcluded.contains(SpellId.poison), isTrue);
    });
  });
}
