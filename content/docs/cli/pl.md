---
source: 9091e5e2f59e
---

Motir CLI komunikuje się z tym samym serwerem MCP, z którego korzysta agent Motir. Automatyzuje pętlę planowania i wykonywania na tokenie przypisanym do obszaru roboczego: uruchomienie przejmuje następny gotowy element roboczy, pobiera wygenerowany przez serwer prompt i przekazuje agenta w piaskownicy, by go wykonał. Systemem źródłowym jest element roboczy; CLI jest tylko kierowcą.

{{part:meta}}

{{value:packageName}} · wersja {{value:packageVersion}} · liczba poleceń: {{value:commandCount}}

{{part:reference}}

## Instalacja {#install}

Node {{value:nodeRequirement}}. Zainstaluj go globalnie albo uruchom jednorazowo, bez instalowania.

{{slot:install}}

## Uwierzytelnianie {#authenticate}

Najkrótsza droga to przepływ urządzenia: pokazuje kod, otwiera Motir i czeka, aż go zatwierdzisz. Jeśli masz już osobisty token dostępu, przekaż go bezpośrednio. W obu przypadkach CLI łączy się z domyślnym serwerem ({{value:defaultServer}}), dopóki nie wskażesz innego.

{{slot:authenticate}}

Następnie powiąż folder z projektem i sprawdź konfigurację przed pierwszym uruchomieniem.

{{slot:link-and-check}}

## Polecenia {#commands}

Każde polecenie zarejestrowane w CLI, w kolejności, w jakiej wypisuje je `motir help`. Lista jest generowana z katalogu, który deklaruje sam plik binarny, więc nie może zostać w tyle za wydaniem. Opisuje pakiet {{value:packageName}}@{{value:packageVersion}}.

{{slot:commands}}

## Gdzie Motir trzyma swoje dane {#where-motir-keeps-things}

Trzy pliki, z których tylko jeden zawiera sekret — i nie jest to ten, który leży w Twoim repozytorium. Każdą ze ścieżek poniżej można przenieść; `motir help files` wypisuje je na podstawie zainstalowanego pliku binarnego, wraz ze zmienną, która przenosi dany plik.

- `~/.config/motir/config.json` **— sekret, nigdy nie zatwierdzaj w repozytorium**
  Magazyn poświadczeń: jedyny plik, do którego zapisywany jest osobisty token dostępu, z uprawnieniami `chmod 600` w katalogu `0700`, indeksowany adresem serwera, dzięki czemu jeden komputer może przechowywać tokeny do kilku serwerów Motir. Zawiera też skonfigurowane przez Ciebie polecenie agenta. Przenosisz go za pomocą `MOTIR_CONFIG_HOME` lub `XDG_CONFIG_HOME`.
- `.motir.json` **— bez sekretu, bezpiecznie zatwierdzać w repozytorium**
  Powiązanie z projektem w katalogu głównym obszaru roboczego: serwer, obszar roboczy i projekt, z którymi ten folder jest powiązany, oraz opcjonalna mapa zastępująca repozytoria. Nie zawiera żadnych poświadczeń, więc jego miejsce jest w kontroli wersji. Każde polecenie odnajduje go, idąc W GÓRĘ od bieżącego katalogu, dlatego dowolne polecenie działa z wnętrza dowolnego checkoutu pod katalogiem głównym.
- `~/.local/state/motir/session-excludes.json` **— bez sekretu**
  Lista wykluczeń sesji: elementy robocze, których przekazanie NIE POWIODŁO się, aby następne uruchomienie pomijało je zamiast ponownie wybierać ten sam błąd. To stan, a nie poświadczenie, dlatego nie leży obok tokenu — piaskownica montuje katalog konfiguracji tylko do odczytu, a uruchomienie nigdy nie może paść z powodu braku możliwości zapisu tego pliku. Jeśli zapis jest niemożliwy, Motir ostrzega raz i działa dalej. Przenosisz go za pomocą `MOTIR_STATE_HOME`.

## Gdzie działa uruchomienie {#where-a-run-executes}

Przekazany agent działa w kontenerze z Twoimi checkoutami i Twoim własnym poświadczeniem agenta. Co ten kontener zapewnia, czego odmawia jego token i na jakie błędy trafia pierwsze uruchomienie — to wszystko opisuje strona [{{value:sandboxPage}}](/docs/sandbox), więc nie powtarzamy tego tutaj. Podłączenie agenta do Motir bez CLI opisuje strona [{{value:mcpPage}}](/docs/mcp), a obsługę tej samej pętli pracy przez HTTP — strona [{{value:apiPage}}](/docs/api). Pełne omówienie poleceń — trzy kształty uruchomienia, gałęzie sesji, polityka błędów i rozwiązywanie problemów — znajdziesz w [docs/cli.md]({{value:cliReferenceUrl}}) w motir-core.

{{part:unreachable}}

Opis poleceń jest tymczasowo niedostępny. Jest generowany z katalogu, który deklaruje samo CLI, i nigdy nie jest tu kopiowany, więc na razie nie ma nic do pokazania — `motir help` wypisuje tę samą tabelę z zainstalowanego pliku binarnego.
