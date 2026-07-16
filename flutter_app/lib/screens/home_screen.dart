/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/exercise_repository.dart';
import '../data/flashcard_repository.dart';
import '../services/connectivity_service.dart';
import '../theme.dart';
import '../widgets/offline_banner.dart';
import 'web_app_screen.dart';

/// Start-Dashboard. `onNavigate` wechselt die Bottom-Tabs (0..3).
class HomeScreen extends StatelessWidget {
  final ValueChanged<int> onNavigate;
  const HomeScreen({super.key, required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    final online = context.watch<ConnectivityService>().isOnline;
    final subjects = context.read<ExerciseRepository>().subjects;
    final decks = context.watch<FlashcardRepository>().decks;
    final questionCount = subjects.fold<int>(0, (s, x) => s + x.questionCount);
    final canWeb = Platform.isAndroid || Platform.isIOS;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(
                    children: [
                      const BrandIconBadge(Icons.search, size: 40),
                      const SizedBox(width: 10),
                      const Text('MasterMind',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      const Spacer(),
                      _StatusPill(online: online),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text('Willkommen 👋',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          )),
                  const SizedBox(height: 4),
                  Text('Lernen — jederzeit, komplett offline.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.outline,
                          )),
                  const SizedBox(height: 20),

                  _BigTile(
                    icon: Icons.school,
                    title: 'Übungen',
                    subtitle: '${subjects.length} Fächer · ${_fmt(questionCount)} Fragen offline',
                    onTap: () => onNavigate(1),
                  ),
                  const SizedBox(height: 12),
                  _BigTile(
                    icon: Icons.style,
                    title: 'Karteikarten',
                    subtitle: decks.isEmpty
                        ? 'Erstelle dein erstes Deck'
                        : '${decks.length} Decks · offline gespeichert',
                    onTap: () => onNavigate(2),
                  ),

                  const SizedBox(height: 28),
                  Text('Online',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.outline,
                          )),
                  const SizedBox(height: 10),
                  _BigTile(
                    icon: Icons.login,
                    title: 'Anmelden & volle App',
                    subtitle: online
                        ? 'Demo-Accounts, KI-Tutor, Nachrichten & mehr'
                        : 'Offline nicht verfügbar',
                    enabled: online && canWeb,
                    onTap: (online && canWeb)
                        ? () => Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const WebAppScreen()),
                            )
                        : null,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _fmt(int n) => n >= 1000 ? '${(n / 1000).toStringAsFixed(n >= 10000 ? 0 : 1)}k' : '$n';
}

class _StatusPill extends StatelessWidget {
  final bool online;
  const _StatusPill({required this.online});

  @override
  Widget build(BuildContext context) {
    final color = online ? Colors.green : Colors.orange;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(online ? Icons.cloud_done : Icons.cloud_off, size: 14, color: color),
          const SizedBox(width: 5),
          Text(online ? 'Online' : 'Offline',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}

class _BigTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool enabled;
  final VoidCallback? onTap;

  const _BigTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.enabled = true,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                BrandIconBadge(icon, size: 52),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Text(subtitle,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context).colorScheme.outline,
                              )),
                    ],
                  ),
                ),
                Icon(enabled ? Icons.chevron_right : Icons.lock_outline),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
