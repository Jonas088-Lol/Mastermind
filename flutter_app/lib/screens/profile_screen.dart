/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/connectivity_service.dart';
import '../theme.dart';
import '../widgets/offline_banner.dart';
import 'web_app_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final online = context.watch<ConnectivityService>().isOnline;
    final canWeb = Platform.isAndroid || Platform.isIOS;

    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      children: [
                        const BrandIconBadge(Icons.person, size: 56),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('MasterMind',
                                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(online ? Icons.cloud_done : Icons.cloud_off,
                                      size: 14, color: online ? Colors.green : Colors.orange),
                                  const SizedBox(width: 4),
                                  Text(online ? 'Online' : 'Offline',
                                      style: Theme.of(context).textTheme.bodySmall),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                Text('Vollständige App',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.outline,
                        )),
                const SizedBox(height: 8),
                Text(
                  'Anmelden (auch Demo-Accounts), KI-Tutor, Nachrichten, Ranking und '
                  'alle weiteren Funktionen — wie auf der Website.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.outline,
                      ),
                ),
                const SizedBox(height: 12),
                GradientButton(
                  label: 'Anmelden & volle App öffnen',
                  icon: Icons.login,
                  onPressed: (online && canWeb)
                      ? () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const WebAppScreen()),
                          )
                      : null,
                ),
                if (!online) ...[
                  const SizedBox(height: 8),
                  Text('Dafür brauchst du eine Internetverbindung.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.outline,
                          )),
                ],

                const SizedBox(height: 28),
                Text('Offline verfügbar',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.outline,
                        )),
                const SizedBox(height: 8),
                const Card(
                  child: ListTile(
                    leading: Icon(Icons.check_circle, color: Colors.green),
                    title: Text('Alle Übungen & Karteikarten'),
                    subtitle: Text('Komplett offline nutzbar — kein Internet nötig.'),
                  ),
                ),

                const SizedBox(height: 24),
                Center(
                  child: Text('MasterMind · offline & online',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.outline,
                          )),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
