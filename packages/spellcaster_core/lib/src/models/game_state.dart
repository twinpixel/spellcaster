import '../game_rules.dart';
import 'wizard.dart';

/// Full duel state for two wizards.
class GameState {
  GameState({
    required this.wizardA,
    required this.wizardB,
    this.rules = GameRules.standard,
    this.turn = 0,
    this.finished = false,
    this.winnerId,
    this.isDraw = false,
  });

  final Wizard wizardA;
  final Wizard wizardB;
  final GameRules rules;
  int turn;
  bool finished;
  String? winnerId;
  bool isDraw;

  Wizard wizard(String id) =>
      wizardA.id == id ? wizardA : wizardB;

  Wizard opponent(String id) =>
      wizardA.id == id ? wizardB : wizardA;

  Iterable<Wizard> get wizards => [wizardA, wizardB];
}
