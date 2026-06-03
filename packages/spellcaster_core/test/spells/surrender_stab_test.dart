import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('Surrender (p)', () {
    test('both palms simultaneously is surrender', () {
      expect(
        TurnAction(left: g(Gesture.p), right: g(Gesture.p)).isSurrender,
        isTrue,
      );
    });

    test('single P is not surrender', () {
      expect(
        TurnAction(left: g(Gesture.p), right: g(Gesture.w)).isSurrender,
        isFalse,
      );
    });
  });

  group('Stab', () {
    test('aborts spell sequence on that hand', () {
      final buf = bufferFromGestures([Gesture.f, Gesture.f]);
      buf.recordFromAction(
        const HandAction.stab(),
        turn(const HandAction.stab(), g(Gesture.w)),
      );
      expect(buf.symbols, isEmpty);
    });

    test('at most one stab per turn enforced by client', () {
      final action = turn(const HandAction.stab(), const HandAction.stab());
      expect(action.hasDoubleStab, isTrue);
    });
  });
}
