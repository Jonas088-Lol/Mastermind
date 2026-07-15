/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';

import 'screens/app_shell.dart';
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
      home: const AppShell(),
    );
  }
}
