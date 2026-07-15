/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/flashcard_repository.dart';
import '../models/flashcard.dart';
import '../theme.dart';
import 'study_screen.dart';

class DeckScreen extends StatelessWidget {
  final String deckId;
  const DeckScreen({super.key, required this.deckId});

  @override
  Widget build(BuildContext context) {
    final repo = context.watch<FlashcardRepository>();
    final deck = repo.deckById(deckId);
    if (deck == null) {
      return const Scaffold(body: Center(child: Text('Deck nicht gefunden.')));
    }
    final due = repo.dueCards(deckId).length;

    return Scaffold(
      appBar: AppBar(
        title: Text(deck.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            tooltip: 'Deck löschen',
            onPressed: () async {
              final ok = await _confirm(context, 'Deck „${deck.name}“ löschen?');
              if (ok && context.mounted) {
                await repo.deleteDeck(deckId);
                if (context.mounted) Navigator.of(context).pop();
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: GradientButton(
              icon: Icons.play_arrow,
              label: 'Lernen ($due fällig)',
              onPressed: deck.cards.isEmpty
                  ? null
                  : () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => StudyScreen(deckId: deckId)),
                      ),
            ),
          ),
          Expanded(
            child: deck.cards.isEmpty
                ? const Center(child: Text('Noch keine Karten — füge unten welche hinzu.'))
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: deck.cards.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final Flashcard c = deck.cards[i];
                      return Card(
                        child: ListTile(
                          title: Text(c.front,
                              style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(c.back),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_outline),
                            onPressed: () => repo.deleteCard(deckId, c.id),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _addCardDialog(context, repo),
        icon: const Icon(Icons.add),
        label: const Text('Karte'),
      ),
    );
  }

  Future<void> _addCardDialog(BuildContext context, FlashcardRepository repo) async {
    final front = TextEditingController();
    final back = TextEditingController();
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Neue Karte'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: front,
              autofocus: true,
              decoration: const InputDecoration(labelText: 'Vorderseite'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: back,
              decoration: const InputDecoration(labelText: 'Rückseite'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Abbrechen')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Hinzufügen')),
        ],
      ),
    );
    if (saved == true && front.text.trim().isNotEmpty && back.text.trim().isNotEmpty) {
      await repo.addCard(deckId, front.text, back.text);
    }
  }

  Future<bool> _confirm(BuildContext context, String msg) async {
    final res = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Text(msg),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Nein')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Ja')),
        ],
      ),
    );
    return res ?? false;
  }
}
