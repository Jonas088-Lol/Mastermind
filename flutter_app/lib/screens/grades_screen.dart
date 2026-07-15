/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/exercise_repository.dart';
import 'topics_screen.dart';

class GradesScreen extends StatelessWidget {
  final String subject;
  const GradesScreen({super.key, required this.subject});

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ExerciseRepository>();
    final grades = repo.gradesFor(subject);

    return Scaffold(
      appBar: AppBar(title: Text(subjectLabel(subject))),
      body: grades.isEmpty
          ? const Center(child: Text('Keine Klassenstufen vorhanden.'))
          : GridView.count(
              crossAxisCount: 4,
              padding: const EdgeInsets.all(16),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              children: grades.map((g) {
                return InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => TopicsScreen(subject: subject, grade: g),
                    ),
                  ),
                  child: Card(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text('$g',
                              style: const TextStyle(
                                  fontSize: 22, fontWeight: FontWeight.bold)),
                          const Text('Klasse', style: TextStyle(fontSize: 10)),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
    );
  }
}
