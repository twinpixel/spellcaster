import 'package:spellcaster_core/spellcaster_core.dart';

/// Play a sequence of single-hand gestures on one hand (no dual/clap).
HandBuffer bufferFromGestures(List<Gesture> gestures) {
  final buf = HandBuffer();
  for (final g in gestures) {
    buf.recordSingle(g);
  }
  return buf;
}

/// Play full turns on left/right hands for gesture sequences.
HandBuffer bufferFromTurns(List<TurnAction> turns, {required bool left}) {
  final buf = HandBuffer();
  for (final t in turns) {
    buf.recordFromAction(left ? t.left : t.right, t);
  }
  return buf;
}

TurnAction turn(HandAction l, HandAction r) => TurnAction(left: l, right: r);

HandAction g(Gesture gesture) => HandAction.gesture(gesture);

bool completes(List<Gesture> gestures, SpellId spell, {int hand = 0}) {
  final buf = bufferFromGestures(gestures);
  final matches = const SpellMatcher().matchHand(buf, handIndex: hand);
  return matches.any((m) => m.id == spell);
}

bool completesWithClap(List<Object> steps, SpellId spell) {
  final buf = HandBuffer();
  for (final s in steps) {
    if (s is Gesture) {
      buf.recordSingle(s);
    } else if (s == 'clap') {
      buf.recordClap();
    } else if (s is Gesture && steps.length > 1) {
      // both-hands handled via turns
    }
  }
  final matches = const SpellMatcher().matchHand(buf, handIndex: 0);
  return matches.any((m) => m.id == spell);
}

TurnAction both(Gesture gesture) =>
    TurnAction(left: g(gesture), right: g(gesture));

TurnAction clapTurn() =>
    const TurnAction(left: HandAction.clap(), right: HandAction.clap());

/// Build buffer from steps: [Gesture], 'clap', or ['both', Gesture].
HandBuffer buildBuffer(List<Object> steps) {
  final buf = HandBuffer();
  for (final s in steps) {
    if (s is Gesture) {
      buf.recordSingle(s);
    } else if (s == 'clap') {
      buf.recordClap();
    } else if (s is List && s.first == 'both' && s[1] is Gesture) {
      buf.recordBoth(s[1] as Gesture);
    }
  }
  return buf;
}

bool spellCompletes(List<Object> steps, SpellId id) {
  final buf = buildBuffer(steps);
  return const SpellMatcher()
      .matchHand(buf, handIndex: 0)
      .any((m) => m.id == id);
}
