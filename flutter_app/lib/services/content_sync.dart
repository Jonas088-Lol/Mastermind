/* Copyright 2026 Elian Schock, Jonas Schwenk */
import '../data/exercise_repository.dart';

/// Lädt die Übungs-Übersicht beim Start. Der komplette Content ist bereits in
/// der App gebündelt (assets/exercises/), daher ist kein Server-Download nötig —
/// alle Übungen sind sofort und dauerhaft offline verfügbar.
class ContentSync {
  final ExerciseRepository repo;
  ContentSync(this.repo);

  Future<void> loadInitial() => repo.loadIndex();

  /// Nichts zu tun — Inhalte sind gebündelt. Gibt true zurück (nichts fehlt).
  Future<bool> refreshFromServer() async => true;
}
