import 'dart:convert';
import 'dart:io';

import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_router/shelf_router.dart';
import 'package:shelf_web_socket/shelf_web_socket.dart';
import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../lib/game_service.dart';

void main() async {
  final service = GameService();
  final router = Router();

  router.get('/health', (_) => Response.ok('ok'));

  router.post('/games', (Request request) async {
    final body = await request.readAsString();
    final json = body.isEmpty ? <String, dynamic>{} : jsonDecode(body) as Map;
    final game = service.createGame(
      playerA: json['playerA'] as String? ?? 'Player A',
      playerB: json['playerB'] as String? ?? 'Player B',
      allowCharmNothing: json['allowCharmNothing'] as bool? ?? false,
    );
    return Response.ok(
      jsonEncode(game.toJson()),
      headers: {'Content-Type': 'application/json'},
    );
  });

  router.get('/games/<id>', (Request request, String id) {
    final game = service.getGame(id);
    if (game == null) {
      return _jsonNotFound();
    }
    return Response.ok(
      jsonEncode(game.toJson()),
      headers: {'Content-Type': 'application/json'},
    );
  });

  router.post('/games/<id>/turn', (Request request, String id) async {
    final game = service.getGame(id);
    if (game == null) {
      return _jsonNotFound();
    }
    final body = jsonDecode(await request.readAsString()) as Map<String, dynamic>;
    final playerId = body['playerId'] as String?;
    if (playerId == null) {
      return _jsonBadRequest('playerId required');
    }
    try {
      final updated = service.submitTurn(
        id,
        playerId: playerId,
        left: body['left'] as String? ?? ' ',
        right: body['right'] as String? ?? ' ',
        leftSpell: body['leftSpell'] as String?,
        rightSpell: body['rightSpell'] as String?,
        charmForced: body['charmForced'] as String?,
      );
      service.broadcast(id, {'event': 'turn', 'game': updated.toJson()});
      return Response.ok(
        jsonEncode(updated.toJson()),
        headers: {'Content-Type': 'application/json'},
      );
    } on StateError catch (e) {
      return _jsonBadRequest(e.message);
    } on CharmPersonInvalidGesture catch (e) {
      return _jsonBadRequest(e.toString());
    }
  });

  router.get('/spells', (_) {
    final list = SpellCatalog.allSpellIds
        .map((id) => {
              'id': id.name,
              'name': id.displayName,
              'gestures': id.gestureNotation,
              'section': id.section.name,
            })
        .toList();
    return Response.ok(
      jsonEncode(list),
      headers: {'Content-Type': 'application/json'},
    );
  });

  final wsHandler = webSocketHandler((WebSocketChannel channel, _) {
    channel.stream.listen((message) {
      try {
        final data = jsonDecode(message as String) as Map<String, dynamic>;
        if (data['action'] == 'subscribe' && data['gameId'] != null) {
          service.subscribe(data['gameId'] as String, channel);
        }
      } catch (_) {
        channel.sink.add(jsonEncode({'error': 'invalid_message'}));
      }
    });
  });

  final handler = Pipeline()
      .addMiddleware(logRequests())
      .addHandler(Cascade()
          .add(router.call)
          .add(wsHandler)
          .handler);

  final server = await shelf_io.serve(handler, InternetAddress.anyIPv4, 8080);
  // ignore: avoid_print
  print('Spellcaster server http://${server.address.host}:${server.port}');
}

Response _jsonBadRequest(String message) => Response.badRequest(
      body: jsonEncode({'error': message}),
      headers: {'Content-Type': 'application/json'},
    );

Response _jsonNotFound() => Response.notFound(
      jsonEncode({'error': 'not_found'}),
      headers: {'Content-Type': 'application/json'},
    );
