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

/// Eine Funktion der App im Menü.
class _Feature {
  final IconData icon;
  final String title;
  final String route; // Pfad in der Web-App (online)
  const _Feature(this.icon, this.title, this.route);
}

/// Alle Funktionen der App — offline sichtbar, aber gesperrt (außer Übungen &
/// Karteikarten, die nativ offline laufen).
const List<_Feature> _onlineFeatures = [
  _Feature(Icons.smart_toy, 'KI-Tutor', '/app/ki'),
  _Feature(Icons.chat_bubble, 'Nachrichten', '/app/nachrichten'),
  _Feature(Icons.grade, 'Noten', '/app/noten'),
  _Feature(Icons.calendar_month, 'Stundenplan', '/app/stundenplan'),
  _Feature(Icons.assignment, 'Hausaufgaben', '/app/hausaufgaben'),
  _Feature(Icons.task_alt, 'Aufgaben', '/app/aufgaben'),
  _Feature(Icons.translate, 'Vokabeln', '/app/vokabeln'),
  _Feature(Icons.menu_book, 'Hefte', '/app/heft'),
  _Feature(Icons.leaderboard, 'Ranking', '/app/ranking'),
  _Feature(Icons.emoji_events, 'Erfolge', '/app/erfolge'),
  _Feature(Icons.local_fire_department, 'Streaks', '/app/streaks'),
  _Feature(Icons.shield, 'Boss-Battle', '/app/boss'),
  _Feature(Icons.shopping_bag, 'Shop', '/app/shop'),
  _Feature(Icons.people, 'Community', '/app/community'),
];

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

    void openWeb(String path) {
      if (!(online && canWeb)) return;
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => WebAppScreen(path: path)),
      );
    }

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
                  Text(
                    online
                        ? 'Alle Funktionen verfügbar.'
                        : 'Offline — Übungen & Karteikarten funktionieren weiter.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.outline,
                        ),
                  ),
                  const SizedBox(height: 20),

                  // ── Offline nutzbar ──────────────────────────────────────
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
                  const SizedBox(height: 12),
                  _BigTile(
                    icon: Icons.login,
                    title: 'Anmelden & volle App',
                    subtitle: online ? 'Demo-Accounts & alle Funktionen' : 'Braucht Internet',
                    enabled: online && canWeb,
                    onTap: () => openWeb('/login'),
                  ),

                  // ── Alle weiteren Funktionen ─────────────────────────────
                  const SizedBox(height: 28),
                  Row(
                    children: [
                      Text('Alle Funktionen',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.outline,
                              )),
                      const Spacer(),
                      if (!online)
                        Text('offline gesperrt',
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: Colors.orange,
                                )),
                    ],
                  ),
                  const SizedBox(height: 10),
                  GridView.count(
                    crossAxisCount: 3,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 0.95,
                    children: _onlineFeatures
                        .map((f) => _FeatureTile(
                              feature: f,
                              enabled: online && canWeb,
                              onTap: () => openWeb(f.route),
                            ))
                        .toList(),
                  ),
                  const SizedBox(height: 16),
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

class _FeatureTile extends StatelessWidget {
  final _Feature feature;
  final bool enabled;
  final VoidCallback onTap;

  const _FeatureTile({required this.feature, required this.enabled, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.45,
      child: Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: enabled ? onTap : null,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    BrandIconBadge(feature.icon, size: 42),
                    if (!enabled)
                      Positioned(
                        right: -4,
                        bottom: -4,
                        child: Container(
                          padding: const EdgeInsets.all(3),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.lock, size: 12, color: Colors.orange),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(feature.title,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ),
      ),
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
          onTap: enabled ? onTap : null,
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
