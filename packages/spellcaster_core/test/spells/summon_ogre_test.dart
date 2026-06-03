import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Summon ogre', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.p, Gesture.s, Gesture.f, Gesture.w], SpellId.summonOgre), isTrue);
    });

    test('effect / rules constants', () {
      expect(MonsterKind.ogre.damage, 2);
    });
  });
}
