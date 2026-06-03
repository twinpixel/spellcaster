import 'hand_buffer.dart';
import 'spell_catalog.dart';
import 'spell_id.dart';
import 'spell_pattern.dart';

/// Result of matching completed spells on a hand after a turn.
class CompletedSpell {
  const CompletedSpell({
    required this.id,
    required this.handIndex,
    required this.patternIndex,
  });

  final SpellId id;
  final int handIndex;
  final int patternIndex;
}

/// Matches hand gesture histories against the spell catalog.
class SpellMatcher {
  const SpellMatcher();

  /// All spells whose pattern suffix-matches [buffer], newest gesture last.
  List<CompletedSpell> matchHand(
    HandBuffer buffer, {
    required int handIndex,
  }) {
    final symbols = buffer.symbols;
    final results = <CompletedSpell>[];

    for (final id in SpellCatalog.allSpellIds) {
      final patterns = SpellCatalog.patternsFor(id);
      for (var pi = 0; pi < patterns.length; pi++) {
        if (_matchesSuffix(symbols, patterns[pi])) {
          results.add(CompletedSpell(id: id, handIndex: handIndex, patternIndex: pi));
        }
      }
    }
    return results;
  }

  bool _matchesSuffix(List<HandSymbol> symbols, SpellPattern pattern) {
    if (symbols.length < pattern.length) return false;
    final offset = symbols.length - pattern.length;
    for (var i = 0; i < pattern.length; i++) {
      if (!_stepMatches(symbols[offset + i], pattern.steps[i])) return false;
    }
    return true;
  }

  bool _stepMatches(HandSymbol symbol, PatternStep step) => switch (step) {
        SingleStep(:final gesture) =>
          symbol is SingleHandSymbol && symbol.gesture == gesture,
        ClapStep() => symbol is ClapSymbol,
        BothHandsStep(:final gesture) =>
          symbol is BothHandsSymbol && symbol.gesture == gesture,
        _ => false,
      };

  /// When multiple spells complete on the same final gesture, the caster picks one.
  static SpellId chooseSpell(
    List<CompletedSpell> candidates,
    SpellId preferred,
  ) {
    if (candidates.any((c) => c.id == preferred)) return preferred;
    return candidates.first.id;
  }
}
