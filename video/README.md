# Clip video degli incantesimi

Nome file = titolo in `docs/SPELL_VIDEO_PROMPTS.md`, tutto minuscolo, spazi → trattini.

Esempi: `shield.mp4`, `fireball.mp4`, `summon-goblin.mp4`, `counter-spell.mp4`, `elemental-fire.mp4`

Il build (`npm run build`) copia questa cartella in `client/video/` per il deploy statico.
Se manca un file, il client salta quel clip senza errori.
