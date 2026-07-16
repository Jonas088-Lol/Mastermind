/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/exercise_repository.dart';
import '../models/exercise.dart';
import '../theme.dart';
import 'quiz_screen.dart';

class TopicsScreen extends StatelessWidget {
  final String subject;
  final int grade;
  const TopicsScreen({super.key, required this.subject, required this.grade});

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ExerciseRepository>();

    return Scaffold(
      appBar: AppBar(title: Text('${subjectLabel(subject)} · Klasse $grade')),
      body: FutureBuilder<List<ExerciseTopic>>(
        future: repo.topicsFor(subject, grade),
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          final topics = snap.data ?? const [];
          if (topics.isEmpty) {
            return const Center(child: Text('Keine Themen vorhanden.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: topics.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final ExerciseTopic t = topics[i];
              return Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  leading: const BrandIconBadge(Icons.quiz, size: 42),
                  title: Text(t.title,
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('${t.questions.length} Fragen'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => QuizScreen(topic: t)),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
