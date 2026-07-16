/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../services/api_client.dart';
import '../theme.dart';
import 'app_shell.dart';

/// Zeigt die **echte MasterMind-Web-App** in der App:
/// normale Login-Seite → Demo-Accounts → kompletter Funktionsumfang.
/// Bei fehlender Verbindung erscheint ein Fallback mit Offline-Übungen/Karten.
class WebAppScreen extends StatefulWidget {
  const WebAppScreen({super.key});

  @override
  State<WebAppScreen> createState() => _WebAppScreenState();
}

class _WebAppScreenState extends State<WebAppScreen> {
  late final WebViewController _controller;
  int _progress = 0;
  bool _error = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFEDF6FF))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (p) => setState(() => _progress = p),
          onPageStarted: (_) => setState(() {
            _error = false;
            _progress = 0;
          }),
          onPageFinished: (_) => setState(() => _progress = 100),
          onWebResourceError: (err) {
            // Nur echte Seiten-Fehler (Hauptframe) als offline werten.
            if (err.isForMainFrame ?? true) {
              setState(() => _error = true);
            }
          },
        ),
      )
      ..loadRequest(Uri.parse('${ApiClient.baseUrl}/login'));
  }

  Future<void> _reload() async {
    setState(() => _error = false);
    await _controller.loadRequest(Uri.parse('${ApiClient.baseUrl}/login'));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          _controller.goBack();
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: _error
              ? _OfflineFallback(onRetry: _reload)
              : Stack(
                  children: [
                    WebViewWidget(controller: _controller),
                    if (_progress < 100)
                      LinearProgressIndicator(
                        value: _progress / 100,
                        minHeight: 3,
                        backgroundColor: Colors.transparent,
                      ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _OfflineFallback extends StatelessWidget {
  final VoidCallback onRetry;
  const _OfflineFallback({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off, size: 56, color: Colors.orange),
            const SizedBox(height: 16),
            Text('Kein Internet',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text(
              'Die App braucht Internet für Login, KI, Nachrichten & Co. '
              'Übungen und Karteikarten kannst du auch offline nutzen.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.outline,
                  ),
            ),
            const SizedBox(height: 24),
            GradientButton(
              label: 'Offline: Übungen & Karteikarten',
              icon: Icons.school,
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const AppShell()),
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Erneut versuchen'),
            ),
          ],
        ),
      ),
    );
  }
}
