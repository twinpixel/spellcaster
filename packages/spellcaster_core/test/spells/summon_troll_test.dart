import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Summon troll', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.f, Gesture.p, Gesture.s, Gesture.f, Gesture.w], SpellId.summonTroll), isTrue);
    });

    test('effect / rules constants', () {
      expect(MonsterKind.troll.hitPoints, 3);
    });
  });
}
