/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'api_client.dart';

/// ID der Antwort-Aktion / -Kategorie (muss zur Server-`category` passen).
const String _replyActionId = 'REPLY';
const String _replyCategoryId = 'message_reply';

/// Push-Benachrichtigungen via FCM (Android) bzw. APNs (iOS).
///
/// Ankommende Pushes erscheinen automatisch auch auf gekoppelten
/// **Apple Watch / Wear-OS-Uhren**. Nachrichten enthalten eine **Antwort-Aktion**
/// mit Textfeld — im Vordergrund direkt hier verarbeitet; auf Sperrbildschirm/Uhr
/// zeigt das System das Antwortfeld über die Kategorie an (siehe README für die
/// native Anbindung der Remote-Antwort).
class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final _local = FlutterLocalNotificationsPlugin();
  bool _available = false;
  bool _initialized = false;

  bool get isAvailable => _available;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);
      await _initLocal();
      _available = true;

      FirebaseMessaging.onMessage.listen(_showForeground);
      FirebaseMessaging.instance.onTokenRefresh.listen(_registerToken);
    } catch (e) {
      _available = false;
      if (kDebugMode) {
        // ignore: avoid_print
        print('Push nicht verfügbar (Firebase nicht konfiguriert?): $e');
      }
    }
  }

  Future<void> _initLocal() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    // iOS: Kategorie mit Text-Antwort-Aktion registrieren (zeigt das Antwortfeld
    // auf iPhone-Sperrbildschirm und Apple Watch).
    final ios = DarwinInitializationSettings(
      notificationCategories: [
        DarwinNotificationCategory(
          _replyCategoryId,
          actions: [
            DarwinNotificationAction.text(
              _replyActionId,
              'Antworten',
              buttonTitle: 'Senden',
            ),
          ],
        ),
      ],
    );
    await _local.initialize(
      InitializationSettings(android: android, iOS: ios),
      onDidReceiveNotificationResponse: _onResponse,
    );
  }

  Future<void> registerForPush() async {
    if (!_available) return;
    final settings = await FirebaseMessaging.instance.requestPermission();
    if (settings.authorizationStatus == AuthorizationStatus.denied) return;
    final token = await FirebaseMessaging.instance.getToken();
    if (token != null) await _registerToken(token);
  }

  Future<void> _registerToken(String token) async {
    final platform = Platform.isIOS ? 'ios' : (Platform.isAndroid ? 'android' : 'native');
    try {
      await ApiClient.instance.registerPushToken(token, platform);
    } catch (_) {/* offline / nicht eingeloggt */}
  }

  void _showForeground(RemoteMessage message) {
    final n = message.notification;
    if (n == null) return;
    final threadId = message.data['threadId'];
    final isMessage = message.data['type'] == 'message' && threadId != null;

    _local.show(
      n.hashCode,
      n.title,
      n.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          'messages',
          'Nachrichten',
          channelDescription: 'Neue Nachrichten & Hinweise',
          importance: Importance.high,
          priority: Priority.high,
          actions: isMessage
              ? <AndroidNotificationAction>[
                  const AndroidNotificationAction(
                    _replyActionId,
                    'Antworten',
                    inputs: [AndroidNotificationActionInput(label: 'Antwort schreiben…')],
                    allowGeneratedReplies: true,
                  ),
                ]
              : null,
        ),
        iOS: DarwinNotificationDetails(
          categoryIdentifier: isMessage ? _replyCategoryId : null,
        ),
      ),
      payload: threadId,
    );
  }

  /// Antwort aus der Benachrichtigung → an den Server schicken.
  void _onResponse(NotificationResponse response) {
    if (response.actionId != _replyActionId) return;
    final threadId = response.payload;
    final text = response.input?.trim();
    if (threadId == null || text == null || text.isEmpty) return;
    ApiClient.instance.replyToThread(threadId, text);
  }
}

/// Hintergrund-Handler (App geschlossen/Hintergrund). Muss eine Top-Level- oder
/// static-Funktion sein und in main() registriert werden:
///   FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);
@pragma('vm:entry-point')
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {
  // Das System zeigt die Push-Benachrichtigung (inkl. Uhr) automatisch an.
  // Hier ist kein UI-Code nötig; die Remote-Antwort wird nativ verarbeitet.
}
