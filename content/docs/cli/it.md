---
source: 9091e5e2f59e
---

La Motir CLI parla con lo stesso server MCP usato dall’agente Motir. Automatizza il ciclo di pianificazione ed esecuzione con un token legato a un’area di lavoro: un’esecuzione prende il prossimo elemento di lavoro pronto, recupera il prompt generato dal server e avvia un agente in una sandbox per eseguirlo. L’elemento di lavoro è il sistema di riferimento; la CLI è chi lo porta avanti.

{{part:meta}}

{{value:packageName}} · versione {{value:packageVersion}} · {{value:commandCount}} comandi

{{part:reference}}

## Installazione {#install}

Node {{value:nodeRequirement}}. Installala a livello globale, oppure eseguila una volta senza installarla.

{{slot:install}}

## Autenticazione {#authenticate}

Il flusso del dispositivo è la strada più breve: mostra un codice, apre Motir e aspetta che tu lo approvi. Se hai già un token di accesso personale, consegnalo direttamente. In entrambi i casi la CLI parla con {{value:defaultServer}}, a meno che tu non la indirizzi altrove.

{{slot:authenticate}}

Poi associa una cartella a un progetto e controlla la configurazione prima della prima esecuzione.

{{slot:link-and-check}}

## Comandi {#commands}

Tutti i comandi che la CLI registra, nell’ordine in cui li stampa `motir help`, generati dal catalogo che il binario stesso dichiara: così questo elenco non resta indietro rispetto a un rilascio. Descrive {{value:packageName}}@{{value:packageVersion}}.

{{slot:commands}}

## Dove Motir tiene i suoi file {#where-motir-keeps-things}

Tre file, e solo uno contiene un segreto: non è quello che sta nel tuo repository. Ogni percorso qui sotto può essere spostato; `motir help files` li stampa a partire dal binario che hai davvero installato, insieme alla variabile che sposta ciascuno.

- `~/.config/motir/config.json` **— segreto, da non committare mai**
  L’archivio delle credenziali: l’unico file in cui viene scritto un token di accesso personale, con `chmod 600` dentro una cartella `0700`, indicizzato per URL del server, così una stessa macchina può conservare token per più server Motir. Contiene anche il comando dell’agente che hai configurato. Spostalo con `MOTIR_CONFIG_HOME` o `XDG_CONFIG_HOME`.
- `.motir.json` **— nessun segreto, si può committare**
  Il collegamento al progetto nella radice della tua area di lavoro: il server, l’area di lavoro e il progetto a cui questa cartella è associata, più una mappa facoltativa di override dei repository. Non contiene credenziali, quindi va nel controllo di versione. Ogni comando lo risolve risalendo VERSO L’ALTO dalla cartella corrente, quindi qualsiasi comando funziona dall’interno di qualsiasi checkout sotto la radice.
- `~/.local/state/motir/session-excludes.json` **— nessun segreto**
  L’elenco di esclusione della sessione: gli elementi di lavoro il cui invio è FALLITO, così la prossima esecuzione li salta invece di riprendere lo stesso errore. È uno stato e non una credenziale, ed è per questo che non sta accanto al token: la sandbox monta la cartella di configurazione in sola lettura, e un’esecuzione non deve mai morire perché non riesce a scrivere questo file. Se non è scrivibile, Motir lo segnala una volta sola e continua. Spostalo con `MOTIR_STATE_HOME`.

## Dove viene eseguita un’esecuzione {#where-a-run-executes}

Un agente avviato gira dentro un container con i tuoi checkout e la tua credenziale dell’agente: cosa fornisce, cosa rifiuta il suo token e gli errori che una prima esecuzione incontra sono nella pagina [{{value:sandboxPage}}](/docs/sandbox) e non vengono ripetuti qui. Collegare un agente a Motir senza la CLI è [{{value:mcpPage}}](/docs/mcp), e far girare lo stesso ciclo di lavoro via HTTP è il [{{value:apiPage}}](/docs/api). Il riferimento completo dei comandi (le tre forme di esecuzione, i branch di sessione, la politica sugli errori e la risoluzione dei problemi) è [docs/cli.md]({{value:cliReferenceUrl}}) in motir-core.

{{part:unreachable}}

Il riferimento dei comandi non è raggiungibile al momento. Viene generato dal catalogo che la CLI stessa dichiara e non viene mai copiato qui, quindi nel frattempo non c’è nulla da mostrarti: `motir help` stampa la stessa tabella dal binario che hai installato.
