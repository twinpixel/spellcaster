import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Summon elemental', () {
    test('gesture pattern completes', () {
      expect(spellCompletes(['clap', Gesture.s, Gesture.w, Gesture.w, Gesture.s], SpellId.summonElemental), isTrue);
    });

    test('effect / rules constants', () {
      expect(MonsterKind.fireElemental.hitPoints, 3);
    });
  });
}
