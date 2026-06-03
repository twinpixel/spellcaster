import '../gesture.dart';
import '../hand_buffer.dart';
import '../spell_id.dart';
import 'monster.dart';
import 'turn_action.dart';

/// Active enchantment or delayed state on a wizard.
class WizardStatus {
  WizardStatus({
    this.blindUntilTurn = -1,
    this.invisibleUntilTurn = -1,
    this.protectionFromEvilUntilTurn = -1,
    this.resistHeat = false,
    this.resistCold = false,
    this.diseaseTurnsLeft = 0,
    this.poisonTurnsLeft = 0,
    this.hasteTurnsLeft = 0,
    this.antiSpellNextTurn = false,
    this.amnesiaRepeat,
    this.paralyzedHand,
    this.fearNextTurn = false,
    this.bankSpell,
    this.permanencyPending = false,
    this.delayedEffectPending = false,
  });

  int blindUntilTurn;
  int invisibleUntilTurn;
  int protectionFromEvilUntilTurn;
  bool resistHeat;
  bool resistCold;
  int diseaseTurnsLeft;
  int poisonTurnsLeft;
  int hasteTurnsLeft;
  bool antiSpellNextTurn;
  TurnAction? amnesiaRepeat;
  int? paralyzedHand; // 0 left, 1 right
  bool fearNextTurn;
  SpellId? bankSpell;
  bool permanencyPending;
  bool delayedEffectPending;

  bool isBlind(int turn) => turn <= blindUntilTurn;
  bool isInvisible(int turn) => turn <= invisibleUntilTurn;
  bool hasProtectionFromEvil(int turn) => turn <= protectionFromEvilUntilTurn;
}

class Wizard {
  Wizard({
    required this.id,
    required this.name,
    this.damage = 0,
    HandBuffer? leftHand,
    HandBuffer? rightHand,
    WizardStatus? status,
    this.usedShortLightning = false,
  })  : leftHand = leftHand ?? HandBuffer(),
        rightHand = rightHand ?? HandBuffer(),
        status = status ?? WizardStatus();

  final String id;
  final String name;
  int damage;
  final HandBuffer leftHand;
  final HandBuffer rightHand;
  final WizardStatus status;
  bool usedShortLightning;
  final List<Monster> monsters = [];

  bool get isDead => damage > 14;

  bool get isAlive => !isDead;
}
