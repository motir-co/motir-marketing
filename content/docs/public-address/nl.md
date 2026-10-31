---
source: 331d263ce3e1
---

Een openbaar project antwoordt op zijn eigen adres op `motir.co`. Los daarvan kan een werkruimte één eigen naam claimen onder `motir.site`, en haar gehoste applicatie serveren op een domein dat ze al bezit.

## Je Motir-adres {#your-motir-address}

Elk openbaar project antwoordt op `motir.co/p/ROADMAP` voor een project met de sleutel `ROADMAP`. Er valt niets te claimen: het adres volgt uit de sleutel van het project, en het zit in elk abonnement.

## De naam van je werkruimte {#your-workspace-name}

Een werkruimte kan één naam claimen onder `motir.site`, dus `acme` geeft je `acme.motir.site`. Op die naam antwoorden de applicaties die Motir voor je werkruimte host: het kale adres toont de standaardapplicatie van de werkruimte, of een pagina die zegt dat hier nog geen applicatie is. **Openbare projecten antwoorden er nooit onder** — een project blijft op zijn `motir.co`-adres.

Een eigenaar of beheerder van de werkruimte claimt de naam in _Werkruimte-instellingen_ onder _Openbaar adres_. Projectinstellingen tonen hem alleen-lezen, met een link daarheen.

Een naam bestaat uit kleine letters, cijfers en losse koppeltekens, van drie tot drieënzestig tekens. Een kleine set namen is gereserveerd voor de eigen hosts van Motir en voor namen die een lezer voor zo’n host zou kunnen aanzien.

Een werkruimte heeft één naam of geen. **Er zijn geen aliassen, en niets verwijst door:** als je de naam hernoemt of vrijgeeft, antwoordt het oude adres meteen niet meer, en links die al gedeeld zijn werken niet meer.

- **Eén wijziging per 30 dagen.** Een hernoeming en een vrijgave tellen elk als één wijziging, dus vrijgeven en opnieuw claimen omzeilt het niet. Zolang een wijziging nog niet mag, toont het paneel de datum waarop dat wel kan.
- **Een naam die je loslaat wordt vastgehouden, tenzij je hem net pas claimde.** Een naam die je korter dan 24 uur had, gaat meteen terug naar de pool. Een naam die je 24 uur of langer had, wordt 90 dagen vastgehouden, zodat niemand anders links kan overnemen die naar jou wezen; het bevestigingsvenster noemt de precieze datum waarop hij weer vrij is.

## Je eigen domein {#your-own-domain}

Een domein dat je bezit, zoals `shop.acme.com`, kan antwoorden met de gehoste applicatie van je werkruimte, ongeacht op welk doel die draait. Eigen domeinen zijn beschikbaar in de betaalde abonnementen — zie [onze abonnementen](/). Een eigenaar of beheerder van de werkruimte voegt ze toe en verwijdert ze; alle anderen in de werkruimte zien ze alleen-lezen. De `motir.co`-adressen van je projecten en de `motir.site`-naam van je werkruimte blijven hoe dan ook werken.

## Het domein toevoegen {#add-the-domain}

Voeg het domein toe in _Werkruimte-instellingen_ onder _Eigen domeinen_. Het paneel _Openbaar adres_ verwijst er ook naar, met _Gebruik in plaats daarvan je eigen domein_.

Kies bij het toevoegen welke applicatie van de werkruimte het serveert. Een domein serveert precies één applicatie. Welke dat is, kun je later wijzigen op de regel van het domein, met _Applicatie wijzigen_. Een werkruimte die nog geen gehoste applicatie heeft, kan toch een domein toevoegen: het wordt zonder applicatie toegevoegd en serveert niets tot je er een kiest.

## De records die je aanmaakt {#the-records-you-create}

Zodra het domein is toegevoegd, toont het paneel elk record dat het nodig heeft, met de exacte waarde en een kopieerknop bij elk, en bewaart ze onder _DNS-records tonen_. De vormen hieronder laten zien wat je kunt verwachten — lees ze om na te gaan of je registrar ze kan aanmaken, en neem de waarden over uit het paneel.

Eerst één `TXT`-record dat bewijst dat het domein van jou is. De naam is `_motir-verify.` gevolgd door je domein; de meeste registrars willen alleen het deel vóór je hoofddomein, zoals hier:

| Type  | Naam                 | Waarde              |
| ----- | -------------------- | ------------------- |
| `TXT` | `_motir-verify.shop` | staat in het paneel |

Het token erin is alleen van jou, dus kopieer het uit het paneel en niet van ergens anders.

Daarna een record dat het domein naar Motir laat wijzen. Voor een **subdomein** zoals `shop.acme.com` één `CNAME`:

| Type    | Naam   | Waarde              |
| ------- | ------ | ------------------- |
| `CNAME` | `shop` | staat in het paneel |

Voor een **hoofddomein** zoals `acme.com` in plaats daarvan een `A` en een `AAAA` — een hoofddomein kan geen `CNAME` dragen, omdat het al de `MX`- en `TXT`-records draagt waar je e-mail en je andere diensten van afhangen. Hetzelfde geldt voor een domein direct onder een openbaar achtervoegsel van meer dan één deel, zoals `acme.co.uk`; het paneel weet welk soort het jouwe is en toont de juiste records.

| Type   | Naam | Waarde              |
| ------ | ---- | ------------------- |
| `A`    | `@`  | staat in het paneel |
| `AAAA` | `@`  | staat in het paneel |

Deze adressen zijn van Motir zelf en worden vastgehouden voor domeinen van klanten. Veranderen ze ooit, dan verandert het paneel mee; een pagina als deze niet.

> Biedt je DNS-provider een ‘proxy’- of ‘cloud’-schakelaar op het record, zet die dan uit: een proxy vóór het record verbergt je domein voor de controle en het certificaat kan niet worden uitgegeven.

Kies daarna _Nu controleren_. Zodra we het eigendomsrecord zien, vragen we een certificaat aan, wat meestal een paar minuten duurt. Je kunt de pagina sluiten; de status loopt vanzelf verder.

## Wat elke status betekent {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Status         | Wat het betekent                                                                                                                                                                        | Wat te doen                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Niet bevestigd | We hebben je eigendomsrecord nog niet gezien. Er is niets aangevraagd bij de certificeringsinstantie, en het domein antwoordt niet.                                                     | Maak de records aan die het paneel toont en kies dan Nu controleren.                      |
| In afwachting  | We zoeken nu naar je eigendomsrecord. DNS-wijzigingen kunnen een paar minuten nodig hebben om zich te verspreiden.                                                                      | Wacht even. Het loopt vanzelf verder.                                                     |
| In afwachting  | Het eigendom is bevestigd en het certificaat wordt uitgegeven. Dat duurt meestal een paar minuten.                                                                                      | Niets. De pagina werkt zichzelf bij.                                                      |
| Uitgegeven     | Het certificaat is uitgegeven en je domein antwoordt. Het wordt vanzelf vernieuwd.                                                                                                      | Niets.                                                                                    |
| Mislukt        | ‘We zien je eigendomsrecord niet meer.’ Het `TXT`-record bevat je token niet meer, dus het domein antwoordt niet meer.                                                                  | Herstel het `TXT`-record dat het paneel toont en kies dan Opnieuw controleren.            |
| Mislukt        | ‘_Je domein_ wijst niet meer naar Motir.’ Het `A`-, `AAAA`- of `CNAME`-record is gewijzigd of verwijderd, dus het domein antwoordt niet meer.                                           | Zet het record terug op de waarde die het paneel toont en kies dan Opnieuw controleren.   |
| Mislukt        | ‘Het certificaat kon niet worden uitgegeven.’ De certificeringsinstantie weigerde het; het paneel toont haar eigen reden ernaast.                                                       | Los op wat de reden noemt — meestal een ontbrekend record — en kies dan Opnieuw proberen. |
| Mislukt        | ‘Het certificaat kon niet worden uitgegeven.’ Het certificaat is verlopen en de vernieuwing is niet gelukt — bijna altijd omdat een DNS-record is gewijzigd. Het domein antwoordt niet. | Zet de records terug zoals het paneel ze toont en kies dan Opnieuw proberen.              |
| Mislukt        | ‘Het certificaat kon niet worden uitgegeven.’ Het certificaat is ingetrokken. Het domein antwoordt niet.                                                                                | Kies Opnieuw proberen om een nieuw certificaat te starten.                                |

Alleen een domein met de status _Uitgegeven_ antwoordt überhaupt.

## Wat je domein serveert {#what-your-domain-serves}

Zodra het certificaat is uitgegeven, beantwoordt de edge van Motir je domein: die stuurt elk verzoek — pad, query, body en cookies — door naar de applicatie die het domein noemt en geeft het eigen antwoord van die applicatie terug. Wat een bezoeker te zien krijgt, hangt af van de applicatie:

- **Je applicatie zelf**, als die is gepubliceerd en voor iedereen open staat.
- **Een pagina die zegt dat hier nog niets is gepubliceerd**, als het domein geen applicatie noemt of de applicatie nog niet is gepubliceerd.
- **Een pagina die zegt dat de site alleen voor leden is**, als de applicatie alleen voor haar leden open staat. Leden bereiken haar op haar `motir.site`-adres, waar de pagina naar linkt als er een is. Op dit moment staat elke gehoste applicatie alleen voor haar leden open — de instelling die er een voor iedereen opent, is er nog niet — dus voorlopig toont een domein dat een gepubliceerde applicatie noemt deze pagina in plaats van de applicatie.
- **Een pagina die zegt dat de site nu niet bereikbaar is**, als de applicatie draait op een doel waar de edge nog niet naar kan doorsturen. Zodra de edge het kan, antwoordt hij weer.
- **Eén eenvoudige ‘niet gevonden’-pagina** voor elke andere reden, ook voor een verwijderd domein. Het is dezelfde pagina, wat de reden ook is, dus ze vertelt een bezoeker nooit welke reden gold.

Geen van deze pagina’s heeft de site van Motir eromheen, en geen ervan wordt door zoekmachines geïndexeerd.

Motir voegt op je domein geen eigen doorverwijzing, canonieke link, robots-bestand of sitemap toe. Je applicatie bepaalt haar eigen.

## Twee domeinen in één werkruimte {#two-domains-on-one-workspace}

Een werkruimte kan meer dan één domein koppelen, tot wat haar abonnement omvat. Elk noemt zijn eigen applicatie, gekozen op zijn eigen regel. Motir zet geen ervan boven de andere en stuurt tussen geen ervan door: elk antwoordt op zichzelf, met de applicatie die het noemt.

## Een domein verwijderen {#removing-a-domain}

Kies _Verwijderen_ op de regel van het domein. Het domein serveert je applicatie binnen ongeveer een halve minuut niet meer en antwoordt vanaf dan met de niet-gevonden-pagina. Er wordt niets vastgehouden: je kunt het later weer toevoegen, en een andere werkruimte kan het toevoegen zodra die het eigendom bewijst met een eigen `TXT`-record. De records bij je DNS-provider zijn aan jou om te verwijderen. Een domein verwijderen verandert niets aan de applicatie, die op haar andere adressen blijft antwoorden.

## Als iets niet werkt {#if-something-is-not-working}

Vier vergissingen verklaren bijna elke mislukking, en elk ervan zie je anders terug in het paneel.

- **Een CNAME op een hoofddomein.** De meeste registrars accepteren het, en het werkt niet. Het symptoom is een domein dat op _In afwachting_ blijft staan of _Mislukt_ bereikt. Gebruik in plaats daarvan de `A`- en `AAAA`-records hierboven.
- **Een DNS-provider die als proxy vóór het record staat.** Biedt je provider aan verkeer via een proxy te leiden of te versnellen, dan verbergt dat het echte record voor ons. Het symptoom is _In afwachting_ dat nooit tot rust komt. Zet de proxy voor deze records uit.
- **Een verouderd eigendomsrecord.** Heb je een domein verwijderd en opnieuw toegevoegd, dan is het token veranderd. Het symptoom is _Niet bevestigd_ terwijl er duidelijk een `TXT`-record staat. Vervang de waarde door de waarde die het paneel nu toont.
- **Een eigendomsrecord dat later is verwijderd.** Een actief domein waarvan het `TXT`-record verdwijnt, blijft antwoorden tot onze geregelde controle het opmerkt, wat binnen ongeveer een uur gebeurt; daarna gaat het naar _Mislukt_ en antwoordt het niet meer. Herstel het record en kies Opnieuw controleren.
