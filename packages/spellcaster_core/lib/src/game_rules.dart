/// Configurable house rules (defaults match project standard table rules).
class GameRules {
  const GameRules({
    /// If false, [SpellId.charmPerson] cannot force «nulla» on the charmed hand.
    this.allowCharmNothing = false,
  });

  /// Default duel rules: charm cannot impose nothing (Brian Buchanan variant).
  static const GameRules standard = GameRules();

  final bool allowCharmNothing;

  GameRules copyWith({bool? allowCharmNothing}) => GameRules(
        allowCharmNothing: allowCharmNothing ?? this.allowCharmNothing,
      );
}
