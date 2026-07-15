/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// Beobachtet die Netzverbindung. Steuert, ob Online-Features (KI, Uploads,
/// Chat, Ranking, Login) verfügbar sind. Offline sind nur Übungen & Karteikarten
/// nutzbar.
class ConnectivityService extends ChangeNotifier {
  bool _online = true;
  StreamSubscription<List<ConnectivityResult>>? _sub;

  bool get isOnline => _online;

  Future<void> start() async {
    final initial = await Connectivity().checkConnectivity();
    _apply(initial);
    _sub = Connectivity().onConnectivityChanged.listen(_apply);
  }

  void _apply(List<ConnectivityResult> results) {
    final online = results.any((r) => r != ConnectivityResult.none);
    if (online != _online) {
      _online = online;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}
