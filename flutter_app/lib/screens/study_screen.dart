/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/flashcard_repository.dart';
import '../models/flashcard.dart';
import '../theme.dart';

/// Einfache Lern-Session (Spaced Repetition, SM-2) — offline.
class StudyScreen extends StatefulWidget {
  final String deckId;
  const StudyScreen({super.key, required this.deckId});

  @override
  State<StudyScreen> createState() => _StudyScreenState();
}

class _StudyScreenState extends State<StudyScreen> {
  late List<Flashcard> _queue;
  int _index = 0;
  bool _showBack = false;

  @override
  void initState() {
    super.initState();
    final repo = context.read<FlashcardRepository>();
    final due = repo.dueCards(widget.deckId);
    // Fallback: wenn nichts fällig ist, alle Karten üben.
    _queue = due.isNotEmpty ? due : List.of(repo.deckById(widget.deckId)?.cards ?? const []);
  }

  Future<void> _grade(int quality) async {
    final repo = context.read<FlashcardRepository>();
    await repo.reviewCard(widget.deckId, _queue[_index].id, quality);
    if (_index + 1 >= _queue.length) {
      if (mounted) Navigator.of(context).pop();
      return;
    }
    setState(() {
      _index++;
      _showBack = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_queue.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Lernen')),
        body: const Center(child: Text('Keine Karten zu lernen.')),
      );
    }
    final card = _queue[_index];

    return Scaffold(
      appBar: AppBar(title: Text('Karte ${_index + 1} / ${_queue.length}')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _showBack = !_showBack),
                child: Card(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _showBack ? card.back : card.front,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 16),
                          Text(_showBack ? 'Rückseite' : 'Tippen zum Umdrehen',
                              style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (!_showBack)
              GradientButton(
                label: 'Antwort zeigen',
                onPressed: () => setState(() => _showBack = true),
              )
            else
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _grade(1),
                      child: const Text('Nochmal'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _grade(3),
                      child: const Text('Ok'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => _grade(5),
                      child: const Text('Einfach'),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
