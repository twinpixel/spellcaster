import 'package:flutter/services.dart';
import 'package:spellcaster_core/spellcaster_core.dart';

/// Bundled spell videos under [assetDir] named `{SpellId.name}.mp4`.
class SpellAnimationCatalog {
  SpellAnimationCatalog(this._assetPaths);

  static const assetDir = 'assets/spells';

  final Set<String> _assetPaths;

  static String assetPath(SpellId id) => '$assetDir/${id.name}.mp4';

  bool hasAnimation(SpellId id) => _assetPaths.contains(assetPath(id));

  Iterable<SpellId> get spellsWithAnimation sync* {
    for (final path in _assetPaths) {
      final id = _spellIdFromAsset(path);
      if (id != null) yield id;
    }
  }

  static SpellId? _spellIdFromAsset(String path) {
    if (!path.startsWith('$assetDir/') || !path.endsWith('.mp4')) {
      return null;
    }
    final name = path.substring(assetDir.length + 1, path.length - 4);
    try {
      return SpellId.values.byName(name);
    } on ArgumentError {
      return null;
    }
  }

  /// Loads which spell videos are present in the asset bundle.
  static Future<SpellAnimationCatalog> load() async {
    final manifest = await AssetManifest.loadFromAssetBundle(rootBundle);
    final paths = manifest
        .listAssets()
        .where((p) => p.startsWith('$assetDir/') && p.endsWith('.mp4'))
        .toSet();
    return SpellAnimationCatalog(paths);
  }
}
