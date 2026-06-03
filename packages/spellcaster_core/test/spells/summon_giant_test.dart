import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Summon giant', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.w, Gesture.f, Gesture.p, Gesture.s, Gesture.f, Gesture.w], SpellId.summonGiant), isTrue);
    });

    test('effect / rules constants', () {
      expect(MonsterKind.giant.damage, 4);
    });
  });
}
