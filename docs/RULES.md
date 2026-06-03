# Spellcaster (Waving Hands) — Regolamento ufficiale

Documento derivato da [Spellcaster.html](../Spellcaster.html) (Richard Bartle, *Duel Purpose* / Andrew Buchanan).  
Il motore di gioco in `packages/spellcaster_core` implementa queste regole; le costanti (`wizardMaxDamage`, durate, ecc.) sono in codice.

---

## Introduzione

Due maghi si sfidano in un duello di gesti magici. Ogni mago accumula una sequenza di gesti per mano per lanciare incantesimi; i mostri evocati attaccano secondo gli ordini del controllore.  
**Equipaggiamento:** foglio e penna (o client digitale) e un avversario. **Durata:** circa 15–30 minuti.

---

## Il turno

- Le azioni di maghi e mostri si scrivono **in segreto e simultaneamente**, poi si rivelano insieme e si risolvono come se fossero coincidenti.
- Eccezioni: invisibilità, time stop, ecc. (vedi incantesimi).
- In un turno ogni mago può: **gesto** (per parte di un incantesimo), **pugnalata (stab)**, o **nulla** per ogni mano.
- Entrambe le mani agiscono in modo indipendente o coordinato (es. **clap** `C` con entrambe).
- Solo i maghi fanno gesti e lanciano incantesimi; i mostri **non** fanno gesti.

---

## Gesti

| Sigla | Gesto |
|-------|--------|
| **F** | Dita |
| **P** | Palmo |
| **S** | Snap |
| **W** | Onda |
| **D** | Dito puntato |
| **C** | Battito di mani (clap) — **solo valido con entrambe le mani insieme** |
| **stab** | Pugnalata (un solo pugnale per mago per turno) |
| **(spazio)** | Nulla |

### Costruzione incantesimi

- Ogni incantesimo ha una **sequenza di gesti** (vedi elenco sotto).
- I gesti possono **sovrapporsi** tra più incantesimi sulla **stessa mano**, se:
  1. la sequenza resta corretta senza interruzioni;
  2. **al massimo un incantesimo** si completa per gesto;
  3. **tutti i gesti di un incantesimo** usano la **stessa mano**.
- Se un gesto può completare più incantesimi, il lanciatore **sceglie** quale.
- Gesti simultanei su entrambe le mani: notazione **(x** con lettera minuscola, es. **(w** = W con entrambe le mani.
- **C** con una sola mano equivale a **nulla** e **interrompe** la sequenza in corso su quella mano.
- **stab** e **nulla** interrompono la sequenza; non compaiono negli incantesimi.

### Bersaglio

- Ogni incantesimo/mostro ha un bersaglio (di default: avversario per danni, sé per protezione/evocazioni).
- Bersaglio non standard va dichiarato con i gesti.
- Bersaglio inesistente al momento del lancio → incantesimo perso.

### Cancellazioni simultanee

- Esempi: *Finger of death* vs *Raise dead* sullo stesso soggetto; calore vs freddo; incantesimi in contraddizione (*Amnesia* + *Confusion*, ecc.).
- Mostro creato e distrutto nello stesso turno → **attacca comunque** quel turno.
- *Remove enchantment* + *Fireball* su chi ha *Resist heat*: la resistenza viene rimossa **nello stesso turno** del fireball → subisce danno.

### Inizio partita

Il arbitro lancia su ogni mago **Dispel magic** poi **Anti-spell**, così nessuno inizia con sequenze o resistenze residue.

---

## Vittoria

- Ogni mago regge **14 punti di danno**; al **15°** muore.
- Morte simultanea → **pareggio** postumo.
- Danno cumulativo. Mostri morti non agiscono più.
- **Resa (Surrender):** **(p** = **P con entrambe le mani nello stesso turno** (non è un incantesimo). Chi si arrende perde salvo che i propri incantesimi simultanei uccidano l’avversario. Doppia resa → pareggio.

---

## Incantesimi — Protezione

### Shield — `P`
Protegge il soggetto per **quel turno** da mostri, missili e pugnalate. Uno shield copre tutti gli attacchi di quel tipo nel turno.

### Remove enchantment — `P-D-W-P`
- Termina **tutti** gli incantesimi della sezione *Enchantments* sul soggetto (anche quelli lanciati nello stesso turno, salvo effetti già applicati nel turno).
- Distrugge un mostro bersaglio (può attaccare quel turno).
- Su mago che crea un mostro nel turno: distrugge il mostro appena creato.

### Magic mirror — `C-(w`
Riflette verso il lanciatore gli incantesimi puntati al soggetto **quel turno** (es. missile, lightning). Non riflette mostri già esistenti né pugnalate. Nessun effetto se sul soggetto c’è *Counter-spell* o *Dispel magic*. Due mirror simultanei → un solo mirror.

### Counter-spell — `W-P-P` **oppure** `W-W-S`
Annulla qualsiasi altro incantesimo sul soggetto nel turno (non *Dispel magic* né *Finger of death*). Su incantesimi ad area, protegge solo il soggetto. Agisce anche come **Shield** sul gesto finale. Due counter-spell sullo stesso soggetto → effetto come uno solo.

### Dispel magic — `C-D-P-W`
Come counter-spell + remove enchantment ma **globale**: blocca tutti gli incantesimi del turno (due dispel si combinano), rimuove tutti gli enchantment, distrugge tutti i mostri (attaccano quel turno). Non ferma pugnalate/resa. Shield sul soggetto del dispel.

### Raise dead — `D-W-W-F-W-C`
Su cadavere recente o mostro morto: torna in vita, danno azzerato, rimuove malattie/veleni/enchantment. Agisce subito (anche combattere nel turno del lancio). Su vivente: come *Cure light wounds* per **5** punti (o meno se danno minore). Non bloccabile da counter-spell su cadavere; sì da dispel magic.

### Cure light wounds — `D-F-W`
Cura **1** punto di danno. Non rimosso da dispel/remove.

### Cure heavy wounds — `D-F-P-W`
Cura **2** punti (o 1 se ne aveva solo 1). Cura anche **Disease** (non veleno).

---

## Incantesimi — Evocazioni (Summons)

Comportamento comune: il mostro è controllato dal **soggetto** dell’incantesimo (o dal controllore del mostro se bersaglio è un mostro). Attacca subito; bersaglio dichiarato con i gesti. Non si può evocare su un elementale; bersaglio inesistente → nessun effetto.

| Incantesimo | Gesti | Danno inflitto / subito per uccidere |
|-------------|-------|--------------------------------------|
| Summon Goblin | S-F-W | 1 / 1 |
| Summon Ogre | P-S-F-W | 2 / 2 |
| Summon Troll | F-P-S-F-W | 3 / 3 |
| Summon Giant | W-F-P-S-F-W | 4 / 4 |

### Summon Elemental — `C-S-W-W-S`
Fuoco o ghiaccio (scelta del **soggetto** dopo aver visto i gesti del turno). Deve avere bersaglio vivente. **3** danni/turno a chi non resiste al tipo; **3** HP; ucciso da magia opposta, tempesta opposta, o due elementali opposti si annullano; due uguali si fondono. Non attacca nel turno in cui viene distrutto da magia/tempesta opposta. Non attacca chi ha shield-equivalent o resiste al tipo.

---

## Incantesimo — Danno

| Incantesimo | Gesti | Effetto |
|-------------|-------|---------|
| Missile | S-D | 1 danno; shield, counter, dispel; mirror riflette |
| Finger of death | P-W-P-F-S-S-S-D | Uccide; **non** counter-spell; dispel sul gesto finale lo ferma |
| Lightning bolt (lungo) | D-F-F-D-D | 5 danno; illimitato |
| Lightning bolt (corto) | W-D-D-C | 5 danno; **una volta per mago per battaglia** |
| Cause light wounds | W-F-P | 2 danno; cure light riduce a 1; no shield |
| Cause heavy wounds | W-P-F-D | 3 danno |
| Fireball | F-S-S-D-D | 5 se non resiste al fuoco; vs ice storm sul soggetto: neutro; distrugge ice elemental |
| Fire storm | S-W-W-C | 5 a tutti non resistenti al calore; annulla con ice storm/ice elemental |
| Ice storm | W-S-S-C | 5 a tutti non resistenti al freddo; annulla con fire storm/fire elemental; fireball locale si annulla |

---

## Incantesimi — Enchantments

**Gruppo incompatibile (stesso soggetto, stesso turno → nessuno funziona):** Amnesia, Confusion, Charm person, Charm monster, Paralysis, Fear.

| Incantesimo | Gesti | Effetto |
|-------------|-------|---------|
| Amnesia | D-P-P | Mago ripete **identici** gesti turno successivo (inclusi stab) |
| Confusion | D-S-F | Mago: dopo rivelazione, 2 dadi sostituiscono un gesto (1-3 mano sx, 4-6 dx; 1=C…6=W). Mostro: attacco casuale |
| Charm person | P-S-D-F | Umano: turno dopo, controllore sceglie gesto di una mano (**default: non può imporre nulla**; solo F/P/S/W/D o stab) |
| Charm monster | P-S-D-D | Mostro (non elementale): controllo al lanciatore da questo turno |
| Paralysis | F-F-F | Mago: una mano bloccata turno dopo (C→F, S→F, W→P per paralisi); mostro: non attacca turno dopo |
| Fear | S-W-D | Turno dopo: no C, D, F, S (solo maghi) |
| Anti-spell | S-P-F | Turno dopo: non può usare gesti di questo turno o precedenti nelle sequenze |
| Protection from evil | W-W-P | Shield-equivalent per **questo turno + 3 successivi** |
| Resist heat | W-W-F-P | Immune fuoco finché non remove/dispel; counter simultaneo impedisce; su fire elemental lo distrugge |
| Resist cold | S-S-F-P | Come resist heat per freddo |
| Disease | D-S-F-F-F-C | Muore dopo **6** turni; cura: remove, cure heavy, dispel |
| Poison | D-W-W-F-W-D | Come disease ma **cure heavy non cura** |
| Blindness | D-W-F-F-(d | 3 turni senza vedere gesti avversario; mostri accecati distrutti |
| Invisibility | P-P-(w-(s | 3 turni invisibile a avversario e suoi mostri; incantesimi visibili; mostro invisibile distrutto |
| Haste | P-W-P-W-W-C | 3 turni: doppia coppia di gesti dal turno dopo |
| Time stop | S-P-P-C | Turno extra immediato nascosto; nessuna resistenza per altri |
| Delayed effect | D-W-S-S-S-P | Prossimo incantesimo completato (entro 3 turni) «in banca» fino a scelta |
| Permanency | S-P-F-P-S-D-W | Prossimo enchantment idoneo (entro 3 turni) diventa permanente (esclusi anti-spell, disease, poison, time stop) |

---

## Non-incantesimi

### Surrender — `(p`
P-P simultaneo con entrambe le mani. Perdi salvo uccisione simultanea dell’avversario.

### Stab
1 danno a mostro o mago; bloccato da shield/protection; un solo stab per turno; non riflesso da mirror; non fermato da dispel (ma shield sì).

---

## Foglio di riferimento (ordine inverso)

Per verificare un incantesimo, leggi gli **ultimi gesti all’indietro** sulla mano:

```
C-D-D-W +     Lightning bolt (short, 1×/battaglia)    (p !          Surrender
D-D-S-P          Charm monster                        P-S-S-S-W-D     Finger of death
...
P                Shield
```

(`+` = lightning corto una volta per mago; `!` = non incantesimo)

---

## Note implementative (codice)

- Pattern in `SpellCatalog` / test in `packages/spellcaster_core/test/spells/`.
- Regenerare test: `dart run tools/generate_spell_tests.dart` dalla cartella core.
- **Charm person / nulla:** default `allowCharmNothing: false` (variante Brian Buchanan). Per la regola stampata con nulla ammesso: `POST /games` con `{ "allowCharmNothing": true }`; validazione gesto forzato nel turno con campo `charmForced` (es. `"F"`, `"stab"`, `" "` solo se consentito).
