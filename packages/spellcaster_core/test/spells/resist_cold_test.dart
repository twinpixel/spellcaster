import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Resist cold', () {
    test('gesture pattern completes', () {
      expect(spellCompletes([Gesture.s, Gesture.s, Gesture.f, Gesture.p], SpellId.resistCold), isTrue);
    });

    test('effect / rules constants', () {
            final w = Wizard(id: 'x', name: 'x');
      w.status.resistCold = true;
      expect(SpellEffects.coldDamageIgnored(w), isTrue);
    
    });
  });
}
