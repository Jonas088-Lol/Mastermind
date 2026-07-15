/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'api_client.dart';
import 'notification_service.dart';

/// Verwaltet den Login-Status. Login/Logout brauchen Internet; der gespeicherte
/// Name bleibt aber auch offline sichtbar (Anzeige), echte Server-Aktionen sind
/// offline gesperrt.
class AuthService extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  String? _userName;
  bool _loggedIn = false;

  bool get isLoggedIn => _loggedIn;
  String? get userName => _userName;

  Future<void> restore() async {
    final token = await _storage.read(key: 'session');
    _userName = await _storage.read(key: 'user_name');
    _loggedIn = token != null;
    notifyListeners();
  }

  /// Login gegen die Web-API. Wirft bei Fehler (falsche Daten/kein Netz).
  Future<void> login(String email, String password) async {
    final res = await ApiClient.instance.login(email, password);
    // Erwartet: Set-Cookie oder { token, name } — je nach Web-API anpassen.
    final data = res.data;
    String? token;
    String? name;
    if (data is Map) {
      token = data['token']?.toString();
      name = data['name']?.toString();
    }
    // Fallback: Session-Cookie aus dem Response-Header ziehen.
    token ??= _extractSessionCookie(res.headers.map['set-cookie']);
    if (token == null) {
      throw Exception('Login fehlgeschlagen — keine Session erhalten.');
    }
    await ApiClient.instance.saveSessionToken(token);
    if (name != null) await _storage.write(key: 'user_name', value: name);
    _userName = name ?? email;
    _loggedIn = true;
    notifyListeners();

    // Jetzt für Push registrieren (Token an den Server), damit dieser Nutzer
    // Benachrichtigungen (auch auf der Smartwatch) erhält.
    NotificationService.instance.registerForPush();
  }

  Future<void> logout() async {
    await ApiClient.instance.clearSession();
    await _storage.delete(key: 'user_name');
    _userName = null;
    _loggedIn = false;
    notifyListeners();
  }

  String? _extractSessionCookie(List<String>? setCookie) {
    if (setCookie == null) return null;
    for (final c in setCookie) {
      final match = RegExp(r'mm_session=([^;]+)').firstMatch(c);
      if (match != null) return match.group(1);
    }
    return null;
  }
}
