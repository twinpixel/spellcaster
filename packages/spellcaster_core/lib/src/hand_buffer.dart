import 'gesture.dart';
import 'models/turn_action.dart';

/// Record of one spell-relevant symbol on a hand's timeline.
sealed class HandSymbol {
  const HandSymbol();
}

final class SingleHandSymbol extends HandSymbol {
  const SingleHandSymbol(this.gesture);
  final Gesture gesture;
}

final class ClapSymbol extends HandSymbol {
  const ClapSymbol();
}

final class BothHandsSymbol extends HandSymbol {
  const BothHandsSymbol(this.gesture);
  final Gesture gesture;
}

/// Per-hand gesture history for spell matching.
class HandBuffer {
  HandBuffer();

  final List<HandSymbol> _symbols = [];

  List<HandSymbol> get symbols => List.unmodifiable(_symbols);

  void clear() => _symbols.clear();

  void recordSingle(Gesture gesture) =>
      _symbols.add(SingleHandSymbol(gesture));

  void recordClap() => _symbols.add(const ClapSymbol());

  void recordBoth(Gesture gesture) =>
      _symbols.add(BothHandsSymbol(gesture));

  /// Records this hand's contribution for a turn (after turn-level clap/both resolved).
  void recordFromAction(HandAction action, TurnAction turn) {
    if (action.kind == HandActionKind.stab ||
        action.kind == HandActionKind.nothing) {
      clear();
      return;
    }
    if (turn.isClap) {
      if (action.kind == HandActionKind.clap) {
        _symbols.add(const ClapSymbol());
      }
      return;
    }
    if (action.kind == HandActionKind.clap) {
      // C on one hand only — abort
      clear();
      return;
    }
    if (action.kind == HandActionKind.gesture) {
      final g = action.gesture!;
      if (turn.bothHands(g)) {
        _symbols.add(BothHandsSymbol(g));
      } else {
        _symbols.add(SingleHandSymbol(g));
      }
    }
  }
}
