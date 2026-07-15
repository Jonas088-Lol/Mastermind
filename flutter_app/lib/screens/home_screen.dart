/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/exercise_repository.dart';
import '../data/flashcard_repository.dart';
import '../services/auth_service.dart';
import '../services/connectivity_service.dart';
import '../theme.dart';
import '../widgets/offline_banner.dart';

/// Start-Dashboard. `onNavigate` wechselt die Bottom-Tabs (0..3).
class HomeScreen extends StatelessWidget {
  final ValueChanged<int> onNavigate;
  const HomeScreen({super.key, required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    final online = context.watch<ConnectivityService>().isOnline;
    final auth = context.watch<AuthService>();
    final exercises = context.read<ExerciseRepository>();
    final decks = context.watch<FlashcardRepository>().decks;
    final topicCount = exercises.topics.length;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Header
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
                  Text(
                    auth.isLoggedIn ? 'Hallo, ${auth.userName ?? 'zurück'} 👋' : 'Willkommen 👋',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Lernen — jederzeit, auch offline.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.outline,
                        ),
                  ),
                  const SizedBox(height: 20),

                  // Große Kacheln (offline)
                  _BigTile(
                    icon: Icons.school,
                    title: 'Übungen',
                    subtitle: '$topicCount Themen · offline verfügbar',
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
                  Text('Online-Features',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.outline,
                          )),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _SmallTile(
                          icon: Icons.smart_toy,
                          label: 'KI-Tutor',
                          enabled: online,
                          onTap: () => _online(context),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _SmallTile(
                          icon: Icons.leaderboard,
                          label: 'Ranking',
                          enabled: online,
                          onTap: () => _online(context),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (!auth.isLoggedIn)
                    _SmallTile(
                      icon: Icons.login,
                      label: 'Anmelden für mehr Features',
                      enabled: online,
                      wide: true,
                      onTap: () => onNavigate(3),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _online(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Online-Feature — Anbindung folgt.')),
    );
  }
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
  final VoidCallback onTap;

  const _BigTile({
    required this.icon,
    required this.title,
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
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}

class _SmallTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool enabled;
  final bool wide;
  final VoidCallback onTap;

  const _SmallTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.enabled = true,
    this.wide = false,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: enabled ? onTap : null,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              mainAxisAlignment: wide ? MainAxisAlignment.start : MainAxisAlignment.center,
              children: [
                Icon(icon, size: 20, color: AppColors.brandStrong),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(label,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                      overflow: TextOverflow.ellipsis),
                ),
                if (!enabled) ...[
                  const SizedBox(width: 6),
                  const Icon(Icons.lock_outline, size: 14),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
