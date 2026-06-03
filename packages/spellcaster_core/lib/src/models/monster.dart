/// Summoned creature (goblin, ogre, troll, giant, or elemental).
class Monster {
  Monster({
    required this.id,
    required this.controllerId,
    required this.hitPoints,
    required this.damagePerTurn,
    this.targetId,
    this.isElemental = false,
    this.elementalHeat = true,
  });

  final String id;
  String controllerId;
  final int hitPoints;
  final int damagePerTurn;
  String? targetId;
  final bool isElemental;

  /// Fire elemental if true, ice if false.
  final bool elementalHeat;

  bool get isAlive => hitPoints > 0;

  void takeDamage(int amount) {
    // Caller sets HP to 0 when destroyed
  }
}

enum MonsterKind { goblin, ogre, troll, giant, fireElemental, iceElemental }

extension MonsterKindStats on MonsterKind {
  int get hitPoints => switch (this) {
        MonsterKind.goblin => 1,
        MonsterKind.ogre => 2,
        MonsterKind.troll => 3,
        MonsterKind.giant => 4,
        MonsterKind.fireElemental || MonsterKind.iceElemental => 3,
      };

  int get damage => hitPoints;
}
