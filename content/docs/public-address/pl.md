---
source: 410c4c87d2ef
---

Projekt publiczny odpowiada pod własnym adresem w `motir.co` i może dodatkowo odpowiadać na domenie, którą już posiadasz. Niezależnie od tego obszar roboczy może zająć jedną własną nazwę w `motir.site`.

## Twój adres Motir {#your-motir-address}

Każdy projekt publiczny odpowiada pod `motir.co/p/ROADMAP` dla projektu z kluczem `ROADMAP`. Nie ma czego zajmować: adres wynika z klucza projektu i jest wliczony w każdy plan.

## Nazwa Twojego obszaru roboczego {#your-workspace-name}

Obszar roboczy może zająć jedną nazwę w `motir.site` — więc `acme` daje `acme.motir.site`. Pod tą nazwą odpowiadają aplikacje, które Motir hostuje dla Twojego obszaru roboczego: sam adres pokazuje domyślną aplikację obszaru roboczego albo stronę informującą, że nie ma tu jeszcze żadnej aplikacji. **Projekty publiczne nigdy pod nią nie odpowiadają** — projekt pozostaje pod swoim adresem `motir.co`.

Nazwę zajmuje właściciel lub administrator obszaru roboczego, w sekcji _Ustawienia obszaru roboczego_, pod _Adres publiczny_. Ustawienia projektu pokazują ją tylko do odczytu, z linkiem do tego miejsca.

Nazwa składa się z małych liter, cyfr i pojedynczych łączników i ma od trzech do sześćdziesięciu trzech znaków. Niewielki zestaw nazw jest zarezerwowany dla własnych hostów Motir oraz dla nazw, które czytelnik mógłby z nimi pomylić.

Obszar roboczy ma jedną nazwę albo żadnej. **Nie ma aliasów i nic nie przekierowuje:** gdy zmienisz nazwę lub ją zwolnisz, stary adres od razu przestaje odpowiadać, a udostępnione już do niego linki przestają działać.

- **Jedna zmiana na 30 dni.** Zmiana nazwy i zwolnienie liczą się każde jako jedna zmiana, więc zwolnienie i ponowne zajęcie nie obchodzi tego limitu. Dopóki zmiana nie jest jeszcze dozwolona, panel pokazuje datę, od której będzie.
- **Nazwa, którą oddajesz, jest wstrzymywana — chyba że dopiero co ją zająłeś.** Nazwa trzymana krócej niż 24 godziny od razu wraca do puli. Nazwa trzymana 24 godziny lub dłużej jest wstrzymywana na 90 dni, aby nikt inny nie przejął linków, które prowadziły do Ciebie; okno potwierdzenia podaje dokładną datę, od której znów jest wolna.

## Podłączanie własnej domeny {#connecting-your-own-domain}

Podłączenie własnej domeny jest dostępne w planach płatnych — zobacz [nasze plany](/). Twój adres `motir.co` jest wliczony w każdy plan i działa tak czy inaczej.

Podłączona domena obsługuje _jeden_ projekt, w swoim katalogu głównym: `roadmap.acme.com/` to strona tego projektu, a `roadmap.acme.com/changelog` — jego lista zmian. Aktywna tablica, elementy robocze i roadmapa znajdują się w aplikacji Motir, a prowadzą do nich tamtejsze linki.

U rejestratora tworzysz dwa rodzaje rekordów. **Najpierw dodaj domenę** w sekcji _Ustawienia projektu_, pod _Adres publiczny_: panel wyświetli wtedy wszystkie rekordy, których domena potrzebuje, z dokładną wartością i przyciskiem kopiowania przy każdym. Poniższe kształty pokazują, czego się spodziewać — przeczytaj je, by sprawdzić, czy Twój rejestrator potrafi je utworzyć, a wartości weź z panelu.

### 1 · Skieruj domenę do nas {#point-the-domain-at-us}

Dla **subdomeny**, takiej jak `roadmap.acme.com`, wystarczy jeden rekord `CNAME`:

| Typ     | Nazwa     | Wartość           |
| ------- | --------- | ----------------- |
| `CNAME` | `roadmap` | pokazana w panelu |

Dla **domeny głównej**, takiej jak `acme.com`, zamiast tego potrzebne są rekordy `A` i `AAAA` — domena główna nie może mieć rekordu `CNAME`, ponieważ ma już rekordy `MX` i `TXT`, od których zależą Twoja poczta i inne usługi:

| Typ    | Nazwa | Wartość           |
| ------ | ----- | ----------------- |
| `A`    | `@`   | pokazana w panelu |
| `AAAA` | `@`   | pokazana w panelu |

Każdą wartość kopiuj z panelu, a nie skądkolwiek indziej. To adresy, pod którymi serwowany jest Motir, odczytane z platformy, na której działamy, i mogą się zmienić — panel zmienia się razem z nimi, a taka strona jak ta nie.

> Jeśli Twój dostawca DNS oferuje przy rekordzie przełącznik „proxy” lub „chmura”, wyłącz go: proxy przed rekordem ukrywa Twoją domenę przed sprawdzaniem i nie da się wystawić certyfikatu.

### 2 · Udowodnij, że domena jest Twoja {#prove-the-domain-is-yours}

Obok rekordu kierującego panel wyświetla jeden rekord `TXT` z tokenem, w takim kształcie:

| Typ   | Nazwa                   | Wartość          |
| ----- | ----------------------- | ---------------- |
| `TXT` | `_motir-verify.roadmap` | `motir-verify=…` |

Skopiuj wartość z panelu, a nie stąd — token jest tylko Twój. Następnie wybierz _Zweryfikuj_. Gdy zobaczymy rekord, zażądamy certyfikatu, co zwykle trwa minutę lub dwie. Możesz zamknąć stronę; status zmienia się dalej samodzielnie, a rekordy pozostają dostępne pod _Pokaż rekordy DNS_.

## Co oznacza każdy status {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Status           | Co oznacza                                                                                                                                 | Co zrobić                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Niezweryfikowana | Nie widzimy jeszcze rekordu potwierdzającego własność. W urzędzie certyfikacji nic jeszcze nie zamówiono.                                  | Utwórz poniższy rekord TXT, a potem wybierz Sprawdź ponownie.             |
| Sprawdzanie…     | Właśnie szukamy rekordu potwierdzającego własność. Zmiany DNS mogą potrzebować kilku minut, by się rozejść.                                | Poczekaj chwilę. Status zmieni się sam.                                   |
| Wystawianie…     | Własność została potwierdzona, a certyfikat zamówiony. Zwykle trwa to minutę lub dwie.                                                     | Nic. Resztą zajmuje się Motir.                                            |
| Aktywna          | Certyfikat został wystawiony, a Twoja domena obsługuje projekt. Odnawia się samodzielnie.                                                  | Możesz uczynić ten adres głównym.                                         |
| Niepowodzenie    | Nie udało się wystawić certyfikatu. Powód widać obok statusu — najczęściej to rekord, którego brakuje albo który wskazuje gdzie indziej.   | Porównaj swoje rekordy z poniższymi, a potem wybierz Sprawdź ponownie.    |
| Wygasła          | Certyfikat stracił ważność, a odnowienie się nie powiodło — prawie zawsze dlatego, że zmienił się rekord DNS. Domena nie jest obsługiwana. | Przywróć rekordy do poprzedniego stanu, a potem wybierz Sprawdź ponownie. |
| Unieważniona     | Certyfikat został wycofany. Domena nie jest obsługiwana.                                                                                   | Wybierz Zażądaj ponownie, by rozpocząć nowy certyfikat.                   |

## Który adres jest właściwy {#which-address-is-the-real-one}

Projekt może odpowiadać pod kilkoma adresami, a dokładnie jeden z nich jest _główny_ — ten, o którym informowane są wyszukiwarki i podglądy w mediach społecznościowych. Gdy certyfikat podłączonej domeny jest aktywny, możesz uczynić ją główną; do tego czasu głównym jest adres Motir.

**Każdy inny adres przekierowuje na główny.** Dotyczy to także Twojego adresu `motir.co`, gdy awansujesz własną domenę. Odwiedzający zawsze trafiają tam, gdzie wszystko działa, a wyszukiwarka widzi jedną stronę zamiast trzech kopii konkurujących ze sobą.

## Usuwanie domeny {#removing-a-domain}

Usunięcie podłączonej domeny wycofuje jej certyfikat, a adres przestaje odpowiadać — każdy, kto go używa, zobaczy błąd, a już udostępnione linki do niego przestaną działać. Projekt pozostaje publiczny pod pozostałymi adresami, więc usunięcie domeny nigdy nie czyni projektu prywatnym.

## Jeśli coś nie działa {#if-something-is-not-working}

Trzy pomyłki odpowiadają za niemal każdą awarię, a każda objawia się w panelu inaczej.

- **CNAME na domenie głównej.** Większość rejestratorów go przyjmuje, a on nie działa. Objaw: domena pozostaje w stanie `Not verified` albo trafia do stanu `Failed`. Użyj zamiast tego powyższych rekordów `A` i `AAAA`.
- **Dostawca DNS z proxy przed rekordem.** Jeśli dostawca oferuje proxy lub przyspieszanie ruchu, ukrywa to przed nami prawdziwy rekord. Objaw: stan `Checking…`, który nigdy się nie kończy. Wyłącz proxy dla tych rekordów.
- **Nieaktualny rekord własności.** Jeśli domena została usunięta i dodana ponownie, token się zmienił. Objaw: stan `Not verified`, choć rekord `TXT` wyraźnie istnieje. Zastąp jego wartość tą, którą panel pokazuje teraz.
