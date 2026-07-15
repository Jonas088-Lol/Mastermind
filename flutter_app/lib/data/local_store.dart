/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:hive_flutter/hive_flutter.dart';

/// Zentrale Hive-Initialisierung und Box-Namen für die lokale Offline-Ablage.
class LocalStore {
  static const String decksBox = 'decks';
  static const String progressBox = 'exercise_progress';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(decksBox);
    await Hive.openBox(progressBox);
  }

  static Box get decks => Hive.box(decksBox);
  static Box get progress => Hive.box(progressBox);
}
