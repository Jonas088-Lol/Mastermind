/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/exercise_repository.dart';
import '../theme.dart';
import '../widgets/offline_banner.dart';
import 'grades_screen.dart';

/// Material-Icon je Fach für ein sauberes, einheitliches Grid.
const Map<String, IconData> kSubjectIcons = {
  'mathematik': Icons.calculate,
  'deutsch': Icons.menu_book,
  'englisch': Icons.language,
  'franzoesisch': Icons.language,
  'latein': Icons.account_balance,
  'spanisch': Icons.language,
  'physik': Icons.bolt,
  'chemie': Icons.science,
  'biologie': Icons.eco,
  'geschichte': Icons.account_balance,
  'erdkunde': Icons.public,
  'geografie': Icons.public,
  'informatik': Icons.memory,
  'wirtschaft': Icons.trending_up,
  'musik': Icons.music_note,
  'kunst': Icons.palette,
  'sport': Icons.fitness_center,
  'ethik': Icons.balance,
  'sachkunde': Icons.spa,
  'technik': Icons.build,
  'philosophie': Icons.psychology_alt,
  'psychologie': Icons.psychology,
};

class SubjectsScreen extends StatelessWidget {
  const SubjectsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final subjects = context.read<ExerciseRepository>().subjects;

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
                    childAspectRatio: 1.15,
                    children: subjects.map((s) {
                      return _SubjectCard(
                        icon: kSubjectIcons[s.key] ?? Icons.school,
                        label: subjectLabel(s.key),
                        subtitle: '${s.topicCount} Themen · ${_fmt(s.questionCount)} Fragen',
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => GradesScreen(subject: s.key)),
                        ),
                      );
                    }).toList(),
                  ),
          ),
        ],
      ),
    );
  }

  static String _fmt(int n) => n >= 1000 ? '${(n / 1000).toStringAsFixed(n >= 10000 ? 0 : 1)}k' : '$n';
}

class _SubjectCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  const _SubjectCard({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              BrandIconBadge(icon, size: 56),
              const SizedBox(height: 12),
              Text(label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 2),
              Text(subtitle,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.outline,
                      )),
            ],
          ),
        ),
      ),
    );
  }
}
