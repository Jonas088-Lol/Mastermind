/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// HTTP-Client für ONLINE-Features (Login, KI-Tutor, Uploads, Chat, Ranking …).
///
/// Offline-Features (Übungen, Karteikarten) laufen komplett lokal und nutzen
/// diesen Client NICHT. Jeder Aufruf hier setzt eine bestehende Internet-
/// verbindung voraus (via ConnectivityService prüfen, bevor aufgerufen wird).
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  /// Server-Basis-URL — an eure Domain anpassen (z. B. per --dart-define).
  static const String baseUrl =
      String.fromEnvironment('MM_BASE_URL', defaultValue: 'https://konvertis.de');

  final _storage = const FlutterSecureStorage();
  late final Dio _dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
    ),
  )..interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'session');
          if (token != null) {
            options.headers['Cookie'] = 'mm_session=$token';
          }
          handler.next(options);
        },
      ),
    );

  /// Offline-Content nachladen (aktualisiert das gebündelte Asset zur Laufzeit).
  Future<Map<String, dynamic>> fetchExerciseContent() async {
    final res = await _dio.get<Map<String, dynamic>>('/api/offline/exercises');
    return res.data ?? const {};
  }

  // ── Nur online (bewusst nicht offline verfügbar) ──────────────────────────
  // Diese Methoden werfen, wenn kein Netz da ist — die UI blendet die Features
  // offline aus. Konkrete Endpunkte hier ergänzen, sobald die Web-API steht.

  Future<Response<dynamic>> login(String email, String password) {
    return _dio.post('/api/auth/login', data: {'email': email, 'password': password});
  }

  Future<void> saveSessionToken(String token) =>
      _storage.write(key: 'session', value: token);

  Future<void> clearSession() => _storage.delete(key: 'session');

  /// Registriert den FCM/APNs-Token beim Server (`/api/push/native-token`),
  /// damit dieser Nutzer Push-Benachrichtigungen erhält.
  Future<void> registerPushToken(String token, String platform) async {
    await _dio.post('/api/push/native-token', data: {
      'token': token,
      'platform': platform,
    });
  }

  /// Antwortet direkt auf einen Nachrichten-Thread (z. B. aus der Benachrichtigung
  /// oder von der Apple Watch).
  Future<void> replyToThread(String threadId, String content) async {
    await _dio.post('/api/messages/reply', data: {
      'threadId': threadId,
      'content': content,
    });
  }
}
