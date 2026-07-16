/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';

import 'screens/app_shell.dart';
import 'theme.dart';

class MasterMindApp extends StatelessWidget {
  const MasterMindApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Native App mit perfektem Handy-Design: Übungen & Karteikarten komplett
    // offline. Die vollständige Online-App (Login, Demo-Accounts, KI, Nachrichten)
    // ist über den Profil-Tab erreichbar.
    return MaterialApp(
      title: 'MasterMind',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      home: const AppShell(),
    );
  }
}
