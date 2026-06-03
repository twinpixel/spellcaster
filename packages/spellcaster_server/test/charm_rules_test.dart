import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:spellcaster_server/game_service.dart';
import 'package:test/test.dart';

void main() {
  test('createGame exposes allowCharmNothing false by default', () {
    final svc = GameService();
    final g = svc.createGame(playerA: 'A', playerB: 'B');
    expect(g.rules['allowCharmNothing'], isFalse);
  });

  test('submitTurn rejects charmForced nothing by default', () {
    final svc = GameService();
    final g = svc.createGame(playerA: 'A', playerB: 'B');
    expect(
      () => svc.submitTurn(
        g.id,
        playerId: 'a',
        left: ' ',
        right: ' ',
        charmForced: ' ',
      ),
      throwsA(isA<CharmPersonInvalidGesture>()),
    );
  });
}
