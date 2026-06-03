import 'gesture.dart';
import 'spell_id.dart';
import 'spell_pattern.dart';

/// Canonical spell definitions from Spellcaster.html / Waving Hands rules.
abstract final class SpellCatalog {
  static String notationFor(SpellId id) => _notation[id]!;

  static SpellPattern patternFor(SpellId id) => _patterns[id]!;

  static List<SpellPattern> patternsFor(SpellId id) =>
      _alternatePatterns[id] ?? [patternFor(id)];

  static List<SpellId> get allSpellIds => SpellId.values;

  static final Map<SpellId, String> _notation = {
    SpellId.shield: 'P',
    SpellId.removeEnchantment: 'P-D-W-P',
    SpellId.magicMirror: 'C-(w',
    SpellId.counterSpell: 'W-P-P / W-W-S',
    SpellId.dispelMagic: 'C-D-P-W',
    SpellId.raiseDead: 'D-W-W-F-W-C',
    SpellId.cureLightWounds: 'D-F-W',
    SpellId.cureHeavyWounds: 'D-F-P-W',
    SpellId.summonGoblin: 'S-F-W',
    SpellId.summonOgre: 'P-S-F-W',
    SpellId.summonTroll: 'F-P-S-F-W',
    SpellId.summonGiant: 'W-F-P-S-F-W',
    SpellId.summonElemental: 'C-S-W-W-S',
    SpellId.missile: 'S-D',
    SpellId.fingerOfDeath: 'P-W-P-F-S-S-S-D',
    SpellId.lightningBoltLong: 'D-F-F-D-D',
    SpellId.lightningBoltShort: 'W-D-D-C',
    SpellId.causeLightWounds: 'W-F-P',
    SpellId.causeHeavyWounds: 'W-P-F-D',
    SpellId.fireball: 'F-S-S-D-D',
    SpellId.fireStorm: 'S-W-W-C',
    SpellId.iceStorm: 'W-S-S-C',
    SpellId.amnesia: 'D-P-P',
    SpellId.confusion: 'D-S-F',
    SpellId.charmPerson: 'P-S-D-F',
    SpellId.charmMonster: 'P-S-D-D',
    SpellId.paralysis: 'F-F-F',
    SpellId.fear: 'S-W-D',
    SpellId.antiSpell: 'S-P-F',
    SpellId.protectionFromEvil: 'W-W-P',
    SpellId.resistHeat: 'W-W-F-P',
    SpellId.resistCold: 'S-S-F-P',
    SpellId.disease: 'D-S-F-F-F-C',
    SpellId.poison: 'D-W-W-F-W-D',
    SpellId.blindness: 'D-W-F-F-(d',
    SpellId.invisibility: 'P-P-(w-(s',
    SpellId.haste: 'P-W-P-W-W-C',
    SpellId.timeStop: 'S-P-P-C',
    SpellId.delayedEffect: 'D-W-S-S-S-P',
    SpellId.permanency: 'S-P-F-P-S-D-W',
  };

  static final Map<SpellId, SpellPattern> _patterns = {
    for (final e in _built.entries) e.key: e.value.first,
  };

  static final Map<SpellId, List<SpellPattern>> _alternatePatterns = {
    SpellId.counterSpell: _built[SpellId.counterSpell]!,
    SpellId.lightningBoltLong: [_built[SpellId.lightningBoltLong]!.first],
    SpellId.lightningBoltShort: [_built[SpellId.lightningBoltShort]!.first],
  };

  static final Map<SpellId, List<SpellPattern>> _built = {
    SpellId.shield: [_seq(SpellId.shield, [Gesture.p])],
    SpellId.removeEnchantment: [
      _seq(SpellId.removeEnchantment, [Gesture.p, Gesture.d, Gesture.w, Gesture.p])
    ],
    SpellId.magicMirror: [
      _seq(SpellId.magicMirror, [clap, both(Gesture.w)])
    ],
    SpellId.counterSpell: [
      _seq(SpellId.counterSpell, [Gesture.w, Gesture.p, Gesture.p]),
      _seq(SpellId.counterSpell, [Gesture.w, Gesture.w, Gesture.s]),
    ],
    SpellId.dispelMagic: [
      _seq(SpellId.dispelMagic, [clap, Gesture.d, Gesture.p, Gesture.w])
    ],
    SpellId.raiseDead: [
      _seq(SpellId.raiseDead,
          [Gesture.d, Gesture.w, Gesture.w, Gesture.f, Gesture.w, clap])
    ],
    SpellId.cureLightWounds: [_seq(SpellId.cureLightWounds, [Gesture.d, Gesture.f, Gesture.w])],
    SpellId.cureHeavyWounds: [
      _seq(SpellId.cureHeavyWounds, [Gesture.d, Gesture.f, Gesture.p, Gesture.w])
    ],
    SpellId.summonGoblin: [_seq(SpellId.summonGoblin, [Gesture.s, Gesture.f, Gesture.w])],
    SpellId.summonOgre: [_seq(SpellId.summonOgre, [Gesture.p, Gesture.s, Gesture.f, Gesture.w])],
    SpellId.summonTroll: [
      _seq(SpellId.summonTroll, [Gesture.f, Gesture.p, Gesture.s, Gesture.f, Gesture.w])
    ],
    SpellId.summonGiant: [
      _seq(SpellId.summonGiant,
          [Gesture.w, Gesture.f, Gesture.p, Gesture.s, Gesture.f, Gesture.w])
    ],
    SpellId.summonElemental: [
      _seq(SpellId.summonElemental, [clap, Gesture.s, Gesture.w, Gesture.w, Gesture.s])
    ],
    SpellId.missile: [_seq(SpellId.missile, [Gesture.s, Gesture.d])],
    SpellId.fingerOfDeath: [
      _seq(SpellId.fingerOfDeath,
          [Gesture.p, Gesture.w, Gesture.p, Gesture.f, Gesture.s, Gesture.s, Gesture.s, Gesture.d])
    ],
    SpellId.lightningBoltLong: [
      _seq(SpellId.lightningBoltLong, [Gesture.d, Gesture.f, Gesture.f, Gesture.d, Gesture.d])
    ],
    SpellId.lightningBoltShort: [
      _seq(SpellId.lightningBoltShort, [Gesture.w, Gesture.d, Gesture.d, clap])
    ],
    SpellId.causeLightWounds: [_seq(SpellId.causeLightWounds, [Gesture.w, Gesture.f, Gesture.p])],
    SpellId.causeHeavyWounds: [
      _seq(SpellId.causeHeavyWounds, [Gesture.w, Gesture.p, Gesture.f, Gesture.d])
    ],
    SpellId.fireball: [_seq(SpellId.fireball, [Gesture.f, Gesture.s, Gesture.s, Gesture.d, Gesture.d])],
    SpellId.fireStorm: [_seq(SpellId.fireStorm, [Gesture.s, Gesture.w, Gesture.w, clap])],
    SpellId.iceStorm: [_seq(SpellId.iceStorm, [Gesture.w, Gesture.s, Gesture.s, clap])],
    SpellId.amnesia: [_seq(SpellId.amnesia, [Gesture.d, Gesture.p, Gesture.p])],
    SpellId.confusion: [_seq(SpellId.confusion, [Gesture.d, Gesture.s, Gesture.f])],
    SpellId.charmPerson: [_seq(SpellId.charmPerson, [Gesture.p, Gesture.s, Gesture.d, Gesture.f])],
    SpellId.charmMonster: [_seq(SpellId.charmMonster, [Gesture.p, Gesture.s, Gesture.d, Gesture.d])],
    SpellId.paralysis: [_seq(SpellId.paralysis, [Gesture.f, Gesture.f, Gesture.f])],
    SpellId.fear: [_seq(SpellId.fear, [Gesture.s, Gesture.w, Gesture.d])],
    SpellId.antiSpell: [_seq(SpellId.antiSpell, [Gesture.s, Gesture.p, Gesture.f])],
    SpellId.protectionFromEvil: [_seq(SpellId.protectionFromEvil, [Gesture.w, Gesture.w, Gesture.p])],
    SpellId.resistHeat: [_seq(SpellId.resistHeat, [Gesture.w, Gesture.w, Gesture.f, Gesture.p])],
    SpellId.resistCold: [_seq(SpellId.resistCold, [Gesture.s, Gesture.s, Gesture.f, Gesture.p])],
    SpellId.disease: [
      _seq(SpellId.disease, [Gesture.d, Gesture.s, Gesture.f, Gesture.f, Gesture.f, clap])
    ],
    SpellId.poison: [
      _seq(SpellId.poison, [Gesture.d, Gesture.w, Gesture.w, Gesture.f, Gesture.w, Gesture.d])
    ],
    SpellId.blindness: [
      _seq(SpellId.blindness, [Gesture.d, Gesture.w, Gesture.f, Gesture.f, both(Gesture.d)])
    ],
    SpellId.invisibility: [
      _seq(SpellId.invisibility, [Gesture.p, Gesture.p, both(Gesture.w), both(Gesture.s)])
    ],
    SpellId.haste: [
      _seq(SpellId.haste, [Gesture.p, Gesture.w, Gesture.p, Gesture.w, Gesture.w, clap])
    ],
    SpellId.timeStop: [_seq(SpellId.timeStop, [Gesture.s, Gesture.p, Gesture.p, clap])],
    SpellId.delayedEffect: [
      _seq(SpellId.delayedEffect, [Gesture.d, Gesture.w, Gesture.s, Gesture.s, Gesture.s, Gesture.p])
    ],
    SpellId.permanency: [
      _seq(SpellId.permanency,
          [Gesture.s, Gesture.p, Gesture.f, Gesture.p, Gesture.s, Gesture.d, Gesture.w])
    ],
  };

  static const ClapStep clap = ClapStep();

  static BothHandsStep both(Gesture g) => BothHandsStep(g);

  static SpellPattern _seq(SpellId id, List<Object> raw) {
    final steps = raw.map<PatternStep>((e) => switch (e) {
          Gesture g => SingleStep(g),
          ClapStep c => c,
          BothHandsStep b => b,
          PatternStep p => p,
          _ => throw ArgumentError('Invalid pattern step: $e'),
        }).toList();
    return SpellPattern(id, steps);
  }
}

/// Enchantments that cancel each other when on the same wizard simultaneously.
const Set<SpellId> conflictingEnchantments = {
  SpellId.amnesia,
  SpellId.confusion,
  SpellId.charmPerson,
  SpellId.charmMonster,
  SpellId.paralysis,
  SpellId.fear,
};

/// Enchantments excluded from permanency extension.
const Set<SpellId> permanencyExcluded = {
  SpellId.antiSpell,
  SpellId.disease,
  SpellId.poison,
  SpellId.timeStop,
};

/// Maximum damage before death (15th point kills).
const int wizardMaxDamage = 14;

/// Protection from evil duration including cast turn.
const int protectionFromEvilTurns = 4;

/// Blindness / invisibility visibility duration (turns after cast, excluding cast turn).
const int blindnessDuration = 3;

/// Haste extra gesture sets for 3 turns after application.
const int hasteTurns = 3;

/// Disease/poison countdown from cast turn.
const int diseaseTurns = 6;

/// Delayed effect / permanency window for next completed spell.
const int bankingWindowTurns = 3;
