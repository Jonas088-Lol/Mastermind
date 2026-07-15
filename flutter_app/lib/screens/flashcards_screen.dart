/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/flashcard_repository.dart';
import '../theme.dart';
import '../widgets/offline_banner.dart';
import 'deck_screen.dart';

class FlashcardsScreen extends StatelessWidget {
  const FlashcardsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repo = context.watch<FlashcardRepository>();
    final decks = repo.decks;

    return Scaffold(
      appBar: AppBar(title: const Text('Karteikarten')),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: decks.isEmpty
                ? const Center(child: Text('Noch keine Decks — erstelle dein erstes.'))
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: decks.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final d = decks[i];
                      return Card(
                        child: ListTile(
                          leading: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              gradient: AppColors.brandGradient,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.style, color: AppColors.brandFg),
                          ),
                          title: Text(d.name,
                              style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('${d.cards.length} Karten'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => DeckScreen(deckId: d.id)),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _createDeckDialog(context, repo),
        icon: const Icon(Icons.add),
        label: const Text('Neues Deck'),
      ),
    );
  }

  Future<void> _createDeckDialog(BuildContext context, FlashcardRepository repo) async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Neues Deck'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Deck-Name'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Abbrechen')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Erstellen'),
          ),
        ],
      ),
    );
    if (name != null && name.isNotEmpty && context.mounted) {
      final deck = await repo.createDeck(name);
      if (context.mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => DeckScreen(deckId: deck.id)),
        );
      }
    }
  }
}
