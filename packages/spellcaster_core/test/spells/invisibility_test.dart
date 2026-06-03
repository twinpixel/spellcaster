import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Invisibility', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.p, Gesture.p, ['both', Gesture.w], ['both', Gesture.s]], SpellId.invisibility), isTrue);
    });

    test('effect / rules constants', () {
      expect(blindnessDuration, 3);
    });
  });
}
