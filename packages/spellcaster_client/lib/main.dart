import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:spellcaster_core/spellcaster_core.dart';

import 'config.dart';

void main() {
  runApp(const SpellcasterApp());
}

class SpellcasterApp extends StatelessWidget {
  const SpellcasterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Spellcaster',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const DuelScreen(),
    );
  }
}

class DuelScreen extends StatefulWidget {
  const DuelScreen({super.key});

  @override
  State<DuelScreen> createState() => _DuelScreenState();
}

class _DuelScreenState extends State<DuelScreen> {
  String? _gameId;
  String _playerId = 'a';
  int _damageA = 0;
  int _damageB = 0;
  bool _loading = false;
  String? _error;
  bool _showSpellRef = false;

  Future<void> _createGame() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await http.post(
        Uri.parse('$serverBaseUrl/games'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'playerA': 'Tu', 'playerB': 'Avversario'}),
      );
      if (res.statusCode != 200) throw Exception(res.body);
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      setState(() {
        _gameId = data['id'] as String;
        _playerId = 'a';
        _syncDamage(data);
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  void _syncDamage(Map<String, dynamic> game) {
    final players = game['players'] as Map<String, dynamic>;
    _damageA = players['a']?['damage'] as int? ?? 0;
    _damageB = players['b']?['damage'] as int? ?? 0;
  }

  Future<void> _submitTurn(String left, String right) async {
    if (_gameId == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await http.post(
        Uri.parse('$serverBaseUrl/games/$_gameId/turn'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'playerId': _playerId,
          'left': left,
          'right': right,
        }),
      );
      if (res.statusCode != 200) throw Exception(res.body);
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      setState(() => _syncDamage(data));
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Spellcaster'),
        actions: [
          IconButton(
            icon: Icon(_showSpellRef ? Icons.list : Icons.list_outlined),
            onPressed: () => setState(() => _showSpellRef = !_showSpellRef),
            tooltip: 'Elenco incantesimi',
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Danno: tu $_damageA / 14 — avversario $_damageB / 14',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (_gameId != null) Text('Partita: $_gameId', style: Theme.of(context).textTheme.bodySmall),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            const SizedBox(height: 16),
            if (_gameId == null)
              FilledButton(
                onPressed: _loading ? null : _createGame,
                child: const Text('Nuova partita (vs server)'),
              )
            else ...[
              const Text('Mano sinistra / destra — F P S W D, stab, spazio'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final g in Gesture.values)
                    _gestureButton(g.code, g.code),
                  _gestureButton('stab', 'stab'),
                  _gestureButton(' ', 'nulla'),
                ],
              ),
              const SizedBox(height: 8),
              const Text('Esempio: tap F poi invia coppia (usa dialog semplificato)'),
            ],
            if (_showSpellRef) ...[
              const Divider(),
              const Text('Incantesimi (core)'),
              Expanded(
                child: ListView(
                  children: [
                    for (final id in SpellCatalog.allSpellIds)
                      ListTile(
                        dense: true,
                        title: Text(id.displayName),
                        subtitle: Text(id.gestureNotation),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
      floatingActionButton: _gameId == null
          ? null
          : FloatingActionButton.extended(
              onPressed: _loading
                  ? null
                  : () => _submitTurn('P', ' '),
              label: const Text('Shield sx / nulla dx'),
            ),
    );
  }

  Widget _gestureButton(String code, String label) {
    return OutlinedButton(
      onPressed: _loading || _gameId == null
          ? null
          : () => _submitTurn(code, ' '),
      child: Text(label),
    );
  }
}
