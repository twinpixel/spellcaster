import 'package:flutter/material.dart';
import 'package:spellcaster_core/spellcaster_core.dart';
import 'package:video_player/video_player.dart';

import '../spell_animation_catalog.dart';

/// Full-screen overlay that plays spell videos when assets exist.
class SpellAnimationOverlay extends StatefulWidget {
  const SpellAnimationOverlay({
    super.key,
    required this.catalog,
  });

  final SpellAnimationCatalog catalog;

  @override
  SpellAnimationOverlayState createState() => SpellAnimationOverlayState();
}

class SpellAnimationOverlayState extends State<SpellAnimationOverlay> {
  final _queue = <SpellId>[];
  VideoPlayerController? _controller;
  SpellId? _playing;
  bool _visible = false;

  void enqueue(SpellId spell) {
    if (!widget.catalog.hasAnimation(spell)) return;
    _queue.add(spell);
    if (!_visible) _playNext();
  }

  void enqueueAll(Iterable<SpellId> spells) {
    for (final spell in spells) {
      enqueue(spell);
    }
  }

  Future<void> _playNext() async {
    if (_queue.isEmpty) {
      await _disposeController();
      if (mounted) setState(() => _visible = false);
      return;
    }

    final spell = _queue.removeAt(0);
    await _disposeController();

    final controller = VideoPlayerController.asset(
      SpellAnimationCatalog.assetPath(spell),
    );
    try {
      await controller.initialize();
    } catch (_) {
      controller.dispose();
      _playNext();
      return;
    }

    controller.addListener(_onTick);
    if (!mounted) {
      controller.dispose();
      return;
    }

    setState(() {
      _controller = controller;
      _playing = spell;
      _visible = true;
    });
    await controller.play();
  }

  void _onTick() {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;
    final pos = c.value.position;
    final dur = c.value.duration;
    if (dur > Duration.zero && pos >= dur - const Duration(milliseconds: 100)) {
      c.removeListener(_onTick);
      _playNext();
    }
  }

  Future<void> _disposeController() async {
    final c = _controller;
    _controller = null;
    _playing = null;
    if (c != null) {
      c.removeListener(_onTick);
      await c.dispose();
    }
  }

  void skip() {
    _controller?.pause();
    _playNext();
  }

  @override
  void dispose() {
    _disposeController();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_visible || _controller == null || !_controller!.value.isInitialized) {
      return const SizedBox.shrink();
    }

    final c = _controller!;
    final spell = _playing;

    return Positioned.fill(
      child: Material(
        color: Colors.black54,
        child: GestureDetector(
          onTap: skip,
          behavior: HitTestBehavior.opaque,
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (spell != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      spell.displayName,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ),
                AspectRatio(
                  aspectRatio: c.value.aspectRatio,
                  child: VideoPlayer(c),
                ),
                const SizedBox(height: 8),
                Text(
                  'Tocca per saltare',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.white70,
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
