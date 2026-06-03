import 'package:spellcaster_server/game_service.dart';
import 'package:test/test.dart';

void main() {
  test('creates game and accepts turn submission', () {
    final svc = GameService();
    final g = svc.createGame(playerA: 'A', playerB: 'B');
    expect(g.finished, isFalse);

    final partial = svc.submitTurn(
      g.id,
      playerId: 'a',
      left: 'P',
      right: ' ',
    );
    expect(partial.pendingTurn, isNotNull);

    final resolved = svc.submitTurn(
      g.id,
      playerId: 'b',
      left: ' ',
      right: ' ',
    );
    expect(resolved.pendingTurn, isNull);
    expect(resolved.lastTurnCasts, isNotEmpty);
    expect(resolved.lastTurnCasts.first['spell'], 'shield');
  });
}
