---
source: 9091e5e2f59e
---

Die Motir-CLI spricht mit demselben MCP-Server wie der Motir-Agent. Sie automatisiert die Schleife aus Planung und Ausführung über ein auf einen Arbeitsbereich beschränktes Token: Ein Lauf beansprucht das nächste bereite Arbeitselement, ruft den vom Server erzeugten Prompt ab und startet einen Agenten in einer Sandbox, der es ausführt. Das Arbeitselement ist das führende System; die CLI ist der Antrieb.

{{part:meta}}

{{value:packageName}} · Version {{value:packageVersion}} · {{value:commandCount}} Befehle

{{part:reference}}

## Installation {#install}

Node {{value:nodeRequirement}}. Installieren Sie sie global, oder führen Sie sie einmalig ohne Installation aus.

{{slot:install}}

## Anmeldung {#authenticate}

Der Geräte-Ablauf ist der kürzeste Weg: Er zeigt einen Code an, öffnet Motir und wartet, bis Sie ihn genehmigen. Wenn Sie bereits ein persönliches Zugriffstoken besitzen, übergeben Sie es stattdessen direkt. In beiden Fällen spricht die CLI mit {{value:defaultServer}}, sofern Sie sie nicht auf etwas anderes verweisen.

{{slot:authenticate}}

Verknüpfen Sie dann einen Ordner mit einem Projekt und prüfen Sie die Einrichtung vor dem ersten Lauf.

{{slot:link-and-check}}

## Befehle {#commands}

Jeder Befehl, den die CLI registriert, in der Reihenfolge, in der `motir help` sie ausgibt, erzeugt aus dem Katalog, den das Programm selbst deklariert – diese Liste kann also nicht hinter einem Release zurückbleiben. Sie beschreibt {{value:packageName}}@{{value:packageVersion}}.

{{slot:commands}}

## Wo Motir Dateien ablegt {#where-motir-keeps-things}

Drei Dateien, und nur eine davon enthält ein Geheimnis – es ist nicht die, die in Ihrem Repository liegt. Jeder Pfad unten lässt sich verlegen; `motir help files` gibt sie aus dem tatsächlich installierten Programm aus, mit der Variablen, die jeweils den Ort ändert.

- `~/.config/motir/config.json` **– geheim, niemals committen**
  Der Speicher für Zugangsdaten: die einzige Datei, in die ein persönliches Zugriffstoken jemals geschrieben wird, `chmod 600` in einem Verzeichnis mit `0700`, nach Server-URL geordnet, sodass ein Rechner Tokens für mehrere Motir-Server halten kann. Sie enthält auch den von Ihnen konfigurierten Agentenbefehl. Verlegen Sie sie mit `MOTIR_CONFIG_HOME` oder `XDG_CONFIG_HOME`.
- `.motir.json` **– kein Geheimnis, darf committet werden**
  Die Projektverknüpfung im Stammverzeichnis Ihres Arbeitsbereichs: der Server, der Arbeitsbereich und das Projekt, mit denen dieser Ordner verknüpft ist, dazu eine optionale Zuordnung zum Überschreiben von Repositorys. Sie enthält keine Zugangsdaten und gehört deshalb in die Versionsverwaltung. Jeder Befehl löst sie auf, indem er vom aktuellen Verzeichnis AUFWÄRTS sucht, sodass jeder Befehl aus jedem Checkout unterhalb des Stammverzeichnisses funktioniert.
- `~/.local/state/motir/session-excludes.json` **– kein Geheimnis**
  Die Ausschlussliste der Sitzung: die Arbeitselemente, deren Start FEHLGESCHLAGEN ist, damit der nächste Lauf an ihnen vorbeigeht, statt denselben Fehler erneut zu wählen. Das ist Zustand und keine Zugangsdaten, weshalb die Datei nicht neben dem Token liegt – die Sandbox bindet das Konfigurationsverzeichnis schreibgeschützt ein, und ein Lauf darf nie daran scheitern, dass er diese Datei nicht schreiben kann. Ist sie nicht beschreibbar, warnt Motir einmal und läuft weiter. Verlegen Sie sie mit `MOTIR_STATE_HOME`.

## Wo ein Lauf ausgeführt wird {#where-a-run-executes}

Ein gestarteter Agent läuft in einem Container mit Ihren Checkouts und Ihren eigenen Agent-Zugangsdaten. Was der Container bereitstellt, was sein Token verweigert und welche Fehler ein erster Lauf trifft, steht auf der Seite [{{value:sandboxPage}}](/docs/sandbox) und wird hier nicht wiederholt. Einen Agenten ohne die CLI mit Motir zu verbinden beschreibt [{{value:mcpPage}}](/docs/mcp), und dieselbe Arbeitsschleife über HTTP zu steuern die [{{value:apiPage}}](/docs/api). Die vollständige Befehlsreferenz – die drei Lauf-Varianten, Sitzungs-Branches, die Fehlerrichtlinie und die Fehlersuche – ist [docs/cli.md]({{value:cliReferenceUrl}}) in motir-core.

{{part:unreachable}}

Die Befehlsreferenz ist vorübergehend nicht erreichbar. Sie wird aus dem Katalog erzeugt, den die CLI selbst deklariert, und nie hierher kopiert, sodass es derzeit nichts anzuzeigen gibt – `motir help` gibt dieselbe Tabelle aus dem bei Ihnen installierten Programm aus.
