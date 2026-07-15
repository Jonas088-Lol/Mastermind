/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../services/connectivity_service.dart';
import '../services/content_sync.dart';
import '../theme.dart';
import '../widgets/offline_banner.dart';
import 'login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final online = context.watch<ConnectivityService>().isOnline;

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
                      Text(
                        auth.isLoggedIn ? (auth.userName ?? 'Angemeldet') : 'Nicht angemeldet',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(online ? Icons.cloud_done : Icons.cloud_off,
                              size: 14,
                              color: online ? Colors.green : Colors.orange),
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
        const SizedBox(height: 16),
        if (!auth.isLoggedIn)
          GradientButton(
            label: 'Anmelden',
            icon: Icons.login,
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            ),
          )
        else
          OutlinedButton.icon(
            onPressed: () => auth.logout(),
            icon: const Icon(Icons.logout),
            label: const Text('Abmelden'),
          ),
        const SizedBox(height: 24),
        Text('Inhalte',
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.outline,
                )),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: const Icon(Icons.sync),
            title: const Text('Übungen aktualisieren'),
            subtitle: Text(online
                ? 'Neueste Inhalte vom Server laden (für offline)'
                : 'Nur mit Internet verfügbar'),
            trailing: const Icon(Icons.chevron_right),
            enabled: online,
            onTap: online
                ? () async {
                    final sync = context.read<ContentSync>();
                    final ok = await sync.refreshFromServer();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(ok
                              ? 'Inhalte aktualisiert.'
                              : 'Aktualisierung fehlgeschlagen.'),
                        ),
                      );
                    }
                  }
                : null,
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
