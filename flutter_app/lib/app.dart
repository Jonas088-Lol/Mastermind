/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/app_shell.dart';
import 'screens/web_app_screen.dart';
import 'services/connectivity_service.dart';
import 'theme.dart';

class MasterMindApp extends StatelessWidget {
  const MasterMindApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MasterMind',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      home: const _RootGate(),
    );
  }
}

/// Entscheidet, was beim Start erscheint:
/// - **Online:** die echte App (normale Login-Seite → komplettes Menü, alles nutzbar).
/// - **Offline:** natives Menü, das ALLE Funktionen zeigt — Übungen & Karteikarten
///   funktionieren, alles Serverabhängige ist sichtbar, aber gesperrt.
class _RootGate extends StatelessWidget {
  const _RootGate();

  @override
  Widget build(BuildContext context) {
    final online = context.watch<ConnectivityService>().isOnline;
    final canWeb = Platform.isAndroid || Platform.isIOS;

    if (online && canWeb) return const WebAppScreen(path: '/login');
    return const AppShell();
  }
}
