/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'dart:convert';

/// Ein Übungsthema mit seinen Fragen (offline, aus dem gebündelten Asset).
class ExerciseTopic {
  final String id;
  final String subject;
  final int grade;
  final String title;
  final String? description;
  final int order;
  final List<ExerciseQuestion> questions;

  const ExerciseTopic({
    required this.id,
    required this.subject,
    required this.grade,
    required this.title,
    required this.order,
    required this.questions,
    this.description,
  });

  factory ExerciseTopic.fromJson(Map<String, dynamic> json) {
    final rawQuestions = (json['questions'] as List<dynamic>? ?? const []);
    return ExerciseTopic(
      id: json['id'] as String,
      subject: json['subject'] as String,
      grade: (json['grade'] as num).toInt(),
      title: json['title'] as String,
      description: json['description'] as String?,
      order: (json['order'] as num?)?.toInt() ?? 0,
      questions: rawQuestions
          .map((q) => ExerciseQuestion.fromJson(q as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Eine einzelne Frage. `type` = mc | true_false | fill_blank | order | match | blitz.
class ExerciseQuestion {
  final String id;
  final String type;
  final String question;

  /// JSON-String (Array) oder null — je nach Fragetyp.
  final String? options;

  /// JSON-Wert oder Index (als String gespeichert, wie im Web).
  final String correct;
  final String? explanation;
  final int order;

  const ExerciseQuestion({
    required this.id,
    required this.type,
    required this.question,
    required this.correct,
    required this.order,
    this.options,
    this.explanation,
  });

  factory ExerciseQuestion.fromJson(Map<String, dynamic> json) => ExerciseQuestion(
        id: json['id'] as String,
        type: json['type'] as String,
        question: json['question'] as String,
        options: json['options'] as String?,
        correct: json['correct'] as String,
        explanation: json['explanation'] as String?,
        order: (json['order'] as num?)?.toInt() ?? 0,
      );

  /// Antwortoptionen als Liste (für mc/blitz). Leer bei anderen Typen.
  List<String> get optionList {
    if (options == null || options!.isEmpty) return const [];
    try {
      final decoded = jsonDecode(options!);
      if (decoded is List) return decoded.map((e) => e.toString()).toList();
    } catch (_) {}
    return const [];
  }

  /// Prüft eine Antwort. userAnswer je nach Typ:
  /// - mc/blitz: der Index als String
  /// - true_false: "true"/"false"
  /// - fill_blank: der eingegebene Text
  bool check(String userAnswer) {
    switch (type) {
      case 'mc':
      case 'blitz':
      case 'true_false':
        return userAnswer.trim() == correct.trim();
      case 'fill_blank':
        // correct kann ein JSON-Array oder ein einfacher String sein.
        try {
          final decoded = jsonDecode(correct);
          if (decoded is List && decoded.isNotEmpty) {
            return decoded.first.toString().trim().toLowerCase() ==
                userAnswer.trim().toLowerCase();
          }
        } catch (_) {}
        return correct.trim().toLowerCase() == userAnswer.trim().toLowerCase();
      default:
        return userAnswer.trim() == correct.trim();
    }
  }
}
