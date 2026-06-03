import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Summon goblin', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.s, Gesture.f, Gesture.w], SpellId.summonGoblin), isTrue);
    });

    test('effect / rules constants', () {
      expect(MonsterKind.goblin.hitPoints, 1);
    });
  });
}
