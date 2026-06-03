/// Single-hand gestures (Richard Bartle / Spellcaster rules).
enum Gesture {
  f('F'),
  p('P'),
  s('S'),
  w('W'),
  d('D');

  const Gesture(this.code);
  final String code;

  static Gesture? parse(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    final upper = raw.toUpperCase();
    for (final g in Gesture.values) {
      if (g.code == upper) return g;
    }
    return null;
  }
}

enum HandActionKind { gesture, stab, nothing, clap }

/// One hand's action in a turn.
class HandAction {
  const HandAction._(this.kind, [this.gesture]);

  const HandAction.gesture(Gesture g)
      : this._(HandActionKind.gesture, g);

  const HandAction.stab() : this._(HandActionKind.stab);

  const HandAction.nothing() : this._(HandActionKind.nothing);

  const HandAction.clap() : this._(HandActionKind.clap);

  final HandActionKind kind;
  final Gesture? gesture;

  bool get abortsSpellSequence =>
      kind == HandActionKind.stab ||
      kind == HandActionKind.nothing ||
      (kind == HandActionKind.clap); // single-hand clap handled at turn level

  @override
  String toString() => switch (kind) {
        HandActionKind.gesture => gesture!.code,
        HandActionKind.stab => 'stab',
        HandActionKind.nothing => ' ',
        HandActionKind.clap => 'C',
      };
}
