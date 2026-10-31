---
source: 331d263ce3e1
---

Projekt publiczny odpowiada pod własnym adresem w `motir.co`. Niezależnie od tego obszar roboczy może zająć jedną własną nazwę w `motir.site` i udostępniać swoją hostowaną aplikację w domenie, którą już posiada.

## Twój adres Motir {#your-motir-address}

Każdy projekt publiczny odpowiada pod `motir.co/p/ROADMAP` dla projektu z kluczem `ROADMAP`. Nie ma czego zajmować: adres wynika z klucza projektu i jest wliczony w każdy plan.

## Nazwa Twojego obszaru roboczego {#your-workspace-name}

Obszar roboczy może zająć jedną nazwę w `motir.site` — więc `acme` daje `acme.motir.site`. Pod tą nazwą odpowiadają aplikacje, które Motir hostuje dla Twojego obszaru roboczego: sam adres pokazuje domyślną aplikację obszaru roboczego albo stronę informującą, że nie ma tu jeszcze żadnej aplikacji. **Projekty publiczne nigdy pod nią nie odpowiadają** — projekt pozostaje pod swoim adresem `motir.co`.

Nazwę zajmuje właściciel lub administrator obszaru roboczego, w sekcji _Ustawienia obszaru roboczego_, pod _Adres publiczny_. Ustawienia projektu pokazują ją tylko do odczytu, z linkiem do tego miejsca.

Nazwa składa się z małych liter, cyfr i pojedynczych łączników i ma od trzech do sześćdziesięciu trzech znaków. Niewielki zestaw nazw jest zarezerwowany dla własnych hostów Motir oraz dla nazw, które czytelnik mógłby z nimi pomylić.

Obszar roboczy ma jedną nazwę albo żadnej. **Nie ma aliasów i nic nie przekierowuje:** gdy zmienisz nazwę lub ją zwolnisz, stary adres od razu przestaje odpowiadać, a udostępnione już do niego linki przestają działać.

- **Jedna zmiana na 30 dni.** Zmiana nazwy i zwolnienie liczą się każde jako jedna zmiana, więc zwolnienie i ponowne zajęcie nie obchodzi tego limitu. Dopóki zmiana nie jest jeszcze dozwolona, panel pokazuje datę, od której będzie.
- **Nazwa, którą oddajesz, jest wstrzymywana — chyba że dopiero co ją zająłeś.** Nazwa trzymana krócej niż 24 godziny od razu wraca do puli. Nazwa trzymana 24 godziny lub dłużej jest wstrzymywana na 90 dni, aby nikt inny nie przejął linków, które prowadziły do Ciebie; okno potwierdzenia podaje dokładną datę, od której znów jest wolna.

## Twoja własna domena {#your-own-domain}

Domena, którą posiadasz, na przykład `shop.acme.com`, może odpowiadać hostowaną aplikacją Twojego obszaru roboczego, niezależnie od tego, na jakim celu ta aplikacja działa. Własne domeny są dostępne w płatnych planach — zobacz [nasze plany](/). Dodaje je i usuwa właściciel lub administrator obszaru roboczego; pozostali członkowie obszaru roboczego widzą je tylko do odczytu. Adresy `motir.co` Twoich projektów i nazwa `motir.site` Twojego obszaru roboczego działają tak czy inaczej.

## Dodawanie domeny {#add-the-domain}

Dodaj domenę w sekcji _Ustawienia obszaru roboczego_, pod _Własne domeny_. Panel _Adres publiczny_ również tam prowadzi, przez _Użyj zamiast tego własnej domeny_.

Przy dodawaniu wybierz, którą aplikację obszaru roboczego ma udostępniać. Domena udostępnia dokładnie jedną aplikację. Którą — możesz zmienić później w wierszu domeny, przez _Zmień aplikację_. Obszar roboczy, który nie ma jeszcze hostowanej aplikacji, i tak może dodać domenę: zostaje dodana bez aplikacji i nic nie udostępnia, dopóki jej nie wybierzesz.

## Rekordy, które tworzysz {#the-records-you-create}

Po dodaniu domeny panel wyświetla każdy potrzebny jej rekord, z dokładną wartością i przyciskiem kopiowania przy każdym, i przechowuje je pod _Pokaż rekordy DNS_. Poniższe kształty pokazują, czego się spodziewać — przeczytaj je, aby sprawdzić, czy Twój rejestrator może je utworzyć, a wartości weź z panelu.

Najpierw jeden rekord `TXT`, który dowodzi, że domena należy do Ciebie. Jego nazwa to `_motir-verify.`, a po niej Twoja domena; większość rejestratorów chce tylko części przed domeną główną, jak tutaj:

| Typ   | Nazwa                | Wartość           |
| ----- | -------------------- | ----------------- |
| `TXT` | `_motir-verify.shop` | widoczna w panelu |

Token w nim należy tylko do Ciebie, więc skopiuj go z panelu, a nie skądinąd.

Następnie rekord, który kieruje domenę na Motir. Dla **subdomeny** takiej jak `shop.acme.com` jeden `CNAME`:

| Typ     | Nazwa  | Wartość           |
| ------- | ------ | ----------------- |
| `CNAME` | `shop` | widoczna w panelu |

Dla **domeny głównej** takiej jak `acme.com` zamiast tego `A` i `AAAA` — domena główna nie może mieć rekordu `CNAME`, bo ma już rekordy `MX` i `TXT`, od których zależą Twoja poczta i pozostałe usługi. To samo dotyczy domeny leżącej bezpośrednio pod publicznym sufiksem złożonym z więcej niż jednej części, takiej jak `acme.co.uk`; panel wie, jakiego rodzaju jest Twoja, i wyświetla właściwe rekordy.

| Typ    | Nazwa | Wartość           |
| ------ | ----- | ----------------- |
| `A`    | `@`   | widoczna w panelu |
| `AAAA` | `@`   | widoczna w panelu |

Te adresy należą do samego Motir i są zarezerwowane dla domen klientów. Jeśli kiedyś się zmienią, panel zmieni się razem z nimi; taka strona jak ta — nie.

> Jeśli Twój dostawca DNS oferuje przy rekordzie przełącznik „proxy” lub „chmura”, wyłącz go: proxy przed rekordem ukrywa Twoją domenę przed sprawdzeniem i certyfikatu nie da się wystawić.

Potem wybierz _Sprawdź teraz_. Gdy tylko zobaczymy rekord własności, prosimy o certyfikat, co zwykle trwa kilka minut. Możesz zamknąć stronę; status zmienia się sam.

## Co oznacza każdy status {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Status          | Co oznacza                                                                                                                                                       | Co zrobić                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Niepotwierdzona | Nie widzieliśmy jeszcze Twojego rekordu własności. Nic nie zostało zamówione u urzędu certyfikacji, a domena nie odpowiada.                                      | Utwórz rekordy wyświetlone w panelu, a potem wybierz Sprawdź teraz.                         |
| Oczekuje        | Właśnie szukamy Twojego rekordu własności. Zmiany DNS mogą potrzebować kilku minut, żeby się rozejść.                                                            | Poczekaj chwilę. Zmieni się sam.                                                            |
| Oczekuje        | Własność jest potwierdzona, a certyfikat jest wystawiany. Zwykle trwa to kilka minut.                                                                            | Nic. Strona odświeża się sama.                                                              |
| Wystawiony      | Certyfikat jest wystawiony, a Twoja domena odpowiada. Odnawia się sam.                                                                                           | Nic.                                                                                        |
| Niepowodzenie   | „Nie widzimy już Twojego rekordu własności.” Rekord `TXT` nie zawiera już Twojego tokenu, więc domena przestała odpowiadać.                                      | Przywróć rekord `TXT` wyświetlony w panelu, a potem wybierz Sprawdź ponownie.               |
| Niepowodzenie   | „_Twoja domena_ nie wskazuje już Motir.” Jej rekord `A`, `AAAA` lub `CNAME` został zmieniony lub usunięty, więc domena przestała odpowiadać.                     | Przywróć rekordowi wartość wyświetloną w panelu, a potem wybierz Sprawdź ponownie.          |
| Niepowodzenie   | „Nie udało się wystawić certyfikatu.” Urząd certyfikacji go odrzucił; panel pokazuje obok jego własne uzasadnienie.                                              | Popraw to, co wskazuje uzasadnienie — najczęściej brakujący rekord — a potem wybierz Ponów. |
| Niepowodzenie   | „Nie udało się wystawić certyfikatu.” Certyfikat wygasł, a odnowienie się nie powiodło — prawie zawsze dlatego, że zmienił się rekord DNS. Domena nie odpowiada. | Przywróć rekordy do postaci wyświetlonej w panelu, a potem wybierz Ponów.                   |
| Niepowodzenie   | „Nie udało się wystawić certyfikatu.” Certyfikat został unieważniony. Domena nie odpowiada.                                                                      | Wybierz Ponów, aby rozpocząć nowy certyfikat.                                               |

Odpowiada wyłącznie domena ze statusem _Wystawiony_.

## Co udostępnia Twoja domena {#what-your-domain-serves}

Gdy certyfikat zostanie wystawiony, na Twoją domenę odpowiada brzeg Motir, który przekazuje każde żądanie — ścieżkę, zapytanie, treść i ciasteczka — do aplikacji wskazanej przez domenę i zwraca odpowiedź tej aplikacji. To, co widzi odwiedzający, zależy od aplikacji:

- **Twoja aplikacja**, gdy została opublikowana i jest otwarta dla wszystkich.
- **Strona z informacją, że nic tu jeszcze nie opublikowano**, gdy domena nie wskazuje żadnej aplikacji albo aplikacja nie została jeszcze opublikowana.
- **Strona z informacją, że witryna jest tylko dla członków**, gdy aplikacja jest otwarta wyłącznie dla swoich członków. Członkowie docierają do niej pod jej adresem `motir.site`, do którego strona prowadzi, jeśli taki istnieje. Obecnie każda hostowana aplikacja jest otwarta wyłącznie dla swoich członków — ustawienie, które otwiera aplikację dla wszystkich, nie jest jeszcze dostępne — więc na razie domena wskazująca opublikowaną aplikację pokazuje tę stronę zamiast aplikacji.
- **Strona z informacją, że witryna jest teraz niedostępna**, gdy aplikacja działa na celu, do którego brzeg nie umie jeszcze przekazywać żądań. Odpowie znowu, gdy tylko brzeg będzie to potrafił.
- **Jedna prosta strona „nie znaleziono”** z każdego innego powodu, także dla usuniętej domeny. To ta sama strona bez względu na powód, więc nigdy nie zdradza odwiedzającemu, który z nich zaszedł.

Żadna z tych stron nie ma wokół siebie witryny Motir i żadna nie jest indeksowana przez wyszukiwarki.

Motir nie dodaje w Twojej domenie żadnego własnego przekierowania, linku kanonicznego, pliku robots ani mapy witryny. Twoja aplikacja określa własne.

## Dwie domeny w jednym obszarze roboczym {#two-domains-on-one-workspace}

Obszar roboczy może podłączyć więcej niż jedną domenę, w granicach tego, co obejmuje jego plan. Każda wskazuje własną aplikację, wybraną we własnym wierszu. Motir nie stawia żadnej ponad pozostałymi i nie przekierowuje między żadnymi z nich: każda odpowiada sama za siebie, aplikacją, którą wskazuje.

## Usuwanie domeny {#removing-a-domain}

Wybierz _Usuń_ w wierszu domeny. Domena przestaje udostępniać Twoją aplikację w ciągu mniej więcej pół minuty i od tej chwili odpowiada stroną „nie znaleziono”. Nic nie jest rezerwowane: możesz ją dodać ponownie później, a inny obszar roboczy może ją dodać, gdy tylko udowodni własność własnym rekordem `TXT`. Rekordy u Twojego dostawcy DNS usuwasz sam. Usunięcie domeny niczego nie zmienia w aplikacji, która dalej odpowiada pod swoimi pozostałymi adresami.

## Gdy coś nie działa {#if-something-is-not-working}

Cztery pomyłki odpowiadają za niemal każde niepowodzenie, a każda wygląda w panelu inaczej.

- **CNAME na domenie głównej.** Większość rejestratorów go przyjmuje, a on nie działa. Objawem jest domena, która zostaje na _Oczekuje_ albo dochodzi do _Niepowodzenie_. Użyj zamiast tego rekordów `A` i `AAAA` opisanych wyżej.
- **Dostawca DNS działający jako proxy przed rekordem.** Jeśli Twój dostawca proponuje przepuszczanie ruchu przez proxy lub jego przyspieszanie, ukrywa to przed nami prawdziwy rekord. Objawem jest _Oczekuje_, które nigdy się nie zmienia. Wyłącz proxy dla tych rekordów.
- **Nieaktualny rekord własności.** Jeśli usunięto i ponownie dodano domenę, token się zmienił. Objawem jest _Niepotwierdzona_, mimo że rekord `TXT` wyraźnie istnieje. Zastąp jego wartość tą, którą panel pokazuje teraz.
- **Rekord własności usunięty później.** Aktywna domena, której rekord `TXT` zniknie, odpowiada dalej, dopóki nasze regularne sprawdzenie tego nie zauważy, co następuje w ciągu mniej więcej godziny; wtedy przechodzi w _Niepowodzenie_ i przestaje odpowiadać. Przywróć rekord i wybierz Sprawdź ponownie.
