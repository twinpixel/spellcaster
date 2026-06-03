import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Lightning bolt (short)', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.w, Gesture.d, Gesture.d, 'clap'], SpellId.lightningBoltShort), isTrue);
    });

    test('effect / rules constants', () {
      expect(SpellEffects.damageFor(SpellId.lightningBoltShort), 5);
    });
  });
}
