# Spellcaster Monorepo

Implementazione di **Spellcaster** (*Waving Hands*, Richard Bartle): motore regole Dart, server multiplayer, client Flutter.

## Struttura

```
spellcaster/
├── docs/RULES.md              # Regolamento fedele a Spellcaster.html
├── packages/
│   ├── spellcaster_core/      # Motore regole + test per incantesimo
│   ├── spellcaster_server/    # Server HTTP + WebSocket
│   └── spellcaster_client/    # App Flutter
├── melos.yaml
└── Spellcaster.html           # Fonte originale (inglese)
```

## Requisiti

- Dart SDK ≥ 3.5
- Flutter ≥ 3.24 (solo per il client)

## Setup

```bash
cd c:\java\pers\spellcaster
dart pub get
cd packages/spellcaster_core && dart pub get
cd ../spellcaster_server && dart pub get
cd ../spellcaster_client && flutter pub get
```

Con [melos](https://melos.invertase.dev/) sul PATH:

```bash
melos bootstrap
melos run test
```

## Test (ogni incantesimo)

```bash
cd packages/spellcaster_core
dart test                          # tutti (~90 test)
dart test test/spells/fireball_test.dart   # singolo incantesimo
dart run tools/generate_spell_tests.dart   # rigenera test/spells/*
```

## Server

```bash
cd packages/spellcaster_server
dart run bin/server.dart
# HTTP http://localhost:8080
# WebSocket ws://localhost:8080/ws
```

API:

- `POST /games` — crea partita `{ "playerA": "...", "playerB": "..." }`
- `GET /games/:id` — stato
- `POST /games/:id/turn` — invia turno (JSON gesti)
- WebSocket — aggiornamenti in tempo reale

## Client Flutter

```bash
cd packages/spellcaster_client
flutter run -d windows   # o chrome / android
```

Configura l’URL del server in `lib/config.dart`.

## Regole

Vedi [docs/RULES.md](docs/RULES.md). Il catalogo gesti/incantesimi è in `SpellCatalog` (`packages/spellcaster_core`).
