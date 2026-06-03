import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Protection from evil', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.w, Gesture.w, Gesture.p], SpellId.protectionFromEvil), isTrue);
    });

    test('effect / rules constants', () {
      expect(protectionFromEvilTurns, 4);
    });
  });
}
