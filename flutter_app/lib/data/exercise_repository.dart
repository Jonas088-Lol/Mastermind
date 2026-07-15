/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import '../models/exercise.dart';

/// Lädt die gebündelten Übungsinhalte (offline) aus assets/exercises.json.
/// Kann online per ApiClient.fetchExerciseContent() aktualisiert werden.
class ExerciseRepository {
  List<ExerciseTopic> _topics = const [];

  List<ExerciseTopic> get topics => _topics;

  Future<void> load() async {
    final raw = await rootBundle.loadString('assets/exercises.json');
    _parse(raw);
  }

  /// Content aus einem geladenen JSON (z. B. vom Server) übernehmen.
  void applyJson(Map<String, dynamic> json) {
    final list = (json['topics'] as List<dynamic>? ?? const []);
    _topics = list
        .map((t) => ExerciseTopic.fromJson(t as Map<String, dynamic>))
        .toList();
  }

  void _parse(String raw) {
    final json = jsonDecode(raw) as Map<String, dynamic>;
    applyJson(json);
  }

  /// Alle Fächer (Keys) mit Themenanzahl.
  Map<String, int> subjectCounts() {
    final map = <String, int>{};
    for (final t in _topics) {
      map[t.subject] = (map[t.subject] ?? 0) + 1;
    }
    return map;
  }

  List<int> gradesFor(String subject) {
    final set = <int>{};
    for (final t in _topics) {
      if (t.subject == subject) set.add(t.grade);
    }
    final list = set.toList()..sort();
    return list;
  }

  List<ExerciseTopic> topicsFor(String subject, int grade) {
    final list = _topics.where((t) => t.subject == subject && t.grade == grade).toList()
      ..sort((a, b) => a.order.compareTo(b.order));
    return list;
  }

  ExerciseTopic? topicById(String id) {
    for (final t in _topics) {
      if (t.id == id) return t;
    }
    return null;
  }
}

/// Anzeige-Labels für Fächer (analog zum Web).
const Map<String, String> kSubjectLabels = {
  'mathematik': 'Mathematik',
  'deutsch': 'Deutsch',
  'englisch': 'Englisch',
  'franzoesisch': 'Französisch',
  'latein': 'Latein',
  'spanisch': 'Spanisch',
  'physik': 'Physik',
  'chemie': 'Chemie',
  'biologie': 'Biologie',
  'geschichte': 'Geschichte',
  'erdkunde': 'Erdkunde',
  'geografie': 'Geografie',
  'informatik': 'Informatik',
  'wirtschaft': 'Wirtschaft',
  'musik': 'Musik',
  'kunst': 'Kunst',
  'sport': 'Sport',
  'ethik': 'Ethik',
  'sachkunde': 'Sachkunde',
  'technik': 'Technik',
  'philosophie': 'Philosophie',
  'psychologie': 'Psychologie',
};

String subjectLabel(String key) =>
    kSubjectLabels[key] ?? (key.isEmpty ? key : key[0].toUpperCase() + key.substring(1));
