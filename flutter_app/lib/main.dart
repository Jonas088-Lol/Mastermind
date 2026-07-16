/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'data/exercise_repository.dart';
import 'data/flashcard_repository.dart';
import 'data/local_store.dart';
import 'services/auth_service.dart';
import 'services/connectivity_service.dart';
import 'services/content_sync.dart';
import 'services/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lokale Speicherung (Hive) — Karteikarten & Fortschritt (offline).
  await LocalStore.init();

  // Übungsinhalte: gecachter Online-Stand oder gebündeltes Asset (offline).
  final exerciseRepo = ExerciseRepository();
  final contentSync = ContentSync(exerciseRepo);
  await contentSync.loadInitial();

  final flashcardRepo = FlashcardRepository();
  await flashcardRepo.load();

  final connectivity = ConnectivityService();
  await connectivity.start();

  final auth = AuthService();
  await auth.restore();

  // Push-Benachrichtigungen initialisieren (still deaktiviert, falls Firebase
  // noch nicht konfiguriert ist). Bereits angemeldet → Token registrieren.
  await NotificationService.instance.init();
  if (auth.isLoggedIn) {
    NotificationService.instance.registerForPush();
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: connectivity),
        ChangeNotifierProvider.value(value: auth),
        ChangeNotifierProvider.value(value: flashcardRepo),
        Provider.value(value: exerciseRepo),
        Provider.value(value: contentSync),
      ],
      child: const MasterMindApp(),
    ),
  );
}
