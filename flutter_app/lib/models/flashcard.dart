/* Copyright 2026 Elian Schock, Jonas Schwenk */

/// Ein Karteikarten-Deck (lokal auf dem Gerät gespeichert).
class Deck {
  final String id;
  String name;
  String? subject;
  final DateTime createdAt;
  DateTime updatedAt;
  List<Flashcard> cards;

  Deck({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.updatedAt,
    this.subject,
    List<Flashcard>? cards,
  }) : cards = cards ?? [];

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'subject': subject,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'cards': cards.map((c) => c.toMap()).toList(),
      };

  factory Deck.fromMap(Map<dynamic, dynamic> map) => Deck(
        id: map['id'] as String,
        name: map['name'] as String,
        subject: map['subject'] as String?,
        createdAt: DateTime.parse(map['createdAt'] as String),
        updatedAt: DateTime.parse(map['updatedAt'] as String),
        cards: ((map['cards'] as List<dynamic>?) ?? const [])
            .map((c) => Flashcard.fromMap(c as Map<dynamic, dynamic>))
            .toList(),
      );
}

/// Eine einzelne Karteikarte (Vorder-/Rückseite) mit einfachem SM-2-Stand.
class Flashcard {
  final String id;
  String front;
  String back;
  int repetitions;
  int intervalDays;
  double easeFactor;
  DateTime nextReviewAt;

  Flashcard({
    required this.id,
    required this.front,
    required this.back,
    DateTime? nextReviewAt,
    this.repetitions = 0,
    this.intervalDays = 1,
    this.easeFactor = 2.5,
  }) : nextReviewAt = nextReviewAt ?? DateTime.now();

  Map<String, dynamic> toMap() => {
        'id': id,
        'front': front,
        'back': back,
        'repetitions': repetitions,
        'intervalDays': intervalDays,
        'easeFactor': easeFactor,
        'nextReviewAt': nextReviewAt.toIso8601String(),
      };

  factory Flashcard.fromMap(Map<dynamic, dynamic> map) => Flashcard(
        id: map['id'] as String,
        front: map['front'] as String,
        back: map['back'] as String,
        repetitions: (map['repetitions'] as num?)?.toInt() ?? 0,
        intervalDays: (map['intervalDays'] as num?)?.toInt() ?? 1,
        easeFactor: (map['easeFactor'] as num?)?.toDouble() ?? 2.5,
        nextReviewAt: DateTime.parse(map['nextReviewAt'] as String),
      );

  /// SM-2-Vereinfachung: quality 0..5 aktualisiert Intervall & Ease.
  void review(int quality) {
    if (quality < 3) {
      repetitions = 0;
      intervalDays = 1;
    } else {
      repetitions += 1;
      if (repetitions == 1) {
        intervalDays = 1;
      } else if (repetitions == 2) {
        intervalDays = 6;
      } else {
        intervalDays = (intervalDays * easeFactor).round();
      }
      easeFactor = (easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
          .clamp(1.3, 3.0);
    }
    nextReviewAt = DateTime.now().add(Duration(days: intervalDays));
  }
}
