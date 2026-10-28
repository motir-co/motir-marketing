---
source: 410c4c87d2ef
---

Un progetto pubblico risponde al proprio indirizzo su `motir.co`, e può rispondere anche su un dominio che possiedi già. A parte questo, un’area di lavoro può richiedere un proprio nome sotto `motir.site`.

## Il tuo indirizzo Motir {#your-motir-address}

Ogni progetto pubblico risponde a `motir.co/p/ROADMAP` per un progetto con chiave `ROADMAP`. Non c’è nulla da richiedere: l’indirizzo deriva dalla chiave del progetto ed è incluso in ogni piano.

## Il nome della tua area di lavoro {#your-workspace-name}

Un’area di lavoro può richiedere un nome sotto `motir.site`: così `acme` ti dà `acme.motir.site`. Sotto quel nome rispondono le applicazioni che Motir ospita per la tua area di lavoro: l’indirizzo da solo mostra l’applicazione predefinita dell’area di lavoro, oppure una pagina che dice che qui non c’è ancora nessuna applicazione. **I progetti pubblici non rispondono mai sotto di esso**: un progetto resta al suo indirizzo `motir.co`.

A richiedere il nome è un proprietario o un amministratore dell’area di lavoro, nelle _Impostazioni dell’area di lavoro_ sotto _Indirizzo pubblico_. Le Impostazioni del progetto lo mostrano in sola lettura, con un link a quella pagina.

Un nome è composto da lettere minuscole, cifre e trattini singoli, da tre a sessantatré caratteri. Un piccolo insieme di nomi è riservato agli host di Motir e a nomi che un lettore potrebbe scambiare per uno di essi.

Un’area di lavoro ha un nome o nessuno. **Non ci sono alias e niente reindirizza:** quando rinomini o rilasci il nome, il vecchio indirizzo smette subito di rispondere, e i link già condivisi verso di esso smettono di funzionare.

- **Una modifica ogni 30 giorni.** Una ridenominazione e un rilascio contano ciascuno come una modifica, quindi rilasciare e richiedere di nuovo non aggira il limite. Finché una modifica non è ancora consentita, il pannello mostra la data da cui lo sarà.
- **Un nome che lasci andare viene trattenuto, a meno che tu non l’abbia appena richiesto.** Un nome tenuto per meno di 24 ore torna subito disponibile. Un nome tenuto per 24 ore o più viene trattenuto per 90 giorni, così nessun altro può ereditare link che puntavano a te; la finestra di conferma indica la data esatta in cui torna libero.

## Collegare il tuo dominio {#connecting-your-own-domain}

Collegare un dominio che possiedi è disponibile nei piani a pagamento: vedi [i nostri piani](/). Il tuo indirizzo `motir.co` è incluso in ogni piano e continua a funzionare in entrambi i casi.

Un dominio collegato serve _un solo_ progetto, alla sua radice: `roadmap.acme.com/` è la pagina di quel progetto e `roadmap.acme.com/changelog` il suo changelog. La Bacheca dal vivo, gli elementi di lavoro e la roadmap si trovano nell’app Motir, e i link che li riguardano portano lì.

Crei due tipi di record presso il tuo registrar. **Aggiungi prima il dominio**, nelle Impostazioni del progetto sotto _Indirizzo pubblico_: il pannello elenca poi tutti i record di cui quel dominio ha bisogno, con il valore esatto e un pulsante di copia su ciascuno. Le forme qui sotto sono ciò che puoi aspettarti: leggile per verificare che il tuo registrar sappia crearle, e prendi i valori dal pannello.

### 1 · Punta il dominio verso di noi {#point-the-domain-at-us}

Per un **sottodominio** come `roadmap.acme.com`, un solo `CNAME`:

| Tipo    | Nome      | Valore                |
| ------- | --------- | --------------------- |
| `CNAME` | `roadmap` | mostrato nel pannello |

Per un **dominio radice** come `acme.com`, invece, un record `A` e uno `AAAA`: un dominio radice non può avere un `CNAME`, perché porta già i record `MX` e `TXT` da cui dipendono la tua posta e gli altri tuoi servizi:

| Tipo   | Nome | Valore                |
| ------ | ---- | --------------------- |
| `A`    | `@`  | mostrato nel pannello |
| `AAAA` | `@`  | mostrato nel pannello |

Copia ogni valore dal pannello e da nessun altro posto. Sono gli indirizzi su cui Motir viene servito, letti dalla piattaforma che usiamo, e possono cambiare: il pannello cambia con loro, mentre una pagina come questa no.

> Se il tuo provider DNS offre sul record un interruttore «proxy» o «cloud», disattivalo: un proxy davanti al record nasconde il tuo dominio al controllo e il certificato non può essere emesso.

### 2 · Dimostra che il dominio è tuo {#prove-the-domain-is-yours}

Insieme al record di puntamento, il pannello elenca un record `TXT` che contiene un token, di questa forma:

| Tipo  | Nome                    | Valore           |
| ----- | ----------------------- | ---------------- |
| `TXT` | `_motir-verify.roadmap` | `motir-verify=…` |

Copia il valore dal pannello e non da qui: il token è solo tuo. Poi scegli _Verifica_. Appena riusciamo a vedere il record, richiediamo un certificato, cosa che di solito si completa in uno o due minuti. Puoi chiudere la pagina; lo stato continua ad avanzare da solo, e i record restano disponibili sotto _Mostra i record DNS_.

## Cosa significa ogni stato {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Stato          | Cosa significa                                                                                                                                     | Cosa fare                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Non verificato | Non abbiamo ancora visto il tuo record di proprietà. Non è stato richiesto nulla all’autorità di certificazione.                                   | Crea il record TXT qui sotto, poi scegli Verifica di nuovo.                 |
| Verifica…      | Stiamo cercando adesso il record di proprietà. Le modifiche al DNS possono richiedere alcuni minuti per propagarsi.                                | Attendi un momento. Passa allo stato successivo da solo.                    |
| Emissione…     | La proprietà è dimostrata e il certificato è stato richiesto. Di solito ci vuole uno o due minuti.                                                 | Niente. Il resto lo fa Motir.                                               |
| Online         | Il certificato è stato emesso e il tuo dominio serve il progetto. Si rinnova automaticamente.                                                      | Puoi rendere questo indirizzo quello principale.                            |
| Non riuscito   | Non è stato possibile emettere il certificato. Il motivo è mostrato accanto allo stato, il più delle volte un record mancante o che punta altrove. | Confronta i tuoi record con quelli qui sotto, poi scegli Verifica di nuovo. |
| Scaduto        | Il certificato è scaduto e il rinnovo non è riuscito, quasi sempre perché un record DNS è cambiato. Il dominio non è attivo.                       | Rimetti i record com’erano, poi scegli Verifica di nuovo.                   |
| Revocato       | Il certificato è stato ritirato. Il dominio non è attivo.                                                                                          | Scegli Richiedi di nuovo per avviare un nuovo certificato.                  |

## Quale indirizzo è quello reale {#which-address-is-the-real-one}

Un progetto può rispondere a più indirizzi, ed esattamente uno di essi è quello _principale_: quello che viene comunicato ai motori di ricerca e alle card social. Quando il certificato di un dominio collegato è attivo puoi renderlo principale; fino ad allora lo è l’indirizzo Motir.

**Ogni altro indirizzo reindirizza a quello principale.** Questo vale anche per il tuo indirizzo `motir.co` una volta che hai promosso un dominio tuo. I visitatori arrivano sempre in un posto che funziona, e un motore di ricerca vede una sola pagina invece di tre copie in competizione tra loro.

## Rimuovere un dominio {#removing-a-domain}

Rimuovere un dominio collegato ritira il suo certificato e l’indirizzo smette di rispondere: chi lo usa riceverà un errore, e i link già condivisi smetteranno di funzionare. Il tuo progetto resta pubblico agli altri suoi indirizzi, quindi rimuovere un dominio non rende mai privato un progetto.

## Se qualcosa non funziona {#if-something-is-not-working}

Tre errori sono all’origine di quasi tutti i problemi, e ciascuno si manifesta in modo diverso nel pannello.

- **Un CNAME su un dominio radice.** La maggior parte dei registrar lo accetta ma non funziona. Il sintomo è un dominio che resta `Not verified` o arriva a `Failed`. Usa invece i record `A` e `AAAA` indicati sopra.
- **Un provider DNS con proxy davanti al record.** Se il tuo provider offre di fare da proxy o di accelerare il traffico, questo nasconde a noi il vero record. Il sintomo è `Checking…` che non si risolve mai. Disattiva il proxy per questi record.
- **Un record di proprietà obsoleto.** Se hai rimosso e riaggiunto un dominio, il token è cambiato. Il sintomo è `Not verified` mentre un record `TXT` è chiaramente presente. Sostituisci il suo valore con quello che il pannello mostra adesso.
