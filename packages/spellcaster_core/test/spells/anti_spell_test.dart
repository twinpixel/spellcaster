import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Anti-spell', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.s, Gesture.p, Gesture.f], SpellId.antiSpell), isTrue);
    });

    test('effect / rules constants', () {
      expect(permanencyExcluded.contains(SpellId.antiSpell), isTrue);
    });
  });
}
