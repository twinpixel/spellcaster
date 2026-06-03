/// All named spells from the official Spellcaster / Waving Hands rules.
enum SpellId {
  // Protection
  shield,
  removeEnchantment,
  magicMirror,
  counterSpell,
  dispelMagic,
  raiseDead,
  cureLightWounds,
  cureHeavyWounds,

  // Summons
  summonGoblin,
  summonOgre,
  summonTroll,
  summonGiant,
  summonElemental,

  // Damaging
  missile,
  fingerOfDeath,
  lightningBoltLong,
  lightningBoltShort,
  causeLightWounds,
  causeHeavyWounds,
  fireball,
  fireStorm,
  iceStorm,

  // Enchantments
  amnesia,
  confusion,
  charmPerson,
  charmMonster,
  paralysis,
  fear,
  antiSpell,
  protectionFromEvil,
  resistHeat,
  resistCold,
  disease,
  poison,
  blindness,
  invisibility,
  haste,
  timeStop,
  delayedEffect,
  permanency,
}

/// Spell section per rules document.
enum SpellSection {
  protection,
  summons,
  damaging,
  enchantment,
}

extension SpellIdMeta on SpellId {
  String get displayName => switch (this) {
        SpellId.shield => 'Shield',
        SpellId.removeEnchantment => 'Remove enchantment',
        SpellId.magicMirror => 'Magic mirror',
        SpellId.counterSpell => 'Counter-spell',
        SpellId.dispelMagic => 'Dispel magic',
        SpellId.raiseDead => 'Raise dead',
        SpellId.cureLightWounds => 'Cure light wounds',
        SpellId.cureHeavyWounds => 'Cure heavy wounds',
        SpellId.summonGoblin => 'Summon goblin',
        SpellId.summonOgre => 'Summon ogre',
        SpellId.summonTroll => 'Summon troll',
        SpellId.summonGiant => 'Summon giant',
        SpellId.summonElemental => 'Summon elemental',
        SpellId.missile => 'Missile',
        SpellId.fingerOfDeath => 'Finger of death',
        SpellId.lightningBoltLong => 'Lightning bolt (long)',
        SpellId.lightningBoltShort => 'Lightning bolt (short)',
        SpellId.causeLightWounds => 'Cause light wounds',
        SpellId.causeHeavyWounds => 'Cause heavy wounds',
        SpellId.fireball => 'Fireball',
        SpellId.fireStorm => 'Fire storm',
        SpellId.iceStorm => 'Ice storm',
        SpellId.amnesia => 'Amnesia',
        SpellId.confusion => 'Confusion',
        SpellId.charmPerson => 'Charm person',
        SpellId.charmMonster => 'Charm monster',
        SpellId.paralysis => 'Paralysis',
        SpellId.fear => 'Fear',
        SpellId.antiSpell => 'Anti-spell',
        SpellId.protectionFromEvil => 'Protection from evil',
        SpellId.resistHeat => 'Resist heat',
        SpellId.resistCold => 'Resist cold',
        SpellId.disease => 'Disease',
        SpellId.poison => 'Poison',
        SpellId.blindness => 'Blindness',
        SpellId.invisibility => 'Invisibility',
        SpellId.haste => 'Haste',
        SpellId.timeStop => 'Time stop',
        SpellId.delayedEffect => 'Delayed effect',
        SpellId.permanency => 'Permanency',
      };

  SpellSection get section => switch (this) {
        SpellId.shield ||
        SpellId.removeEnchantment ||
        SpellId.magicMirror ||
        SpellId.counterSpell ||
        SpellId.dispelMagic ||
        SpellId.raiseDead ||
        SpellId.cureLightWounds ||
        SpellId.cureHeavyWounds =>
          SpellSection.protection,
        SpellId.summonGoblin ||
        SpellId.summonOgre ||
        SpellId.summonTroll ||
        SpellId.summonGiant ||
        SpellId.summonElemental =>
          SpellSection.summons,
        SpellId.missile ||
        SpellId.fingerOfDeath ||
        SpellId.lightningBoltLong ||
        SpellId.lightningBoltShort ||
        SpellId.causeLightWounds ||
        SpellId.causeHeavyWounds ||
        SpellId.fireball ||
        SpellId.fireStorm ||
        SpellId.iceStorm =>
          SpellSection.damaging,
        _ => SpellSection.enchantment,
      };

  bool get isEnchantment => section == SpellSection.enchantment;

  /// Gestures as printed in the rules (uppercase = one hand; (x = both hands).
  String get gestureNotation => SpellCatalog.notationFor(this);
}
