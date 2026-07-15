/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/foundation.dart';

import '../models/flashcard.dart';
import 'local_store.dart';

/// Lokale Karteikarten-Verwaltung (offline, Hive). Voll funktionsfähig ohne
/// Server — Erstellen, Bearbeiten, Löschen und Lernen (SM-2).
class FlashcardRepository extends ChangeNotifier {
  final Map<String, Deck> _decks = {};

  List<Deck> get decks {
    final list = _decks.values.toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return list;
  }

  Future<void> load() async {
    final box = LocalStore.decks;
    _decks.clear();
    for (final key in box.keys) {
      final raw = box.get(key);
      if (raw is Map) {
        final deck = Deck.fromMap(raw);
        _decks[deck.id] = deck;
      }
    }
    notifyListeners();
  }

  Deck? deckById(String id) => _decks[id];

  String _newId() => DateTime.now().microsecondsSinceEpoch.toString();

  Future<Deck> createDeck(String name, {String? subject}) async {
    final now = DateTime.now();
    final deck = Deck(
      id: _newId(),
      name: name.trim(),
      subject: subject,
      createdAt: now,
      updatedAt: now,
    );
    _decks[deck.id] = deck;
    await _persist(deck);
    notifyListeners();
    return deck;
  }

  Future<void> deleteDeck(String deckId) async {
    _decks.remove(deckId);
    await LocalStore.decks.delete(deckId);
    notifyListeners();
  }

  Future<void> addCard(String deckId, String front, String back) async {
    final deck = _decks[deckId];
    if (deck == null) return;
    deck.cards.add(Flashcard(id: _newId(), front: front.trim(), back: back.trim()));
    deck.updatedAt = DateTime.now();
    await _persist(deck);
    notifyListeners();
  }

  Future<void> deleteCard(String deckId, String cardId) async {
    final deck = _decks[deckId];
    if (deck == null) return;
    deck.cards.removeWhere((c) => c.id == cardId);
    deck.updatedAt = DateTime.now();
    await _persist(deck);
    notifyListeners();
  }

  Future<void> reviewCard(String deckId, String cardId, int quality) async {
    final deck = _decks[deckId];
    if (deck == null) return;
    final card = deck.cards.where((c) => c.id == cardId).firstOrNull;
    if (card == null) return;
    card.review(quality);
    deck.updatedAt = DateTime.now();
    await _persist(deck);
    notifyListeners();
  }

  List<Flashcard> dueCards(String deckId) {
    final deck = _decks[deckId];
    if (deck == null) return const [];
    final now = DateTime.now();
    return deck.cards.where((c) => !c.nextReviewAt.isAfter(now)).toList();
  }

  Future<void> _persist(Deck deck) async {
    await LocalStore.decks.put(deck.id, deck.toMap());
  }
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull => isEmpty ? null : first;
}
