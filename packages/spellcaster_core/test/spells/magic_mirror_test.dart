import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Magic mirror', () {
    test('gesture pattern completes', () {
      expect(spellCompletes(['clap', ['both', Gesture.w]], SpellId.magicMirror), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.reflectsInMirror(SpellId.missile), isTrue);
    });
  });
}
