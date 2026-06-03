import '../gesture.dart';
import '../spell_catalog.dart';
import '../spell_id.dart';
import '../models/monster.dart';
import '../models/wizard.dart';

/// Pure effect calculations for spells (testable without full engine).
abstract final class SpellEffects {
  static int damageFor(SpellId spell) => switch (spell) {
        SpellId.missile => 1,
        SpellId.causeLightWounds => 2,
        SpellId.causeHeavyWounds => 3,
        SpellId.lightningBoltLong || SpellId.lightningBoltShort => 5,
        SpellId.fireball || SpellId.fireStorm || SpellId.iceStorm => 5,
        SpellId.fingerOfDeath => 999,
        _ => 0,
      };

  static int cureFor(SpellId spell) => switch (spell) {
        SpellId.cureLightWounds => 1,
        SpellId.cureHeavyWounds => 2,
        SpellId.raiseDead => 5,
        _ => 0,
      };

  static bool isKillSpell(SpellId spell) => spell == SpellId.fingerOfDeath;

  static bool blockedByShield(SpellId spell) =>
      spell == SpellId.missile || _monsterPhysical(spell);

  static bool _monsterPhysical(SpellId spell) => false;

  static bool blockedByCounterSpell(SpellId spell) =>
      spell != SpellId.fingerOfDeath && spell != SpellId.dispelMagic;

  static bool blockedByDispelMagic(SpellId spell) => spell != SpellId.dispelMagic;

  static bool fingerOfDeathStoppedByDispelOnFinalGesture(SpellId spell) =>
      spell == SpellId.fingerOfDeath;

  static bool reflectsInMirror(SpellId spell) =>
      spell == SpellId.missile || spell == SpellId.lightningBoltLong;

  static bool shieldBlocksStab(Wizard wizard, int turn) =>
      wizard.status.hasProtectionFromEvil(turn);

  static bool fireDamageIgnored(Wizard w) => w.status.resistHeat;

  static bool coldDamageIgnored(Wizard w) => w.status.resistCold;

  static bool enchantmentsConflict(Set<SpellId> onSubject) {
    final ench = onSubject.where((s) => s.isEnchantment).toSet();
    if (ench.length < 2) return false;
    if (ench.any(conflictingEnchantments.contains)) {
      final conflict = ench.intersection(conflictingEnchantments);
      return conflict.length >= 2 ||
          (conflict.isNotEmpty && ench.length > 1);
    }
    return false;
  }

  /// Amnesia, confusion, charm*, paralysis, fear cancel each other.
  static bool enchantmentGroupCancels(List<SpellId> applied) {
    final control = applied.where(conflictingEnchantments.contains).toList();
    return control.length > 1;
  }

  static Monster? createMonster(SpellId spell, String controllerId, String id) {
    final kind = switch (spell) {
      SpellId.summonGoblin => MonsterKind.goblin,
      SpellId.summonOgre => MonsterKind.ogre,
      SpellId.summonTroll => MonsterKind.troll,
      SpellId.summonGiant => MonsterKind.giant,
      _ => null,
    };
    if (kind == null) return null;
    return Monster(
      id: id,
      controllerId: controllerId,
      hitPoints: kind.hitPoints,
      damagePerTurn: kind.damage,
    );
  }

  static Monster createElemental({
    required String id,
    required String controllerId,
    required bool fire,
  }) =>
      Monster(
        id: id,
        controllerId: controllerId,
        hitPoints: 3,
        damagePerTurn: 3,
        isElemental: true,
        elementalHeat: fire,
      );

  static Gesture paralysisSubstitute(Gesture g) => switch (g) {
        Gesture.s => Gesture.f,
        Gesture.w => Gesture.p,
        Gesture.d => Gesture.d,
        _ => g,
      };

  static bool fireballVsIceStormNeutralizes(bool subjectFireball, bool iceStormActive) =>
      subjectFireball && iceStormActive;

  static bool fireStormVsIceStormCancels(bool fireStorm, bool iceStorm) =>
      fireStorm && iceStorm;
}
