---
source: 331d263ce3e1
---

Un progetto pubblico risponde al proprio indirizzo su `motir.co`. A parte questo, un’area di lavoro può richiedere un proprio nome sotto `motir.site` e servire la propria applicazione ospitata su un dominio che possiede già.

## Il tuo indirizzo Motir {#your-motir-address}

Ogni progetto pubblico risponde a `motir.co/p/ROADMAP` per un progetto con chiave `ROADMAP`. Non c’è nulla da richiedere: l’indirizzo deriva dalla chiave del progetto ed è incluso in ogni piano.

## Il nome della tua area di lavoro {#your-workspace-name}

Un’area di lavoro può richiedere un nome sotto `motir.site`: così `acme` ti dà `acme.motir.site`. Sotto quel nome rispondono le applicazioni che Motir ospita per la tua area di lavoro: l’indirizzo da solo mostra l’applicazione predefinita dell’area di lavoro, oppure una pagina che dice che qui non c’è ancora nessuna applicazione. **I progetti pubblici non rispondono mai sotto di esso**: un progetto resta al suo indirizzo `motir.co`.

A richiedere il nome è un proprietario o un amministratore dell’area di lavoro, nelle _Impostazioni dell’area di lavoro_ sotto _Indirizzo pubblico_. Le Impostazioni del progetto lo mostrano in sola lettura, con un link a quella pagina.

Un nome è composto da lettere minuscole, cifre e trattini singoli, da tre a sessantatré caratteri. Un piccolo insieme di nomi è riservato agli host di Motir e a nomi che un lettore potrebbe scambiare per uno di essi.

Un’area di lavoro ha un nome o nessuno. **Non ci sono alias e niente reindirizza:** quando rinomini o rilasci il nome, il vecchio indirizzo smette subito di rispondere, e i link già condivisi verso di esso smettono di funzionare.

- **Una modifica ogni 30 giorni.** Una ridenominazione e un rilascio contano ciascuno come una modifica, quindi rilasciare e richiedere di nuovo non aggira il limite. Finché una modifica non è ancora consentita, il pannello mostra la data da cui lo sarà.
- **Un nome che lasci andare viene trattenuto, a meno che tu non l’abbia appena richiesto.** Un nome tenuto per meno di 24 ore torna subito disponibile. Un nome tenuto per 24 ore o più viene trattenuto per 90 giorni, così nessun altro può ereditare link che puntavano a te; la finestra di conferma indica la data esatta in cui torna libero.

## Il tuo dominio {#your-own-domain}

Un dominio che possiedi, come `shop.acme.com`, può rispondere con l’applicazione ospitata della tua area di lavoro, qualunque sia la destinazione che la esegue. I domini personalizzati sono disponibili con i piani a pagamento — vedi [i nostri piani](/). Un proprietario o un amministratore dell’area di lavoro li aggiunge e li rimuove; tutti gli altri nell’area di lavoro li vedono in sola lettura. Gli indirizzi `motir.co` dei tuoi progetti e il nome `motir.site` della tua area di lavoro continuano a funzionare in ogni caso.

## Aggiungere il dominio {#add-the-domain}

Aggiungi il dominio nelle _Impostazioni dell’area di lavoro_, sotto _Domini personalizzati_. Anche il pannello _Indirizzo pubblico_ porta lì, con _Usa invece un tuo dominio_.

Quando lo aggiungi, scegli quale applicazione dell’area di lavoro serve. Un dominio serve esattamente un’applicazione. Puoi cambiare quale in seguito, sulla riga del dominio, con _Cambia applicazione_. Un’area di lavoro che non ha ancora un’applicazione ospitata può comunque aggiungere un dominio: viene aggiunto senza applicazione e non serve nulla finché non ne scegli una.

## I record da creare {#the-records-you-create}

Una volta aggiunto il dominio, il pannello elenca ogni record di cui ha bisogno, con il suo valore esatto e un pulsante di copia su ciascuno, e li tiene sotto _Mostra i record DNS_. Le forme qui sotto sono ciò che devi aspettarti: leggile per verificare che il tuo registrar possa crearle, e prendi i valori dal pannello.

Prima, un record `TXT` che dimostra che il dominio è tuo. Il suo nome è `_motir-verify.` seguito dal tuo dominio; la maggior parte dei registrar vuole solo la parte che precede il dominio radice, come qui:

| Tipo  | Nome                 | Valore                |
| ----- | -------------------- | --------------------- |
| `TXT` | `_motir-verify.shop` | mostrato nel pannello |

Il token che contiene è solo tuo, quindi copialo dal pannello e non da altrove.

Poi un record che fa puntare il dominio a Motir. Per un **sottodominio** come `shop.acme.com`, un `CNAME`:

| Tipo    | Nome   | Valore                |
| ------- | ------ | --------------------- |
| `CNAME` | `shop` | mostrato nel pannello |

Per un **dominio radice** come `acme.com`, invece, un `A` e un `AAAA`: un dominio radice non può avere un `CNAME`, perché ha già i record `MX` e `TXT` da cui dipendono la tua posta e gli altri tuoi servizi. Lo stesso vale per un dominio posto subito sotto un suffisso pubblico di più parti, come `acme.co.uk`; il pannello sa di che tipo è il tuo ed elenca i record giusti.

| Tipo   | Nome | Valore                |
| ------ | ---- | --------------------- |
| `A`    | `@`  | mostrato nel pannello |
| `AAAA` | `@`  | mostrato nel pannello |

Questi indirizzi sono di Motir, che li riserva ai domini dei clienti. Se un giorno cambiano, il pannello cambia con loro; una pagina come questa no.

> Se il tuo provider DNS offre un interruttore “proxy” o “cloud” sul record, disattivalo: un proxy davanti al record nasconde il tuo dominio al controllo e il certificato non può essere emesso.

Poi scegli _Controlla ora_. Appena vediamo il record di proprietà richiediamo un certificato, il che di solito richiede qualche minuto. Puoi chiudere la pagina; lo stato avanza da solo.

## Cosa significa ogni stato {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Stato          | Cosa significa                                                                                                                                                                | Cosa fare                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Non confermato | Non abbiamo ancora visto il tuo record di proprietà. Non è stato richiesto nulla all’autorità di certificazione e il dominio non risponde.                                    | Crea i record che il pannello elenca, poi scegli Controlla ora.                           |
| In attesa      | Stiamo cercando il tuo record di proprietà in questo momento. Le modifiche DNS possono impiegare qualche minuto a propagarsi.                                                 | Aspetta un momento. Avanza da solo.                                                       |
| In attesa      | La proprietà è confermata e il certificato è in emissione. Di solito richiede qualche minuto.                                                                                 | Niente. La pagina si aggiorna da sola.                                                    |
| Emesso         | Il certificato è emesso e il tuo dominio risponde. Si rinnova da solo.                                                                                                        | Niente.                                                                                   |
| Non riuscito   | “Non vediamo più il tuo record di proprietà.” Il record `TXT` non contiene più il tuo token, quindi il dominio ha smesso di rispondere.                                       | Ripristina il record `TXT` che il pannello mostra, poi scegli Ricontrolla.                |
| Non riuscito   | “_Il tuo dominio_ non punta più a Motir.” Il suo record `A`, `AAAA` o `CNAME` è stato modificato o rimosso, quindi il dominio ha smesso di rispondere.                        | Riporta il record al valore che il pannello mostra, poi scegli Ricontrolla.               |
| Non riuscito   | “Non è stato possibile emettere il certificato.” L’autorità di certificazione l’ha rifiutato; il pannello mostra accanto il suo stesso motivo.                                | Correggi ciò che il motivo indica — quasi sempre un record mancante — poi scegli Riprova. |
| Non riuscito   | “Non è stato possibile emettere il certificato.” Il certificato è scaduto e il rinnovo non è riuscito, quasi sempre perché è cambiato un record DNS. Il dominio non risponde. | Rimetti i record come li mostra il pannello, poi scegli Riprova.                          |
| Non riuscito   | “Non è stato possibile emettere il certificato.” Il certificato è stato revocato. Il dominio non risponde.                                                                    | Scegli Riprova per avviare un nuovo certificato.                                          |

Risponde solo un dominio il cui stato è _Emesso_.

## Cosa serve il tuo dominio {#what-your-domain-serves}

Una volta emesso il certificato, al tuo dominio risponde l’edge di Motir, che inoltra ogni richiesta — percorso, query, corpo e cookie — all’applicazione che il dominio nomina e restituisce la risposta di quell’applicazione. Cosa trova un visitatore dipende dall’applicazione:

- **La tua applicazione stessa**, quando è stata pubblicata ed è aperta a tutti.
- **Una pagina che dice che qui non è ancora pubblicato nulla**, quando il dominio non nomina alcuna applicazione o l’applicazione non è ancora stata pubblicata.
- **Una pagina che dice che il sito è riservato ai membri**, quando l’applicazione è aperta solo ai suoi membri. I membri la raggiungono al suo indirizzo `motir.site`, a cui la pagina rimanda quando ce n’è uno. Oggi ogni applicazione ospitata è aperta solo ai suoi membri — l’impostazione che ne apre una a tutti non è ancora disponibile — quindi per ora un dominio che nomina un’applicazione pubblicata mostra questa pagina invece dell’applicazione.
- **Una pagina che dice che il sito non è raggiungibile in questo momento**, quando l’applicazione gira su una destinazione verso cui l’edge non sa ancora inoltrare. Risponde di nuovo appena l’edge può farlo.
- **Un’unica, semplice pagina “non trovato”** per ogni altro motivo, compreso un dominio rimosso. È la stessa pagina qualunque sia il motivo, quindi non rivela mai a un visitatore quale valga.

Nessuna di queste pagine porta intorno il sito di Motir, e nessuna viene indicizzata dai motori di ricerca.

Motir non aggiunge sul tuo dominio alcun reindirizzamento, link canonico, file robots o sitemap propri. La tua applicazione definisce i suoi.

## Due domini nella stessa area di lavoro {#two-domains-on-one-workspace}

Un’area di lavoro può collegare più di un dominio, fino a quanto include il suo piano. Ciascuno nomina la propria applicazione, scelta sulla propria riga. Motir non mette nessuno sopra gli altri e non reindirizza tra nessuno di essi: ciascuno risponde per conto suo, con l’applicazione che nomina.

## Rimuovere un dominio {#removing-a-domain}

Scegli _Rimuovi_ sulla riga del dominio. Il dominio smette di servire la tua applicazione entro circa mezzo minuto e da quel momento risponde con la pagina non trovato. Nulla viene riservato: puoi aggiungerlo di nuovo in seguito, e un’altra area di lavoro può aggiungerlo appena ne dimostra la proprietà con un proprio record `TXT`. Eliminare i record presso il tuo provider DNS spetta a te. Rimuovere un dominio non cambia nulla dell’applicazione, che continua a rispondere ai suoi altri indirizzi.

## Se qualcosa non funziona {#if-something-is-not-working}

Quattro errori spiegano quasi ogni errore di configurazione, e ognuno si nota in modo diverso nel pannello.

- **Un CNAME su un dominio radice.** La maggior parte dei registrar lo accetta e non funziona. Il sintomo è un dominio che resta _In attesa_ o arriva a _Non riuscito_. Usa invece i record `A` e `AAAA` qui sopra.
- **Un provider DNS che fa da proxy davanti al record.** Se il tuo provider offre di instradare o accelerare il traffico, questo ci nasconde il record reale. Il sintomo è un _In attesa_ che non si stabilizza mai. Disattiva il proxy per questi record.
- **Un record di proprietà non aggiornato.** Se hai rimosso e aggiunto di nuovo un dominio, il token è cambiato. Il sintomo è _Non confermato_ mentre un record `TXT` c’è chiaramente. Sostituisci il suo valore con quello che il pannello mostra ora.
- **Un record di proprietà eliminato in seguito.** Un dominio attivo il cui record `TXT` scompare continua a rispondere finché il nostro controllo periodico non se ne accorge, il che avviene entro circa un’ora; poi passa a _Non riuscito_ e smette di rispondere. Ripristina il record e scegli Ricontrolla.
