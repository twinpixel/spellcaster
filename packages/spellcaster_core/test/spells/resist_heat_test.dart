import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Resist heat', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.w, Gesture.w, Gesture.f, Gesture.p], SpellId.resistHeat), isTrue);
    });

    test('effect / rules constants', () {
            final w = Wizard(id: 'x', name: 'x');
      w.status.resistHeat = true;
      expect(SpellEffects.fireDamageIgnored(w), isTrue);
    
    });
  });
}
