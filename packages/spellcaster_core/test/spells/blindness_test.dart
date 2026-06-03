import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Blindness', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.d, Gesture.w, Gesture.f, Gesture.f, ['both', Gesture.d]], SpellId.blindness), isTrue);
    });

    test('effect / rules constants', () {
      expect(blindnessDuration, 3);
    });
  });
}
