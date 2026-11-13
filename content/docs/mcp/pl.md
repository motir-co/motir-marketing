---
source: 2aa432672926
---

Motir udostępnia serwer Model Context Protocol — jeden endpoint streamable HTTP, który agenci i CLI wywołują, by czytać rdzeń zarządzania projektami i nim sterować. To ta sama powierzchnia, której używa agent Motir do wykonywania planu. Dodanie go do Claude wymaga jednego logowania i żadnego tokenu; dowolny inny klient lub potok łączy się z tokenem w trzech krokach.

## Dodaj Motir do Claude {#claude}

Logujesz się kontem Motir, wybierasz jeden obszar roboczy i zatwierdzasz, co Claude może w nim robić. Nic nie jest kopiowane ani wklejane — nie ma tokenu do utworzenia ani do przechowywania.

### claude.ai {#claude-ai}

1. Otwórz _Customize → Connectors_.
2. Kliknij „+”, potem _Add custom connector_ i wklej poniższy adres URL serwera. W polu _OAuth client_ wybierz _Use Claude’s published identity_ — claude.ai oznacza to jako _Detected_, ponieważ Motir to obsługuje. Pola _OAuth client ID_ i _secret_ zostaw puste — Motir nie potrzebuje żadnego z nich.
3. Kliknij _Add_, potem _Connect_. Claude przeniesie Cię do app.motir.co, gdzie się zalogujesz i zatwierdzisz.

{{slot:claude-ai}}

W planie Team lub Enterprise właściciel (_Owner_) dodaje konektor jednorazowo w _Organization settings → Connectors → Add → Custom → Web_, a następnie każdy członek klika _Connect_ w _Customize → Connectors_ ze swoim własnym kontem Motir. · [Dokumentacja claude.ai od Anthropic]({{value:routeClaudeAiDocsUrl}}) · kroki sprawdzono: {{value:routeClaudeAiCheckedOn}}

### Aplikacja Claude na komputer {#claude-desktop}

1. Jeśli Motir jest już połączony w claude.ai, nie musisz niczego dodawać: połączony konektor jest dostępny w Twoich rozmowach w sieci, w aplikacji na komputer i na telefonie.
2. Aby dodać go z aplikacji na komputer, wybierz w panelu bocznym _Customize_, potem _Connectors_ i wykonaj kroki z claude.ai z tym samym adresem URL.
3. Strona logowania Motir otworzy się w przeglądarce; zatwierdź tam i wróć do aplikacji.

{{slot:claude-desktop}}

To zdalny konektor, a nie lokalne rozszerzenie na komputer: Claude łączy się z Motir z chmury Anthropic, więc nic nie jest instalowane na Twoim komputerze. · [Dokumentacja aplikacji Claude na komputer od Anthropic]({{value:routeClaudeDesktopDocsUrl}}) · kroki sprawdzono: {{value:routeClaudeDesktopCheckedOn}}

### Claude Code {#claude-code}

1. Dodaj serwer poleceniem poniżej — bez nagłówka i bez tokenu.
2. W Claude Code uruchom `/mcp`, wybierz `motir` i dokończ logowanie w przeglądarce.

{{slot:claude-code}}

Jeśli zalogowano Claude Code kontem Claude, konektor połączony w claude.ai jest tam już dostępny. Plugin Motir do Claude Code przynosi ten serwer ze sobą, obok umiejętności. · [Dokumentacja Claude Code od Anthropic]({{value:routeClaudeCodeDocsUrl}}) · kroki sprawdzono: {{value:routeClaudeCodeCheckedOn}}

### Co zatwierdzasz i jak to cofnąć {#consent}

Strona logowania w Motir podaje nazwę aplikacji, która o to prosi, pozwala wybrać jeden obszar roboczy i wymienia uprawnienia, o które aplikacja prosi. Claude działa wtedy jako Ty w tym obszarze roboczym, w granicach tego, co zatwierdzisz — nigdy poza tym, na co pozwala Twoja własna rola.

Gdy claude.ai łączy się z opublikowaną tożsamością Claude, Motir sprawdza, że claude.ai ją publikuje, i pokazuje claude.ai jako zweryfikowaną domenę na stronie logowania oraz w sekcji Połączone aplikacje. Każdy inny klient MCP, który rejestruje się sam, jest oznaczony jako niezweryfikowany: wyświetlana przez niego nazwa jest nazwą, którą sam wybrał, a Motir nie może jej sprawdzić.

Claude pyta, zanim użyje narzędzia, które cokolwiek zmienia: każde narzędzie mówi, czy tylko czyta, zapisuje, czy usuwa, a strona [{{value:mcpToolsPage}}](/docs/mcp/tools) pokazuje, które jest które. Wolisz plugin do Claude Code? Przynosi ten serwer ze sobą — [{{value:skillsPage}}](/docs/skills).

Każda połączona aplikacja jest wymieniona w sekcji [Połączone aplikacje]({{value:connectedAppsUrl}}), w Ustawienia → Konto → Tokeny w Motir, razem z jej obszarem roboczym, uprawnieniami i czasem ostatniego użycia. Cofnięcie kończy jej dostęp przy następnym żądaniu.

## Inne klienty i CI: użyj tokenu {#token-route}

Wybierz tę drogę dla klienta bez logowania OAuth, agenta bez interfejsu albo potoku CI. To ten sam serwer; osobisty token dostępu zastępuje logowanie.

## Ten serwer czy REST API? {#fork}

Oba komunikują się z tymi samymi danymi i przyjmują to samo poświadczenie. Są zbudowane dla różnych odbiorców, a liczy się różnica w tym, co każde z nich obiecuje na temat zmian pod Twoimi nogami.

|                      | {{value:mcpPage}}                                                                                                 | {{value:apiPage}}                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Endpoint**         | `POST {{value:endpointPath}}`                                                                                     | `/api/v1/…`                                                                           |
| **Dla kogo**         | Agent, którym sterujesz — czyta opisy narzędzi w trakcie działania.                                               | Klient, który wydajesz — kod napisany raz pod stały kształt.                          |
| **Stabilność**       | Spodziewane są zmiany. Przeformułowanie opisu lub zmiana nazwy argumentu to sposób dostrajania zachowania agenta. | Tylko przyrostowe. Zmiana niezgodna wstecz tworzy `/api/v2`; v1 dotrzymuje obietnicy. |
| **Kształt**          | Taki sam. Ładunki MCP są wyprowadzane ze schematów odpowiedzi v1, więc oba opisują dowodnie identyczne obiekty.   | Taki sam, i jest źródłem, z którego wyprowadzany jest MCP.                            |
| **Uwierzytelnianie** | Jeden osobisty token dostępu, jeden zestaw zakresów.                                                              | To samo poświadczenie działa w obu.                                                   |

Podłączasz agenta? Zostań tutaj. Piszesz oprogramowanie, które instalują inni? Drugą połową jest [{{value:apiPage}}](/docs/api) — to ono obiecuje, że nie zmieni się pod Twoimi nogami.

## 1. Utwórz token {#token}

Każde żądanie niesie osobisty token dostępu, tworzony w Motir w Ustawienia → Konto → Tokeny. Wybierz obszar roboczy, do którego jest przypisany, i nadaj mu najwęższy zestaw zakresów, który wystarcza — tabela na dole tej strony mówi, co każdy zakres kontroluje. Nadanie zawęża Twoją własną rolę i nigdy jej nie rozszerza, więc token nigdy nie zrobi czegoś, czego nie mogłaby zrobić Twoja własna rola.

Sekret jest pokazywany raz, w chwili utworzenia tokenu. Skopiuj go wtedy; nie ma sposobu, by odczytać go ponownie, a zgubiony token się zastępuje, a nie odzyskuje.

## 2. Podłącz klienta {#wire}

Każdy klient potrzebuje tych samych czterech informacji, pod jakimikolwiek nazwami je nazywa.

|               |                                                                        |
| ------------- | ---------------------------------------------------------------------- |
| **URL**       | `{{value:url}}`                                                        |
| **Transport** | Streamable HTTP — nie SSE i nie polecenie stdio                        |
| **Nagłówek**  | `{{value:authHeader}}: {{value:authScheme}} <token>`, w każdym żądaniu |
| **Token**     | `{{value:tokenPlaceholder}}` — ten, który utworzono w kroku 1          |

Trzymaj token poza plikiem śledzonym przez Twoje repozytorium. Tam, gdzie klient potrafi odczytać go ze środowiska albo zapytać o niego, poniższy blok używa tego zamiast literału — dlatego dwa z nich wskazują `{{value:tokenEnvVar}}`, a nie sekret.

### Claude Code {#client-claude-code}

{{slot:client-claude-code}}

Albo jedno polecenie: `{{value:claudeCodeTokenCommand}}` · [Dokumentacja Claude Code]({{value:clientClaudeCodeDocsUrl}}) · format sprawdzono: {{value:clientsCheckedOn}}

### Cursor {#client-cursor}

{{slot:client-cursor}}

Cursor podstawia `${env:…}`, więc token zostaje w środowisku, poza plikiem. · [Dokumentacja Cursor]({{value:clientCursorDocsUrl}}) · format sprawdzono: {{value:clientsCheckedOn}}

### VS Code {#client-vscode}

{{slot:client-vscode}}

VS Code pyta o token przy pierwszym uruchomieniu serwera i przechowuje go bezpiecznie — do pliku nie jest zapisywane nic tajnego. · [Dokumentacja VS Code]({{value:clientVscodeDocsUrl}}) · format sprawdzono: {{value:clientsCheckedOn}}

### Codex CLI {#client-codex}

{{slot:client-codex}}

`{{value:codexTokenKey}}` przyjmuje NAZWĘ zmiennej, a nie token. · [Dokumentacja Codex CLI]({{value:clientCodexDocsUrl}}) · format sprawdzono: {{value:clientsCheckedOn}}

### Dowolny inny klient streamable HTTP {#client-other}

{{slot:client-other}}

Windsurf, Zed, Cline, Goose albo coś, co napisano samodzielnie — te same cztery informacje pod innymi nazwami kluczy. · [Dokumentacja dowolnego innego klienta streamable HTTP]({{value:clientOtherDocsUrl}}) · format sprawdzono: {{value:clientsCheckedOn}}

## 3. Sprawdź połączenie {#check}

Uruchom klienta ponownie i zapytaj, jakie ma narzędzia; serwer odpowiada pełnym katalogiem, ograniczonym do Twojego nadania. Aby sprawdzić sam endpoint, zanim zaangażujesz klienta, zapytaj go bezpośrednio — to ten sam handshake, z tokenem w Twoim środowisku.

{{slot:verify}}

**Odpowiedź o braku autoryzacji dotyczy TOKENU, a nie okablowania.** Brakujący, błędnie zbudowany, nieznany, unieważniony i wygasły token zwracają tę samą odmowę, celowo — rozróżnianie ich zmieniłoby endpoint w wyrocznię, która odpowiada, czy dany sekret istnieje. Sprawdź, czy nagłówek jest zapisany jako `{{value:authHeader}}`, czy wartość zaczyna się od `{{value:authScheme}}` i czy token nie został unieważniony w Motir.

## Co może wywołać połączenie {#scopes}

Każde narzędzie jest kontrolowane przez zakres. O tym, które narzędzia może wywołać, decydują uprawnienia zatwierdzone dla połączonej aplikacji albo nadanie, które niesie token — więc lista, którą pokazuje Twój klient, jest już ograniczona do Ciebie. Zakresy są odczytywane z samego Motir w chwili żądania tej strony, więc to jest to, co serwer wydaje w tej chwili.

{{part:what-next}}

[//]: # 'Placed after the scope table, which the page generates from the published catalogue.'

## Co dalej {#what-next}

Strona [{{value:mcpToolsPage}}](/docs/mcp/tools) wymienia każde narzędzie udostępniane przez serwer wraz z przyjmowanymi argumentami. [Pełna dokumentacja]({{value:referenceUrl}}) w motir-core zawiera kompletny opis każdego narzędzia. Obsługę tych samych danych z terminala zamiast tego opisuje strona [{{value:cliPage}}](/docs/cli).

{{part:column-scope}}

[//]: # 'A heading of the scope table. Each of the five parts below is one short label that stays a single word or phrase, with no sentence around it.'

Zakres

{{part:column-gates}}

Co kontroluje

{{part:column-default}}

Domyślnie

{{part:granted}}

Przyznany

{{part:off-by-default}}

Domyślnie wyłączony

{{part:unreachable}}

[//]: # 'Shown in place of the scope table when the catalogue cannot be fetched. Keep `tools/list` literal.'

Tabela zakresów jest tymczasowo niedostępna. Jest wyprowadzana z katalogu publikowanego przez Motir i nigdy nie jest tu kopiowana, więc na razie nie ma nic do pokazania — handshake `tools/list` z Twoim własnym tokenem odpowiada na to samo pytanie dla tego tokenu.
