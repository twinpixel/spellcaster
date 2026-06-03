import 'gesture.dart';
import 'spell_id.dart';

/// One step in a spell gesture sequence.
sealed class PatternStep {
  const PatternStep();
}

/// Single-hand gesture on the casting hand.
final class SingleStep extends PatternStep {
  const SingleStep(this.gesture);
  final Gesture gesture;
}

/// Clap — both hands perform [Gesture] C simultaneously (only valid clap).
final class ClapStep extends PatternStep {
  const ClapStep();
}

/// Both hands perform the same gesture simultaneously, e.g. (w.
final class BothHandsStep extends PatternStep {
  const BothHandsStep(this.gesture);
  final Gesture gesture;
}

/// Complete pattern for one spell (one hand leads; dual steps verified on turn log).
class SpellPattern {
  const SpellPattern(this.id, this.steps);

  final SpellId id;
  final List<PatternStep> steps;

  int get length => steps.length;
}
