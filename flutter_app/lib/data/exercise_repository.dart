/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import '../models/exercise.dart';

/// Kurzinfo je Fach (aus index.json) — für die Fächer-Übersicht ohne dass die
/// vollen Fragen geladen werden müssen.
class SubjectInfo {
  final String key;
  final List<int> grades;
  final int topicCount;
  final int questionCount;

  const SubjectInfo({
    required this.key,
    required this.grades,
    required this.topicCount,
    required this.questionCount,
  });

  factory SubjectInfo.fromJson(Map<String, dynamic> j) => SubjectInfo(
        key: j['key'] as String,
        grades: (j['grades'] as List<dynamic>).map((g) => (g as num).toInt()).toList(),
        topicCount: (j['topicCount'] as num?)?.toInt() ?? 0,
        questionCount: (j['questionCount'] as num?)?.toInt() ?? 0,
      );
}

/// Lädt die gebündelten Übungsinhalte offline. Der komplette Content liegt pro
/// Fach in `assets/exercises/<fach>.json`; die kleine `index.json` wird beim
/// Start gelesen, die Fach-Dateien erst bei Bedarf (schnell + speicherschonend).
class ExerciseRepository {
  List<SubjectInfo> _subjects = const [];
  final Map<String, List<ExerciseTopic>> _cache = {};

  List<SubjectInfo> get subjects => _subjects;

  /// Beim Start: nur den Index laden (winzig).
  Future<void> loadIndex() async {
    final raw = await rootBundle.loadString('assets/exercises/index.json');
    final json = jsonDecode(raw) as Map<String, dynamic>;
    _subjects = (json['subjects'] as List<dynamic>)
        .map((s) => SubjectInfo.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  SubjectInfo? subjectInfo(String subject) {
    for (final s in _subjects) {
      if (s.key == subject) return s;
    }
    return null;
  }

  List<int> gradesFor(String subject) => subjectInfo(subject)?.grades ?? const [];

  /// Alle Themen eines Fachs (aus der Fach-Datei; gecacht).
  Future<List<ExerciseTopic>> loadSubject(String subject) async {
    final cached = _cache[subject];
    if (cached != null) return cached;
    final raw = await rootBundle.loadString('assets/exercises/$subject.json');
    final json = jsonDecode(raw) as Map<String, dynamic>;
    final topics = (json['topics'] as List<dynamic>)
        .map((t) => ExerciseTopic.fromJson(t as Map<String, dynamic>))
        .toList();
    _cache[subject] = topics;
    return topics;
  }

  /// Themen eines Fachs für eine Klassenstufe.
  Future<List<ExerciseTopic>> topicsFor(String subject, int grade) async {
    final topics = await loadSubject(subject);
    return topics.where((t) => t.grade == grade).toList()
      ..sort((a, b) => a.order.compareTo(b.order));
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
