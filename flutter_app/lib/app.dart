/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'dart:io' show Platform;

import 'package:flutter/material.dart';

import 'screens/app_shell.dart';
import 'screens/web_app_screen.dart';
import 'theme.dart';

class MasterMindApp extends StatelessWidget {
  const MasterMindApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Handy: IMMER die echte Web-App zeigen — online wie offline. Offline
    // liefert der Service-Worker (public/sw.js) die gecachten Seiten aus, damit
    // die App exakt gleich aussieht. Kein Umschalten auf eine andere Oberfläche.
    // Desktop: WebView wird dort nicht unterstützt → natives Gerüst.
    final bool useWebApp = Platform.isAndroid || Platform.isIOS;

    return MaterialApp(
      title: 'MasterMind',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      home: useWebApp ? const WebAppScreen(path: '/login') : const AppShell(),
    );
  }
}
