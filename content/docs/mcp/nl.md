---
source: 2aa432672926
---

Motir biedt een Model Context Protocol-server aan — één streamable-HTTP-endpoint dat agents en de CLI aanroepen om de projectmanagementkern te lezen en aan te sturen. Het is hetzelfde oppervlak dat de Motir-agent gebruikt om een plan uit te voeren. Het toevoegen aan Claude kost één keer inloggen en geen token; elke andere client, of een pipeline, verbindt met een token in drie stappen.

## Voeg Motir toe aan Claude {#claude}

Je logt in met je Motir-account, kiest één werkruimte en keurt goed wat Claude daar mag doen. Er wordt niets gekopieerd of geplakt — er is geen token om aan te maken of veilig te bewaren.

### claude.ai {#claude-ai}

1. Open Customize → Connectors.
2. Klik op ‘+’, dan op Add custom connector, en plak de server-URL hieronder. Kies onder OAuth client de optie Use Claude’s published identity — claude.ai markeert die als Detected, omdat Motir dit ondersteunt. Laat de OAuth client ID en het secret leeg — Motir heeft geen van beide nodig.
3. Klik op Add en dan op Connect. Claude stuurt je naar app.motir.co om in te loggen en goed te keuren.

{{slot:claude-ai}}

Bij een Team- of Enterprise-abonnement voegt een Owner de connector één keer toe, onder Organization settings → Connectors → Add → Custom → Web, en elk lid klikt daarna onder Customize → Connectors op Connect met zijn eigen Motir-account. · [Documentatie van Anthropic over claude.ai]({{value:routeClaudeAiDocsUrl}}) · stappen gecontroleerd {{value:routeClaudeAiCheckedOn}}

### Claude desktop-app {#claude-desktop}

1. Als je Motir al op claude.ai hebt verbonden, valt er niets toe te voegen: een verbonden connector is beschikbaar in je gesprekken op het web, in de desktop-app en op mobiel.
2. Om hem in plaats daarvan vanuit de desktop-app toe te voegen, selecteer je Customize in de zijbalk, dan Connectors, en volg je de stappen van claude.ai met dezelfde URL.
3. De aanmeldpagina van Motir opent in je browser; keur daar goed en keer terug naar de app.

{{slot:claude-desktop}}

Dit is een externe connector, geen lokale desktopextensie: Claude bereikt Motir vanuit de cloud van Anthropic, dus er wordt niets op je machine geïnstalleerd. · [Documentatie van Anthropic over de Claude desktop-app]({{value:routeClaudeDesktopDocsUrl}}) · stappen gecontroleerd {{value:routeClaudeDesktopCheckedOn}}

### Claude Code {#claude-code}

1. Voeg de server toe met het commando hieronder — zonder header en zonder token.
2. Voer in Claude Code `/mcp` uit, selecteer `motir` en volg het inloggen in je browser.

{{slot:claude-code}}

Heb je Claude Code met je Claude-account ingelogd, dan is een connector die je op claude.ai hebt verbonden daar al beschikbaar. De Motir-plugin voor Claude Code brengt deze server mee, naast de skills. · [Documentatie van Anthropic over Claude Code]({{value:routeClaudeCodeDocsUrl}}) · stappen gecontroleerd {{value:routeClaudeCodeCheckedOn}}

### Wat je goedkeurt en hoe je het intrekt {#consent}

De aanmeldpagina van Motir noemt de app die het vraagt, laat je één werkruimte kiezen en toont de rechten die hij wil. Claude handelt daarna als jij in die werkruimte, binnen wat je hebt goedgekeurd — nooit verder dan je eigen rol toestaat.

Wanneer claude.ai verbindt met de gepubliceerde identiteit van Claude, controleert Motir dat claude.ai die publiceert, en toont claude.ai als geverifieerd domein op de aanmeldpagina en in Gekoppelde apps. Elke andere MCP-client die zichzelf registreert, staat als Niet geverifieerd: de naam die hij toont heeft hij zelf gekozen, en Motir kan die niet controleren.

Claude vraagt het eerst voordat het een tool gebruikt die iets wijzigt: elke tool zegt of hij alleen leest, schrijft of verwijdert, en [{{value:mcpToolsPage}}](/docs/mcp/tools) laat zien welke welke is. Wil je liever de plugin voor Claude Code? Die brengt deze server mee — [{{value:skillsPage}}](/docs/skills).

Elke app die je verbindt, staat onder [Gekoppelde apps]({{value:connectedAppsUrl}}), bij Instellingen → Account → Tokens in Motir, met zijn werkruimte, rechten en het moment waarop hij voor het laatst is gebruikt. Intrekken beëindigt zijn toegang bij het eerstvolgende request.

## Andere clients en CI: gebruik een token {#token-route}

Kies deze route voor een client zonder OAuth-aanmelding, een headless agent of een CI-pipeline. Het is dezelfde server; een persoonlijk toegangstoken vervangt het inloggen.

## Deze server, of de REST-API? {#fork}

Beide praten met dezelfde gegevens en nemen dezelfde inloggegevens aan. Ze zijn gebouwd voor verschillende gebruikers, en het verschil dat ertoe doet is wat elk belooft over veranderingen onder je voeten.

|                  | {{value:mcpPage}}                                                                                                                  | {{value:apiPage}}                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Endpoint**     | `POST {{value:endpointPath}}`                                                                                                      | `/api/v1/…`                                                                         |
| **Gebouwd voor** | Een agent die je zelf aanstuurt — hij leest toolbeschrijvingen tijdens het draaien.                                                | Een client die je uitlevert — code die één keer is geschreven tegen een vaste vorm. |
| **Stabiliteit**  | Verwacht te veranderen. Een beschrijving herformuleren of een argument hernoemen is hoe het gedrag van een agent wordt bijgesteld. | Alleen additief. Een brekende wijziging maakt `/api/v2`; v1 houdt zijn belofte.     |
| **Vorm**         | Dezelfde. MCP-payloads zijn afgeleid van de v1-responseschema’s, dus de twee beschrijven aantoonbaar identieke objecten.           | Dezelfde, en het is de bron waarvan de MCP is afgeleid.                             |
| **Auth**         | Eén persoonlijk toegangstoken, één set scopes.                                                                                     | Dezelfde inloggegevens werken op beide.                                             |

Sluit je een agent aan? Blijf dan hier. Schrijf je software die anderen installeren? Dan is de [{{value:apiPage}}](/docs/api) de andere helft — die belooft niet onder je voeten te veranderen.

## 1. Maak een token aan {#token}

Elk request draagt een persoonlijk toegangstoken, aangemaakt in Motir bij Instellingen → Account → Tokens. Kies de werkruimte waaraan het is gebonden en geef het de kleinste set scopes die het werk doet — de tabel onderaan deze pagina zegt wat elke scope regelt. Een toekenning beperkt je eigen rol en verruimt die nooit, dus een token kan nooit iets wat jij niet zou kunnen.

Het geheim wordt eenmaal getoond, op het moment dat het token wordt aangemaakt. Kopieer het dan; je kunt het daarna niet meer lezen, en een kwijtgeraakt token wordt vervangen en niet hersteld.

## 2. Koppel je client {#wire}

Elke client heeft dezelfde vier gegevens nodig, onder welke namen hij ze ook geeft.

|               |                                                                           |
| ------------- | ------------------------------------------------------------------------- |
| **URL**       | `{{value:url}}`                                                           |
| **Transport** | Streamable HTTP — niet SSE, en geen stdio-commando                        |
| **Header**    | `{{value:authHeader}}: {{value:authScheme}} <token>`, bij elk request     |
| **Token**     | `{{value:tokenPlaceholder}}` — het token dat je in stap 1 hebt aangemaakt |

Houd het token buiten een bestand dat je repository bijhoudt. Waar een client het uit je omgeving kan lezen of er om kan vragen, gebruikt het blok hieronder dat in plaats van een letterlijke waarde — en daarom noemen er twee `{{value:tokenEnvVar}}` in plaats van een geheim.

### Claude Code {#client-claude-code}

{{slot:client-claude-code}}

Of één commando: `{{value:claudeCodeTokenCommand}}` · [Documentatie van Claude Code]({{value:clientClaudeCodeDocsUrl}}) · formaat gecontroleerd {{value:clientsCheckedOn}}

### Cursor {#client-cursor}

{{slot:client-cursor}}

Cursor interpoleert `${env:…}`, dus het token blijft in je omgeving en buiten het bestand. · [Documentatie van Cursor]({{value:clientCursorDocsUrl}}) · formaat gecontroleerd {{value:clientsCheckedOn}}

### VS Code {#client-vscode}

{{slot:client-vscode}}

VS Code vraagt om het token wanneer de server voor het eerst start en slaat het veilig op — er wordt niets geheims in het bestand geschreven. · [Documentatie van VS Code]({{value:clientVscodeDocsUrl}}) · formaat gecontroleerd {{value:clientsCheckedOn}}

### Codex CLI {#client-codex}

{{slot:client-codex}}

`{{value:codexTokenKey}}` neemt de NAAM van de variabele, niet het token. · [Documentatie van Codex CLI]({{value:clientCodexDocsUrl}}) · formaat gecontroleerd {{value:clientsCheckedOn}}

### Elke andere streamable-HTTP-client {#client-other}

{{slot:client-other}}

Windsurf, Zed, Cline, Goose, of iets wat je zelf hebt geschreven — dezelfde vier gegevens onder andere sleutelnamen. · [Documentatie van elke andere streamable-HTTP-client]({{value:clientOtherDocsUrl}}) · formaat gecontroleerd {{value:clientsCheckedOn}}

## 3. Controleer de verbinding {#check}

Herstart de client en vraag welke tools hij heeft; de server antwoordt met de hele catalogus, afgestemd op jouw toekenning. Om het endpoint zelf te controleren voordat je er een client bij betrekt, vraag je het rechtstreeks — dit is dezelfde handshake, met het token in je omgeving.

{{slot:verify}}

**Een niet-geautoriseerd antwoord gaat over het TOKEN, niet over de koppeling.** Een ontbrekend, onjuist opgemaakt, onbekend, ingetrokken of verlopen token geeft bewust dezelfde weigering — ze uit elkaar houden zou van het endpoint een orakel maken dat antwoordt of een geheim bestaat. Controleer of de header `{{value:authHeader}}` heet, of de waarde begint met `{{value:authScheme}}` en of het token niet in Motir is ingetrokken.

## Wat een verbinding mag aanroepen {#scopes}

Elke tool wordt geregeld door een scope. De rechten die je voor een gekoppelde app hebt goedgekeurd, of de toekenning die een token draagt, bepalen welke tools hij mag aanroepen — dus de lijst die je client toont is al op jou afgestemd. Deze worden uit Motir zelf gelezen wanneer deze pagina wordt opgevraagd, dus het is wat de server nu levert.

{{part:what-next}}

[//]: # 'Placed after the scope table, which the page generates from the published catalogue.'

## Wat nu {#what-next}

[{{value:mcpToolsPage}}](/docs/mcp/tools) somt elke tool op die de server aanbiedt, met de argumenten die hij accepteert. [De volledige referentie]({{value:referenceUrl}}) in motir-core bevat de complete beschrijving van elke tool. Dezelfde gegevens in plaats daarvan vanuit een terminal aansturen staat bij de [{{value:cliPage}}](/docs/cli).

{{part:column-scope}}

[//]: # 'A heading of the scope table. Each of the five parts below is one short label that stays a single word or phrase, with no sentence around it.'

Scope

{{part:column-gates}}

Wat het regelt

{{part:column-default}}

Standaard

{{part:granted}}

Verleend

{{part:off-by-default}}

Standaard uit

{{part:unreachable}}

[//]: # 'Shown in place of the scope table when the catalogue cannot be fetched. Keep `tools/list` literal.'

De scopetabel is tijdelijk niet bereikbaar. Ze is afgeleid van de catalogus die Motir publiceert en wordt hier nooit gekopieerd, dus er is voorlopig niets om je te tonen — een `tools/list`-handshake met je eigen token beantwoordt dezelfde vraag voor dat token.
