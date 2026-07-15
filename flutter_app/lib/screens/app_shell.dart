/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';

import 'flashcards_screen.dart';
import 'home_screen.dart';
import 'profile_screen.dart';
import 'subjects_screen.dart';

/// Haupt-Navigationsgerüst mit Bottom-Tabs. Funktioniert offline wie online —
/// Online-Features (Profil/Login, Sync) sind je nach Verbindung aktiv.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  void _go(int i) => setState(() => _index = i);

  @override
  Widget build(BuildContext context) {
    final tabs = [
      HomeScreen(onNavigate: _go),
      const SubjectsScreen(),
      const FlashcardsScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _go,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Start'),
          NavigationDestination(icon: Icon(Icons.school_outlined), selectedIcon: Icon(Icons.school), label: 'Übungen'),
          NavigationDestination(icon: Icon(Icons.style_outlined), selectedIcon: Icon(Icons.style), label: 'Karten'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}
