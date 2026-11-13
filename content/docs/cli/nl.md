---
source: 9091e5e2f59e
---

De Motir CLI praat met dezelfde MCP-server die de Motir-agent gebruikt. Hij automatiseert de plannings- en uitvoeringslus op een token dat aan een werkruimte is gebonden: een run claimt het volgende gereed werkitem, haalt de door de server gegenereerde prompt op en stuurt een agent in een sandbox aan om het uit te voeren. Het werkitem is het systeem van record; de CLI is de aandrijver.

{{part:meta}}

{{value:packageName}} · versie {{value:packageVersion}} · {{value:commandCount}} commando’s

{{part:reference}}

## Installeren {#install}

Node {{value:nodeRequirement}}. Installeer hem globaal, of voer hem eenmalig uit zonder te installeren.

{{slot:install}}

## Authenticeren {#authenticate}

De apparaatflow is het kortste pad: hij toont een code, opent Motir en wacht tot je die goedkeurt. Heb je al een persoonlijk toegangstoken, geef dat dan rechtstreeks door. In beide gevallen praat de CLI met {{value:defaultServer}}, tenzij je hem ergens anders naartoe wijst.

{{slot:authenticate}}

Koppel daarna een map aan een project en controleer de configuratie vóór de eerste run.

{{slot:link-and-check}}

## Commando’s {#commands}

Elk commando dat de CLI registreert, in de volgorde waarin `motir help` ze toont, gegenereerd uit de catalogus die de binary zelf declareert — dus deze lijst kan niet achterlopen op een release. Hij beschrijft {{value:packageName}}@{{value:packageVersion}}.

{{slot:commands}}

## Waar Motir dingen bewaart {#where-motir-keeps-things}

Drie bestanden, en slechts één ervan bevat een geheim — en dat is niet het bestand dat in je repository staat. Elk pad hieronder kan worden verplaatst; `motir help files` toont ze vanuit de binary die je echt hebt geïnstalleerd, met de variabele die elk pad verplaatst.

- `~/.config/motir/config.json` **— geheim, nooit committen**
  De opslag voor inloggegevens: het enige bestand waarin ooit een persoonlijk toegangstoken wordt geschreven, `chmod 600` binnen een map met `0700`, gesleuteld op server-URL zodat één machine tokens voor meerdere Motir-servers kan bevatten. Het bevat ook het agentcommando dat je hebt ingesteld. Verplaats het met `MOTIR_CONFIG_HOME` of `XDG_CONFIG_HOME`.
- `.motir.json` **— geen geheim, veilig om te committen**
  De projectkoppeling in de root van je werkruimte: de server, werkruimte en het project waaraan deze map is gebonden, plus een optionele overschrijfmap voor repositories. Hij bevat geen inloggegevens en hoort dus in versiebeheer. Elk commando vindt hem door vanuit de huidige map OMHOOG te lopen, dus elk commando werkt vanuit elke checkout onder de root.
- `~/.local/state/motir/session-excludes.json` **— geen geheim**
  De uitsluitlijst van de sessie: de werkitems waarvan de dispatch MISLUKTE, zodat de volgende run ze overslaat in plaats van dezelfde mislukking opnieuw te kiezen. Dat is status en geen inloggegevens, en daarom staat het niet naast het token — de sandbox koppelt de configmap alleen-lezen, en een run mag nooit sterven omdat hij dit bestand niet kon schrijven. Is het niet schrijfbaar, dan waarschuwt Motir één keer en gaat door. Verplaats het met `MOTIR_STATE_HOME`.

## Waar een run wordt uitgevoerd {#where-a-run-executes}

Een aangestuurde agent draait in een container met jouw checkouts en je eigen agentinloggegevens — wat die biedt, wat het token weigert en de fouten die een eerste run tegenkomt staan op de pagina [{{value:sandboxPage}}](/docs/sandbox) en worden hier niet herhaald. Een agent aan Motir koppelen zonder de CLI staat bij [{{value:mcpPage}}](/docs/mcp), en dezelfde werklus via HTTP aansturen staat bij de [{{value:apiPage}}](/docs/api). De volledige commandoreferentie — de drie vormen van een run, sessiebranches, het faalbeleid en het oplossen van problemen — is [docs/cli.md]({{value:cliReferenceUrl}}) in motir-core.

{{part:unreachable}}

De commandoreferentie is tijdelijk niet bereikbaar. Ze wordt gegenereerd uit de catalogus die de CLI zelf declareert en wordt hier nooit gekopieerd, dus er is voorlopig niets om je te tonen — `motir help` toont dezelfde tabel vanuit de binary die je hebt geïnstalleerd.
