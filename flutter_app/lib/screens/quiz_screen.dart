/* Copyright 2026 Elian Schock, Jonas Schwenk */
import 'package:flutter/material.dart';

import '../models/exercise.dart';
import '../theme.dart';

/// Offline-Quiz für ein Thema. Unterstützt mc/blitz, true_false und fill_blank.
/// Andere Typen werden übersprungen (Hinweis).
class QuizScreen extends StatefulWidget {
  final ExerciseTopic topic;
  const QuizScreen({super.key, required this.topic});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  int _index = 0;
  int _correct = 0;
  bool _answered = false;
  bool _wasCorrect = false;
  String? _selected;
  final _textController = TextEditingController();

  List<ExerciseQuestion> get _questions => widget.topic.questions;
  ExerciseQuestion get _q => _questions[_index];

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  void _submit(String answer) {
    if (_answered) return;
    setState(() {
      _answered = true;
      _selected = answer;
      _wasCorrect = _q.check(answer);
      if (_wasCorrect) _correct++;
    });
  }

  void _next() {
    if (_index + 1 >= _questions.length) {
      _showResult();
      return;
    }
    setState(() {
      _index++;
      _answered = false;
      _selected = null;
      _wasCorrect = false;
      _textController.clear();
    });
  }

  void _showResult() {
    final pct = _questions.isEmpty ? 0 : ((_correct / _questions.length) * 100).round();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ergebnis'),
        content: Text('$_correct von ${_questions.length} richtig ($pct %)'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop();
            },
            child: const Text('Fertig'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_questions.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.topic.title)),
        body: const Center(child: Text('Keine Fragen in diesem Thema.')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(widget.topic.title)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LinearProgressIndicator(
              value: (_index + 1) / _questions.length,
              backgroundColor: Colors.black12,
            ),
            const SizedBox(height: 8),
            Text('Frage ${_index + 1} von ${_questions.length}',
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(_q.question,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(height: 16),
            Expanded(child: SingleChildScrollView(child: _buildAnswerArea())),
            if (_answered) ...[
              _feedback(),
              const SizedBox(height: 12),
              GradientButton(
                label: _index + 1 >= _questions.length ? 'Ergebnis anzeigen' : 'Weiter',
                onPressed: _next,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAnswerArea() {
    switch (_q.type) {
      case 'mc':
      case 'blitz':
        final opts = _q.optionList;
        return Column(
          children: [
            for (var i = 0; i < opts.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _optionTile(label: opts[i], value: i.toString()),
              ),
          ],
        );
      case 'true_false':
        return Row(
          children: [
            Expanded(child: _optionTile(label: 'Wahr', value: 'true')),
            const SizedBox(width: 10),
            Expanded(child: _optionTile(label: 'Falsch', value: 'false')),
          ],
        );
      case 'fill_blank':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _textController,
              enabled: !_answered,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'Antwort eingeben…',
              ),
              onSubmitted: _submit,
            ),
            const SizedBox(height: 10),
            if (!_answered)
              GradientButton(
                label: 'Prüfen',
                onPressed: () => _submit(_textController.text),
              ),
          ],
        );
      default:
        return Padding(
          padding: const EdgeInsets.all(8),
          child: Text('Fragetyp „${_q.type}“ wird in der App noch nicht unterstützt.'),
        );
    }
  }

  Widget _optionTile({required String label, required String value}) {
    Color? bg;
    if (_answered) {
      final isCorrect = _q.check(value);
      if (isCorrect) {
        bg = Colors.green.withValues(alpha: 0.15);
      } else if (_selected == value) {
        bg = Colors.red.withValues(alpha: 0.15);
      }
    }
    return Material(
      color: bg ?? Theme.of(context).colorScheme.surface,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: Theme.of(context).dividerColor),
        borderRadius: BorderRadius.circular(14),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: _answered ? null : () => _submit(value),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Text(label, style: const TextStyle(fontSize: 15)),
        ),
      ),
    );
  }

  Widget _feedback() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: (_wasCorrect ? Colors.green : Colors.red).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_wasCorrect ? 'Richtig!' : 'Falsch',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: _wasCorrect ? Colors.green : Colors.red)),
          if (_q.explanation != null && _q.explanation!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(_q.explanation!, style: Theme.of(context).textTheme.bodySmall),
          ],
        ],
      ),
    );
  }
}
