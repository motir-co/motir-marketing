---
source: 410c4c87d2ef
---

Ein öffentliches Projekt antwortet unter seiner eigenen Adresse auf `motir.co` und kann zusätzlich unter einer Domain antworten, die Ihnen bereits gehört. Unabhängig davon kann ein Arbeitsbereich einen eigenen Namen unter `motir.site` beanspruchen.

## Ihre Motir-Adresse {#your-motir-address}

Jedes öffentliche Projekt antwortet unter `motir.co/p/ROADMAP` für ein Projekt mit dem Schlüssel `ROADMAP`. Es gibt nichts zu beanspruchen: Die Adresse ergibt sich aus dem Schlüssel des Projekts und ist in jedem Plan enthalten.

## Der Name Ihres Arbeitsbereichs {#your-workspace-name}

Ein Arbeitsbereich kann einen Namen unter `motir.site` beanspruchen – aus `acme` wird also `acme.motir.site`. Unter diesem Namen antworten die Anwendungen, die Motir für Ihren Arbeitsbereich hostet: Die Adresse selbst zeigt die Standardanwendung des Arbeitsbereichs oder eine Seite, die sagt, dass es hier noch keine Anwendung gibt. **Öffentliche Projekte antworten nie darunter** – ein Projekt bleibt unter seiner `motir.co`-Adresse.

Ein Inhaber oder Administrator des Arbeitsbereichs beansprucht den Namen in den _Einstellungen des Arbeitsbereichs_ unter _Öffentliche Adresse_. Die Projekteinstellungen zeigen ihn schreibgeschützt an, mit einem Link dorthin.

Ein Name besteht aus Kleinbuchstaben, Ziffern und einzelnen Bindestrichen und ist drei bis dreiundsechzig Zeichen lang. Eine kleine Menge von Namen ist für die eigenen Hosts von Motir reserviert, ebenso Namen, die ein Leser damit verwechseln könnte.

Ein Arbeitsbereich hat einen Namen oder keinen. **Es gibt keine Aliase, und nichts leitet weiter:** Wenn Sie den Namen umbenennen oder freigeben, antwortet die alte Adresse sofort nicht mehr, und bereits geteilte Links darauf funktionieren nicht mehr.

- **Eine Änderung alle 30 Tage.** Eine Umbenennung und eine Freigabe zählen jeweils als eine Änderung, freigeben und neu beanspruchen umgeht die Grenze also nicht. Solange eine Änderung noch nicht erlaubt ist, zeigt der Bereich das Datum, ab dem sie es ist.
- **Ein Name, den Sie aufgeben, wird zurückgehalten – außer Sie haben ihn gerade erst beansprucht.** Ein Name, den Sie weniger als 24 Stunden hatten, geht sofort zurück in den Pool. Ein Name, den Sie 24 Stunden oder länger hatten, wird 90 Tage zurückgehalten, damit niemand sonst Links übernehmen kann, die auf Sie zeigten; der Bestätigungsdialog nennt das genaue Datum, ab dem er wieder frei ist.

## Eigene Domain verbinden {#connecting-your-own-domain}

Eine eigene Domain zu verbinden ist in den kostenpflichtigen Plänen möglich – siehe [unsere Pläne](/). Ihre `motir.co`-Adresse ist in jedem Plan enthalten und funktioniert in beiden Fällen weiter.

Eine verbundene Domain stellt _ein_ Projekt unter ihrem Stamm bereit: `roadmap.acme.com/` ist die Seite dieses Projekts und `roadmap.acme.com/changelog` sein Changelog. Das Live-Board, die Arbeitselemente und die Roadmap befinden sich in der Motir-App, und die dortigen Links führen hierher.

Bei Ihrem Registrar legen Sie zwei Arten von Einträgen an. **Fügen Sie zuerst die Domain hinzu**, in den Projekteinstellungen unter _Öffentliche Adresse_: Der Bereich listet dann jeden Eintrag auf, den diese Domain braucht, mit seinem genauen Wert und einer Kopierschaltfläche. Die unten gezeigten Formen sind das, was Sie erwarten können – lesen Sie sie, um zu prüfen, ob Ihr Registrar sie anlegen kann, und entnehmen Sie die Werte dem Bereich.

### 1 · Die Domain auf uns verweisen {#point-the-domain-at-us}

Für eine **Subdomain** wie `roadmap.acme.com` genügt ein `CNAME`:

| Typ     | Name      | Wert                 |
| ------- | --------- | -------------------- |
| `CNAME` | `roadmap` | im Bereich angezeigt |

Für eine **Stammdomain** wie `acme.com` stattdessen ein `A` und ein `AAAA` – eine Stammdomain kann keinen `CNAME` tragen, weil sie bereits die Einträge `MX` und `TXT` führt, auf die Ihre E-Mail und Ihre anderen Dienste angewiesen sind:

| Typ    | Name | Wert                 |
| ------ | ---- | -------------------- |
| `A`    | `@`  | im Bereich angezeigt |
| `AAAA` | `@`  | im Bereich angezeigt |

Kopieren Sie jeden Wert aus dem Bereich und von nirgendwo sonst. Dies sind die Adressen, unter denen Motir ausgeliefert wird, gelesen von der Plattform, auf der wir laufen, und sie können sich ändern – der Bereich ändert sich mit ihnen, eine Seite wie diese nicht.

> Bietet Ihr DNS-Anbieter am Eintrag einen Schalter „Proxy“ oder „Cloud“ an, schalten Sie ihn aus: Ein Proxy vor dem Eintrag verbirgt Ihre Domain vor der Prüfung, und das Zertifikat kann nicht ausgestellt werden.

### 2 · Nachweisen, dass die Domain Ihnen gehört {#prove-the-domain-is-yours}

Neben dem Verweis-Eintrag listet der Bereich einen `TXT`-Eintrag mit einem Token auf, in dieser Form:

| Typ   | Name                    | Wert             |
| ----- | ----------------------- | ---------------- |
| `TXT` | `_motir-verify.roadmap` | `motir-verify=…` |

Kopieren Sie den Wert aus dem Bereich und nicht von hier – das Token gehört nur Ihnen. Wählen Sie dann _Verifizieren_. Sobald wir den Eintrag sehen, fordern wir ein Zertifikat an, was meist ein bis zwei Minuten dauert. Sie können die Seite schließen; der Status schreitet von selbst voran, und die Einträge bleiben unter _DNS-Einträge anzeigen_ verfügbar.

## Was jeder Status bedeutet {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Status            | Was er bedeutet                                                                                                                                                | Was zu tun ist                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Nicht verifiziert | Wir haben Ihren Eigentumsnachweis noch nicht gesehen. Bei der Zertifizierungsstelle wurde noch nichts angefordert.                                             | Legen Sie den TXT-Eintrag unten an und wählen Sie dann Erneut prüfen.                     |
| Wird geprüft…     | Wir suchen gerade nach dem Eigentumsnachweis. DNS-Änderungen können einige Minuten brauchen, bis sie sich verbreiten.                                          | Warten Sie einen Moment. Er rückt von selbst weiter.                                      |
| Wird ausgestellt… | Das Eigentum ist nachgewiesen und das Zertifikat angefordert. Das dauert meist ein bis zwei Minuten.                                                           | Nichts. Motir erledigt den Rest.                                                          |
| Live              | Das Zertifikat ist ausgestellt, und Ihre Domain stellt das Projekt bereit. Es wird automatisch erneuert.                                                       | Sie können diese Adresse zur primären machen.                                             |
| Fehlgeschlagen    | Das Zertifikat konnte nicht ausgestellt werden. Der Grund steht neben dem Status – meist ein fehlender Eintrag oder einer, der woandershin verweist.           | Vergleichen Sie Ihre Einträge mit den unten genannten und wählen Sie dann Erneut prüfen.  |
| Abgelaufen        | Das Zertifikat ist abgelaufen, und die Erneuerung ist fehlgeschlagen – fast immer, weil sich ein DNS-Eintrag geändert hat. Die Domain wird nicht ausgeliefert. | Stellen Sie die Einträge wieder so her, wie sie waren, und wählen Sie dann Erneut prüfen. |
| Widerrufen        | Das Zertifikat wurde zurückgezogen. Die Domain wird nicht ausgeliefert.                                                                                        | Wählen Sie Erneut anfordern, um ein neues Zertifikat zu starten.                          |

## Welche Adresse die maßgebliche ist {#which-address-is-the-real-one}

Ein Projekt kann unter mehreren Adressen antworten, und genau eine davon ist die _primäre_ – die, die Suchmaschinen und Link-Vorschauen in sozialen Netzwerken mitgeteilt wird. Sobald das Zertifikat einer verbundenen Domain live ist, können Sie sie zur primären machen; bis dahin ist es die Motir-Adresse.

**Jede andere Adresse leitet auf die primäre weiter.** Das schließt Ihre `motir.co`-Adresse ein, sobald Sie eine eigene Domain hochgestuft haben. Besucher landen immer an einem Ort, der funktioniert, und eine Suchmaschine sieht eine Seite statt dreier Kopien, die miteinander konkurrieren.

## Eine Domain entfernen {#removing-a-domain}

Das Entfernen einer verbundenen Domain zieht ihr Zertifikat zurück, und die Adresse antwortet nicht mehr – wer sie verwendet, erhält einen Fehler, und bereits weitergegebene Links dorthin funktionieren nicht mehr. Ihr Projekt bleibt unter seinen anderen Adressen öffentlich, das Entfernen einer Domain macht ein Projekt also nie privat.

## Wenn etwas nicht funktioniert {#if-something-is-not-working}

Drei Fehler erklären fast jeden Ausfall, und jeder zeigt sich im Bereich anders.

- **Ein CNAME auf einer Stammdomain.** Die meisten Registrare akzeptieren ihn, und er funktioniert nicht. Das Symptom ist eine Domain, die auf `Not verified` bleibt oder `Failed` erreicht. Verwenden Sie stattdessen die oben genannten Einträge `A` und `AAAA`.
- **Ein Proxy-DNS-Anbieter vor dem Eintrag.** Bietet Ihr Anbieter an, den Datenverkehr zu proxen oder zu beschleunigen, verbirgt das den echten Eintrag vor uns. Das Symptom ist `Checking…`, das sich nie auflöst. Schalten Sie den Proxy für diese Einträge aus.
- **Ein veralteter Eigentumsnachweis.** Wenn Sie eine Domain entfernt und erneut hinzugefügt haben, hat sich das Token geändert. Das Symptom ist `Not verified`, obwohl ein `TXT`-Eintrag offensichtlich vorhanden ist. Ersetzen Sie seinen Wert durch den, den der Bereich jetzt anzeigt.
