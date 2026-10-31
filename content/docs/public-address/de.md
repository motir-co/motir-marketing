---
source: 331d263ce3e1
---

Ein öffentliches Projekt antwortet unter seiner eigenen Adresse auf `motir.co`. Unabhängig davon kann ein Arbeitsbereich einen eigenen Namen unter `motir.site` beanspruchen und seine gehostete Anwendung unter einer Domain bereitstellen, die ihm bereits gehört.

## Ihre Motir-Adresse {#your-motir-address}

Jedes öffentliche Projekt antwortet unter `motir.co/p/ROADMAP` für ein Projekt mit dem Schlüssel `ROADMAP`. Es gibt nichts zu beanspruchen: Die Adresse ergibt sich aus dem Schlüssel des Projekts und ist in jedem Plan enthalten.

## Der Name Ihres Arbeitsbereichs {#your-workspace-name}

Ein Arbeitsbereich kann einen Namen unter `motir.site` beanspruchen – aus `acme` wird also `acme.motir.site`. Unter diesem Namen antworten die Anwendungen, die Motir für Ihren Arbeitsbereich hostet: Die Adresse selbst zeigt die Standardanwendung des Arbeitsbereichs oder eine Seite, die sagt, dass es hier noch keine Anwendung gibt. **Öffentliche Projekte antworten nie darunter** – ein Projekt bleibt unter seiner `motir.co`-Adresse.

Ein Inhaber oder Administrator des Arbeitsbereichs beansprucht den Namen in den _Einstellungen des Arbeitsbereichs_ unter _Öffentliche Adresse_. Die Projekteinstellungen zeigen ihn schreibgeschützt an, mit einem Link dorthin.

Ein Name besteht aus Kleinbuchstaben, Ziffern und einzelnen Bindestrichen und ist drei bis dreiundsechzig Zeichen lang. Eine kleine Menge von Namen ist für die eigenen Hosts von Motir reserviert, ebenso Namen, die ein Leser damit verwechseln könnte.

Ein Arbeitsbereich hat einen Namen oder keinen. **Es gibt keine Aliase, und nichts leitet weiter:** Wenn Sie den Namen umbenennen oder freigeben, antwortet die alte Adresse sofort nicht mehr, und bereits geteilte Links darauf funktionieren nicht mehr.

- **Eine Änderung alle 30 Tage.** Eine Umbenennung und eine Freigabe zählen jeweils als eine Änderung, freigeben und neu beanspruchen umgeht die Grenze also nicht. Solange eine Änderung noch nicht erlaubt ist, zeigt der Bereich das Datum, ab dem sie es ist.
- **Ein Name, den Sie aufgeben, wird zurückgehalten – außer Sie haben ihn gerade erst beansprucht.** Ein Name, den Sie weniger als 24 Stunden hatten, geht sofort zurück in den Pool. Ein Name, den Sie 24 Stunden oder länger hatten, wird 90 Tage zurückgehalten, damit niemand sonst Links übernehmen kann, die auf Sie zeigten; der Bestätigungsdialog nennt das genaue Datum, ab dem er wieder frei ist.

## Ihre eigene Domain {#your-own-domain}

Eine Domain, die Ihnen gehört, etwa `shop.acme.com`, kann mit der gehosteten Anwendung Ihres Arbeitsbereichs antworten – gleich, auf welchem Ziel sie läuft. Eigene Domains sind in kostenpflichtigen Plänen enthalten – siehe [unsere Pläne](/). Ein Inhaber oder Administrator des Arbeitsbereichs fügt sie hinzu und entfernt sie; alle anderen im Arbeitsbereich sehen sie schreibgeschützt. Die `motir.co`-Adressen Ihrer Projekte und der `motir.site`-Name Ihres Arbeitsbereichs funktionieren so oder so weiter.

## Die Domain hinzufügen {#add-the-domain}

Fügen Sie die Domain in den _Einstellungen des Arbeitsbereichs_ unter _Eigene Domains_ hinzu. Auch der Bereich _Öffentliche Adresse_ verweist dorthin, mit _Stattdessen eine eigene Domain verwenden_.

Wählen Sie beim Hinzufügen, welche Anwendung des Arbeitsbereichs sie bereitstellt. Eine Domain stellt genau eine Anwendung bereit. Welche, können Sie später in der Zeile der Domain mit _Anwendung ändern_ ändern. Ein Arbeitsbereich, der noch keine gehostete Anwendung hat, kann trotzdem eine Domain hinzufügen: Sie wird ohne Anwendung hinzugefügt und stellt nichts bereit, bis Sie eine wählen.

## Die Einträge, die Sie anlegen {#the-records-you-create}

Sobald die Domain hinzugefügt ist, listet der Bereich jeden Eintrag auf, den sie braucht, mit seinem genauen Wert und einer Kopierschaltfläche an jedem, und hält sie unter _DNS-Einträge anzeigen_ bereit. Die folgenden Formen zeigen, was Sie erwartet – prüfen Sie damit, ob Ihr Registrar sie anlegen kann, und übernehmen Sie die Werte aus dem Bereich.

Zuerst ein `TXT`-Eintrag, der nachweist, dass die Domain Ihnen gehört. Sein Name ist `_motir-verify.`, gefolgt von Ihrer Domain; die meisten Registrare wollen nur den Teil vor Ihrer Stammdomain, wie hier:

| Typ   | Name                 | Wert                      |
| ----- | -------------------- | ------------------------- |
| `TXT` | `_motir-verify.shop` | wird im Bereich angezeigt |

Das Token darin gehört nur Ihnen, kopieren Sie es also aus dem Bereich und nicht von anderswo.

Dann ein Eintrag, der die Domain auf Motir verweist. Für eine **Subdomain** wie `shop.acme.com` ein `CNAME`:

| Typ     | Name   | Wert                      |
| ------- | ------ | ------------------------- |
| `CNAME` | `shop` | wird im Bereich angezeigt |

Für eine **Stammdomain** wie `acme.com` stattdessen ein `A` und ein `AAAA` – eine Stammdomain kann keinen `CNAME` tragen, weil sie bereits die `MX`- und `TXT`-Einträge trägt, von denen Ihre E-Mail und Ihre anderen Dienste abhängen. Dasselbe gilt für eine Domain direkt unter einem öffentlichen Suffix aus mehr als einem Teil, etwa `acme.co.uk`; der Bereich weiß, welche Art Ihre ist, und listet die richtigen Einträge auf.

| Typ    | Name | Wert                      |
| ------ | ---- | ------------------------- |
| `A`    | `@`  | wird im Bereich angezeigt |
| `AAAA` | `@`  | wird im Bereich angezeigt |

Diese Adressen gehören Motir selbst und werden für Kundendomains vorgehalten. Ändern sie sich je, ändert sich der Bereich mit ihnen – eine Seite wie diese nicht.

> Wenn Ihr DNS-Anbieter am Eintrag einen „Proxy“- oder „Cloud“-Schalter anbietet, schalten Sie ihn aus: Ein Proxy vor dem Eintrag verbirgt Ihre Domain vor der Prüfung, und das Zertifikat kann nicht ausgestellt werden.

Wählen Sie dann _Jetzt prüfen_. Sobald wir den Inhaberschaftseintrag sehen, fordern wir ein Zertifikat an, was meist einige Minuten dauert. Sie können die Seite schließen; der Status bewegt sich von selbst weiter.

## Was jeder Status bedeutet {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Status          | Was er bedeutet                                                                                                                                                                                          | Was zu tun ist                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Nicht bestätigt | Wir haben Ihren Inhaberschaftseintrag noch nicht gesehen. Bei der Zertifizierungsstelle wurde nichts angefordert, und die Domain antwortet nicht.                                                        | Legen Sie die Einträge an, die der Bereich auflistet, und wählen Sie dann Jetzt prüfen.                 |
| Ausstehend      | Wir suchen gerade nach Ihrem Inhaberschaftseintrag. DNS-Änderungen können einige Minuten brauchen, bis sie sich verbreiten.                                                                              | Warten Sie einen Moment. Er rückt von selbst weiter.                                                    |
| Ausstehend      | Die Inhaberschaft ist bestätigt, und das Zertifikat wird ausgestellt. Das dauert meist einige Minuten.                                                                                                   | Nichts. Die Seite aktualisiert sich von selbst.                                                         |
| Ausgestellt     | Das Zertifikat ist ausgestellt, und Ihre Domain antwortet. Es wird automatisch erneuert.                                                                                                                 | Nichts.                                                                                                 |
| Fehlgeschlagen  | „Wir sehen Ihren Inhaberschaftseintrag nicht mehr.“ Der `TXT`-Eintrag enthält Ihr Token nicht mehr, daher antwortet die Domain nicht mehr.                                                               | Stellen Sie den `TXT`-Eintrag wieder her, den der Bereich anzeigt, und wählen Sie dann Erneut prüfen.   |
| Fehlgeschlagen  | „_Ihre Domain_ zeigt nicht mehr auf Motir.“ Ihr `A`-, `AAAA`- oder `CNAME`-Eintrag wurde geändert oder entfernt, daher antwortet die Domain nicht mehr.                                                  | Setzen Sie den Eintrag auf den Wert zurück, den der Bereich anzeigt, und wählen Sie dann Erneut prüfen. |
| Fehlgeschlagen  | „Das Zertifikat konnte nicht ausgestellt werden.“ Die Zertifizierungsstelle hat es abgelehnt; der Bereich zeigt ihre eigene Begründung daneben.                                                          | Beheben Sie, was die Begründung nennt – meist ein fehlender Eintrag – und wählen Sie dann Wiederholen.  |
| Fehlgeschlagen  | „Das Zertifikat konnte nicht ausgestellt werden.“ Das Zertifikat ist abgelaufen, und die Erneuerung ist fehlgeschlagen – fast immer, weil sich ein DNS-Eintrag geändert hat. Die Domain antwortet nicht. | Stellen Sie die Einträge so wieder her, wie der Bereich sie anzeigt, und wählen Sie dann Wiederholen.   |
| Fehlgeschlagen  | „Das Zertifikat konnte nicht ausgestellt werden.“ Das Zertifikat wurde zurückgezogen. Die Domain antwortet nicht.                                                                                        | Wählen Sie Wiederholen, um ein neues Zertifikat zu starten.                                             |

Nur eine Domain mit dem Status _Ausgestellt_ antwortet überhaupt.

## Was Ihre Domain bereitstellt {#what-your-domain-serves}

Sobald ihr Zertifikat ausgestellt ist, beantwortet Motirs Edge Ihre Domain: Sie leitet jede Anfrage – Pfad, Query, Body und Cookies – an die Anwendung weiter, die die Domain nennt, und gibt deren eigene Antwort zurück. Was ein Besucher sieht, hängt von der Anwendung ab:

- **Ihre Anwendung selbst**, wenn sie veröffentlicht und für alle geöffnet ist.
- **Eine Seite, die sagt, dass hier noch nichts veröffentlicht ist**, wenn die Domain keine Anwendung nennt oder die Anwendung noch nicht veröffentlicht wurde.
- **Eine Seite, die sagt, dass die Website nur für Mitglieder ist**, wenn die Anwendung nur ihren Mitgliedern offensteht. Mitglieder erreichen sie unter ihrer `motir.site`-Adresse, auf die die Seite verlinkt, wenn es eine gibt. Derzeit steht jede gehostete Anwendung nur ihren Mitgliedern offen – die Einstellung, die eine Anwendung für alle öffnet, gibt es noch nicht –, daher zeigt eine Domain, die eine veröffentlichte Anwendung nennt, vorerst diese Seite statt der Anwendung.
- **Eine Seite, die sagt, dass die Website gerade nicht erreichbar ist**, wenn die Anwendung auf einem Ziel läuft, an das die Edge noch nicht weiterleiten kann. Sie antwortet wieder, sobald die Edge es kann.
- **Eine schlichte Nicht-gefunden-Seite** für jeden anderen Grund, auch für eine entfernte Domain. Es ist dieselbe Seite, gleich aus welchem Grund, sie verrät einem Besucher also nie, welcher zutraf.

Keine dieser Seiten trägt Motirs eigene Website um sich herum, und keine wird von Suchmaschinen indexiert.

Motir fügt auf Ihrer Domain keine eigene Weiterleitung, keinen Canonical-Link, keine Robots-Datei und keine Sitemap hinzu. Ihre Anwendung legt ihre eigenen fest.

## Zwei Domains in einem Arbeitsbereich {#two-domains-on-one-workspace}

Ein Arbeitsbereich kann mehr als eine Domain verbinden, bis zu dem, was sein Plan enthält. Jede nennt ihre eigene Anwendung, gewählt in ihrer eigenen Zeile. Motir stellt keine über die anderen und leitet zwischen keinen weiter: Jede antwortet für sich, mit der Anwendung, die sie nennt.

## Eine Domain entfernen {#removing-a-domain}

Wählen Sie _Entfernen_ in der Zeile der Domain. Die Domain stellt Ihre Anwendung innerhalb von etwa einer halben Minute nicht mehr bereit und antwortet ab dann mit der Nicht-gefunden-Seite. Nichts wird reserviert: Sie können sie später wieder hinzufügen, und ein anderer Arbeitsbereich kann sie hinzufügen, sobald er die Inhaberschaft mit einem eigenen `TXT`-Eintrag nachweist. Die Einträge bei Ihrem DNS-Anbieter zu löschen ist Ihre Sache. Das Entfernen einer Domain ändert nichts an der Anwendung, die unter ihren anderen Adressen weiter antwortet.

## Wenn etwas nicht funktioniert {#if-something-is-not-working}

Vier Fehler erklären fast jeden Ausfall, und jeder zeigt sich im Bereich anders.

- **Ein CNAME auf einer Stammdomain.** Die meisten Registrare akzeptieren ihn, und er funktioniert nicht. Das Symptom ist eine Domain, die auf _Ausstehend_ bleibt oder _Fehlgeschlagen_ erreicht. Verwenden Sie stattdessen die oben genannten Einträge `A` und `AAAA`.
- **Ein Proxy-DNS-Anbieter vor dem Eintrag.** Bietet Ihr Anbieter an, den Datenverkehr zu proxen oder zu beschleunigen, verbirgt das den echten Eintrag vor uns. Das Symptom ist _Ausstehend_, das sich nie auflöst. Schalten Sie den Proxy für diese Einträge aus.
- **Ein veralteter Inhaberschaftseintrag.** Wenn Sie eine Domain entfernt und erneut hinzugefügt haben, hat sich das Token geändert. Das Symptom ist _Nicht bestätigt_, obwohl ein `TXT`-Eintrag offensichtlich vorhanden ist. Ersetzen Sie seinen Wert durch den, den der Bereich jetzt anzeigt.
- **Ein später gelöschter Inhaberschaftseintrag.** Eine aktive Domain, deren `TXT`-Eintrag verschwindet, antwortet weiter, bis unsere regelmäßige Prüfung es bemerkt, was innerhalb von etwa einer Stunde geschieht; dann wechselt sie zu _Fehlgeschlagen_ und antwortet nicht mehr. Stellen Sie den Eintrag wieder her und wählen Sie Erneut prüfen.
