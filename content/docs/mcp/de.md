---
source: 2aa432672926
---

Motir stellt einen Model-Context-Protocol-Server bereit – einen Streamable-HTTP-Endpunkt, den Agenten und die CLI aufrufen, um den Projektmanagement-Kern zu lesen und zu steuern. Es ist dieselbe Schnittstelle, die der Motir-Agent nutzt, um einen Plan auszuführen. Ihn zu Claude hinzuzufügen erfordert eine Anmeldung und kein Token; jeder andere Client und jede Pipeline verbindet sich in drei Schritten mit einem Token.

## Motir zu Claude hinzufügen {#claude}

Sie melden sich mit Ihrem Motir-Konto an, wählen einen Arbeitsbereich und genehmigen, was Claude dort tun darf. Es wird nichts kopiert oder eingefügt – es gibt kein Token, das Sie erstellen oder sicher aufbewahren müssten.

### claude.ai {#claude-ai}

1. Öffnen Sie Customize → Connectors.
2. Klicken Sie auf „+“, dann auf Add custom connector, und fügen Sie die untenstehende Server-URL ein. Wählen Sie unter OAuth client die Option Use Claude’s published identity – claude.ai kennzeichnet sie als Detected, weil Motir sie unterstützt. Lassen Sie OAuth client ID und Secret leer – Motir braucht keines von beiden.
3. Klicken Sie auf Add, dann auf Connect. Claude leitet Sie zur Anmeldung und Genehmigung zu app.motir.co weiter.

{{slot:claude-ai}}

Bei einem Team- oder Enterprise-Tarif fügt ein Owner den Connector einmal unter Organization settings → Connectors → Add → Custom → Web hinzu, und jedes Mitglied klickt anschließend unter Customize → Connectors mit seinem eigenen Motir-Konto auf Connect. · [Dokumentation von Anthropic zu claude.ai]({{value:routeClaudeAiDocsUrl}}) · Schritte geprüft am {{value:routeClaudeAiCheckedOn}}

### Claude-Desktop-App {#claude-desktop}

1. Wenn Sie Motir bereits auf claude.ai verbunden haben, gibt es nichts hinzuzufügen: Ein verbundener Connector steht in Ihren Unterhaltungen im Web, in der Desktop-App und auf dem Mobilgerät zur Verfügung.
2. Um ihn stattdessen aus der Desktop-App hinzuzufügen, wählen Sie in der Seitenleiste Customize, dann Connectors, und folgen Sie den Schritten für claude.ai mit derselben URL.
3. Die Anmeldeseite von Motir öffnet sich in Ihrem Browser; genehmigen Sie dort und kehren Sie zur App zurück.

{{slot:claude-desktop}}

Das ist ein Remote-Connector und keine lokale Desktop-Erweiterung: Claude erreicht Motir aus der Cloud von Anthropic, auf Ihrem Rechner wird also nichts installiert. · [Dokumentation von Anthropic zur Claude-Desktop-App]({{value:routeClaudeDesktopDocsUrl}}) · Schritte geprüft am {{value:routeClaudeDesktopCheckedOn}}

### Claude Code {#claude-code}

1. Fügen Sie den Server mit dem untenstehenden Befehl hinzu – ohne Header und ohne Token.
2. Führen Sie in Claude Code `/mcp` aus, wählen Sie `motir` und folgen Sie der Anmeldung in Ihrem Browser.

{{slot:claude-code}}

Wenn Sie Claude Code mit Ihrem Claude-Konto angemeldet haben, steht ein auf claude.ai verbundener Connector dort bereits zur Verfügung. Das Plugin von Motir für Claude Code bringt diesen Server neben den Skills mit. · [Dokumentation von Anthropic zu Claude Code]({{value:routeClaudeCodeDocsUrl}}) · Schritte geprüft am {{value:routeClaudeCodeCheckedOn}}

### Was Sie genehmigen und wie Sie es zurücknehmen {#consent}

Die Anmeldeseite von Motir nennt die App, die anfragt, lässt Sie einen Arbeitsbereich wählen und listet die gewünschten Berechtigungen auf. Claude handelt dann als Sie in diesem Arbeitsbereich, im Rahmen dessen, was Sie genehmigt haben – nie über das hinaus, was Ihre eigene Rolle erlaubt.

Wenn sich claude.ai mit der veröffentlichten Identität von Claude verbindet, prüft Motir, dass claude.ai sie veröffentlicht, und zeigt claude.ai auf der Anmeldeseite und unter Verbundene Apps als verifizierte Domain an. Jeder andere MCP-Client, der sich selbst registriert, gilt als nicht verifiziert: Der Name, den er anzeigt, ist einer, den er selbst gewählt hat, und Motir kann ihn nicht prüfen.

Claude fragt nach, bevor es ein Tool verwendet, das etwas ändert: Jedes Tool gibt an, ob es nur liest, schreibt oder löscht, und [{{value:mcpToolsPage}}](/docs/mcp/tools) zeigt, welches welches ist. Möchten Sie stattdessen das Plugin für Claude Code? Es bringt diesen Server mit – [{{value:skillsPage}}](/docs/skills).

Jede App, die Sie verbinden, steht unter [Verbundene Apps]({{value:connectedAppsUrl}}), in Motir unter Einstellungen → Konto → Tokens, mit ihrem Arbeitsbereich, ihren Berechtigungen und dem Zeitpunkt der letzten Verwendung. Widerrufen beendet den Zugriff bei der nächsten Anfrage.

## Andere Clients und CI: ein Token verwenden {#token-route}

Wählen Sie diesen Weg für einen Client ohne OAuth-Anmeldung, einen Agenten ohne Oberfläche oder eine CI-Pipeline. Es ist derselbe Server; ein persönliches Zugriffstoken ersetzt die Anmeldung.

## Dieser Server oder die REST-API? {#fork}

Beide sprechen mit denselben Daten und nehmen dieselben Zugangsdaten an. Sie sind für unterschiedliche Nutzer gebaut, und der entscheidende Unterschied ist, was jeder davon zusagt, wie sehr er sich unter Ihnen ändern darf.

|                | {{value:mcpPage}}                                                                                                                                           | {{value:apiPage}}                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Endpunkt**   | `POST {{value:endpointPath}}`                                                                                                                               | `/api/v1/…`                                                                                     |
| **Gebaut für** | Einen Agenten, den Sie steuern – er liest Tool-Beschreibungen zur Laufzeit.                                                                                 | Einen Client, den Sie ausliefern – Code, der einmal gegen eine feste Struktur geschrieben wird. |
| **Stabilität** | Änderungen sind zu erwarten. Eine Beschreibung umzuformulieren oder ein Argument umzubenennen ist die Art, wie das Verhalten eines Agenten abgestimmt wird. | Nur additiv. Eine inkompatible Änderung erzeugt `/api/v2`; v1 hält sein Versprechen.            |
| **Struktur**   | Dieselbe. MCP-Payloads werden aus den Antwortschemata von v1 abgeleitet, sodass beide nachweislich identische Objekte beschreiben.                          | Dieselbe, und sie ist die Quelle, aus der MCP ableitet.                                         |
| **Anmeldung**  | Ein persönliches Zugriffstoken, eine Menge von Scopes.                                                                                                      | Dieselben Zugangsdaten funktionieren bei beiden.                                                |

Sie binden einen Agenten an? Bleiben Sie hier. Sie schreiben Software, die andere installieren? Die [{{value:apiPage}}](/docs/api) ist die andere Hälfte – sie ist die, die verspricht, sich nicht unter Ihnen zu ändern.

## 1. Ein Token erstellen {#token}

Jede Anfrage trägt ein persönliches Zugriffstoken, das Sie in Motir unter Einstellungen → Konto → Tokens erstellen. Wählen Sie den Arbeitsbereich, an den es gebunden ist, und erteilen Sie ihm die kleinste Menge von Scopes, die den Zweck erfüllt – die Tabelle am Ende dieser Seite zeigt, was jeder Scope freigibt. Eine Berechtigung schränkt Ihre eigene Rolle ein und erweitert sie nie, sodass ein Token nie etwas tun kann, was Sie nicht tun könnten.

Das Geheimnis wird einmal angezeigt, beim Erstellen des Tokens. Kopieren Sie es dann; es gibt keine Möglichkeit, es erneut zu lesen, und ein verlorenes Token wird ersetzt statt wiederhergestellt.

## 2. Ihren Client einrichten {#wire}

Jeder Client braucht dieselben vier Angaben unter den Namen, die er dafür vergibt.

|               |                                                                         |
| ------------- | ----------------------------------------------------------------------- |
| **URL**       | `{{value:url}}`                                                         |
| **Transport** | Streamable HTTP – nicht SSE und kein stdio-Befehl                       |
| **Header**    | `{{value:authHeader}}: {{value:authScheme}} <token>`, bei jeder Anfrage |
| **Token**     | `{{value:tokenPlaceholder}}` – das, das Sie in Schritt 1 erstellt haben |

Halten Sie das Token aus einer Datei heraus, die Ihr Repository verfolgt. Wo ein Client es aus Ihrer Umgebung lesen oder bei Ihnen erfragen kann, nutzt der Block unten das statt eines Klartextwerts – deshalb nennen zwei davon `{{value:tokenEnvVar}}` statt eines Geheimnisses.

### Claude Code {#client-claude-code}

{{slot:client-claude-code}}

Oder ein Befehl: `{{value:claudeCodeTokenCommand}}` · [Dokumentation zu Claude Code]({{value:clientClaudeCodeDocsUrl}}) · Format geprüft am {{value:clientsCheckedOn}}

### Cursor {#client-cursor}

{{slot:client-cursor}}

Cursor ersetzt `${env:…}`, sodass das Token in Ihrer Umgebung bleibt und nicht in der Datei steht. · [Dokumentation zu Cursor]({{value:clientCursorDocsUrl}}) · Format geprüft am {{value:clientsCheckedOn}}

### VS Code {#client-vscode}

{{slot:client-vscode}}

VS Code fragt beim ersten Start des Servers nach dem Token und speichert es sicher – in die Datei wird nichts Geheimes geschrieben. · [Dokumentation zu VS Code]({{value:clientVscodeDocsUrl}}) · Format geprüft am {{value:clientsCheckedOn}}

### Codex CLI {#client-codex}

{{slot:client-codex}}

`{{value:codexTokenKey}}` nimmt den NAMEN der Variablen, nicht das Token. · [Dokumentation zu Codex CLI]({{value:clientCodexDocsUrl}}) · Format geprüft am {{value:clientsCheckedOn}}

### Jeder andere Streamable-HTTP-Client {#client-other}

{{slot:client-other}}

Windsurf, Zed, Cline, Goose oder etwas, das Sie selbst geschrieben haben – dieselben vier Angaben unter anderen Schlüsselnamen. · [Dokumentation zu jedem anderen Streamable-HTTP-Client]({{value:clientOtherDocsUrl}}) · Format geprüft am {{value:clientsCheckedOn}}

## 3. Die Verbindung prüfen {#check}

Starten Sie den Client neu und fragen Sie ihn, welche Tools er hat; der Server antwortet mit dem gesamten Katalog, zugeschnitten auf Ihre Berechtigung. Um den Endpunkt selbst zu prüfen, bevor ein Client ins Spiel kommt, fragen Sie ihn direkt – es ist derselbe Handshake, mit dem Token in Ihrer Umgebung.

{{slot:verify}}

**Eine Antwort „unauthorized“ betrifft das TOKEN, nicht die Einrichtung.** Ein fehlendes, fehlerhaftes, unbekanntes, widerrufenes oder abgelaufenes Token liefert bewusst jeweils dieselbe Ablehnung – würde man sie unterscheiden, würde der Endpunkt zu einem Orakel, das beantwortet, ob ein Geheimnis existiert. Prüfen Sie, dass der Header `{{value:authHeader}}` geschrieben ist, dass der Wert mit `{{value:authScheme}}` beginnt und dass das Token in Motir nicht widerrufen wurde.

## Was eine Verbindung aufrufen darf {#scopes}

Jedes Tool ist durch einen Scope geschützt. Die Berechtigungen, die Sie für eine verbundene App genehmigt haben, oder die Berechtigung eines Tokens entscheiden, welche Tools es aufrufen darf – die Liste, die Ihr Client anzeigt, ist also bereits auf Sie zugeschnitten. Sie werden beim Aufruf dieser Seite aus Motir selbst gelesen und entsprechen daher dem, was der Server gerade ausliefert.

{{part:what-next}}

[//]: # 'Placed after the scope table, which the page generates from the published catalogue.'

## Wie es weitergeht {#what-next}

[{{value:mcpToolsPage}}](/docs/mcp/tools) listet jedes Tool auf, das der Server bereitstellt, mit den Argumenten, die es entgegennimmt. [Die vollständige Referenz]({{value:referenceUrl}}) in motir-core enthält die vollständige Beschreibung jedes Tools. Dieselben Daten stattdessen vom Terminal aus zu steuern beschreibt die [{{value:cliPage}}](/docs/cli).

{{part:column-scope}}

[//]: # 'A heading of the scope table. Each of the five parts below is one short label that stays a single word or phrase, with no sentence around it.'

Scope

{{part:column-gates}}

Was er freigibt

{{part:column-default}}

Standard

{{part:granted}}

Erteilt

{{part:off-by-default}}

Standardmäßig aus

{{part:unreachable}}

[//]: # 'Shown in place of the scope table when the catalogue cannot be fetched. Keep `tools/list` literal.'

Die Scope-Tabelle ist vorübergehend nicht erreichbar. Sie wird aus dem Katalog abgeleitet, den Motir veröffentlicht, und nie hierher kopiert, sodass es derzeit nichts anzuzeigen gibt – ein `tools/list`-Handshake mit Ihrem eigenen Token beantwortet dieselbe Frage für dieses Token.
