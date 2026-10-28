---
source: 410c4c87d2ef
---

Een openbaar project antwoordt op zijn eigen adres op `motir.co`, en kan daarnaast antwoorden op een domein dat je al bezit. Los daarvan kan een werkruimte één eigen naam claimen onder `motir.site`.

## Je Motir-adres {#your-motir-address}

Elk openbaar project antwoordt op `motir.co/p/ROADMAP` voor een project met de sleutel `ROADMAP`. Er valt niets te claimen: het adres volgt uit de sleutel van het project, en het zit in elk abonnement.

## De naam van je werkruimte {#your-workspace-name}

Een werkruimte kan één naam claimen onder `motir.site`, dus `acme` geeft je `acme.motir.site`. Op die naam antwoorden de applicaties die Motir voor je werkruimte host: het kale adres toont de standaardapplicatie van de werkruimte, of een pagina die zegt dat hier nog geen applicatie is. **Openbare projecten antwoorden er nooit onder** — een project blijft op zijn `motir.co`-adres.

Een eigenaar of beheerder van de werkruimte claimt de naam in _Werkruimte-instellingen_ onder _Openbaar adres_. Projectinstellingen tonen hem alleen-lezen, met een link daarheen.

Een naam bestaat uit kleine letters, cijfers en losse koppeltekens, van drie tot drieënzestig tekens. Een kleine set namen is gereserveerd voor de eigen hosts van Motir en voor namen die een lezer voor zo’n host zou kunnen aanzien.

Een werkruimte heeft één naam of geen. **Er zijn geen aliassen, en niets verwijst door:** als je de naam hernoemt of vrijgeeft, antwoordt het oude adres meteen niet meer, en links die al gedeeld zijn werken niet meer.

- **Eén wijziging per 30 dagen.** Een hernoeming en een vrijgave tellen elk als één wijziging, dus vrijgeven en opnieuw claimen omzeilt het niet. Zolang een wijziging nog niet mag, toont het paneel de datum waarop dat wel kan.
- **Een naam die je loslaat wordt vastgehouden, tenzij je hem net pas claimde.** Een naam die je korter dan 24 uur had, gaat meteen terug naar de pool. Een naam die je 24 uur of langer had, wordt 90 dagen vastgehouden, zodat niemand anders links kan overnemen die naar jou wezen; het bevestigingsvenster noemt de precieze datum waarop hij weer vrij is.

## Je eigen domein koppelen {#connecting-your-own-domain}

Een domein dat je bezit koppelen kan met betaalde abonnementen — zie [onze abonnementen](/). Je `motir.co`-adres zit in elk abonnement en blijft hoe dan ook werken.

Een gekoppeld domein bedient _één_ project, op zijn root: `roadmap.acme.com/` is de pagina van dat project en `roadmap.acme.com/changelog` zijn changelog. Het live bord, de werkitems en de roadmap staan in de Motir-app, en hun links daar leiden naar binnen.

Je maakt twee soorten records aan bij je registrar. **Voeg eerst het domein toe**, in Projectinstellingen onder _Openbaar adres_: het paneel toont dan elk record dat dat domein nodig heeft, met zijn exacte waarde en een kopieerknop erbij. De vormen hieronder zijn wat je kunt verwachten — lees ze om te controleren of je registrar ze kan aanmaken, en neem de waarden uit het paneel.

### 1 · Wijs het domein naar ons {#point-the-domain-at-us}

Voor een **subdomein** zoals `roadmap.acme.com`, één `CNAME`:

| Type    | Naam      | Waarde                |
| ------- | --------- | --------------------- |
| `CNAME` | `roadmap` | getoond in het paneel |

Voor een **rootdomein** zoals `acme.com` in plaats daarvan een `A` en een `AAAA` — een rootdomein kan geen `CNAME` hebben, omdat het al de `MX`- en `TXT`-records draagt waarvan je e-mail en je andere diensten afhangen:

| Type   | Naam | Waarde                |
| ------ | ---- | --------------------- |
| `A`    | `@`  | getoond in het paneel |
| `AAAA` | `@`  | getoond in het paneel |

Kopieer elke waarde uit het paneel en niet van ergens anders. Dit zijn de adressen waarop Motir wordt bediend, gelezen van het platform waarop wij draaien, en ze kunnen veranderen — het paneel verandert mee en een pagina als deze niet.

> Biedt je DNS-provider een schakelaar ‘proxy’ of ‘cloud’ bij het record, zet die dan uit: een proxy voor het record verbergt je domein voor de controle en het certificaat kan dan niet worden uitgegeven.

### 2 · Bewijs dat het domein van jou is {#prove-the-domain-is-yours}

Naast het wijzende record toont het paneel één `TXT`-record met een token erin, van deze vorm:

| Type  | Naam                    | Waarde           |
| ----- | ----------------------- | ---------------- |
| `TXT` | `_motir-verify.roadmap` | `motir-verify=…` |

Kopieer de waarde uit het paneel en niet van hier — het token is van jou alleen. Kies dan _Verifiëren_. Zodra we het record kunnen zien, vragen we een certificaat aan, wat meestal binnen een minuut of twee klaar is. Je kunt de pagina sluiten; de status loopt vanzelf door, en de records blijven beschikbaar onder _DNS-records tonen_.

## Wat elke status betekent {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Status            | Wat het betekent                                                                                                                              | Wat je moet doen                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Niet geverifieerd | We hebben je eigendomsrecord nog niet gezien. Er is niets aangevraagd bij de certificaatautoriteit.                                           | Maak hieronder het TXT-record aan en kies dan Opnieuw controleren.      |
| Controleren…      | We zoeken nu naar het eigendomsrecord. DNS-wijzigingen kunnen een paar minuten nodig hebben om zich te verspreiden.                           | Wacht even. Het gaat vanzelf verder.                                    |
| Uitgeven…         | Het eigendom is bewezen en het certificaat is aangevraagd. Dit duurt meestal een minuut of twee.                                              | Niets. Motir doet de rest.                                              |
| Live              | Het certificaat is uitgegeven en je domein bedient het project. Het wordt vanzelf vernieuwd.                                                  | Je kunt van dit adres het primaire adres maken.                         |
| Mislukt           | Het certificaat kon niet worden uitgegeven. De reden staat naast de status — meestal een record dat ontbreekt of ergens anders naartoe wijst. | Vergelijk je records met die hieronder en kies dan Opnieuw controleren. |
| Verlopen          | Het certificaat is verlopen en de vernieuwing is niet gelukt — bijna altijd omdat een DNS-record is gewijzigd. Het domein bedient niets.      | Zet de records terug zoals ze waren en kies dan Opnieuw controleren.    |
| Ingetrokken       | Het certificaat is ingetrokken. Het domein bedient niets.                                                                                     | Kies Opnieuw aanvragen om een nieuw certificaat te starten.             |

## Welk adres het echte is {#which-address-is-the-real-one}

Een project kan op meerdere adressen antwoorden, en precies één ervan is het _primaire_ — het adres waarover zoekmachines en socialemediakaarten worden geïnformeerd. Zodra het certificaat van een gekoppeld domein live is, kun je het primair maken; tot dan is het Motir-adres dat.

**Elk ander adres verwijst door naar het primaire.** Dat geldt ook voor je `motir.co`-adres zodra je een eigen domein hebt gepromoveerd. Bezoekers komen altijd ergens aan waar het werkt, en een zoekmachine ziet één pagina in plaats van drie kopieën die met elkaar concurreren.

## Een domein verwijderen {#removing-a-domain}

Als je een gekoppeld domein verwijdert, wordt zijn certificaat ingetrokken en antwoordt het adres niet meer — wie het gebruikt, krijgt een fout, en links die er al naartoe zijn gedeeld, werken niet meer. Je project blijft openbaar op zijn andere adressen, dus een domein verwijderen maakt een project nooit privé.

## Als iets niet werkt {#if-something-is-not-working}

Drie vergissingen verklaren bijna elke storing, en elk ziet er in het paneel anders uit.

- **Een CNAME op een rootdomein.** De meeste registrars accepteren het en het werkt niet. Het symptoom is een domein dat op de status Niet geverifieerd (`Not verified`) blijft staan of de status Mislukt (`Failed`) bereikt. Gebruik in plaats daarvan de `A`- en `AAAA`-records hierboven.
- **Een DNS-provider met proxy voor het record.** Als je provider aanbiedt het verkeer te proxyen of te versnellen, verbergt dat het echte record voor ons. Het symptoom is de status Controleren… (`Checking…`) die nooit tot rust komt. Zet de proxy uit voor deze records.
- **Een verouderd eigendomsrecord.** Als je een domein hebt verwijderd en opnieuw toegevoegd, is het token veranderd. Het symptoom is de status Niet geverifieerd (`Not verified`) terwijl er duidelijk een `TXT`-record staat. Vervang de waarde door die het paneel nu toont.
