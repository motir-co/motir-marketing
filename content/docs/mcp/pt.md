---
source: 2aa432672926
---

O Motir expõe um servidor do Model Context Protocol — um único endpoint HTTP com streaming, que agentes e a CLI chamam para ler e conduzir o núcleo de gestão de projetos. É a mesma superfície que o agente Motir usa para executar um plano. Adicioná-lo ao Claude exige um único login e nenhum token; qualquer outro cliente, ou um pipeline, se conecta com um token em três passos.

## Adicione o Motir ao Claude {#claude}

Você entra com a sua conta do Motir, escolhe um espaço de trabalho e aprova o que o Claude pode fazer nele. Nada é copiado nem colado — não há token para gerar ou guardar.

### claude.ai {#claude-ai}

1. Abra Customize → Connectors.
2. Clique em “+”, depois em Add custom connector, e cole a URL do servidor abaixo. Em OAuth client, escolha Use Claude’s published identity — o claude.ai a marca como Detected, porque o Motir a oferece. Deixe vazios o ID e o segredo do cliente OAuth — o Motir não precisa de nenhum dos dois.
3. Clique em Add e depois em Connect. O Claude leva você a app.motir.co para entrar e aprovar.

{{slot:claude-ai}}

Em um plano Team ou Enterprise, um Owner adiciona o conector uma única vez, em Organization settings → Connectors → Add → Custom → Web, e cada membro então clica em Connect em Customize → Connectors com a sua própria conta do Motir. · [Documentação do claude.ai da Anthropic]({{value:routeClaudeAiDocsUrl}}) · passos verificados em {{value:routeClaudeAiCheckedOn}}

### Aplicativo Claude para computador {#claude-desktop}

1. Se você já conectou o Motir no claude.ai, não há nada a adicionar: um conector conectado fica disponível nas suas conversas na web, no aplicativo para computador e no celular.
2. Para adicioná-lo pelo aplicativo para computador, selecione Customize na barra lateral, depois Connectors, e siga os passos do claude.ai com a mesma URL.
3. A página de login do Motir abre no seu navegador; aprove ali e volte ao aplicativo.

{{slot:claude-desktop}}

Este é um conector remoto, não uma extensão local para computador: o Claude acessa o Motir a partir da nuvem da Anthropic, então nada é instalado na sua máquina. · [Documentação do aplicativo Claude para computador da Anthropic]({{value:routeClaudeDesktopDocsUrl}}) · passos verificados em {{value:routeClaudeDesktopCheckedOn}}

### Claude Code {#claude-code}

1. Adicione o servidor com o comando abaixo — sem cabeçalho e sem token.
2. No Claude Code, execute `/mcp`, selecione `motir` e siga o login no seu navegador.

{{slot:claude-code}}

Se você conectou o Claude Code com a sua conta do Claude, um conector que você conectou no claude.ai já está disponível nele. O plugin do Motir para o Claude Code traz este servidor junto, ao lado das skills. · [Documentação do Claude Code da Anthropic]({{value:routeClaudeCodeDocsUrl}}) · passos verificados em {{value:routeClaudeCodeCheckedOn}}

### O que você aprova e como desfazer {#consent}

A página de login no Motir informa qual app está pedindo, faz você escolher um espaço de trabalho e lista as permissões que ele quer. O Claude então age como você nesse espaço de trabalho, dentro do que você aprovou — nunca além do que o seu próprio papel permite.

Quando o claude.ai se conecta com a identidade publicada do Claude, o Motir verifica que o claude.ai a publica e mostra o claude.ai como domínio verificado na página de login e em Apps conectados. Qualquer outro cliente MCP que se registra sozinho aparece como Não verificado: o nome que ele mostra foi escolhido por ele, e o Motir não tem como conferi-lo.

O Claude pergunta antes de usar uma ferramenta que altera algo: cada ferramenta informa se apenas lê, escreve ou exclui, e [{{value:mcpToolsPage}}](/docs/mcp/tools) mostra qual é qual. Prefere o plugin para o Claude Code? Ele traz este servidor junto — [{{value:skillsPage}}](/docs/skills).

Todo app que você conecta aparece em [Apps conectados]({{value:connectedAppsUrl}}), em Configurações da conta → Tokens no Motir, com o espaço de trabalho, as permissões e a data do último uso. Revogar encerra o acesso dele na próxima requisição.

## Outros clientes e CI: use um token {#token-route}

Escolha este caminho para um cliente sem login por OAuth, um agente sem interface ou um pipeline de CI. É o mesmo servidor; um token de acesso pessoal substitui o login.

## Este servidor ou a API REST? {#fork}

Ambos falam com os mesmos dados e aceitam a mesma credencial. Foram feitos para consumidores diferentes, e a diferença que importa é o que cada um promete sobre mudar sem você esperar.

|                  | {{value:mcpPage}}                                                                                                                    | {{value:apiPage}}                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Endpoint**     | `POST {{value:endpointPath}}`                                                                                                        | `/api/v1/…`                                                                        |
| **Feito para**   | Um agente que você controla — ele lê as descrições das ferramentas em tempo de execução.                                             | Um cliente que você distribui — código escrito uma vez para um formato fixo.       |
| **Estabilidade** | Esperado que mude. Reescrever uma descrição ou renomear um argumento é como o comportamento de um agente é ajustado.                 | Apenas aditiva. Uma mudança incompatível cria a `/api/v2`; a v1 mantém a promessa. |
| **Formato**      | O mesmo. Os payloads do MCP são derivados dos esquemas de resposta da v1, então os dois descrevem objetos comprovadamente idênticos. | O mesmo, e é a fonte da qual o MCP deriva.                                         |
| **Autenticação** | Um token de acesso pessoal, um conjunto de escopos.                                                                                  | A mesma credencial funciona nos dois.                                              |

Está conectando um agente? Fique aqui. Escreve software que outras pessoas instalam? A [{{value:apiPage}}](/docs/api) é a outra metade — é a que promete não mudar sem você esperar.

## 1. Gere um token {#token}

Toda requisição leva um token de acesso pessoal, gerado no Motir em Configurações da conta → Tokens. Escolha o espaço de trabalho ao qual ele fica vinculado e conceda o menor conjunto de escopos que resolve o trabalho — a tabela no fim desta página diz o que cada escopo controla. Uma concessão restringe o seu próprio papel e nunca o amplia, então um token nunca pode fazer algo que você não poderia.

O segredo é mostrado uma única vez, quando o token é criado. Copie-o nesse momento; não há como lê-lo de novo, e um token perdido é substituído, não recuperado.

## 2. Conecte o seu cliente {#wire}

Todo cliente precisa dos mesmos quatro dados, com os nomes que ele der a eles.

|                |                                                                          |
| -------------- | ------------------------------------------------------------------------ |
| **URL**        | `{{value:url}}`                                                          |
| **Transporte** | HTTP com streaming — não SSE, e não um comando stdio                     |
| **Cabeçalho**  | `{{value:authHeader}}: {{value:authScheme}} <token>`, em toda requisição |
| **Token**      | `{{value:tokenPlaceholder}}` — o que você gerou no passo 1               |

Mantenha o token fora de um arquivo que o seu repositório rastreia. Quando um cliente consegue lê-lo do seu ambiente ou pedi-lo a você, o bloco abaixo usa isso em vez de um valor literal — e é por isso que dois deles citam `{{value:tokenEnvVar}}` em vez de um segredo.

### Claude Code {#client-claude-code}

{{slot:client-claude-code}}

Ou um único comando: `{{value:claudeCodeTokenCommand}}` · [Documentação do Claude Code]({{value:clientClaudeCodeDocsUrl}}) · formato verificado em {{value:clientsCheckedOn}}

### Cursor {#client-cursor}

{{slot:client-cursor}}

O Cursor interpola `${env:…}`, então o token permanece no seu ambiente e fora do arquivo. · [Documentação do Cursor]({{value:clientCursorDocsUrl}}) · formato verificado em {{value:clientsCheckedOn}}

### VS Code {#client-vscode}

{{slot:client-vscode}}

O VS Code pede o token na primeira vez que o servidor inicia e o guarda com segurança — nada secreto é gravado no arquivo. · [Documentação do VS Code]({{value:clientVscodeDocsUrl}}) · formato verificado em {{value:clientsCheckedOn}}

### Codex CLI {#client-codex}

{{slot:client-codex}}

`{{value:codexTokenKey}}` recebe o NOME da variável, não o token. · [Documentação do Codex CLI]({{value:clientCodexDocsUrl}}) · formato verificado em {{value:clientsCheckedOn}}

### Qualquer outro cliente HTTP com streaming {#client-other}

{{slot:client-other}}

Windsurf, Zed, Cline, Goose ou algo que você mesmo escreveu — os mesmos quatro dados com nomes de chave diferentes. · [Documentação de qualquer outro cliente HTTP com streaming]({{value:clientOtherDocsUrl}}) · formato verificado em {{value:clientsCheckedOn}}

## 3. Verifique a conexão {#check}

Reinicie o cliente e pergunte a ele quais ferramentas tem; o servidor responde com o catálogo inteiro, restrito à sua concessão. Para verificar o próprio endpoint antes de envolver um cliente, pergunte diretamente a ele — é o mesmo handshake, com o token no seu ambiente.

{{slot:verify}}

**Uma resposta de não autorizado é sobre o TOKEN, não sobre a conexão.** Um token ausente, malformado, desconhecido, revogado ou expirado devolve sempre a mesma recusa, de propósito — distingui-los transformaria o endpoint em um oráculo que responde se um segredo existe. Confira se o cabeçalho está escrito `{{value:authHeader}}`, se o valor começa com `{{value:authScheme}}` e se o token não foi revogado no Motir.

## O que uma conexão pode chamar {#scopes}

Toda ferramenta é controlada por um escopo. As permissões que você aprovou para um app conectado, ou a concessão que um token carrega, decidem quais ferramentas ele pode chamar — então a lista que o seu cliente mostra já é restrita a você. Elas são lidas do próprio Motir quando esta página é solicitada, portanto são o que o servidor entrega neste momento.

{{part:what-next}}

[//]: # 'Placed after the scope table, which the page generates from the published catalogue.'

## O que vem a seguir {#what-next}

[{{value:mcpToolsPage}}](/docs/mcp/tools) lista todas as ferramentas que o servidor expõe, com os argumentos que cada uma recebe. [A referência completa]({{value:referenceUrl}}) no motir-core traz a descrição completa de cada ferramenta. Conduzir os mesmos dados por um terminal é a [{{value:cliPage}}](/docs/cli).

{{part:column-scope}}

[//]: # 'A heading of the scope table. Each of the five parts below is one short label that stays a single word or phrase, with no sentence around it.'

Escopo

{{part:column-gates}}

O que controla

{{part:column-default}}

Padrão

{{part:granted}}

Concedido

{{part:off-by-default}}

Desativado por padrão

{{part:unreachable}}

[//]: # 'Shown in place of the scope table when the catalogue cannot be fetched. Keep `tools/list` literal.'

A tabela de escopos está temporariamente indisponível. Ela é derivada do catálogo que o Motir publica e nunca é copiada aqui, então não há nada para mostrar por enquanto — um handshake `tools/list` com o seu próprio token responde à mesma pergunta para esse token.
