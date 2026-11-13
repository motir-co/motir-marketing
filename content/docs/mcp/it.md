---
source: 2aa432672926
---

Motir espone un server Model Context Protocol: un unico endpoint HTTP in streaming che agenti e CLI chiamano per leggere e guidare il nucleo di gestione dei progetti. È la stessa superficie che l’agente Motir usa per eseguire un piano. Aggiungerlo a Claude richiede un solo accesso e nessun token; qualsiasi altro client, o una pipeline, si collega con un token in tre passi.

## Aggiungi Motir a Claude {#claude}

Accedi con il tuo account Motir, scegli un’area di lavoro e approva ciò che Claude può fare al suo interno. Non si copia né si incolla nulla: non c’è nessun token da creare o custodire.

### claude.ai {#claude-ai}

1. Apri Customize → Connectors.
2. Fai clic su «+», poi su Add custom connector, e incolla l’URL del server qui sotto. In OAuth client scegli Use Claude’s published identity: claude.ai lo contrassegna come Detected, perché Motir lo supporta. Lascia vuoti OAuth client ID e secret: Motir non ne ha bisogno.
3. Fai clic su Add, poi su Connect. Claude ti porta su app.motir.co per accedere e approvare.

{{slot:claude-ai}}

Con un piano Team o Enterprise, un Owner aggiunge il connettore una sola volta, in Organization settings → Connectors → Add → Custom → Web, e poi ogni membro fa clic su Connect in Customize → Connectors con il proprio account Motir. · [Documentazione di claude.ai di Anthropic]({{value:routeClaudeAiDocsUrl}}) · passaggi verificati il {{value:routeClaudeAiCheckedOn}}

### App desktop di Claude {#claude-desktop}

1. Se hai già collegato Motir su claude.ai, non c’è nulla da aggiungere: un connettore collegato è disponibile nelle tue conversazioni sul web, nell’app desktop e su dispositivo mobile.
2. Per aggiungerlo invece dall’app desktop, seleziona Customize nella barra laterale, poi Connectors, e segui i passaggi di claude.ai con lo stesso URL.
3. La pagina di accesso di Motir si apre nel browser; approva lì e torna all’app.

{{slot:claude-desktop}}

Questo è un connettore remoto, non un’estensione desktop locale: Claude raggiunge Motir dal cloud di Anthropic, quindi sulla tua macchina non viene installato nulla. · [Documentazione dell’app desktop di Claude di Anthropic]({{value:routeClaudeDesktopDocsUrl}}) · passaggi verificati il {{value:routeClaudeDesktopCheckedOn}}

### Claude Code {#claude-code}

1. Aggiungi il server con il comando qui sotto, senza intestazione e senza token.
2. In Claude Code esegui `/mcp`, seleziona `motir` e segui l’accesso nel browser.

{{slot:claude-code}}

Se hai effettuato l’accesso a Claude Code con il tuo account Claude, un connettore che hai collegato su claude.ai è già disponibile lì. Il plugin Motir per Claude Code porta con sé questo server, insieme alle skill. · [Documentazione di Claude Code di Anthropic]({{value:routeClaudeCodeDocsUrl}}) · passaggi verificati il {{value:routeClaudeCodeCheckedOn}}

### Cosa approvi e come revocarlo {#consent}

La pagina di accesso di Motir indica l’app che sta facendo la richiesta, ti fa scegliere un’area di lavoro ed elenca i permessi che chiede. Claude poi agisce a tuo nome in quell’area di lavoro, entro ciò che hai approvato e mai oltre quanto consente il tuo ruolo.

Quando claude.ai si collega con l’identità pubblicata di Claude, Motir verifica che claude.ai la pubblichi e mostra claude.ai come dominio verificato nella pagina di accesso e in App collegate. Qualsiasi altro client MCP che si registra da solo risulta Non verificato: il nome che mostra è uno che ha scelto lui, e Motir non può controllarlo.

Claude chiede conferma prima di usare uno strumento che modifica qualcosa: ogni strumento dichiara se si limita a leggere, a scrivere o a eliminare, e [{{value:mcpToolsPage}}](/docs/mcp/tools) mostra quale è quale. Preferisci il plugin per Claude Code? Porta con sé questo server: [{{value:skillsPage}}](/docs/skills).

Ogni app che colleghi è elencata in [App collegate]({{value:connectedAppsUrl}}), in Impostazioni → Account → Token di Motir, con la sua area di lavoro, i suoi permessi e l’ultimo utilizzo. Revoca interrompe il suo accesso alla richiesta successiva.

## Altri client e CI: usa un token {#token-route}

Scegli questa strada per un client senza accesso OAuth, un agente headless o una pipeline di CI. È lo stesso server; un token di accesso personale prende il posto dell’accesso.

## Questo server o l’API REST? {#fork}

Entrambi parlano con gli stessi dati e accettano la stessa credenziale. Sono pensati per consumatori diversi, e la differenza che conta è cosa ciascuno promette riguardo ai cambiamenti che potresti subire.

|                    | {{value:mcpPage}}                                                                                                                     | {{value:apiPage}}                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Endpoint**       | `POST {{value:endpointPath}}`                                                                                                         | `/api/v1/…`                                                                               |
| **Pensato per**    | Un agente che controlli tu: legge le descrizioni degli strumenti a tempo di esecuzione.                                               | Un client che distribuisci: codice scritto una volta su una forma fissa.                  |
| **Stabilità**      | Destinato a cambiare. Riformulare una descrizione o rinominare un argomento è il modo in cui si regola il comportamento di un agente. | Solo additiva. Una modifica incompatibile crea `/api/v2`; la v1 mantiene la sua promessa. |
| **Forma**          | La stessa. I payload MCP derivano dagli schemi di risposta della v1, quindi i due descrivono oggetti identici, dimostrabilmente.      | La stessa, ed è la fonte da cui deriva MCP.                                               |
| **Autenticazione** | Un solo token di accesso personale, un solo insieme di scope.                                                                         | La stessa credenziale funziona su entrambi.                                               |

Stai collegando un agente? Resta qui. Scrivi software che altre persone installano? L’[{{value:apiPage}}](/docs/api) è l’altra metà: è quella che promette di non cambiare sotto di te.

## 1. Crea un token {#token}

Ogni richiesta porta un token di accesso personale, creato in Motir sotto Impostazioni → Account → Token. Scegli l’area di lavoro a cui è associato e concedigli l’insieme di scope più ristretto che basta allo scopo: la tabella in fondo a questa pagina dice cosa controlla ciascuno scope. Una concessione restringe il tuo ruolo e non lo amplia mai, quindi un token non può mai fare ciò che non potresti fare tu.

Il segreto viene mostrato una sola volta, quando il token viene creato. Copialo subito: non c’è modo di leggerlo di nuovo, e un token perso si sostituisce, non si recupera.

## 2. Configura il tuo client {#wire}

Ogni client ha bisogno degli stessi quattro dati, con i nomi che gli dà.

|                  |                                                                        |
| ---------------- | ---------------------------------------------------------------------- |
| **URL**          | `{{value:url}}`                                                        |
| **Trasporto**    | HTTP in streaming: non SSE, e non un comando stdio                     |
| **Intestazione** | `{{value:authHeader}}: {{value:authScheme}} <token>`, a ogni richiesta |
| **Token**        | `{{value:tokenPlaceholder}}`: quello che hai creato al passo 1         |

Tieni il token fuori da un file tracciato dal tuo repository. Dove un client può leggerlo dal tuo ambiente o chiedertelo, il blocco qui sotto usa questa possibilità al posto di un valore letterale: per questo due di essi riportano `{{value:tokenEnvVar}}` invece di un segreto.

### Claude Code {#client-claude-code}

{{slot:client-claude-code}}

Oppure un solo comando: `{{value:claudeCodeTokenCommand}}` · [Documentazione di Claude Code]({{value:clientClaudeCodeDocsUrl}}) · formato verificato il {{value:clientsCheckedOn}}

### Cursor {#client-cursor}

{{slot:client-cursor}}

Cursor interpola `${env:…}`, quindi il token resta nel tuo ambiente e fuori dal file. · [Documentazione di Cursor]({{value:clientCursorDocsUrl}}) · formato verificato il {{value:clientsCheckedOn}}

### VS Code {#client-vscode}

{{slot:client-vscode}}

VS Code ti chiede il token la prima volta che il server si avvia e lo conserva in modo sicuro: nel file non viene scritto nessun segreto. · [Documentazione di VS Code]({{value:clientVscodeDocsUrl}}) · formato verificato il {{value:clientsCheckedOn}}

### Codex CLI {#client-codex}

{{slot:client-codex}}

`{{value:codexTokenKey}}` accetta il NOME della variabile, non il token. · [Documentazione di Codex CLI]({{value:clientCodexDocsUrl}}) · formato verificato il {{value:clientsCheckedOn}}

### Qualsiasi altro client HTTP in streaming {#client-other}

{{slot:client-other}}

Windsurf, Zed, Cline, Goose, o qualcosa che hai scritto tu: gli stessi quattro dati con nomi di chiave diversi. · [Documentazione di qualsiasi altro client HTTP in streaming]({{value:clientOtherDocsUrl}}) · formato verificato il {{value:clientsCheckedOn}}

## 3. Verifica la connessione {#check}

Riavvia il client e chiedigli quali strumenti ha; il server risponde con l’intero catalogo, limitato alla tua concessione. Per verificare l’endpoint stesso prima di coinvolgere un client, interrogalo direttamente: è lo stesso handshake, con il token nel tuo ambiente.

{{slot:verify}}

**Una risposta di accesso non autorizzato riguarda il TOKEN, non la configurazione.** Un token mancante, malformato, sconosciuto, revocato o scaduto restituisce sempre lo stesso rifiuto, di proposito: distinguerli trasformerebbe l’endpoint in un oracolo che risponde se un segreto esiste. Controlla che l’intestazione sia scritta `{{value:authHeader}}`, che il valore inizi con `{{value:authScheme}}` e che il token non sia stato revocato in Motir.

## Cosa può chiamare una connessione {#scopes}

Ogni strumento è controllato da uno scope. I permessi che hai approvato per un’app collegata, o la concessione che un token possiede, decidono quali strumenti può chiamare: quindi l’elenco che mostra il tuo client è già limitato a te. Vengono letti da Motir stesso nel momento in cui questa pagina viene richiesta, quindi sono ciò che il server offre adesso.

{{part:what-next}}

[//]: # 'Placed after the scope table, which the page generates from the published catalogue.'

## E dopo? {#what-next}

[{{value:mcpToolsPage}}](/docs/mcp/tools) elenca ogni strumento che il server espone con gli argomenti che accetta. [Il riferimento completo]({{value:referenceUrl}}) in motir-core riporta la descrizione completa di ogni strumento. Guidare gli stessi dati da un terminale è invece la [{{value:cliPage}}](/docs/cli).

{{part:column-scope}}

[//]: # 'A heading of the scope table. Each of the five parts below is one short label that stays a single word or phrase, with no sentence around it.'

Scope

{{part:column-gates}}

Cosa controlla

{{part:column-default}}

Predefinito

{{part:granted}}

Concesso

{{part:off-by-default}}

Disattivato per impostazione predefinita

{{part:unreachable}}

[//]: # 'Shown in place of the scope table when the catalogue cannot be fetched. Keep `tools/list` literal.'

La tabella degli scope non è raggiungibile al momento. Deriva dal catalogo che Motir pubblica e non viene mai copiata qui, quindi nel frattempo non c’è nulla da mostrarti: un handshake `tools/list` con il tuo token risponde alla stessa domanda per quel token.
