// ignore_for_file: avoid_print
import 'dart:io';

class SpellTestDef {
  SpellTestDef(this.file, this.name, this.steps, this.spell, this.effect);
  final String file;
  final String name;
  final String steps;
  final String spell;
  final String effect;
}

void main() {
  final defs = [
    SpellTestDef('shield', 'Shield', '[Gesture.p]', 'SpellId.shield',
        'expect(SpellEffects.blockedByShield(SpellId.missile), isTrue);'),
    SpellTestDef(
        'remove_enchantment',
        'Remove enchantment',
        '[Gesture.p, Gesture.d, Gesture.w, Gesture.p]',
        'SpellId.removeEnchantment',
        'expect(SpellEffects.damageFor(SpellId.removeEnchantment), 0);'),
    SpellTestDef('magic_mirror', 'Magic mirror',
        "['clap', ['both', Gesture.w]]", 'SpellId.magicMirror',
        'expect(SpellEffects.reflectsInMirror(SpellId.missile), isTrue);'),
    SpellTestDef('counter_spell_wpp', 'Counter-spell W-P-P',
        '[Gesture.w, Gesture.p, Gesture.p]', 'SpellId.counterSpell',
        'expect(SpellEffects.blockedByCounterSpell(SpellId.missile), isTrue);'),
    SpellTestDef('counter_spell_wws', 'Counter-spell W-W-S',
        '[Gesture.w, Gesture.w, Gesture.s]', 'SpellId.counterSpell',
        'expect(SpellEffects.blockedByCounterSpell(SpellId.fireball), isTrue);'),
    SpellTestDef('dispel_magic', 'Dispel magic',
        "['clap', Gesture.d, Gesture.p, Gesture.w]", 'SpellId.dispelMagic',
        'expect(SpellEffects.blockedByDispelMagic(SpellId.missile), isTrue);'),
    SpellTestDef('raise_dead', 'Raise dead',
        '[Gesture.d, Gesture.w, Gesture.w, Gesture.f, Gesture.w, \'clap\']',
        'SpellId.raiseDead',
        'expect(SpellEffects.cureFor(SpellId.raiseDead), 5);'),
    SpellTestDef('cure_light_wounds', 'Cure light wounds',
        '[Gesture.d, Gesture.f, Gesture.w]', 'SpellId.cureLightWounds',
        'expect(SpellEffects.cureFor(SpellId.cureLightWounds), 1);'),
    SpellTestDef('cure_heavy_wounds', 'Cure heavy wounds',
        '[Gesture.d, Gesture.f, Gesture.p, Gesture.w]', 'SpellId.cureHeavyWounds',
        'expect(SpellEffects.cureFor(SpellId.cureHeavyWounds), 2);'),
    SpellTestDef('summon_goblin', 'Summon goblin',
        '[Gesture.s, Gesture.f, Gesture.w]', 'SpellId.summonGoblin',
        'expect(MonsterKind.goblin.hitPoints, 1);'),
    SpellTestDef('summon_ogre', 'Summon ogre',
        '[Gesture.p, Gesture.s, Gesture.f, Gesture.w]', 'SpellId.summonOgre',
        'expect(MonsterKind.ogre.damage, 2);'),
    SpellTestDef('summon_troll', 'Summon troll',
        '[Gesture.f, Gesture.p, Gesture.s, Gesture.f, Gesture.w]',
        'SpellId.summonTroll',
        'expect(MonsterKind.troll.hitPoints, 3);'),
    SpellTestDef('summon_giant', 'Summon giant',
        '[Gesture.w, Gesture.f, Gesture.p, Gesture.s, Gesture.f, Gesture.w]',
        'SpellId.summonGiant',
        'expect(MonsterKind.giant.damage, 4);'),
    SpellTestDef('summon_elemental', 'Summon elemental',
        "['clap', Gesture.s, Gesture.w, Gesture.w, Gesture.s]",
        'SpellId.summonElemental',
        'expect(MonsterKind.fireElemental.hitPoints, 3);'),
    SpellTestDef('missile', 'Missile', '[Gesture.s, Gesture.d]', 'SpellId.missile',
        'expect(SpellEffects.damageFor(SpellId.missile), 1);'),
    SpellTestDef(
        'finger_of_death',
        'Finger of death',
        '[Gesture.p, Gesture.w, Gesture.p, Gesture.f, Gesture.s, Gesture.s, Gesture.s, Gesture.d]',
        'SpellId.fingerOfDeath',
        'expect(SpellEffects.isKillSpell(SpellId.fingerOfDeath), isTrue);'),
    SpellTestDef('lightning_bolt_long', 'Lightning bolt (long)',
        '[Gesture.d, Gesture.f, Gesture.f, Gesture.d, Gesture.d]',
        'SpellId.lightningBoltLong',
        'expect(SpellEffects.damageFor(SpellId.lightningBoltLong), 5);'),
    SpellTestDef('lightning_bolt_short', 'Lightning bolt (short)',
        "[Gesture.w, Gesture.d, Gesture.d, 'clap']",
        'SpellId.lightningBoltShort',
        'expect(SpellEffects.damageFor(SpellId.lightningBoltShort), 5);'),
    SpellTestDef('cause_light_wounds', 'Cause light wounds',
        '[Gesture.w, Gesture.f, Gesture.p]', 'SpellId.causeLightWounds',
        'expect(SpellEffects.damageFor(SpellId.causeLightWounds), 2);'),
    SpellTestDef('cause_heavy_wounds', 'Cause heavy wounds',
        '[Gesture.w, Gesture.p, Gesture.f, Gesture.d]', 'SpellId.causeHeavyWounds',
        'expect(SpellEffects.damageFor(SpellId.causeHeavyWounds), 3);'),
    SpellTestDef('fireball', 'Fireball',
        '[Gesture.f, Gesture.s, Gesture.s, Gesture.d, Gesture.d]', 'SpellId.fireball',
        'expect(SpellEffects.damageFor(SpellId.fireball), 5);'),
    SpellTestDef('fire_storm', 'Fire storm',
        '[Gesture.s, Gesture.w, Gesture.w, \'clap\']', 'SpellId.fireStorm',
        'expect(SpellEffects.damageFor(SpellId.fireStorm), 5);'),
    SpellTestDef('ice_storm', 'Ice storm',
        '[Gesture.w, Gesture.s, Gesture.s, \'clap\']', 'SpellId.iceStorm',
        'expect(SpellEffects.damageFor(SpellId.iceStorm), 5);'),
    SpellTestDef('amnesia', 'Amnesia', '[Gesture.d, Gesture.p, Gesture.p]',
        'SpellId.amnesia',
        'expect(conflictingEnchantments.contains(SpellId.amnesia), isTrue);'),
    SpellTestDef('confusion', 'Confusion', '[Gesture.d, Gesture.s, Gesture.f]',
        'SpellId.confusion',
        'expect(SpellEffects.enchantmentGroupCancels([SpellId.amnesia, SpellId.confusion]), isTrue);'),
    SpellTestDef('charm_person', 'Charm person',
        '[Gesture.p, Gesture.s, Gesture.d, Gesture.f]', 'SpellId.charmPerson',
        'expect(SpellId.charmPerson.isEnchantment, isTrue);'),
    SpellTestDef('charm_monster', 'Charm monster',
        '[Gesture.p, Gesture.s, Gesture.d, Gesture.d]', 'SpellId.charmMonster',
        'expect(SpellId.charmMonster.isEnchantment, isTrue);'),
    SpellTestDef('paralysis', 'Paralysis', '[Gesture.f, Gesture.f, Gesture.f]',
        'SpellId.paralysis',
        'expect(SpellEffects.paralysisSubstitute(Gesture.s), Gesture.f);'),
    SpellTestDef('fear', 'Fear', '[Gesture.s, Gesture.w, Gesture.d]', 'SpellId.fear',
        'expect(SpellId.fear.isEnchantment, isTrue);'),
    SpellTestDef('anti_spell', 'Anti-spell', '[Gesture.s, Gesture.p, Gesture.f]',
        'SpellId.antiSpell',
        'expect(permanencyExcluded.contains(SpellId.antiSpell), isTrue);'),
    SpellTestDef('protection_from_evil', 'Protection from evil',
        '[Gesture.w, Gesture.w, Gesture.p]', 'SpellId.protectionFromEvil',
        'expect(protectionFromEvilTurns, 4);'),
    SpellTestDef('resist_heat', 'Resist heat',
        '[Gesture.w, Gesture.w, Gesture.f, Gesture.p]', 'SpellId.resistHeat', '''
      final w = Wizard(id: 'x', name: 'x');
      w.status.resistHeat = true;
      expect(SpellEffects.fireDamageIgnored(w), isTrue);
    '''),
    SpellTestDef('resist_cold', 'Resist cold',
        '[Gesture.s, Gesture.s, Gesture.f, Gesture.p]', 'SpellId.resistCold', '''
      final w = Wizard(id: 'x', name: 'x');
      w.status.resistCold = true;
      expect(SpellEffects.coldDamageIgnored(w), isTrue);
    '''),
    SpellTestDef('disease', 'Disease',
        '[Gesture.d, Gesture.s, Gesture.f, Gesture.f, Gesture.f, \'clap\']',
        'SpellId.disease',
        'expect(diseaseTurns, 6);'),
    SpellTestDef('poison', 'Poison',
        '[Gesture.d, Gesture.w, Gesture.w, Gesture.f, Gesture.w, Gesture.d]',
        'SpellId.poison',
        'expect(permanencyExcluded.contains(SpellId.poison), isTrue);'),
    SpellTestDef('blindness', 'Blindness',
        '[Gesture.d, Gesture.w, Gesture.f, Gesture.f, [\'both\', Gesture.d]]',
        'SpellId.blindness',
        'expect(blindnessDuration, 3);'),
    SpellTestDef('invisibility', 'Invisibility',
        '[Gesture.p, Gesture.p, [\'both\', Gesture.w], [\'both\', Gesture.s]]',
        'SpellId.invisibility',
        'expect(blindnessDuration, 3);'),
    SpellTestDef('haste', 'Haste',
        '[Gesture.p, Gesture.w, Gesture.p, Gesture.w, Gesture.w, \'clap\']',
        'SpellId.haste',
        'expect(hasteTurns, 3);'),
    SpellTestDef('time_stop', 'Time stop',
        '[Gesture.s, Gesture.p, Gesture.p, \'clap\']', 'SpellId.timeStop',
        'expect(permanencyExcluded.contains(SpellId.timeStop), isTrue);'),
    SpellTestDef('delayed_effect', 'Delayed effect',
        '[Gesture.d, Gesture.w, Gesture.s, Gesture.s, Gesture.s, Gesture.p]',
        'SpellId.delayedEffect',
        'expect(bankingWindowTurns, 3);'),
    SpellTestDef('permanency', 'Permanency',
        '[Gesture.s, Gesture.p, Gesture.f, Gesture.p, Gesture.s, Gesture.d, Gesture.w]',
        'SpellId.permanency',
        'expect(SpellId.permanency.isEnchantment, isTrue);'),
  ];

  final dir = Directory('test/spells');
  dir.createSync(recursive: true);

  for (final d in defs) {
    File('${dir.path}/${d.file}_test.dart').writeAsStringSync('''
import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:test/test.dart';

import '../helpers/spell_test_helpers.dart';

void main() {
  group('${d.name}', () {
    test('gesture pattern completes', () {
      expect(spellCompletes(${d.steps}, ${d.spell}), isTrue);
    });

    test('effect / rules constants', () {
      ${d.effect}
    });
  });
}
''');
    print('Wrote ${d.file}_test.dart');
  }
}
