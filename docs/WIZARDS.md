# I maghi avversari e le loro fasce

Il computer non gioca sempre allo stesso modo: scegli **chi** vuoi sfidare e con
lui scegli **quanto forte** gioca. I 25 maghi sono divisi in 4 fasce, e
l'assegnazione segue quanto sono potenti nelle rispettive storie.

Il roster e le fasce stanno in [`client/ai.js`](../client/ai.js) (`AI_TIERS`).

---

## ✦ Apprendista — livello 1

*Gesti confusi, incantesimi lasciati a metà.*

Quasi metà dei turni sono sprecati, non guarda cosa stai preparando e conosce
solo cinque incantesimi elementari.

| Mago | Perché è qui |
|------|--------------|
| Caspar, Melchior, Balthazar | I Re Magi: astronomi e portatori di doni, non incantatori da duello |
| Alatar, Pallando | Gli Stregoni Blu: spariti a est, missione fallita, poteri mai mostrati |
| Radagast | Il più debole degli Istari: parla con le bestie, non combatte |

## ✦✦ Adepto — livello 2

*Completa gli incantesimi semplici e si difende.*

Usa il cervello vero ma con un repertorio ridotto (missile, scudo, cure, goblin,
ferite leggere, paura) e sbaglia un turno su quattro. Non legge i tuoi gesti.

| Mago | Perché è qui |
|------|--------------|
| Rasputin | Fama di mistico più che poteri provati |
| Glinda | Strega Buona del Sud: potente, ma gentile |
| Oberon, Titania | Sovrani delle fate: magia di natura e illusione, non di studio |
| Viviana, Nimue | Le Dame del Lago: astute più che potenti, allieve di Merlino |

## ✦✦✦ Maestro — livello 3

*Legge i tuoi gesti e para le minacce.*

Ricostruisce le tue sequenze dallo storico, sa quali incantesimi puoi completare
al prossimo gesto e si difende di conseguenza. Sbaglia un turno su dieci.

| Mago | Perché è qui |
|------|--------------|
| Morgana | Grande Regina e Maga, signora di Avalon |
| Medea | Nipote di Circe, maestra di veleni — ma pur sempre l'allieva |
| Prospero | Comanda tempeste e spiriti, poi spezza la bacchetta e rinuncia |
| Saruman | Il più potente degli Istari finché Gandalf il Bianco non tornò |
| Mordenkainen | Il più forte mago **mortale** del Piano Materiale, ma sotto Elminster |
| Zatanna | Magia al contrario, livello Justice League |
| Tasha (Iggwilv) | Arcimaga leggendaria di D&D |
| Fistandantilus | Arcimago oscuro — finché Raistlin non ne assorbì il potere |

## ✦✦✦✦ Arcimago — livello 4

*Gioco quasi perfetto. Non sbaglia un gesto.*

Nessun errore volontario, repertorio completo, valuta tutte e 64 le combinazioni
di mani a ogni turno. Non si arrende mai per distrazione.

| Mago | Perché è qui |
|------|--------------|
| Merlino | Il mago per definizione, l'archetipo di tutti gli altri |
| Gandalf | Un Maia: non un mortale che lancia incantesimi. Tornato più forte di Saruman |
| Circe | «La più potente e la dea della magia» fra le maghe classiche |
| Elminster | Prescelto di Mystra, considerato sopra Mordenkainen |
| Raistlin | Salì fino a minacciare gli dèi, col potere di Fistandantilus dentro |

---

## Come funziona il cervello

Uno solo, usato peggio dalle fasce basse. A ogni turno:

1. **Ricostruisce le sequenze** di entrambi i duellanti dallo storico dei gesti.
   Il conteggio `leftGestures`/`rightGestures` dello snapshot dice quanto è lungo
   il buffer vero, quindi anche un *anti-spell* viene rispettato.
   Un test verifica che questa ricostruzione coincida **esattamente** con lo
   stato interno del motore.
2. **Cerca le minacce**: quali incantesimi l'avversario può completare al
   prossimo gesto (solo dal livello 3 in su).
3. **Valuta tutte le 64 combinazioni** di mani, sommando il valore degli
   incantesimi che si completano e quello delle sequenze che avanzano, con
   penalità per i gesti sprecati e per le sequenze buttate via.
4. Scarta sempre `P`+`P` (resa) e la doppia pugnalata.

I pattern degli incantesimi **non sono duplicati**: vengono letti da `GET /spells`,
cioè dal catalogo del server. Un test verifica che coincidano con `SPELL_PATTERNS`.

### Rapporti di forza misurati

Torneo di 60 partite per accoppiamento sul motore vero (percentuale di vittorie
della fascia in riga):

|        | vs L1 | vs L2 | vs L3 | vs L4 |
|--------|-------|-------|-------|-------|
| **L1** |  42%  |   3%  |   2%  |   0%  |
| **L2** |  95%  |  47%  |   7%  |   8%  |
| **L3** |  95%  |  82%  |  43%  |  20%  |
| **L4** | 100%  |  92%  |  60%  |   0%  |

L'Arcimago contro sé stesso pareggia sempre: due giocatori deterministici e
identici si rispecchiano: è il risultato corretto per il gioco perfetto.
Chiude le partite in circa 15 turni contro i 47 dell'Apprendista.

---

## Fonti sulla potenza dei maghi

- [The 10 Most Powerful Wizards In Fiction — GameRant](https://gamerant.com/most-powerful-wizards-ranked/)
- [10 Most Powerful Wizards In Fiction, Ranked — ScreenRant](https://screenrant.com/most-powerful-wizards-ranked/)
- [Every Lord of the Rings Wizard, Ranked by Strength — Collider](https://collider.com/lord-of-the-rings-wizards-ranked-strength/)
- [Lord Of The Rings Wizards Ranked From Least To Most Powerful — Looper](https://www.looper.com/186778/lord-of-the-rings-wizards-ranked-from-least-to-most-powerful/)
- [Why Gandalf the White Was Stronger Than Saruman — CBR](https://www.cbr.com/gandalf-the-white-stronger-than-saruman-lord-of-rings/)
- [Most Famous Sorceresses of Greek Mythology — TheCollector](https://www.thecollector.com/most-famous-witches-sorceresses-in-greek-mythology/)
- [Circe — Wikipedia](https://en.wikipedia.org/wiki/Circe)
- [Le dee maghe dalla classicità al medioevo: da Circe a Morgana](https://www.preistoriainitalia.it/en/2020/11/21/le-dee-maghe-dalla-classicita-al-medioevo-da-circe-a-morgana/)
- [Elminster vs. Mordenkainen — EN World](https://www.enworld.org/threads/elminster-vs-mordenkainen.87847/)
- [Masters of Arcana: The 6 Most Legendary Mages of D&D](https://pathfinder2e.org/rpg/masters-of-arcana/)
- [Is Elminster the most powerful wizard?](https://www.vintageisthenewold.com/game-pedia/is-elminster-the-most-powerful-wizard)
