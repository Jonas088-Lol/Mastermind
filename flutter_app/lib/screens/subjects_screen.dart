/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/exercise_repository.dart';
import '../theme.dart';
import '../widgets/offline_banner.dart';
import 'grades_screen.dart';

class SubjectsScreen extends StatelessWidget {
  const SubjectsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ExerciseRepository>();
    final counts = repo.subjectCounts();
    final subjects = counts.keys.toList()..sort();

    return Scaffold(
      appBar: AppBar(title: const Text('Übungen')),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: subjects.isEmpty
                ? const Center(child: Text('Keine Übungsinhalte gebündelt.'))
                : GridView.count(
                    crossAxisCount: 2,
                    padding: const EdgeInsets.all(16),
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.3,
                    children: subjects.map((s) {
                      return _SubjectCard(
                        label: subjectLabel(s),
                        count: counts[s] ?? 0,
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => GradesScreen(subject: s)),
                        ),
                      );
                    }).toList(),
                  ),
          ),
        ],
      ),
    );
  }
}

class _SubjectCard extends StatelessWidget {
  final String label;
  final int count;
  final VoidCallback onTap;

  const _SubjectCard({required this.label, required this.count, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  gradient: AppColors.brandGradient,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.menu_book, color: AppColors.brandFg),
              ),
              const SizedBox(height: 10),
              Text(label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              Text('$count Themen',
                  style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}
