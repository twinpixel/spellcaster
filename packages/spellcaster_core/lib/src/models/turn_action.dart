import '../gesture.dart';

/// Both hands' actions for one turn.
class TurnAction {
  const TurnAction({required this.left, required this.right});

  final HandAction left;
  final HandAction right;

  bool get isSurrender =>
      left.kind == HandActionKind.gesture &&
      right.kind == HandActionKind.gesture &&
      left.gesture == Gesture.p &&
      right.gesture == Gesture.p;

  bool get isClap =>
      left.kind == HandActionKind.clap && right.kind == HandActionKind.clap;

  bool bothHands(Gesture g) =>
      left.kind == HandActionKind.gesture &&
      right.kind == HandActionKind.gesture &&
      left.gesture == g &&
      right.gesture == g;

  bool get hasStab =>
      left.kind == HandActionKind.stab || right.kind == HandActionKind.stab;

  bool get hasDoubleStab =>
      left.kind == HandActionKind.stab && right.kind == HandActionKind.stab;
}
