/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import '../data/exercise_repository.dart';
import 'api_client.dart';

/// Hält die Offline-Übungsinhalte aktuell.
///
/// Reihenfolge beim Start:
///   1. Gecachte Datei (letzter Online-Stand) laden — falls vorhanden.
///   2. Sonst das gebündelte Asset (immer verfügbar).
/// Bei Internet wird danach im Hintergrund der neueste Stand vom Server geholt
/// und für das nächste Offline-Mal gespeichert.
class ContentSync {
  final ExerciseRepository repo;
  ContentSync(this.repo);

  Future<File> _cacheFile() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/exercises_cache.json');
  }

  /// Beim App-Start: schnellster verfügbarer Stand laden (offline-tauglich).
  Future<void> loadInitial() async {
    try {
      final file = await _cacheFile();
      if (await file.exists()) {
        final raw = await file.readAsString();
        repo.applyJson(jsonDecode(raw) as Map<String, dynamic>);
        return;
      }
    } catch (_) {
      // Fällt unten auf das Asset zurück.
    }
    await repo.load(); // gebündeltes Asset
  }

  /// Online-Aktualisierung (nur aufrufen, wenn Verbindung besteht).
  /// Fehler werden geschluckt — offline bleibt der vorige Stand aktiv.
  Future<bool> refreshFromServer() async {
    try {
      final json = await ApiClient.instance.fetchExerciseContent();
      if (json.isEmpty || json['topics'] == null) return false;
      repo.applyJson(json);
      final file = await _cacheFile();
      await file.writeAsString(jsonEncode(json));
      return true;
    } catch (_) {
      return false;
    }
  }
}
